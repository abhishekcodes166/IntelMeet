import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },

        meetingCode: {
            type: String,
            required: true,
            unique: true,
        },

        host: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
    },
    {
        timestamps: true,
    }
);

const Meeting = mongoose.model("Meeting", meetingSchema);

export default Meeting;