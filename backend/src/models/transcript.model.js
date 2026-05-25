import mongoose from "mongoose";

const transcriptSchema = new mongoose.Schema(
    {
        meeting: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Meeting",
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false,
        },
        userName: {
            type: String,
            required: true,
        },
        text: {
            type: String,
            required: true,
        },
        confidence: {
            type: Number,
            default: 1.0,
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for fast retrieval by meeting
transcriptSchema.index({ meeting: 1, timestamp: 1 });

const Transcript = mongoose.model("Transcript", transcriptSchema);
export default Transcript;