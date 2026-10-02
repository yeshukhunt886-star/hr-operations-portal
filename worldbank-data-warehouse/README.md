# Global Development Data Warehouse & Synchronization Service

Node.js + Express + Prisma/SQLite backend with a React (Vite) frontend. Imports World Bank Indicators into a **local** warehouse, then serves comparison, trend, ranking, and CSV export APIs from that database only.

## Quick start

```bash
cd worldbank-data-warehouse
npm install
npm run install:all
cd backend
npx prisma generate
npx prisma db push
cd ..
npm run dev
```

- API: http://127.0.0.1:3001/api/health
- UI: http://127.0.0.1:5173

Default first import: 10 countries, population + GDP, 2000–2023. Use **Import all countries** after the pipeline looks correct if you want a large local dataset.

## What was built

| Area | Implementation |
|---|---|
| Import config | UI + `POST /api/imports` (countries, indicators, year range) |
| API fetch | Timeout, retry/backoff, 429/5xx handling, page loop, bounded concurrency |
| Master data | `countries`, `indicators` upserted by stable codes |
| Facts | `indicator_values` unique on country + indicator + year |
| Jobs | queued → running → success/partial/failed/cancelled; stall recovery |
| Sync | Re-import updates changed values; counters: imported/updated/unchanged/skipped/failed |
| Analytics | compare, trends, rankings (ties: name then ISO3) |
| Export | Streaming CSV from local DB |

Redis/BullMQ is optional later; jobs persist in SQLite and an in-process worker picks `queued`/`stalled` work so a restart recovers instead of leaving jobs “running forever.”

## API sketch

- `POST /api/imports` — validate codes against World Bank, enqueue job (409 if identical job is already active)
- `GET /api/imports/:id` — job + counters + errors
- `POST /api/imports/:id/cancel` — stop at the next page boundary
- `GET /api/analytics/compare|trends|rankings` — **local DB only**
- `GET /api/export/csv` — streamed rows, capped

## Edge-case behavior

See the project brief. Highlights:

- Null source values are stored as SQL `NULL` (counted as skipped when first seen). Exact `0` is stored as zero.
- Extra JSON fields from the API are ignored.
- Pagination empty-page / repeat-page anomalies are recorded on the job; uniqueness still prevents duplicate facts.
- Query year span and ranking page size are capped. Sort fields are allowlisted.
- Client SQL-like strings cannot change query shape (parameterized Prisma + allowlists).
