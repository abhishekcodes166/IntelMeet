import mongoose from "mongoose";

const recordingSchema = new mongoose.Schema(
    {
        meeting: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Meeting",
            required: true,
        },
        startTime: {
            type: Date,
            default: Date.now,
        },
        endTime: Date,
        duration: Number, // in seconds
        recordingUrl: String,
        isProcessing: {
            type: Boolean,
            default: true,
        },
        status: {
            type: String,
            enum: ["recording", "stopped", "processing", "completed", "failed"],
            default: "recording",
        },
        fileSize: Number, // in bytes
        initiatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        initiatedByName: String,
    },
    {
        timestamps: true,
    }
);

recordingSchema.index({ meeting: 1, createdAt: -1 });

const Recording = mongoose.model("Recording", recordingSchema);
export default Recording;
