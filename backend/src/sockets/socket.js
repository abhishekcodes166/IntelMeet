import mongoose from "mongoose";
import Meeting from "../models/meeting.model.js";
import Transcript from "../models/transcript.model.js";
import Message from "../models/message.model.js";
import Analytics from "../models/analytics.model.js";
import Whiteboard from "../models/whiteboard.model.js";
import Poll from "../models/poll.model.js";
import Reaction from "../models/reaction.model.js";
import File from "../models/file.model.js";
import Notification from "../models/notification.model.js";
import Recording from "../models/recording.model.js";

// ============================================================
// IN-MEMORY ROOM STATE
// rooms: roomId -> Map<socketId, participant>
// ============================================================
const rooms = new Map();

const getRoom = (roomId) => {
    if (!rooms.has(roomId)) rooms.set(roomId, new Map());
    return rooms.get(roomId);
};

const roomUsers = (roomId) =>
    Array.from(rooms.get(roomId)?.values() ?? []);

const MAX_MESSAGE_LENGTH = 4000;
const MAX_TRANSCRIPT_LENGTH = 4000;

const sanitizeText = (value, maxLength) => {
    if (typeof value !== "string") return "";
    return value.trim().slice(0, maxLength);
};

// ============================================================
// ANALYTICS — single atomic upsert per event, contribution
// percentages are computed at read time, not on every write.
// ============================================================
const trackAnalytics = async ({ meetingId, userId, userName, transcriptText, isMessage }) => {
    try {
        const query = userId
            ? { meeting: meetingId, user: userId }
            : { meeting: meetingId, userName };

        const inc = {};
        if (transcriptText) {
            inc.transcriptCount = 1;
            inc.characterCount = transcriptText.length;
            inc.speakingTime = Math.ceil(transcriptText.length / 15);
        }
        if (isMessage) inc.messageCount = 1;
        if (Object.keys(inc).length === 0) return;

        // Fields already present in the upsert query must not repeat
        // in $setOnInsert — MongoDB rejects that as a path conflict.
        const setOnInsert = { contributionPercentage: 0 };
        if (userId) {
            setOnInsert.userName = userName;
        } else {
            setOnInsert.user = null;
        }

        await Analytics.findOneAndUpdate(
            query,
            { $inc: inc, $setOnInsert: setOnInsert },
            { upsert: true, new: true }
        );
    } catch (err) {
        console.error("ANALYTICS ERROR:", err.message);
    }
};

// Meeting lookups are cheap but frequent — cache code -> _id.
const meetingIdCache = new Map();
const findMeetingByCode = async (roomId) => {
    if (meetingIdCache.has(roomId)) {
        const meeting = await Meeting.findById(meetingIdCache.get(roomId));
        if (meeting) return meeting;
        meetingIdCache.delete(roomId);
    }
    const meeting = await Meeting.findOne({ meetingCode: roomId });
    if (meeting) meetingIdCache.set(roomId, meeting._id);
    return meeting;
};

