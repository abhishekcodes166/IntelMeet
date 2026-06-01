import Whiteboard from "../models/whiteboard.model.js";

// Get or create whiteboard for a meeting
export const getWhiteboard = async (req, res) => {
    try {
        const { meetingId } = req.params;

        let whiteboard = await Whiteboard.findOne({ meeting: meetingId });

        if (!whiteboard) {
            whiteboard = new Whiteboard({
                meeting: meetingId,
                content: "[]",
            });
            await whiteboard.save();
        }

        res.status(200).json({
            success: true,
            whiteboard,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Update whiteboard (called from socket, but also available via REST)
export const updateWhiteboard = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const { content } = req.body;
        const userId = req.user._id;
        const userName = req.user.fullName;

        let whiteboard = await Whiteboard.findOne({ meeting: meetingId });

        if (!whiteboard) {
            whiteboard = new Whiteboard({
                meeting: meetingId,
                content,
                updatedBy: userId,
                updatedByName: userName,
            });
        } else {
            whiteboard.content = content;
            whiteboard.updatedBy = userId;
            whiteboard.updatedByName = userName;
            whiteboard.version += 1;
        }

        await whiteboard.save();

        res.status(200).json({
            success: true,
            whiteboard,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Clear whiteboard
export const clearWhiteboard = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const userId = req.user._id;
        const userName = req.user.fullName;

        let whiteboard = await Whiteboard.findOne({ meeting: meetingId });

        if (whiteboard) {
            whiteboard.content = "[]";
            whiteboard.updatedBy = userId;
            whiteboard.updatedByName = userName;
            whiteboard.version += 1;
            await whiteboard.save();
        }

        res.status(200).json({
            success: true,
            message: "Whiteboard cleared",
            whiteboard,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
