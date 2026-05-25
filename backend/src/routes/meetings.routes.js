import express from "express";

import {
    createMeeting,
    joinMeeting,
    generateSummary,
    getMeetingDetails,
    getMyMeetings,
} from "../controllers/meeting.controller.js";

import { protect }
from "../middleware/auth.middleware.js";

const router = express.Router();

// ==========================================
// CREATE MEETING
// ==========================================

router.post(
    "/create",
    protect,
    createMeeting
);

// ==========================================
// JOIN MEETING
// ==========================================

router.post(
    "/join",
    protect,
    joinMeeting
);

// ==========================================
// GET USER MEETINGS
// ==========================================

router.get(
    "/my-meetings",
    protect,
    getMyMeetings
);

// ==========================================
// GET MEETING DETAILS
// ==========================================

router.get(
    "/:meetingCode/details",
    protect,
    getMeetingDetails
);

// ==========================================
// GENERATE SUMMARY
// ==========================================

router.post(
    "/generate-summary",
    protect,
    generateSummary
);

export default router;