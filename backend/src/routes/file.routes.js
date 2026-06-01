import express from "express";
import {
    uploadFile,
    getFilesByMeeting,
    deleteFile,
} from "../controllers/file.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/upload", authMiddleware, uploadFile);
router.get("/:meetingId", authMiddleware, getFilesByMeeting);
router.delete("/:fileId", authMiddleware, deleteFile);

export default router;
