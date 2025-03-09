import { jest } from '@jest/globals';
import { productCategoryController } from '../controllers/productController.js';
import productModel from '../models/productModel.js';
import categoryModel from '../models/categoryModel.js';
import mongoose from 'mongoose';
import mockingoose from 'mockingoose';

describe('productCategoryController', () => {
  let req;
  let res;
  let consoleErrorSpy;
  let consoleLogSpy;
  let mockCategory;
  let mockProducts;
  
  beforeEach(() => {
    // Reset mockingoose and mocks
    mockingoose.resetAll();
    jest.clearAllMocks();
    
    // Setup request object
    req = {
      params: {
        slug: 'test-category'
      }
    };
    
    // Setup response object with spy methods
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };
    
    // Setup mock category
    mockCategory = {
      _id: '60d21b4667d0d8992e610c86',
      name: 'Test Category',
      slug: 'test-category'
    };
    
    // Setup mock products
    mockProducts = [
      { 
        _id: '60d21b4667d0d8992e610c87', 
        name: 'Product 1', 
        category: mockCategory 
      },
      { 
        _id: '60d21b4667d0d8992e610c88', 
        name: 'Product 2', 
        category: mockCategory 
      }
    ];
    
    // Mock console.log and console.error
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Setup mock for categoryModel.findOne
    jest.spyOn(categoryModel, 'findOne').mockResolvedValue(mockCategory);
    
    // Setup mock for productModel.find with populate chain
    const mockPopulate = jest.fn().mockResolvedValue(mockProducts);
    const mockFind = jest.spyOn(productModel, 'find').mockReturnValue({
      populate: mockPopulate
    });
  });
  
  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
  
  // Test for successful product retrieval by category
  test('should return products by category successfully', async () => {
    // Act
    await productCategoryController(req, res);
    
    // Assert
    expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: 'test-category' });
    expect(productModel.find).toHaveBeenCalledWith({ category: mockCategory });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      category: mockCategory,
      products: mockProducts
    });
  });
  
  // Test for missing category slug
  test('should return 400 error when category slug is missing', async () => {
    // Arrange
    req.params = {}; // No slug
    
    // Act
    await productCategoryController(req, res);
    
    // Assert
    expect(categoryModel.findOne).not.toHaveBeenCalled();
    expect(productModel.find).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: 'Category slug is required'
    });
  });
  
  // Test for empty slug
  test('should return 400 error when category slug is empty', async () => {
    // Arrange
    req.params.slug = '';
    
    // Act
    await productCategoryController(req, res);
    
    // Assert
    expect(categoryModel.findOne).not.toHaveBeenCalled();
    expect(productModel.find).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: 'Category slug is required'
    });
  });
  
  // Test for category not found
  test('should return 404 when category is not found', async () => {
    // Arrange
    jest.spyOn(categoryModel, 'findOne').mockResolvedValue(null);
    
    // Act
    await productCategoryController(req, res);
    
    // Assert
    expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: 'test-category' });
    expect(productModel.find).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: 'Category not found'
    });
  });
  
  // Test for empty products array
  test('should return empty products array when no products found in category', async () => {
    // Arrange
    const mockPopulate = jest.fn().mockResolvedValue([]);
    jest.spyOn(productModel, 'find').mockReturnValue({
      populate: mockPopulate
    });
    
    // Act
    await productCategoryController(req, res);
    
    // Assert
    expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: 'test-category' });
    expect(productModel.find).toHaveBeenCalledWith({ category: mockCategory });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      category: mockCategory,
      products: []
    });
  });
  
  // Test for CastError handling
  test('should return 400 status for invalid Category slug', async () => {
    // Arrange
    const castError = new mongoose.Error.CastError('ObjectId', 'invalid-id', 'category');
    jest.spyOn(categoryModel, 'findOne').mockRejectedValue(castError);
    
    // Act
    await productCategoryController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: castError,
      message: 'Error while getting products'
    });
    expect(consoleLogSpy).toHaveBeenCalled();
  });
  
  // Test for general error handling
  test('should return 500 status for general errors', async () => {
    // Arrange
    const generalError = new Error('Database connection error');
    jest.spyOn(categoryModel, 'findOne').mockRejectedValue(generalError);
    
    // Act
    await productCategoryController(req, res);
    
    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: generalError,
      message: 'Error while getting products'
    });
    expect(consoleLogSpy).toHaveBeenCalled();
  });
  
  // Test using mockingoose
  test('should work with mockingoose for mongoose integration', async () => {
    // Restore the original implementations
    jest.spyOn(categoryModel, 'findOne').mockRestore();
    jest.spyOn(productModel, 'find').mockRestore();
    
    // Setup mockingoose for categoryModel
    mockingoose(categoryModel).toReturn(mockCategory, 'findOne');
    
    // Setup mockingoose for productModel
    // Note: Since mockingoose doesn't easily handle populate chains,
    // we'll use a combination approach
    const origFind = productModel.find;
    jest.spyOn(productModel, 'find').mockImplementation((...args) => {
      const result = origFind.apply(productModel, args);
      result.populate = jest.fn().mockResolvedValue(mockProducts);
      return result;
    });
    
    // Act
    await productCategoryController(req, res);
    
    // Assert
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      category: expect.objectContaining({
        slug: 'test-category'
      }),
      products: mockProducts
    });
  });
  
  // Test with more complex category object
  test('should handle complex category objects with nested properties', async () => {
    // Arrange
    const complexCategory = {
      _id: '60d21b4667d0d8992e610c86',
      name: 'Complex Category',
      slug: 'complex-category',
      description: 'A more complex category object',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        featured: true,
        displayOrder: 1
      }
    };
    
    jest.spyOn(categoryModel, 'findOne').mockResolvedValue(complexCategory);
    
    const complexProducts = [
      { 
        _id: '60d21b4667d0d8992e610c87',
        name: 'Complex Product 1',
        description: 'A product with more details',
        price: 99.99,
        category: complexCategory 
      }
    ];
    
    const mockPopulate = jest.fn().mockResolvedValue(complexProducts);
    jest.spyOn(productModel, 'find').mockReturnValue({
      populate: mockPopulate
    });
    
    // Act
    await productCategoryController(req, res);
    
    // Assert
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      category: complexCategory,
      products: complexProducts
    });
  });
});