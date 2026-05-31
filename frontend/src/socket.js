import { io } from "socket.io-client";

// ============================================================
// SOCKET.IO CLIENT WITH JWT AUTHENTICATION
// ============================================================
const getToken = () => {
  return localStorage.getItem("token");
};

const socket = io(import.meta.env.VITE_SOCKET_URL, {
  withCredentials: true,
  transports: ["websocket", "polling"],
  auth: {
    token: getToken(),
  },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
});

// ============================================================
// SOCKET EVENT LISTENERS FOR DEBUGGING & RECOVERY
// ============================================================

socket.on("connect", () => {
  console.log("✓ Socket.IO connected:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.warn("✗ Socket.IO disconnected:", reason);
  if (reason === "io server disconnect") {
    console.log("Server disconnected. Attempting to reconnect...");
    setTimeout(() => socket.connect(), 1000);
  }
});

socket.on("connect_error", (error) => {
  console.error("Socket connection error:", error.message);
});

socket.on("error", (error) => {
  console.error("Socket error event:", error);
});

export default socket;