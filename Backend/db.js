// db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 5432, // Hardcoded because Render always uses this
  ssl: {
    rejectUnauthorized: false // Required for Render's managed Postgres
  }
});

module.exports = pool;
