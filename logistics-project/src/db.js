require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'logistics_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true
});

/**
 * Returns the current graph version (used in cache keys).
 * Cache keys must embed this so any location/connection mutation
 * invalidates stale cached route answers (edge cases #13, #35).
 */
async function getGraphVersion() {
  const [rows] = await pool.query('SELECT version FROM graph_meta WHERE id = 1');
  return rows.length ? Number(rows[0].version) : 1;
}

/**
 * Bumps the graph version. Must be called inside the same transaction
 * as any write to locations/connections that can change route answers.
 */
async function bumpGraphVersion(conn) {
  const runner = conn || pool;
  await runner.query('UPDATE graph_meta SET version = version + 1 WHERE id = 1');
}

module.exports = { pool, getGraphVersion, bumpGraphVersion };
