import mongoose from "mongoose";

const whiteboardSchema = new mongoose.Schema(
    {
        meeting: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Meeting",
            required: true,
        },
        content: {
            type: String, // JSON string of drawing data (strokes)
            default: "[]",
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        updatedByName: {
            type: String,
        },
        version: {
            type: Number,
            default: 1,
        },
    },
    {
        timestamps: true,
    }
);

whiteboardSchema.index({ meeting: 1 });

const Whiteboard = mongoose.model("Whiteboard", whiteboardSchema);
export default Whiteboard;
