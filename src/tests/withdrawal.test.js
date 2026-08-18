const request = require('supertest');
const app = require('../app');
const { initModels } = require('../database/models');
const sequelize = require('../config/database');

let userToken = '';
let adminToken = '';
let withdrawalId = '';

beforeAll(async () => {
  await initModels();

  const userRes = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Withdrawal User',
      email: `with_user_${Date.now()}@fintech.com`,
      password: 'Password@123',
    });
  userToken = userRes.body.data.token;

  await request(app)
    .post('/api/wallet/topup')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ amount: 1000.0 });

  const adminRes = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Admin Tester',
      email: `admin_${Date.now()}@fintech.com`,
      password: 'Password@123',
      role: 'admin',
    });
  adminToken = adminRes.body.data.token;
});

afterAll(async () => {
  await sequelize.close();
});

describe('Withdrawal & Settlement Module', () => {
  it('should lock funds immediately upon withdrawal request (2-Phase Lock)', async () => {
    const res = await request(app)
      .post('/api/withdrawals')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ amount: 400.0 });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.availableBalance).toBe(600.0);
    expect(res.body.data.lockedBalance).toBe(400.0);

    withdrawalId = res.body.data.withdrawalId;
  });

  it('should list pending withdrawals for admin', async () => {
    const res = await request(app)
      .get('/api/admin/withdrawals/pending')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should allow admin to reject withdrawal and refund locked funds back to available balance', async () => {
    const res = await request(app)
      .post(`/api/admin/withdrawals/${withdrawalId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Compliance check failed' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('REJECTED');

    const balanceRes = await request(app)
      .get('/api/wallet/balance')
      .set('Authorization', `Bearer ${userToken}`);

    expect(balanceRes.body.data.availableBalance).toBe(1000.0);
    expect(balanceRes.body.data.lockedBalance).toBe(0.0);
  });
});
