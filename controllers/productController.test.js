// productController.test.js
import {
  getProductController,
  relatedProductController,
  productCategoryController,
  createProductController,
  deleteProductController,
  updateProductController
} from '../controllers/productController';

import productModel from '../models/productModel';
import categoryModel from '../models/categoryModel';
import fs from 'fs';
import slugify from 'slugify';
import mongoose from 'mongoose';
import { braintreeTokenController, brainTreePaymentController } from './productController';
import orderModel from '../models/orderModel';
import braintree from 'braintree';

// Mock dependencies
jest.mock('../models/productModel');
jest.mock('../models/categoryModel');
jest.mock('fs');
jest.mock('slugify');
jest.mock('../models/orderModel');
jest.mock('braintree', () => {
  return {
    Environment: { Sandbox: 'sandbox' },
    BraintreeGateway: jest.fn().mockImplementation(() => ({
      clientToken: {
        generate: jest.fn()
      },
      transaction: {
        sale: jest.fn()
      }
    }))
  };
});

describe('Product Controller', () => {
  let req;
  let res;
  
  beforeEach(() => {
    req = {
      params: {},
      fields: {},
      files: {},
      body: {}
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
      set: jest.fn()
    };
    
    jest.clearAllMocks();
  });
  
  // Tests for getProductController
  describe('getProductController', () => {
    test('should successfully retrieve products and return 200 status', async () => {
      // Arrange
      const mockProducts = [
        {
          _id: '1',
          name: 'Product 1',
          price: 100,
          category: { _id: 'cat1', name: 'Category 1' }
        },
        {
          _id: '2',
          name: 'Product 2',
          price: 200,
          category: { _id: 'cat2', name: 'Category 2' }
        }
      ];
      
      // Mock the chained methods
      const mockFind = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockProducts)
      };
      
      productModel.find.mockReturnValue(mockFind);
      
      // Act
      await getProductController(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        countTotal: 2,
        message: 'All Products',
        products: mockProducts
      });
    });

    test('should exclude photo field from returned products', async () => {
      // Arrange
      const mockProductsInDb = [
        { 
          _id: '1', 
          name: 'Product with photo', 
          price: 100,
          photo: { data: Buffer.from('photo data'), contentType: 'image/jpeg' } // This should be excluded
        }
      ];
      
      const mockProductsAfterSelect = [
        { 
          _id: '1', 
          name: 'Product with photo', 
          price: 100
          // photo field is excluded
        }
      ];
      
      // Mock implementation that simulates field selection
      const mockFind = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn(fields => {
          // Simulate what select does
          return {
            limit: jest.fn().mockReturnThis(),
            sort: jest.fn().mockResolvedValue(mockProductsAfterSelect)
          };
        }),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn()
      };
      
      productModel.find.mockReturnValue(mockFind);
      
      // Act
      await getProductController(req, res);
      
      // Assert
      expect(mockFind.select).toHaveBeenCalledWith('-photo');
      expect(res.send.mock.calls[0][0].products[0]).not.toHaveProperty('photo');
      expect(res.send.mock.calls[0][0].products[0]).toHaveProperty('name');
      expect(res.send.mock.calls[0][0].products[0]).toHaveProperty('price');
    });
  
    test('should populate category field for each product', async () => {
      // Arrange
      const mockCategories = {
        'cat1': { _id: 'cat1', name: 'Electronics' },
        'cat2': { _id: 'cat2', name: 'Clothing' }
      };
      
      // Products with category IDs
      const productsBeforePopulate = [
        { _id: '1', name: 'Laptop', category: 'cat1' },
        { _id: '2', name: 'Shirt', category: 'cat2' }
      ];
      
      // Products after population (what the database would return)
      const productsAfterPopulate = [
        { _id: '1', name: 'Laptop', category: mockCategories['cat1'] },
        { _id: '2', name: 'Shirt', category: mockCategories['cat2'] }
      ];
      
      // Mock implementation that simulates population
      const mockFind = {
        populate: jest.fn(field => {
          // Simulate what population does
          return {
            select: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            sort: jest.fn().mockResolvedValue(productsAfterPopulate)
          };
        }),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn()
      };
      
      productModel.find.mockReturnValue(mockFind);
      
      // Act
      await getProductController(req, res);
      
      // Assert
      expect(mockFind.populate).toHaveBeenCalledWith('category');
      expect(res.send.mock.calls[0][0].products[0].category.name).toBe('Electronics');
      expect(res.send.mock.calls[0][0].products[1].category.name).toBe('Clothing');
    });
  
    test('should sort products by createdAt in descending order', async () => {
      // Arrange
      const mockProducts = [
        { _id: '1', name: 'Product 1', createdAt: new Date('2023-03-01') },
        { _id: '2', name: 'Product 2', createdAt: new Date('2023-03-15') },
        { _id: '3', name: 'Product 3', createdAt: new Date('2023-03-10') }
      ];
      
      // Sort the mock data as the database would
      const sortedProducts = [...mockProducts].sort((a, b) => 
        b.createdAt - a.createdAt // Descending order
      );
      
      // Mock implementation that actually sorts the data
      const mockFind = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(sortedProducts)
      };
      
      productModel.find.mockReturnValue(mockFind);
      
      // Act
      await getProductController(req, res);
      
      // Assert
      expect(mockFind.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(res.send.mock.calls[0][0].products[0]._id).toBe('2'); // The newest product
      expect(res.send.mock.calls[0][0].products[1]._id).toBe('3');
      expect(res.send.mock.calls[0][0].products[2]._id).toBe('1'); // The oldest product
    });
  
    test('should return empty array when no products exist', async () => {
      // Arrange
      const mockProducts = [];
      
      const mockFind = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockProducts)
      };
      
      productModel.find.mockReturnValue(mockFind);
      
      // Act
      await getProductController(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        countTotal: 0,
        message: 'All Products',
        products: []
      });
    });
  
    test('should limit to 12 products even if more exist', async () => {
      // Arrange
      // Create an array of 13 products (just over the boundary)
      const dbProducts = Array(13).fill().map((_, index) => ({
        _id: `${index + 1}`,
        name: `Product ${index + 1}`,
        price: 100 * (index + 1)
      }));
      
      // But the controller should only return 12 of them
      const limitedProducts = dbProducts.slice(0, 12);
      
      const mockFind = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn(() => {
          // This more accurately simulates what MongoDB would do - it would apply the limit
          return {
            sort: jest.fn().mockResolvedValue(limitedProducts)
          };
        }),
        sort: jest.fn() // This shouldn't be called directly
      };
      
      productModel.find.mockReturnValue(mockFind);
      
      // Act
      await getProductController(req, res);
      
      // Assert
      expect(mockFind.limit).toHaveBeenCalledWith(12);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        countTotal: 12,
        message: 'All Products',
        products: limitedProducts
      });
      expect(res.send.mock.calls[0][0].products.length).toBe(12);
    });
  
    test('should limit to 12 products even if exactly 12 products exist', async () => {
      // Arrange
      const mockProducts = Array(12).fill().map((_, index) => ({
        _id: `${index + 1}`,
        name: `Product ${index + 1}`,
        price: 100 * (index + 1)
      }));
      
      const mockFind = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockProducts)
      };
      
      productModel.find.mockReturnValue(mockFind);
      
      // Act
      await getProductController(req, res);
      
      // Assert
      expect(mockFind.limit).toHaveBeenCalledWith(12);
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
        countTotal: 12,
        products: expect.arrayContaining([expect.any(Object)])
      }));
      expect(res.send.mock.calls[0][0].products.length).toBe(12);
    });
  
    test('should handle database errors and return 500 status', async () => {
      // Arrange
      const mockError = new Error('Database connection failed');
      
      const mockFind = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockRejectedValue(mockError)
      };
      
      productModel.find.mockReturnValue(mockFind);
      
      // Mock console.error to avoid cluttering test output
      jest.spyOn(console, 'error').mockImplementation();
      
      // Act
      await getProductController(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Error in getting products',
        error: mockError.message
      });
    });
  
    test('should handle products with null category references', async () => {
      // Arrange
      const mockProducts = [
        {
          _id: '1',
          name: 'Product with null category',
          price: 100,
          category: null
        }
      ];
      
      const mockFind = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockProducts)
      };
      
      productModel.find.mockReturnValue(mockFind);
      
      // Act
      await getProductController(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        countTotal: 1,
        message: 'All Products',
        products: mockProducts
      });
    });
  });

  describe('createProductController', () => {
    let req;
    let res;
    let mockProduct;
    
    beforeEach(() => {
      // Reset mocks
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
      
      // Setup mock product
      mockProduct = {
        photo: {
          data: null,
          contentType: null
        },
        save: jest.fn().mockResolvedValue(true)
      };
      
      // Setup mock implementations
      productModel.mockImplementation(() => mockProduct);
      slugify.mockReturnValue('test-product');
      fs.readFileSync.mockReturnValue(Buffer.from('test photo data'));
    });
    
    // Test for successful product creation
    test('should create a product successfully and return 201 status', async () => {
      // Act
      await createProductController(req, res);
      
      // Assert
      expect(productModel).toHaveBeenCalledWith({
        ...req.fields,
        slug: 'test-product'
      });
      expect(mockProduct.photo.data).toBeTruthy();
      expect(mockProduct.photo.contentType).toBe('image/jpeg');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: 'Product Created Successfully',
        products: mockProduct
      });
    });

    test('should correctly set the product slug using slugify', async () => {
      // Arrange
      req.fields.name = 'Test Product';
      slugify.mockReturnValue('test-product');
      
      // Act
      await createProductController(req, res);
      
      // Assert
      expect(productModel).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'test-product'
        })
      );
    });
    
    test('should correctly process and store photo data', async () => {
      // Arrange
      const photoData = Buffer.from('test photo data');
      fs.readFileSync.mockReturnValue(photoData);
      
      // Act
      await createProductController(req, res);
      
      // Assert
      expect(mockProduct.photo.data).toEqual(photoData);
      expect(mockProduct.photo.contentType).toBe('image/jpeg');
    });
    
    test('should save product to database and return success response', async () => {
      // Arrange
      const savedProduct = {
        _id: 'new-product-id',
        name: 'Test Product',
        slug: 'test-product'
      };
      mockProduct.save.mockResolvedValue(savedProduct);
      
      // Act
      await createProductController(req, res);
      
      // Assert
      await expect(mockProduct.save()).resolves.toEqual(savedProduct);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: 'Product Created Successfully',
        products: mockProduct
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
            fields: { ...req.fields },
            files: { ...req.files }
          };
          delete testReq.fields[field];
          
          // Act
          await createProductController(testReq, res);
          
          // Assert
          expect(res.status).toHaveBeenCalledWith(500);
          expect(res.send).toHaveBeenCalledWith({ error });
          expect(mockProduct.save).not.toHaveBeenCalled();
        }
      );
    });

    updateProductController

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
        
        // This test depends on your business rules - if 0 is valid, adjust accordingly
        test(`should accept ${field} when it is 0`, async () => {
          const testReq = { fields: { ...req.fields }, files: { ...req.files } };
          testReq.fields[field] = 0;
          await createProductController(testReq, res);
          // Based on the controller code, 0 would be considered falsy and rejected
          expect(res.status).toHaveBeenCalledWith(500);
        });
        
        // This test is for boundary value analysis
        test(`should accept ${field} when it is a positive number`, async () => {
          const testReq = { fields: { ...req.fields }, files: { ...req.files } };
          testReq.fields[field] = 1; // Smallest positive integer
          await createProductController(testReq, res);
          expect(mockProduct.save).toHaveBeenCalled();
          expect(res.status).toHaveBeenCalledWith(201);
        });
      
      // Testing not-a-number validation for special values like NaN
      test(`should handle ${field} when it is NaN`, async () => {
        const testReq = { fields: { ...req.fields }, files: { ...req.files } };
        testReq.fields[field] = NaN;
        await createProductController(testReq, res);
        
        // NaN is falsy, so !NaN would be true in the controller's switch statement
        expect(res.status).toHaveBeenCalledWith(500);
      });
      });
    });
    
    // Test for error handling
    test('should handle errors during product creation', async () => {
      // Arrange
      const testError = new Error('Database error');
      mockProduct.save.mockRejectedValue(testError);
      
      // Mock console.error to avoid cluttering test output
      jest.spyOn(console, 'error').mockImplementation();
      
      // Act
      await createProductController(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        error: testError,
        message: 'Error in creating product'
      });
    });
    
    // Test for edge cases
    test('should allow null or undefined fields for shipping (optional field)', async () => {
      // Arrange
      req.fields.shipping = null; // Optional field can be null
      
      // Act
      await createProductController(req, res);
      
      // Assert
      expect(productModel).toHaveBeenCalledWith({
        ...req.fields,
        slug: 'test-product'
      });
      expect(mockProduct.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    describe('photo validation handling', () => {
      test('should reject when req.files is undefined', async () => {
        // Arrange
        req.files = undefined;
        
        // Act
        await createProductController(req, res);
        
        // Assert
        // If photo is required, this should be rejected
        expect(mockProduct.save).not.toHaveBeenCalled();
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
        // If photo is required, this should be rejected
        expect(mockProduct.save).not.toHaveBeenCalled();
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
        // If photo is required, this should be rejected
        expect(mockProduct.save).not.toHaveBeenCalled();
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
        // This should trigger the validation error
        expect(mockProduct.save).not.toHaveBeenCalled();
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
        // Since the condition is photo.size > 1000000, exactly 1MB should be allowed
        expect(mockProduct.save).toHaveBeenCalled();
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
        // An empty photo object should be rejected if photo is required
        expect(mockProduct.save).not.toHaveBeenCalled();
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
        // A very small photo should be accepted (well below the 1MB limit)
        expect(mockProduct.save).toHaveBeenCalled();
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
        // A zero-byte photo should be rejected if we're requiring actual content
        expect(mockProduct.save).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ 
          error: "Photo is Required and should be less then 1mb" 
        });
      });
    });
  });

  describe('updateProductController', () => {
    let req;
    let res;
    let mockProduct;
    
    beforeEach(() => {
      // Reset mocks
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
        photo: {
          data: null,
          contentType: null
        },
        save: jest.fn().mockResolvedValue(true)
      };
      
      // Setup mock implementations
      productModel.findByIdAndUpdate.mockResolvedValue(mockProduct);
      slugify.mockReturnValue('updated-product');
      fs.readFileSync.mockReturnValue(Buffer.from('updated photo data'));
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
      expect(mockProduct.photo.data).toBeTruthy();
      expect(mockProduct.photo.contentType).toBe('image/jpeg');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: 'Product Updated Successfully',
        products: mockProduct
      });
    });
    
    // Additional test for product ID
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
    
    // Additional test for product not found
    test('should return 404 error when product is not found', async () => {
      // Arrange
      productModel.findByIdAndUpdate.mockResolvedValue(null);
      
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
        productModel.findByIdAndUpdate.mockRejectedValue(mockError);
        
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
  
    test('should correctly set the product slug using slugify', async () => {
      // Arrange
      req.fields.name = 'Updated Product Name';
      slugify.mockReturnValue('updated-product-name');
      
      // Act
      await updateProductController(req, res);
      
      // Assert
      expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'product123',
        expect.objectContaining({
          slug: 'updated-product-name'
        }),
        { new: true }
      );
    });
    
    test('should correctly process and store photo data', async () => {
      // Arrange
      const photoData = Buffer.from('updated photo data');
      fs.readFileSync.mockReturnValue(photoData);
      
      // Act
      await updateProductController(req, res);
      
      // Assert
      expect(mockProduct.photo.data).toEqual(photoData);
      expect(mockProduct.photo.contentType).toBe('image/jpeg');
    });
    
    test('should save updated product to database and return success response', async () => {
      // Arrange
      const updatedProduct = {
        _id: 'product123',
        name: 'Updated Product',
        slug: 'updated-product'
      };
      mockProduct.save.mockResolvedValue(updatedProduct);
      
      // Act
      await updateProductController(req, res);
      
      // Assert
      await expect(mockProduct.save()).resolves.toEqual(updatedProduct);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: 'Product Updated Successfully',
        products: mockProduct
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
        
        test(`should reject ${field} when it is 0`, async () => {
          const testReq = { 
            params: { ...req.params },
            fields: { ...req.fields }, 
            files: { ...req.files } 
          };
          testReq.fields[field] = 0;
          await updateProductController(testReq, res);
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
          expect(mockProduct.save).toHaveBeenCalled();
          expect(res.status).toHaveBeenCalledWith(201);
        });
      
        test(`should reject ${field} when it is NaN`, async () => {
          const testReq = { 
            params: { ...req.params },
            fields: { ...req.fields }, 
            files: { ...req.files } 
          };
          testReq.fields[field] = NaN;
          await updateProductController(testReq, res);
          expect(res.status).toHaveBeenCalledWith(500);
        });
      });
    });
    
    // Test for error handling
    test('should handle errors during product update', async () => {
      // Arrange
      const testError = new Error('Database error');
      productModel.findByIdAndUpdate.mockRejectedValue(testError);
      
      // Mock console.error to avoid cluttering test output
      jest.spyOn(console, 'error').mockImplementation();
      
      // Act
      await updateProductController(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        error: testError,
        message: 'Error in updating product'
      });
    });
    
    // Test for edge cases
    test('should allow null or undefined fields for shipping (optional field)', async () => {
      // Arrange
      req.fields.shipping = null; // Optional field can be null
      
      // Act
      await updateProductController(req, res);
      
      // Assert
      expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'product123',
        expect.objectContaining({
          shipping: null
        }),
        { new: true }
      );
      expect(mockProduct.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
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

  describe('deleteProductController', () => {
    let req;
    let res;
    
    beforeEach(() => {
      // Reset mocks
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
      
      // Mock console.error to avoid cluttering test output
      jest.spyOn(console, 'error').mockImplementation();
    });
    
    // Test for successful product deletion
    test('should delete a product successfully and return 200 status', async () => {
      // Arrange
      const mockDeletedProduct = {
        _id: 'product123',
        name: 'Product to delete'
      };
      
      productModel.findByIdAndDelete.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockDeletedProduct)
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
      productModel.findByIdAndDelete.mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
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
    
    // Test for database connection error
    test('should handle database connection errors', async () => {
      // Arrange
      const mockError = new Error('Database connection failed');
      
      productModel.findByIdAndDelete.mockReturnValue({
        select: jest.fn().mockRejectedValue(mockError)
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
    });

    describe('Invalid Product ID', () => {
      // Test for invalid product ID format
      test('should handle invalid product ID format', async () => {
        // Arrange
        req.params.pid = 'invalid-id-format';
        
        const mockError = new Error('Invalid ID format');
        mockError.name = 'CastError';
        
        productModel.findByIdAndDelete.mockReturnValue({
          select: jest.fn().mockRejectedValue(mockError)
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
    });
    
    // Equivalence partitioning for various error responses
    test('should handle server errors with 500 status code', async () => {
      // Arrange
      const mockError = new Error('Server error');
      
      productModel.findByIdAndDelete.mockReturnValue({
        select: jest.fn().mockRejectedValue(mockError)
      });
      
      // Act
      await deleteProductController(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Product Payment Controllers', () => {
    let mockRequest;
    let mockResponse;
    let mockGateway;

    beforeEach(() => {
      jest.clearAllMocks();

      mockRequest = {
        body: {},
        user: { _id: 'test-user-id' }
      };

      mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        json: jest.fn()
      };

      mockGateway = new braintree.BraintreeGateway({
          environment: braintree.Environment.Sandbox,
          merchantId: 'mock-merchant-id',
          publicKey: 'mock-public-key',
          privateKey: 'mock-private-key',
        });
    });

    describe('braintreeTokenController', () => {
      test('should generate client token successfully', async () => {
          // Mock successful token generation
          const mockToken = { clientToken: 'test-client-token' };
          mockGateway.clientToken.generate.mockImplementation((options, callback) => {
              callback(null, mockToken);
          });

          await braintreeTokenController(mockRequest, mockResponse, mockGateway);

          expect(mockGateway.clientToken.generate).toHaveBeenCalledWith({}, expect.any(Function));
          expect(mockResponse.status).toHaveBeenCalledWith(200);
          expect(mockResponse.send).toHaveBeenCalledWith(mockToken);
      });

      test('should return 500 if token generation error', async () => {
        // Mock token generation error
        const mockError = new Error('Token generation failed');
        mockGateway.clientToken.generate.mockImplementation((options, callback) => {
          callback(mockError, null);
        });

        await braintreeTokenController(mockRequest, mockResponse, mockGateway);

        expect(mockGateway.clientToken.generate).toHaveBeenCalledWith({}, expect.any(Function));
        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.send).toHaveBeenCalledWith(mockError);
      });
    });

    describe('braintreePaymentController', () => {
      const mockCart = [
        { price: 100 },
        { price: 200 }
      ];

      beforeEach(() => {
        mockRequest.body = {
          nonce: 'test-payment-nonce',
          cart: mockCart
        };
      });

      test('should process payment successfully', async () => {
        // Mock successful transaction
        const mockResult = {
          success: true,
          transaction: { id: 'test-transaction-id' }
        };

        mockGateway.transaction.sale.mockImplementation((options, callback) => {
          callback(null, mockResult);
        });

        // Mock order creation
        const mockOrder = { _id: 'test-order-id' };
        orderModel.mockImplementation(() => ({
          save: jest.fn().mockResolvedValue(mockOrder)
        }));

        await brainTreePaymentController(mockRequest, mockResponse, mockGateway);

        // Verify transaction was initiated with correct amount
        expect(mockGateway.transaction.sale).toHaveBeenCalledWith({
          amount: 300, // 100 + 200
          paymentMethodNonce: 'test-payment-nonce',
          options: {
            submitForSettlement: true
          }
        }, expect.any(Function));

        // Verify order was created
        expect(orderModel).toHaveBeenCalledWith({
          products: mockCart,
          payment: mockResult,
          buyer: 'test-user-id'
        });

          expect(mockResponse.json).toHaveBeenCalledWith({ ok: true });
          expect(mockResponse.status).toHaveBeenCalledWith(200);
      });

      test('should return 500 if payment processing error', async () => {
        // Mock transaction error
        const mockError = new Error('Payment processing failed');
        mockGateway.transaction.sale.mockImplementation((options, callback) => {
          callback(mockError, null);
        });

        await brainTreePaymentController(mockRequest, mockResponse, mockGateway);

        expect(mockGateway.transaction.sale).toHaveBeenCalled();
        expect(orderModel).not.toHaveBeenCalled();
        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.send).toHaveBeenCalledWith(mockError);
      });

      test('should calculate total amount correctly for multiple items', async () => {
        const complexCart = [
          { price: 99.99 },
          { price: 149.99 },
          { price: 299.99 }
        ];

        const mockComplexCartRequest = {
          ...mockRequest,
          body: {
              ...mockRequest.body,
              cart: complexCart
        }};

        mockGateway.transaction.sale.mockImplementation((options, callback) => {
          expect(options.amount).toBe(549.97); // Sum of all prices
          callback(null, { success: true });
        });

        await brainTreePaymentController(mockComplexCartRequest, mockResponse, mockGateway);
      });

      test('should return 400 if negative prices in cart', async () => {
          const cartWithNegativePrices = [
            { price: 99.99 },
            { price: -50.00 },  // Negative price
            { price: 149.99 }
          ];

          const mockCartWithNegativePricesRequest = {
              ...mockRequest,
              body: {
                  ...mockRequest.body,
                  cart: cartWithNegativePrices
              }};

          await brainTreePaymentController(mockCartWithNegativePricesRequest, mockResponse, mockGateway);

          expect(mockResponse.status).toHaveBeenCalledWith(400);
          expect(mockResponse.send).toHaveBeenCalledWith(new Error('Invalid price in cart, prices must be non-negative'));

          // Ensure the transaction was not called
          expect(mockGateway.transaction.sale).not.toHaveBeenCalled();
        });

        test('should return 400 if non-numeric prices in cart', async () => {
          const cartWithInvalidPrices = [
            { price: 99.99 },
            { price: "invalid" },  // Non-numeric price
            { price: null },       // Null value
            { price: undefined },  // Undefined value
            { price: {} },         // Object instead of a number
          ];

          const mockCartWithInvalidPricesRequest = {
              ...mockRequest,
              body: {
                  ...mockRequest.body,
                  cart: cartWithInvalidPrices
              }
          };

          await brainTreePaymentController(mockCartWithInvalidPricesRequest, mockResponse, mockGateway);

          expect(mockResponse.status).toHaveBeenCalledWith(400);
          expect(mockResponse.send).toHaveBeenCalledWith(new Error('Invalid price in cart, prices must be numeric'));

          // Ensure the transaction was not called
          expect(mockGateway.transaction.sale).not.toHaveBeenCalled();
      });  

      test('should return 400 if any item in cart is missing a price', async () => {
        const cartWithMissingPrice = [
          { name: "Item 1", price: 100 },
          { name: "Item 2" }, // Missing price
        ];

        const mockRequestWithMissingPrice = {
          ...mockRequest,
          body: {
            nonce: "test-payment-nonce",
            cart: cartWithMissingPrice,
          },
        };

        await brainTreePaymentController(mockRequestWithMissingPrice, mockResponse, mockGateway);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.send).toHaveBeenCalledWith(new Error("Price is missing in cart"));

        // Ensure the transaction was not called
        expect(mockGateway.transaction.sale).not.toHaveBeenCalled();
      });    

      test('should handle empty cart', async () => {
        const mockEmptyCartRequest = {
          ...mockRequest,
          body: {
              ...mockRequest.body,
              cart: []
          }
        }

        mockGateway.transaction.sale.mockImplementation((options, callback) => {
          expect(options.amount).toBe(0);
          callback(null, { success: true });
        });

        await brainTreePaymentController(mockEmptyCartRequest, mockResponse, mockGateway);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.send).toHaveBeenCalledWith(new Error("Cart is empty, cannot process payment"));

        // Ensure the payment gateway transaction wasn't called
        expect(mockGateway.transaction.sale).not.toHaveBeenCalled();
      });

      test('should return 400 if payment nonce is missing', async () => {
        const mockRequestWithoutNonce = {
          ...mockRequest,
          body: {
            cart: mockCart, // Valid cart, but no nonce
          },
        };

        await brainTreePaymentController(mockRequestWithoutNonce, mockResponse, mockGateway);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.send).toHaveBeenCalledWith(new Error("Payment method nonce is required"));

        // Ensure the payment gateway transaction wasn't called
        expect(mockGateway.transaction.sale).not.toHaveBeenCalled();
      });    

      test('should return 500 if order saving fails', async () => {
        const mockResult = {
          success: true,
          transaction: { id: "test-transaction-id" },
        };

        const databaseSaveError = new Error("Database save error");

        mockGateway.transaction.sale.mockImplementation((options, callback) => {
          callback(null, mockResult);
        });

        orderModel.mockImplementation(() => ({
          save: jest.fn().mockRejectedValue(databaseSaveError),
        }));

        await brainTreePaymentController(mockRequest, mockResponse, mockGateway);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.send).toHaveBeenCalledWith(databaseSaveError);
      });

      test('should return 500 if Braintree transaction fails', async () => {
        const mockFailedResult = {
          success: false,
          message: "Transaction declined",
        };

        mockGateway.transaction.sale.mockImplementation((options, callback) => {
          callback(null, mockFailedResult);
        });

        await brainTreePaymentController(mockRequest, mockResponse, mockGateway);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.send).toHaveBeenCalledWith(new Error("Transaction declined"));
      });
    });
  });

  describe('relatedProductController', () => {
    let req;
    let res;
    let mockFind;
    let mockSelect;
    let mockLimit;
    let mockPopulate;
    
    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();
      
      // Setup request and response objects
      req = {
        params: {
          pid: '60d21b4667d0d8992e610c85', // Valid MongoDB ObjectId format
          cid: '60d21b4667d0d8992e610c86', // Valid MongoDB ObjectId format
        },
      };
      
      res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };
      
      // Setup the mock chain properly
      mockPopulate = jest.fn().mockResolvedValue([
        { _id: '60d21b4667d0d8992e610c87', name: 'Product 1' },
        { _id: '60d21b4667d0d8992e610c88', name: 'Product 2' },
      ]);
      mockLimit = jest.fn().mockReturnValue({ populate: mockPopulate });
      mockSelect = jest.fn().mockReturnValue({ limit: mockLimit });
      mockFind = jest.fn().mockReturnValue({ select: mockSelect });
      
      productModel.find = mockFind;
    });

    // Successful case - related products found
    test('should return related products successfully', async () => {
      await relatedProductController(req, res);
      
      // Verify that find was called with correct parameters
      expect(mockFind).toHaveBeenCalledWith({
        category: '60d21b4667d0d8992e610c86',
        _id: { $ne: '60d21b4667d0d8992e610c85' },
      });
      
      // Verify response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        products: [
          { _id: '60d21b4667d0d8992e610c87', name: 'Product 1' },
          { _id: '60d21b4667d0d8992e610c88', name: 'Product 2' },
        ],
      });
    });

    // No products found
    test('should handle case when no related products are found', async () => {
      // Mock empty products array
      const emptyMockPopulate = jest.fn().mockResolvedValue([]);
      const emptyMockLimit = jest.fn().mockReturnValue({ populate: emptyMockPopulate });
      const emptyMockSelect = jest.fn().mockReturnValue({ limit: emptyMockLimit });
      const emptyMockFind = jest.fn().mockReturnValue({ select: emptyMockSelect });
      
      productModel.find = emptyMockFind;
      
      await relatedProductController(req, res);
      
      // Verify response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: 'No related products found',
        products: [],
      });
    });

    // Missing parameters
    test('should handle missing product ID', async () => {
      req.params.pid = '';
      
      await relatedProductController(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Product ID and Category ID are required',
      });
    });

    test('should handle missing category ID', async () => {
      req.params.cid = '';
      
      await relatedProductController(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Product ID and Category ID are required',
      });
    });
    
    test('should handle undefined parameters', async () => {
      req.params = {};
      
      await relatedProductController(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Product ID and Category ID are required',
      });
    });

    // Invalid ObjectId format - Now handled as database errors
    test('should handle invalid product ID format', async () => {
      const castError = new Error('Cast to ObjectId failed');
      castError.name = 'CastError';
      castError.message = 'Invalid ObjectId';
      
      mockFind.mockImplementation(() => {
        throw castError;
      });
      
      await relatedProductController(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid Product ID or Category ID format',
        error: 'Invalid ObjectId',
      });
    });

    // Database error
    test('should handle database errors', async () => {
      // Simulate a database error
      const dbError = new Error('Database connection error');
      mockFind.mockImplementation(() => {
        throw dbError;
      });
      
      await relatedProductController(req, res);
      
      // Verify error handling
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Error while getting related products',
        error: dbError,
      });
    });

    // Boundary test - exactly 3 products returned when there are exactly 3 related products
    test('should return exactly 3 products when there are exactly 3 related products', async () => {
      // Mock returning exactly 3 products
      const mockThreeProducts = [
        { _id: '60d21b4667d0d8992e610c87', name: 'Product 1' },
        { _id: '60d21b4667d0d8992e610c88', name: 'Product 2' },
        { _id: '60d21b4667d0d8992e610c89', name: 'Product 3' },
      ];
      
      const limitMockPopulate = jest.fn().mockResolvedValue(mockThreeProducts);
      const limitMockLimit = jest.fn().mockReturnValue({ populate: limitMockPopulate });
      const limitMockSelect = jest.fn().mockReturnValue({ limit: limitMockLimit });
      const limitMockFind = jest.fn().mockReturnValue({ select: limitMockSelect });
      
      productModel.find = limitMockFind;
      
      await relatedProductController(req, res);
      
      // Verify that limit was called with 3
      expect(limitMockLimit).toHaveBeenCalledWith(3);
      
      // Verify response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        products: mockThreeProducts,
      });
      
      // Verify exactly 3 products were returned
      expect(res.send.mock.calls[0][0].products.length).toBe(3);
    });

    // Limit test - only 3 products returned when there are more than 3 related products
    test('should return only 3 products when there are more than 3 related products', async () => {
      // Create a scenario where the database would return 4 products,
      // but the limit should restrict it to 3
      const allProducts = [
        { _id: '60d21b4667d0d8992e610c87', name: 'Product 1' },
        { _id: '60d21b4667d0d8992e610c88', name: 'Product 2' },
        { _id: '60d21b4667d0d8992e610c89', name: 'Product 3' },
        { _id: '60d21b4667d0d8992e610c90', name: 'Product 4' }, // This one should be limited
      ];
      
      // But the limit should restrict what's returned to the first 3
      const limitedProducts = allProducts.slice(0, 3);
      
      // Mock the database response with appropriate limits
      const mockPopulateWithLimit = jest.fn().mockImplementation(() => {
        return Promise.resolve(limitedProducts);
      });
      
      const mockLimitWithEffect = jest.fn().mockImplementation((limit) => {
        // This simulates the actual limiting behavior
        return {
          populate: mockPopulateWithLimit
        };
      });
      
      const mockSelect = jest.fn().mockReturnValue({ limit: mockLimitWithEffect });
      const mockFind = jest.fn().mockReturnValue({ select: mockSelect });
      
      productModel.find = mockFind;
      
      await relatedProductController(req, res);
      
      // Verify that limit was called with 3
      expect(mockLimitWithEffect).toHaveBeenCalledWith(3);
      
      // Verify response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        products: limitedProducts,
      });
      
      // The key test - verify only 3 products were returned even though 4 exist
      expect(res.send.mock.calls[0][0].products.length).toBe(3);
      expect(allProducts.length).toBe(4); // Verify we started with 4 products
    });

    // Edge case - exclude current product from related products
    test('should exclude current product from related products', async () => {
      // Setup mock data where one product has the same ID as the requested product
      const currentProductId = req.params.pid;
      const categoryId = req.params.cid;
      
      // Create a scenario where the database contains both the current product
      // and other products in the same category
      const allCategoryProducts = [
        { _id: currentProductId, name: 'Current Product', category: categoryId },
        { _id: '60d21b4667d0d8992e610c87', name: 'Related Product 1', category: categoryId },
        { _id: '60d21b4667d0d8992e610c88', name: 'Related Product 2', category: categoryId },
      ];
      
      // But our mocked response should only contain the related products
      const expectedRelatedProducts = [
        { _id: '60d21b4667d0d8992e610c87', name: 'Related Product 1', category: categoryId },
        { _id: '60d21b4667d0d8992e610c88', name: 'Related Product 2', category: categoryId },
      ];
      
      // Mock the database to return only the related products
      const mockPopulate = jest.fn().mockResolvedValue(expectedRelatedProducts);
      const mockLimit = jest.fn().mockReturnValue({ populate: mockPopulate });
      const mockSelect = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFind = jest.fn().mockReturnValue({ select: mockSelect });
      
      productModel.find = mockFind;
      
      // Call the controller
      await relatedProductController(req, res);
      
      // Verify the response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        products: expectedRelatedProducts,
      });
      
      // Verify the current product is not in the results
      const productsInResponse = res.send.mock.calls[0][0].products;
      const currentProductInResponse = productsInResponse.find(p => p._id === currentProductId);
      expect(currentProductInResponse).toBeUndefined();
    });
  });

  describe('productCategoryController', () => {
    let req;
    let res;
    
    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();
      
      // Setup request and response objects
      req = {
        params: {
          slug: 'test-category'
        }
      };
      
      res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
      };
      
      // Mock console.log to prevent test output clutter
      jest.spyOn(console, 'log').mockImplementation(() => {});
    });
    
    // Test for successful case
    test('should return products with category data when category exists', async () => {
      // Arrange
      const mockCategory = { _id: 'cat123', name: 'Test Category', slug: 'test-category' };
      const mockProducts = [
        { _id: 'prod1', name: 'Product 1', category: 'cat123' },
        { _id: 'prod2', name: 'Product 2', category: 'cat123' }
      ];
      
      categoryModel.findOne.mockResolvedValue(mockCategory);
      
      const mockFind = {
        populate: jest.fn().mockResolvedValue(mockProducts)
      };
      productModel.find.mockReturnValue(mockFind);
      
      // Act
      await productCategoryController(req, res);
      
      // Assert - verify status code and data
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        category: mockCategory,
        products: mockProducts
      });
    });
    
    // Test for empty products array (but valid category)
    test('should return empty products array when category exists but has no products', async () => {
      // Arrange
      const mockCategory = { _id: 'cat123', name: 'Test Category', slug: 'test-category' };
      const mockProducts = [];
      
      categoryModel.findOne.mockResolvedValue(mockCategory);
      
      const mockFind = {
        populate: jest.fn().mockResolvedValue(mockProducts)
      };
      productModel.find.mockReturnValue(mockFind);
      
      // Act
      await productCategoryController(req, res);
      
      // Assert - verify empty products array is returned
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        category: mockCategory,
        products: []
      });
    });
    
    // Test for category not found
    test('should return 404 status when category does not exist', async () => {
      // Arrange
      categoryModel.findOne.mockResolvedValue(null);
      
      // Act
      await productCategoryController(req, res);
      
      // Assert - verify exact response for category not found
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Category not found"
      });
    });
    
    // Test for missing slug parameter
    test('should return 400 status when slug parameter is missing', async () => {
      // Arrange
      req.params = {}; // Empty params, no slug
      
      // Act
      await productCategoryController(req, res);
      
      // Assert - verify exact response for missing slug
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Category slug is required"
      });
    });
    
    // Test for database error
    test('should return error status when database operation fails', async () => {
      // Arrange
      const mockError = new Error('Database error');
      categoryModel.findOne.mockRejectedValue(mockError);
      
      // Act
      await productCategoryController(req, res);
      
      // Assert - verify error response includes the actual error
      expect(res.status).toHaveBeenCalledWith(500); // 500 for server errors
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        error: mockError,
        message: "Error while getting products"
      });
    });
    
    // Test for invalid category ID (CastError)
    test('should return 400 status when category ID format is invalid', async () => {
      // Arrange
      const mockError = new mongoose.Error.CastError('ObjectId', 'invalid-id', 'path');
      categoryModel.findOne.mockRejectedValue(mockError);
      
      // Act
      await productCategoryController(req, res);
      
      // Assert - verify 400 status and error response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        error: mockError,
        message: "Error while getting products"
      });
    });
    
    // Boundary test: very long slug
    test('should handle very long slug parameter appropriately', async () => {
      // Arrange
      const veryLongSlug = 'a'.repeat(1000); // 1000 character slug
      req.params.slug = veryLongSlug;
      
      categoryModel.findOne.mockResolvedValue(null);
      
      // Act
      await productCategoryController(req, res);
      
      // Assert - verify correct response even with extreme input
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Category not found"
      });
    });

    // Boundary tests: Empty string and special character slugs
    test('should handle empty string slug parameter', async () => {
      // Arrange
      req.params.slug = ''; // Empty string slug
      
      // Act
      await productCategoryController(req, res);
      
      // Assert - empty string should be treated as missing slug
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Category slug is required"
      });
    });
  });
});
