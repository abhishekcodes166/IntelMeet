import express from "express";
import {
    createPoll,
    votePoll,
    getPollsByMeeting,
    closePoll,
} from "../controllers/poll.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/create", protect, createPoll);
router.post("/vote", protect, votePoll);
router.get("/:meetingId", protect, getPollsByMeeting);
router.put("/:pollId/close", protect, closePoll);

export default router;
