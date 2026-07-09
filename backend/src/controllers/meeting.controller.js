import crypto from "crypto";
import Meeting from "../models/meeting.model.js";
import Transcript from "../models/transcript.model.js";
import Summary from "../models/summary.model.js";
import Analytics from "../models/analytics.model.js";
import Message from "../models/message.model.js";
import OpenAI from "openai";
import { Resend } from "resend";

import dotenv from "dotenv";
dotenv.config();

const aiClient = process.env.OPENROUTER_API_KEY
    ? new OpenAI({
          baseURL: "https://openrouter.ai/api/v1",
          apiKey: process.env.OPENROUTER_API_KEY,
      })
    : null;

const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

const isMemberOfMeeting = (meeting, userId) => {
    const uid = userId.toString();
    const isParticipant = meeting.participants.some(
        (p) => (p._id ?? p).toString() === uid
    );
    const isHost = meeting.host && (meeting.host._id ?? meeting.host).toString() === uid;
    return isParticipant || isHost;
};

// ======================================================
// CREATE MEETING
// ======================================================
export const createMeeting = async (req, res) => {
    try {
        const title = (req.body.title || "").trim();

        if (!title || title.length > 200) {
            return res.status(400).json({
                success: false,
                message: "A meeting title (max 200 characters) is required",
            });
        }

        // Collision-safe code generation
        let meeting = null;
        for (let attempt = 0; attempt < 5 && !meeting; attempt++) {
            const meetingCode = crypto
                .randomBytes(4)
                .toString("hex")
                .slice(0, 6)
                .toUpperCase();
            try {
                meeting = await Meeting.create({
                    title,
                    meetingCode,
                    host: req.user._id,
                    participants: [req.user._id],
                });
            } catch (err) {
                if (err.code !== 11000) throw err; // retry only on duplicate code
            }
        }

        if (!meeting) {
            throw new Error("Could not generate a unique meeting code");
        }

        return res.status(201).json({ success: true, meeting });
    } catch (error) {
        console.error("CREATE MEETING ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create meeting",
        });
    }
};

// ======================================================
// JOIN MEETING
// ======================================================
export const joinMeeting = async (req, res) => {
    try {
        const meetingCode = (req.body.meetingCode || "")
            .trim()
            .toUpperCase();

        if (!meetingCode) {
            return res.status(400).json({
                success: false,
                message: "Meeting code is required",
            });
        }

        const meeting = await Meeting.findOneAndUpdate(
            { meetingCode },
            { $addToSet: { participants: req.user._id } },
            { new: true }
        );

        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: "Meeting not found — check the code and try again",
            });
        }

        return res.status(200).json({ success: true, meeting });
    } catch (error) {
        console.error("JOIN MEETING ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to join meeting",
        });
    }
};

// ======================================================
// GET USER MEETINGS
// ======================================================
export const getMyMeetings = async (req, res) => {
    try {
        const meetings = await Meeting.find({
            participants: req.user._id,
        })
            .populate("participants", "fullName email")
            .sort({ createdAt: -1 })
            .limit(200)
            .lean();

        return res.status(200).json({ success: true, meetings });
    } catch (error) {
        console.error("GET MEETINGS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch meetings",
        });
    }
};

// ======================================================
// GET MEETING DETAILS
// ======================================================
export const getMeetingDetails = async (req, res) => {
    try {
        const { meetingCode } = req.params;

        const meeting = await Meeting.findOne({ meetingCode })
            .populate("participants", "fullName email")
            .populate("host", "fullName email");

        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: "Meeting not found",
            });
        }

        if (!isMemberOfMeeting(meeting, req.user._id)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to view this meeting",
            });
        }

        const [transcripts, summary, analytics, messages] = await Promise.all([
            Transcript.find({ meeting: meeting._id }).sort({ timestamp: 1 }).lean(),
            Summary.findOne({ meeting: meeting._id }).lean(),
            Analytics.find({ meeting: meeting._id }).lean(),
            Message.find({ meeting: meeting._id }).sort({ timestamp: 1 }).lean(),
        ]);

        // Contribution percentages computed at read time — keeps writes cheap
        const totalChars = analytics.reduce((sum, a) => sum + (a.characterCount || 0), 0);
        const analyticsWithContribution = analytics.map((a) => ({
            ...a,
            contributionPercentage:
                totalChars > 0
                    ? parseFloat(((a.characterCount / totalChars) * 100).toFixed(1))
                    : 0,
        }));

        return res.status(200).json({
            success: true,
            meeting,
            transcripts,
            summary,
            analytics: analyticsWithContribution,
            messages,
        });
    } catch (error) {
        console.error("MEETING DETAILS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch meeting details",
        });
    }
};

