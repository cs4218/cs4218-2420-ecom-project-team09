import { jest } from '@jest/globals';
import productModel from "../models/productModel.js";
import mockingoose from "mockingoose";
import mongoose from "mongoose";
import { productListController } from "./productController.js";

describe('productListController', () => {
  const mockProducts = [];
  const numberOfProducts = 20;

  for (let i = 1; i <= numberOfProducts; i++) {
    mockProducts.push({
      _id: new mongoose.Types.ObjectId(),
      name: `Product ${i}`,
      price: i * 100,  
      category: new mongoose.Types.ObjectId(),
      createdAt: new Date(),
    });
  }

  beforeEach(() => {
    mockingoose.resetAll();
  });

  it('should return 200 on success', async () => {
    // Mocking the find method with pagination logic
    mockingoose(productModel).toReturn(mockProducts.slice(0, 6), 'find'); 

    const req = {
      params: {
        page: 1,  
      },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    await productListController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      products: mockProducts.slice(0, 6), 
    });
  });

  it('should correctly paginate and return products for page 1', async () => {
    // Create a mock implementation for the Mongoose query chain methods
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
    };

    // Mock the find method to return the mock query object
    const findMock = jest.spyOn(productModel, 'find').mockReturnValue(mockQuery);

    const req = {
      params: {
        page: 1,  // Page 1 should return products 1-6
      },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    await productListController(req, res);

    // Ensure the Mongoose query chain methods were called in the correct order with the correct arguments
    expect(findMock).toHaveBeenCalledWith({});
    expect(mockQuery.select).toHaveBeenCalledWith('-photo');
    expect(mockQuery.skip).toHaveBeenCalledWith(0);  
    expect(mockQuery.limit).toHaveBeenCalledWith(6);  
    expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });

    expect(res.status).toHaveBeenCalledWith(200);

    findMock.mockRestore();
    mockQuery.select.mockRestore();
    mockQuery.skip.mockRestore();
    mockQuery.limit.mockRestore();
    mockQuery.sort.mockRestore();
    mockQuery.lean.mockRestore();
  });

  it('should correctly paginate and return products for page 3', async () => {
    // Create a mock implementation for the Mongoose query chain methods
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
    };
  
    // Mock the find method to return the mock query object
    const findMock = jest.spyOn(productModel, 'find').mockReturnValue(mockQuery);
  
    const req = {
      params: {
        page: 3,  // Page 3 should return products 13-18
      },
    };
  
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
  
    await productListController(req, res);
  
    // Ensure the Mongoose query chain methods were called in the correct order with the correct arguments
    expect(findMock).toHaveBeenCalledWith({});
    expect(mockQuery.select).toHaveBeenCalledWith('-photo');
    expect(mockQuery.skip).toHaveBeenCalledWith(12);  
    expect(mockQuery.limit).toHaveBeenCalledWith(6);  
    expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
  
    expect(res.status).toHaveBeenCalledWith(200);
  
    findMock.mockRestore();
    mockQuery.select.mockRestore();
    mockQuery.skip.mockRestore();
    mockQuery.limit.mockRestore();
    mockQuery.sort.mockRestore();
    mockQuery.lean.mockRestore();
  });
});
