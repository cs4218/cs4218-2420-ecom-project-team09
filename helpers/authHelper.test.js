// authHelper.test.js
import { jest } from '@jest/globals';
import bcrypt from 'bcrypt';
import { hashPassword, comparePassword } from '../helpers/authHelper.js';

describe('Password Utilities', () => {
    const originalConsoleError = console.error;

    beforeAll(() => {
        // Replace with a silent mock during tests
        console.error = jest.fn();
    });

    afterAll(() => {
        // Restore original console.error after tests
        console.error = originalConsoleError;
    });

    // Reset mocks after each test
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('hashPassword', () => {
        beforeEach(() => {
            // Setup default mock implementation using spyOn
            jest.spyOn(bcrypt, 'hash').mockResolvedValue('$2b$10$abcdefghijklmnopqrstuvwxyz012345678901234567890123456789012');
        });

        test('should hash a password successfully', async () => {
            const password = 'TestPassword123';
            const mockHash = '$2b$10$abcdefghijklmnopqrstuvwxyz012345678901234567890123456789012';

            const hashedResult = await hashPassword(password);

            // Verify we got the expected mock hash back
            expect(hashedResult).toEqual(mockHash);

            // Use a regex that matches your mock hash
            expect(hashedResult).toMatch(/^\$2b\$\d+\$.+$/);
        });

        test('should use 10 salt rounds', async () => {
            const password = 'TestPassword123';

            await hashPassword(password);

            expect(bcrypt.hash).toHaveBeenCalledWith(expect.any(String), 10);
        });

        test('should convert non-string passwords to strings', async () => {
            const numberPassword = 12345;

            await hashPassword(numberPassword);

            expect(bcrypt.hash).toHaveBeenCalledWith('12345', 10);
        });

        test('should throw an error for null password', async () => {
            await expect(hashPassword(null)).rejects.toThrow('Password cannot be null or undefined');
            expect(bcrypt.hash).not.toHaveBeenCalled();
        });

        test('should throw an error for undefined password', async () => {
            await expect(hashPassword(undefined)).rejects.toThrow('Password cannot be null or undefined');
            expect(bcrypt.hash).not.toHaveBeenCalled();
        });

        test('should propagate bcrypt errors', async () => {
            const testError = new Error('Test bcrypt error');
            // Override the mock for this specific test
            jest.spyOn(bcrypt, 'hash').mockRejectedValue(testError);

            await expect(hashPassword('password')).rejects.toThrow(testError);
        });

        test('should reject empty string passwords', async () => {
            const emptyPassword = '';

            await expect(hashPassword(emptyPassword)).rejects.toThrow('Password cannot be empty');
            expect(bcrypt.hash).not.toHaveBeenCalled();
        });
    });

    describe('comparePassword', () => {
        beforeEach(() => {
            // Setup default mock implementation using spyOn
            jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
        });

        test('should return true for matching passwords', async () => {
            const password = 'TestPassword123';
            const hashedPwd = '$2b$10$hashedPasswordValue';
            
            const result = await comparePassword(password, hashedPwd);

            expect(result).toBe(true);
            expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPwd);
        });

        test('should return false for non-matching passwords', async () => {
            const password = 'WrongPassword123';
            const hashedPwd = '$2b$10$hashedPasswordValue';
            
            // Override the mock for this specific test
            jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

            const result = await comparePassword(password, hashedPwd);

            expect(result).toBe(false);
            expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPwd);
        });

        test('should convert non-string passwords to strings', async () => {
            const password = 12345;
            const hashedPwd = '$2b$10$hashedPasswordValue';

            await comparePassword(password, hashedPwd);

            expect(bcrypt.compare).toHaveBeenCalledWith('12345', hashedPwd);
        });

        test('should throw an error for null password', async () => {
            await expect(comparePassword(null, 'hashedpwd')).rejects.toThrow('Password cannot be null or undefined');
            expect(bcrypt.compare).not.toHaveBeenCalled();
        });

        test('should throw an error for undefined password', async () => {
            await expect(comparePassword(undefined, 'hashedpwd')).rejects.toThrow('Password cannot be null or undefined');
            expect(bcrypt.compare).not.toHaveBeenCalled();
        });

        test('should throw an error for null hashed password', async () => {
            await expect(comparePassword('password', null)).rejects.toThrow('Hashed password cannot be null or undefined');
            expect(bcrypt.compare).not.toHaveBeenCalled();
        });

        test('should throw an error for undefined hashed password', async () => {
            await expect(comparePassword('password', undefined)).rejects.toThrow('Hashed password cannot be null or undefined');
            expect(bcrypt.compare).not.toHaveBeenCalled();
        });

        test('should propagate bcrypt errors', async () => {
            const testError = new Error('Test bcrypt error');
            // Override the mock for this specific test
            jest.spyOn(bcrypt, 'compare').mockRejectedValue(testError);

            await expect(comparePassword('password', 'hashedpwd')).rejects.toThrow(testError);
        });

        test('should reject empty string passwords', async () => {
            const emptyPassword = '';
            const hashedPwd = '$2b$10$hashedEmptyPassword';

            await expect(comparePassword(emptyPassword, hashedPwd)).rejects.toThrow('Password cannot be empty');
            expect(bcrypt.compare).not.toHaveBeenCalled();
        });

        test('should handle invalid hash format', async () => {
            const testError = new Error('Invalid hash format');
            // Override the mock for this specific test
            jest.spyOn(bcrypt, 'compare').mockRejectedValue(testError);

            await expect(comparePassword('password', 'invalid-hash-format')).rejects.toThrow(testError);
            expect(bcrypt.compare).toHaveBeenCalledWith('password', 'invalid-hash-format');
        });
    });
});
