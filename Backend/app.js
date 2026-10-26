const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/auth');
const passwordResetRoutes = require('./routes/passwordReset');
const taskRoutes = require('./routes/tasks');

const WINDOW_MS = 15 * 60 * 1000;

function limiter(limit, message) {
  return rateLimit({
    windowMs: WINDOW_MS,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message }
  });
}

// Comma-separated list of allowed origins. When empty, only the same origin
// (the frontend served by this app) can call the API.
function corsOptions() {
  const origins = (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
  return { origin: origins.length ? origins : false };
}

function createApp({ apiLimit, authLimit } = {}) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set');
  }

  const app = express();
  app.set('trust proxy', 1); // Render and Docker put one proxy in front of the app

  app.use(helmet());
  app.use(cors(corsOptions()));
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

  const strict = limiter(authLimit ?? (Number(process.env.AUTH_RATE_LIMIT) || 20), 'Too many attempts, please try again later');
  app.use('/api', limiter(apiLimit ?? (Number(process.env.API_RATE_LIMIT) || 300), 'Too many requests, please try again later'));
  app.use('/api/auth', strict, authRoutes);
  app.use('/api/password', strict, passwordResetRoutes);
  app.use('/api/tasks', taskRoutes);

  app.use('/api', (req, res) => res.status(404).json({ message: 'Not found' }));

  // Serve frontend static files
  app.use(express.static(path.resolve(__dirname, '../Frontend')));

  // Malformed JSON and other unhandled errors
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ message: 'Invalid JSON body' });
    }
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ message: 'Request body too large' });
    }
    console.error('Unhandled error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
