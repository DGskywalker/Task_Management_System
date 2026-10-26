const request = require('supertest');
const { createApp } = require('../app');

function makeApp(options) {
  return createApp({ apiLimit: 10000, authLimit: 10000, ...options });
}

async function signupAndLogin(app, { name = 'Alice', email = 'alice@example.com', password = 'password123' } = {}) {
  await request(app).post('/api/auth/signup').send({ name, email, password }).expect(201);
  const res = await request(app).post('/api/auth/login').send({ email, password }).expect(200);
  return { token: res.body.token, userId: res.body.userId };
}

const auth = token => ({ Authorization: `Bearer ${token}` });

const sampleTask = (overrides = {}) => ({
  title: 'Write report',
  description: 'Quarterly summary',
  deadline: '2026-12-01',
  priority: 'High',
  status: 'Not Started',
  notes: 'Use last year as template',
  category: 'Docs',
  ...overrides
});

module.exports = { makeApp, signupAndLogin, auth, sampleTask };
