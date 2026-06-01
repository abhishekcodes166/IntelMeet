import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema(
    {
        meeting: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Meeting",
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        userName: {
            type: String,
            required: true,
        },
        emoji: {
            type: String,
            required: true,
            enum: ["👍", "❤️", "😂", "😮", "😢", "🎉", "🔥", "👏"],
        },
        x: Number, // Position x on screen (percentage)
        y: Number, // Position y on screen (percentage)
        expiresAt: {
            type: Date,
            default: () => new Date(Date.now() + 3000), // 3 seconds TTL
            index: { expireAfterSeconds: 0 }, // MongoDB TTL index
        },
    },
    {
        timestamps: true,
    }
);

const Reaction = mongoose.model("Reaction", reactionSchema);
export default Reaction;
