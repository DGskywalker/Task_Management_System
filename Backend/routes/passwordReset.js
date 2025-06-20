const express = require('express');
const router = express.Router();
const pool = require('../db');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

// Step 1: Handle email input and send token
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour

    const result = await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3 RETURNING *',
      [token, expires, email]
    );

    if (result.rowCount === 0) return res.status(404).send('User not found');

    // TEMP: just show reset link in response (replace with email later)
    const resetLink = `http://localhost:5000/reset-password/${token}`;
    res.send(`Reset link: ${resetLink}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error sending reset link');
  }
});

// Step 2: Handle new password submission
router.post('/reset-password/:token', async (req, res) => {
  const { password } = req.body;
  const token = req.params.token;
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
      [token]
    );
    if (result.rowCount === 0) return res.status(400).send('Invalid or expired token');

    const hashed = await bcrypt.hash(password, 10);
    await pool.query(
      `UPDATE users SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE reset_token = $2`,
      [hashed, token]
    );

    res.send('Password updated successfully');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error resetting password');
  }
});

module.exports = router;
