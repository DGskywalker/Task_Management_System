const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../Frontend')));

// ROUTES
const authRoutes = require('./routes/auth');
const passwordResetRoutes = require('./routes/passwordReset');

// Attach routes
app.use('/api/auth', authRoutes);
app.use('/api/password', passwordResetRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
const taskRoutes = require('./routes/tasks');
app.use('/api/tasks', taskRoutes);
