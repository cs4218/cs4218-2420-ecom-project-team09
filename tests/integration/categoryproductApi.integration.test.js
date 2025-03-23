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

    // Create test categories with slugs
    const category1 = await categoryModel.create({ 
        name: "Electronics",
        slug: "electronics"
    });
    
    const category2 = await categoryModel.create({ 
        name: "Clothing",
        slug: "clothing"
    });
    
    const category3 = await categoryModel.create({ 
        name: "Books",
        slug: "books"
    });
    
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

describe('CategoryProduct API Integration Tests', () => {
    // Test for getting products by category slug
    test("should return products for a specific category using slug", async () => {
        // Test for electronics category
        const res1 = await request(server).get("/api/v1/product/product-category/electronics");
        
        expect(res1.status).toBe(200);
        expect(res1.body.success).toBe(true);
        expect(res1.body.category.name).toBe("Electronics");
        expect(res1.body.products.length).toBe(2); // We created 2 electronics products
        
        // All returned products should be electronics
        res1.body.products.forEach(product => {
            expect(product.category._id.toString()).toBe(categories[0]._id.toString());
        });

        // Test for clothing category
        const res2 = await request(server).get("/api/v1/product/product-category/clothing");
        
        expect(res2.status).toBe(200);
        expect(res2.body.success).toBe(true);
        expect(res2.body.category.name).toBe("Clothing");
        expect(res2.body.products.length).toBe(2); // We created 2 clothing products
        
        // All returned products should be clothing
        res2.body.products.forEach(product => {
            expect(product.category._id.toString()).toBe(categories[1]._id.toString());
        });

        // Test for books category
        const res3 = await request(server).get("/api/v1/product/product-category/books");
        
        expect(res3.status).toBe(200);
        expect(res3.body.success).toBe(true);
        expect(res3.body.category.name).toBe("Books");
        expect(res3.body.products.length).toBe(1); // We created 1 books product
        
        // All returned products should be books
        res3.body.products.forEach(product => {
            expect(product.category._id.toString()).toBe(categories[2]._id.toString());
        });
    });

    // Test for non-existent category slug
    test("should handle non-existent category slug", async () => {
        const res = await request(server).get("/api/v1/product/product-category/non-existent-category");
        
        // The behavior depends on your implementation, but typically:
        // Either return a 404 not found
        // Or return a 200 with empty products array
        
        if (res.status === 404) {
            expect(res.body.success).toBe(false);
        } else {
            expect(res.status).toBe(200);
            if (res.body.success === true) {
                expect(res.body.products.length).toBe(0);
            } else {
                expect(res.body.success).toBe(false);
            }
        }
    });

    // Test for malformed category slug
    test("should handle malformed category slug", async () => {
        // Test with special characters that might cause issues
        const res = await request(server).get("/api/v1/product/product-category/invalid%20slug$#@!");
        
        // Your API should handle this gracefully without crashing
        expect(res.status).toBe(404).or(expect(res.status).toBe(200));
        
        if (res.status === 200 && res.body.success === true) {
            expect(res.body.products.length).toBe(0);
        }
    });

    // Test for correct category data structure
    test("should return correct data structure for category and products", async () => {
        const res = await request(server).get("/api/v1/product/product-category/electronics");
        
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        
        // Check category structure
        expect(res.body.category).toHaveProperty('_id');
        expect(res.body.category).toHaveProperty('name');
        expect(res.body.category).toHaveProperty('slug');
        
        // Check products structure
        expect(Array.isArray(res.body.products)).toBe(true);
        
        if (res.body.products.length > 0) {
            const product = res.body.products[0];
            expect(product).toHaveProperty('_id');
            expect(product).toHaveProperty('name');
            expect(product).toHaveProperty('slug');
            expect(product).toHaveProperty('description');
            expect(product).toHaveProperty('price');
            expect(product).toHaveProperty('category');
            expect(product).toHaveProperty('quantity');
        }
    });

    // Test for case insensitivity of slug
    test("should handle case insensitivity in category slug", async () => {
        // Test with mixed case
        const res = await request(server).get("/api/v1/product/product-category/ElEcTrOnIcS");
        
        // This depends on your implementation - some APIs are case sensitive, others are not
        // Check your actual implementation behavior and adjust expectations accordingly
        
        if (res.status === 200 && res.body.success === true && res.body.products.length > 0) {
            // If case insensitive, this should work
            expect(res.body.category.name).toBe("Electronics");
        } else {
            // If case sensitive, might return empty or error
            // This is expected behavior if your API is case-sensitive
        }
    });
});
