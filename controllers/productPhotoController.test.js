import { jest } from '@jest/globals';
import productModel from "../models/productModel.js";
import mockingoose from "mockingoose";
import mongoose from "mongoose";
import { productPhotoController } from "./productController.js";

describe('productPhotoController', () => {
  const mockProduct = {
    _id: new mongoose.Types.ObjectId(),
    photo: {
      data: Buffer.from('image-data'), 
      contentType: 'image/jpeg',
    },
  };

  beforeEach(() => {
    mockingoose.resetAll();
  });

  it('should return 200 and the photo if product exists and has photo data', async () => {
    // Mock the productModel.findById method to return the mock product
    mockingoose(productModel).toReturn(mockProduct, 'findOne');
    
    const req = {
      params: {
        pid: mockProduct._id.toString(),
      },
    };
    
    const res = {
      set: jest.fn().mockReturnThis(), 
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    await productPhotoController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.set).toHaveBeenCalledWith("Content-type", mockProduct.photo.contentType);
    
    // Compare buffers using .equals() method
    expect(res.send.mock.calls[0][0].equals(mockProduct.photo.data)).toBe(true);
  });

  it('should return 500 if an error occurs while fetching the photo', async () => {
    // Mock the findOne method to throw an error
    mockingoose(productModel).toReturn(new Error('Database error'), 'findOne');

    const req = {
      params: {
        pid: new mongoose.Types.ObjectId().toString(),
      },
    };

    const res = {
      set: jest.fn().mockReturnThis(), 
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    await productPhotoController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error while getting photo",
      error: expect.any(Error),
    });
  });
});
