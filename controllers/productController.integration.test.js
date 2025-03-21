import request from 'supertest';
import app from '../server.js';
import userModel from '../models/userModel.js';
import orderModel from '../models/orderModel.js';

let server;

beforeAll((done) => {
    server = app.listen(0, done);
});

afterAll((done) => {
    server.close(() => {
        done();
    });
});

// Clear the database before each test
beforeEach(async () => {
    await userModel.deleteMany({});
    await orderModel.deleteMany({});
});

describe('Braintree Token Creation', () => {
    it('should generate a client token', async () => {
        const response = await request(server)
            .get('/api/v1/product/braintree/token');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('clientToken');
    });
});

// describe('Payment Flow', () => {

//     let token;

//     beforeEach(async () => {
//         // Register and login a user to test payment
//         const response = await request(app)
//             .get('api/v1/product/braintree/token');
//         token = response.body.token;
//     });

//     it('should make payment with valid nonce and cart', async () => {
//         const nonce = 'fake-valid-nonce'; // Replace with a valid nonce for real tests
//         const cart = [{ price: 100 }, { price: 200 }];
//         const response = await request(app)
//             .post('/api/v1/product/braintree/payment')
//             .set('Authorization', `Bearer ${token}`)
//             .send({ nonce, cart });
//         console.log(response.status, response.body)
//         expect(response.status).toBe(200);
//         expect(response.body.ok).toBe(true);
//     });

//     it('should not make payment with invalid nonce', async () => {
//         const nonce = 'invalid-nonce';
//         const cart = [{ price: 100 }];
//         const response = await request(app)
//             .post('/api/v1/product/braintree/payment')
//             .set('Authorization', `Bearer ${token}`)
//             .send({ nonce, cart });
//         expect(response.status).toBe(500);
//         expect(response.body.message).toBe('Payment processing failed');
//     });

//     it('should not make payment with empty cart', async () => {
//         const nonce = 'fake-valid-nonce';
//         const cart = [];
//         const response = await request(app)
//             .post('/api/v1/product/braintree/payment')
//             .set('Authorization', `Bearer ${token}`)
//             .send({ nonce, cart });
//         console.log(response.status, response.body)
//         expect(response.status).toBe(400);
//         expect(response.body.message).toBe('Cart is empty, cannot process payment');
//     });

//     it('should not make payment with missing price in cart', async () => {
//         const nonce = 'fake-valid-nonce';
//         const cart = [{}];
//         const response = await request(app)
//             .post('/api/v1/product/braintree/payment')
//             .set('Authorization', `Bearer ${token}`)
//             .send({ nonce, cart });
//         console.log(response.status, response.body)
//         expect(response.status).toBe(400);
//         expect(response.body.message).toBe('Price is missing in cart');
//     });

//     it('should not make payment with nonnumeric price in cart', async () => {
//         const nonce = 'fake-valid-nonce';
//         const cart = [{ price: 'abc' }];
//         const response = await request(app)
//             .post('/api/v1/product/braintree/payment')
//             .set('Authorization', `Bearer ${token}`)
//             .send({ nonce, cart });
//         console.log(response.status, response.body)
//         expect(response.status).toBe(400);
//         expect(response.body.message).toBe('Invalid price in cart, prices must be numeric');
//     });

//     it('should not make payment with negative price in cart', async () => {
//         const nonce = 'fake-valid-nonce';
//         const cart = [{ price: -100 }];
//         const response = await request(app)
//             .post('/api/v1/product/braintree/payment')
//             .set('Authorization', `Bearer ${token}`)
//             .send({ nonce, cart });
//         console.log(response.status, response.body)
//         expect(response.status).toBe(400);
//         expect(response.body.message).toBe('Invalid price in cart, prices must be non-negative');
//     });

//     it('should not make payment with invalid nonce/cart combination', async () => {
//         const nonce = 'invalid-nonce';
//         const cart = [{ price: 100 }];
//         const response = await request(app)
//             .post('/api/v1/product/braintree/payment')
//             .set('Authorization', `Bearer ${token}`)
//             .send({ nonce, cart });
//         console.log(response.status, response.body)
//         expect(response.status).toBe(500);
//         expect(response.body.message).toBe('Payment processing failed');
//     });
// });