// ============================================================
// SOCKET HANDLER
// ============================================================
const socketHandler = (io) => {
    io.on("connection", (socket) => {
        // roomId this socket has joined (one meeting per socket)
        let joinedRoomId = null;

        const identity = () => ({
            // Prefer the server-verified identity from the JWT handshake
            userId: socket.userId || null,
            userName: socket.userName || "Guest",
        });

        // ====================================
        // JOIN ROOM
        // ====================================
        socket.on("join-room", async ({ roomId, peerId, userName }, ack) => {
            try {
                if (!roomId || typeof roomId !== "string") {
                    ack?.({ success: false, message: "Invalid room id" });
                    return;
                }

                socket.userName = sanitizeText(userName, 100) || socket.userName || "Guest";
                const { userId } = identity();

                socket.join(roomId);
                joinedRoomId = roomId;

                const room = getRoom(roomId);

                // Drop any stale entry for the same user (refresh/reconnect)
                if (userId) {
                    for (const [sid, u] of room) {
                        if (u.userId === userId && sid !== socket.id) {
                            room.delete(sid);
                        }
                    }
                }

                room.set(socket.id, {
                    socketId: socket.id,
                    peerId: peerId || null,
                    userName: socket.userName,
                    userId,
                    isMuted: false,
                    isSpeaking: false,
                    joinedAt: Date.now(),
                });

                socket.to(roomId).emit("user-connected", {
                    peerId,
                    userName: socket.userName,
                    userId,
                    socketId: socket.id,
                });

                io.to(roomId).emit("room-users", roomUsers(roomId));

                // Find or create the meeting document
                let meeting = await findMeetingByCode(roomId);
                if (!meeting) {
                    meeting = await Meeting.create({
                        title: `Meeting ${roomId}`,
                        meetingCode: roomId,
                        host: userId || null,
                        participants: userId ? [userId] : [],
                        meetingStatus: "ONGOING",
                        startTime: new Date(),
                    });
                    meetingIdCache.set(roomId, meeting._id);
                } else {
                    const updates = {};
                    if (userId && !meeting.participants.some((p) => p.toString() === userId.toString())) {
                        updates.$addToSet = { participants: userId };
                    }
                    if (meeting.meetingStatus !== "ONGOING") {
                        updates.$set = { meetingStatus: "ONGOING", endTime: null, duration: 0 };
                    }
                    if (Object.keys(updates).length > 0) {
                        meeting = await Meeting.findByIdAndUpdate(meeting._id, updates, { new: true });
                    }
                }

                // Send recent history so refresh / late joiners keep context
                const [recentMessages, recentTranscripts] = await Promise.all([
                    Message.find({ meeting: meeting._id }).sort({ timestamp: -1 }).limit(100).lean(),
                    Transcript.find({ meeting: meeting._id }).sort({ timestamp: -1 }).limit(200).lean(),
                ]);

                socket.emit("room-history", {
                    messages: recentMessages.reverse().map((m) => ({
                        id: m._id.toString(),
                        userName: m.userName,
                        userId: m.user ? m.user.toString() : null,
                        message: m.message,
                        timestamp: m.timestamp,
                    })),
                    transcripts: recentTranscripts.reverse().map((t) => ({
                        id: t._id.toString(),
                        userName: t.userName,
                        userId: t.user ? t.user.toString() : null,
                        text: t.text,
                        timestamp: t.timestamp,
                    })),
                    meetingStartTime: meeting.startTime,
                });

                ack?.({ success: true, participants: roomUsers(roomId), meetingStartTime: meeting.startTime });
            } catch (error) {
                console.error("JOIN ROOM SOCKET ERROR:", error);
                ack?.({ success: false, message: "Failed to join room" });
                socket.emit("server-error", { scope: "join-room", message: "Failed to join room" });
            }
        });

        // ====================================
        // CHAT MESSAGE — broadcast instantly, persist async, ack sender
        // ====================================
        socket.on("send-message", async ({ roomId, message, clientId }, ack) => {
            try {
                const text = sanitizeText(message, MAX_MESSAGE_LENGTH);
                if (!roomId || !text) {
                    ack?.({ success: false, message: "Empty message" });
                    return;
                }

                const { userId, userName } = identity();
                const messageData = {
                    id: new mongoose.Types.ObjectId().toString(),
                    clientId: clientId || null,
                    userName,
                    userId,
                    message: text,
                    timestamp: new Date(),
                };

                // Everyone except the sender gets the broadcast; the sender
                // already rendered it optimistically and receives the ack.
                socket.to(roomId).emit("receive-message", messageData);
                ack?.({ success: true, id: messageData.id, timestamp: messageData.timestamp });

                const meeting = await findMeetingByCode(roomId);
                if (meeting) {
                    await Message.create({
                        _id: messageData.id,
                        meeting: meeting._id,
                        user: userId || null,
                        userName,
                        message: text,
                        timestamp: messageData.timestamp,
                    });
                    trackAnalytics({ meetingId: meeting._id, userId, userName, isMessage: true });
                }
            } catch (error) {
                console.error("SEND MESSAGE SOCKET ERROR:", error);
                ack?.({ success: false, message: "Failed to send message" });
            }
        });

        // ====================================
        // TYPING INDICATOR (ephemeral, not persisted)
        // ====================================
        socket.on("typing", ({ roomId, isTyping }) => {
            if (!roomId) return;
            const { userId, userName } = identity();
            socket.to(roomId).emit("user-typing", { userId, userName, isTyping: !!isTyping });
        });

        // ====================================
        // TRANSCRIPT — broadcast live, persist finals
        // ====================================
        socket.on("send-transcript", async ({ roomId, text, isFinal, clientId }) => {
            try {
                const cleanText = sanitizeText(text, MAX_TRANSCRIPT_LENGTH);
                if (!roomId || !cleanText) return;

                const { userId, userName } = identity();
                const payload = {
                    id: new mongoose.Types.ObjectId().toString(),
                    clientId: clientId || null,
                    userName,
                    userId,
                    text: cleanText,
                    isFinal: !!isFinal,
                    timestamp: new Date(),
                };

                socket.to(roomId).emit("receive-transcript", payload);

                if (isFinal) {
                    const meeting = await findMeetingByCode(roomId);
                    if (meeting) {
                        await Transcript.create({
                            _id: payload.id,
                            meeting: meeting._id,
                            user: userId || null,
                            userName,
                            text: cleanText,
                            timestamp: payload.timestamp,
                        });
                        trackAnalytics({ meetingId: meeting._id, userId, userName, transcriptText: cleanText });
                    }
                }
            } catch (error) {
                console.error("TRANSCRIPT SOCKET ERROR:", error);
            }
        });

        // ====================================
        // MUTE / SPEAKING STATUS (ephemeral room state)
        // ====================================
        socket.on("toggle-mute", ({ roomId, isMuted }) => {
            const room = rooms.get(roomId);
            const user = room?.get(socket.id);
            if (!user) return;
            user.isMuted = !!isMuted;
            io.to(roomId).emit("room-users", roomUsers(roomId));
        });

        socket.on("speaking", ({ roomId, isSpeaking }) => {
            const room = rooms.get(roomId);
            const user = room?.get(socket.id);
            if (!user) return;
            user.isSpeaking = !!isSpeaking;
            socket.to(roomId).emit("speaking-status", {
                socketId: socket.id,
                userId: user.userId,
                userName: user.userName,
                isSpeaking: !!isSpeaking,
            });
        });

        // ====================================
        // REACTIONS (floating emojis) — broadcast only, persist async
        // ====================================
        socket.on("send-reaction", async ({ roomId, emoji }) => {
            try {
                if (!roomId || typeof emoji !== "string" || emoji.length > 8) return;
                const { userId, userName } = identity();
                const x = Math.random() * 80 + 10;

                io.to(roomId).emit("reaction-received", {
                    id: new mongoose.Types.ObjectId().toString(),
                    emoji,
                    userName,
                    x,
                    y: 100,
                    timestamp: new Date(),
                });

                const meeting = await findMeetingByCode(roomId);
                if (meeting) {
                    Reaction.create({ meeting: meeting._id, user: userId, userName, emoji, x, y: 100 }).catch(() => {});
                }
            } catch (error) {
                console.error("SEND REACTION ERROR:", error);
            }
        });

        // ====================================
        // WHITEBOARD SYNC
        // ====================================
        socket.on("whiteboard-draw", async ({ roomId, content }) => {
            try {
                if (!roomId) return;
                const { userId, userName } = identity();

                socket.to(roomId).emit("whiteboard-update", {
                    content,
                    updatedBy: userName,
                    timestamp: new Date(),
                });

                const meeting = await findMeetingByCode(roomId);
                if (meeting) {
                    await Whiteboard.findOneAndUpdate(
                        { meeting: meeting._id },
                        {
                            $set: { content, updatedBy: userId, updatedByName: userName },
                            $inc: { version: 1 },
                        },
                        { upsert: true }
                    );
                }
            } catch (error) {
                console.error("WHITEBOARD DRAW ERROR:", error);
            }
        });

        socket.on("whiteboard-clear", async ({ roomId }) => {
            try {
                if (!roomId) return;
                const { userId, userName } = identity();

                io.to(roomId).emit("whiteboard-cleared", {
                    clearedBy: userName,
                    timestamp: new Date(),
                });

                const meeting = await findMeetingByCode(roomId);
                if (meeting) {
                    await Whiteboard.findOneAndUpdate(
                        { meeting: meeting._id },
                        {
                            $set: { content: "[]", updatedBy: userId, updatedByName: userName },
                            $inc: { version: 1 },
                        }
                    );
                }
            } catch (error) {
                console.error("WHITEBOARD CLEAR ERROR:", error);
            }
        });

        // ====================================
        // POLLS
        // ====================================
        socket.on("create-poll", async ({ roomId, question, options }) => {
            try {
                const cleanQuestion = sanitizeText(question, 500);
                if (!roomId || !cleanQuestion || !Array.isArray(options)) return;
                const cleanOptions = options
                    .map((o) => sanitizeText(o, 200))
                    .filter(Boolean)
                    .slice(0, 10);
                if (cleanOptions.length < 2) return;

                const { userId, userName } = identity();
                const meeting = await findMeetingByCode(roomId);
                if (!meeting) return;

                const pollOptions = cleanOptions.map((opt) => ({
                    _id: new mongoose.Types.ObjectId(),
                    text: opt,
                    votes: [],
                    voteCount: 0,
                }));

                const poll = await Poll.create({
                    meeting: meeting._id,
                    question: cleanQuestion,
                    options: pollOptions,
                    createdBy: userId,
                    createdByName: userName,
                });

                io.to(roomId).emit("poll-created", {
                    pollId: poll._id,
                    question: cleanQuestion,
                    options: pollOptions,
                    createdBy: userName,
                    timestamp: new Date(),
                });
            } catch (error) {
                console.error("CREATE POLL ERROR:", error);
            }
        });

        socket.on("vote-poll", async ({ roomId, pollId, optionId }) => {
            try {
                if (!roomId || !pollId || !optionId) return;
                const { userId, userName } = identity();

                const poll = await Poll.findById(pollId);
                if (!poll || poll.isActive === false) return;

                const alreadyVoted = poll.options.some((option) =>
                    option.votes.some((v) => v.user?.toString() === userId?.toString())
                );

                if (!alreadyVoted) {
                    const option = poll.options.find((o) => o._id.toString() === optionId);
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
            } catch (error) {
                console.error("VOTE POLL ERROR:", error);
            }
        });

        socket.on("close-poll", async ({ roomId, pollId }) => {
            try {
                if (!roomId || !pollId) return;
                const poll = await Poll.findByIdAndUpdate(pollId, { isActive: false }, { new: true });
                if (!poll) return;
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
        // FILE SHARING
        // ====================================
        socket.on("file-uploaded", async ({ roomId, fileName, fileSize, mimeType, fileUrl, messageId }) => {
            try {
                if (!roomId || !fileName || !fileUrl) return;
                const { userId, userName } = identity();
                const meeting = await findMeetingByCode(roomId);
                if (!meeting) return;

                let fileType = "other";
                if (typeof mimeType === "string") {
                    if (mimeType.startsWith("image")) fileType = "image";
                    else if (mimeType.startsWith("video")) fileType = "video";
                    else if (mimeType.startsWith("audio")) fileType = "audio";
                }

                const file = await File.create({
                    meeting: meeting._id,
                    message: messageId || null,
                    uploadedBy: userId,
                    uploadedByName: userName,
                    fileName: sanitizeText(fileName, 300),
                    fileSize,
                    mimeType,
                    fileUrl,
                    fileType,
                });

                io.to(roomId).emit("file-shared", {
                    fileId: file._id,
                    fileName: file.fileName,
                    fileUrl,
                    fileType,
                    uploadedBy: userName,
                    fileSize,
                    timestamp: new Date(),
                });
            } catch (error) {
                console.error("FILE UPLOADED ERROR:", error);
            }
        });

        // ====================================
        // NOTIFICATIONS
        // ====================================
        socket.on("join-user-notifications", () => {
            const { userId } = identity();
            if (userId) socket.join(`user-${userId}`);
        });

        socket.on("send-message-with-mentions", async ({ roomId, message, mentionedUserIds }) => {
            try {
                const text = sanitizeText(message, MAX_MESSAGE_LENGTH);
                if (!roomId || !text) return;
                const { userId, userName } = identity();

                const meeting = await findMeetingByCode(roomId);
                if (!meeting) return;

                const messageData = {
                    id: new mongoose.Types.ObjectId().toString(),
                    userName,
                    userId,
                    message: text,
                    timestamp: new Date(),
                };
                io.to(roomId).emit("receive-message", messageData);

                await Message.create({
                    _id: messageData.id,
                    meeting: meeting._id,
                    user: userId || null,
                    userName,
                    message: text,
                    timestamp: messageData.timestamp,
                });

                const mentions = Array.isArray(mentionedUserIds) ? mentionedUserIds.slice(0, 50) : [];
                for (const mentionedUserId of mentions) {
                    Notification.create({
                        recipient: mentionedUserId,
                        sender: userId,
                        senderName: userName,
                        meeting: meeting._id,
                        type: "mention",
                        title: `${userName} mentioned you`,
                        message: text.substring(0, 100),
                    }).catch(() => {});

                    io.to(`user-${mentionedUserId}`).emit("notification-received", {
                        type: "mention",
                        title: `${userName} mentioned you`,
                        message: text.substring(0, 100),
                        sender: userName,
                    });
                }
            } catch (error) {
                console.error("SEND MESSAGE WITH MENTIONS ERROR:", error);
            }
        });

        // ====================================
        // RECORDING CONTROLS
        // ====================================
        socket.on("recording-started", async ({ roomId }) => {
            try {
                if (!roomId) return;
                const { userId, userName } = identity();
                const meeting = await findMeetingByCode(roomId);
                if (!meeting) return;

                const recording = await Recording.create({
                    meeting: meeting._id,
                    initiatedBy: userId,
                    initiatedByName: userName,
                    status: "recording",
                });

                io.to(roomId).emit("recording-started-notification", {
                    initiatedBy: userName,
                    recordingId: recording._id,
                    timestamp: new Date(),
                });
            } catch (error) {
                console.error("RECORDING STARTED ERROR:", error);
            }
        });

        socket.on("recording-stopped", async ({ roomId, recordingId }) => {
            try {
                if (!roomId || !recordingId) return;
                const { userName } = identity();

                const recording = await Recording.findByIdAndUpdate(
                    recordingId,
                    { status: "stopped", endTime: new Date() },
                    { new: true }
                );

                if (recording?.startTime && recording?.endTime) {
                    recording.duration = Math.floor((recording.endTime - recording.startTime) / 1000);
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
        // END MEETING — host only, verified via JWT identity
        // ====================================
        socket.on("end-meeting", async ({ roomId }, ack) => {
            try {
                if (!roomId) return;
                const { userId } = identity();

                const meeting = await findMeetingByCode(roomId);
                if (!meeting) {
                    ack?.({ success: false, message: "Meeting not found" });
                    return;
                }

                if (meeting.host && (!userId || userId.toString() !== meeting.host.toString())) {
                    ack?.({ success: false, message: "Only the host can end the meeting" });
                    return;
                }

                meeting.meetingStatus = "ENDED";
                meeting.endTime = new Date();
                if (meeting.startTime) {
                    meeting.duration = Math.floor((meeting.endTime - meeting.startTime) / 1000);
                }
                await meeting.save();

                io.to(roomId).emit("meeting-ended", { roomId, endedAt: meeting.endTime });
                ack?.({ success: true });
            } catch (err) {
                console.error("END MEETING SOCKET ERROR:", err);
                ack?.({ success: false, message: "Failed to end meeting" });
            }
        });

        // ====================================
        // LEAVE / DISCONNECT
        // ====================================
        const leaveRoom = () => {
            if (!joinedRoomId) return;
            const room = rooms.get(joinedRoomId);
            const user = room?.get(socket.id);
            if (!user) return;

            room.delete(socket.id);
            socket.to(joinedRoomId).emit("user-disconnected", {
                peerId: user.peerId,
                userName: user.userName,
                userId: user.userId,
                socketId: socket.id,
            });
            io.to(joinedRoomId).emit("room-users", roomUsers(joinedRoomId));

            if (room.size === 0) rooms.delete(joinedRoomId);
            joinedRoomId = null;
        };

        socket.on("leave-room", () => {
            const roomId = joinedRoomId;
            leaveRoom();
            if (roomId) socket.leave(roomId);
        });

        socket.on("disconnect", leaveRoom);
    });
};

export default socketHandler;
