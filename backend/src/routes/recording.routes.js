import express from "express";
import {
    startRecording,
    stopRecording,
    getRecordingsByMeeting,
    markRecordingCompleted,
    deleteRecording,
} from "../controllers/recording.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/start", protect, startRecording);
router.post("/stop", protect, stopRecording);
router.get("/:meetingId", protect, getRecordingsByMeeting);
router.put("/mark-completed", authMiddleware, markRecordingCompleted);
router.delete("/:recordingId", authMiddleware, deleteRecording);

export default router;
