import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

import app, { allowedOrigins } from "./app.js";
import connectDB from "./config/db.js";
import User from "./models/user.model.js";
import socketHandler from "./sockets/socket.js";

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
  // Keep connections responsive and detect drops quickly
  pingInterval: 10000,
  pingTimeout: 20000,
  connectionStateRecovery: {
    maxDisconnectionDuration: 60_000,
  },
});

// ============================================================
// SOCKET.IO JWT AUTHENTICATION MIDDLEWARE
// Identity established here is the source of truth for all
// socket events — clients never pass their own userId.
// ============================================================
io.use(async (socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.replace("Bearer ", "");

  if (!token) {
    return next(new Error("Authentication required"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded._id;
    const user = await User.findById(userId).select("fullName email").lean();

    if (!user) {
      return next(new Error("Authentication failed"));
    }

    socket.userId = user._id.toString();
    socket.userName = user.fullName;
    socket.userEmail = user.email;
    next();
  } catch (err) {
    next(new Error("Authentication failed"));
  }
});

socketHandler(io);

// Crash safety — log instead of dying on stray async errors
process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

const PORT = process.env.PORT || 8000;

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });
