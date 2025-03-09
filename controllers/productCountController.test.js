import { jest } from '@jest/globals';
import productModel from "../models/productModel.js";
import mockingoose from "mockingoose";
import { productCountController } from "./productController.js";

describe('productCountController', () => {
  beforeEach(() => {
    mockingoose.resetAll();
  });

  it('should return total product count successfully', async () => {
    // Mock the estimatedDocumentCount method
    mockingoose(productModel).toReturn(10, 'estimatedDocumentCount');
    
    const req = {};
    
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(), 
    };

    await productCountController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      total: 10,
    });
  });

  it('should handle error when fetching product count', async () => {
    // Mock the estimatedDocumentCount method to throw an error
    mockingoose(productModel).toReturn(new Error('Database error'), 'estimatedDocumentCount');
    
    const req = {};
    
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(), 
    };

    await productCountController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: "Error in product count",
      error: expect.any(Error),
      success: false,
    });
  });
});
