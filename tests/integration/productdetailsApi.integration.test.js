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

    // Create test products
    const laptop = await productModel.create({
        name: "Test Laptop",
        slug: "test-laptop",
        description: "High performance laptop with SSD",
        price: 999,
        category: electronics._id,
        quantity: 10,
        shipping: true
    });

    const smartphone = await productModel.create({
        name: "Test Smartphone",
        slug: "test-smartphone",
        description: "Latest smartphone with advanced camera",
        price: 699,
        category: electronics._id,
        quantity: 15,
        shipping: true
    });

    const tablet = await productModel.create({
        name: "Test Tablet",
        slug: "test-tablet",
        description: "Powerful tablet for productivity",
        price: 499,
        category: electronics._id,
        quantity: 8,
        shipping: true
    });

    const tshirt = await productModel.create({
        name: "Test T-shirt",
        slug: "test-tshirt",
        description: "Comfortable cotton t-shirt",
        price: 29,
        category: clothing._id,
        quantity: 50,
        shipping: true
    });

    products = [laptop, smartphone, tablet, tshirt];
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    server.close();
});

describe('ProductDetails API Integration Tests', () => {
    // Test for getting product details by slug
    test("should return product details by slug", async () => {
        const productSlug = "test-laptop";
        const res = await request(server).get(`/api/v1/product/get-product/${productSlug}`);
        
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.product).toBeDefined();
        expect(res.body.product.slug).toBe(productSlug);
        expect(res.body.product.name).toBe("Test Laptop");
        expect(res.body.product.price).toBe(999);
        expect(res.body.product.category).toBeDefined();
        expect(res.body.product.category.name).toBe("Electronics");
    });

    // Test for getting related products
    test("should return related products", async () => {
        const productId = products[0]._id; // laptop id
        const categoryId = categories[0]._id; // electronics category
        
        const res = await request(server)
            .get(`/api/v1/product/related-product/${productId}/${categoryId}`);
        
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.products)).toBe(true);
        
        // Should return products from the same category, but not the same product
        expect(res.body.products.length).toBe(2); // smartphone and tablet
        
        res.body.products.forEach(product => {
            expect(product.category._id.toString()).toBe(categoryId.toString());
            expect(product._id.toString()).not.toBe(productId.toString());
        });
        
        // Verify products in the related products list
        const productNames = res.body.products.map(p => p.name);
        expect(productNames).toContain("Test Smartphone");
        expect(productNames).toContain("Test Tablet");
        expect(productNames).not.toContain("Test Laptop"); // Not the original product
        expect(productNames).not.toContain("Test T-shirt"); // Not from the same category
    });

    // Test for non-existent product slug
    test("should handle non-existent product slug", async () => {
        const productSlug = "non-existent-product";
        const res = await request(server).get(`/api/v1/product/get-product/${productSlug}`);
        
        // The behavior depends on your implementation
        if (res.status === 404) {
            expect(res.body.success).toBe(false);
        } else {
            expect(res.status).toBe(200);
            if (res.body.success === true) {
                expect(res.body.product).toBeFalsy();
            } else {
                expect(res.body.success).toBe(false);
            }
        }
    });

    // Test for malformed product slug
    test("should handle malformed product slug", async () => {
        const res = await request(server).get(`/api/v1/product/get-product/invalid%20slug$#@!`);
        
        // Your API should handle this gracefully without crashing
        expect(res.status).toBe(404).or(expect(res.status).toBe(200));
        
        if (res.status === 200 && res.body.success === true) {
            expect(res.body.product).toBeFalsy();
        }
    });

    // Test for non-existent product ID in related products
    test("should handle non-existent product ID in related products", async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const categoryId = categories[0]._id;
        
        const res = await request(server)
            .get(`/api/v1/product/related-product/${nonExistentId}/${categoryId}`);
        
        // Should return success with empty products or error based on implementation
        if (res.body.success === true) {
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.products)).toBe(true);
            // May return other products in the same category or empty array
        } else {
            expect(res.status).toBe(404).or(expect(res.status).toBe(500));
        }
    });

    // Test for non-existent category ID in related products
    test("should handle non-existent category ID in related products", async () => {
        const productId = products[0]._id;
        const nonExistentCategoryId = new mongoose.Types.ObjectId();
        
        const res = await request(server)
            .get(`/api/v1/product/related-product/${productId}/${nonExistentCategoryId}`);
        
        // Should return success with empty products or error based on implementation
        if (res.body.success === true) {
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.products)).toBe(true);
            expect(res.body.products.length).toBe(0); // No products in non-existent category
        } else {
            expect(res.status).toBe(404).or(expect(res.status).toBe(500));
        }
    });

    // Test for product photo endpoint
    test("should return product photo", async () => {
        const productId = products[0]._id;
        
        const res = await request(server)
            .get(`/api/v1/product/product-photo/${productId}`);
        
        // Photo might be null/undefined in test data but API should respond
        expect(res.status).toBe(200).or(expect(res.status).toBe(404));
        
        if (res.status === 200) {
            // If there's an actual photo, response should have appropriate content type
            // This might vary based on implementation
            expect(res.headers['content-type']).toMatch(/^image\//);
        }
    });

    // Test for invalid product ID in photo endpoint
    test("should handle invalid product ID in photo endpoint", async () => {
        const invalidId = "invalid-id";
        
        const res = await request(server)
            .get(`/api/v1/product/product-photo/${invalidId}`);
        
        // Should handle invalid ID gracefully
        expect(res.status).toBe(500).or(expect(res.status).toBe(404));
    });

    // Test for complete data structure in product details
    test("should return complete product data structure", async () => {
        const productSlug = "test-laptop";
        const res = await request(server).get(`/api/v1/product/get-product/${productSlug}`);
        
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        
        const product = res.body.product;
        
        // Check all required fields for product details page
        expect(product).toHaveProperty('_id');
        expect(product).toHaveProperty('name');
        expect(product).toHaveProperty('slug');
        expect(product).toHaveProperty('description');
        expect(product).toHaveProperty('price');
        expect(product).toHaveProperty('category');
        expect(product).toHaveProperty('quantity');
        expect(product).toHaveProperty('shipping');
        
        // Check category structure
        expect(product.category).toHaveProperty('_id');
        expect(product.category).toHaveProperty('name');
    });
});