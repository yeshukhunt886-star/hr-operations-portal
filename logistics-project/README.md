# Smart Logistics Route & Bulk Delivery Processor

A full-stack Node.js project: **Express backend + MySQL database + plain HTML/CSS/JS frontend**,
implementing graphs, Dijkstra, BFS/DFS, a priority-queue task scheduler, streaming CSV bulk
import with backpressure, a bounded `worker_threads` pool for bulk route computation, and a
version-aware in-memory route cache.

---

## 1. Architecture at a glance

```
Browser (public/index.html, style.css, app.js)
        │  fetch() calls to /api/...
        ▼
Express server (server.js)
        │
        ├── src/routes/*        → HTTP layer (validation, status codes)
        ├── src/graph/Graph.js  → adjacency list + BFS/DFS/Dijkstra (pure, unit-tested)
        ├── src/graph/graphStore.js → keeps in-memory Graph in sync with MySQL
        ├── src/queue/TaskPriorityQueue.js → min-heap task ordering
        ├── src/cache/routeCache.js → version-aware in-memory route cache
        ├── src/csv/importer.js → streaming CSV import (fs.createReadStream + pipeline)
        ├── src/workers/routeWorker*.js → bounded worker_threads pool for bulk Dijkstra
        └── src/db.js            → mysql2 connection pool
        │
        ▼
      MySQL (schema.sql)
```

Everything the "Logic / Technical Challenges" section requires is implemented directly:
Dijkstra and BFS/DFS are hand-written in `src/graph/Graph.js` (no routing library), the
min-heap in `src/graph/MinHeap.js` is hand-written and unit-tested, CSV import never calls
`readFile`/`readFileSync`, `worker_threads` is used only for CPU-heavy bulk route batches
(never for DB/file I/O), and cache keys embed the graph version so any location/connection
change invalidates stale answers.

---

## 2. Prerequisites

- **Node.js 18+** (uses `node:stream`, `node:worker_threads`, `node:test`)
- **MySQL 8.x** (or MySQL 5.7+; uses `CHECK` constraints, so 8.x is recommended)
- npm

---

## 3. Step-by-step setup

### Step 1 — Get the files onto your machine
Unzip/copy the project folder, then open a terminal inside it:
```bash
cd logistics-project
```

### Step 2 — Install dependencies
```bash
npm install
```
This installs `express`, `mysql2`, `multer`, `csv-parse`, and `dotenv`.

### Step 3 — Configure environment variables
Copy the example env file and edit it with your MySQL credentials:
```bash
cp .env.example .env
```
Open `.env` and set at minimum:
```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=logistics_db
```

### Step 4 — Create the database and tables
Make sure MySQL is running, then run:
```bash
npm run init-db
```
This connects to MySQL and executes `schema.sql`, which:
- creates the `logistics_db` database,
- creates all tables (`locations`, `connections`, `delivery_tasks`,
  `bulk_import_jobs`, `bulk_import_errors`, `route_history`, `graph_meta`),
- seeds the graph version counter used for cache invalidation.

You should see:
```
Connected to MySQL. Applying schema.sql ...
Schema applied successfully. Database "logistics_db" is ready.
```

*(Alternative: run `mysql -u root -p < schema.sql` directly if you prefer the MySQL CLI.)*

### Step 5 — Start the server
```bash
npm start
```
You should see:
```
Smart Logistics server running at http://localhost:3000
```
On startup the server loads all locations/connections from MySQL into the in-memory graph
used by the DSA algorithms.

### Step 6 — Open the UI
Visit **http://localhost:3000** in your browser. You'll see a tabbed interface:

| Tab            | What it does |
|----------------|--------------|
| Locations      | Add/list/delete graph nodes |
| Connections    | Add weighted (optionally bidirectional) edges between locations |
| Route Finder   | Shortest path (Dijkstra) between two locations; BFS reachability from a location |
| Delivery Tasks | Add tasks with a priority (1=urgent..10=low) and optional deadline; view them in priority-queue order |
| Bulk Import    | Upload a CSV of delivery tasks; streamed into MySQL with live progress |
| Bulk Routes    | Paste many `from,to` location-ID pairs; computed in parallel via the worker pool |
| Metrics        | Live JSON snapshot: query counts, cache hit rate, memory usage, recent job stats |

