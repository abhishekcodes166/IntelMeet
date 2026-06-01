import Meeting from "../models/meeting.model.js";
import Transcript from "../models/transcript.model.js";
import Message from "../models/message.model.js";
import Analytics from "../models/analytics.model.js";
import User from "../models/user.model.js";
import Whiteboard from "../models/whiteboard.model.js";
import Poll from "../models/poll.model.js";
import Reaction from "../models/reaction.model.js";
import File from "../models/file.model.js";
import Notification from "../models/notification.model.js";
import Recording from "../models/recording.model.js";
import SpeakingStatus from "../models/speakingStatus.model.js";
import mongoose from "mongoose";

// ============================================================
// HELPER: Recalculate contributionPercentage with atomic transaction
// ============================================================
const recalculateContributions = async (meetingId, session = null) => {
    try {
        const allAnalytics = await Analytics.find({ meeting: meetingId }).session(session);
        const totalChars = allAnalytics.reduce(
            (sum, a) => sum + (a.characterCount || 0),
            0
        );
        if (totalChars === 0) return;

        // Update all analytics atomically
        for (const a of allAnalytics) {
            a.contributionPercentage = parseFloat(
                ((a.characterCount / totalChars) * 100).toFixed(1)
            );
            await a.save({ session });
        }
    } catch (err) {
        console.error("RECALCULATE CONTRIBUTIONS ERROR:", err);
        throw err; // Propagate error for transaction handling
    }
};

// ============================================================
// HELPER: Upsert analytics with transaction support
// ============================================================
const upsertAnalytics = async ({
    meetingId,
    userId,
    userName,
    transcriptText = null,
    messageText = null,
    speakingSeconds = 0,
    session = null,
}) => {
    try {
        const query = userId
            ? { meeting: meetingId, user: userId }
            : { meeting: meetingId, userName };

        let analytics = await Analytics.findOne(query).session(session);

        if (!analytics) {
            analytics = new Analytics({
                meeting: meetingId,
                user: userId || null,
                userName,
                speakingTime: 0,
                messageCount: 0,
                transcriptCount: 0,
                characterCount: 0,
                contributionPercentage: 0,
            });
        }

        if (transcriptText) {
            analytics.transcriptCount += 1;
            analytics.characterCount += transcriptText.length;
            analytics.speakingTime += speakingSeconds || Math.ceil(transcriptText.length / 15);
        }

        if (messageText) {
            analytics.messageCount += 1;
        }

        await analytics.save({ session });
        await recalculateContributions(meetingId, session);
    } catch (err) {
        console.error("UPSERT ANALYTICS ERROR:", err);
        throw err;
    }
};

