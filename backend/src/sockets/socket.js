import Meeting from "../models/meeting.model.js";
import Transcript from "../models/transcript.model.js";
import Message from "../models/message.model.js";
import Analytics from "../models/analytics.model.js";
import User from "../models/user.model.js";
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