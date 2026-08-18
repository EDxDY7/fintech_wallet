const request = require('supertest');
const app = require('../app');
const { initModels, Product } = require('../database/models');
const sequelize = require('../config/database');

let authToken = '';
let testProduct = null;

beforeAll(async () => {
  await initModels();

  const userRes = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Order Tester',
      email: `order_test_${Date.now()}@fintech.com`,
      password: 'Password@123',
    });
  authToken = userRes.body.data.token;

  await request(app)
    .post('/api/wallet/topup')
    .set('Authorization', `Bearer ${authToken}`)
    .send({ amount: 1000.0 });

  testProduct = await Product.create({
    name: 'Wireless Keyboard',
    price: 150.0,
    inventoryQuantity: 5,
  });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Orders & Inventory Module', () => {
  it('should successfully list catalog products', async () => {
    const res = await request(app).get('/api/products');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should create an order, deduct wallet balance and reduce inventory atomically', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        items: [{ productId: testProduct.id, quantity: 2 }],
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.totalAmount).toBe(300.0);
    expect(res.body.data.status).toBe('PAID');

    const updatedProduct = await Product.findByPk(testProduct.id);
    expect(updatedProduct.inventoryQuantity).toBe(3);
  });

  it('should reject order if requested quantity exceeds available inventory', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        items: [{ productId: testProduct.id, quantity: 10 }],
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error.message).toContain('Insufficient stock');
  });

  it('should reject order if user has insufficient wallet balance', async () => {
    const luxuryProduct = await Product.create({
      name: 'Luxury Laptop',
      price: 50000.0,
      inventoryQuantity: 2,
    });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        items: [{ productId: luxuryProduct.id, quantity: 1 }],
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error.message).toContain('Insufficient wallet balance');
  });

  it('should cancel paid order, restock inventory, and refund wallet balance with ledger audit', async () => {
    // 1. Create an order
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        items: [{ productId: testProduct.id, quantity: 1 }],
      });

    expect(orderRes.statusCode).toBe(201);
    const orderId = orderRes.body.data.orderId;
    const preCancelBalance = orderRes.body.data.availableBalance;

    // 2. Cancel and refund
    const cancelRes = await request(app)
      .post(`/api/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ reason: 'Customer requested refund' });

    expect(cancelRes.statusCode).toBe(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');
    expect(cancelRes.body.data.refundedAmount).toBe(150.0);
    expect(cancelRes.body.data.availableBalance).toBe(preCancelBalance + 150.0);

    // 3. Verify product restocked
    const updatedProduct = await Product.findByPk(testProduct.id);
    expect(updatedProduct.inventoryQuantity).toBe(3);
  });
});
