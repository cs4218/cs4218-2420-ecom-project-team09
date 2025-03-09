import { jest } from '@jest/globals';
import productModel from "../models/productModel.js";
import mockingoose from "mockingoose";
import mongoose from "mongoose";
import { productFiltersController } from "./productController.js";

describe('productFiltersController', () => {
  const mockProducts = [
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Product 1',
      price: 100,
      category: new mongoose.Types.ObjectId(),
    },
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Product 2',
      price: 200,
      category: new mongoose.Types.ObjectId(),
    },
  ];

  beforeEach(() => {
    mockingoose.resetAll();
  });

  it('should return 200 if filters are applied successfully', async () => {
    // Mock the productModel.find method to return filtered products
    mockingoose(productModel).toReturn(mockProducts, 'find');
    
    const req = {
      body: {
        checked: ['category-id'], 
        radio: [100, 200],         
      },
    };
    
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(), 
    };

    await productFiltersController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      products: mockProducts,
    });
  });

  it('should return 400 if filters are not applied successfully', async () => {
    // Mock the productModel.find method to return an error
    mockingoose(productModel).toReturn(new Error('Database error'), 'find');
    
    const req = {
      body: {
        checked: ['category-id'], 
        radio: [100, 200],         
      },
    };
    
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(), 
    };

    await productFiltersController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: 'Error While Filtering Products',
      error: new Error('Database error'),
    });
  });
});
