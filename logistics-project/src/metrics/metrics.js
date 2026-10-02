/**
 * Lightweight in-process metrics tracker (edge case area: "Metrics").
 * Tracks processing duration, throughput, failures and memory usage
 * observations without adding an external metrics dependency.
 */
class Metrics {
  constructor() {
    this.routeQueries = { total: 0, cacheHits: 0, totalTimeMs: 0 };
    this.bulkImportJobs = [];
    this.bulkRouteJobs = [];
  }

  recordRouteQuery(durationMs, fromCache) {
    this.routeQueries.total++;
    this.routeQueries.totalTimeMs += durationMs;
    if (fromCache) this.routeQueries.cacheHits++;
  }

  recordBulkImport(summary) {
    this.bulkImportJobs.push(summary);
    if (this.bulkImportJobs.length > 20) this.bulkImportJobs.shift();
  }

  recordBulkRoute(summary) {
    this.bulkRouteJobs.push(summary);
    if (this.bulkRouteJobs.length > 20) this.bulkRouteJobs.shift();
  }

  snapshot() {
    const mem = process.memoryUsage();
    return {
      routeQueries: {
        total: this.routeQueries.total,
        cacheHits: this.routeQueries.cacheHits,
        avgTimeMs: this.routeQueries.total
          ? Number((this.routeQueries.totalTimeMs / this.routeQueries.total).toFixed(3))
          : 0
      },
      recentBulkImportJobs: this.bulkImportJobs,
      recentBulkRouteJobs: this.bulkRouteJobs,
      memory: {
        rssMB: Number((mem.rss / 1024 / 1024).toFixed(2)),
        heapUsedMB: Number((mem.heapUsed / 1024 / 1024).toFixed(2)),
        heapTotalMB: Number((mem.heapTotal / 1024 / 1024).toFixed(2))
      },
      uptimeSeconds: Math.round(process.uptime())
    };
  }
}

module.exports = new Metrics();
