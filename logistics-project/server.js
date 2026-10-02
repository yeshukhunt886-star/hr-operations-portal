require('dotenv').config();
const express = require('express');
const path = require('path');

const { loadGraphFromDb } = require('./src/graph/graphStore');

const locationsRouter = require('./src/routes/locations');
const connectionsRouter = require('./src/routes/connections');
const routeRouter = require('./src/routes/route');
const tasksRouter = require('./src/routes/tasks');
const bulkImportRouter = require('./src/routes/bulkImport');
const bulkRouteRouter = require('./src/routes/bulkRoute');
const metricsRouter = require('./src/routes/metrics');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/locations', locationsRouter);
app.use('/api/connections', connectionsRouter);
app.use('/api', routeRouter); // exposes /api/route, /api/reachable/:id, /api/components
app.use('/api/tasks', tasksRouter);
app.use('/api/bulk-import', bulkImportRouter);
app.use('/api/bulk-route', bulkRouteRouter);
app.use('/api/metrics', metricsRouter);
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Central error handler (e.g. multer file-type/size rejections)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({ error: err.message || 'Unexpected error' });
});

async function start() {
  try {
    await loadGraphFromDb();
    app.listen(PORT, () => {
      console.log(`Smart Logistics server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    console.error('Make sure MySQL is running and schema.sql has been applied (npm run init-db).');
    process.exit(1);
  }
}

start();
