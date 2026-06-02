import File from "../models/file.model.js";
import Message from "../models/message.model.js";
import Meeting from "../models/meeting.model.js";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";

// Initialize Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Real binary upload to Cloudinary
export const uploadToCloudinary = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded",
            });
        }

        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            return res.status(500).json({
                success: false,
                message: "Cloudinary is not configured on the server. Please check backend .env settings.",
            });
        }

        // Upload stream wrapped in a Promise
        const uploadStream = (fileBuffer, options) => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                });
                stream.end(fileBuffer);
            });
        };

        const mimeType = req.file.mimetype;
        let resourceType = "raw"; // default for documents / other files
        if (mimeType.startsWith("image/")) {
            resourceType = "image";
        } else if (mimeType.startsWith("video/")) {
            resourceType = "video";
        }

        const options = {
            folder: "ai_meet_shared_files",
            resource_type: resourceType,
            public_id: `${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9.]/g, "_")}`,
        };

        const result = await uploadStream(req.file.buffer, options);

        return res.status(200).json({
            success: true,
            fileUrl: result.secure_url,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
        });
    } catch (error) {
        console.error("Cloudinary Upload Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to upload file to Cloudinary",
            error: error.message,
        });
    }
};

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

        let queryMeetingId = meetingId;
        // If the meetingId is a meetingCode (not a valid ObjectId), resolve it first
        if (!mongoose.isValidObjectId(meetingId)) {
            const meeting = await Meeting.findOne({ meetingCode: meetingId });
            if (!meeting) {
                return res.status(404).json({
                    success: false,
                    message: "Meeting not found",
                });
            }
            queryMeetingId = meeting._id;
        }

        const files = await File.find({ meeting: queryMeetingId })
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
