import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../../server';
import productModel from '../../models/productModel';
import userModel from '../../models/userModel';
import categoryModel from '../../models/categoryModel';
import bcrypt from 'bcrypt';
import JWT from 'jsonwebtoken';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('E-commerce API Integration Tests', () => {
    let mongoServer;
    let adminToken;

    beforeAll(async () => {
        await mongoose.disconnect();

        // Start in-memory MongoDB server
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);

        // Insert an admin user for authentication
        const hashedPassword = await bcrypt.hash('123456', 10);
        const adminUser = await userModel.create({
            name: "Test Admin",
            email: "test@test.com",
            password: hashedPassword,
            role: 1,
            phone: "1234567890",  
            address: "Test Address", 
            answer: "Test Answer"
        });

        await categoryModel.create({
            name: "Valid Category"
        });

        // Generate an authentication token for the admin
        adminToken = JWT.sign(
            { _id: adminUser._id },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        console.log("===== Test database initialized. =====");
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    afterEach(async () => {
        await productModel.deleteMany();
    });

    test('sanity check: GET / should return welcome message', async () => {
        const res = await request(app).get('/');
        expect(res.status).toBe(200);
        expect(res.text).toContain('Welcome to ecommerce app');
    });

    it("should return error if photo is missing", async () => {
        const mockProduct = {
          name: "Test Product",
          description: "Test Description",
          price: "100",
          category: "Test Category",
          quantity: "10",
          shipping: "Yes",
        };

        const res = await request(app)
          .post("/api/v1/product/create-product")
          .set("Authorization", `Bearer ${adminToken}`)
          .field("name", mockProduct.name)
          .field("description", mockProduct.description)
          .field("price", mockProduct.price)
          .field("category", mockProduct.category)
          .field("quantity", mockProduct.quantity)
          .field("shipping", mockProduct.shipping);
    
        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Photo is Required and should be less then 1mb");
    });

    it("should create a product successfully", async () => {
        const category = await categoryModel.findOne({ name: "Valid Category" });
        const mockProduct = {
            name: "Valid Product",
            description: "Valid Description",
            price: "200",
            category: category._id.toString(),
            quantity: "20",
            shipping: "true",
            photo: path.resolve(__dirname, '../ui-tests/galaxy.jpeg')
        };

        const res = await request(app)
            .post("/api/v1/product/create-product")
            .set("Authorization", `Bearer ${adminToken}`)
            .field("name", mockProduct.name)
            .field("description", mockProduct.description)
            .field("price", mockProduct.price)
            .field("category", mockProduct.category)
            .field("quantity", mockProduct.quantity)
            .field("shipping", mockProduct.shipping)
            .attach("photo", mockProduct.photo); 

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("Product Created Successfully");
        expect(res.body.products).toHaveProperty("_id");
        expect(res.body.products.name).toBe(mockProduct.name);
    });

    it("interaction between createProductController and getProductController", async () => {
        const category = await categoryModel.findOne({ name: "Valid Category" });
        const mockProduct = {
            name: "Valid Product",
            description: "Valid Description",
            price: "200",
            category: category._id.toString(),
            quantity: "20",
            shipping: "true",
            photo: path.resolve(__dirname, '../ui-tests/galaxy.jpeg')
        };

        await request(app)
            .post("/api/v1/product/create-product")
            .set("Authorization", `Bearer ${adminToken}`)
            .field("name", mockProduct.name)
            .field("description", mockProduct.description)
            .field("price", mockProduct.price)
            .field("category", mockProduct.category)
            .field("quantity", mockProduct.quantity)
            .field("shipping", mockProduct.shipping)
            .attach("photo", mockProduct.photo);
            
        const res = await request(app).get("/api/v1/product/get-product");
        expect(res.status).toBe(200);
        expect(res.body.products.length).toBe(1);
        expect(res.body.products[0].name).toBe(mockProduct.name);
    });
});
