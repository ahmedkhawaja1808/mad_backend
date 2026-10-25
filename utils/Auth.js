
import jwt from "jsonwebtoken";
import User from "../Schema/User.js";

export const isAuthenticated = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        const bearerToken = authHeader?.startsWith("Bearer ")
            ? authHeader.slice(7).trim()
            : null;

        const cookieToken = req.cookies?.token;
        const token = bearerToken || cookieToken;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "User is not logged in"
            });
        }

        const decodedData = jwt.verify(token, process.env.SECRET_KEY);

        const user = await User.findById(decodedData.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found"
            });
        }

        if (user.isActive === false) {
            return res.status(401).json({
                success: false,
                message: "User account is inactive"
            });
        }

        if (
            decodedData.tokenVersion !== undefined &&
            decodedData.tokenVersion !== user.tokenVersion
        ) {
            return res.status(401).json({
                success: false,
                message: "Session expired. Please login again"
            });
        }

        req.user = user;
        next();

    } catch (error) {
        if (
            error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError"
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token"
            });
        }

        console.error("Authentication error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
};

export const isManager = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to access this resource"
            });
        }

        next();
    };
};
