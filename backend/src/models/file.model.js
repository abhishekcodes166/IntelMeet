import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
    {
        meeting: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Meeting",
            required: true,
        },
        message: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        uploadedByName: {
            type: String,
            required: true,
        },
        fileName: {
            type: String,
            required: true,
        },
        fileSize: {
            type: Number, // in bytes
            required: true,
        },
        mimeType: {
            type: String,
            required: true,
        },
        fileUrl: {
            type: String,
            required: true,
        },
        fileType: {
            type: String,
            enum: ["image", "document", "video", "audio", "other"],
            default: "other",
        },
    },
    {
        timestamps: true,
    }
);

fileSchema.index({ meeting: 1, createdAt: -1 });

const File = mongoose.model("File", fileSchema);
export default File;
