import mongoose from "mongoose";

const speakingStatusSchema = new mongoose.Schema(
    {
        meeting: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Meeting",
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        userName: {
            type: String,
            required: true,
        },
        isSpeaking: {
            type: Boolean,
            default: false,
        },
        lastUpdated: {
            type: Date,
            default: Date.now,
        },
        speakingDuration: {
            type: Number, // in seconds
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

speakingStatusSchema.index({ meeting: 1, isSpeaking: 1 });

const SpeakingStatus = mongoose.model("SpeakingStatus", speakingStatusSchema);
export default SpeakingStatus;
