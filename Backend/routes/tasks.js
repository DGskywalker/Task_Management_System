const express = require('express');
const router = express.Router();
const pool = require('../db');

// ✅ Add New Task
router.post('/new', async (req, res) => {
  const {
    userId,
    title,
    description,
    deadline,
    priority,
    status = 'Not Started',
    notes = '',
    category
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO tasks (user_id, title, description, deadline, priority, status, notes, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [userId, title, description, deadline, priority, status, notes, category]
    );

    res.status(201).json({ message: 'Task added successfully', task: result.rows[0] });
  } catch (err) {
    console.error('❌ Error adding task:', err.stack);
    res.status(500).json({ message: 'Server error while adding task' });
  }
});

// ✅ Get All Tasks for a User
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    res.status(200).json({ tasks: result.rows });
  } catch (err) {
    console.error('❌ Error fetching tasks:', err.stack);
    res.status(500).json({ message: 'Server error while fetching tasks' });
  }
});

// ✅ Delete Task by ID
router.delete('/:taskId', async (req, res) => {
  const { taskId } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM tasks WHERE id = $1 RETURNING *`,
      [taskId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Task not found or already deleted' });
    }

    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting task:', err.stack);
    res.status(500).json({ message: 'Server error while deleting task' });
  }
});

// ✅ Update Task Status
router.put('/:taskId/status', async (req, res) => {
  const { taskId } = req.params;
  const { status } = req.body;

  try {
    const result = await pool.query(
      `UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *`,
      [status, taskId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.status(200).json({ message: 'Status updated', task: result.rows[0] });
  } catch (err) {
    console.error('❌ Error updating task status:', err.stack);
    res.status(500).json({ message: 'Server error while updating status' });
  }
});

module.exports = router;
