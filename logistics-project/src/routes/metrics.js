const express = require('express');
const metrics = require('../metrics/metrics');
const routeCache = require('../cache/routeCache');
const { graph } = require('../graph/graphStore');
const { getGraphVersion } = require('../db');

const router = express.Router();

router.get('/', async (req, res) => {
  const snapshot = metrics.snapshot();
  const graphVersion = await getGraphVersion();
  res.json({
    ...snapshot,
    graph: {
      version: graphVersion,
      nodeCount: graph.nodeCount()
    },
    cache: routeCache.stats()
  });
});

module.exports = router;
