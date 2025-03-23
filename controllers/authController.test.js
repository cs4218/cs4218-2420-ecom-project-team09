import { jest } from '@jest/globals';
import { 
    loginController, 
    registerController, 
    forgotPasswordController, 
    testController,
    updateProfileController,
    orderStatusController,
} from "./authController";
import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";
import mockingoose from 'mockingoose';
import mongoose from "mongoose";
import { hashPassword } from '../helpers/authHelper.js';

let req, res;

beforeEach(() => {
    res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
    }
    
    jest.spyOn(userModel, 'findOne').mockImplementation(() => Promise.resolve(null));
    jest.spyOn(userModel.prototype, 'save').mockImplementation(() => Promise.resolve(null));
    jest.spyOn(userModel, 'findById').mockImplementation(() => Promise.resolve(null));
    jest.spyOn(orderModel, 'findByIdAndUpdate').mockImplementation(() => Promise.resolve(null));
})

const mockUser = {
    _id: new mongoose.Types.ObjectId(),
    name: "John Doe",
    email: "john@doe.com",
    password: await hashPassword("password"),
    plain_password: "password",
    phone: "1234567890",
    address: {
        street: "123 Main St",
        city: "Anytown",
        state: "Anystate",
        zip: "12345"
    },
    answer: "answer",
}

const mockUser2 = {
    _id: new mongoose.Types.ObjectId(),
    name: "Jane Doe",
    email: "jane@doe.com",
    password: await hashPassword("password2"),
    plain_password: "password2",
    phone: "1234567891",
    address: {
        street: "123 Side St",
        city: "Othertown",
        state: "Otherstate",
        zip: "67890"
    },
    answer: "answer2",
}

describe("test registerController", () => {

    beforeEach(() => {
        req = {
            body: { ...mockUser } // deep copy
        }
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
        req.body.email = mockUser.email;
        jest.spyOn(userModel, 'findOne').mockImplementation(() => Promise.resolve(mockUser));
        await registerController(req, res);
        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false
        }));
    })/*  */
});

describe("test loginController", () => {
    
    beforeEach(() => {
        req = {
            body: {
                email: mockUser.email,
                password: mockUser.plain_password,
            }
        }
    })

    afterEach(() => {
        jest.resetAllMocks();
    })

    // it("Login successful (200 OK)", async () => {
    //     jest.spyOn(userModel, 'findOne').mockImplementation(() => Promise.resolve(mockUser));
    //     await loginController(req, res);
    //     expect(res.status).toHaveBeenCalledWith(200);
    //     expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
    //         success: true
    //     }));
    // })

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
        jest.spyOn(userModel, 'findOne').mockImplementation(() => Promise.resolve(null));
        await loginController(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
        }));
    })

    it("Invalid password (401 Unauthorized)", async () => {
        await loginController(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
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
        jest.spyOn(userModel, 'findOne').mockImplementation(() => Promise.resolve(null));
        await forgotPasswordController(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
        }));
    })

    it ("Password reset successfully (200 OK)", async () => {
        jest.spyOn(userModel, 'findOne').mockImplementation(() => Promise.resolve(mockUser));
        jest.spyOn(userModel, 'findByIdAndUpdate').mockImplementation(() => Promise.resolve(mockUser));
        
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
        jest.spyOn(userModel, 'findById').mockImplementation(() => Promise.resolve(mockUser));
        jest.spyOn(userModel, 'findByIdAndUpdate').mockImplementation((oldDoc, newDoc) => Promise.resolve(newDoc));
        await updateProfileController(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
        }));
        const expectedUpdate = {...mockUser, password: "hashedPassword"};
        jest.spyOn(userModel, 'findByIdAndUpdate').mockImplementation(() => Promise.resolve(expectedUpdate));
    })

    it ("Update profile with the same details (200 OK)", async () => {
        req.body = { ...mockUser };
        await updateProfileController(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
        }));
        const expectedUpdate = {...mockUser, password: "hashedPassword"};
        jest.spyOn(userModel, 'findByIdAndUpdate').mockImplementation(() => Promise.resolve(expectedUpdate));
    })

    it ("Update profile successfully (200 OK)", async () => {
        req.body = { ...mockUser2 };
        jest.spyOn(userModel, 'findById').mockImplementation(() => Promise.resolve(mockUser));
        await updateProfileController(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
        }));
        const expectedUpdate = {...mockUser2, password: "hashedPassword"};
        jest.spyOn(userModel, 'findByIdAndUpdate').mockImplementation(() => Promise.resolve(expectedUpdate));
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
        const expectedOrderUpdate = {status: "delivered"};
        jest.spyOn(orderModel, 'findByIdAndUpdate').mockImplementation(() => Promise.resolve(expectedOrderUpdate));
    })
})