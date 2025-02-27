/** @jest-environment node */

import { 
    loginController, 
    registerController, 
    forgotPasswordController, 
    testController,
    updateProfileController,
    orderStatusController,
} from "./authController";
import { comparePassword, hashPassword } from "./../helpers/authHelper.js";
import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";

jest.mock("../models/userModel.js");
jest.mock("../models/orderModel.js");
jest.mock("../helpers/authHelper.js");

let req, res;

beforeEach(() => {
    res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
    }
    comparePassword.mockResolvedValue(true);
    hashPassword.mockResolvedValue("hashedPassword");
    userModel.findOne = jest.fn().mockReturnValue(null);
    userModel.save = jest.fn().mockReturnValue(null);
    userModel.findById = jest.fn().mockReturnValue(null);
    orderModel.findByIdAndUpdate = jest.fn().mockReturnValue(null);
    comparePassword.mockResolvedValue(true);
})

const mockUser = {
    name: "John Doe",
    email: "john@doe.com",
    password: "password",
    phone: "1234567890",
    address: "123 Main St",
    answer: "answer",
}

const mockUser2 = {
    name: "Jane Doe",
    email: "jane@doe.com",
    password: "password2",
    phone: "1234567891",
    address: "123 Side St",
    answer: "answer2",
}

describe("test registerController", () => {

    beforeEach(() => {
        req = {
            body: { ...mockUser } // deep copy
        }
        userModel.findOne.mockReturnValue(null);
        userModel.save.mockReturnValue(null);
    })

    afterEach(() => {
        jest.resetAllMocks();
    })

    it ("Register new user (201 Created)", async () => {
        await registerController(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: true
        }));
    })

    it ("No name (400 Bad Request)", async () => {
        req.body.name = "";
        await registerController(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false
        }));
    })

    it ("No email (400 Bad Request)", async () => {
        req.body.email = "";
        await registerController(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false
        }));
    })

    it ("Invalid email (400 Bad Request)", async () => {
        req.body.email = "invalid-email";
        await registerController(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false
        }));
    })

    it ("No password (400 Bad Request)", async () => {
        req.body.password = "";
        await registerController(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false
        }));
    })

    it ("No phone no (400 Bad Request)", async () => {
        req.body.phone = "";
        await registerController(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false
        }));
    })

    it ("No address (400 Bad Request)", async () => {
        req.body.address = "";
        await registerController(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false
        }));
    })

    it ("No answer (400 Bad Request)", async () => {
        req.body.answer = "";
        await registerController(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false
        }));
    })

    it ("User already exists (409 Conflict)", async () => {
        req.body.email = "john@doe.com";
        userModel.findOne.mockReturnValue({ email: req.body.email });

        await registerController(req, res);
        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false
        }));
    })
});

describe("test loginController", () => {
    
    beforeEach(() => {
        req = {
            body: {
                email: mockUser.email,
                password: mockUser.password,
            }
        }
        userModel.findOne.mockReturnValue({
            email: mockUser.email,
            password: mockUser.password,
        });
    })

    afterEach(() => {
        jest.resetAllMocks();
    })

    it("Login successful (200 OK)", async () => {
        await loginController(req, res);
        comparePassword.mockResolvedValue(true);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: true
        }));
    })

    it("No email provided (401 Unauthorized)", async () => {
        req.body.email = undefined;
        await loginController(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
        }));
    })

    it("No password provided (401 Unauthorized)", async () => {
        req.body.password = undefined;
        await loginController(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
        }));
    })

    it("User not registered (401 Unauthorized)", async () => {
        console.log("No password provided (401 Unauthorized)");
        userModel.findOne = jest.fn().mockReturnValue(null);
        await loginController(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
        }));
    })

    it("Invalid password (401 Unauthorized)", async () => {
        comparePassword.mockResolvedValue(false);
        await loginController(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
        }));
    })
    
    it ("Successfully logged in (200 OK)", async () => {
        await loginController(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
        }));
    })
});

