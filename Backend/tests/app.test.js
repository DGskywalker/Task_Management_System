jest.mock('../db', () => require('./fakeDb').createFakePool());

const request = require('supertest');
const pool = require('../db');
const { createApp } = require('../app');
const { makeApp } = require('./helpers');

beforeEach(() => pool.mockReset());

test('GET /health', async () => {
  const res = await request(makeApp()).get('/health');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ status: 'ok' });
});

test('refuses to start without JWT_SECRET', () => {
  const secret = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;
  try {
    expect(() => createApp()).toThrow('JWT_SECRET must be set');
  } finally {
    process.env.JWT_SECRET = secret;
  }
});

test('sets security headers with helmet', async () => {
  const res = await request(makeApp()).get('/health');
  expect(res.headers['x-content-type-options']).toBe('nosniff');
  expect(res.headers['content-security-policy']).toContain("default-src 'self'");
  expect(res.headers['x-powered-by']).toBeUndefined();
});

test('serves the frontend and returns JSON 404 for unknown API routes', async () => {
  const app = makeApp();
  const page = await request(app).get('/');
  expect(page.status).toBe(200);
  expect(page.text).toContain('login-form');

  const missing = await request(app).get('/api/nope');
  expect(missing.status).toBe(404);
  expect(missing.body.message).toBe('Not found');
});

test('rejects oversized request bodies', async () => {
  const res = await request(makeApp()).post('/api/auth/login').send({ email: 'a@b.co', password: 'x'.repeat(200 * 1024) });
  expect(res.status).toBe(413);
});

describe('CORS', () => {
  afterEach(() => { delete process.env.CORS_ORIGINS; });

  test('blocks cross-origin requests when CORS_ORIGINS is not set', async () => {
    const res = await request(makeApp()).get('/health').set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('allows only the configured origins', async () => {
    process.env.CORS_ORIGINS = 'https://app.example.com, https://admin.example.com';
    const app = makeApp();
    const ok = await request(app).get('/health').set('Origin', 'https://admin.example.com');
    expect(ok.headers['access-control-allow-origin']).toBe('https://admin.example.com');
    const blocked = await request(app).get('/health').set('Origin', 'https://evil.example');
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('rate limiting', () => {
  test('limits login attempts', async () => {
    const app = makeApp({ authLimit: 3 });
    const attempt = () => request(app).post('/api/auth/login').send({ email: 'a@b.co', password: 'password123' });
    for (let i = 0; i < 3; i++) expect((await attempt()).status).toBe(401);
    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toBe('Too many attempts, please try again later');
    expect(blocked.headers['retry-after']).toBeDefined();
  });

  test('applies the strict limit to password reset too', async () => {
    const app = makeApp({ authLimit: 2 });
    const attempt = () => request(app).post('/api/password/forgot-password').send({ email: 'a@b.co' });
    await attempt();
    await attempt();
    expect((await attempt()).status).toBe(429);
  });

  test('applies a general limit to the rest of the API', async () => {
    const app = makeApp({ apiLimit: 2 });
    await request(app).get('/api/tasks');
    await request(app).get('/api/tasks');
    expect((await request(app).get('/api/tasks')).status).toBe(429);
  });

  test('uses defaults from the environment', async () => {
    process.env.AUTH_RATE_LIMIT = '1';
    try {
      const app = createApp();
      await request(app).post('/api/auth/login').send({});
      expect((await request(app).post('/api/auth/login').send({})).status).toBe(429);
    } finally {
      delete process.env.AUTH_RATE_LIMIT;
    }
  });
});
