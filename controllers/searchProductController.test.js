import { jest } from '@jest/globals';
import productModel from '../models/productModel.js';
import { searchProductController } from './productController.js';
import mockingoose from 'mockingoose';
import mongoose from 'mongoose';

describe('searchProductController', () => {
  const mockProducts = [
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Test Product',
      slug: 'test-product',
      description: 'Test Description',
      price: 100,
      category: new mongoose.Types.ObjectId(),
      quantity: 10,
      shipping: true,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Test Product-2',
      slug: 'test-product-2',
      description: 'Test Description 2',
      price: 200,
      category: new mongoose.Types.ObjectId(),
      quantity: 20,
      shipping: true,
    }
  ];

  beforeEach(() => {
    mockingoose.resetAll();
  });

  it('should return products that match the keyword', async () => {
    // Mocking the find method with a search that matches the keyword
    mockingoose(productModel).toReturn(mockProducts, 'find');

    const req = {
      params: {
        name: 'Product 1',  
      },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    await searchProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      results: mockProducts,
    });
  });

  it('should return an error if an exception occurs during search', async () => {
    // Mocking the find method to throw an error
    mockingoose(productModel).toReturn(new Error('Database error'), 'find');

    const req = {
      params: {
        keyword: 'product',
      },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    await searchProductController(req, res);

    // Verify that the correct error response is sent
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: 'Error In Search Product API',
      error: new Error('Database error'),
    });
  });
});
