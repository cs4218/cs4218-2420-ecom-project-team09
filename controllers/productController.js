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
        error: "Photo is Required and should be less then 1mb",
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
      case !photo ||
        Object.keys(photo).length === 0 ||
        photo.size <= 0 ||
        photo.size > 1000000:
        return res
          .status(500)
          .send({ error: "Photo is Required and should be less then 1mb" });
    }

    const products = new productModel({
      ...req.fields,
      slug: slugify(name, { lower: true, strict: true, trim: true }),
    });

    products.photo.data = fs.readFileSync(photo.path);
    products.photo.contentType = photo.type;

    await products.save();
    res.status(201).send({
      success: true,
      message: "Product Created Successfully",
      products,
    });
  } catch (error) {
    console.error(error);
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
    console.error(error);
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
      .populate("category")
      .lean(); // Mongoose to return plain JavaScript objects instead of Mongoose documents
    res.status(200).send({
      success: true,
      message: "Single Product Fetched",
      product,
    });
  } catch (error) {
    // console.log(error);
    res.status(500).send({
      success: false,
      message: "Error while getting single product",
      error,
    });
  }
};

// get photo
export const productPhotoController = async (req, res) => {
  try {
    const product = await productModel
      .findOne({ _id: req.params.pid })
      .select("photo");
    if (product.photo.data) {
      res.set("Content-type", product.photo.contentType);
      return res.status(200).send(product.photo.data);
    }
  } catch (error) {
    // console.log(error);
    res.status(500).send({
      success: false,
      message: "Error while getting photo",
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
        message: "Product ID is required",
      });
    }

    const deletedProduct = await productModel
      .findByIdAndDelete(req.params.pid)
      .select("-photo");

    // Check if product was found and deleted
    if (!deletedProduct) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Product Deleted Successfully",
    });
  } catch (error) {
    console.error(error);

    if (error.name === "CastError") {
      return res.status(400).send({
        success: false,
        message: "Invalid Product ID format",
        error,
      });
    }

    res.status(500).send({
      success: false,
      message: "Error while deleting product",
      error,
    });
  }
};

