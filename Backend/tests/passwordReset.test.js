jest.mock('../db', () => require('./fakeDb').createFakePool());
jest.mock('../utils/mailer', () => ({ sendPasswordResetEmail: jest.fn().mockResolvedValue(true) }));

const crypto = require('crypto');
const request = require('supertest');
const pool = require('../db');
const { sendPasswordResetEmail } = require('../utils/mailer');
const { makeApp, signupAndLogin } = require('./helpers');

const app = makeApp();
const GENERIC = 'If an account exists for that email, a password reset link has been sent.';

beforeEach(async () => {
  pool.mockReset();
  sendPasswordResetEmail.mockClear();
  process.env.APP_URL = 'https://tasks.example.com/';
  await signupAndLogin(app, { email: 'alice@example.com', password: 'password123' });
});
afterAll(() => { delete process.env.APP_URL; });

async function requestReset(email = 'alice@example.com') {
  const res = await request(app).post('/api/password/forgot-password').send({ email });
  const link = sendPasswordResetEmail.mock.calls.at(-1)?.[1];
  return { res, token: link && new URL(link).searchParams.get('token'), link };
}

test('emails a link and stores only a SHA-256 hash of the token', async () => {
  const { res, token, link } = await requestReset('ALICE@example.com');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ message: GENERIC });
  expect(JSON.stringify(res.body)).not.toContain(token);

  expect(sendPasswordResetEmail).toHaveBeenCalledWith('alice@example.com', expect.any(String));
  expect(link).toBe(`https://tasks.example.com/reset.html?token=${token}`);
  expect(token).toMatch(/^[0-9a-f]{64}$/);

  const row = (await pool.query('SELECT reset_token, reset_token_expires FROM users')).rows[0];
  expect(row.reset_token).toBe(crypto.createHash('sha256').update(token).digest('hex'));
  const minutesLeft = (new Date(row.reset_token_expires) - Date.now()) / 60000;
  expect(minutesLeft).toBeGreaterThan(59);
  expect(minutesLeft).toBeLessThanOrEqual(60);
});

test('gives the same response for an unknown email and sends nothing', async () => {
  const { res } = await requestReset('nobody@example.com');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ message: GENERIC });
  expect(sendPasswordResetEmail).not.toHaveBeenCalled();
});

test('still gives the generic response if sending the email fails', async () => {
  sendPasswordResetEmail.mockRejectedValueOnce(new Error('SMTP down'));
  jest.spyOn(console, 'error').mockImplementation(() => {});
  const { res } = await requestReset();
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ message: GENERIC });
});

test('resets the password once, then the token stops working', async () => {
  const { token } = await requestReset();
  const reset = await request(app).post(`/api/password/reset-password/${token}`).send({ password: 'newpassword1' });
  expect(reset.status).toBe(200);

  await request(app).post('/api/auth/login').send({ email: 'alice@example.com', password: 'password123' }).expect(401);
  await request(app).post('/api/auth/login').send({ email: 'alice@example.com', password: 'newpassword1' }).expect(200);

  const again = await request(app).post(`/api/password/reset-password/${token}`).send({ password: 'another-pass1' });
  expect(again.status).toBe(400);
});

test('rejects expired, unknown and raw-hash tokens', async () => {
  const { token } = await requestReset();
  const hash = (await pool.query('SELECT reset_token FROM users')).rows[0].reset_token;

  await request(app).post(`/api/password/reset-password/${hash}`).send({ password: 'newpassword1' }).expect(400);
  await request(app).post('/api/password/reset-password/deadbeef').send({ password: 'newpassword1' }).expect(400);

  await pool.query("UPDATE users SET reset_token_expires = NOW() - INTERVAL '1 minute'");
  const res = await request(app).post(`/api/password/reset-password/${token}`).send({ password: 'newpassword1' });
  expect(res.status).toBe(400);
  expect(res.body.message).toBe('Invalid or expired token');
});

test('validates the email and the new password', async () => {
  const bad = await request(app).post('/api/password/forgot-password').send({ email: 'nope' });
  expect(bad.status).toBe(400);

  const { token } = await requestReset();
  const short = await request(app).post(`/api/password/reset-password/${token}`).send({ password: 'short' });
  expect(short.status).toBe(400);
  expect(short.body.errors).toContain('password must be at least 8 characters');
});

test('falls back to localhost when APP_URL is not set', async () => {
  delete process.env.APP_URL;
  const { link } = await requestReset();
  expect(link).toMatch(/^http:\/\/localhost:5000\/reset\.html\?token=[0-9a-f]{64}$/);
});
