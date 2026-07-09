import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { generateSummary } from "../controllers/meeting.controller.js";

const router = express.Router();

// Kept for backwards compatibility — same handler as /meetings/generate-summary
router.post("/summary", protect, generateSummary);

export default router;