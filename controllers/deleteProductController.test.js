import { jest } from '@jest/globals';
import { deleteProductController } from '../controllers/productController.js';
import productModel from '../models/productModel.js';
import mongoose from 'mongoose';
import mockingoose from 'mockingoose';

describe('deleteProductController', () => {
  let req;
  let res;
  let consoleErrorSpy;
  let mockProduct;
  
  beforeEach(() => {
    // Reset mockingoose and mocks
    mockingoose.resetAll();
    jest.clearAllMocks();
    
    // Setup request object
    req = {
      params: {
        pid: 'product123' // Product ID for deletion
      }
    };
    
    // Setup response object with spy methods
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };
    
    // Setup mock product
    mockProduct = {
      _id: 'product123',
      name: 'Product to Delete',
      price: 99.99,
      photo: {
        data: Buffer.from('photo data'),
        contentType: 'image/jpeg'
      }
    };
    
    // Mock console.error
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Setup mock implementation for findByIdAndDelete and select
    const mockSelectFn = jest.fn().mockResolvedValue(mockProduct);
    jest.spyOn(productModel, 'findByIdAndDelete').mockReturnValue({
      select: mockSelectFn
    });
  });
  
  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });
  
  // Test for successful product deletion
  test('should delete a product successfully and return 200 status', async () => {
    // Act
    await deleteProductController(req, res);
    
    // Assert
    expect(productModel.findByIdAndDelete).toHaveBeenCalledWith('product123');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: 'Product Deleted Successfully'
    });
  });
  
  // Test for missing product ID
  test('should return 400 error when product ID is missing', async () => {
    // Arrange
    req.params = {}; // No pid
    
    // Act
    await deleteProductController(req, res);
    
    // Assert
    expect(productModel.findByIdAndDelete).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: 'Product ID is required'
    });
  });
  
  // Test for product not found
  test('should return 404 error when product is not found', async () => {
    // Arrange
    const mockSelectFn = jest.fn().mockResolvedValue(null);
    jest.spyOn(productModel, 'findByIdAndDelete').mockReturnValue({
      select: mockSelectFn
    });
    
    // Act
    await deleteProductController(req, res);
    
    // Assert
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: 'Product not found'
    });
  });
  
  describe('Invalid Product ID', () => {
    // Test for invalid product ID format
    test('should handle invalid product ID format', async () => {
      // Arrange
      req.params.pid = 'invalid-id-format';
      
      const mockError = new mongoose.Error.CastError('ObjectId', 'invalid-id-format', 'pid');
      
      const mockSelectFn = jest.fn().mockRejectedValue(mockError);
      jest.spyOn(productModel, 'findByIdAndDelete').mockReturnValue({
        select: mockSelectFn
      });
      
      // Act
      await deleteProductController(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid Product ID format",
        error: mockError,
      });
    });
    
    // Test with empty string for product ID (boundary testing)
    test('should handle empty string product ID', async () => {
      // Arrange
      req.params.pid = '';
      
      // Act
      await deleteProductController(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Product ID is required'
      });
    });
    
    // Test with null product ID (boundary testing)
    test('should handle null product ID', async () => {
      // Arrange
      req.params.pid = null;
      
      // Act
      await deleteProductController(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Product ID is required'
      });
    });

    // Test with undefined product ID
    test('should handle undefined product ID', async () => {
      // Arrange
      req.params.pid = undefined;
      
      // Act
      await deleteProductController(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Product ID is required'
      });
    });
  });
  
  // Test for general error handling
  test('should handle general errors during product deletion', async () => {
    // Arrange
    const mockError = new Error('Database error');
    
    const mockSelectFn = jest.fn().mockRejectedValue(mockError);
    jest.spyOn(productModel, 'findByIdAndDelete').mockReturnValue({
      select: mockSelectFn
    });
    
    // Act
    await deleteProductController(req, res);
    
    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: 'Error while deleting product',
      error: mockError
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
  
  // Test for database connection errors
  test('should handle database connection errors', async () => {
    // Arrange
    const mockError = new mongoose.Error.MongooseServerSelectionError('Could not connect to any servers in your MongoDB Atlas cluster');
    
    const mockSelectFn = jest.fn().mockRejectedValue(mockError);
    jest.spyOn(productModel, 'findByIdAndDelete').mockReturnValue({
      select: mockSelectFn
    });
    
    // Act
    await deleteProductController(req, res);
    
    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: 'Error while deleting product',
      error: mockError
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
  
  // Test for network errors
  test('should handle network errors during deletion', async () => {
    // Arrange
    const mockError = new Error('Network error');
    mockError.name = 'NetworkError';
    
    const mockSelectFn = jest.fn().mockRejectedValue(mockError);
    jest.spyOn(productModel, 'findByIdAndDelete').mockReturnValue({
      select: mockSelectFn
    });
    
    // Act
    await deleteProductController(req, res);
    
    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: 'Error while deleting product',
      error: mockError
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
  
  // Test for deletion of product with associated data
  test('should successfully delete a product with all its data', async () => {
    // Arrange
    const mockSelectFn = jest.fn().mockResolvedValue(mockProduct);
    jest.spyOn(productModel, 'findByIdAndDelete').mockReturnValue({
      select: mockSelectFn
    });
    
    // Act
    await deleteProductController(req, res);
    
    // Assert
    expect(productModel.findByIdAndDelete).toHaveBeenCalledWith('product123');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: 'Product Deleted Successfully'
    });
  });
  
  // Test race condition (product deleted between checking existence and deletion)
  test('should handle case where product is deleted between check and deletion', async () => {
    // Arrange - first call returns product, second call returns null (simulating race condition)
    let callCount = 0;
    const mockSelectFn = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ _id: 'product123', name: 'Product to Delete' });
      } else {
        return Promise.resolve(null);
      }
    });
    
    jest.spyOn(productModel, 'findByIdAndDelete').mockReturnValue({
      select: mockSelectFn
    });
    
    // Act
    await deleteProductController(req, res);
    
    // Assert - should still succeed as product was initially found
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: 'Product Deleted Successfully'
    });
  });
  
  // Using mockingoose to demonstrate integration with mongoose models
  test('should integrate with mockingoose for mongoose model testing', async () => {
    // Restore the original implementation to use mockingoose
    jest.spyOn(productModel, 'findByIdAndDelete').mockRestore();
    
    // Setup mockingoose to handle the findByIdAndDelete operation
    mockingoose(productModel).toReturn(mockProduct, 'findOneAndDelete');
    
    // Create a custom implementation for the select method
    const origFind = productModel.findByIdAndDelete;
    jest.spyOn(productModel, 'findByIdAndDelete').mockImplementation((...args) => {
      const result = origFind.apply(productModel, args);
      result.select = jest.fn().mockResolvedValue(mockProduct);
      return result;
    });
    
    // Act
    await deleteProductController(req, res);
    
    // Assert
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: 'Product Deleted Successfully'
    });
  });
});