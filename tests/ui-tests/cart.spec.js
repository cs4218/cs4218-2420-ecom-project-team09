import { test, expect } from "@playwright/test";
import userModel from "../../models/userModel.js";
import connectDB from "../../config/db.js";
import { getSampleUser } from "./CRUD-auth.spec";
import { hashPassword } from "../../helpers/authHelper.js";
import productModel from "../../models/productModel.js";
import { userLogin, assertUserLoginSuccess } from "./CRUD-auth.spec";
import mongoose from "mongoose";
import { addProductToCart, assertProductAddedToCart, assertItemsInCart, viewCart, removeItemFromCart, addProductToCartInDetails, assertProductAddedToCartInDetails } from "./CRUD-cart.spec.js";

const user = getSampleUser('cart.spec.js@example.com');
const products = [
  {
    name: "Product 1",
    slug: "product-1",
    description: "Description for product 1",
    price: 100,
    category: new mongoose.Types.ObjectId(),
    quantity: 10,
    photo: {
      data: Buffer.from(""),
      contentType: "image/jpeg",
    },
    shipping: true,
  },
  {
    name: "Product 2",
    slug: "product-2",
    description: "Description for product 2",
    price: 200,
    category: new mongoose.Types.ObjectId(),
    quantity: 20,
    photo: {
      data: Buffer.from(""),
      contentType: "image/jpeg",
    },
    shipping: false,
  },
  {
    name: "Product 3",
    slug: "product-3",
    description: "Description for product 3",
    price: 300,
    category: new mongoose.Types.ObjectId(),
    quantity: 30,
    photo: {
      data: Buffer.from(""),
      contentType: "image/jpeg",
    },
    shipping: true,
  },
]

test.beforeAll(async () => {
  await connectDB();
  await userModel.deleteMany({ });

  try {
    await new userModel({
      name: user.name,
      email: user.email,
      password: await hashPassword(user.password),
      phone: user.phone,
      address: user.address,
      answer: user.answer,
    }).save();
  } catch (error) {
    console.log(error);
  }

  await productModel.deleteMany({});

  for (const product of products) {
    try {
      await new productModel(product).save();
    } catch (error) {
      console.log(error);
    }
  }
})

test.beforeEach(async ({ page }) => {
  await userLogin(page, user);
  await assertUserLoginSuccess(page);
});

test("user add product to cart", async ({ page }) => {
  await addProductToCart(page, 0);
  await assertProductAddedToCart(page);
  await addProductToCart(page, 1);
  await assertProductAddedToCart(page);
  await assertItemsInCart(page, 2); 
});

test("user add product to cart in details page", async ({ page }) => {
  await addProductToCartInDetails(page, 0);
  await assertProductAddedToCartInDetails(page);
  await addProductToCartInDetails(page, 1);
  await assertProductAddedToCartInDetails(page);
  await assertItemsInCart(page, 2);
});

test("view cart has no items", async ({ page }) => {
  await viewCart(page);
  await assertItemsInCart(page, 0);
});

test("Remove item from cart", async ({ page }) => {
  await addProductToCart(page, 0);
  await assertProductAddedToCart(page);
  await addProductToCart(page, 1);
  await assertProductAddedToCart(page);
  await addProductToCartInDetails(page, 0);
  await assertProductAddedToCartInDetails(page);
  await addProductToCartInDetails(page, 1);
  await assertProductAddedToCartInDetails(page);

  await assertItemsInCart(page, 4);
  await removeItemFromCart(page, 0);
  await assertItemsInCart(page, 3);
  await removeItemFromCart(page, 0);
  await assertItemsInCart(page, 2);
  await removeItemFromCart(page, 0);
  await assertItemsInCart(page, 1);
  await removeItemFromCart(page, 0);
  await assertItemsInCart(page, 0);
});
