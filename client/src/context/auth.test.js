// auth.test.js
import React from 'react';
import { render, act, renderHook } from '@testing-library/react';
import { AuthProvider, useAuth } from './auth';
import axios from 'axios';

// Mock axios
jest.mock('axios', () => ({
  defaults: {
    headers: {
      common: {
        Authorization: ''
      }
    }
  }
}));

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value;
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('AuthProvider and useAuth', () => {
  beforeEach(() => {
    localStorageMock.clear();
    localStorageMock.getItem.mockClear();
    jest.clearAllMocks();
  });

  test('should initialize with default values', () => {
    // Arrange & Act
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Assert
    expect(result.current[0]).toEqual({ user: null, token: '' });
    expect(typeof result.current[1]).toBe('function');
  });

  test('should load auth data from localStorage on mount', () => {
    // Arrange
    const mockUser = { id: '123', name: 'Test User' };
    const mockToken = 'test-token-123';
    const mockAuthData = JSON.stringify({ user: mockUser, token: mockToken });
    localStorageMock.getItem.mockReturnValueOnce(mockAuthData);

    // Act
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Assert
    expect(result.current[0]).toEqual({ user: mockUser, token: mockToken });
  });

  test('should render children properly', () => {
    // Arrange
    const testMessage = 'Test Child Component';
    const TestChild = () => <div data-testid="child">{testMessage}</div>;

    // Act
    const { getByTestId } = render(
      <AuthProvider>
        <TestChild />
      </AuthProvider>
    );

    // Assert
    expect(getByTestId('child').textContent).toBe(testMessage);
  });

  test('should allow auth state to be updated via setAuth', () => {
    // Arrange
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });
    const newUser = { id: '456', name: 'New User' };
    const newToken = 'new-token-456';

    // Act
    act(() => {
      result.current[1]({ user: newUser, token: newToken });
    });

    // Assert
    expect(result.current[0]).toEqual({ user: newUser, token: newToken });
  });

  // Error handling test - for JSON.parse
  test('should handle JSON parse errors gracefully', () => {
    // Arrange
    console.error = jest.fn(); // Mock console.error
    localStorageMock.getItem.mockReturnValueOnce('invalid-json');
    
    // Act & Assert
    expect(() => {
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      renderHook(() => useAuth(), { wrapper });
    }).toThrow(); // Since there's no try/catch in the code, this will throw
    
    // Cleanup
    console.error.mockRestore();
  });

  test('useAuth should return undefined when used outside AuthProvider', () => {
    // Since context is initialized as undefined, this should return undefined
    // which might cause errors when destructuring
    console.error = jest.fn(); // Suppress React error logs
    
    // Act & Assert - this might not throw but will likely cause errors when used
    const { result } = renderHook(() => useAuth());
    expect(result.current).toBeUndefined();
    
    // Cleanup
    console.error.mockRestore();
  });
});
