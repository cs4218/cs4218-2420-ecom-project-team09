import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../../server.js';
import productModel from '../../models/productModel.js';
import categoryModel from '../../models/categoryModel.js';
import userModel from '../../models/userModel.js';
import bcrypt from 'bcrypt';
import JWT from 'jsonwebtoken';

let server;
let mongoServer;
let adminToken;
let categories = [];

beforeAll(async () => {
    // Start the server
    server = app.listen(0);
    
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

    // Generate an authentication token for the admin
    adminToken = JWT.sign(
        { _id: adminUser._id },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );

    // Create test categories
    const category1 = await categoryModel.create({ name: "Electronics" });
    const category2 = await categoryModel.create({ name: "Clothing" });
    const category3 = await categoryModel.create({ name: "Books" });
    
    categories = [category1, category2, category3];

    // Create test products
    await productModel.create({
        name: "Laptop",
        slug: "laptop",
        description: "High performance laptop with SSD",
        price: 999,
        category: category1._id,
        quantity: 10,
        shipping: true
    });

    await productModel.create({
        name: "Smartphone",
        slug: "smartphone",
        description: "Latest smartphone with advanced camera",
        price: 699,
        category: category1._id,
        quantity: 15,
        shipping: true
    });

    await productModel.create({
        name: "T-shirt",
        slug: "t-shirt",
        description: "Comfortable cotton t-shirt",
        price: 29,
        category: category2._id,
        quantity: 50,
        shipping: true
    });

    await productModel.create({
        name: "Jeans",
        slug: "jeans",
        description: "Durable denim jeans",
        price: 49,
        category: category2._id,
        quantity: 30,
        shipping: true
    });

    await productModel.create({
        name: "Novel",
        slug: "novel",
        description: "Bestselling fiction novel",
        price: 15,
        category: category3._id,
        quantity: 100,
        shipping: false
    });
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    server.close();
});

describe('HomePage API Integration Tests', () => {
    // Test for getting all categories
    test("should return all categories", async () => {
        const res = await request(server).get("/api/v1/category/get-category");
        
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.category.length).toBe(3);
        expect(res.body.category.some(cat => cat.name === "Electronics")).toBe(true);
        expect(res.body.category.some(cat => cat.name === "Clothing")).toBe(true);
        expect(res.body.category.some(cat => cat.name === "Books")).toBe(true);
    });

    // Test for getting product count
    test("should return total product count", async () => {
        const res = await request(server).get("/api/v1/product/product-count");
        
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.total).toBe(5); // We created 5 products
    });

    // Test for getting products with pagination (page 1)
    test("should return products for page 1", async () => {
        const res = await request(server).get("/api/v1/product/product-list/1");
        
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        // Check if we're getting the correct number of products
        // Assuming pagination is set to return first set of products
        expect(res.body.products.length).toBeGreaterThan(0);
    });

    // Test for getting products with pagination (page 2)
    test("should return products for page 2", async () => {
        // Assuming pagination limit is set to less than 5 (total products)
        // this should return the remaining products
        const res = await request(server).get("/api/v1/product/product-list/2");
        
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    // Test for filtering products by category
    test("should filter products by category", async () => {
        // Filter by Electronics category
        const electronicsCategory = categories[0]._id;
        
        const res = await request(server)
            .post("/api/v1/product/product-filters")
            .send({
                checked: [electronicsCategory],
                radio: []
            });
        
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.products.length).toBe(2); // We have 2 electronics products
        
        // All returned products should be electronics
        res.body.products.forEach(product => {
            expect(product.category.toString()).toBe(electronicsCategory.toString());
        });
    });

    // Test for filtering products by price range
    test("should filter products by price range", async () => {
        // Filter by price range 0-49
        const res = await request(server)
            .post("/api/v1/product/product-filters")
            .send({
                checked: [],
                radio: [0, 49]
            });
        
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        
        // All returned products should be within the price range
        res.body.products.forEach(product => {
            expect(product.price).toBeGreaterThanOrEqual(0);
            expect(product.price).toBeLessThanOrEqual(49);
        });
    });

    // Test for filtering products by both category and price
    test("should filter products by both category and price range", async () => {
        // Filter by Clothing category and price range 0-30
        const clothingCategory = categories[1]._id;
        
        const res = await request(server)
            .post("/api/v1/product/product-filters")
            .send({
                checked: [clothingCategory],
                radio: [0, 30]
            });
        
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        
        // All returned products should be clothing and within the price range
        res.body.products.forEach(product => {
            expect(product.category.toString()).toBe(clothingCategory.toString());
            expect(product.price).toBeGreaterThanOrEqual(0);
            expect(product.price).toBeLessThanOrEqual(30);
        });
    });

    // Test for getting product details for a specific product
    test("should return product details by slug", async () => {
        const slug = "laptop";
        const res = await request(server).get(`/api/v1/product/get-product/${slug}`);
        
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.product.slug).toBe(slug);
        expect(res.body.product.name).toBe("Laptop");
    });

    // Test for getting similar products
    test("should return similar products", async () => {
        const productId = (await productModel.findOne({ slug: "laptop" }))._id;
        const categoryId = categories[0]._id; // Electronics category
        
        const res = await request(server)
            .get(`/api/v1/product/related-product/${productId}/${categoryId}`);
        
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        
        // All returned products should be from the same category but not the same product
        res.body.products.forEach(product => {
            expect(product.category.toString()).toBe(categoryId.toString());
            expect(product._id.toString()).not.toBe(productId.toString());
        });
    });

    // Test for search functionality
    test("should search products by keyword", async () => {
        const keyword = "laptop";
        
        const res = await request(server)
            .get(`/api/v1/product/search/${keyword}`);
        
        expect(res.status).toBe(200);
        
        // Returned products should contain the keyword in name or description
        res.body.forEach(product => {
            const nameMatch = product.name.toLowerCase().includes(keyword.toLowerCase());
            const descMatch = product.description.toLowerCase().includes(keyword.toLowerCase());
            expect(nameMatch || descMatch).toBe(true);
        });
    });
});
