import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
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
        message: {
            type: String,
            required: true,
            trim: true,
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

messageSchema.index({ meeting: 1, timestamp: 1 });

const Message = mongoose.model("Message", messageSchema);
export default Message;
