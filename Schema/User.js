import mongoose from "mongoose";
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import crypto from 'crypto'

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        trim: true
    },
    profileImage: {
        url: {
            type: String,
            default: ""
        },
        public_id: {
            type: String,
            default: ""
        }
    },
    password: {
        type: String,
        required: true,
        trim: true,
        minLength: [8, "Enter 8 charcaters"]
    },
    role: {
        type: String,
        required: true,
        enum: ["Customer", "Manager"]
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date
}, { timestamps: true })

userSchema.pre("save", async function () {
    if (!this.isModified("password")) {
        return
    }
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    return
})

userSchema.methods.comparePassword = async function (enterPassword) {
    return await bcrypt.compare(enterPassword, this.password)
}

userSchema.methods.jsonWebToken = function () {
    return jwt.sign({ id: this._id }, process.env.SECRET_KEY, { expiresIn: '7d' })
}

userSchema.methods.getResetPasswordToken = function () {
    const resetToken = crypto.randomBytes(20).toString("hex")
    this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex")
    this.resetPasswordExpire = Date.now() + 30 * 60 * 1000
    return resetToken
}

const User = mongoose.model("Users", userSchema)
export default User