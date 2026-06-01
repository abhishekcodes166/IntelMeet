import mongoose from "mongoose";

const scheduledMeetingSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        host: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        attendees: [
            {
                email: {
                    type: String,
                    required: true,
                    lowercase: true,
                },
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                },
                status: {
                    type: String,
                    enum: ["invited", "accepted", "declined", "tentative"],
                    default: "invited",
                },
                hasResponded: {
                    type: Boolean,
                    default: false,
                },
            },
        ],
        scheduledStartTime: {
            type: Date,
            required: true,
        },
        scheduledEndTime: {
            type: Date,
            required: true,
        },
        timeZone: {
            type: String,
            default: "UTC",
        },
        meetingCode: String, // Generated when meeting starts
        status: {
            type: String,
            enum: ["scheduled", "ongoing", "ended", "cancelled"],
            default: "scheduled",
        },
        notificationsSent: {
            type: Boolean,
            default: false,
        },
        reminders: [
            {
                time: String, // e.g., "15min", "1hour", "1day"
                sent: Boolean,
                sentAt: Date,
            },
        ],
    },
    {
        timestamps: true,
    }
);

scheduledMeetingSchema.index({ host: 1, scheduledStartTime: 1 });
scheduledMeetingSchema.index({ scheduledStartTime: 1, status: 1 });

const ScheduledMeeting = mongoose.model("ScheduledMeeting", scheduledMeetingSchema);
export default ScheduledMeeting;
