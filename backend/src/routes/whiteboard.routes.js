import express from "express";
import {
    getWhiteboard,
    updateWhiteboard,
    clearWhiteboard,
} from "../controllers/whiteboard.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/:meetingId", protect, getWhiteboard);
router.put("/:meetingId", protect, updateWhiteboard);
router.delete("/:meetingId", protect, clearWhiteboard);

export default router;
