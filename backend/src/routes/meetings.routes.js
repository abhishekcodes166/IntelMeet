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

router.get("/turn-credentials", protect, async (req, res) => {
  try {
    const response = await fetch(
      `https://${process.env.METERED_APP_NAME}.metered.live/api/v1/turn/credentials?apiKey=${process.env.METERED_API_KEY}`
    );
    const iceServers = await response.json();
    console.log("TURN response:", JSON.stringify(iceServers).slice(0, 100)); // ← add this
    return res.status(200).json({ iceServers });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch TURN credentials" });
  }
});

// ==========================================
// SEND INVITE EMAIL
// ==========================================

router.post(
    "/:meetingCode/invite",
    protect,
    sendInvite
);

export default router;