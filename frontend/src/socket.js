import { io } from "socket.io-client";

// ============================================================
// SOCKET.IO CLIENT
// - Lazy connection: connects only when authenticated, with a
//   fresh JWT (the old version snapshotted the token at import
//   time, so logging in after page load broke socket auth).
// - Unlimited reconnection with backoff; consumers re-join
//   their room via the "connect" event.
// ============================================================
const socket = io(import.meta.env.VITE_SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionDelay: 500,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity,
  timeout: 10000,
});

export const connectSocket = (token) => {
  socket.auth = { token };
  if (!socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = () => {
  socket.disconnect();
};

socket.on("disconnect", (reason) => {
  // The server kicked us (e.g. auth expiry) — manual reconnect needed
  if (reason === "io server disconnect") {
    const token = localStorage.getItem("token");
    if (token) {
      socket.auth = { token };
      setTimeout(() => socket.connect(), 1000);
    }
  }
});

socket.on("connect_error", (error) => {
  console.warn("Socket connection error:", error.message);
});

export default socket;
