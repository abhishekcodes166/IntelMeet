import express from "express";
import {
    getWhiteboard,
    updateWhiteboard,
    clearWhiteboard,
} from "../controllers/whiteboard.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/:meetingId", authMiddleware, getWhiteboard);
router.put("/:meetingId", authMiddleware, updateWhiteboard);
router.delete("/:meetingId", authMiddleware, clearWhiteboard);

export default router;
