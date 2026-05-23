import http from "http";
import { Server } from "socket.io";

import app from "./app.js";
import connectDB from "./config/db.js";

const PORT = process.env.PORT || 8000;

// Create HTTP server
const server = http.createServer(app);

// Attach Socket.IO
const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

// Socket connection
const activeRooms = {};

io.on("connection", (socket) => {

    console.log(`User Connected: ${socket.id}`);

    // Join room
    socket.on("join-meeting", ({ meetingCode, userName }) => {

        socket.join(meetingCode);

        // Initialize room
        if (!activeRooms[meetingCode]) {
            activeRooms[meetingCode] = [];
        }

        // Add participant
        const alreadyExists = activeRooms[meetingCode]
    .some(
        (participant) =>
            participant.socketId === socket.id
    );

if (!alreadyExists) {

    activeRooms[meetingCode].push({
        socketId: socket.id,
        userName,
    });

}

        console.log(activeRooms);

        // Broadcast participants
        io.to(meetingCode).emit(
            "meeting-participants",
            activeRooms[meetingCode]
        );

        // Notify join
        io.to(meetingCode).emit("user-joined", {
            message: `${userName} joined the meeting`,
        });

        // Store current room
        socket.meetingCode = meetingCode;

    });

    socket.on("send-message", (data) => {

    const { meetingCode, userName, message } = data;

    io.to(meetingCode).emit("receive-message", {
        userName,
        message,
        time: new Date(),
    });

    });

    // Disconnect
    socket.on("disconnect", () => {

        const meetingCode = socket.meetingCode;

        if (meetingCode && activeRooms[meetingCode]) {

            activeRooms[meetingCode] =
                activeRooms[meetingCode].filter(
                    (participant) =>
                        participant.socketId !== socket.id
                );

            // Broadcast updated list
            io.to(meetingCode).emit(
                "meeting-participants",
                activeRooms[meetingCode]
            );

            io.to(meetingCode).emit("user-left", {
                message: "A participant left",
            });

            // Remove empty room
            if (activeRooms[meetingCode].length === 0) {
                delete activeRooms[meetingCode];
            }

        }

        console.log(`User disconnected: ${socket.id}`);

    });

});

// Connect DB then start server
connectDB()
    .then(() => {

        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

    })
    .catch((error) => {
        console.error("Database connection failed:", error);
    });