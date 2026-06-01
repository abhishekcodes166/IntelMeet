import express from "express";
import {
    uploadFile,
    getFilesByMeeting,
    deleteFile,
} from "../controllers/file.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/upload", protect, uploadFile);
router.get("/:meetingId", protect, getFilesByMeeting);
router.delete("/:fileId", protect, deleteFile);

export default router;
