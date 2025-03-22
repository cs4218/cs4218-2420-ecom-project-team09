import request from 'supertest';
import app from '../../server.js'
import userModel from '../../models/userModel.js';

let server;

beforeAll((done) => {
    server = app.listen(0, done);
});

afterAll((done) => {
    server.close(() => {
        done();
    });
});

// Clear the specific user before each test
beforeEach(async () => {
    await userModel.deleteMany({ email: 'authController_integration@example.com' });
});

describe('User Registration', () => {
    beforeEach(async () => {
        await userModel.deleteMany({ email: 'authController_integration@example.com' });
    });

    it('should register a user with valid details', async () => {
        const response = await request(server)
            .post('/api/v1/auth/register')
            .send({
                name: 'John Doe',
                email: 'authController_integration@example.com',
                password: 'password123',
                phone: '1234567890',
                address: '123 Main St',
                answer: 'blue'
            });
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('User Register Successfully');
        const user = await userModel.findOne({ email: 'authController_integration@example.com' });
        expect(user).not.toBeNull();
        expect(user.name).toBe('John Doe');
        expect(user.email).toBe('authController_integration@example.com');
        expect(user.phone).toBe('1234567890');
        expect(user.address).toBe('123 Main St');
        expect(user.answer).toBe('blue');
    });
    
    it('should not register a user with invalid name', async () => {
        const response = await request(server)
            .post('/api/v1/auth/register')
            .send({
                name: '',
                email: 'authController_integration@example.com',
                password: 'password123',
                phone: '1234567890',
                address: '123 Main St',
                answer: 'blue'
            });
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Name is Required');
    });

    it('should not register a user with invalid email', async () => {
        const response = await request(server)
            .post('/api/v1/auth/register')
            .send({
                name: 'John Doe',
                email: 'invalid-email',
                password: 'password123',
                phone: '1234567890',
                address: '123 Main St',
                answer: 'blue'
            });
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Invalid Email');
    });

    it('should not register a user with invalid password', async () => {
        const response = await request(server)
            .post('/api/v1/auth/register')
            .send({
                name: 'John Doe',
                email: 'authController_integration@example.com',
                password: '',
                phone: '1234567890',
                address: '123 Main St',
                answer: 'blue'
            });
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Password is Required');
    });

    it('should not register a user with invalid phone', async () => {
        const response = await request(server)
            .post('/api/v1/auth/register')
            .send({
                name: 'John Doe',
                email: 'authController_integration@example.com',
                password: 'password123',
                phone: '',
                address: '123 Main St',
                answer: 'blue'
            });
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Phone no is Required');
    });

    it('should not register a user with invalid address', async () => {
        const response = await request(server)
            .post('/api/v1/auth/register')
            .send({
                name: 'John Doe',
                email: 'authController_integration@example.com',
                password: 'password123',
                phone: '1234567890',
                address: '',
                answer: 'blue'
            });
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Address is Required');
    });

    it('should not register a user with invalid answer', async () => {
        const response = await request(server)
            .post('/api/v1/auth/register')
            .send({
                name: 'John Doe',
                email: 'authController_integration@example.com',
                password: 'password123',
                phone: '1234567890',
                address: '123 Main St',
                answer: ''
            });
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Answer is Required');
    });
});

describe('User Login', () => {
    beforeEach(async () => {
        await userModel.deleteMany({ email: 'authController_integration@example.com' });
        // Register a user to test login
        await request(server)
            .post('/api/v1/auth/register')
            .send({
                name: 'John Doe',
                email: 'authController_integration@example.com',
                password: 'password123',
                phone: '1234567890',
                address: '123 Main St',
                answer: 'blue'
            });
        // Check if the user is in the database
        const user = await userModel.findOne({ email: 'authController_integration@example.com' });
    });

    it('should login with valid email and password', async () => {
        const response = await request(server)
            .post('/api/v1/auth/login')
            .send({
                email: 'authController_integration@example.com',
                password: 'password123'
            });
        const users = await userModel.find({});
        const user = await userModel.findOne({ email: 'authController_integration@example.com' });
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('login successfully');
    });

    it('should not login with invalid email', async () => {
        const response = await request(server)
            .post('/api/v1/auth/login')
            .send({
                email: 'invalid@example.com',
                password: 'password123'
            });
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Email is not registered');
    });

    it('should not login with invalid password', async () => {
        const response = await request(server)
            .post('/api/v1/auth/login')
            .send({
                email: 'authController_integration@example.com',
                password: 'wrongpassword'
            });
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Invalid Password');
    });

    it('should not login with invalid email/password combination', async () => {
        const response = await request(server)
            .post('/api/v1/auth/login')
            .send({
                email: 'invalid@example.com',
                password: 'wrongpassword'
            });
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Email is not registered');
    });
});

