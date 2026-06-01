import express from "express";
import {
    scheduleMeeting,
    getScheduledMeetings,
    updateRsvpStatus,
    getMeetingDetails,
    cancelMeeting,
} from "../controllers/scheduledMeeting.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/schedule", authMiddleware, scheduleMeeting);
router.get("/", authMiddleware, getScheduledMeetings);
router.put("/rsvp", authMiddleware, updateRsvpStatus);
router.get("/:meetingId", authMiddleware, getMeetingDetails);
router.delete("/:meetingId", authMiddleware, cancelMeeting);

export default router;
