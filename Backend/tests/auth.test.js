jest.mock('../db', () => require('./fakeDb').createFakePool());

const request = require('supertest');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { makeApp } = require('./helpers');

const app = makeApp();
beforeEach(() => pool.mockReset());

describe('POST /api/auth/signup', () => {
  test('creates a user, lowercases the email and never returns the password', async () => {
    const res = await request(app).post('/api/auth/signup')
      .send({ name: '  Alice ', email: 'Alice@Example.COM', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.user).toEqual({ id: expect.any(Number), name: 'Alice', email: 'alice@example.com' });

    const row = (await pool.query('SELECT password FROM users')).rows[0];
    expect(row.password).not.toBe('password123');
    expect(row.password).toMatch(/^\$2[aby]\$10\$/);
  });

  test('rejects a duplicate email regardless of case', async () => {
    await request(app).post('/api/auth/signup').send({ name: 'A', email: 'a@x.com', password: 'password123' }).expect(201);
    const res = await request(app).post('/api/auth/signup').send({ name: 'B', email: 'A@X.com', password: 'password123' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('User already exists');
  });

  test.each([
    [{ email: 'a@x.com', password: 'password123' }, 'name is required'],
    [{ name: 'A', email: 'not-an-email', password: 'password123' }, 'a valid email is required'],
    [{ name: 'A', email: 'a@x.com', password: 'short' }, 'password must be at least 8 characters'],
    [{ name: 'A', email: 'a@x.com', password: 'x'.repeat(73) }, 'password must be at most 72 characters'],
    [{ name: 'x'.repeat(101), email: 'a@x.com', password: 'password123' }, 'name must be at most 100 characters'],
    [{ name: 42, email: 'a@x.com', password: 'password123' }, 'name must be a string']
  ])('validates input %#', async (body, error) => {
    const res = await request(app).post('/api/auth/signup').send(body);
    expect(res.status).toBe(400);
    expect(res.body.errors).toContain(error);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/signup').send({ name: 'Alice', email: 'alice@example.com', password: 'password123' });
  });

  test('returns a signed JWT that expires in one day', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'ALICE@example.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ userName: 'Alice', email: 'alice@example.com', expiresIn: '1d' });

    const payload = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(Number(payload.sub)).toBe(res.body.userId);
    expect(payload.exp - payload.iat).toBe(24 * 60 * 60);
  });

  test('rejects a wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'alice@example.com', password: 'wrongpass1' });
    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });

  test('rejects an unknown email with the same message', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'password123' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  test('validates input', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'alice@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toContain('password is required');
  });

  test('accepts an existing short password so older accounts can still log in', async () => {
    const bcrypt = require('bcrypt');
    await pool.query('INSERT INTO users (name, email, password) VALUES ($1, $2, $3)', ['Old', 'old@example.com', await bcrypt.hash('abc', 10)]);
    await request(app).post('/api/auth/login').send({ email: 'old@example.com', password: 'abc' }).expect(200);
  });
});

test('malformed JSON returns 400', async () => {
  const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');
  expect(res.status).toBe(400);
  expect(res.body.message).toBe('Invalid JSON body');
});
