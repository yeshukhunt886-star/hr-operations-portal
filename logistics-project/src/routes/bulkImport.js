const express = require('express');
const path = require('path');
const multer = require('multer');
const { pool } = require('../db');
const { runBulkImport, cancelJob } = require('../csv/importer');

const router = express.Router();

const upload = multer({
  dest: path.join(__dirname, '..', '..', 'uploads'),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB cap
  fileFilter(req, file, cb) {
    // Treat filename/metadata as data — never trust it for paths (#38).
    const safeName = path.basename(file.originalname).slice(0, 255);
    file.originalname = safeName;
    if (!safeName.toLowerCase().endsWith('.csv')) {
      return cb(new Error('Only .csv files are accepted'));
    }
    cb(null, true);
  }
});

// POST /api/bulk-import  (multipart/form-data, field name "file")
router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file is required (multipart field "file")' });

  const [result] = await pool.query(
    'INSERT INTO bulk_import_jobs (filename, status) VALUES (?, ?)',
    [req.file.originalname, 'running']
  );
  const jobId = result.insertId;

  // Job runs independently on the server; client disconnect does not stop it (#30).
  runBulkImport(jobId, req.file.path).catch((err) => {
    console.error(`Bulk import job ${jobId} crashed:`, err);
  });

  res.status(202).json({ jobId, status: 'running' });
});

// GET /api/bulk-import/:jobId -> status + counters
router.get('/:jobId', async (req, res) => {
  const jobId = Number(req.params.jobId);
  const [rows] = await pool.query('SELECT * FROM bulk_import_jobs WHERE id = ?', [jobId]);
  if (!rows.length) return res.status(404).json({ error: 'Job not found' });

  const [errorRows] = await pool.query(
    'SELECT row_number, error_message FROM bulk_import_errors WHERE job_id = ? ORDER BY row_number LIMIT 50',
    [jobId]
  );

  res.json({ ...rows[0], sampleErrors: errorRows });
});

// POST /api/bulk-import/:jobId/cancel -> stop at a safe batch boundary (#31)
router.post('/:jobId/cancel', (req, res) => {
  const jobId = Number(req.params.jobId);
  const found = cancelJob(jobId);
  if (!found) return res.status(404).json({ error: 'Job is not currently running' });
  res.json({ success: true, message: 'Cancellation requested; job will stop at the next batch boundary.' });
});

module.exports = router;
