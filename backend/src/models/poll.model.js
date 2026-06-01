import mongoose from "mongoose";

const pollSchema = new mongoose.Schema(
    {
        meeting: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Meeting",
            required: true,
        },
        question: {
            type: String,
            required: true,
        },
        options: [
            {
                _id: mongoose.Schema.Types.ObjectId,
                text: {
                    type: String,
                    required: true,
                },
                votes: [
                    {
                        user: {
                            type: mongoose.Schema.Types.ObjectId,
                            ref: "User",
                        },
                        userName: String,
                    },
                ],
                voteCount: {
                    type: Number,
                    default: 0,
                },
            },
        ],
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        createdByName: {
            type: String,
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        totalVotes: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

pollSchema.index({ meeting: 1, isActive: 1 });

const Poll = mongoose.model("Poll", pollSchema);
export default Poll;
