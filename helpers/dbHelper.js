import userModel from "../models/userModel.js";
import categoryModel from "../models/categoryModel.js";
import orderModel from "../models/orderModel.js";
import { testCategories } from "./test.categories.js";
import { testUsers } from "./test.users.js";
import { testOrders } from "./test.orders.js";
import connectDB from "../config/db.js";

async function flushDB() {
    await userModel.deleteMany();
    await categoryModel.deleteMany();
    await orderModel.deleteMany();
    console.log("Database flushed successfully");
}

async function seedDB() {
    await categoryModel.insertMany(testCategories);
    await userModel.insertMany(testUsers);
    await orderModel.insertMany(testOrders);
    console.log("Database seeded successfully");
}

export async function resetDB() {
    await connectDB();
    await flushDB();
    await seedDB();
    process.exit(0);
}

resetDB().catch((err) => {
    console.error(
        'An error occurred while attempting to seed the database:',
        err,
    );
});