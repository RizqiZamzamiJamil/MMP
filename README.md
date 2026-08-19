# Media Monitor

Media Monitor is a PostgreSQL-backed service for collecting and exploring media mentions. It accepts mention batches, removes duplicate records, normalizes incoming data, supports paginated search, and provides grouped engagement statistics through an HTTP API. A lightweight React dashboard provides a visual interface for searching mentions and viewing source summaries.

## Requirements

- Node.js 20 or newer
- npm
- PostgreSQL 14 or newer

## Run from clone to working endpoint

```bash
git clone https://github.com/RizqiZamzamiJamil/MMP.git
cd MMP
npm install
```

Create the backend environment file:

```bash
cp .env.example backend/.env
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example backend/.env
```

Set `DATABASE_URL` in `backend/.env` to match your local PostgreSQL credentials. For example:

```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/media_monitor
```

Create the database and apply the schema:

```bash
npm run db:setup
```

Load the included sample mentions so the endpoint and dashboard have data:

```bash
npm run db:seed
```

The setup and seed steps can also be combined:

```bash
npm run db:setup:seed
```

Start both services:

```bash
npm run dev
```

The API runs at `http://localhost:4000` and the dashboard runs at `http://localhost:3000`.

Verify the API:

```bash
curl "http://localhost:4000/mentions?page=1&limit=20&sort=published_at&order=DESC"
curl "http://localhost:4000/mentions/stats?group_by=source"
```

The bulk ingestion endpoint accepts a JSON array:

```bash
curl -X POST "http://localhost:4000/internal/mentions/bulk" \
  -H "Content-Type: application/json" \
  -d '[{"external_id":"demo-001","source":"TWITTER","title":"Example mention","content":"Example content","url":"https://example.com/demo-001","author":"@example","published_at":"2026-08-19T10:00:00Z","engagement":"1,200"}]'
```

## API endpoints

### `POST /internal/mentions/bulk`

Accepts a JSON array, normalizes each record, inserts valid records in one transaction, and returns `inserted` and `skipped` counts.

### `GET /mentions`

Supports `q`, `source`, `from`, `to`, `page`, `limit`, `sort`, and `order`. Supported sort fields are `published_at`, `engagement`, `source`, `title`, and `created_at`.

### `GET /mentions/stats?group_by=source|day`

Returns grouped counts and total engagement by canonical source or UTC publication day.

## Schema and modelling decision

The application uses one `mentions` table because the assessment is centred on an ingestible media-mention record and its search and aggregate views. It includes:

- `id`: internal PostgreSQL identity.
- `external_id` and `url`: source record identity used for duplicate detection.
- `source`, `title`, `content`, `author`: searchable mention fields.
- `published_at`: nullable publication timestamp for date filtering and day statistics.
- `engagement`: non-negative integer used by engagement statistics.
- `created_at`: insertion timestamp for auditing and stable sorting.

The schema has indexes for `source`, `published_at`, and `engagement`, plus a unique constraint on `(external_id, url)`. A separate source table was not added because source labels are normalized values, not an independently managed domain in this brief.

## Duplicate detection

A record is a duplicate when both its normalized `external_id` and `url` match an existing row. PostgreSQL enforces this with `UNIQUE (external_id, url)` and ingestion uses `ON CONFLICT DO NOTHING`.

This rule allows the same external identifier to exist across different URLs while preventing the same source record from being inserted repeatedly. It is also idempotent: retrying the same batch does not create additional rows.

## Assumptions

- `external_id` and `url` are required because they are the only stable identity fields supplied by the brief.
- Missing titles and authors are allowed; missing content is rejected because content is needed for meaningful search.
- Missing or invalid publication dates become `NULL` rather than rejecting the entire batch.
- Engagement is normalized to a non-negative integer; invalid values become `0`.
- Source aliases such as `TWITTER`, `twitter`, and known abbreviated labels are mapped to canonical labels before storage.
- Date statistics use UTC so the grouping is deterministic across machines.
- Authentication, authorization, background queues, and external media-provider integrations are outside the requested scope.

## Accepted trade-offs

- The service uses a small explicit SQL migration runner because the assessment needs one schema and a simple clone-and-run setup.
- Search uses PostgreSQL `ILIKE` and contains filters because they are sufficient for the assessment dataset and keep the implementation easy to understand.
- The bulk endpoint processes the normalized batch in a transaction but inserts records sequentially, favouring clear duplicate counts and straightforward error handling over maximum throughput.
- The dashboard is intentionally small and optional. It covers summary metrics, filters, recent mentions, source distribution, loading, empty, retry, and responsive states without adding routing or a larger UI system.
- The development frontend uses a Vite proxy at `/api`; a deployed frontend should set `VITE_API_BASE_URL` to the deployed API URL.

## Time spent

Approximately 4 hours in one working session on Wednesday, from around 12:00 to 16:00 WIB, including backend implementation, frontend implementation, responsive refinement, debugging, and final verification.

## With another week, I would...

- Add CSV export for the filtered mention list and source statistics.
- Add configurable alert rules for a keyword or source when new mentions are ingested.
- Add an ingestion history view showing batch totals, inserted records, skipped duplicates, and rejected records.
- Add role-based access and authentication if the dashboard becomes a shared internal tool.
