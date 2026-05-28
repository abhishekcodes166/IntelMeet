import Meeting from "../models/meeting.model.js";
import Transcript from "../models/transcript.model.js";
import Summary from "../models/summary.model.js";
import Analytics from "../models/analytics.model.js";
import Message from "../models/message.model.js";
import OpenAI from "openai";
import nodemailer from "nodemailer";

import dotenv from "dotenv";
dotenv.config();

const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
});

// Configure nodemailer transporter using environment variables
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT
        ? Number(process.env.SMTP_PORT)
        : 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// ======================================================
// CREATE MEETING
// ======================================================

export const createMeeting = async (
    req,
    res
) => {

    try {

        const { title } = req.body;

        const meetingCode =
            Math.random()
                .toString(36)
                .substring(2, 8)
                .toUpperCase();

        const meeting =
            await Meeting.create({
                title,
                meetingCode,
                host: req.user._id,
                participants: [req.user._id],
            });

        return res.status(201).json({
            success: true,
            meeting,
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Failed to create meeting",
        });
    }
};

// ======================================================
// JOIN MEETING
// ======================================================

export const joinMeeting = async (
    req,
    res
) => {

    try {

        const { meetingCode } =
            req.body;

        const meeting =
            await Meeting.findOne({
                meetingCode,
            });

        if (!meeting) {

            return res.status(404).json({
                success: false,
                message:
                    "Meeting not found",
            });
        }

        if (
            !meeting.participants.includes(
                req.user._id
            )
        ) {

            meeting.participants.push(
                req.user._id
            );

            await meeting.save();
        }

        return res.status(200).json({
            success: true,
            meeting,
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Failed to join meeting",
        });
    }
};

// ======================================================
// GET USER MEETINGS
// ======================================================

export const getMyMeetings = async (
    req,
    res
) => {

    try {

        const meetings = await Meeting.find({
            participants: req.user._id,
        })
            .populate(
                "participants",
                "fullName email"
            )
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            meetings,
        });

    } catch (error) {

        console.error(
            "Get meetings error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to fetch meetings",
        });
    }
};

// ======================================================
// GET MEETING DETAILS
// ======================================================

export const getMeetingDetails = async (
    req,
    res
) => {

    try {

        const { meetingCode } =
            req.params;

        const meeting =
            await Meeting.findOne({
                meetingCode,
            }).populate(
                "participants",
                "fullName email"
            );

        if (!meeting) {

            return res.status(404).json({
                success: false,
                message:
                    "Meeting not found",
            });
        }

        const transcripts =
            await Transcript.find({
                meeting: meeting._id,
            }).sort({
                createdAt: 1,
            });

        const summary =
            await Summary.findOne({
                meeting: meeting._id,
            });

        const analytics =
            await Analytics.find({
                meeting: meeting._id,
            });

        const messages =
            await Message.find({
                meeting: meeting._id,
            }).sort({
                createdAt: 1,
            });

        return res.status(200).json({
            success: true,
            meeting,
            transcripts,
            summary,
            analytics,
            messages,
        });

    } catch (error) {

        console.error(
            "Meeting details error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to fetch meeting details",
        });
    }
};

// ======================================================
// GENERATE AI SUMMARY
// ======================================================

