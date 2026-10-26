jest.mock('nodemailer', () => {
  const sendMail = jest.fn().mockResolvedValue({});
  return { createTransport: jest.fn(() => ({ sendMail })), sendMail };
});

const LINK = 'https://tasks.example.com/reset.html?token=abc';
const SMTP_KEYS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];

let mailer;
let nodemailer;
beforeEach(() => {
  jest.resetModules();
  SMTP_KEYS.forEach(k => delete process.env[k]);
  process.env.NODE_ENV = 'test';
  nodemailer = require('nodemailer');
  mailer = require('../utils/mailer');
});
afterEach(() => jest.restoreAllMocks());

test('without SMTP, logs the link to the console outside production', async () => {
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  expect(await mailer.sendPasswordResetEmail('a@b.co', LINK)).toBe(false);
  expect(log).toHaveBeenCalledWith(expect.stringContaining(LINK));
  expect(nodemailer.sendMail).not.toHaveBeenCalled();
});

test('without SMTP in production, never logs the link', async () => {
  process.env.NODE_ENV = 'production';
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  expect(await mailer.sendPasswordResetEmail('a@b.co', LINK)).toBe(false);
  expect(log).not.toHaveBeenCalled();
  expect(warn.mock.calls.flat().join(' ')).not.toContain(LINK);
});

test('with SMTP, sends the email through nodemailer', async () => {
  Object.assign(process.env, { SMTP_HOST: 'smtp.example.com', SMTP_PORT: '465', SMTP_USER: 'bot@example.com', SMTP_PASS: 'pw' });
  expect(mailer.isConfigured()).toBe(true);
  expect(await mailer.sendPasswordResetEmail('a@b.co', LINK)).toBe(true);

  expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({ host: 'smtp.example.com', port: 465, secure: true }));
  expect(nodemailer.sendMail).toHaveBeenCalledWith(expect.objectContaining({ from: 'bot@example.com', to: 'a@b.co', text: expect.stringContaining(LINK) }));
});
