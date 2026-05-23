import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const userSchema  = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        password: {
            type: String,
            required: true,
            minlength: 6,
        },
    },
    {
        timestamps: true,
    }
);

userSchema.pre("save", async function () {

    try {

        if (!this.isModified("password")) {
            return;
        }

        this.password = await bcrypt.hash(this.password, 10);


    } catch (error) {
        next(error);
    }

});

userSchema.methods.isPasswordCorrect = async function (password){
    return await bcrypt.compare(password,this.password);
};

userSchema.methods.generateAuthToken = function () {
    const token = jwt.sign({ userId: this._id, email: this.email }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "1h",
    });

    return token;
}

const User = mongoose.model("User", userSchema);

export default User;