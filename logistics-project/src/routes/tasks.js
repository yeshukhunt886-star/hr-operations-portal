const express = require('express');
const { pool } = require('../db');
const { orderTasksByPriority, isValidPriority } = require('../queue/TaskPriorityQueue');
const router = express.Router();

// GET /api/tasks -> pending tasks ordered by priority queue (most urgent first)
router.get('/', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT t.id, t.location_id, l.name AS location_name, t.description, t.priority,
            t.deadline, t.status, t.created_at
     FROM delivery_tasks t
     JOIN locations l ON l.id = t.location_id
     WHERE t.status = 'pending'`
  );
  res.json(orderTasksByPriority(rows));
});

// POST /api/tasks { locationId, description, priority, deadline }
router.post('/', async (req, res) => {
  const locationId = Number(req.body.locationId);
  const priority = Number(req.body.priority);
  const description = req.body.description || null;
  const deadline = req.body.deadline || null;
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  if (!isValidPriority(priority)) {
    return res.status(400).json({ error: 'priority must be an integer between 1 and 10' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO delivery_tasks (location_id, description, priority, deadline) VALUES (?, ?, ?, ?)',
      [locationId, description, priority, deadline]
    );
    res.status(201).json({ id: result.insertId, locationId, description, priority, deadline, status: 'pending' });
  } catch (err) {
    if (err.code === 'ER_NO_REFERENCED_ROW_2') return res.status(404).json({ error: 'Location not found' });
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tasks/:id/status { status }
router.patch('/:id/status', async (req, res) => {
  const id = Number(req.params.id);
  const status = req.body.status;
  if (!['pending', 'in_progress', 'done', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'invalid status' });
  }
  const [result] = await pool.query('UPDATE delivery_tasks SET status = ? WHERE id = ?', [status, id]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Task not found' });
  res.json({ success: true });
});

module.exports = router;
