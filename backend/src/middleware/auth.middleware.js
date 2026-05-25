import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const verifyjwt = async (req, res, next) => {
    try{
        const token = req.header("Authorization")?.replace("Bearer ", "");
        if(!token){
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select("-password");

        if(!user){
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        
        req.user = user;
        next();
    }
    catch(error){
        console.log(error);
        return res.status(401).json({
            success: false,
            message: "Unauthorized",
        });
    }
}

export const protect = verifyjwt;
export default verifyjwt;