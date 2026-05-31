import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

import app from "./app.js";
import connectDB from "./config/db.js";

import socketHandler from "./sockets/socket.js";

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://intel-meet.vercel.app",
    ],
    credentials: true,
  },
});

// ============================================================
// SOCKET.IO JWT AUTHENTICATION MIDDLEWARE
// ============================================================
io.use((socket, next) => {
  const token = socket.handshake.auth.token || 
                socket.handshake.headers.authorization?.replace("Bearer ", "");
  
  if (!token) {
    // Allow connection but mark as unauthenticated
    // Useful for lobby/public rooms in future
    console.warn("Socket connected without auth token");
    socket.userId = null;
    return next();
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded._id || decoded.userId;
    socket.userEmail = decoded.email;
    console.log("✓ Socket authenticated:", socket.userId);
    next();
  } catch (err) {
    console.warn("Socket auth failed:", err.message);
    // Don't reject connection, just mark as unauthenticated
    socket.userId = null;
    next();
  }
});

// SOCKETS
socketHandler(io);

// DATABASE
connectDB()
    .then(() => {

        server.listen(process.env.PORT, () => {

            console.log(
                `Server running on port ${process.env.PORT}`
            );

        });

    })
    .catch((error) => {

        console.log(
            "MongoDB connection failed:",
            error.message
        );

    });