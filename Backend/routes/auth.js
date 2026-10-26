const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { createUser, findUserByEmail } = require('../models/userModel');
const { signToken, TOKEN_TTL } = require('../middleware/auth');
const { validate, validateSignup, validateLogin } = require('../middleware/validate');

// SIGNUP ROUTE
router.post('/signup', validate(validateSignup), async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (await findUserByEmail(email)) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUser(name, email, hashedPassword);

    res.status(201).json({ message: 'Signup successful', user });
  } catch (err) {
    console.error('Signup error:', err.message);
    res.status(500).json({ message: 'Server error during signup' });
  }
});

// LOGIN ROUTE
router.post('/login', validate(validateLogin), async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await findUserByEmail(email);
    const isMatch = user && user.password ? await bcrypt.compare(password, user.password) : false;

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.status(200).json({
      message: 'Login successful',
      token: signToken(user),
      expiresIn: TOKEN_TTL,
      userId: user.id,
      userName: user.name,
      email: user.email
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Server error during login' });
  }
});

module.exports = router;
