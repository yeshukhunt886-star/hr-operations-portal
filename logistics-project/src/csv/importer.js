const fs = require('fs');
const { Writable, pipeline } = require('stream');
const { parse } = require('csv-parse');
const { pool } = require('../db');
const metrics = require('../metrics/metrics');

const REQUIRED_COLUMNS = ['location_name', 'priority'];
const BATCH_SIZE = Number(process.env.CSV_BATCH_SIZE || 500);

/**
 * In-memory registry of running jobs so a cancellation request
 * (edge case #31) can signal an in-flight stream to stop at a
 * safe boundary (between batches, never mid-batch).
 */
const runningJobs = new Map(); // jobId -> { cancelled: boolean }

function cancelJob(jobId) {
  const entry = runningJobs.get(jobId);
  if (entry) entry.cancelled = true;
  return !!entry;
}

async function recordError(jobId, rowNumber, rawRow, message) {
  await pool.query(
    'INSERT INTO bulk_import_errors (job_id, row_number, raw_row, error_message) VALUES (?, ?, ?, ?)',
    [jobId, rowNumber, JSON.stringify(rawRow).slice(0, 60000), message.slice(0, 990)]
  );
}

function validateRow(row) {
  if (!row.location_name || !String(row.location_name).trim()) {
    return 'location_name is required';
  }
  const priority = Number(row.priority);
  if (!Number.isInteger(priority) || priority < 1 || priority > 10) {
    return 'priority must be an integer between 1 and 10';
  }
  if (row.deadline && isNaN(Date.parse(row.deadline))) {
    return 'deadline is not a valid date';
  }
  return null;
}

/**
 * Resolves (or lazily creates) a location id for a location name.
 * Cached per-job to avoid a DB round trip per row.
 */
async function resolveLocationId(name, cache) {
  const key = name.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key);
  const [rows] = await pool.query('SELECT id FROM locations WHERE LOWER(name) = ?', [key]);
  let id;
  if (rows.length) {
    id = rows[0].id;
  } else {
    const [result] = await pool.query('INSERT INTO locations (name) VALUES (?)', [name.trim()]);
    id = result.insertId;
  }
  cache.set(key, id);
  return id;
}

async function insertBatch(jobId, batch, locationCache, counters) {
  for (const { row, rowNumber } of batch) {
    const validationError = validateRow(row);

    if (validationError) {
      counters.failed++;
      await recordError(jobId, rowNumber, row, validationError);
      counters.processed++;
      continue;
    }

    try {
      const locationId = await resolveLocationId(row.location_name, locationCache);
      const sourceId = row.source_id ? String(row.source_id).trim() : null;
      const deadline = row.deadline ? new Date(row.deadline) : null;

      const [result] = await pool.query(
        `INSERT INTO delivery_tasks (source_id, location_id, description, priority, deadline)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE id = id`,
        [
          sourceId,
          locationId,
          row.description || null,
          Number(row.priority),
          deadline
        ]
      );

      if (sourceId && result.affectedRows === 0) {
        // Count existing source_id rows as duplicates instead of successful inserts.
        counters.duplicates++;
      } else {
        counters.success++;
      }
    } catch (err) {
      counters.failed++;
      await recordError(jobId, rowNumber, row, err.message);
    }

    counters.processed++;
  }
}

/**
 * Streams a CSV file of delivery task rows into MySQL.
 * - Never loads the whole file into memory (fs.createReadStream + pipeline).
 * - Backpressure: the Writable's _write callback is only invoked after a
 *   batch is flushed to MySQL, so the parser naturally pauses reading the
 *   file when the database falls behind (edge case #28).
 * - Malformed rows after N valid rows are recorded and skipped, not fatal (#25).
 */
async function runBulkImport(jobId, filePath) {
  runningJobs.set(jobId, { cancelled: false });
  const startTime = Date.now();
 const counters = { processed: 0, success: 0, failed: 0, duplicates: 0 };
  const locationCache = new Map();

  let rowNumber = 0;
  let sawHeader = false;
  let sawAnyRow = false;
  let missingColumnError = null;
  let batch = [];

  const parser = parse({
    bom: true,           // handles UTF-8 BOM (#24)
    columns: (headerRow) => {
      sawHeader = true;
      const normalized = headerRow.map((h) => h.trim().toLowerCase());
      const missing = REQUIRED_COLUMNS.filter((c) => !normalized.includes(c));
      if (missing.length) {
        missingColumnError = `Missing required column(s): ${missing.join(', ')}`;
      }
      return normalized; // map by header name, not position (#21)
    },
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true // tolerate extra/missing columns per-row instead of throwing (#22)
  });

  const writable = new Writable({
    objectMode: true,
    write(row, _enc, callback) {
      sawAnyRow = true;
      rowNumber++;

      if (missingColumnError) {
        // Fail early — stop processing without reading the rest of the file.
        return callback(new Error(missingColumnError));
      }

      batch.push({ row, rowNumber });

      if (batch.length < BATCH_SIZE) {
        return callback(); // accept next row immediately, no DB round trip yet
      }

      const currentBatch = batch;
      batch = [];
      insertBatch(jobId, currentBatch, locationCache, counters)
        .then(async () => {
          await pool.query(
            'UPDATE bulk_import_jobs SET processed = ?, success = ?, failed = ? WHERE id = ?',
            [counters.processed, counters.success, counters.failed, jobId]
          );
          const jobState = runningJobs.get(jobId);
          if (jobState && jobState.cancelled) {
            return callback(new Error('__CANCELLED__'));
          }
          callback(); // backpressure release point: only now does the stream accept more
        })
        .catch(callback);
    },
    final(callback) {
      if (!batch.length) return callback();
      insertBatch(jobId, batch, locationCache, counters).then(() => callback()).catch(callback);
    }
  });

  try {
    await new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(filePath); // streamed, never readFileSync (#27)
      pipeline(readStream, parser, writable, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    const durationSec = (Date.now() - startTime) / 1000;
    const rowsPerSec = durationSec > 0 ? Number((counters.processed / durationSec).toFixed(1)) : counters.processed;

    let status = 'completed';
    if (!sawHeader || !sawAnyRow) status = 'empty'; // empty file or header-only file (#18, #19)

    await pool.query(
      `UPDATE bulk_import_jobs
       SET status = ?, processed = ?, success = ?, failed = ?, rows_per_sec = ?, finished_at = NOW()
       WHERE id = ?`,
      [status, counters.processed, counters.success, counters.failed, rowsPerSec, jobId]
    );

    metrics.recordBulkImport({
  jobId,
  status,
  processed: counters.processed,
  success: counters.success,
  failed: counters.failed,
  duplicates: counters.duplicates,
  rowsPerSec,
  durationSec: Number(durationSec.toFixed(2))
});
  } catch (err) {
    const cancelled = err.message === '__CANCELLED__';
    await pool.query(
      `UPDATE bulk_import_jobs
       SET status = ?, processed = ?, success = ?, failed = ?, finished_at = NOW()
       WHERE id = ?`,
      [cancelled ? 'cancelled' : 'failed', counters.processed, counters.success, counters.failed, jobId]
    );
    if (!cancelled) {
      await recordError(jobId, rowNumber, {}, err.message);
    }
  } finally {
    runningJobs.delete(jobId);
    fs.unlink(filePath, () => {});
  }
}

module.exports = { runBulkImport, cancelJob, REQUIRED_COLUMNS };
