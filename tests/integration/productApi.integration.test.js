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

describe('Product Integration Tests', () => {
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

        // client sends a POST request to create a product
        const res = await request(app)
          .post("/api/v1/product/create-product")
          .set("Authorization", `Bearer ${adminToken}`)
          .field("name", mockProduct.name)
          .field("description", mockProduct.description)
          .field("price", mockProduct.price)
          .field("category", mockProduct.category)
          .field("quantity", mockProduct.quantity)
          .field("shipping", mockProduct.shipping);
    
        // server should respond with an error message
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

        // client sends a POST request to create a product
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

        // server should respond with a success message
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

        // client sends a POST request to create a product
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
            
        // client sends a GET request to get all products
        const res = await request(app).get("/api/v1/product/get-product");

        // server should respond with a success message
        expect(res.status).toBe(200);
        expect(res.body.products.length).toBe(1);
        expect(res.body.products[0].name).toBe(mockProduct.name);
    });

    it("should get product photo successfully", async () => {
        // First create a product
        const category = await categoryModel.findOne({ name: "Valid Category" });
        const mockProduct = {
            name: "Photo Test Product",
            description: "Product with photo",
            price: "150",
            category: category._id.toString(),
            quantity: "15",
            shipping: "true",
            photo: path.resolve(__dirname, '../ui-tests/galaxy.jpeg')
        };
    
        // Create the product
        const createRes = await request(app)
            .post("/api/v1/product/create-product")
            .set("Authorization", `Bearer ${adminToken}`)
            .field("name", mockProduct.name)
            .field("description", mockProduct.description)
            .field("price", mockProduct.price)
            .field("category", mockProduct.category)
            .field("quantity", mockProduct.quantity)
            .field("shipping", mockProduct.shipping)
            .attach("photo", mockProduct.photo);
    
        const productId = createRes.body.products._id;
    
        // Test the photo endpoint
        const photoRes = await request(app)
            .get(`/api/v1/product/product-photo/${productId}`);
    
        // Verify the response
        expect(photoRes.status).toBe(200);
        expect(photoRes.headers['content-type']).toMatch(/image\//);
        expect(photoRes.body).toBeDefined();
    });
    
    it("should get related products successfully", async () => {
        const category = await categoryModel.findOne({ name: "Valid Category" });
        
        // Create a main product
        const mainProduct = {
            name: "Main Product",
            description: "Product to find related items for",
            price: "200",
            category: category._id.toString(),
            quantity: "10",
            shipping: "true",
            photo: path.resolve(__dirname, '../ui-tests/galaxy.jpeg')
        };
    
        const mainRes = await request(app)
            .post("/api/v1/product/create-product")
            .set("Authorization", `Bearer ${adminToken}`)
            .field("name", mainProduct.name)
            .field("description", mainProduct.description)
            .field("price", mainProduct.price)
            .field("category", mainProduct.category)
            .field("quantity", mainProduct.quantity)
            .field("shipping", mainProduct.shipping)
            .attach("photo", mainProduct.photo);
    
        const productId = mainRes.body.products._id;
        const categoryId = mainProduct.category;
    
        // Create another product in the same category
        const relatedProduct = {
            name: "Related Product",
            description: "Product in the same category",
            price: "150",
            category: category._id.toString(),
            quantity: "5",
            shipping: "true",
            photo: path.resolve(__dirname, '../ui-tests/galaxy.jpeg')
        };
    
        await request(app)
            .post("/api/v1/product/create-product")
            .set("Authorization", `Bearer ${adminToken}`)
            .field("name", relatedProduct.name)
            .field("description", relatedProduct.description)
            .field("price", relatedProduct.price)
            .field("category", relatedProduct.category)
            .field("quantity", relatedProduct.quantity)
            .field("shipping", relatedProduct.shipping)
            .attach("photo", relatedProduct.photo);
    
        // Test the related products endpoint
        const relatedRes = await request(app)
            .get(`/api/v1/product/related-product/${productId}/${categoryId}`);
    
        // Verify the response
        expect(relatedRes.status).toBe(200);
        expect(relatedRes.body).toHaveProperty('products');
        expect(Array.isArray(relatedRes.body.products)).toBe(true);
        expect(relatedRes.body.products.length).toBe(1);
        expect(relatedRes.body.products[0].name).toBe("Related Product");
    });
});
