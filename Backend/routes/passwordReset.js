const express = require('express');
const router = express.Router();
const pool = require('../db');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { findUserByEmail } = require('../models/userModel');
const { sendPasswordResetEmail } = require('../utils/mailer');
const { validate, validateForgotPassword, validateResetPassword } = require('../middleware/validate');

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const GENERIC_RESPONSE = { message: 'If an account exists for that email, a password reset link has been sent.' };

// Only a SHA-256 hash of the token is stored, so a database leak does not expose usable links.
const hashToken = token => crypto.createHash('sha256').update(token).digest('hex');

function appUrl() {
  return (process.env.APP_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/+$/, '');
}

// Step 1: Generate a token and email the link. The response is the same
// whether or not the email belongs to an account.
router.post('/forgot-password', validate(validateForgotPassword), async (req, res) => {
  const { email } = req.body;
  try {
    const user = await findUserByEmail(email);
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + RESET_TTL_MS);
      await pool.query(
        'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
        [hashToken(token), expires, user.id]
      );
      await sendPasswordResetEmail(user.email, `${appUrl()}/reset.html?token=${token}`);
    }
  } catch (err) {
    console.error('Forgot password error:', err.message);
  }
  res.status(200).json(GENERIC_RESPONSE);
});

// Step 2: Set a new password with a valid, unexpired token.
router.post('/reset-password/:token', validate(validateResetPassword), async (req, res) => {
  const { password } = req.body;
  try {
    const result = await pool.query(
      'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
      [hashToken(req.params.token)]
    );
    if (result.rowCount === 0) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    const hashed = await bcrypt.hash(password, 10);
    await pool.query(
      'UPDATE users SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [hashed, result.rows[0].id]
    );

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ message: 'Error resetting password' });
  }
});

module.exports = router;
