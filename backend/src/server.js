import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { Server } from "socket.io";

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