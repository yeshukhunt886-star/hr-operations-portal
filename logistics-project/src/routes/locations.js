const express = require('express');
const { pool } = require('../db');
const graphStore = require('../graph/graphStore');

const router = express.Router();

// GET /api/locations
router.get('/', async (req, res) => {
  const [rows] = await pool.query('SELECT id, name, created_at FROM locations ORDER BY name');
  res.json(rows);
});

// POST /api/locations { name }
router.post('/', async (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const location = await graphStore.createLocation(name);
    res.status(201).json(location);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: `Location "${name}" already exists.` });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/locations/:id
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const deleted = await graphStore.deleteLocation(id);
    if (!deleted) return res.status(404).json({ error: 'Location not found' });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'LOCATION_IN_USE') return res.status(409).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;
