import Recording from "../models/recording.model.js";

// Start recording
export const startRecording = async (req, res) => {
    try {
        const { meetingId } = req.body;
        const userId = req.user._id;
        const userName = req.user.fullName;

        const recording = new Recording({
            meeting: meetingId,
            initiatedBy: userId,
            initiatedByName: userName,
            status: "recording",
        });

        await recording.save();

        res.status(201).json({
            success: true,
            recording,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Stop recording
export const stopRecording = async (req, res) => {
    try {
        const { recordingId } = req.body;

        const recording = await Recording.findByIdAndUpdate(
            recordingId,
            {
                status: "stopped",
                endTime: new Date(),
                isProcessing: true,
            },
            { new: true }
        );

        if (recording) {
            const duration = Math.floor((recording.endTime - recording.startTime) / 1000);
            recording.duration = duration;
            await recording.save();
        }

        res.status(200).json({
            success: true,
            recording,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Get recordings for meeting
export const getRecordingsByMeeting = async (req, res) => {
    try {
        const { meetingId } = req.params;

        const recordings = await Recording.find({ meeting: meetingId })
            .populate("initiatedBy", "fullName email")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            recordings,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Mark recording as completed
export const markRecordingCompleted = async (req, res) => {
    try {
        const { recordingId, recordingUrl, fileSize } = req.body;

        const recording = await Recording.findByIdAndUpdate(
            recordingId,
            {
                status: "completed",
                isProcessing: false,
                recordingUrl,
                fileSize,
            },
            { new: true }
        );

        res.status(200).json({
            success: true,
            recording,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Delete recording
export const deleteRecording = async (req, res) => {
    try {
        const { recordingId } = req.params;

        await Recording.findByIdAndDelete(recordingId);

        res.status(200).json({
            success: true,
            message: "Recording deleted",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
