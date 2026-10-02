const Graph = require('./Graph');
const { pool, bumpGraphVersion } = require('../db');

/**
 * Singleton in-memory Graph kept in sync with MySQL.
 * MySQL is the source of truth / persistence layer; the in-memory
 * Graph is what the DSA algorithms (BFS/DFS/Dijkstra) operate on,
 * per the "implement the algorithm yourself, don't hide it in a
 * routing library" requirement.
 */
const graph = new Graph();

async function loadGraphFromDb() {
  graph.adjacency.clear();

  const [locations] = await pool.query('SELECT id FROM locations');
  for (const loc of locations) graph.addNode(loc.id);

  const [connections] = await pool.query(
    'SELECT id, from_location_id, to_location_id, weight, bidirectional FROM connections'
  );
  for (const c of connections) {
    graph.addEdge(c.from_location_id, c.to_location_id, Number(c.weight), c.id);
    if (c.bidirectional) {
      graph.addEdge(c.to_location_id, c.from_location_id, Number(c.weight), c.id);
    }
  }
  return graph;
}

/** Adds a location to DB + in-memory graph, bumping the graph version. */
async function createLocation(name) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query('INSERT INTO locations (name) VALUES (?)', [name]);
    await bumpGraphVersion(conn);
    await conn.commit();
    graph.addNode(result.insertId);
    return { id: result.insertId, name };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/** Deletes a location. Restricts if referenced by connections/tasks (edge case #12). */
async function deleteLocation(id) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [edgeRows] = await conn.query(
      'SELECT COUNT(*) AS cnt FROM connections WHERE from_location_id = ? OR to_location_id = ?',
      [id, id]
    );
    if (edgeRows[0].cnt > 0) {
      await conn.rollback();
      const err = new Error(
        'Cannot delete location: it is referenced by existing connections. Remove connections first.'
      );
      err.code = 'LOCATION_IN_USE';
      throw err;
    }
    const [result] = await conn.query('DELETE FROM locations WHERE id = ?', [id]);
    await bumpGraphVersion(conn);
    await conn.commit();
    if (result.affectedRows > 0) graph.removeNode(id);
    return result.affectedRows > 0;
  } catch (err) {
    if (err.code !== 'LOCATION_IN_USE') await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Adds a connection (edge) to DB + in-memory graph.
 * Rejects negative weight (#10), enforces uniqueness per direction (#7).
 */
async function createConnection({ fromId, toId, weight, bidirectional }) {
  if (weight < 0) {
    const err = new Error('Negative edge weights are rejected.');
    err.code = 'NEGATIVE_WEIGHT';
    throw err;
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [locRows] = await conn.query(
      'SELECT id FROM locations WHERE id IN (?, ?)',
      [fromId, toId]
    );
    if (locRows.length < 2) {
      await conn.rollback();
      const err = new Error('One or both locations do not exist.');
      err.code = 'LOCATION_NOT_FOUND';
      throw err;
    }

    let result;
    try {
      [result] = await conn.query(
        'INSERT INTO connections (from_location_id, to_location_id, weight, bidirectional) VALUES (?, ?, ?, ?)',
        [fromId, toId, weight, bidirectional ? 1 : 0]
      );
    } catch (dbErr) {
      if (dbErr.code === 'ER_DUP_ENTRY') {
        await conn.rollback();
        const err = new Error(
          'A connection from this location to the destination already exists. Update it instead of creating a duplicate.'
        );
        err.code = 'DUPLICATE_CONNECTION';
        throw err;
      }
      throw dbErr;
    }

    await bumpGraphVersion(conn);
    await conn.commit();

    graph.addEdge(fromId, toId, weight, result.insertId);
    if (bidirectional) graph.addEdge(toId, fromId, weight, result.insertId);

    return { id: result.insertId, fromId, toId, weight, bidirectional: !!bidirectional };
  } catch (err) {
    if (!['DUPLICATE_CONNECTION', 'LOCATION_NOT_FOUND'].includes(err.code)) {
      await conn.rollback().catch(() => {});
    }
    throw err;
  } finally {
    conn.release();
  }
}

async function deleteConnection(id) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      'SELECT from_location_id, to_location_id, bidirectional FROM connections WHERE id = ?',
      [id]
    );
    if (!rows.length) {
      await conn.rollback();
      return false;
    }
    await conn.query('DELETE FROM connections WHERE id = ?', [id]);
    await bumpGraphVersion(conn);
    await conn.commit();

    const { from_location_id, to_location_id, bidirectional } = rows[0];
    graph.removeEdge(from_location_id, to_location_id);
    if (bidirectional) graph.removeEdge(to_location_id, from_location_id);
    return true;
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  graph,
  loadGraphFromDb,
  createLocation,
  deleteLocation,
  createConnection,
  deleteConnection
};
