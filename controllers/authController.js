import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";

import { comparePassword, hashPassword } from "./../helpers/authHelper.js";
import JWT from "jsonwebtoken";

export const registerController = async(req, res) => {
    try {
        const { name, email, password, phone, address, answer } = req.body;
        //validations
        if (!name) {
            return res.status(400).send({ 
                success: false,
                error: "Name is Required",
            });
        }
        if (!email) {
            return res.status(400).send({ 
                success: false,
                message: "Email is Required",
            });
        }
        if (!email.match(/.@.+/)) {
            return res.status(400).send({ 
                success: false,
                message: "Invalid Email",
            });
        }
        if (!password) {
            return res.status(400).send({ 
                success: false,
                message: "Password is Required",
            });
        }
        if (!phone) {
            return res.status(400).send({ 
                success: false,
                message: "Phone no is Required",
            });
        }
        if (!address) {
            return res.status(400).send({ 
                success: false,
                message: "Address is Required",
            });
        }
        if (!answer) {
            return res.status(400).send({ 
                success: false,
                message: "Answer is Required",
            });
        }
        //check user
        const exisitingUser = await userModel.findOne({ email });
        //exisiting user
        if (exisitingUser) {
            return res.status(409).send({
                success: false,
                message: "Already Register please login",
            });
        }
        //register user
        const hashedPassword = await hashPassword(password);
        //save
        const user = await new userModel({
            name,
            email,
            phone,
            address,
            password: hashedPassword,
            answer,
        }).save();

        res.status(201).send({
            success: true,
            message: "User Register Successfully",
            user,
        });
    } catch (error) {
        console.log(error);
        res.status(500).send({
            success: false,
            message: "Error in Registration",
            error,
        });
    }
};

//POST LOGIN
export const loginController = async(req, res) => {
    try {
        const { email, password } = req.body;
        //validation
        if (!email || !password) {
            return res.status(401).send({
                success: false,
                message: "Invalid email or password",
            });
        }
        //check user
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(401).send({
                success: false,
                message: "Email is not registered",
            });
        }
        const match = await comparePassword(password, user.password);
        if (!match) {
            return res.status(401).send({
                success: false,
                message: "Invalid Password",
            });
        }
        //token
        const token = await JWT.sign({ _id: user._id }, process.env.JWT_SECRET, {
            expiresIn: "7d",
        });
        res.status(200).send({
            success: true,
            message: "login successfully",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                address: user.address,
                role: user.role,
            },
            token,
        });
    } catch (error) {
        console.log(error);
        res.status(500).send({
            success: false,
            message: "Error in login",
            error,
        });
    }
};

//forgotPasswordController

export const forgotPasswordController = async(req, res) => {
    try {
        const { email, answer, newPassword } = req.body;
        if (!email) {
            res.status(400).send({
                success: false,
                message: "Email is required"
            });
            return;
        }
        if (!answer) {
            res.status(400).send({
                success: false,
                message: "Answer is required"
            });
            return;
        }
        if (!newPassword) {
            res.status(400).send({ 
                success: false,
                message: "New Password is required" 
            });
            return;
        }
        //check
        const user = await userModel.findOne({ email, answer });
        //validation
        if (!user) {
            res.status(401).send({
                success: false,
                message: "Wrong Email Or Answer",
            });
            return;
        }
        const hashed = await hashPassword(newPassword);
        await userModel.findByIdAndUpdate(user._id, { password: hashed });
        res.status(200).send({
            success: true,
            message: "Password Reset Successfully",
        });
        return;
    } catch (error) {
        console.log(error);
        res.status(500).send({
            success: false,
            message: "Something went wrong",
            error,
        });
    }
};

//test controller
export const testController = (req, res) => {
    try {
        res.send("Protected Routes");
    } catch (error) {
        console.log(error);
        res.send({ error });
    }
};

//update prfole
export const updateProfileController = async(req, res) => {
    try {
        const { name, email, answer, password, address, phone } = req.body;
        const user = await userModel.findById(req.user._id);
        //password
        if (!password || password.length < 6) {
            return res.status(400).send({
                success: false,
                message: "Password is required and 6 character long",
            });
        }
        const hashedPassword = await hashPassword(password);
        const updatedUser = await userModel.findByIdAndUpdate(
            req.user._id, {
                name: name || user.name,
                answer: answer || user.answer,
                email: email || user.email,
                password: hashedPassword || user.password,
                phone: phone || user.phone,
                address: address || user.address,
            }, { new: true }
        );
        res.status(200).send({
            success: true,
            message: "Profile Updated Successfully",
            updatedUser,
        });
    } catch (error) {
        console.log(error);
        res.status(500).send({
            success: false,
            message: "Error WHile Update profile",
            error,
        });
    }
};

//orders
export const getOrdersController = async(req, res) => {
    try {
        const orders = await orderModel
            .find({ buyer: req.user._id })
            .populate("products", "-photo")
            .populate("buyer", "name");
        res.json(orders);
    } catch (error) {
        console.log(error);
        res.status(500).send({
            success: false,
            message: "Error WHile Geting Orders",
            error,
        });
    }
};
//orders
export const getAllOrdersController = async(req, res) => {
    try {
        const orders = await orderModel
            .find({})
            .populate("products", "-photo")
            .populate("buyer", "name")
            .sort({ createdAt: "-1" });
        res.json(orders);
    } catch (error) {
        console.log(error);
        res.status(500).send({
            success: false,
            message: "Error While Getting Orders",
            error,
        });
    }
};

//order status
export const orderStatusController = async(req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;
        if (!orderId) {
            return res.status(400).send({
                success: false,
                message: "Order ID is required",
            });
        }
        if (!status) {
            return res.status(400).send({
                success: false,
                message: "Status is required",
            });
        }
        const orders = await orderModel.findByIdAndUpdate(
            orderId, { status }, { new: true }
        );
        res.status(200).send({
            success: true,
            message: "Order Status Updated Successfully",
            orders,
        });
    } catch (error) {
        console.log(error);
        res.status(500).send({
            success: false,
            message: "Error While Updating Order",
            error,
        });
    }
};