// ======================================================
// GENERATE AI SUMMARY — structured sections, retries,
// graceful fallback (never crashes the meeting flow)
// ======================================================

const SUMMARY_SYSTEM_PROMPT = `You are a professional meeting-intelligence assistant, producing minutes with the quality of Notion AI or Microsoft Copilot.

Analyze the meeting transcript and return ONLY a valid JSON object (no markdown, no backticks, no commentary) matching exactly this schema:

{
  "shortSummary": "2-3 sentence executive overview of the meeting",
  "detailedSummary": "2-4 well-structured paragraphs describing context, discussion flow, and outcomes. Separate paragraphs with \\n\\n.",
  "bulletNotes": ["Key discussion point, one clear sentence each"],
  "decisions": ["Concrete decision that was made"],
  "actionItems": ["Task description (Owner: Name, Due: date if mentioned)"],
  "deadlines": ["Deadline or date commitment mentioned, with what it applies to"],
  "questions": ["Open question raised that was not fully resolved"],
  "nextSteps": ["Agreed next step, in order"],
  "conclusion": "1-2 sentence closing statement on how the meeting ended",
  "participantContributions": "One short paragraph summarizing each speaker's contribution"
}

Rules:
- Base everything strictly on the transcript. Never invent names, dates, or decisions.
- If a section has no content, return an empty array or empty string for it.
- Write in clear, professional English. No filler phrases.`;

const buildFallbackSummary = (reason) => ({
    shortSummary: "",
    detailedSummary: "",
    bulletNotes: [],
    actionItems: [],
    decisions: [],
    highlights: [],
    questions: [],
    deadlines: [],
    nextSteps: [],
    conclusion: "",
    participantContributions: "",
    status: reason,
});

const extractJson = (raw) => {
    let text = (raw || "").trim();
    text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    // Some models wrap JSON in prose — grab the outermost object
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end > start) {
        text = text.slice(start, end + 1);
    }
    return JSON.parse(text);
};

const toStringArray = (value, max = 30) =>
    Array.isArray(value)
        ? value.filter((v) => typeof v === "string" && v.trim()).slice(0, max)
        : [];

