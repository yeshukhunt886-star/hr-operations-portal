const express = require('express');
const { pool, getGraphVersion } = require('../db');
const { graph } = require('../graph/graphStore');
const routeCache = require('../cache/routeCache');
const metrics = require('../metrics/metrics');

const router = express.Router();

// GET /api/route?from=1&to=5
router.get('/route', async (req, res) => {
  const fromId = Number(req.query.from);
  const toId = Number(req.query.to);
  if (!fromId || !toId) return res.status(400).json({ error: 'from and to query params are required' });
  const start = Date.now();
  const graphVersion = await getGraphVersion();
  const cached = routeCache.get(graphVersion, fromId, toId);
  if (cached) {
    metrics.recordRouteQuery(Date.now() - start, true);
    return res.json({ ...cached, fromCache: true });
  }
  try {
    const result = graph.dijkstra(fromId, toId); // { distance, path, reachable }
    routeCache.set(graphVersion, fromId, toId, result);
    pool
      .query(
        'INSERT INTO route_history (from_location_id, to_location_id, distance, reachable, graph_version, from_cache) VALUES (?,?,?,?,?,?)',
        [fromId, toId, result.reachable ? result.distance : null, result.reachable ? 1 : 0, graphVersion, 0]
      )
      .catch(() => {});
    metrics.recordRouteQuery(Date.now() - start, false);
    res.json({ ...result, fromCache: false });
  } catch (err) {
    if (err.code === 'SOURCE_NOT_FOUND') return res.status(404).json({ error: err.message, field: 'from' });
    if (err.code === 'DESTINATION_NOT_FOUND') return res.status(404).json({ error: err.message, field: 'to' });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reachable/:id  -> BFS reachable set from a location
router.get('/reachable/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const reachable = graph.bfsReachable(id);
    const ids = Array.from(reachable).filter((n) => n !== id);
    let names = [];
    if (ids.length) {
      const [rows] = await pool.query(
        `SELECT id, name FROM locations WHERE id IN (${ids.map(() => '?').join(',')})`,
        ids
      );
      names = rows;
    }
    res.json({ from: id, reachableCount: ids.length, reachable: names });
  } catch (err) {
    if (err.code === 'SOURCE_NOT_FOUND') return res.status(404).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/components -> connected components overview (undirected view)
router.get('/components', async (req, res) => {
  const components = graph.connectedComponents();
  const [locations] = await pool.query('SELECT id, name FROM locations');
  const nameById = new Map(locations.map((l) => [l.id, l.name]));
  const named = components.map((c) => c.map((id) => ({ id, name: nameById.get(id) || `#${id}` })));
  res.json({ componentCount: named.length, components: named });
});

module.exports = router;
