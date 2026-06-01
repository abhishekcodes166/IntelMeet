import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        meeting: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Meeting",
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        senderName: {
            type: String,
        },
        type: {
            type: String,
            enum: ["mention", "poll", "recording_started", "recording_stopped", "meeting_scheduled", "meeting_started"],
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        actionUrl: String,
        data: mongoose.Schema.Types.Mixed, // Additional data as needed
    },
    {
        timestamps: true,
    }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
