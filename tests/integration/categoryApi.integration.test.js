import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../../server';
import userModel from '../../models/userModel';
import categoryModel from '../../models/categoryModel';
import bcrypt from 'bcrypt';
import JWT from 'jsonwebtoken';

describe('Category Integration Tests', () => {
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
        await categoryModel.deleteMany();
    });

    it("should return 201 for successful category creation", async () => {
        const newCategory = "Valid Category";

        // Client send a POST request to create a new category
        const res = await request(app)
          .post("/api/v1/category/create-category")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ name: newCategory });
          
        // Server should respond with 201 status code
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("new category created");
        expect(res.body.category.name).toBe(newCategory);
    });

    it("should return 200, category already exist for duplicate category creation", async () => {
        const newCategory = "Valid Category";

        // Client send a POST request to create a new category twice
        await request(app)
          .post("/api/v1/category/create-category")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ name: newCategory });

        const res = await request(app)
          .post("/api/v1/category/create-category")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ name: newCategory });
          
        // Server should respond with 200 status code
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("Category Already Exists");
    });

    it("should return 200 for successful category update", async () => {
        const updatedCategory = "Updated Category";

        // Create a new category
        const newCategory = await categoryModel.create({
            name: "Valid Category"
        });

        // Client send a PUT request to update the category
        const res = await request(app)
          .put(`/api/v1/category/update-category/${newCategory._id}`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ name: updatedCategory });
          
        // Server should respond with 200 status code
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.messsage).toBe("Category Updated Successfully");
        expect(res.body.category.name).toBe(updatedCategory);
    });

    it("should return 500 for category update with invalid category ID", async () => {
        const updatedCategory = "Updated Category";

        // Client send a PUT request to update the category with invalid ID
        const res = await request(app)
          .put(`/api/v1/category/update-category/invalid_id`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ name: updatedCategory });
          
        // Server should respond with 500 status code
        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Error while updating category");
    });

    it("should return 200 for category delete", async () => {
        // Create a new category
        const newCategory = await categoryModel.create({
            name: "Valid Category"
        });

        // Client send a DELETE request to delete the category
        const res = await request(app)
          .delete(`/api/v1/category/delete-category/${newCategory._id}`)
          .set("Authorization", `Bearer ${adminToken}`);
          
        // Server should respond with 200 status code
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("Category Deleted Successfully");
    });

    it("should return 500 for category delete with invalid category ID", async () => {
        // Client send a DELETE request to delete the category with invalid ID
        const res = await request(app)
          .delete(`/api/v1/category/delete-category/invalid_id`)
          .set("Authorization", `Bearer ${adminToken}`);
          
        // Server should respond with 500 status code
        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Error while deleting category");
    });

    it("should return all categories", async () => {
      // Create multiple test categories
      const categoryNames = ["Books", "Electronics", "Clothing"];
      
      // Create each category
      for (const name of categoryNames) {
          await categoryModel.create({
              name: name
          });
      }
      
      // Client sends a GET request to get all categories
      const res = await request(app)
          .get("/api/v1/category/get-category");
      
      // Server should respond with 200 status code
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("All Categories List");
      
      // Should return the categories array
      expect(res.body).toHaveProperty('category');
      expect(Array.isArray(res.body.category)).toBe(true);
      expect(res.body.category.length).toBe(3);
      
      // Verify each category has the required properties
      res.body.category.forEach(category => {
          expect(category).toHaveProperty('_id');
          expect(category).toHaveProperty('name');
          expect(category).toHaveProperty('__v');
          
          // Verify each category name is in our list
          expect(categoryNames).toContain(category.name);
      });
      
      // Verify all category names are present (accounting for case differences)
      const returnedNames = res.body.category.map(cat => cat.name.toLowerCase());
      const expectedNames = categoryNames.map(name => name.toLowerCase());
      
      expectedNames.forEach(name => {
          expect(returnedNames.some(returnedName => returnedName === name)).toBe(true);
      });
  });
});
