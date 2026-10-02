const path = require('path');
const { Worker } = require('worker_threads');

const POOL_SIZE = Math.max(1, Number(process.env.ROUTE_WORKER_POOL_SIZE || 4));
const WORKER_SCRIPT = path.join(__dirname, 'routeWorker.js');

/**
 * Fixed-size worker pool for CPU-heavy bulk Dijkstra batches.
 * Bounded so a burst of requests can never spawn unbounded threads (#34).
 * A worker crash is caught and the worker is respawned so the pool
 * keeps running (#32).
 */
class RouteWorkerPool {
  constructor(size = POOL_SIZE) {
    this.size = size;
    this.workers = [];
    this.idle = [];
    this.queue = [];
    this.nextTaskId = 1;
    this.pending = new Map(); // taskId -> { resolve, reject }
    for (let i = 0; i < size; i++) this._spawnWorker(i);
  }

  _spawnWorker(index) {
    const worker = new Worker(WORKER_SCRIPT);

    worker.on('message', (msg) => {
      const entry = this.pending.get(msg.taskId);
      if (entry) {
        this.pending.delete(msg.taskId);
        if (msg.ok) entry.resolve(msg.results);
        else entry.reject(new Error(msg.error));
      }
      this.idle.push(worker);
      this._drainQueue();
    });

    worker.on('error', (err) => {
      // Fail whichever task this worker was running, then respawn it.
      for (const [taskId, entry] of this.pending.entries()) {
        if (entry.worker === worker) {
          this.pending.delete(taskId);
          entry.reject(err);
        }
      }
      this.workers[index] = null;
      this._spawnWorker(index);
    });

    worker.on('exit', () => {
      if (this.workers[index] === worker) {
        this.workers[index] = null;
        this._spawnWorker(index);
      }
    });

    this.workers[index] = worker;
    this.idle.push(worker);
  }

  _drainQueue() {
    while (this.idle.length > 0 && this.queue.length > 0) {
      const worker = this.idle.pop();
      const job = this.queue.shift();
      const taskId = this.nextTaskId++;
      this.pending.set(taskId, { resolve: job.resolve, reject: job.reject, worker });
      worker.postMessage({ taskId, type: 'computeBatch', snapshot: job.snapshot, pairs: job.pairs });
    }
  }

  /**
   * Computes routes for `pairs` against the given graph snapshot.
   * Queues the batch if all workers are busy (bounded concurrency, #37).
   */
  computeBatch(snapshot, pairs) {
    return new Promise((resolve, reject) => {
      this.queue.push({ snapshot, pairs, resolve, reject });
      this._drainQueue();
    });
  }

  /** Splits a large pair list into worker-sized chunks and runs them in parallel. */
  async computeManyRoutes(graph, pairs, chunkSize = 200) {
    const snapshot = {
      nodes: Array.from(graph.adjacency.keys()),
      edges: []
    };
    for (const [from, edges] of graph.adjacency.entries()) {
      for (const edge of edges) snapshot.edges.push({ from, to: edge.to, weight: edge.weight });
    }

    const chunks = [];
    for (let i = 0; i < pairs.length; i += chunkSize) chunks.push(pairs.slice(i, i + chunkSize));

    const chunkResults = await Promise.all(
      chunks.map((chunk) =>
        this.computeBatch(snapshot, chunk).catch((err) =>
          chunk.map((pair) => ({ from: pair.from, to: pair.to, error: err.message, reachable: false }))
        )
      )
    );

    return chunkResults.flat();
  }
}

module.exports = new RouteWorkerPool();
