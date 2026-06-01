import express from "express";
import {
    scheduleMeeting,
    getScheduledMeetings,
    updateRsvpStatus,
    getMeetingDetails,
    cancelMeeting,
} from "../controllers/scheduledMeeting.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/schedule", protect, scheduleMeeting);
router.get("/", protect, getScheduledMeetings);
router.put("/rsvp", protect, updateRsvpStatus);
router.get("/:meetingId", protect, getMeetingDetails);
router.delete("/:meetingId", protect, cancelMeeting);

export default router;
