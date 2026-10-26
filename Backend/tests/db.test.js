jest.mock('pg', () => ({ Pool: jest.fn() }));
jest.mock('dotenv', () => ({ config: jest.fn() }));

const KEYS = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_SSL'];

function loadConfig(env) {
  jest.resetModules();
  KEYS.forEach(k => delete process.env[k]);
  Object.assign(process.env, env);
  const { Pool } = require('pg');
  require('../db');
  return Pool.mock.calls.at(-1)[0];
}

afterAll(() => KEYS.forEach(k => delete process.env[k]));

test('defaults to port 5432 with SSL for Render', () => {
  const config = loadConfig({ DB_HOST: 'db.example.com', DB_USER: 'u', DB_NAME: 'tasks' });
  expect(config).toMatchObject({ host: 'db.example.com', user: 'u', database: 'tasks', port: 5432, ssl: { rejectUnauthorized: false } });
});

test('DB_PORT and DB_SSL=false configure a local database', () => {
  const config = loadConfig({ DB_PORT: '6543', DB_SSL: 'false' });
  expect(config).toMatchObject({ port: 6543, ssl: false });
});
