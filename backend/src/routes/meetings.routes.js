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

// TURN credentials are short-lived; cache them briefly to avoid
// hitting the Metered API on every single join.
let turnCache = { iceServers: null, expiresAt: 0 };
const TURN_CACHE_TTL_MS = 2 * 60 * 1000;

router.get("/turn-credentials", protect, async (req, res) => {
  try {
    if (turnCache.iceServers && Date.now() < turnCache.expiresAt) {
      return res.status(200).json({ iceServers: turnCache.iceServers });
    }

    if (!process.env.METERED_APP_NAME || !process.env.METERED_API_KEY) {
      return res.status(503).json({
        success: false,
        message: "TURN is not configured",
      });
    }

    const response = await fetch(
      `https://${process.env.METERED_APP_NAME}.metered.live/api/v1/turn/credentials?apiKey=${process.env.METERED_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Metered responded with ${response.status}`);
    }

    const iceServers = await response.json();
    turnCache = { iceServers, expiresAt: Date.now() + TURN_CACHE_TTL_MS };
    return res.status(200).json({ iceServers });
  } catch (err) {
    console.error("TURN CREDENTIALS ERROR:", err.message);
    return res.status(502).json({
      success: false,
      message: "Failed to fetch TURN credentials",
    });
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