/**
 * worker_threads script — used ONLY for CPU-heavy Dijkstra batch
 * computation. Normal DB/file I/O stays on the main process.
 */
const { parentPort } = require('worker_threads');
const Graph = require('../graph/Graph');

function buildGraphFromSnapshot(snapshot) {
  const g = new Graph();
  for (const nodeId of snapshot.nodes) g.addNode(nodeId);
  for (const edge of snapshot.edges) g.addEdge(edge.from, edge.to, edge.weight);
  return g;
}

parentPort.on('message', (msg) => {
  if (msg.type !== 'computeBatch') return;
  const { taskId, snapshot, pairs } = msg;
  try {
    const graph = buildGraphFromSnapshot(snapshot);
    const results = pairs.map((pair) => {
      try {
        const res = graph.dijkstra(pair.from, pair.to);
        return { from: pair.from, to: pair.to, ...res, error: null };
      } catch (err) {
        return { from: pair.from, to: pair.to, distance: null, path: null, reachable: false, error: err.message };
      }
    });
    parentPort.postMessage({ taskId, ok: true, results });
  } catch (err) {
    // A whole-batch failure (e.g. bad snapshot) — reported, main process stays alive (#32).
    parentPort.postMessage({ taskId, ok: false, error: err.message });
  }
});
