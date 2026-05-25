import mongoose from "mongoose";

const analyticsSchema = new mongoose.Schema(
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
        speakingTime: {
            type: Number, // in seconds
            default: 0,
        },
        messageCount: {
            type: Number,
            default: 0,
        },
        transcriptCount: {
            type: Number,
            default: 0,
        },
        characterCount: {
            type: Number,
            default: 0,
        },
        contributionPercentage: {
            type: Number, // 0 - 100
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

analyticsSchema.index({ meeting: 1, user: 1 });

const Analytics = mongoose.model("Analytics", analyticsSchema);
export default Analytics;
