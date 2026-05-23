import User from '../models/user.model.js';

const registerUser = async (req, res) => {
    try {
        console.log(req.body);
        const {fullName,email,password} = req.body;
        
        if(!fullName || !email || !password){
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields"
            })
        }

        //check existing user
        const existingUser = await User.findOne({email});
        if(existingUser){
            return res.status(400).json({
                success: false,
                message: "User with this email already exists"
            })
        }

        const user = await User.create({fullName,email,password});

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            user,
        });
    }
    catch (error){

    console.log(error);

    return res.status(500).json({
        success:false,
        message: error.message || "Server Error",
    })
}
};

const loginUser = async (req, res) => {
    try{
        const {email,password} = req.body;
        
        if(!email || !password){
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields"
            })
        }
        const user = await User.findOne({email});

        if(!user){
            return res.status(400).json({
                success: false,
                message: "Invalid email or password"
            })
        }

        const isPasswordCorrect = await user.isPasswordCorrect(password);

        if(!isPasswordCorrect){
            return res.status(400).json({
                success: false,
                message: "Invalid email or password"
            })
        }

        const token = user.generateAuthToken();

        const loggedinUser = await User.findById(user._id).select("-password");

        return res.status(200).json({
            success: true,
            message: "User logged in successfully",
            token,
            user: loggedinUser
        });
    }
    catch (error){

    console.log(error);

    return res.status(500).json({
        success:false,
        message: error.message || "Server Error",
    })
    }
}

const getCurrentUser = async (req, res) => {

    return res.status(200).json({
        success: true,
        user: req.user,
    });

};  

export {registerUser, loginUser, getCurrentUser};