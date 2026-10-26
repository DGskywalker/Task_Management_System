// db.js
const { Pool } = require('pg');
require('dotenv').config();

// SSL is on by default because Render's managed Postgres requires it.
// Set DB_SSL=false for a local or Docker database.
const useSsl = process.env.DB_SSL !== 'false';

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 5432,
  ssl: useSsl ? { rejectUnauthorized: false } : false
});

module.exports = pool;
