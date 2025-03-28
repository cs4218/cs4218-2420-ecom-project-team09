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

    it("should get product count successfully", async () => {
        // Create multiple products for testing count
        const category = await categoryModel.findOne({ name: "Valid Category" });
        const mockPhotoPath = path.resolve(__dirname, '../ui-tests/galaxy.jpeg');
        
        // Create 3 products
        const productData = [
            {
                name: "Count Product 1",
                description: "First test product for count",
                price: "100",
                category: category._id.toString(),
                quantity: "10",
                shipping: "true"
            },
            {
                name: "Count Product 2",
                description: "Second test product for count",
                price: "200",
                category: category._id.toString(),
                quantity: "20",
                shipping: "false"
            },
            {
                name: "Count Product 3",
                description: "Third test product for count",
                price: "300",
                category: category._id.toString(),
                quantity: "30",
                shipping: "true"
            }
        ];
        
        // Create each product
        for (const product of productData) {
            await request(app)
                .post("/api/v1/product/create-product")
                .set("Authorization", `Bearer ${adminToken}`)
                .field("name", product.name)
                .field("description", product.description)
                .field("price", product.price)
                .field("category", product.category)
                .field("quantity", product.quantity)
                .field("shipping", product.shipping)
                .attach("photo", mockPhotoPath);
        }
        
        // Test the product count endpoint
        const countRes = await request(app).get("/api/v1/product/product-count");
        
        // Verify the response
        expect(countRes.status).toBe(200);
        expect(countRes.body).toHaveProperty('success', true);
        expect(countRes.body).toHaveProperty('total');
        expect(typeof countRes.body.total).toBe('number');
        expect(countRes.body.total).toBe(3); // Expecting 3 products created in this test
    });

    it("should get product list by page successfully", async () => {
        // Create multiple products for testing pagination
        const category = await categoryModel.findOne({ name: "Valid Category" });
        const mockPhotoPath = path.resolve(__dirname, '../ui-tests/galaxy.jpeg');
        
        // Create 6 products (to ensure we have enough for pagination)
        const productData = Array.from({ length: 6 }, (_, i) => ({
            name: `List Product ${i + 1}`,
            description: `Test product ${i + 1} for pagination`,
            price: `${(i + 1) * 100}`,
            category: category._id.toString(),
            quantity: `${(i + 1) * 10}`,
            shipping: (i % 2 === 0).toString()
        }));
        
        // Create each product
        for (const product of productData) {
            await request(app)
                .post("/api/v1/product/create-product")
                .set("Authorization", `Bearer ${adminToken}`)
                .field("name", product.name)
                .field("description", product.description)
                .field("price", product.price)
                .field("category", product.category)
                .field("quantity", product.quantity)
                .field("shipping", product.shipping)
                .attach("photo", mockPhotoPath);
        }
        
        // Test the product list endpoint for page 1
        const page = 1;
        const listRes = await request(app).get(`/api/v1/product/product-list/${page}`);
        
        // Verify the response
        expect(listRes.status).toBe(200);
        expect(listRes.body).toHaveProperty('success', true);
        expect(listRes.body).toHaveProperty('products');
        expect(Array.isArray(listRes.body.products)).toBe(true);
        
        // Assuming the API returns a maximum of 6 products per page
        expect(listRes.body.products.length).toBeLessThanOrEqual(6);
        
        // Verify the structure of the first product
        const firstProduct = listRes.body.products[0];
        expect(firstProduct).toHaveProperty('_id');
        expect(firstProduct).toHaveProperty('name');
        expect(firstProduct).toHaveProperty('slug');
        expect(firstProduct).toHaveProperty('description');
        expect(firstProduct).toHaveProperty('price');
        expect(firstProduct).toHaveProperty('category');
        expect(firstProduct).toHaveProperty('quantity');
        expect(firstProduct).toHaveProperty('shipping');
        expect(firstProduct).toHaveProperty('createdAt');
        expect(firstProduct).toHaveProperty('updatedAt');
    });

    it("should get products by category slug successfully", async () => {
        // Create a category using the same approach as your existing test
        const categoryName = "Books Category";
        
        // Create category via API to ensure proper slug generation
        const categoryRes = await request(app)
            .post("/api/v1/category/create-category")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ name: categoryName });
            
        // Get the category data from response
        const category = categoryRes.body.category;
        const categorySlug = category.slug;
        
        console.log("Created category:", {
            name: category.name,
            slug: categorySlug,
            id: category._id
        });
        
        // Create products in this category
        const mockPhotoPath = path.resolve(__dirname, '../ui-tests/galaxy.jpeg');
        
        // Create 2 products in our test category
        const productData = [
            {
                name: "Test Book 1",
                description: "First test book in category",
                price: "29.99",
                category: category._id.toString(),
                quantity: "15",
                shipping: "true"
            },
            {
                name: "Test Book 2",
                description: "Second test book in category",
                price: "39.99",
                category: category._id.toString(),
                quantity: "25",
                shipping: "false"
            }
        ];
        
        // Create each product
        for (const product of productData) {
            await request(app)
                .post("/api/v1/product/create-product")
                .set("Authorization", `Bearer ${adminToken}`)
                .field("name", product.name)
                .field("description", product.description)
                .field("price", product.price)
                .field("category", product.category)
                .field("quantity", product.quantity)
                .field("shipping", product.shipping)
                .attach("photo", mockPhotoPath);
        }
        
        // Test the product-category endpoint with the slug from API response
        const productCategoryRes = await request(app).get(`/api/v1/product/product-category/${categorySlug}`);
        
        // Log response for debugging
        if (productCategoryRes.status !== 200) {
            console.log("Failed product-category response:", productCategoryRes.status, productCategoryRes.body);
        }
        
        // Verify the response
        expect(productCategoryRes.status).toBe(200);
        expect(productCategoryRes.body).toHaveProperty('success', true);
        
        // Verify category information
        expect(productCategoryRes.body).toHaveProperty('category');
        expect(productCategoryRes.body.category).toHaveProperty('_id', category._id);
        expect(productCategoryRes.body.category).toHaveProperty('name', categoryName);
        expect(productCategoryRes.body.category).toHaveProperty('slug', categorySlug);
        
        // Verify products information
        expect(productCategoryRes.body).toHaveProperty('products');
        expect(Array.isArray(productCategoryRes.body.products)).toBe(true);
        expect(productCategoryRes.body.products.length).toBe(2);
        
        // Check that product names match what we created
        const productNames = productCategoryRes.body.products.map(p => p.name).sort();
        expect(productNames).toEqual(['Test Book 1', 'Test Book 2'].sort());
    });

    it("should filter products by categories and price range", async () => {
        // Create a test category
        const categoryName = "Test Filter Category";
        
        // Create category via API
        const categoryRes = await request(app)
            .post("/api/v1/category/create-category")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ name: categoryName });
            
        // Get the category data from response
        const category = categoryRes.body.category;
        const categoryId = category._id;
        
        // Create test products with different prices
        const mockPhotoPath = path.resolve(__dirname, '../ui-tests/galaxy.jpeg');
        
        // Create products in different price ranges
        const productsData = [
            {
                name: "Low Price Product",
                description: "Product in the low price range",
                price: "15.99", // In the [0,19] range
                category: categoryId,
                quantity: "10",
                shipping: "true"
            },
            {
                name: "Medium Price Product",
                description: "Product in the medium price range",
                price: "45.99", // In the [40,59] range
                category: categoryId,
                quantity: "10",
                shipping: "true"
            },
            {
                name: "High Price Product",
                description: "Product in the high price range",
                price: "85.99", // In the [80,99] range
                category: categoryId,
                quantity: "10",
                shipping: "true"
            }
        ];
        
        // Create each product
        for (const product of productsData) {
            await request(app)
                .post("/api/v1/product/create-product")
                .set("Authorization", `Bearer ${adminToken}`)
                .field("name", product.name)
                .field("description", product.description)
                .field("price", product.price)
                .field("category", product.category)
                .field("quantity", product.quantity)
                .field("shipping", product.shipping)
                .attach("photo", mockPhotoPath);
        }
        
        // Test the product-filters endpoint
        // Filter for category and low price range [0,19]
        const filtersPayload = {
            "checked": [categoryId],
            "radio": [0, 19]
        };
        
        const filtersRes = await request(app)
            .post("/api/v1/product/product-filters")
            .send(filtersPayload);
        
        // Verify the response
        expect(filtersRes.status).toBe(200);
        expect(filtersRes.body).toHaveProperty('success', true);
        expect(filtersRes.body).toHaveProperty('products');
        expect(Array.isArray(filtersRes.body.products)).toBe(true);
        
        // Should only return the product in the low price range
        expect(filtersRes.body.products.length).toBe(1);
        expect(filtersRes.body.products[0].name).toBe("Low Price Product");
        expect(parseFloat(filtersRes.body.products[0].price)).toBeLessThanOrEqual(19);
        
        // Test with a different price range
        const highPriceFiltersPayload = {
            "checked": [categoryId],
            "radio": [80, 99]
        };
        
        const highPriceFiltersRes = await request(app)
            .post("/api/v1/product/product-filters")
            .send(highPriceFiltersPayload);
        
        // Verify the high price filter response
        expect(highPriceFiltersRes.status).toBe(200);
        expect(highPriceFiltersRes.body.products.length).toBe(1);
        expect(highPriceFiltersRes.body.products[0].name).toBe("High Price Product");
        expect(parseFloat(highPriceFiltersRes.body.products[0].price)).toBeGreaterThanOrEqual(80);
        expect(parseFloat(highPriceFiltersRes.body.products[0].price)).toBeLessThanOrEqual(99);
    });
});
