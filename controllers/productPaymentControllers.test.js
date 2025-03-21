import { jest } from '@jest/globals';
import { braintreeTokenController, brainTreePaymentController } from './productController.js';
import orderModel from '../models/orderModel.js';
import braintree from 'braintree';
import mockingoose from 'mockingoose';

describe('Product Payment Controllers', () => {
  let req;
  let res;
  let gateway;
  let consoleErrorSpy;
  
  beforeEach(() => {
    // Reset mockingoose and mocks
    mockingoose.resetAll();
    jest.clearAllMocks();
    
    // Setup request object
    req = {
      body: {},
      user: { _id: 'test-user-id' }
    };
    
    // Setup response object with spy methods
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn()
    };
    
    // Create a mock gateway
    gateway = {
      clientToken: {
        generate: jest.fn()
      },
      transaction: {
        sale: jest.fn()
      }
    };
    
    // Mock console.error
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });
  
  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });
  
  describe('braintreeTokenController', () => {
    test('should generate client token successfully', async () => {
      // Setup mock implementation for generate
      gateway.clientToken.generate.mockImplementation(async () => {
        return { clientToken: 'test-client-token' };
      });
      
      // Act
      await braintreeTokenController(gateway)(req, res);
      
      // Assert 
      expect(gateway.clientToken.generate).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({ clientToken: 'test-client-token' });
    });
    
    test('should return 500 if token generation error', async () => {
      // Setup mock implementation for generate with error
      const mockError = new Error('Token generation failed');
      gateway.clientToken.generate.mockImplementation(async (options) => {
        throw mockError;
      });
      
      // Act
      await braintreeTokenController(gateway)(req, res);
      
      // Assert
      expect(gateway.clientToken.generate).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(mockError);
    });
  });
  
  describe('brainTreePaymentController', () => {
    const mockCart = [
      { price: 100 },
      { price: 200 }
    ];
    
    beforeEach(() => {
      req.body = {
        nonce: 'test-payment-nonce',
        cart: mockCart
      };
    });
    
    test('should process payment successfully', async () => {
      // Setup mock successful transaction
      const mockResult = {
        success: true,
        transaction: { id: 'test-transaction-id' }
      };
      
      gateway.transaction.sale.mockImplementation((options, callback) => {
        callback(null, mockResult);
      });
      
      // Setup mock for orderModel
      const mockSave = jest.fn().mockResolvedValue({ _id: 'test-order-id' });
      jest.spyOn(orderModel.prototype, 'save').mockImplementation(mockSave);
      
      // Act
      await brainTreePaymentController(gateway)(req, res);
      
      // Assert
      expect(gateway.transaction.sale).toHaveBeenCalledWith({
        amount: 300, // 100 + 200
        paymentMethodNonce: 'test-payment-nonce',
        options: {
          submitForSettlement: true
        }
      }, expect.any(Function));
      
      // Verify order was created
      expect(orderModel.prototype.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ ok: true });
      expect(res.status).toHaveBeenCalledWith(200);
    });
    
    test('should return 500 if payment processing error', async () => {
      // Setup mock transaction error
      const mockError = new Error('Payment processing failed');
      gateway.transaction.sale.mockImplementation((options, callback) => {
        callback(mockError, null);
      });
      
      // Act
      await brainTreePaymentController(gateway)(req, res);
      
      // Assert
      expect(gateway.transaction.sale).toHaveBeenCalled();
      expect(orderModel.prototype.save).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(mockError);
    });
    
    test('should calculate total amount correctly for multiple items', async () => {
      // Setup complex cart
      const complexCart = [
        { price: 99.99 },
        { price: 149.99 },
        { price: 299.99 }
      ];
      
      // Update request with complex cart
      req.body.cart = complexCart;
      
      // Setup mock implementation to verify amount
      gateway.transaction.sale.mockImplementation((options, callback) => {
        expect(options.amount).toBeCloseTo(549.97); // Sum of all prices
        callback(null, { success: true });
      });
      
      // Setup mock for orderModel
      const mockSave = jest.fn().mockResolvedValue({ _id: 'test-order-id' });
      jest.spyOn(orderModel.prototype, 'save').mockImplementation(mockSave);
      
      // Act
      await brainTreePaymentController(gateway)(req, res);
      
      // Implicitly verified in the mock implementation above
    });
    
    test('should return 400 if negative prices in cart', async () => {
      // Setup cart with negative prices
      const cartWithNegativePrices = [
        { price: 99.99 },
        { price: -50.00 }, // Negative price
        { price: 149.99 }
      ];
      
      // Update request
      req.body.cart = cartWithNegativePrices;
      
      // Act
      await brainTreePaymentController(gateway)(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid price in cart, prices must be non-negative'
        })
      );
      
      // Ensure the transaction was not called
      expect(gateway.transaction.sale).not.toHaveBeenCalled();
    });
    
    test('should return 400 if non-numeric prices in cart', async () => {
      // Setup cart with invalid prices
      const cartWithInvalidPrices = [
        { price: 99.99 },
        { price: "invalid" }, // Non-numeric price
        { price: {} } // Object instead of number
      ];
      
      // Update request
      req.body.cart = cartWithInvalidPrices;
      
      // Act
      await brainTreePaymentController(gateway)(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid price in cart, prices must be numeric'
        })
      );
      
      // Ensure the transaction was not called
      expect(gateway.transaction.sale).not.toHaveBeenCalled();
    });
    
    test('should return 400 if any item in cart is missing a price', async () => {
      // Setup cart with missing price
      const cartWithMissingPrice = [
        { name: "Item 1", price: 100 },
        { name: "Item 2" } // Missing price
      ];
      
      // Update request
      req.body.cart = cartWithMissingPrice;
      
      // Act
      await brainTreePaymentController(gateway)(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Price is missing in cart'
        })
      );
      
      // Ensure the transaction was not called
      expect(gateway.transaction.sale).not.toHaveBeenCalled();
    });
    
    test('should handle empty cart', async () => {
      // Setup empty cart
      req.body.cart = [];
      
      // Act
      await brainTreePaymentController(gateway)(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Cart is empty, cannot process payment'
        })
      );
      
      // Ensure the transaction was not called
      expect(gateway.transaction.sale).not.toHaveBeenCalled();
    });
    
    test('should return 400 if payment nonce is missing', async () => {
      // Remove nonce from request
      delete req.body.nonce;
      
      // Act
      await brainTreePaymentController(gateway)(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Payment method nonce is required'
        })
      );
      
      // Ensure the transaction was not called
      expect(gateway.transaction.sale).not.toHaveBeenCalled();
    });
    
    test('should return 500 if order saving fails', async () => {
      // Setup mock successful transaction
      const mockResult = {
        success: true,
        transaction: { id: 'test-transaction-id' }
      };
      
      gateway.transaction.sale.mockImplementation((options, callback) => {
        callback(null, mockResult);
      });
      
      // Setup mock for orderModel with save error
      const databaseSaveError = new Error('Database save error');
      jest.spyOn(orderModel.prototype, 'save').mockRejectedValue(databaseSaveError);
      
      // Act
      await brainTreePaymentController(gateway)(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(databaseSaveError);
    });
    
    test('should return 500 if Braintree transaction fails', async () => {
      // Setup mock failed transaction
      const mockFailedResult = {
        success: false,
        message: 'Transaction declined'
      };
      
      gateway.transaction.sale.mockImplementation((options, callback) => {
        callback(null, mockFailedResult);
      });
      
      // Act
      await brainTreePaymentController(gateway)(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Transaction declined'
        })
      );
    });
    
    test('should use mockingoose for order model integration', async () => {
      // Setup mock successful transaction
      const mockResult = {
        success: true,
        transaction: { id: 'test-transaction-id' }
      };
      
      gateway.transaction.sale.mockImplementation((options, callback) => {
        callback(null, mockResult);
      });
      
      // Restore original mock and use mockingoose
      jest.spyOn(orderModel.prototype, 'save').mockRestore();
      
      // Setup mockingoose for orderModel
      const mockOrder = { _id: 'test-order-id' };
      mockingoose(orderModel).toReturn(mockOrder, 'save');
      
      // Act
      await brainTreePaymentController(gateway)(req, res);
      
      // Assert
      expect(res.json).toHaveBeenCalledWith({ ok: true });
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});