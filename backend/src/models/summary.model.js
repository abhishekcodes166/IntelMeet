import mongoose from "mongoose";

const summarySchema = new mongoose.Schema(
    {
        meeting: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Meeting",
            required: true,
            unique: true,
        },
        shortSummary: {
            type: String,
            default: "",
        },
        detailedSummary: {
            type: String,
            default: "",
        },
        bulletNotes: {
            type: [String],
            default: [],
        },
        actionItems: {
            type: [String],
            default: [],
        },
        decisions: {
            type: [String],
            default: [],
        },
        highlights: {
            type: [String],
            default: [],
        },
        participantContributions: {
            type: String, // Stringified analysis or structured text
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

const Summary = mongoose.model("Summary", summarySchema);
export default Summary;