describe("test forgotPasswordController", () => {
    const newPassword = "newPassword";
    beforeEach(() => {
        req = {
            body: {
                email: mockUser.email,
                answer: mockUser.answer,
                newPassword: newPassword,
            }
        }
        userModel.findOne.mockReturnValue(mockUser);
    })

    afterEach(() => {
        jest.resetAllMocks();
    })

    it ("Email is required (400 Bad Request)", async () => {
        req.body.email = undefined;
        await forgotPasswordController(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
        }));
    })

    it ("Answer is required (400 Bad Request)", async () => {
        req.body.answer = undefined;
        await forgotPasswordController(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
        }));
    })

    it ("New password is required (400 Bad Request)", async () => {
        req.body.newPassword = undefined;
        await forgotPasswordController(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
        }));
    })

    it ("Wrong email or answer (401 Unauthorized)", async () => {
        userModel.findOne.mockReturnValue(null);
        await forgotPasswordController(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
        }));
    })

    it ("Password reset successfully (200 OK)", async () => {
        await forgotPasswordController(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
        }));
    })
})
  
// I suppose I can add a test for this...
describe("test testController", () => {
    afterEach(() => {
        jest.resetAllMocks();
    })

    it ("testController", async () => {
        await testController(req, res);
    })
})

describe("test updateProfileController", () => {
    beforeEach(() => {
        req = {
            body: {
                name: mockUser.name,
                email: mockUser.email,
                password: mockUser.password,
                address: mockUser.address,
                phone: mockUser.phone,
            },
            user: {
                _id: mockUser.email,
            }
        }

        userModel.findById.mockReturnValue(mockUser);
        userModel.findByIdAndUpdate.mockReturnValue(mockUser);
        hashPassword.mockReturnValue("hashedPassword");
    })

    afterEach(() => {
        jest.resetAllMocks();
    })

    it ("Undefined password (400 Bad Request)", async () => {
        req.body.password = undefined;
        await updateProfileController(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
        }));
    })

    it ("Password is less than 6 characters (400 Bad Request)", async () => {
        req.body.password = "short";
        await updateProfileController(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
            success: false,
        }));
    })

    it ("Empty request body (except password) does not change anything", async () => {
        req.body = {};
        req.body.password = mockUser.password;
        await updateProfileController(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
        }));
        expect(userModel.findByIdAndUpdate.mock.calls[0][1]).toEqual({...mockUser, password: "hashedPassword"});
    })

    it ("Update profile with the same details (200 OK)", async () => {
        req.body = { ...mockUser };
        await updateProfileController(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
        }));
        expect(userModel.findByIdAndUpdate.mock.calls[0][1]).toEqual({...mockUser, password: "hashedPassword"});
    })

    it ("Update profile successfully (200 OK)", async () => {
        req.body = { ...mockUser2 };
        await updateProfileController(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
        }));
        expect(userModel.findByIdAndUpdate.mock.calls[0][1]).toEqual({...mockUser2, password: "hashedPassword"});
    })
})

/*
Test cases for:
- getOrdersController
- getAllOrdersController

this will just be a wrapper around the mocks, so this is not tested.
*/

describe("test orderStatusController", () => {
    beforeEach(() => {
        req = {
            params: {
                orderId: "123",
            },
            body: {
                status: "delivered",
            }
        }
    })

    afterEach(() => {
        jest.resetAllMocks();
    })

    it ("no orderID (400 Bad Request)", async () => {
        req.params.orderId = undefined;
        await orderStatusController(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
        }));
    })

    it ("no status (400 Bad Request)", async () => {
        req.body.status = undefined;
        await orderStatusController(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
        }));
    })
    
    it ("Order updated OK (200 OK)", async () => {
        await orderStatusController(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
        }));
        expect(orderModel.findByIdAndUpdate.mock.calls[0][0]).toEqual("123");
        expect(orderModel.findByIdAndUpdate.mock.calls[0][1]).toEqual({status: "delivered"});
    })
})