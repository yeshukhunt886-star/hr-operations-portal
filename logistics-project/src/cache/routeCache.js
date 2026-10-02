/**
 * In-memory route cache, keyed by graph version + route inputs
 * (edge case: "cache keys must include graph version and all
 * route inputs that affect the answer").
 *
 * This is a simple Map-based cache so the project runs with zero
 * external dependencies. If REDIS_URL is configured, swap this
 * module's implementation for a Redis client with the same
 * get/set/stats interface — the rest of the app is unaffected.
 * Core correctness never depends on the cache being available
 * (edge case #36): a cache miss or cache failure just falls back
 * to recomputation.
 */
class RouteCache {
  constructor(maxEntries = 50000) {
    this.store = new Map();
    this.maxEntries = maxEntries;
    this.hits = 0;
    this.misses = 0;
  }

  buildKey(graphVersion, fromId, toId) {
    return `v${graphVersion}:${fromId}:${toId}`;
  }

  get(graphVersion, fromId, toId) {
    try {
      const key = this.buildKey(graphVersion, fromId, toId);
      const hit = this.store.get(key);
      if (hit) {
        this.hits++;
        return hit;
      }
      this.misses++;
      return null;
    } catch (err) {
      // Cache must never break correctness — fail safe to a miss.
      this.misses++;
      return null;
    }
  }

  set(graphVersion, fromId, toId, value) {
    try {
      if (this.store.size >= this.maxEntries) {
        // Cheap eviction: drop the oldest inserted entry.
        const oldestKey = this.store.keys().next().value;
        this.store.delete(oldestKey);
      }
      const key = this.buildKey(graphVersion, fromId, toId);
      this.store.set(key, value);
    } catch (err) {
      // Swallow cache write failures — never fail the request because of the cache.
    }
  }

  stats() {
    return { size: this.store.size, hits: this.hits, misses: this.misses };
  }
}

module.exports = new RouteCache();
