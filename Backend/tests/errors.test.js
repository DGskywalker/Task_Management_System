// Database failures return a 500 with a generic message instead of crashing.
jest.mock('../db', () => require('./fakeDb').createFakePool());

const request = require('supertest');
const pool = require('../db');
const { makeApp, signupAndLogin, auth, sampleTask } = require('./helpers');

const app = makeApp();
let token;

beforeAll(async () => {
  pool.mockReset();
  ({ token } = await signupAndLogin(app));
});
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(pool, 'query').mockRejectedValueOnce(new Error('connection lost'));
});
afterEach(() => jest.restoreAllMocks());

test.each([
  ['signup', () => request(app).post('/api/auth/signup').send({ name: 'Z', email: 'z@x.com', password: 'password123' }), 'Server error during signup'],
  ['login', () => request(app).post('/api/auth/login').send({ email: 'z@x.com', password: 'password123' }), 'Server error during login'],
  ['list tasks', () => request(app).get('/api/tasks').set(auth(token)), 'Server error while fetching tasks'],
  ['create task', () => request(app).post('/api/tasks').set(auth(token)).send(sampleTask()), 'Server error while adding task'],
  ['get task', () => request(app).get('/api/tasks/1').set(auth(token)), 'Server error while fetching task'],
  ['edit task', () => request(app).put('/api/tasks/1').set(auth(token)).send({ title: 'x' }), 'Server error while updating task'],
  ['update status', () => request(app).put('/api/tasks/1/status').set(auth(token)).send({ status: 'Completed' }), 'Server error while updating status'],
  ['delete task', () => request(app).delete('/api/tasks/1').set(auth(token)), 'Server error while deleting task'],
  ['reset password', () => request(app).post('/api/password/reset-password/abc').send({ password: 'password123' }), 'Error resetting password']
])('%s', async (_, call, message) => {
  const res = await call();
  expect(res.status).toBe(500);
  expect(res.body.message).toBe(message);
});
