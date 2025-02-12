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
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock request and response
    mockRequest = {
      body: {},
      user: { _id: 'test-user-id' }
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn()
    };

    // Get reference to the mocked gateway instance
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

    test('should handle token generation error', async () => {
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

    // test("should return 500 if gateway is missing", async () => {      
    //     await braintreeTokenController(mockRequest, mockResponse, undefined); // No gateway
      
    //     expect(mockResponse.status).toHaveBeenCalledWith(500);
    //     expect(mockResponse.json).toHaveBeenCalledWith({
    //         success: false,
    //         message: "Internal Server Error",
    //         error,
    //       });
    //   });      
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

        // Verify response
        expect(mockResponse.json).toHaveBeenCalledWith({ ok: true });
        expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    test('should handle payment processing error', async () => {
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

    test('should handle negative prices in cart', async () => {
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
      
        // Call the controller function
        await brainTreePaymentController(mockCartWithNegativePricesRequest, mockResponse, mockGateway);
      
        // Ensure that the response is appropriate for invalid prices
        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Invalid price in cart, prices must be non-negative'
        });
      
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

        // Verify that the response returns the correct status and message for empty cart
        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: "Cart is empty, cannot process payment" });

        // Ensure the payment gateway transaction wasn't called
        expect(mockGateway.transaction.sale).not.toHaveBeenCalled();
    });
  });
});
