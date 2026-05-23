import express from "express";
import verifyJWT from "../middleware/auth.middleware.js";
import { createMeeting, joinMeeting, getUserMeetings } from "../controllers/meeting.controller.js";

const router = express.Router();

router.post("/create", verifyJWT, createMeeting);
router.post("/join", verifyJWT, joinMeeting);
router.get("/my-meetings", verifyJWT, getUserMeetings);
export default router;