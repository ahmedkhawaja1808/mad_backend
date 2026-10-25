
import User from "../Schema/User.js";
import bcrypt from "bcryptjs";
import sendToken from "../utils/Token.js";
import { cloudinary, cloudinaryUpload } from "../utils/Upload.js";

export const signUp = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: "Please fill in all required fields.",
            });
        }

        const alreadyUser = await User.findOne({ email });

        if (alreadyUser) {
            return res.status(409).json({
                success: false,
                message: "User already exists. Please sign in.",
            });
        }

        const user = await User.create(req.body);

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User could not be created.",
            });
        }

        return sendToken(user, 201, res);
    } catch (error) {
        console.error("Signup error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong during signup.",
        });
    }
};

export const signIn = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide your email and password.",
            });
        }

        const user = await User.findOne({ email }).select("+password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found. Please sign up.",
            });
        }

        const comparePassword = await bcrypt.compare(
            password,
            user.password
        );

        if (!comparePassword) {
            return res.status(401).json({
                success: false,
                message: "Email or password is incorrect.",
            });
        }

        return sendToken(user, 200, res);
    } catch (error) {
        console.error("Signin error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong during signin.",
        });
    }
};

export const logOut = async (req, res) => {
    try {
        return res
            .status(200)
            .cookie("token", null, {
                expires: new Date(0),
                httpOnly: true,
            })
            .json({
                success: true,
                message: "User logged out successfully.",
            });
    } catch (error) {
        console.error("Logout error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong during logout.",
        });
    }
};

export const getMe = async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            user: req.user,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const updatePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Please provide both old and new passwords.",
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: "The new password must be at least 8 characters.",
            });
        }

        const user = await User.findById(req.user._id).select("+password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Your old password is incorrect.",
            });
        }

        user.password = newPassword;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password updated successfully.",
        });
    } catch (error) {
        console.error("Update password error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while updating the password.",
        });
    }
};

export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password");

        return res.status(200).json({
            success: true,
            count: users.length,
            users,
        });
    } catch (error) {
        console.error("Get all users error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while fetching users.",
        });
    }
};

export const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        return res.status(200).json({
            success: true,
            user,
        });
    } catch (error) {
        console.error("Get user by ID error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while fetching the user.",
        });
    }
};

export const updateUser = async (req, res) => {
    try {
        const { name, email, role } = req.body;
        const updateData = {};

        if (name !== undefined) {
            updateData.name = name;
        }

        if (email !== undefined) {
            updateData.email = email;
        }

        if (role !== undefined) {
            updateData.role = role;
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            {
                new: true,
                runValidators: true,
            }
        ).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "User updated successfully.",
            user,
        });
    } catch (error) {
        console.error("Update user error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Something went wrong while updating the user.",
        });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        if (user.profileImage?.public_id) {
            try {
                await cloudinary.uploader.destroy(user.profileImage.public_id);
            } catch (deleteError) {
                console.error("Profile image deletion error:", deleteError);
            }
        }

        return res
            .status(200)
            .cookie("token", null, {
                expires: new Date(0),
                httpOnly: true,
            })
            .json({
                success: true,
                message: "User deleted successfully.",
            });
    } catch (error) {
        console.error("Delete user error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while deleting the user.",
        });
    }
};

export const updateProfileImage = async (req, res) => {
    let uploadedImage;

    try {
        if (!req.user?._id) {
            return res.status(401).json({
                success: false,
                message: "Please sign in to update your profile image.",
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No image received. Select a file using the image field.",
            });
        }

        if (!req.file.mimetype?.startsWith("image/")) {
            return res.status(400).json({
                success: false,
                message: "Upload a valid image.",
            });
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        uploadedImage = await cloudinaryUpload(req.file.buffer);

        if (!uploadedImage?.secure_url || !uploadedImage?.public_id) {
            if (uploadedImage?.public_id) {
                await cloudinary.uploader.destroy(uploadedImage.public_id);
            }

            return res.status(500).json({
                success: false,
                message: "Cloudinary did not return a valid image URL.",
            });
        }

        const oldPublicId = user.profileImage?.public_id;

        user.profileImage = {
            url: uploadedImage.secure_url,
            public_id: uploadedImage.public_id,
        };

        await user.save();

        const updatedUser = await User.findById(user._id).select("-password");

        if (oldPublicId && oldPublicId !== uploadedImage.public_id) {
            try {
                await cloudinary.uploader.destroy(oldPublicId);
            } catch (deleteError) {
                console.error(
                    "Previous profile image deletion error:",
                    deleteError
                );
            }
        }

        return res.status(200).json({
            success: true,
            message: "Profile image updated successfully.",
            user: updatedUser,
        });
    } catch (error) {
        console.error("Profile image upload error:", error);

        if (uploadedImage?.public_id) {
            try {
                await cloudinary.uploader.destroy(uploadedImage.public_id);
            } catch (deleteError) {
                console.error(
                    "Uploaded image cleanup error:",
                    deleteError
                );
            }
        }

        const statusCode = error.code === "LIMIT_FILE_SIZE" ? 413 : 500;

        return res.status(statusCode).json({
            success: false,
            message:
                error.code === "LIMIT_FILE_SIZE"
                    ? "Image size must not exceed 5 MB."
                    : error.message || "Profile image upload failed.",
        });
    }
};
