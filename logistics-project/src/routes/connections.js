const express = require('express');
const { pool } = require('../db');
const graphStore = require('../graph/graphStore');

const router = express.Router();

// GET /api/connections
router.get('/', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT c.id, c.from_location_id, fl.name AS from_name,
            c.to_location_id, tl.name AS to_name, c.weight, c.bidirectional, c.created_at
     FROM connections c
     JOIN locations fl ON fl.id = c.from_location_id
     JOIN locations tl ON tl.id = c.to_location_id
     ORDER BY c.id DESC`
  );
  res.json(rows);
});

// POST /api/connections { fromId, toId, weight, bidirectional }
router.post('/', async (req, res) => {
  const fromId = Number(req.body.fromId);
  const toId = Number(req.body.toId);
  const weight = Number(req.body.weight);
  const bidirectional = !!req.body.bidirectional;

  if (!fromId || !toId) return res.status(400).json({ error: 'fromId and toId are required' });
  if (Number.isNaN(weight)) return res.status(400).json({ error: 'weight must be a number' });
  if (weight < 0) return res.status(400).json({ error: 'Negative edge weights are not allowed.' });

  try {
    const connection = await graphStore.createConnection({ fromId, toId, weight, bidirectional });
    res.status(201).json(connection);
  } catch (err) {
    if (['LOCATION_NOT_FOUND', 'DUPLICATE_CONNECTION', 'NEGATIVE_WEIGHT'].includes(err.code)) {
      return res.status(err.code === 'LOCATION_NOT_FOUND' ? 404 : 409).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/connections/:id
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const deleted = await graphStore.deleteConnection(id);
  if (!deleted) return res.status(404).json({ error: 'Connection not found' });
  res.json({ success: true });
});

module.exports = router;
