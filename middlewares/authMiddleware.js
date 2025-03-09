import JWT, { TokenExpiredError } from "jsonwebtoken";
import userModel from "../models/userModel.js";

// Protected routes token base
export const requireSignIn = async (req, res, next) => {
    try {
        // Check if authorization header exists
        if (!req.headers.authorization) {
            return res.status(401).send({
                success: false,
                message: "Access denied. No token provided",
            });
        }

        // Handle Bearer token format
        const token = req.headers.authorization.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : req.headers.authorization;

        const decode = JWT.verify(
            token,
            process.env.JWT_SECRET
        );
        req.user = decode;
        next();

    } catch (error) {
        console.error(error);
        // Return proper error response
        return res.status(401).send({
            success: false,
            message: "Invalid token",
            error: error.message,
        });
    }
};

//admin access
export const isAdmin = async (req, res, next) => {
    try {
        // Check if req.user exists
        if (!req.user || !req.user._id) {
            return res.status(401).send({
                success: false,
                message: "User not authenticated",
            });
        }

        const user = await userModel.findById(req.user._id);

        // Check if user exists
        if (!user) {
            return res.status(404).send({
            success: false,
            message: "User not found",
            });
        }

        if(user.role !== 1) {
            return res.status(401).send({
                success: false,
                message: "Unauthorized Access",
            });
        } else {
            next();
        }

    } catch (error) {
        console.error(error);
        res.status(500).send({
            success: false,
            error,
            message: "Error in admin middleware",
        });
    }
};
