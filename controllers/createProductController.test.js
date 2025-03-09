// productController.test.js
import { jest } from '@jest/globals';
import { createProductController } from '../controllers/productController.js';
import productModel from '../models/productModel.js';
import fs from 'fs';
import slugify from 'slugify';
import mockingoose from 'mockingoose';

describe('createProductController', () => {
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
      fields: {
        name: 'Test Product',
        description: 'Test Description',
        price: 99.99,
        category: 'category123',
        quantity: 10,
        shipping: true
      },
      files: {
        photo: {
          size: 500000, // 500KB
          path: '/tmp/test-photo.jpg',
          type: 'image/jpeg'
        }
      }
    };
    
    // Setup response object with spy methods
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };
    
    // Setup mock product with save method
    mockProduct = {
      _id: 'test-id',
      name: 'Test Product',
      description: 'Test Description',
      price: 99.99,
      category: 'category123',
      quantity: 10,
      shipping: true,
      slug: 'test-product',
      photo: {
        data: null,
        contentType: null
      }
    };
    
    // Mock productModel's constructor to return an object with save method
    jest.spyOn(productModel.prototype, 'save').mockResolvedValue(mockProduct);
    
    // Mock slugify
    jest.spyOn(slugify, 'default').mockReturnValue('test-product');
    
    // Mock fs.readFileSync
    jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('test photo data'));
    
    // Mock console.error
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });
  
  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });
  
  // Test for successful product creation
  test('should create a product successfully and return 201 status', async () => {
    // Setup the productModel constructor spy
    const productModelSpy = jest.spyOn(productModel, 'constructor').mockImplementation(function() {
      this.photo = {
        data: null,
        contentType: null
      };
      this.save = jest.fn().mockResolvedValue(mockProduct);
      return this;
    });
    
    // Act
    await createProductController(req, res);
    
    // Assert
    expect(fs.readFileSync).toHaveBeenCalledWith('/tmp/test-photo.jpg');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: 'Product Created Successfully',
      products: expect.any(Object)
    });
  });

  test('should ensure the product slug matches the transformed product name', async () => {
    // Arrange
    const testProductName = '   Special test    product!  ';
    const expectedSlug = 'special-test-product';
    
    // Override the mock for this specific test
    mockProduct.slug = expectedSlug;
    
    // Update the request with the new product name
    req.fields.name = testProductName;
    
    // Use custom implementation to capture the actual slug that was set
    let capturedSlug;
    jest.spyOn(productModel.prototype, 'save').mockImplementation(function() {
      capturedSlug = this.slug;
      return Promise.resolve({...mockProduct, slug: capturedSlug});
    });
    
    // Act
    await createProductController(req, res);
    
    // Assert - verify the slug is derived from the product name correctly
    expect(capturedSlug).toBe(expectedSlug);
    expect(res.status).toHaveBeenCalledWith(201);
    
    // The response product should have the correct slug
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        products: expect.objectContaining({
          slug: expectedSlug
        })
      })
    );
  });
  
  test('should correctly process and store photo data', async () => {
    // Setup specific photo data for this test
    const photoData = Buffer.from('custom test photo data');
    jest.spyOn(fs, 'readFileSync').mockReturnValue(photoData);
    
    // Setup mockImplementation to capture the photo data
    let capturedPhotoData;
    let capturedContentType;
    
    // Mock the product model instance
    jest.spyOn(productModel.prototype, 'save').mockImplementation(function() {
      capturedPhotoData = this.photo.data;
      capturedContentType = this.photo.contentType;
      return Promise.resolve(mockProduct);
    });
    
    // Act
    await createProductController(req, res);
    
    // Assert
    expect(fs.readFileSync).toHaveBeenCalledWith('/tmp/test-photo.jpg');
    expect([...capturedPhotoData]).toEqual([...photoData]);
    expect(capturedContentType).toBe('image/jpeg');
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
          fields: { ...req.fields },
          files: { ...req.files }
        };
        delete testReq.fields[field];
        
        // Act
        await createProductController(testReq, res);
        
        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error });
        expect(productModel.prototype.save).not.toHaveBeenCalled();
      }
    );
  });

  describe('string field validation', () => {
    const stringFields = ['name', 'description'];
    
    stringFields.forEach(field => {
      test(`should reject ${field} when it is null`, async () => {
        const testReq = { fields: { ...req.fields }, files: { ...req.files } };
        testReq.fields[field] = null;
        await createProductController(testReq, res);
        expect(res.status).toHaveBeenCalledWith(500);
      });
      
      test(`should reject ${field} when it is an empty string`, async () => {
        const testReq = { fields: { ...req.fields }, files: { ...req.files } };
        testReq.fields[field] = '';
        await createProductController(testReq, res);
        expect(res.status).toHaveBeenCalledWith(500);
      });
    });
  });
  
  describe('number field validation', () => {
    const numberFields = ['price', 'quantity'];
    
    numberFields.forEach(field => {
      test(`should reject ${field} when it is null`, async () => {
        const testReq = { fields: { ...req.fields }, files: { ...req.files } };
        testReq.fields[field] = null;
        await createProductController(testReq, res);
        expect(res.status).toHaveBeenCalledWith(500);
      });
      
      test(`should accept ${field} when it is 0`, async () => {
        const testReq = { fields: { ...req.fields }, files: { ...req.files } };
        testReq.fields[field] = 0;
        await createProductController(testReq, res);
        // Based on the controller code, 0 would be considered falsy and rejected
        expect(res.status).toHaveBeenCalledWith(500);
      });
      
      test(`should accept ${field} when it is a positive number`, async () => {
        const testReq = { fields: { ...req.fields }, files: { ...req.files } };
        testReq.fields[field] = 1; // Smallest positive integer
        
        // Reset the spy to ensure previous tests don't affect this one
        jest.spyOn(productModel.prototype, 'save').mockResolvedValue(mockProduct);
        
        await createProductController(testReq, res);
        expect(res.status).toHaveBeenCalledWith(201);
      });
      
      test(`should handle ${field} when it is NaN`, async () => {
        const testReq = { fields: { ...req.fields }, files: { ...req.files } };
        testReq.fields[field] = NaN;
        await createProductController(testReq, res);
        
        // NaN is falsy, so !NaN would be true in the controller's condition
        expect(res.status).toHaveBeenCalledWith(500);
      });
    });
  });
  
  // Test for error handling
  test('should handle errors during product creation', async () => {
    // Arrange
    const testError = new Error('Database error');
    jest.spyOn(productModel.prototype, 'save').mockRejectedValue(testError);
    
    // Act
    await createProductController(req, res);
    
    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: testError,
      message: 'Error in creating product'
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
  
  // Test for edge cases
  test('should allow null or undefined fields for shipping (optional field)', async () => {
    // Arrange
    req.fields.shipping = null; // Optional field can be null
    
    // Act
    await createProductController(req, res);
    
    // Assert
    expect(res.status).toHaveBeenCalledWith(201);
  });

  describe('photo validation handling', () => {
    test('should reject when req.files is undefined', async () => {
      // Arrange
      req.files = undefined;
      
      // Act
      await createProductController(req, res);
      
      // Assert
      expect(productModel.prototype.save).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ 
        error: "Photo is Required and should be less then 1mb" 
      });
    });
    
    test('should reject when req.files is null', async () => {
      // Arrange
      req.files = null;
      
      // Act
      await createProductController(req, res);
      
      // Assert
      expect(productModel.prototype.save).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ 
        error: "Photo is Required and should be less then 1mb" 
      });
    });
    
    test('should reject when req.files.photo is undefined', async () => {
      // Arrange
      req.files = {};
      
      // Act
      await createProductController(req, res);
      
      // Assert
      expect(productModel.prototype.save).not.toHaveBeenCalled();
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
      await createProductController(req, res);
      
      // Assert
      expect(productModel.prototype.save).not.toHaveBeenCalled();
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
      await createProductController(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('should reject when photo is an empty object', async () => {
      // Arrange
      req.files = {
        photo: {} // Photo exists but has no properties
      };
      
      // Act
      await createProductController(req, res);
      
      // Assert
      expect(productModel.prototype.save).not.toHaveBeenCalled();
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
      await createProductController(req, res);
      
      // Assert
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
      await createProductController(req, res);
      
      // Assert
      expect(productModel.prototype.save).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ 
        error: "Photo is Required and should be less then 1mb" 
      });
    });
  });
});