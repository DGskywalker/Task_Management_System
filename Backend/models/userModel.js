const db = require('../db');

async function createUser(name, email, hashedPassword) {
  const result = await db.query(
    'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
    [name, email, hashedPassword]
  );
  return result.rows[0];
}

// Emails are stored lowercase; LOWER() also matches accounts created before that.
async function findUserByEmail(email) {
  const result = await db.query(
    'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
    [email]
  );
  return result.rows[0];
}

module.exports = {
  createUser,
  findUserByEmail
};
