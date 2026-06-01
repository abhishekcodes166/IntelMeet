import express from "express";
import {
    createPoll,
    votePoll,
    getPollsByMeeting,
    closePoll,
} from "../controllers/poll.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/create", authMiddleware, createPoll);
router.post("/vote", authMiddleware, votePoll);
router.get("/:meetingId", authMiddleware, getPollsByMeeting);
router.put("/:pollId/close", authMiddleware, closePoll);

export default router;
