import express from "express";

import {
    createMeeting,
    joinMeeting,
    generateSummary,
    getMeetingDetails,
    getMyMeetings,
    sendInvite,
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

// ==========================================
// SEND INVITE EMAIL
// ==========================================

router.post(
    "/:meetingCode/invite",
    protect,
    sendInvite
);

export default router;