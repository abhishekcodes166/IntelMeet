import mongoose from "mongoose";

const summarySchema = new mongoose.Schema(
    {
        meeting: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Meeting",
            required: true,
            unique: true,
        },
        // Meeting Overview — 2-3 sentence executive summary
        shortSummary: {
            type: String,
            default: "",
        },
        // Full narrative of the discussion
        detailedSummary: {
            type: String,
            default: "",
        },
        // Key Discussion Points
        bulletNotes: {
            type: [String],
            default: [],
        },
        // Action Items — "Task (Owner: X, Due: Y)"
        actionItems: {
            type: [String],
            default: [],
        },
        // Decisions Made
        decisions: {
            type: [String],
            default: [],
        },
        highlights: {
            type: [String],
            default: [],
        },
        // Questions Raised during the meeting
        questions: {
            type: [String],
            default: [],
        },
        // Important Deadlines mentioned
        deadlines: {
            type: [String],
            default: [],
        },
        // Next Steps agreed upon
        nextSteps: {
            type: [String],
            default: [],
        },
        // Meeting Conclusion — closing statement
        conclusion: {
            type: String,
            default: "",
        },
        participantContributions: {
            type: String,
            default: "",
        },
        // Generation state for graceful retry on the client
        status: {
            type: String,
            enum: ["COMPLETED", "FAILED", "EMPTY"],
            default: "COMPLETED",
        },
    },
    {
        timestamps: true,
    }
);

const Summary = mongoose.model("Summary", summarySchema);
export default Summary;
