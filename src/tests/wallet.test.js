const request = require('supertest');
const { randomUUID: uuidv4 } = require('crypto');
const app = require('../app');
const { initModels } = require('../database/models');
const sequelize = require('../config/database');

let authToken = '';

beforeAll(async () => {
  await initModels();
  const email = `wallet_test_${Date.now()}@fintech.com`;
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Wallet Tester',
      email,
      password: 'Password@123',
    });
  authToken = registerRes.body.data.token;
});

afterAll(async () => {
  await sequelize.close();
});

describe('Wallet & Idempotency Module', () => {
  it('should fetch initial zero balance', async () => {
    const res = await request(app)
      .get('/api/wallet/balance')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.availableBalance).toBe(0);
    expect(res.body.data.lockedBalance).toBe(0);
  });

  it('should successfully top up wallet balance', async () => {
    const idempotencyKey = uuidv4();
    const res = await request(app)
      .post('/api/wallet/topup')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({ amount: 500.0 });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.availableBalance).toBe(500.0);
  });

  it('should return cached response on duplicate Idempotency-Key without double-crediting', async () => {
    const idempotencyKey = uuidv4();

    const res1 = await request(app)
      .post('/api/wallet/topup')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({ amount: 200.0 });

    expect(res1.statusCode).toBe(200);
    expect(res1.body.data.availableBalance).toBe(700.0);

    const res2 = await request(app)
      .post('/api/wallet/topup')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({ amount: 200.0 });

    expect(res2.statusCode).toBe(200);
    expect(res2.body.data.availableBalance).toBe(700.0);

    const balanceRes = await request(app)
      .get('/api/wallet/balance')
      .set('Authorization', `Bearer ${authToken}`);
    expect(balanceRes.body.data.availableBalance).toBe(700.0);
  });

  it('should fetch paginated wallet statement with audit ledger entries', async () => {
    const res = await request(app)
      .get('/api/wallet/statement?page=1&limit=5')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.transactions.length).toBeGreaterThan(0);
    expect(res.body.data.transactions[0].entryType).toBe('CREDIT');
  });
});
