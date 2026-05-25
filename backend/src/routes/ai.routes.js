import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { generateSummary } from "../controllers/ai.controller.js";

const router = express.Router();

router.post("/summary", protect, generateSummary);

export default router;