export const generateSummary = async (req, res) => {
    try {
        const roomId = req.body.roomId || req.body.meetingCode;

        if (!roomId) {
            return res.status(400).json({
                success: false,
                message: "roomId is required",
            });
        }

        const meeting = await Meeting.findOne({ meetingCode: roomId });

        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: "Meeting not found",
            });
        }

        if (!isMemberOfMeeting(meeting, req.user._id)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to generate a summary for this meeting",
            });
        }

        const transcripts = await Transcript.find({ meeting: meeting._id })
            .sort({ timestamp: 1 })
            .lean();

        if (!transcripts || transcripts.length === 0) {
            const savedSummary = await Summary.findOneAndUpdate(
                { meeting: meeting._id },
                { meeting: meeting._id, ...buildFallbackSummary("EMPTY") },
                { upsert: true, new: true }
            );
            return res.status(200).json({
                success: true,
                summary: savedSummary,
                message: "No transcript was captured for this meeting",
            });
        }

        if (!aiClient) {
            return res.status(503).json({
                success: false,
                message: "AI summarization is not configured (missing OPENROUTER_API_KEY)",
            });
        }

        const fullTranscript = transcripts
            .map((t) => {
                const time = t.timestamp
                    ? new Date(t.timestamp).toISOString().slice(11, 19)
                    : "";
                return `[${time}] ${t.userName}: ${t.text}`;
            })
            .join("\n")
            // Keep prompt within sane token limits
            .slice(-60000);

        const MAX_RETRIES = 3;
        let parsed = null;
        let lastError = null;

        for (let attempt = 1; attempt <= MAX_RETRIES && !parsed; attempt++) {
            try {
                const apiResponse = await aiClient.chat.completions.create({
                    model: process.env.AI_SUMMARY_MODEL || "openrouter/auto",
                    messages: [
                        { role: "system", content: SUMMARY_SYSTEM_PROMPT },
                        { role: "user", content: fullTranscript },
                    ],
                    temperature: 0.3,
                    max_tokens: 2000,
                });

                parsed = extractJson(apiResponse.choices[0]?.message?.content);
            } catch (error) {
                lastError = error;
                console.warn(
                    `Summary attempt ${attempt}/${MAX_RETRIES} failed:`,
                    error.message
                );
                if (attempt < MAX_RETRIES) {
                    await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
                }
            }
        }

        if (!parsed) {
            // Persist a FAILED marker so the client can offer retry
            await Summary.findOneAndUpdate(
                { meeting: meeting._id },
                { meeting: meeting._id, ...buildFallbackSummary("FAILED") },
                { upsert: true, new: true }
            );
            console.error("Summary generation failed after retries:", lastError?.message);
            return res.status(502).json({
                success: false,
                message: "AI summary generation failed. You can retry from the meeting details page.",
            });
        }

        const summaryData = {
            meeting: meeting._id,
            shortSummary: typeof parsed.shortSummary === "string" ? parsed.shortSummary : "",
            detailedSummary: typeof parsed.detailedSummary === "string" ? parsed.detailedSummary : "",
            bulletNotes: toStringArray(parsed.bulletNotes),
            actionItems: toStringArray(parsed.actionItems),
            decisions: toStringArray(parsed.decisions),
            highlights: toStringArray(parsed.highlights),
            questions: toStringArray(parsed.questions),
            deadlines: toStringArray(parsed.deadlines),
            nextSteps: toStringArray(parsed.nextSteps),
            conclusion: typeof parsed.conclusion === "string" ? parsed.conclusion : "",
            participantContributions:
                typeof parsed.participantContributions === "string"
                    ? parsed.participantContributions
                    : "",
            status: "COMPLETED",
        };

        const summary = await Summary.findOneAndUpdate(
            { meeting: meeting._id },
            summaryData,
            { upsert: true, new: true }
        );

        meeting.summary = summary._id;
        await meeting.save();

        return res.status(200).json({ success: true, summary });
    } catch (error) {
        console.error("SUMMARY GENERATION ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to generate summary",
        });
    }
};

// ======================================================
// SEND INVITE EMAIL
// ======================================================
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const sendInvite = async (req, res) => {
    try {
        const { meetingCode } = req.params;
        const { to, subject, message } = req.body;

        if (!to || !EMAIL_REGEX.test(to)) {
            return res.status(400).json({
                success: false,
                message: "A valid recipient email is required",
            });
        }

        const meeting = await Meeting.findOne({ meetingCode });

        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: "Meeting not found",
            });
        }

        if (!isMemberOfMeeting(meeting, req.user._id)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to invite users to this meeting",
            });
        }

        if (!resend) {
            return res.status(503).json({
                success: false,
                message: "Email is not configured on this server",
            });
        }

        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        const joinLink = `${frontendUrl}/meeting/${meeting.meetingCode}`;
        const mailSubject = (subject || `Invite: ${meeting.title}`).slice(0, 200);
        const fromEmail = process.env.FROM_EMAIL || "onboarding@resend.dev";

        // Escape user-supplied text before injecting into HTML email
        const escapeHtml = (s = "") =>
            s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        const htmlBody = `
            <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
                <h2 style="margin: 0 0 8px;">You're invited to a meeting</h2>
                <p style="color:#555; margin: 0 0 20px;">${escapeHtml(message) || `${escapeHtml(req.user.fullName)} invited you to join a meeting on IntelMeet.`}</p>
                <div style="background:#f5f5f7; border-radius:12px; padding:16px 20px; margin-bottom:24px;">
                    <p style="margin:0 0 6px;"><strong>${escapeHtml(meeting.title)}</strong></p>
                    <p style="margin:0; color:#555;">Meeting code: <code style="background:#fff; padding:2px 8px; border-radius:6px;">${meeting.meetingCode}</code></p>
                </div>
                <a href="${joinLink}" style="display:inline-block; background:#111; color:#fff; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:600;">Join meeting</a>
                <p style="color:#999; font-size:12px; margin-top:24px;">Sent via IntelMeet</p>
            </div>
        `;

        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to,
            subject: mailSubject,
            html: htmlBody,
        });

        if (error) {
            console.error("RESEND ERROR:", error);
            return res.status(502).json({
                success: false,
                message: "Failed to send invite",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Invite sent",
            id: data?.id,
        });
    } catch (error) {
        console.error("SEND INVITE ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to send invite",
        });
    }
};
