const express = require('express');
const { getGraphVersion } = require('../db');
const { graph } = require('../graph/graphStore');
const workerPool = require('../workers/routeWorkerPool');
const metrics = require('../metrics/metrics');

const router = express.Router();

// POST /api/bulk-route { pairs: [{ from, to }, ...] }
router.post('/', async (req, res) => {
  const pairs = req.body.pairs;
  if (!Array.isArray(pairs) || pairs.length === 0) {
    return res.status(400).json({ error: 'pairs must be a non-empty array of { from, to }' });
  }
  if (pairs.length > 20000) {
    return res.status(413).json({ error: 'Too many pairs in a single request (limit 20000).' });
  }

  const versionAtStart = await getGraphVersion();
  const start = Date.now();

  const results = await workerPool.computeManyRoutes(graph, pairs);

  const versionAtEnd = await getGraphVersion();
  const stale = versionAtStart !== versionAtEnd;

  const durationMs = Date.now() - start;
  metrics.recordBulkRoute({
    pairCount: pairs.length,
    durationMs,
    stale,
    failures: results.filter((r) => r.error).length
  });

  // If the graph changed mid-computation, flag results as potentially stale
  // rather than silently serving them as authoritative (#33).
  res.json({
    graphVersionAtStart: versionAtStart,
    graphVersionAtEnd: versionAtEnd,
    stale,
    count: results.length,
    durationMs,
    results
  });
});

module.exports = router;
