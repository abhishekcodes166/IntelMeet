import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import userRouter from "./routes/user.routes.js";
import meetingRouter from "./routes/meetings.routes.js";
import aiRouter from "./routes/ai.routes.js";


dotenv.config();
const app = express();

// Middleware
app.use(
    cors({
        origin: "http://localhost:5173",
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

export default app;