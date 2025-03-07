import { braintreeTokenController, brainTreePaymentController } from './productController';
import orderModel from '../models/orderModel';
import braintree from 'braintree';

// Mock the dependencies
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

describe('Payment Controllers', () => {
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
