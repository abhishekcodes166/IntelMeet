import File from "../models/file.model.js";
import Message from "../models/message.model.js";

// Upload file (metadata tracking)
export const uploadFile = async (req, res) => {
    try {
        const { meetingId, fileName, fileSize, mimeType, fileUrl, messageId } = req.body;
        const userId = req.user._id;
        const userName = req.user.fullName;

        // Determine file type based on MIME type
        let fileType = "other";
        if (mimeType.startsWith("image")) fileType = "image";
        else if (mimeType.startsWith("video")) fileType = "video";
        else if (mimeType.startsWith("audio")) fileType = "audio";
        else if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("word")) fileType = "document";

        const file = new File({
            meeting: meetingId,
            message: messageId || null,
            uploadedBy: userId,
            uploadedByName: userName,
            fileName,
            fileSize,
            mimeType,
            fileUrl,
            fileType,
        });

        await file.save();

        res.status(201).json({
            success: true,
            file,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Get files for a meeting
export const getFilesByMeeting = async (req, res) => {
    try {
        const { meetingId } = req.params;

        const files = await File.find({ meeting: meetingId })
            .populate("uploadedBy", "fullName email")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            files,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Delete file
export const deleteFile = async (req, res) => {
    try {
        const { fileId } = req.params;
        const userId = req.user._id;

        const file = await File.findById(fileId);

        if (!file) {
            return res.status(404).json({
                success: false,
                message: "File not found",
            });
        }

        // Check if user is the uploader or meeting host
        if (file.uploadedBy.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to delete this file",
            });
        }

        await File.findByIdAndDelete(fileId);

        res.status(200).json({
            success: true,
            message: "File deleted",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
