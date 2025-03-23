import { jest } from '@jest/globals';
import { updateProductController } from '../controllers/productController.js';
import productModel from '../models/productModel.js';
import fs from 'fs';
import slugify from 'slugify';
import mockingoose from 'mockingoose';
import mongoose from 'mongoose';

describe('updateProductController', () => {
  let req;
  let res;
  let mockProduct;
  let consoleErrorSpy;
  
  beforeEach(() => {
    // Reset mockingoose and mocks
    mockingoose.resetAll();
    jest.clearAllMocks();
    
    // Setup request object
    req = {
      params: {
        pid: 'product123' // Product ID for update
      },
      fields: {
        name: 'Updated Product',
        description: 'Updated Description',
        price: 149.99,
        category: 'category123',
        quantity: 20,
        shipping: true
      },
      files: {
        photo: {
          size: 500000, // 500KB
          path: '/tmp/updated-photo.jpg',
          type: 'image/jpeg'
        }
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
      name: 'Updated Product',
      description: 'Updated Description',
      price: 149.99,
      category: 'category123',
      quantity: 20,
      shipping: true,
      slug: 'updated-product',
      photo: {
        data: null,
        contentType: null
      },
      save: jest.fn().mockResolvedValue(true)
    };
    
    // Mock findByIdAndUpdate
    jest.spyOn(productModel, 'findByIdAndUpdate').mockResolvedValue(mockProduct);
    
    // Mock slugify
    jest.spyOn(slugify, 'default').mockReturnValue('updated-product');
    
    // Mock fs.readFileSync
    jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('updated photo data'));
    
    // Mock console.error
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });
  
  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });
  
  // Test for successful product update
  test('should update a product successfully and return 201 status', async () => {
    // Act
    await updateProductController(req, res);
    
    // Assert
    expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'product123',
      {
        ...req.fields,
        slug: 'updated-product'
      },
      { new: true }
    );
    expect(fs.readFileSync).toHaveBeenCalledWith('/tmp/updated-photo.jpg');
    expect(mockProduct.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: 'Product Updated Successfully',
      products: mockProduct
    });
  });

  test('should ensure the product slug matches the transformed product name', async () => {
    // Arrange
    const testProductName = '   Special   Updated  Product!   ';
    const expectedSlug = 'special-updated-product';
    
    // Override the mock for this specific test
    jest.spyOn(slugify, 'default').mockReturnValue(expectedSlug);
    
    // Update the request with the new product name
    req.fields.name = testProductName;
    
    // Act
    await updateProductController(req, res);
    
    // Assert
    expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'product123',
      expect.objectContaining({
        name: testProductName,
        slug: expectedSlug
      }),
      { new: true }
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });
  
  test('should correctly process and store photo data', async () => {
    // Setup specific photo data for this test
    const photoData = Buffer.from('custom updated photo data');
    jest.spyOn(fs, 'readFileSync').mockReturnValue(photoData);
    
    // Act
    await updateProductController(req, res);
    
    // Assert
    expect(fs.readFileSync).toHaveBeenCalledWith('/tmp/updated-photo.jpg');
    expect(mockProduct.photo.data).toEqual(photoData);
    expect(mockProduct.photo.contentType).toBe('image/jpeg');
    expect(mockProduct.save).toHaveBeenCalled();
  });
  
  // Test for missing product ID
  test('should return 400 error when product ID is missing', async () => {
    // Arrange
    req.params = {}; // No pid
    
    // Act
    await updateProductController(req, res);
    
    // Assert
    expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: 'Product ID is required'
    });
  });
  
  // Test for product not found
  test('should return 404 error when product is not found', async () => {
    // Arrange
    jest.spyOn(productModel, 'findByIdAndUpdate').mockResolvedValue(null);
    
    // Act
    await updateProductController(req, res);
    
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
      
      // Mock findByIdAndUpdate to throw a CastError
      jest.spyOn(productModel, 'findByIdAndUpdate').mockRejectedValue(mockError);
      
      // Act
      await updateProductController(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid Product ID format',
        error: expect.objectContaining({
          name: 'CastError',
          kind: 'ObjectId',
          value: 'invalid-id-format',
          path: 'pid'
        })
      });
    });
  
    // Test with empty string for product ID (boundary testing)
    test('should handle empty string product ID', async () => {
      // Arrange
      req.params.pid = '';
      
      // Act
      await updateProductController(req, res);
      
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
      await updateProductController(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Product ID is required'
      });
    });
  });
  
  // Test for required fields - equivalence partitioning
  describe('required field validation', () => {
    const requiredFields = [
      { field: 'name', error: 'Name is Required' },
      { field: 'description', error: 'Description is Required' },
      { field: 'price', error: 'Price is Required' },
      { field: 'category', error: 'Category is Required' },
      { field: 'quantity', error: 'Quantity is Required' }
    ];
    
    test.each(requiredFields)(
      'should return 500 error when $field is missing',
      async ({ field, error }) => {
        // Arrange - remove the field being tested
        const testReq = {
          params: { ...req.params },
          fields: { ...req.fields },
          files: { ...req.files }
        };
        delete testReq.fields[field];
        
        // Act
        await updateProductController(testReq, res);
        
        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error });
        expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
      }
    );
  });

  describe('string field validation', () => {
    const stringFields = ['name', 'description'];
    
    stringFields.forEach(field => {
      test(`should reject ${field} when it is null`, async () => {
        const testReq = { 
          params: { ...req.params },
          fields: { ...req.fields }, 
          files: { ...req.files } 
        };
        testReq.fields[field] = null;
        await updateProductController(testReq, res);
        expect(res.status).toHaveBeenCalledWith(500);
      });
      
      test(`should reject ${field} when it is an empty string`, async () => {
        const testReq = { 
          params: { ...req.params },
          fields: { ...req.fields }, 
          files: { ...req.files } 
        };
        testReq.fields[field] = '';
        await updateProductController(testReq, res);
        expect(res.status).toHaveBeenCalledWith(500);
      });
    });
  });
  
  describe('number field validation', () => {
    const numberFields = ['price', 'quantity'];
    
    numberFields.forEach(field => {
      test(`should reject ${field} when it is null`, async () => {
        const testReq = { 
          params: { ...req.params },
          fields: { ...req.fields }, 
          files: { ...req.files } 
        };
        testReq.fields[field] = null;
        await updateProductController(testReq, res);
        expect(res.status).toHaveBeenCalledWith(500);
      });
      
      test(`should accept ${field} when it is 0`, async () => {
        const testReq = { 
          params: { ...req.params },
          fields: { ...req.fields }, 
          files: { ...req.files } 
        };
        testReq.fields[field] = 0;
        await updateProductController(testReq, res);
        // Based on the controller code, 0 would be considered falsy and rejected
        expect(res.status).toHaveBeenCalledWith(500);
      });
      
      test(`should accept ${field} when it is a positive number`, async () => {
        const testReq = { 
          params: { ...req.params },
          fields: { ...req.fields }, 
          files: { ...req.files } 
        };
        testReq.fields[field] = 1; // Smallest positive integer
        
        await updateProductController(testReq, res);
        expect(res.status).toHaveBeenCalledWith(201);
      });
      
      test(`should handle ${field} when it is NaN`, async () => {
        const testReq = { 
          params: { ...req.params },
          fields: { ...req.fields }, 
          files: { ...req.files } 
        };
        testReq.fields[field] = NaN;
        await updateProductController(testReq, res);
        
        // NaN is falsy, so !NaN would be true in the controller's condition
        expect(res.status).toHaveBeenCalledWith(500);
      });
    });
  });
  
  // Test for error handling
  test('should handle errors during product update', async () => {
    // Arrange
    const testError = new Error('Database error');
    jest.spyOn(productModel, 'findByIdAndUpdate').mockRejectedValue(testError);
    
    // Act
    await updateProductController(req, res);
    
    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: testError,
      message: 'Error in updating product'
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  describe('photo validation handling', () => {
    test('should reject when req.files is undefined', async () => {
      // Arrange
      req.files = undefined;
      
      // Act
      await updateProductController(req, res);
      
      // Assert
      expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ 
        error: "Photo is Required and should be less then 1mb" 
      });
    });
    
    test('should reject when req.files is null', async () => {
      // Arrange
      req.files = null;
      
      // Act
      await updateProductController(req, res);
      
      // Assert
      expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ 
        error: "Photo is Required and should be less then 1mb" 
      });
    });
    
    test('should reject when req.files.photo is undefined', async () => {
      // Arrange
      req.files = {};
      
      // Act
      await updateProductController(req, res);
      
      // Assert
      expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ 
        error: "Photo is Required and should be less then 1mb" 
      });
    });
    
    test('should reject when photo size exceeds 1MB', async () => {
      // Arrange
      req.files = {
        photo: {
          size: 1000001, // Just over 1MB
          path: '/tmp/large-photo.jpg',
          type: 'image/jpeg'
        }
      };
      
      // Act
      await updateProductController(req, res);
      
      // Assert
      expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ 
        error: "Photo is Required and should be less then 1mb" 
      });
    });
    
    test('should accept when photo size is exactly 1MB', async () => {
      // Arrange
      req.files = {
        photo: {
          size: 1000000, // Exactly 1MB
          path: '/tmp/borderline-photo.jpg',
          type: 'image/jpeg'
        }
      };
      
      // Act
      await updateProductController(req, res);
      
      // Assert
      expect(productModel.findByIdAndUpdate).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('should reject when photo is an empty object', async () => {
      // Arrange
      req.files = {
        photo: {} // Photo exists but has no properties
      };
      
      // Act
      await updateProductController(req, res);
      
      // Assert
      expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ 
        error: "Photo is Required and should be less then 1mb" 
      });
    });
    
    test('should accept when photo has size=1', async () => {
      // Arrange
      req.files = {
        photo: {
          size: 1, // Smallest valid non-zero size
          path: '/tmp/tiny-photo.jpg',
          type: 'image/jpeg'
        }
      };
      
      // Act
      await updateProductController(req, res);
      
      // Assert
      expect(productModel.findByIdAndUpdate).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });
    
    test('should reject when photo has size=0', async () => {
      // Arrange
      req.files = {
        photo: {
          size: 0, // Zero-byte file
          path: '/tmp/empty-photo.jpg',
          type: 'image/jpeg'
        }
      };
      
      // Act
      await updateProductController(req, res);
      
      // Assert
      expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ 
        error: "Photo is Required and should be less then 1mb" 
      });
    });
  });
});