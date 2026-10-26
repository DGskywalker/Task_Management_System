const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { validate, validateTaskCreate, validateTaskEdit, validateStatus } = require('../middleware/validate');

// Every task route needs a valid token. The user always comes from the token,
// never from the request, and every query is scoped with "AND user_id = $n".
router.use(requireAuth);

router.param('taskId', (req, res, next, value) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: 'Invalid task id' });
  }
  req.taskId = id;
  next();
});

// Get all tasks for the signed-in user
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC, id DESC',
      [req.user.id]
    );
    res.status(200).json({ tasks: result.rows });
  } catch (err) {
    console.error('Error fetching tasks:', err.message);
    res.status(500).json({ message: 'Server error while fetching tasks' });
  }
});

// Add new task
router.post('/', validate(validateTaskCreate), async (req, res) => {
  const { title, description, deadline, priority, status, notes, category } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO tasks (user_id, title, description, deadline, priority, status, notes, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [req.user.id, title, description, deadline, priority, status, notes, category]
    );
    res.status(201).json({ message: 'Task added successfully', task: result.rows[0] });
  } catch (err) {
    console.error('Error adding task:', err.message);
    res.status(500).json({ message: 'Server error while adding task' });
  }
});

// Get one task
router.get('/:taskId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [req.taskId, req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Task not found' });
    res.status(200).json({ task: result.rows[0] });
  } catch (err) {
    console.error('Error fetching task:', err.message);
    res.status(500).json({ message: 'Server error while fetching task' });
  }
});

// Edit task details (title, description, deadline, priority, category, notes)
router.put('/:taskId', validate(validateTaskEdit), async (req, res) => {
  const fields = Object.keys(req.body);
  const assignments = fields.map((field, i) => `${field} = $${i + 1}`);
  const values = fields.map(field => req.body[field]);

  try {
    const result = await pool.query(
      `UPDATE tasks SET ${assignments.join(', ')}
       WHERE id = $${fields.length + 1} AND user_id = $${fields.length + 2}
       RETURNING *`,
      [...values, req.taskId, req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Task not found' });
    res.status(200).json({ message: 'Task updated', task: result.rows[0] });
  } catch (err) {
    console.error('Error updating task:', err.message);
    res.status(500).json({ message: 'Server error while updating task' });
  }
});

// Update task status
router.put('/:taskId/status', validate(validateStatus), async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE tasks SET status = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [req.body.status, req.taskId, req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Task not found' });
    res.status(200).json({ message: 'Status updated', task: result.rows[0] });
  } catch (err) {
    console.error('Error updating task status:', err.message);
    res.status(500).json({ message: 'Server error while updating status' });
  }
});

// Delete task
router.delete('/:taskId', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.taskId, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Task not found or already deleted' });
    }
    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (err) {
    console.error('Error deleting task:', err.message);
    res.status(500).json({ message: 'Server error while deleting task' });
  }
});

module.exports = router;
