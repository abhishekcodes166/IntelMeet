import express from "express";
import multer from "multer";
import {
    uploadFile,
    getFilesByMeeting,
    deleteFile,
    uploadToCloudinary,
} from "../controllers/file.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

router.post("/upload", protect, uploadFile);
router.post("/upload-raw", protect, upload.single("file"), uploadToCloudinary);
router.get("/:meetingId", protect, getFilesByMeeting);
router.delete("/:fileId", protect, deleteFile);

export default router;
