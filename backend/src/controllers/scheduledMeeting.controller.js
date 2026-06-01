import ScheduledMeeting from "../models/scheduledMeeting.model.js";
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import nodemailer from "nodemailer";

// Email transporter setup
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

// Schedule meeting
export const scheduleMeeting = async (req, res) => {
    try {
        const {
            title,
            description,
            attendeeEmails,
            scheduledStartTime,
            scheduledEndTime,
            timeZone,
        } = req.body;

        const hostId = req.user._id;

        // Prepare attendees array
        const attendees = [];
        for (const email of attendeeEmails) {
            const user = await User.findOne({ email });
            attendees.push({
                email,
                user: user ? user._id : null,
                status: "invited",
                hasResponded: false,
            });
        }

        const meeting = new ScheduledMeeting({
            title,
            description,
            host: hostId,
            attendees,
            scheduledStartTime: new Date(scheduledStartTime),
            scheduledEndTime: new Date(scheduledEndTime),
            timeZone,
        });

        await meeting.save();

        // Send invitation emails and notifications
        for (const attendee of attendees) {
            // Send email
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: attendee.email,
                subject: `Meeting Invitation: ${title}`,
                html: `
                    <h2>${title}</h2>
                    <p>${description}</p>
                    <p><strong>Scheduled:</strong> ${new Date(scheduledStartTime).toLocaleString()}</p>
                    <p><strong>Timezone:</strong> ${timeZone}</p>
                    <p>
                        <a href="${process.env.FRONTEND_URL}/meeting/${meeting._id}">Join Meeting</a>
                    </p>
                `,
            };

            try {
                await transporter.sendMail(mailOptions);
            } catch (emailError) {
                console.error("Email send error:", emailError);
            }

            // Create notification for registered users
            if (attendee.user) {
                const notification = new Notification({
                    recipient: attendee.user,
                    sender: hostId,
                    senderName: req.user.fullName,
                    type: "meeting_scheduled",
                    title: `Meeting Scheduled: ${title}`,
                    message: `${req.user.fullName} scheduled a meeting for you`,
                    data: { meetingId: meeting._id },
                });
                await notification.save();
            }
        }

        res.status(201).json({
            success: true,
            meeting,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Get scheduled meetings for user
export const getScheduledMeetings = async (req, res) => {
    try {
        const userId = req.user._id;

        const meetings = await ScheduledMeeting.find({
            $or: [
                { host: userId },
                { "attendees.user": userId },
            ],
        })
            .populate("host", "fullName email")
            .sort({ scheduledStartTime: 1 });

        res.status(200).json({
            success: true,
            meetings,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Update RSVP status
export const updateRsvpStatus = async (req, res) => {
    try {
        const { meetingId, status } = req.body;
        const userEmail = req.user.email;

        const meeting = await ScheduledMeeting.findByIdAndUpdate(
            meetingId,
            {
                $set: {
                    "attendees.$[elem].status": status,
                    "attendees.$[elem].hasResponded": true,
                },
            },
            {
                arrayFilters: [{ "elem.email": userEmail }],
                new: true,
            }
        );

        res.status(200).json({
            success: true,
            meeting,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Get meeting details
export const getMeetingDetails = async (req, res) => {
    try {
        const { meetingId } = req.params;

        const meeting = await ScheduledMeeting.findById(meetingId).populate(
            "host attendees.user",
            "fullName email"
        );

        res.status(200).json({
            success: true,
            meeting,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Cancel scheduled meeting
export const cancelMeeting = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const userId = req.user._id;

        const meeting = await ScheduledMeeting.findById(meetingId);

        if (!meeting || meeting.host.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to cancel this meeting",
            });
        }

        meeting.status = "cancelled";
        await meeting.save();

        // Notify attendees
        for (const attendee of meeting.attendees) {
            if (attendee.user) {
                const notification = new Notification({
                    recipient: attendee.user,
                    sender: userId,
                    type: "meeting_scheduled",
                    title: `Meeting Cancelled: ${meeting.title}`,
                    message: "The scheduled meeting has been cancelled",
                });
                await notification.save();
            }
        }

        res.status(200).json({
            success: true,
            message: "Meeting cancelled",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
