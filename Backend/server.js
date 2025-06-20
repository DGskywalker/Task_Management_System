const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ Serve static frontend files (ensure this path is correct on Render)
app.use(express.static(path.join(__dirname, '../Frontend')));

// ✅ Import routes
const authRoutes = require('./routes/auth');
const passwordResetRoutes = require('./routes/passwordReset');
const taskRoutes = require('./routes/tasks');

// ✅ Attach routes
app.use('/api/auth', authRoutes);
app.use('/api/password', passwordResetRoutes);
app.use('/api/tasks', taskRoutes);

// ✅ Catch-all for frontend routing (for SPA deployments if needed)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../Frontend', 'index.html'));
});

// ✅ Start the server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
