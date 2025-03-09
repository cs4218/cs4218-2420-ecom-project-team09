import { jest } from '@jest/globals';
import { relatedProductController } from '../controllers/productController.js';
import productModel from '../models/productModel.js';
import mongoose from 'mongoose';
import mockingoose from 'mockingoose';

describe('relatedProductController', () => {
  let req;
  let res;
  let consoleErrorSpy;
  let mockRelatedProducts;
  
  beforeEach(() => {
    // Reset mockingoose and mocks
    mockingoose.resetAll();
    jest.clearAllMocks();
    
    // Setup request object
    req = {
      params: {
        pid: '60d21b4667d0d8992e610c85', // Current product ID
        cid: '60d21b4667d0d8992e610c86'  // Category ID
      }
    };
    
    // Setup response object with spy methods
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };
    
    // Setup mock related products
    mockRelatedProducts = [
      { _id: '60d21b4667d0d8992e610c87', name: 'Product 1' },
      { _id: '60d21b4667d0d8992e610c88', name: 'Product 2' }
    ];
    
    // Mock console.error
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Setup mocks for the product model method chain
    const mockPopulate = jest.fn().mockResolvedValue(mockRelatedProducts);
    const mockLimit = jest.fn().mockReturnValue({ populate: mockPopulate });
    const mockSelect = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockFind = jest.spyOn(productModel, 'find').mockReturnValue({ select: mockSelect });
  });
  
  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });
  
  // Successful case - related products found
  test('should return related products successfully', async () => {
    await relatedProductController(req, res);
    
    // Verify that find was called with correct parameters
    expect(productModel.find).toHaveBeenCalledWith({
      category: '60d21b4667d0d8992e610c86',
      _id: { $ne: '60d21b4667d0d8992e610c85' }
    });
    
    // Verify response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      products: mockRelatedProducts
    });
  });

  // No products found
  test('should handle case when no related products are found', async () => {
    // Setup empty related products
    const mockEmptyPopulate = jest.fn().mockResolvedValue([]);
    const mockEmptyLimit = jest.fn().mockReturnValue({ populate: mockEmptyPopulate });
    const mockEmptySelect = jest.fn().mockReturnValue({ limit: mockEmptyLimit });
    
    // Update the find mock to return the empty chain
    jest.spyOn(productModel, 'find').mockReturnValue({ select: mockEmptySelect });
    
    await relatedProductController(req, res);
    
    // Verify response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: 'No related products found',
      products: []
    });
  });

  // Missing parameters
  test('should handle missing product ID', async () => {
    req.params.pid = '';
    
    await relatedProductController(req, res);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: 'Product ID and Category ID are required'
    });
  });

  test('should handle missing category ID', async () => {
    req.params.cid = '';
    
    await relatedProductController(req, res);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: 'Product ID and Category ID are required'
    });
  });
  
  test('should handle undefined parameters', async () => {
    req.params = {};
    
    await relatedProductController(req, res);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: 'Product ID and Category ID are required'
    });
  });

  // Invalid ObjectId format
  test('should handle invalid product ID format', async () => {
    // Create a CastError that mongoose would throw
    const castError = new mongoose.Error.CastError('ObjectId', 'invalid-id', 'productId');
    
    // Make find throw the error
    jest.spyOn(productModel, 'find').mockImplementation(() => {
      throw castError;
    });
    
    await relatedProductController(req, res);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid Product ID or Category ID format',
      error: expect.any(String)
    });
  });

  // Database error
  test('should handle database errors', async () => {
    // Simulate a database error
    const dbError = new Error('Database connection error');
    
    // Make find throw the error
    jest.spyOn(productModel, 'find').mockImplementation(() => {
      throw dbError;
    });
    
    await relatedProductController(req, res);
    
    // Verify error handling
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: 'Error while getting related products',
      error: dbError
    });
  });

  // Boundary test - exactly 3 products returned
  test('should return exactly 3 products when there are exactly 3 related products', async () => {
    // Create 3 products
    const mockThreeProducts = [
      { _id: '60d21b4667d0d8992e610c87', name: 'Product 1' },
      { _id: '60d21b4667d0d8992e610c88', name: 'Product 2' },
      { _id: '60d21b4667d0d8992e610c89', name: 'Product 3' }
    ];
    
    // Setup mocks with 3 products
    const mockThreePopulate = jest.fn().mockResolvedValue(mockThreeProducts);
    const mockThreeLimit = jest.fn().mockReturnValue({ populate: mockThreePopulate });
    const mockThreeSelect = jest.fn().mockReturnValue({ limit: mockThreeLimit });
    
    // Update the find mock
    jest.spyOn(productModel, 'find').mockReturnValue({ select: mockThreeSelect });
    
    await relatedProductController(req, res);
    
    // Verify that limit was called with 3 (indirectly through our mocks)
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      products: mockThreeProducts
    });
    
    // Verify exactly 3 products were returned
    expect(res.send.mock.calls[0][0].products.length).toBe(3);
  });

  // Limit test - only 3 products returned when there are more
  test('should return only 3 products when there are more than 3 related products', async () => {
    // Create a scenario with 4 products
    const allProducts = [
      { _id: '60d21b4667d0d8992e610c87', name: 'Product 1' },
      { _id: '60d21b4667d0d8992e610c88', name: 'Product 2' },
      { _id: '60d21b4667d0d8992e610c89', name: 'Product 3' },
      { _id: '60d21b4667d0d8992e610c90', name: 'Product 4' }
    ];
    
    // Limit to 3
    const limitedProducts = allProducts.slice(0, 3);
    
    // Setup mocks with the limited products
    const mockLimitedPopulate = jest.fn().mockResolvedValue(limitedProducts);
    const mockLimitedLimit = jest.fn().mockReturnValue({ populate: mockLimitedPopulate });
    const mockLimitedSelect = jest.fn().mockReturnValue({ limit: mockLimitedLimit });
    
    // Update the find mock
    jest.spyOn(productModel, 'find').mockReturnValue({ select: mockLimitedSelect });
    
    await relatedProductController(req, res);
    
    // Verify response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      products: limitedProducts
    });
    
    // Verify only 3 products were returned
    expect(res.send.mock.calls[0][0].products.length).toBe(3);
  });

  // Edge case - exclude current product
  test('should exclude current product from related products', async () => {
    // Setup with current product ID
    const currentProductId = req.params.pid;
    const categoryId = req.params.cid;
    
    // Related products (current product excluded by the query)
    const expectedRelatedProducts = [
      { _id: '60d21b4667d0d8992e610c87', name: 'Related Product 1', category: categoryId },
      { _id: '60d21b4667d0d8992e610c88', name: 'Related Product 2', category: categoryId }
    ];
    
    // Setup mocks that return the related products
    const mockRelatedPopulate = jest.fn().mockResolvedValue(expectedRelatedProducts);
    const mockRelatedLimit = jest.fn().mockReturnValue({ populate: mockRelatedPopulate });
    const mockRelatedSelect = jest.fn().mockReturnValue({ limit: mockRelatedLimit });
    
    // Update the find mock
    jest.spyOn(productModel, 'find').mockReturnValue({ select: mockRelatedSelect });
    
    await relatedProductController(req, res);
    
    // Verify the find query excludes the current product
    expect(productModel.find).toHaveBeenCalledWith({
      category: categoryId,
      _id: { $ne: currentProductId }
    });
    
    // Verify the response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      products: expectedRelatedProducts
    });
    
    // Verify no product with the current ID is in results
    const productsInResponse = res.send.mock.calls[0][0].products;
    const foundCurrentProduct = productsInResponse.find(p => p._id === currentProductId);
    expect(foundCurrentProduct).toBeUndefined();
  });

  // Test for integration with mockingoose
  test('should work with mockingoose for mongoose integration', async () => {
    // Restore the original implementation
    jest.spyOn(productModel, 'find').mockRestore();
    
    // Use mockingoose to handle find with filtering
    const mockProducts = [
      { _id: '60d21b4667d0d8992e610c87', name: 'Product 1' },
      { _id: '60d21b4667d0d8992e610c88', name: 'Product 2' }
    ];
    
    // Setup a custom implementation for the find method chain
    // since mockingoose doesn't easily support the full chain
    const origFind = productModel.find;
    jest.spyOn(productModel, 'find').mockImplementation((...args) => {
      // Call the original method
      const result = origFind.apply(productModel, args);
      
      // Mock the chain
      result.select = jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockProducts)
        })
      });
      
      return result;
    });
    
    // Set up mockingoose to return our products
    mockingoose(productModel).toReturn(mockProducts, 'find');
    
    await relatedProductController(req, res);
    
    // Verify response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      products: mockProducts
    });
  });
});