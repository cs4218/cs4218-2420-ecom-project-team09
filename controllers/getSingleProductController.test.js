import { jest } from '@jest/globals';
import productModel from "../models/productModel.js";
import mockingoose from "mockingoose";
import mongoose from "mongoose";
import { getSingleProductController } from "./productController.js";

describe('getSingleProductController', () => {
  const mockProduct = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Test Product',
    slug: 'test-product',
    description: 'Test Description',
    price: 100,
    category: new mongoose.Types.ObjectId(),
    quantity: 10,
    shipping: true,
  };

  beforeEach(() => {
    mockingoose.resetAll();
  });

  it('should return 200 if product exists', async () => {
    // Mock the productModel.findOne method
    mockingoose(productModel).toReturn(mockProduct, 'findOne');
    
    const req = {
      params: {
        slug: mockProduct.slug,  
      },
    };
    
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(), 
    };

    await getSingleProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: 'Single Product Fetched',
      product: mockProduct,
    });
  });

  it('should return 500 if product does not exist', async () => {
    // Mock the productModel.findOne method
    mockingoose(productModel).toReturn(new Error('Database error'), 'findOne');
  
    const req = {
      params: {
        slug: 'non-existing-slug',  
      },
    };
  
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(), 
    };
  
    await getSingleProductController(req, res);
  
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error while getting single product",
      error: expect.any(Error), 
    });
  });

});