// ============================================================
// SOCKET HANDLER
// ============================================================
const socketHandler = (io) => {
    const rooms = {};
    const userSockets = {}; // Track user → socket mapping for re-join recovery

    io.on("connection", (socket) => {
        console.log("User Connected:", socket.id, "Auth:", !!socket.userId);

        // ====================================
        // JOIN ROOM
        // ====================================
        socket.on("join-room", async ({ roomId, peerId, userName, userId }) => {
            try {
                // Validate user authorization
                if (userId && socket.userId && userId !== socket.userId) {
                    console.warn("SECURITY: User mismatch - rejecting join");
                    return;
                }

                console.log(`JOIN ROOM: ${userName} joining ${roomId}, total in room: ${rooms[roomId]?.length}`);
                socket.join(roomId);

                if (!rooms[roomId]) {
                    rooms[roomId] = [];
                }

                const alreadyExistsIndex = rooms[roomId].findIndex(
                    (user) => user.socketId === socket.id
                );

                const userData = {
                    socketId: socket.id,
                    peerId,
                    userName,
                    userId: userId || null,
                    isMuted: false,
                    isSpeaking: false,
                    joinedAt: Date.now(),
                };

                if (alreadyExistsIndex === -1) {
                    rooms[roomId].push(userData);
                } else {
                    rooms[roomId][alreadyExistsIndex] = userData;
                }

                // Track socket for re-join recovery
                if (userId) {
                    userSockets[userId] = socket.id;
                }

                socket.to(roomId).emit("user-connected", {
                    peerId,
                    userName,
                    userId,
                    socketId: socket.id,
                });

                io.to(roomId).emit("room-users", rooms[roomId]);

                // Find or create meeting
                let meeting = await Meeting.findOne({ meetingCode: roomId });
                if (!meeting) {
                    meeting = await Meeting.create({
                        title: `Meeting ${roomId}`,
                        meetingCode: roomId,
                        host: userId || null,
                        participants: userId ? [userId] : [],
                        meetingStatus: "ONGOING",
                        startTime: new Date(),
                    });
                } else {
                    if (userId && !meeting.participants.includes(userId)) {
                        meeting.participants.push(userId);
                        await meeting.save();
                    }
                    // Resume if previously ended
                    if (meeting.meetingStatus !== "ONGOING") {
                        meeting.meetingStatus = "ONGOING";
                        meeting.endTime = null;
                        meeting.duration = null;
                        await meeting.save();
                    }
                }

                console.log(`${userName} joined room ${roomId}`);
            } catch (error) {
                console.error("JOIN ROOM SOCKET ERROR:", error);
                socket.emit("error", { message: "Failed to join room" });
            }
        });

        // ====================================
        // CHAT MESSAGE with transaction
        // ====================================
        socket.on("send-message", async ({ roomId, userName, userId, message }) => {
            const session = await mongoose.startSession();
            session.startTransaction();
            
            try {
                const messageData = {
                    userName,
                    userId,
                    message,
                    timestamp: new Date(),
                };

                io.to(roomId).emit("receive-message", messageData);

                const meeting = await Meeting.findOne({ meetingCode: roomId }).session(session);
                if (meeting) {
                    await Message.create(
                        [{
                            meeting: meeting._id,
                            user: userId || null,
                            userName,
                            message,
                            timestamp: messageData.timestamp,
                        }],
                        { session }
                    );

                    // Track message in analytics (with transaction)
                    await upsertAnalytics({
                        meetingId: meeting._id,
                        userId: userId || null,
                        userName,
                        messageText: message,
                        session,
                    });
                }

                await session.commitTransaction();
            } catch (error) {
                await session.abortTransaction();
                console.error("SEND MESSAGE SOCKET ERROR:", error);
                socket.emit("error", { message: "Failed to save message" });
            } finally {
                session.endSession();
            }
        });

        // ====================================
        // TRANSCRIPT HANDLING with transaction
        // ====================================
        socket.on("send-transcript", async ({ roomId, userName, userId, text, isFinal, speakingSeconds }) => {
            const session = await mongoose.startSession();
            session.startTransaction();
            
            try {
                // Always broadcast for live subtitles
                io.to(roomId).emit("receive-transcript", {
                    userName,
                    text,
                    isFinal,
                    timestamp: new Date(),
                });

                // Save only final transcript blocks (with transaction)
                if (isFinal && text && text.trim().length > 0) {
                    const meeting = await Meeting.findOne({ meetingCode: roomId }).session(session);
                    if (meeting) {
                        await Transcript.create(
                            [{
                                meeting: meeting._id,
                                user: userId || null,
                                userName,
                                text: text.trim(),
                                timestamp: new Date(),
                            }],
                            { session }
                        );

                        // Update analytics (with transaction)
                        await upsertAnalytics({
                            meetingId: meeting._id,
                            userId: userId || null,
                            userName,
                            transcriptText: text.trim(),
                            speakingSeconds: speakingSeconds || null,
                            session,
                        });

                        console.log(`[TRANSCRIPT SAVED] ${userName}: "${text.trim().slice(0, 60)}..."`);
                    }
                }

                await session.commitTransaction();
            } catch (error) {
                await session.abortTransaction();
                console.error("TRANSCRIPT SOCKET ERROR:", error);
                socket.emit("error", { message: "Failed to save transcript" });
            } finally {
                session.endSession();
            }
        });

        // ====================================
        // AUDIO/SPEAKING CONTROLS
        // ====================================
        socket.on("toggle-mute", ({ roomId, isMuted }) => {
            if (rooms[roomId]) {
                const user = rooms[roomId].find((u) => u.socketId === socket.id);
                if (user) {
                    user.isMuted = isMuted;
                    socket.to(roomId).emit("user-mute-status", {
                        socketId: socket.id,
                        userName: user.userName,
                        isMuted,
                    });
                    io.to(roomId).emit("room-users", rooms[roomId]);
                }
            }
        });

        socket.on("toggle-speaking", ({ roomId, isSpeaking }) => {
            if (rooms[roomId]) {
                const user = rooms[roomId].find((u) => u.socketId === socket.id);
                if (user) {
                    user.isSpeaking = isSpeaking;
                    socket.to(roomId).emit("user-speaking-status", {
                        socketId: socket.id,
                        userName: user.userName,
                        isSpeaking,
                    });
                }
            }
        });

        // ====================================
        // WHITEBOARD REAL-TIME SYNC
        // ====================================
        socket.on("whiteboard-draw", async ({ roomId, userId, userName, content }) => {
            try {
                const meeting = await Meeting.findOne({ meetingCode: roomId });
                if (meeting) {
                    let whiteboard = await Whiteboard.findOne({ meeting: meeting._id });
                    if (!whiteboard) {
                        whiteboard = new Whiteboard({
                            meeting: meeting._id,
                            content,
                            updatedBy: userId,
                            updatedByName: userName,
                        });
                    } else {
                        whiteboard.content = content;
                        whiteboard.updatedBy = userId;
                        whiteboard.updatedByName = userName;
                        whiteboard.version += 1;
                    }
                    await whiteboard.save();
                }
                
                socket.to(roomId).emit("whiteboard-update", {
                    content,
                    updatedBy: userName,
                    timestamp: new Date(),
                });
            } catch (error) {
                console.error("WHITEBOARD DRAW ERROR:", error);
            }
        });

        socket.on("whiteboard-clear", async ({ roomId, userId, userName }) => {
            try {
                const meeting = await Meeting.findOne({ meetingCode: roomId });
                if (meeting) {
                    let whiteboard = await Whiteboard.findOne({ meeting: meeting._id });
                    if (whiteboard) {
                        whiteboard.content = "[]";
                        whiteboard.updatedBy = userId;
                        whiteboard.updatedByName = userName;
                        whiteboard.version += 1;
                        await whiteboard.save();
                    }
                }
                
                io.to(roomId).emit("whiteboard-cleared", {
                    clearedBy: userName,
                    timestamp: new Date(),
                });
            } catch (error) {
                console.error("WHITEBOARD CLEAR ERROR:", error);
            }
        });

        // ====================================
        // POLLS REAL-TIME
        // ====================================
        socket.on("create-poll", async ({ roomId, question, options, userId, userName }) => {
            try {
                const meeting = await Meeting.findOne({ meetingCode: roomId });
                if (meeting) {
                    const pollOptions = options.map(opt => ({
                        _id: new mongoose.Types.ObjectId(),
                        text: opt,
                        votes: [],
                        voteCount: 0,
                    }));

                    const poll = new Poll({
                        meeting: meeting._id,
                        question,
                        options: pollOptions,
                        createdBy: userId,
                        createdByName: userName,
                    });
                    await poll.save();

                    io.to(roomId).emit("poll-created", {
                        pollId: poll._id,
                        question,
                        options: pollOptions,
                        createdBy: userName,
                        timestamp: new Date(),
                    });
                }
            } catch (error) {
                console.error("CREATE POLL ERROR:", error);
            }
        });

        socket.on("vote-poll", async ({ roomId, pollId, optionId, userId, userName }) => {
            try {
                const poll = await Poll.findById(pollId);
                if (poll) {
                    // Check if already voted
                    let alreadyVoted = false;
                    for (let option of poll.options) {
                        if (option.votes.some(v => v.user?.toString() === userId?.toString())) {
                            alreadyVoted = true;
                            break;
                        }
                    }

                    if (!alreadyVoted) {
                        const option = poll.options.find(o => o._id.toString() === optionId);
                        if (option) {
                            option.votes.push({ user: userId, userName });
                            option.voteCount = option.votes.length;
                            poll.totalVotes += 1;
                            await poll.save();
                        }
                    }

                    io.to(roomId).emit("poll-updated", {
                        pollId: poll._id,
                        options: poll.options,
                        totalVotes: poll.totalVotes,
                        userVoted: userName,
                    });
                }
            } catch (error) {
                console.error("VOTE POLL ERROR:", error);
            }
        });

        socket.on("close-poll", async ({ roomId, pollId }) => {
            try {
                const poll = await Poll.findByIdAndUpdate(pollId, { isActive: false }, { new: true });
                io.to(roomId).emit("poll-closed", {
                    pollId,
                    finalResults: poll.options,
                    timestamp: new Date(),
                });
            } catch (error) {
                console.error("CLOSE POLL ERROR:", error);
            }
        });

        // ====================================
        // REACTIONS (Floating Emojis)
        // ====================================
        socket.on("send-reaction", async ({ roomId, emoji, userId, userName }) => {
            try {
                const meeting = await Meeting.findOne({ meetingCode: roomId });
                if (meeting) {
                    const reaction = new Reaction({
                        meeting: meeting._id,
                        user: userId,
                        userName,
                        emoji,
                        x: Math.random() * 80 + 10, // Random X position (10-90%)
                        y: Math.random() * 80 + 10, // Random Y position (10-90%)
                    });
                    await reaction.save();
                }
                
                io.to(roomId).emit("reaction-received", {
                    emoji,
                    userName,
                    x: Math.random() * 80 + 10,
                    y: Math.random() * 80 + 10,
                    id: new mongoose.Types.ObjectId(),
                    timestamp: new Date(),
                });
            } catch (error) {
                console.error("SEND REACTION ERROR:", error);
            }
        });

        // ====================================
        // FILE SHARING
        // ====================================
        socket.on("file-uploaded", async ({ roomId, fileName, fileSize, mimeType, fileUrl, userId, userName, messageId }) => {
            try {
                const meeting = await Meeting.findOne({ meetingCode: roomId });
                if (meeting) {
                    let fileType = "other";
                    if (mimeType.startsWith("image")) fileType = "image";
                    else if (mimeType.startsWith("video")) fileType = "video";
                    else if (mimeType.startsWith("audio")) fileType = "audio";

                    const file = new File({
                        meeting: meeting._id,
                        message: messageId || null,
                        uploadedBy: userId,
                        uploadedByName: userName,
                        fileName,
                        fileSize,
                        mimeType,
                        fileUrl,
                        fileType,
                    });
                    await file.save();

                    io.to(roomId).emit("file-shared", {
                        fileId: file._id,
                        fileName,
                        fileUrl,
                        fileType,
                        uploadedBy: userName,
                        fileSize,
                        timestamp: new Date(),
                    });
                }
            } catch (error) {
                console.error("FILE UPLOADED ERROR:", error);
            }
        });

        // ====================================
        // MENTIONS & NOTIFICATIONS
        // ====================================
        socket.on("send-message-with-mentions", async ({ roomId, userName, userId, message, mentionedUserIds }) => {
            try {
                const meeting = await Meeting.findOne({ meetingCode: roomId });
                if (meeting) {
                    // Broadcast message
                    io.to(roomId).emit("receive-message", {
                        userName,
                        userId,
                        message,
                        timestamp: new Date(),
                    });

                    // Save message
                    await Message.create({
                        meeting: meeting._id,
                        user: userId || null,
                        userName,
                        message,
                        timestamp: new Date(),
                    });

                    // Create notifications for mentioned users
                    for (const mentionedUserId of mentionedUserIds) {
                        const notification = new Notification({
                            recipient: mentionedUserId,
                            sender: userId,
                            senderName: userName,
                            meeting: meeting._id,
                            type: "mention",
                            title: `${userName} mentioned you`,
                            message: `${userName} mentioned you in a message: "${message.substring(0, 50)}..."`,
                        });
                        await notification.save();

                        // Emit real-time notification via socket if user is connected
                        io.to(`user-${mentionedUserId}`).emit("notification-received", {
                            type: "mention",
                            title: `${userName} mentioned you`,
                            message: message.substring(0, 100),
                            sender: userName,
                        });
                    }
                }
            } catch (error) {
                console.error("SEND MESSAGE WITH MENTIONS ERROR:", error);
            }
        });

        // ====================================
        // RECORDING CONTROLS
        // ====================================
        socket.on("recording-started", async ({ roomId, userId, userName }) => {
            try {
                const meeting = await Meeting.findOne({ meetingCode: roomId });
                if (meeting) {
                    const recording = new Recording({
                        meeting: meeting._id,
                        initiatedBy: userId,
                        initiatedByName: userName,
                        status: "recording",
                    });
                    await recording.save();

                    // Notify all participants
                    io.to(roomId).emit("recording-started-notification", {
                        initiatedBy: userName,
                        recordingId: recording._id,
                        timestamp: new Date(),
                    });

                    // Create notifications
                    for (const participant of meeting.participants) {
                        if (participant.toString() !== userId.toString()) {
                            const notification = new Notification({
                                recipient: participant,
                                sender: userId,
                                senderName: userName,
                                meeting: meeting._id,
                                type: "recording_started",
                                title: "Recording Started",
                                message: `${userName} started recording the meeting`,
                            });
                            await notification.save();
                        }
                    }
                }
            } catch (error) {
                console.error("RECORDING STARTED ERROR:", error);
            }
        });

        socket.on("recording-stopped", async ({ roomId, recordingId, userId, userName }) => {
            try {
                const recording = await Recording.findByIdAndUpdate(
                    recordingId,
                    {
                        status: "stopped",
                        endTime: new Date(),
                    },
                    { new: true }
                );

                if (recording) {
                    const duration = Math.floor((recording.endTime - recording.startTime) / 1000);
                    recording.duration = duration;
                    await recording.save();
                }

                io.to(roomId).emit("recording-stopped-notification", {
                    stoppedBy: userName,
                    recordingId,
                    timestamp: new Date(),
                });
            } catch (error) {
                console.error("RECORDING STOPPED ERROR:", error);
            }
        });

        // ====================================
        // SPEAKING STATUS TRACKING
        // ====================================
        socket.on("user-speaking-update", async ({ roomId, userId, userName, isSpeaking }) => {
            try {
                const meeting = await Meeting.findOne({ meetingCode: roomId });
                if (meeting) {
                    let speakingStatus = await SpeakingStatus.findOne({
                        meeting: meeting._id,
                        user: userId,
                    });

                    if (!speakingStatus) {
                        speakingStatus = new SpeakingStatus({
                            meeting: meeting._id,
                            user: userId,
                            userName,
                            isSpeaking,
                        });
                    } else {
                        speakingStatus.isSpeaking = isSpeaking;
                        speakingStatus.lastUpdated = new Date();
                    }

                    await speakingStatus.save();
                }

                io.to(roomId).emit("speaking-status-updated", {
                    userId,
                    userName,
                    isSpeaking,
                    timestamp: new Date(),
                });
            } catch (error) {
                console.error("USER SPEAKING UPDATE ERROR:", error);
            }
        });

        // ====================================
        // JOIN USER NOTIFICATIONS ROOM
        // ====================================
        socket.on("join-user-notifications", ({ userId }) => {
            socket.join(`user-${userId}`);
            console.log(`User ${userId} joined notifications room`);
        });

        // ====================================
        // REQUEST SPEAKING PERMISSION
        // ====================================
        socket.on("request-speak", ({ roomId, userName, userId }) => {
            io.to(roomId).emit("speak-request-received", {
                userName,
                userId,
                timestamp: new Date(),
            });
        });

        socket.on("approve-speak", ({ roomId, targetUserId, targetUserName }) => {
            io.to(`user-${targetUserId}`).emit("speak-approved", {
                message: "Your request to speak was approved",
                timestamp: new Date(),
            });
        });

        // ====================================
        // USER JOINED MEETING (for scheduled meetings)
        // ====================================
        socket.on("user-joined-scheduled", async ({ meetingId, userId, userName }) => {
            try {
                const meeting = await Meeting.findById(meetingId);
                if (meeting && !meeting.participants.includes(userId)) {
                    meeting.participants.push(userId);
                    await meeting.save();
                }
            } catch (error) {
                console.error("USER JOINED SCHEDULED ERROR:", error);
            }
        });

        // ====================================
        // END MEETING (with authorization)
        // ====================================
        socket.on("end-meeting", async ({ roomId, userId }) => {
            try {
                console.log(`Meeting ending requested in room: ${roomId}`);

                const meeting = await Meeting.findOne({ meetingCode: roomId });
                if (!meeting) {
                    socket.emit("error", { message: "Meeting not found" });
                    return;
                }

                // AUTHORIZATION: Only host can end meeting
                if (userId && meeting.host && userId !== meeting.host.toString()) {
                    console.warn("SECURITY: Non-host attempted to end meeting");
                    socket.emit("error", { message: "Only host can end meeting" });
                    return;
                }

                meeting.meetingStatus = "ENDED";
                meeting.endTime = new Date();
                if (meeting.startTime) {
                    meeting.duration = Math.floor(
                        (meeting.endTime - meeting.startTime) / 1000
                    );
                }
                await meeting.save();

                console.log(`✓ Meeting ${roomId} ended. Duration: ${meeting.duration}s`);

                io.to(roomId).emit("meeting-ended-signal", { roomId });
            } catch (err) {
                console.error("END MEETING SOCKET ERROR:", err);
                socket.emit("error", { message: "Failed to end meeting" });
            }
        });

        // ====================================
        // DISCONNECT
        // ====================================
        socket.on("disconnect", () => {
            console.log("User Disconnected:", socket.id);

            for (const roomId in rooms) {
                const disconnectedUser = rooms[roomId].find(
                    (user) => user.socketId === socket.id
                );

                if (disconnectedUser) {
                    rooms[roomId] = rooms[roomId].filter(
                        (user) => user.socketId !== socket.id
                    );

                    socket.to(roomId).emit("user-disconnected", {
                        peerId: disconnectedUser.peerId,
                        userName: disconnectedUser.userName,
                        socketId: socket.id,
                    });

                    io.to(roomId).emit("room-users", rooms[roomId]);

                    if (rooms[roomId].length === 0) {
                        delete rooms[roomId];
                    }
                }
            }
        });
    });
};

export default socketHandler;