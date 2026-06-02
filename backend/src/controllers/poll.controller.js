import mongoose from "mongoose";
import Poll from "../models/poll.model.js";
import Notification from "../models/notification.model.js";
import Meeting from "../models/meeting.model.js";

// Create a poll
export const createPoll = async (req, res) => {
    try {
        const { meetingId, question, options } = req.body;
        const userId = req.user._id;
        const userName = req.user.fullName;

        if (!question || !options || options.length < 2) {
            return res.status(400).json({
                success: false,
                message: "Question and at least 2 options required",
            });
        }

        const pollOptions = options.map(opt => ({
            _id: new mongoose.Types.ObjectId(),
            text: opt,
            votes: [],
            voteCount: 0,
        }));

        const poll = new Poll({
            meeting: meetingId,
            question,
            options: pollOptions,
            createdBy: userId,
            createdByName: userName,
        });

        await poll.save();

        res.status(201).json({
            success: true,
            poll,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Vote on a poll
export const votePoll = async (req, res) => {
    try {
        const { pollId, optionId } = req.body;
        const userId = req.user._id;
        const userName = req.user.fullName;

        const poll = await Poll.findById(pollId);
        if (!poll) {
            return res.status(404).json({
                success: false,
                message: "Poll not found",
            });
        }

        // Check if user already voted
        for (let option of poll.options) {
            const alreadyVoted = option.votes.some(v => v.user?.toString() === userId.toString());
            if (alreadyVoted) {
                return res.status(400).json({
                    success: false,
                    message: "You have already voted on this poll",
                });
            }
        }

        // Find the option and add vote
        const option = poll.options.find(o => o._id.toString() === optionId);
        if (!option) {
            return res.status(404).json({
                success: false,
                message: "Option not found",
            });
        }

        option.votes.push({ user: userId, userName });
        option.voteCount = option.votes.length;
        poll.totalVotes += 1;

        await poll.save();

        res.status(200).json({
            success: true,
            poll,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Get all polls for a meeting
export const getPollsByMeeting = async (req, res) => {
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

        const polls = await Poll.find({ meeting: queryMeetingId }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            polls,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Close poll
export const closePoll = async (req, res) => {
    try {
        const { pollId } = req.params;

        const poll = await Poll.findByIdAndUpdate(
            pollId,
            { isActive: false },
            { new: true }
        );

        res.status(200).json({
            success: true,
            poll,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