//update product
export const updateProductController = async (req, res) => {
  try {
    // Check if product ID exists in params
    if (!req.params.pid) {
      return res.status(400).send({
        success: false,
        message: "Product ID is required",
      });
    }

    const { name, description, price, category, quantity, shipping } =
      req.fields;

    // Check if photo is missing
    if (!req.files || !req.files.photo) {
      return res.status(500).send({
        error: "Photo is Required and should be less then 1mb",
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
      case !photo ||
        Object.keys(photo).length === 0 ||
        photo.size <= 0 ||
        photo.size > 1000000:
        return res
          .status(500)
          .send({ error: "Photo is Required and should be less then 1mb" });
    }

    try {
      const products = await productModel.findByIdAndUpdate(
        req.params.pid,
        {
          ...req.fields,
          slug: slugify(name, { lower: true, strict: true, trim: true }),
        },
        { new: true }
      );

      // Check if product exists
      if (!products) {
        return res.status(404).send({
          success: false,
          message: "Product not found",
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
      if (updateError.name === "CastError") {
        return res.status(400).send({
          success: false,
          message: "Invalid Product ID format",
          error: updateError,
        });
      }
      throw updateError;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      error,
      message: "Error in updating product", // Fixed typo from "Updte" to "Update"
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
    const products = await productModel.find(args).lean();
    res.status(200).send({
      success: true,
      products,
    });
  } catch (error) {
    // console.log(error);
    res.status(400).send({
      success: false,
      message: "Error While Filtering Products",
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
    // console.log(error);
    res.status(400).send({
      message: "Error in product count",
      error,
      success: false,
    });
  }
};

// product list based on page
export const productListController = async (req, res) => {
  try {
    const perPage = 6;
    const page = req.params.page ? req.params.page : 1;
    const products = await productModel
      .find({})
      .select("-photo")
      .skip((page - 1) * perPage)
      .limit(perPage)
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).send({
      success: true,
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: "Error in per page ctrl",
      error,
    });
  }
};

// search product
export const searchProductController = async (req, res) => {
  try {
    const { keyword } = req.params;
    const results = await productModel
      .find({
        $or: [
          { name: { $regex: keyword, $options: "i" } },
          { description: { $regex: keyword, $options: "i" } },
        ],
      })
      .select("-photo")
      .lean();
    res.status(200).send({
      success: true,
      results,
    });
  } catch (error) {
    // console.log(error);
    res.status(400).send({
      success: false,
      message: "Error In Search Product API",
      error,
    });
  }
};

// similar products
export const relatedProductController = async (req, res) => {
  try {
    const { pid, cid } = req.params;

    // Validate required parameters
    if (!pid || !cid) {
      return res.status(400).send({
        success: false,
        message: "Product ID and Category ID are required",
      });
    }

    const products = await productModel
      .find({
        category: cid,
        _id: { $ne: pid },
      })
      .select("-photo")
      .limit(3)
      .populate("category");

    // Handle case when no products found
    if (!products || products.length === 0) {
      return res.status(200).send({
        success: true,
        message: "No related products found",
        products: [],
      });
    }

    res.status(200).send({
      success: true,
      products,
    });
  } catch (error) {
    console.error(error);

    // Check if it's a CastError (invalid ObjectId)
    if (error.name === "CastError") {
      return res.status(400).send({
        success: false,
        message: "Invalid Product ID or Category ID format",
        error: error.message,
      });
    }

    res.status(500).send({
      // Changed from 400 to 500 for server errors
      success: false,
      message: "Error while getting related products",
      error,
    });
  }
};

// get product by catgory
export const productCategoryController = async (req, res) => {
  try {
    if (!req.params.slug) {
      return res.status(400).send({
        success: false,
        message: "Category slug is required",
      });
    }

    const category = await categoryModel.findOne({ slug: req.params.slug });

    // Check if category exists
    if (!category) {
      return res.status(404).send({
        success: false,
        message: "Category not found",
      });
    }

    const products = await productModel.find({ category }).populate("category");

    res.status(200).send({
      success: true,
      category,
      products,
    });
  } catch (error) {
    console.log(error);

    if (error.name === "CastError") {
      return res.status(400).send({
        success: false,
        message: "Invalid Category slug",
        error,
      });
    }

    res.status(500).send({
      success: false,
      error,
      message: "Error while getting products",
    });
  }
};

// Higher-order function for braintreeTokenController
export const braintreeTokenController = (braintreeGateway = gateway) => {
  return async (req, res, next) => {
    try {
      const response = await braintreeGateway.clientToken.generate({});
      return res.status(200).send(response); // Send 200 status code for successful response
    } catch (error) {
      console.error(error);
      return res.status(500).send(error); // Send 500 status code for errors
    }
  };
};

// payment
export const brainTreePaymentController = (
  braintreeGateway = gateway
) => {
  return async (req, res, next) => {
    try {
      const { nonce, cart } = req.body;

      // Check if the nonce is missing
      if (!nonce) {
        return res
          .status(400)
          .send(new Error("Payment method nonce is required"));
      }

      // Check if the cart is empty
      if (!cart || cart.length === 0) {
        return res
          .status(400)
          .send(new Error("Cart is empty, cannot process payment"));
      }

      // Check if cart is missing price
      for (let item of cart) {
        if (!item.hasOwnProperty("price")) {
          return res.status(400).send(new Error("Price is missing in cart"));
        }
      }

      // Check if all items in the cart are numeric
      for (let item of cart) {
        if (isNaN(item.price)) {
          return res
            .status(400)
            .send(new Error("Invalid price in cart, prices must be numeric"));
        }
      }

      // Check for negative prices in the cart
      for (let item of cart) {
        if (item.price < 0) {
          return res
            .status(400)
            .send(
              new Error("Invalid price in cart, prices must be non-negative")
            );
        }
      }

      let total = 0;
      cart.map((i) => {
        total += i.price;
      });
      let newTransaction = braintreeGateway.transaction.sale(
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
            return res
              .status(500)
              .send(new Error(result.message || "Transaction failed"));
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
};
