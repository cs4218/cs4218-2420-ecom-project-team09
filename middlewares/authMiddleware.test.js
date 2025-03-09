// authMiddleware.test.js
import { jest } from '@jest/globals';
import { requireSignIn, isAdmin } from '../middlewares/authMiddleware.js';
import JWT from 'jsonwebtoken';
import userModel from '../models/userModel.js';

describe('Auth Middleware Tests', () => {
  // Store original console.error
  const originalConsoleError = console.error;
  
  beforeAll(() => {
    // Replace with silent mock for tests
    console.error = jest.fn();
  });
  
  afterAll(() => {
    // Restore original after all tests
    console.error = originalConsoleError;
  });

  // Common test variables
  let req;
  let res;
  let next;

  // Setup before each test
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock request, response, and next function
    req = {
      headers: {},
      user: null
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };
    
    next = jest.fn();
    
    // Mock environment variable
    process.env.JWT_SECRET = 'test_secret';
    
    // Setup spies on JWT and userModel
    jest.spyOn(JWT, 'verify');
    jest.spyOn(userModel, 'findById');
  });

  // ======= requireSignIn tests =======
  describe('requireSignIn Middleware', () => {
    // Happy path - valid token
    test('should call next() when token is valid', async () => {
      // Arrange
      const mockUser = { _id: 'user123', name: 'Test User' };
      req.headers.authorization = 'valid_token';
      JWT.verify.mockReturnValue(mockUser);
      
      // Act
      await requireSignIn(req, res, next);
      
      // Assert
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    // Happy path - valid Bearer token
    test('should handle Bearer token format correctly', async () => {
      // Arrange
      const mockUser = { _id: 'user123', name: 'Test User' };
      req.headers.authorization = 'Bearer valid_token';
      JWT.verify.mockReturnValue(mockUser);
      
      // Act
      await requireSignIn(req, res, next);
      
      // Assert
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
    });
    
    // Error path - no token
    test('should return 401 when no token is provided', async () => {
      // Arrange - no authorization header set
      
      // Act
      await requireSignIn(req, res, next);
      
      // Assert
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Access denied. No token provided"
      });
    });
    
    // Error path - invalid token
    test('should return 401 when token is invalid', async () => {
      // Arrange
      req.headers.authorization = 'invalid_token';
      const error = new Error('Invalid token');
      JWT.verify.mockImplementation(() => {
        throw error;
      });
      
      // Act
      await requireSignIn(req, res, next);
      
      // Assert
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid token",
        error: "Invalid token"
      });
    });

    // Boundary test - empty token
    test('should return 401 for empty token', async () => {
      // Arrange
      req.headers.authorization = '';
      
      // Act
      await requireSignIn(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ======= isAdmin tests =======
  describe('isAdmin Middleware', () => {
    // Happy path - admin user
    test('should call next() when user is admin', async () => {
      // Arrange
      req.user = { _id: 'admin123' };
      const adminUser = { _id: 'admin123', name: 'Admin User', role: 1 };
      userModel.findById.mockResolvedValue(adminUser);
      
      // Act
      await isAdmin(req, res, next);
      
      // Assert
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
    
    // Error path - non-admin user
    test('should return 401 when user is not admin', async () => {
      // Arrange
      req.user = { _id: 'user123' };
      const regularUser = { _id: 'user123', name: 'Regular User', role: 0 };
      userModel.findById.mockResolvedValue(regularUser);
      
      // Act
      await isAdmin(req, res, next);
      
      // Assert
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Unauthorized Access"
      });
    });
    
    // Error path - user not found
    test('should return 404 when user not found in database', async () => {
      // Arrange
      req.user = { _id: 'nonexistent123' };
      userModel.findById.mockResolvedValue(null);
      
      // Act
      await isAdmin(req, res, next);
      
      // Assert
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "User not found"
      });
    });
    
    // Error path - no user in request
    test('should return 401 when req.user is missing', async () => {
      // Arrange - req.user not set
      
      // Act
      await isAdmin(req, res, next);
      
      // Assert
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "User not authenticated"
      });
    });
    
    // Error path - database error
    test('should handle database errors properly', async () => {
      // Arrange
      req.user = { _id: 'user123' };
      const dbError = new Error('Database connection error');
      userModel.findById.mockRejectedValue(dbError);
      
      // Act
      await isAdmin(req, res, next);
      
      // Assert
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        error: dbError,
        message: "Error in admin middleware"
      });
    });

    // Boundary test - odd role values
    test('should treat any role other than 1 as non-admin', async () => {
      // Arrange - user with role 2 (non-standard)
      req.user = { _id: 'user456' };
      const oddRoleUser = { _id: 'user456', name: 'Odd Role User', role: 2 };
      userModel.findById.mockResolvedValue(oddRoleUser);
      
      // Act
      await isAdmin(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
