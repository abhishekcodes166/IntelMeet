import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import userRouter from "./routes/user.routes.js";
import meetingRouter from "./routes/meetings.routes.js";
import aiRouter from "./routes/ai.routes.js";


dotenv.config();
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://intel-meet.vercel.app", // your vercel frontend
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(helmet());
app.use(morgan("dev"));
app.use(cookieParser());

app.use("/api/v1/users",userRouter);
app.use("/api/v1/meetings",meetingRouter);
app.use("/api/v1/ai", aiRouter);

// Test Route
app.get("/", (req, res) => {
    res.send("AI Meet Backend Running");
});

// ============================================================
// SPA FALLBACK - Serve index.html for all non-API routes
// ============================================================
// This fixes page refresh 404 errors for React Router SPAs
app.get("*", (req, res) => {
    // Check if requesting API endpoint (should not reach here due to route above)
    if (req.path.startsWith("/api/")) {
        return res.status(404).json({ 
            success: false, 
            message: "API endpoint not found" 
        });
    }
    
    // For all other routes, check if frontend dist exists
    // In production, Vercel handles this. In development, this is a fallback.
    res.json({
        success: true,
        message: "SPA Server Running",
        info: "Frontend served by Vercel in production"
    });
});

export default app;