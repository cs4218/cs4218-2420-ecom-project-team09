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
let products = [];

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
    const electronics = await categoryModel.create({ 
        name: "Electronics",
        slug: "electronics"
    });
    
    const clothing = await categoryModel.create({ 
        name: "Clothing",
        slug: "clothing"
    });
    
    categories = [electronics, clothing];

    // Create test products with specific keywords for search testing
    const laptop = await productModel.create({
        name: "Gaming Laptop",
        slug: "gaming-laptop",
        description: "High performance gaming laptop with RTX graphics",
        price: 1299,
        category: electronics._id,
        quantity: 10,
        shipping: true
    });

    const workLaptop = await productModel.create({
        name: "Business Laptop",
        slug: "business-laptop",
        description: "Professional laptop for work",
        price: 999,
        category: electronics._id,
        quantity: 15,
        shipping: true
    });

    const smartphone = await productModel.create({
        name: "Smartphone Pro",
        slug: "smartphone-pro",
        description: "Latest smartphone with advanced camera",
        price: 699,
        category: electronics._id,
        quantity: 20,
        shipping: true
    });

    const tshirt = await productModel.create({
        name: "Cotton T-shirt",
        slug: "cotton-tshirt",
        description: "Comfortable cotton t-shirt",
        price: 29,
        category: clothing._id,
        quantity: 50,
        shipping: true
    });

    const jeans = await productModel.create({
        name: "Denim Jeans",
        slug: "denim-jeans",
        description: "Classic blue jeans",
        price: 49,
        category: clothing._id,
        quantity: 30,
        shipping: true
    });

    products = [laptop, workLaptop, smartphone, tshirt, jeans];
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    server.close();
});

describe('Search API Integration Tests', () => {
    // Test for searching products by keyword in name
    test("should search products by keyword in name", async () => {
        const keyword = "laptop";
        
        const res = await request(server)
            .get(`/api/v1/product/search/${keyword}`);
        
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(2); // Should find both laptops
        
        // All returned products should contain keyword in name
        res.body.forEach(product => {
            expect(product.name.toLowerCase()).toContain(keyword.toLowerCase());
        });
        
        // Check specific products by name
        const productNames = res.body.map(p => p.name);
        expect(productNames).toContain("Gaming Laptop");
        expect(productNames).toContain("Business Laptop");
        expect(productNames).not.toContain("Smartphone Pro");
    });

    // Test for searching products by keyword in description
    test("should search products by keyword in description", async () => {
        const keyword = "professional";
        
        const res = await request(server)
            .get(`/api/v1/product/search/${keyword}`);
        
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(1);
        
        // Should match the description
        expect(res.body[0].description.toLowerCase()).toContain(keyword.toLowerCase());
        expect(res.body[0].name).toBe("Business Laptop");
    });

    // Test for searching products with partial match
    test("should search products with partial keyword match", async () => {
        const keyword = "smart";
        
        const res = await request(server)
            .get(`/api/v1/product/search/${keyword}`);
        
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(1);
        
        // Should match the smartphone
        expect(res.body[0].name).toBe("Smartphone Pro");
    });

    // Test for searching products with case-insensitive match
    test("should search products with case-insensitive matching", async () => {
        const keyword = "GAMING";
        
        const res = await request(server)
            .get(`/api/v1/product/search/${keyword}`);
        
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(1);
        
        // Should match despite different case
        expect(res.body[0].name).toBe("Gaming Laptop");
    });

    // Test for searching products with no results
    test("should return empty array for search with no results", async () => {
        const keyword = "nonexistent";
        
        const res = await request(server)
            .get(`/api/v1/product/search/${keyword}`);
        
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(0);
    });

    // Test for searching products with multiple words
    test("should search products with multiple words", async () => {
        const keyword = "business laptop";
        
        const res = await request(server)
            .get(`/api/v1/product/search/${keyword}`);
        
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        
        // Since your search likely uses regex or partial matching,
        // this could potentially match both laptops or just the business one
        // Adjust this expectation based on your actual implementation
        expect(res.body.some(p => p.name === "Business Laptop")).toBe(true);
    });

    // Test for searching with special characters
    test("should handle search with special characters", async () => {
        const keyword = "laptop%&";
        
        const res = await request(server)
            .get(`/api/v1/product/search/${keyword}`);
        
        // Should handle special chars without crashing
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    // Test for searching with very long keyword
    test("should handle search with very long keyword", async () => {
        const keyword = "a".repeat(100);
        
        const res = await request(server)
            .get(`/api/v1/product/search/${keyword}`);
        
        // Should handle long keyword without crashing
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(0);
    });

    // Test for searching with empty keyword
    test("should handle search with empty keyword", async () => {
        const keyword = "";
        
        const res = await request(server)
            .get(`/api/v1/product/search/${keyword}`);
        
        // Behavior depends on implementation - might return all products or none
        expect(res.status).toBe(200).or(expect(res.status).toBe(400));
        
        if (res.status === 200) {
            expect(Array.isArray(res.body)).toBe(true);
        }
    });

    // Test for correct product data structure in search results
    test("should return complete product data structure in search results", async () => {
        const keyword = "laptop";
        
        const res = await request(server)
            .get(`/api/v1/product/search/${keyword}`);
        
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
        
        const product = res.body[0];
        
        // Check all required fields for search results display
        expect(product).toHaveProperty('_id');
        expect(product).toHaveProperty('name');
        expect(product).toHaveProperty('slug');
        expect(product).toHaveProperty('description');
        expect(product).toHaveProperty('price');
        expect(product).toHaveProperty('category');
        expect(product).toHaveProperty('quantity');
    });

    // Test for product photo endpoint with search results
    test("should be able to get photos for search results", async () => {
        // First get search results
        const keyword = "laptop";
        const searchRes = await request(server)
            .get(`/api/v1/product/search/${keyword}`);
        
        expect(searchRes.status).toBe(200);
        expect(searchRes.body.length).toBeGreaterThan(0);
        
        // Now try to get photo for the first result
        const productId = searchRes.body[0]._id;
        const photoRes = await request(server)
            .get(`/api/v1/product/product-photo/${productId}`);
        
        // Photo might be null/undefined in test data but API should respond
        expect(photoRes.status).toBe(200).or(expect(photoRes.status).toBe(404));
    });
});