### Step 7 — Try the walkthrough
1. **Locations tab** — add a few locations, e.g. `Warehouse A`, `Warehouse B`, `Downtown Hub`, `Airport Depot`.
2. **Connections tab** — connect them with weights, e.g. `Warehouse A → Downtown Hub` weight `5`, `Downtown Hub → Airport Depot` weight `3`, and check "Bidirectional" if traffic flows both ways.
3. **Route Finder tab** — pick two locations and click "Find Route" to see the shortest path and total distance. Run it twice — the second run is served from cache (see the `fromCache` flag).
4. **Delivery Tasks tab** — add tasks with different priorities and deadlines; the table always shows them in priority-queue (most-urgent-first) order.
5. **Bulk Import tab** — upload the included `sample-delivery-tasks.csv` (or your own; required columns are `location_name` and `priority`). Watch the live status: processed/success/failed counts and rows/sec. New location names in the CSV are auto-created.
6. **Bulk Routes tab** — note the numeric IDs from the Locations tab, then paste pairs like:
   ```
   1,2
   1,3
   2,4
   ```
   and click "Calculate All Routes" to see the bounded worker pool compute them in parallel.
7. **Metrics tab** — click "Refresh" any time to see live counters and memory usage.

### Step 8 — Run the DSA unit tests
The core algorithms (MinHeap, Dijkstra, BFS, priority ordering) are pure functions with
no HTTP/DB dependency, so they're independently testable:
```bash
npm test
```

---

## 4. API reference (for direct testing with curl/Postman)

| Method | Endpoint | Body / Query | Notes |
|---|---|---|---|
| GET | `/api/locations` | — | list all |
| POST | `/api/locations` | `{ "name": "Warehouse A" }` | |
| DELETE | `/api/locations/:id` | — | 409 if referenced by connections |
| GET | `/api/connections` | — | list all |
| POST | `/api/connections` | `{ "fromId":1, "toId":2, "weight":5, "bidirectional":false }` | rejects negative weight |
| DELETE | `/api/connections/:id` | — | |
| GET | `/api/route?from=1&to=2` | — | Dijkstra shortest path |
| GET | `/api/reachable/:id` | — | BFS reachable set |
| GET | `/api/components` | — | connected components (undirected view) |
| GET | `/api/tasks` | — | pending tasks, priority-queue order |
| POST | `/api/tasks` | `{ "locationId":1, "priority":2, "deadline":"2026-09-20T10:00" }` | |
| PATCH | `/api/tasks/:id/status` | `{ "status": "done" }` | |
| POST | `/api/bulk-import` | multipart `file` field, CSV | returns `{ jobId }` immediately |
| GET | `/api/bulk-import/:jobId` | — | status/counters/sample errors |
| POST | `/api/bulk-import/:jobId/cancel` | — | stops at next batch boundary |
| POST | `/api/bulk-route` | `{ "pairs":[{"from":1,"to":2}] }` | worker-pool computed, flags staleness |
| GET | `/api/metrics` | — | JSON metrics snapshot |

---

## 5. Design notes / how key requirements are satisfied

- **Graph modeling & algorithms**: `src/graph/Graph.js` is a plain adjacency-list class with
  hand-rolled BFS, DFS, and Dijkstra (using the hand-rolled `MinHeap.js`). No routing library
  is used. Both are covered by `test/graph.test.js`, runnable without HTTP or MySQL.
- **Priority queue**: `src/queue/TaskPriorityQueue.js` uses the same `MinHeap` with a
  deterministic comparator: priority → deadline → creation order → id.
- **Streaming CSV import**: `src/csv/importer.js` uses `fs.createReadStream` piped through
  `csv-parse` and a custom `Writable`, never `readFile`/`readFileSync`. Backpressure comes
  for free from stream semantics — the writable's callback (and therefore the next chunk of
  file reading) is only invoked once a batch has actually been flushed to MySQL.
- **Worker threads**: `src/workers/routeWorkerPool.js` keeps a **fixed-size** pool (default 4,
  configurable via `ROUTE_WORKER_POOL_SIZE`) alive for the whole process lifetime, and only
  ever used for CPU-heavy bulk Dijkstra batches — never for file or DB I/O, which stays on
  the main event loop.
- **Cache invalidation**: every location/connection write increments `graph_meta.version`
  inside the same transaction as the write. Cache keys are `v{version}:{from}:{to}`, so any
  graph mutation naturally invalidates previously cached answers without needing to hunt down
  and delete individual keys.
- **Metrics**: `src/metrics/metrics.js` tracks route-query counts/cache-hit rate, recent bulk
  import/route job summaries, and `process.memoryUsage()`.

## 6. Known simplifications (documented, not hidden)

- The route cache is a process-local `Map`, not Redis — the code comments show exactly where
  to swap in a Redis client with the same `get`/`set` interface if you need cross-process
  caching; correctness never depends on the cache being present.
- `route_history` logging is best-effort (fire-and-forget) so it never slows down the request
  path.
- The frontend is intentionally framework-free (HTML/CSS/vanilla JS) for simplicity and zero
  build step — open `public/` directly if you want to restyle it.
