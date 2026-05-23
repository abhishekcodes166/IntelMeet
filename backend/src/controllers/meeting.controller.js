import Meeting from "../models/meeting.model.js";

const generateMeetingCode = () => {
    return Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
};

const createMeeting = async (req, res) => {
    try{
        const {title} = req.body;

        if(!title){
            return res.status(400).json({
                success: false,
                message: "Please provide meeting title",
            });
        }
        
        const meetingCode = generateMeetingCode();
        const meeting = await Meeting.create({
            title,
            meetingCode,
            host: req.user._id,
            participants: [req.user._id],
        });

        return res.status(201).json({
            success: true,
            message: "Meeting created successfully",
            meeting,
        });
    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            success:false,
            message: error.message || "Server Error",
        })
    }
}

const joinMeeting = async (req, res) => {
    try{
        const {meetingCode} = req.body;
        
        if(!meetingCode){
            return res.status(400).json({
                success: false,
                message: "Please provide meeting code",
            });
        }
        const meeting = await Meeting.findOne({meetingCode});

        if(!meeting){
            return res.status(404).json({
                success: false,
                message: "Meeting not found",
            });
        }

        // Check if user is already a participant
        if(meeting.participants.includes(req.user._id)){
            return res.status(400).json({
                success: false,
                message: "You have already joined this meeting",
            });
        }

        meeting.participants.push(req.user._id);
        await meeting.save();

        return res.status(200).json({
            success: true,
            message: "Joined meeting successfully",
            meeting,
        }); 
    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            success:false,
            message: error.message || "Server Error",
        })
    }
}

const getUserMeetings = async (req, res) => {

    try {

        const meetings = await Meeting.find({
            participants: req.user._id,
        })
        .populate("host", "fullName email")
        .populate("participants", "fullName email")
        .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            meetings,
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });

    }

};

export {createMeeting, joinMeeting, getUserMeetings};