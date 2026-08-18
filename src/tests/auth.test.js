const request = require('supertest');
const app = require('../app');
const { initModels } = require('../database/models');
const sequelize = require('../config/database');

beforeAll(async () => {
  await initModels();
});

afterAll(async () => {
  await sequelize.close();
});

describe('Authentication Module', () => {
  const testUser = {
    name: 'Test User',
    email: `test_${Date.now()}@fintech.com`,
    password: 'Password@123',
  };

  let authToken = '';

  it('should successfully register a new user and create an associated wallet', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.wallet.availableBalance).toBe(0);
    expect(res.body.data.token).toBeDefined();
  });

  it('should reject registration with an existing email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should successfully log in and return a JWT token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    authToken = res.body.data.token;
  });

  it('should access protected profile route with valid JWT', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(testUser.email);
  });

  it('should reject access with missing or invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', 'Bearer invalid_token_123');

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
