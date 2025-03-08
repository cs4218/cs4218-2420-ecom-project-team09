import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";
import orderModel from "../models/orderModel.js";

import fs from "fs";
import slugify from "slugify";
import braintree from "braintree";
import dotenv from "dotenv";

dotenv.config();

//payment gateway
var gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment.Sandbox,
  merchantId: process.env.BRAINTREE_MERCHANT_ID,
  publicKey: process.env.BRAINTREE_PUBLIC_KEY,
  privateKey: process.env.BRAINTREE_PRIVATE_KEY,
});

export const createProductController = async (req, res) => {
  try {
    const { name, description, price, category, quantity, shipping } =
      req.fields;

    // Check if photo is missing
    if (!req.files || !req.files.photo) {
      return res.status(500).send({ 
        error: "Photo is Required and should be less then 1mb" 
      });
    }
    
    // Now we can safely destructure photo
    const { photo } = req.files;

    // Validation // Fixed: Corrected typo from "alidation" to "Validation"
    switch (true) {
      case !name:
        return res.status(500).send({ error: "Name is Required" });
      case !description:
        return res.status(500).send({ error: "Description is Required" });
      case !price:
        return res.status(500).send({ error: "Price is Required" });
      case !category:
        return res.status(500).send({ error: "Category is Required" });
      case !quantity:
        return res.status(500).send({ error: "Quantity is Required" });
      case !photo || Object.keys(photo).length === 0 || photo.size <= 0 || photo.size > 1000000:
        return res
          .status(500)
          .send({ error: "Photo is Required and should be less then 1mb" });
    }

    const products = new productModel({ ...req.fields, slug: slugify(name) });

    products.photo.data = fs.readFileSync(photo.path);
    products.photo.contentType = photo.type;

    await products.save();
    res.status(201).send({
      success: true,
      message: "Product Created Successfully",
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      // Fixed: Corrected typo from "crearing" to "creating"
      message: "Error in creating product",
    });
  }
};

//get all products
export const getProductController = async (req, res) => {
  try {
    const products = await productModel
      .find({})
      .populate("category")
      .select("-photo")
      .limit(12)
      .sort({ createdAt: -1 });
    res.status(200).send({
      success: true,
      countTotal: products.length, // Fixed typo from 'counTotal' to 'countTotal'
      message: "All Products", // Fixed typo from 'ALlProducts' to 'All Products'
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error in getting products", // Fixed typo: changed "Erorr" to "Error"
      error: error.message,
    });
  }
};
// get single product
export const getSingleProductController = async (req, res) => {
  try {
    const product = await productModel
      .findOne({ slug: req.params.slug })
      .select("-photo")
      .populate("category");
    res.status(200).send({
      success: true,
      message: "Single Product Fetched",
      product,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Eror while getitng single product",
      error,
    });
  }
};

// get photo
export const productPhotoController = async (req, res) => {
  try {
    const product = await productModel.findById(req.params.pid).select("photo");
    if (product.photo.data) {
      res.set("Content-type", product.photo.contentType);
      return res.status(200).send(product.photo.data);
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Erorr while getting photo",
      error,
    });
  }
};

//delete controller
export const deleteProductController = async (req, res) => {
  try {
    // Check if product ID exists in params
    if (!req.params.pid) {
      return res.status(400).send({
        success: false,
        message: "Product ID is required"
      });
    }

    const deletedProduct = await productModel.findByIdAndDelete(req.params.pid).select("-photo");

    // Check if product was found and deleted
    if (!deletedProduct) {
      return res.status(404).send({
        success: false,
        message: "Product not found"
      });
    }

    res.status(200).send({
      success: true,
      message: "Product Deleted successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error while deleting product",
      error,
    });
  }
};

//upate producta
export const updateProductController = async (req, res) => {
  try {
    // Check if product ID exists in params
    if (!req.params.pid) {
      return res.status(400).send({
        success: false,
        message: "Product ID is required"
      });
    }

    const { name, description, price, category, quantity, shipping } =
      req.fields;

    // Check if photo is missing
    if (!req.files || !req.files.photo) {
      return res.status(500).send({ 
        error: "Photo is Required and should be less then 1mb" 
      });
    }
    
    // Now we can safely destructure photo
    const { photo } = req.files;

    // Validation
    switch (true) {
      case !name:
        return res.status(500).send({ error: "Name is Required" });
      case !description:
        return res.status(500).send({ error: "Description is Required" });
      case !price:
        return res.status(500).send({ error: "Price is Required" });
      case !category:
        return res.status(500).send({ error: "Category is Required" });
      case !quantity:
        return res.status(500).send({ error: "Quantity is Required" });
        case !photo || Object.keys(photo).length === 0 || photo.size <= 0 || photo.size > 1000000:
        return res
          .status(500)
          .send({ error: "Photo is Required and should be less then 1mb" });
    }

    try {
      const products = await productModel.findByIdAndUpdate(
        req.params.pid,
        { ...req.fields, slug: slugify(name) },
        { new: true }
      );
      
      // Check if product exists
      if (!products) {
        return res.status(404).send({
          success: false,
          message: "Product not found"
        });
      }
  
      products.photo.data = fs.readFileSync(photo.path);
      products.photo.contentType = photo.type;
  
      await products.save();
      res.status(201).send({
        success: true,
        message: "Product Updated Successfully",
        products,
      });
    } catch (updateError) {
      if (updateError.name === 'CastError') {
        return res.status(400).send({
          success: false,
          message: "Invalid Product ID format",
          error: updateError
        });
      }
      throw updateError;
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      message: "Error in Update product", // Fixed typo from "Updte" to "Update"
    });
  }
};