describe('Password Reset', () => {
    beforeEach(async () => {
        await userModel.deleteMany({ email: 'authController_integration@example.com' });
        // Register a user to test password reset
        await request(server)
            .post('/api/v1/auth/register')
            .send({
                name: 'John Doe',
                email: 'authController_integration@example.com',
                password: 'password123',
                phone: '1234567890',
                address: '123 Main St',
                answer: 'blue'
            });
    });

    it('should reset password with valid email, answer, and new password', async () => {
        const response = await request(server)
            .post('/api/v1/auth/forgot-password')
            .send({
                email: 'authController_integration@example.com',
                answer: 'blue',
                newPassword: 'newpassword123'
            });
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Password Reset Successfully');
    });

    it('should not reset password with invalid email', async () => {
        const response = await request(server)
            .post('/api/v1/auth/forgot-password')
            .send({
                email: 'invalid@example.com',
                answer: 'blue',
                newPassword: 'newpassword123'
            });
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Wrong Email Or Answer');
    });

    it('should not reset password with invalid answer', async () => {
        const response = await request(server)
            .post('/api/v1/auth/forgot-password')
            .send({
                email: 'authController_integration@example.com',
                answer: 'wronganswer',
                newPassword: 'newpassword123'
            });
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Wrong Email Or Answer');
    });

    it('should not reset password with invalid new password', async () => {
        const response = await request(server)
            .post('/api/v1/auth/forgot-password')
            .send({
                email: 'authController_integration@example.com',
                answer: 'blue',
                newPassword: ''
            });
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('New Password is required');
    });

    it('should not reset password with invalid email/answer combination', async () => {
        const response = await request(server)
            .post('/api/v1/auth/forgot-password')
            .send({
                email: 'invalid@example.com',
                answer: 'wronganswer',
                newPassword: 'newpassword123'
            });
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Wrong Email Or Answer');
    });
});

describe('Profile Update', () => {
    let token;

    beforeEach(async () => {
        await userModel.deleteMany({ email: 'authController_integration@example.com' });
        // Register and login a user to test profile update
        await request(server)
            .post('/api/v1/auth/register')
            .send({
                name: 'John Doe',
                email: 'authController_integration@example.com',
                password: 'password123',
                phone: '1234567890',
                address: '123 Main St',
                answer: 'blue'
            });

        const loginResponse = await request(server)
            .post('/api/v1/auth/login')
            .send({
                email: 'authController_integration@example.com',
                password: 'password123'
            });

        token = loginResponse.body.token;
    });

    it('should not update profile with empty password', async () => {
        const response = await request(server)
            .put('/api/v1/auth/profile')
            .set('Authorization', `Bearer ${token}`)
            .send({
                password: ''
            });
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Password is required and 6 character long');
    });

    it('should not update profile with password less than 6 characters', async () => {
        const response = await request(server)
            .put('/api/v1/auth/profile')
            .set('Authorization', `Bearer ${token}`)
            .send({
                password: '123'
            });
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Password is required and 6 character long');
    });

    it('should update profile with valid name, email, phone, address, answer', async () => {
        const response = await request(server)
            .put('/api/v1/auth/profile')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Jane Doe',
                email: 'authController_integration@example.com',
                phone: '0987654321',
                address: '456 Elm St',
                answer: 'green',
                password: 'newpassword123'
            });
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Profile Updated Successfully');
    });
});
