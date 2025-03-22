import request from 'supertest';
import app from '../server.js';
import userModel from '../models/userModel.js';
import orderModel from '../models/orderModel.js';
import productModel from '../models/productModel.js';

let server;

beforeAll((done) => {
    server = app.listen(0, done);
});

afterAll((done) => {
    server.close(() => {
        done();
    });
});

describe('Braintree Token Creation', () => {
    let token;
    beforeEach(async () => {
        await userModel.deleteMany({ email: 'productController_integration@example.com' });
        // Register and login a user to test payment
        await request(server)
            .post('/api/v1/auth/register')
            .send({
                name: 'John Doe',
                email: 'productController_integration@example.com',
                password: 'password123',
                phone: '1234567890',
                address: '123 Main St',
                answer: 'blue'
            });

        const loginResponse = await request(server)
            .post('/api/v1/auth/login')
            .send({
                email: 'productController_integration@example.com',
                password: 'password123'
            });
        console.log(loginResponse.body)
        token = loginResponse.body.token;
    }, 10000);
    
    it('should generate a client token', async () => {
        const response = await request(server)
            .get('/api/v1/product/braintree/token');
        console.log(response.status, response.body)
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('clientToken');
    });
});

describe('Payment Flow', () => {

    let token;
    let product1;
    let product2;

    beforeEach(async () => {
        await userModel.deleteMany({ email: 'productController_integration@example.com' });
        await orderModel.deleteMany({});
        await productModel.deleteMany({});
        
        // Create products and get their IDs
        product1 = await productModel.create({
            price: 100,
            name: 'Product 1',
            slug: 'product-1',
            description: 'Description 1',
            category: '60d21b4667d0d8992e610c85',
            quantity: 1
        });
        product2 = await productModel.create({
            price: 200,
            name: 'Product 2',
            slug: 'product-2',
            description: 'Description 2',
            category: '60d21b4667d0d8992e610c85',
            quantity: 1
        });


        // Register and login a user to test payment
        await request(server)
            .post('/api/v1/auth/register')
            .send({
                name: 'John Doe',
                email: 'productController_integration@example.com',
                password: 'password123',
                phone: '1234567890',
                address: '123 Main St',
                answer: 'blue'
            });

        const loginResponse = await request(server)
            .post('/api/v1/auth/login')
            .send({
                email: 'productController_integration@example.com',
                password: 'password123'
            });

        token = loginResponse.body.token;
    });

    it('should make payment with valid nonce and cart', async () => {
        const nonce = 'fake-valid-nonce';
        const cart = [product1, product2];
        console.log(cart)
        const response = await request(server)
            .post('/api/v1/product/braintree/payment')
            .set('Authorization', `Bearer ${token}`)
            .send({ nonce, cart });
        console.log(response.status, response.body)
        expect(response.status).toBe(200);
        expect(response.body.ok).toBe(true);
    });

    it('should not make payment with invalid nonce', async () => {
        const nonce = 'invalid-nonce';
        const cart = [product1, product2];
        const response = await request(server)
            .post('/api/v1/product/braintree/payment')
            .set('Authorization', `Bearer ${token}`)
            .send({ nonce, cart });
        expect(response.status).toBe(500);
    });

    it('should not make payment with empty cart', async () => {
        const nonce = 'fake-valid-nonce';
        const cart = [];
        const response = await request(server)
            .post('/api/v1/product/braintree/payment')
            .set('Authorization', `Bearer ${token}`)
            .send({ nonce, cart });
        console.log(response.status, response.body)
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Cart is empty, cannot process payment');
    });

    it('should not make payment with missing price in cart', async () => {
        const nonce = 'fake-valid-nonce';
        const cart = [{ name: 'Product 1', slug: 'product-1', description: 'Description 1', category: '60d21b4667d0d8992e610c85', quantity: 1 }];
        const response = await request(server)
            .post('/api/v1/product/braintree/payment')
            .set('Authorization', `Bearer ${token}`)
            .send({ nonce, cart });
        console.log(response.status, response.body)
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Price is missing in cart');
    });

    it('should not make payment with nonnumeric price in cart', async () => {
        const nonce = 'fake-valid-nonce';
        const cart = [{ price: 'abc', name: 'Product 1', slug: 'product-1', description: 'Description 1', category: '60d21b4667d0d8992e610c85', quantity: 1 }];
        const response = await request(server)
            .post('/api/v1/product/braintree/payment')
            .set('Authorization', `Bearer ${token}`)
            .send({ nonce, cart });
        console.log(response.status, response.body)
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Invalid price in cart, prices must be numeric');
    });

    it('should not make payment with negative price in cart', async () => {
        const nonce = 'fake-valid-nonce';
        const cart = [{ price: -100, name: 'Product 1', slug: 'product-1', description: 'Description 1', category: '60d21b4667d0d8992e610c85', quantity: 1 }];
        const response = await request(server)
            .post('/api/v1/product/braintree/payment')
            .set('Authorization', `Bearer ${token}`)
            .send({ nonce, cart });
        console.log(response.status, response.body)
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Invalid price in cart, prices must be non-negative');
    });

    it('should not make payment with invalid nonce/cart combination', async () => {
        const nonce = 'invalid-nonce';
        const cart = [{ price: 100, name: 'Product 1', slug: 'product-1', description: 'Description 1', category: '60d21b4667d0d8992e610c85', quantity: 1 }];
        const response = await request(server)
            .post('/api/v1/product/braintree/payment')
            .set('Authorization', `Bearer ${token}`)
            .send({ nonce, cart });
        console.log(response.status, response.body)
        expect(response.status).toBe(500);
    });
});
