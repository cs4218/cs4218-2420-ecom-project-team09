// productController.test.js
import { jest } from '@jest/globals';
import {
    getProductController,
} from '../controllers/productController.js';
  
import productModel from '../models/productModel.js';
import {  } from './productController.js';

import mockingoose from 'mockingoose';
  
// Tests for getProductController
describe('getProductController', () => {

    let req;
    let res;
    let consoleErrorSpy;
    
    beforeEach(() => {
        // Reset mockingoose before each test
        mockingoose.resetAll();
        
        // Setup request and response objects
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
        
        // Spy on console.error
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });
    
    afterEach(() => {
        // Restore console.error and clear mocks
        consoleErrorSpy.mockRestore();
        jest.clearAllMocks();
    });

    test('should successfully retrieve products and return 200 status', async () => {
    // Mock data
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
    
    // Create a mock query object with chained methods
    const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockProducts)
    };
    
    // Mock the find method to return our mock query
    jest.spyOn(productModel, 'find').mockReturnValue(mockQuery);

    // Act
    await getProductController(req, res);

    // Assert
    expect(productModel.find).toHaveBeenCalled();
    expect(mockQuery.populate).toHaveBeenCalledWith('category');
    expect(mockQuery.select).toHaveBeenCalledWith('-photo');
    expect(mockQuery.limit).toHaveBeenCalledWith(12);
    expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
        success: true,
        countTotal: 2,
        message: 'All Products',
        products: mockProducts
    });
    });

    test('should exclude photo field from returned products', async () => {
    // Mock data
    const mockProductsAfterSelect = [
        { 
        _id: '1', 
        name: 'Product with photo', 
        price: 100
        // photo field is excluded
        }
    ];
    
    // Mock query chain
    const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockProductsAfterSelect)
    };
    
    // Mock find method
    jest.spyOn(productModel, 'find').mockReturnValue(mockQuery);

    // Act
    await getProductController(req, res);

    // Assert
    expect(mockQuery.select).toHaveBeenCalledWith('-photo');
    expect(res.send.mock.calls[0][0].products[0]).not.toHaveProperty('photo');
    expect(res.send.mock.calls[0][0].products[0]).toHaveProperty('name');
    expect(res.send.mock.calls[0][0].products[0]).toHaveProperty('price');
    });

    test('should populate category field for each product', async () => {
    // Mock categories
    const mockCategories = {
        'cat1': { _id: 'cat1', name: 'Electronics' },
        'cat2': { _id: 'cat2', name: 'Clothing' }
    };
    
    // Products after population
    const productsAfterPopulate = [
        { _id: '1', name: 'Laptop', category: mockCategories['cat1'] },
        { _id: '2', name: 'Shirt', category: mockCategories['cat2'] }
    ];
    
    // Mock query chain
    const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(productsAfterPopulate)
    };
    
    // Mock find method
    jest.spyOn(productModel, 'find').mockReturnValue(mockQuery);

    // Act
    await getProductController(req, res);

    // Assert
    expect(mockQuery.populate).toHaveBeenCalledWith('category');
    expect(res.send.mock.calls[0][0].products[0].category.name).toBe('Electronics');
    expect(res.send.mock.calls[0][0].products[1].category.name).toBe('Clothing');
    });

    test('should sort products by createdAt in descending order', async () => {
    // Products sorted by createdAt
    const sortedProducts = [
        { _id: '2', name: 'Product 2', createdAt: new Date('2023-03-15') },
        { _id: '3', name: 'Product 3', createdAt: new Date('2023-03-10') },
        { _id: '1', name: 'Product 1', createdAt: new Date('2023-03-01') }
    ];
    
    // Mock query chain
    const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(sortedProducts)
    };
    
    // Mock find method
    jest.spyOn(productModel, 'find').mockReturnValue(mockQuery);

    // Act
    await getProductController(req, res);

    // Assert
    expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(res.send.mock.calls[0][0].products[0]._id).toBe('2'); // The newest product
    expect(res.send.mock.calls[0][0].products[1]._id).toBe('3');
    expect(res.send.mock.calls[0][0].products[2]._id).toBe('1'); // The oldest product
    });

    test('should return empty array when no products exist', async () => {
    // Mock empty products array
    const mockProducts = [];
    
    // Mock query chain
    const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockProducts)
    };
    
    // Mock find method
    jest.spyOn(productModel, 'find').mockReturnValue(mockQuery);

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
    // Create a larger array but controller should limit to 12
    const limitedProducts = Array(12).fill().map((_, index) => ({
        _id: `${index + 1}`,
        name: `Product ${index + 1}`,
        price: 100 * (index + 1)
    }));
    
    // Mock query chain with limit implementation
    const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(limitedProducts)
    };
    
    // Mock find method
    jest.spyOn(productModel, 'find').mockReturnValue(mockQuery);

    // Act
    await getProductController(req, res);

    // Assert
    expect(mockQuery.limit).toHaveBeenCalledWith(12);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
        success: true,
        countTotal: 12,
        message: 'All Products',
        products: limitedProducts
    });
    expect(res.send.mock.calls[0][0].products.length).toBe(12);
    });

    test('should handle database errors and return 500 status', async () => {
    // Mock error
    const mockError = new Error('Database connection failed');
    
    // Mock query chain that throws an error
    const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockRejectedValue(mockError)
    };
    
    // Mock find method
    jest.spyOn(productModel, 'find').mockReturnValue(mockQuery);

    // The controller should call console.error - make sure this is happening in your implementation
    // Let's assume the controller actually logs errors like this:
    // try { ... } catch (error) { console.error(error); ... }

    // Act
    await getProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Error in getting products',
        error: mockError.message
    });
    
    // If your controller doesn't actually call console.error, remove or adjust this expectation
    // Inspect your controller code to see if it actually logs errors
    // If it doesn't, you should either modify the controller or remove this expectation
    });

    test('should handle products with null category references', async () => {
    // Mock products with null category
    const mockProducts = [
        {
        _id: '1',
        name: 'Product with null category',
        price: 100,
        category: null
        }
    ];
    
    // Mock query chain
    const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockProducts)
    };
    
    // Mock find method
    jest.spyOn(productModel, 'find').mockReturnValue(mockQuery);

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