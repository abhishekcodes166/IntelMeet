import OpenAI from "openai";
import Meeting from "../models/meeting.model.js";
import Transcript from "../models/transcript.model.js";
import Summary from "../models/summary.model.js";

let client;

const getClient = () => {
    if (!client) {
        client = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: process.env.OPENROUTER_API_KEY,
        });
    }
    return client;
};

const generateSummary = async (req, res) => {
    try {
        const { roomId } = req.body;

        if (!roomId) {
            return res.status(400).json({
                success: false,
                message: "Room ID is required",
            });
        }

        // Find the meeting
        let meeting = await Meeting.findOne({ meetingCode: roomId });
        if (!meeting) {
            meeting = await Meeting.findById(roomId);
        }

        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: "Meeting not found",
            });
        }

        // Fetch all final transcripts
        const transcripts = await Transcript.find({ meeting: meeting._id })
            .sort({ timestamp: 1 });

        if (transcripts.length === 0) {
            // Return placeholder if no transcripts
            const placeholderSummary = {
                meeting: meeting._id,
                shortSummary: "No transcripts recorded for this meeting.",
                detailedSummary: "The meeting took place, but no transcription data was saved. Therefore, a summary could not be generated.",
                bulletNotes: ["No discussion points captured."],
                actionItems: ["No action items identified."],
                decisions: ["No decisions recorded."],
                highlights: ["No highlights available."],
                participantContributions: "No user transcripts available for analytics.",
            };

            const savedSummary = await Summary.findOneAndUpdate(
                { meeting: meeting._id },
                placeholderSummary,
                { upsert: true, new: true }
            );

            meeting.summary = placeholderSummary.shortSummary;
            await meeting.save();

            return res.status(200).json({
                success: true,
                summary: savedSummary,
            });
        }

        // Format transcripts into a discussion log
        const transcriptText = transcripts
            .map((t) => `[${t.userName}]: ${t.text}`)
            .join("\n");

        const systemPrompt = `You are a professional AI meeting intelligence assistant.
Analyze the following transcript log of a meeting and generate structured meeting minutes.
You MUST output your response as a VALID JSON object. Do not wrap the JSON in markdown formatting (like \`\`\`json). Return ONLY raw JSON text.

The JSON schema MUST exactly match:
{
  "shortSummary": "A 2-3 sentence executive summary of the meeting.",
  "detailedSummary": "A comprehensive paragraph describing the discussion, context, and outcomes.",
  "bulletNotes": ["Key discussion point 1", "Key discussion point 2"],
  "actionItems": ["Action item 1 (Owner: Name, Deadline: if applicable)", "Action item 2..."],
  "decisions": ["Decision 1 made", "Decision 2..."],
  "highlights": ["Highlight 1", "Highlight 2..."],
  "participantContributions": "A summary of how each participant contributed to the meeting based on their speech."
}

Ensure all fields are fully populated. Make your responses insightful and direct.`;

        const completion = await getClient().chat.completions.create({
            model: "deepseek/deepseek-v4-flash",
            messages: [
                {
                    role: "system",
                    content: systemPrompt,
                },
                {
                    role: "user",
                    content: transcriptText,
                },
            ],
            temperature: 0.5,
            max_tokens: 1500,
        });

        const rawContent = completion.choices[0].message.content;
        
        // Clean markdown indicators if the model outputs them anyway
        let cleanContent = rawContent.trim();
        if (cleanContent.startsWith("```json")) {
            cleanContent = cleanContent.slice(7);
        } else if (cleanContent.startsWith("```")) {
            cleanContent = cleanContent.slice(3);
        }
        if (cleanContent.endsWith("```")) {
            cleanContent = cleanContent.slice(0, -3);
        }
        cleanContent = cleanContent.trim();

        let summaryData;
        try {
            summaryData = JSON.parse(cleanContent);
        } catch (parseError) {
            console.error("JSON PARSE ERROR on content:", cleanContent);
            // Fallback parsing or standard layout if JSON parsing fails
            summaryData = {
                shortSummary: "Meeting summary generated.",
                detailedSummary: rawContent,
                bulletNotes: ["See detailed summary."],
                actionItems: [],
                decisions: [],
                highlights: [],
                participantContributions: "Analysis complete.",
            };
        }

        // Save or update Summary collection
        const savedSummary = await Summary.findOneAndUpdate(
            { meeting: meeting._id },
            {
                meeting: meeting._id,
                shortSummary: summaryData.shortSummary || "",
                detailedSummary: summaryData.detailedSummary || "",
                bulletNotes: summaryData.bulletNotes || [],
                actionItems: summaryData.actionItems || [],
                decisions: summaryData.decisions || [],
                highlights: summaryData.highlights || [],
                participantContributions: summaryData.participantContributions || "",
            },
            { upsert: true, new: true }
        );

        // Update short summary preview in Meeting document
        meeting.summary = savedSummary.shortSummary;
        await meeting.save();

        return res.status(200).json({
            success: true,
            summary: savedSummary,
        });
    } catch (error) {
        console.error("GENERATE SUMMARY ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to generate meeting summary: " + error.message,
        });
    }
};

export { generateSummary };