import express from "express";
import {
    startRecording,
    stopRecording,
    getRecordingsByMeeting,
    markRecordingCompleted,
    deleteRecording,
} from "../controllers/recording.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/start", authMiddleware, startRecording);
router.post("/stop", authMiddleware, stopRecording);
router.get("/:meetingId", authMiddleware, getRecordingsByMeeting);
router.put("/mark-completed", authMiddleware, markRecordingCompleted);
router.delete("/:recordingId", authMiddleware, deleteRecording);

export default router;
