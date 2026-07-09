import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import userRouter from "./routes/user.routes.js";
import meetingRouter from "./routes/meetings.routes.js";
import aiRouter from "./routes/ai.routes.js";
import pollRouter from "./routes/poll.routes.js";
import whiteboardRouter from "./routes/whiteboard.routes.js";
import fileRouter from "./routes/file.routes.js";
import notificationRouter from "./routes/notification.routes.js";
import recordingRouter from "./routes/recording.routes.js";
import scheduledMeetingRouter from "./routes/scheduledMeeting.routes.js";

dotenv.config();
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================
// CORS — allowed origins configurable via env (comma separated)
// ============================================================
export const allowedOrigins = (
  process.env.CORS_ORIGINS ||
  "http://localhost:5173,http://localhost:5174,https://intel-meet.vercel.app"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(cookieParser());

// Health check for uptime monitors / load balancers
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() });
});

app.use("/api/v1/users", userRouter);
app.use("/api/v1/meetings", meetingRouter);
app.use("/api/v1/ai", aiRouter);
app.use("/api/v1/polls", pollRouter);
app.use("/api/v1/whiteboard", whiteboardRouter);
app.use("/api/v1/files", fileRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/recordings", recordingRouter);
app.use("/api/v1/scheduled-meetings", scheduledMeetingRouter);

// ============================================================
// SPA FALLBACK — if the frontend build is co-located (single
// server deployment), serve it and let React Router handle
// deep links. API routes always return JSON 404s.
// ============================================================
const distPath = path.resolve(__dirname, "../../frontend/dist");
const hasFrontendBuild = fs.existsSync(path.join(distPath, "index.html"));

if (hasFrontendBuild) {
  app.use(express.static(distPath));
}

app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({
      success: false,
      message: "API endpoint not found",
    });
  }

  if (hasFrontendBuild) {
    return res.sendFile(path.join(distPath, "index.html"));
  }

  return res.status(200).send("IntelMeet API running");
});

// ============================================================
// GLOBAL ERROR HANDLER — no unhandled error should crash a request
// ============================================================
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("UNHANDLED REQUEST ERROR:", err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : err.message || "Something went wrong",
  });
});

export default app;