export const generateSummary = async (
    req,
    res
) => {

    try {

        const roomId =
            req.body.roomId ||
            req.body.meetingCode;

        console.log(
            "Generating summary for room:",
            roomId
        );

        const meeting =
            await Meeting.findOne({
                meetingCode: roomId,
            });

        if (!meeting) {

            return res.status(404).json({
                success: false,
                message:
                    "Meeting not found",
            });
        }

        const transcripts =
            await Transcript.find({
                meeting: meeting._id,
            }).sort({
                createdAt: 1,
            });

        if (
            !transcripts ||
            transcripts.length === 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "No transcripts found",
            });
        }

        // ======================================================
        // COMBINE TRANSCRIPTS
        // ======================================================

        const fullTranscript =
            transcripts
                .map(
                    (t) =>
                        `${t.userName}: ${t.text}`
                )
                .join("\n");

        console.log(
            "Transcript length:",
            fullTranscript.length
        );

        // ======================================================
        // AI GENERATION
        // ======================================================

        const apiResponse =
            await client.chat.completions.create({
                model:
                    "deepseek/deepseek-v4-flash",

                messages: [
                    {
                        role: "system",
                        content: `
You are an AI meeting assistant.

Analyze the transcript and return ONLY valid JSON.

Format:

{
  "shortSummary": "",
  "detailedSummary": "",
  "bulletNotes": [],
  "actionItems": [],
  "decisions": []
}
                        `,
                    },
                    {
                        role: "user",
                        content: fullTranscript,
                    },
                ],

                reasoning: {
                    enabled: true,
                },

                temperature: 0.4,
            });

        const aiText =
            apiResponse
                .choices[0]
                .message
                .content;

        console.log(
            "AI RAW RESPONSE:",
            aiText
        );

        // ======================================================
        // CLEAN JSON
        // ======================================================

        const cleaned =
            aiText
                .replace(/```json/g, "")
                .replace(/```/g, "")
                .trim();

        const parsed =
            JSON.parse(cleaned);

        const shortSummary =
            parsed.shortSummary;

        const detailedSummary =
            parsed.detailedSummary;

        const bulletNotes =
            parsed.bulletNotes || [];

        const actionItems =
            parsed.actionItems || [];

        const decisions =
            parsed.decisions || [];

        // ======================================================
        // SAVE SUMMARY
        // ======================================================

        let summary =
            await Summary.findOne({
                meeting: meeting._id,
            });

        if (!summary) {

            summary =
                await Summary.create({
                    meeting:
                        meeting._id,

                    shortSummary,
                    detailedSummary,
                    bulletNotes,
                    actionItems,
                    decisions,
                });

        } else {

            summary.shortSummary =
                shortSummary;

            summary.detailedSummary =
                detailedSummary;

            summary.bulletNotes =
                bulletNotes;

            summary.actionItems =
                actionItems;

            summary.decisions =
                decisions;

            await summary.save();
        }

        meeting.summary =
            summary._id;

        await meeting.save();

        console.log(
            "Summary saved:",
            summary._id
        );

        return res.status(200).json({
            success: true,
            summary,
        });

    } catch (error) {

        console.error(
            "Summary generation error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to generate summary",
            error:
                error.message,
        });
    }
};

// ======================================================
// SEND INVITE EMAIL
// ======================================================

export const sendInvite = async (req, res) => {

    try {
        const { meetingCode } = req.params;

        const { to, subject, message } = req.body;

        if (!to) {
            return res.status(400).json({
                success: false,
                message: "Recipient 'to' email is required",
            });
        }

        const meeting = await Meeting.findOne({ meetingCode });

        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: "Meeting not found",
            });
        }

        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        const joinLink = `${frontendUrl}/meeting/${meeting.meetingCode}`;

        const mailSubject = subject || `Invite: ${meeting.title}`;

        const htmlBody = `
            <p>${message || "You are invited to join a meeting."}</p>
            <p><strong>Title:</strong> ${meeting.title}</p>
            <p><strong>Meeting Code:</strong> ${meeting.meetingCode}</p>
            <p><a href="${joinLink}">Join meeting</a></p>
        `;

        // send mail
        const info = await transporter.sendMail({
            from: process.env.FROM_EMAIL || process.env.SMTP_USER,
            to,
            subject: mailSubject,
            html: htmlBody,
        });

        return res.status(200).json({
            success: true,
            message: "Invite sent",
            info,
        });

    } catch (error) {

        console.error("Send invite error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to send invite",
            error: error.message,
        });
    }
};