// filters
export const productFiltersController = async (req, res) => {
  try {
    const { checked, radio } = req.body;
    let args = {};
    if (checked.length > 0) args.category = checked;
    if (radio.length) args.price = { $gte: radio[0], $lte: radio[1] };
    const products = await productModel.find(args);
    res.status(200).send({
      success: true,
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: "Error WHile Filtering Products",
      error,
    });
  }
};

// product count
export const productCountController = async (req, res) => {
  try {
    const total = await productModel.find({}).estimatedDocumentCount();
    res.status(200).send({
      success: true,
      total,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      message: "Error in product count",
      error,
      success: false,
    });
  }
};

// product list base on page
export const productListController = async (req, res) => {
  try {
    const perPage = 6;
    const page = req.params.page ? req.params.page : 1;
    const products = await productModel
      .find({})
      .select("-photo")
      .skip((page - 1) * perPage)
      .limit(perPage)
      .sort({ createdAt: -1 });
    res.status(200).send({
      success: true,
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: "error in per page ctrl",
      error,
    });
  }
};

// search product
export const searchProductController = async (req, res) => {
  try {
    const { keyword } = req.params;
    const resutls = await productModel
      .find({
        $or: [
          { name: { $regex: keyword, $options: "i" } },
          { description: { $regex: keyword, $options: "i" } },
        ],
      })
      .select("-photo");
    res.json(resutls);
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: "Error In Search Product API",
      error,
    });
  }
};

// similar products
export const realtedProductController = async (req, res) => {
  try {
    const { pid, cid } = req.params;
    const products = await productModel
      .find({
        category: cid,
        _id: { $ne: pid },
      })
      .select("-photo")
      .limit(3)
      .populate("category");
    res.status(200).send({
      success: true,
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: "error while geting related product",
      error,
    });
  }
};

// get prdocyst by catgory
export const productCategoryController = async (req, res) => {
  try {
    const category = await categoryModel.findOne({ slug: req.params.slug });
    const products = await productModel.find({ category }).populate("category");
    res.status(200).send({
      success: true,
      category,
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      error,
      message: "Error While Getting products",
    });
  }
};

//payment gateway api
//token
export const braintreeTokenController = async (req, res, gatewayParam=gateway) => {
  try {
    gatewayParam.clientToken.generate({}, function (err, response) {
      if (err) {
        res.status(500).send(err);
      } else {
        res.status(200).send(response); // Add 200 status code to the response for standard API requests
      }
    });
  } catch (error) {
    console.error(error);
  }
};

//payment
export const brainTreePaymentController = async (req, res, gatewayParam=gateway) => {
  try {
    const { nonce, cart } = req.body;

    //Check if the nonce is missing 
    if (!nonce) {
      return res.status(400).send(new Error("Payment method nonce is required"));
    }

    // Check if the cart is empty
    if (!cart || cart.length === 0) {
      return res.status(400).send(new Error("Cart is empty, cannot process payment"));
    }

    // Check if cart is missing price
    for (let item of cart) {
      if (!item.hasOwnProperty("price")) {
        return res.status(400).send(new Error("Price is missing in cart"));
      }
    }

    // Check if all items in the car are numeric
    for (let item of cart) {
      if (isNaN(item.price)) {
        return res.status(400).send(new Error("Invalid price in cart, prices must be numeric"));
      }
    }

    // Check for negative prices in the cart
    for (let item of cart) {
      if (item.price < 0) {
        return res.status(400).send(new Error("Invalid price in cart, prices must be non-negative"));
      }
    }

    let total = 0;
    cart.map((i) => {
      total += i.price;
    });
    let newTransaction = gatewayParam.transaction.sale(
      {
        amount: total,
        paymentMethodNonce: nonce,
        options: {
          submitForSettlement: true,
        },
      },
      async function (error, result) {
        // If the payment proces failed
        if (error) {
          return res.status(500).send(new Error("Payment processing failed"));
        }

        // If the transaction failed
        if (!result || !result.success) {
          return res.status(500).send(new Error(result.message || "Transaction failed"));
        }

        try {
          const order = new orderModel({
            products: cart,
            payment: result,
            buyer: req.user._id,
          });
          await order.save(); // Asynchronous to catch any database errors
          return res.status(200).json({ ok: true });
        } catch (dbError) {
          console.error("Database save error:", dbError);
          return res.status(500).send(dbError);
        }
      }
    );
  } catch (error) {
    console.error(error);
  }
};