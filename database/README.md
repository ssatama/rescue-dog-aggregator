# Database

PostgreSQL 15. Production runs on Railway's managed Postgres; local development
runs a plain local instance.

## Files

| Path | Role |
| --- | --- |
| `schema.sql` | Single source of truth for the dev/CI schema |
| `db_setup.py` | Creates and initialises a local database from `schema.sql` |
| `migration_history.md` | Log of applied schema changes - update it when you add one |
| `../migrations/railway/` | Alembic environment for the production database (7 revisions) |

## Local setup

```bash
createdb rescue_dogs
uv run python database/db_setup.py
```

## Inspecting the database

Prefer the `postgres` MCP server (read-only SQL) over shelling out to `psql`.

```sql
-- Coverage and activity
SELECT COUNT(*) AS total_animals,
       COUNT(*) FILTER (WHERE status = 'available') AS available,
       COUNT(DISTINCT organization_id) AS organizations
FROM animals;

-- Recent scraping activity
SELECT organization_id, MAX(started_at) AS last_scrape, COUNT(*) AS runs_24h
FROM scrape_logs
WHERE started_at > NOW() - INTERVAL '24 hours'
GROUP BY organization_id
ORDER BY last_scrape DESC;

-- Size
SELECT pg_size_pretty(pg_database_size(current_database())) AS database_size,
       pg_size_pretty(pg_total_relation_size('animals')) AS animals_table_size;

-- Index usage - unused indexes have idx_scan = 0
SELECT tablename, indexname, idx_scan AS scans, idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public' AND tablename IN ('animals', 'organizations')
ORDER BY idx_scan DESC
LIMIT 20;
```

## Production

Railway manages the production database, including backups and point-in-time
recovery - there is no self-hosted backup, WAL archiving or replication setup in
this repo to operate.

Schema changes reach production through Alembic:

```bash
uv run python management/railway_commands.py test-connection
uv run python management/railway_commands.py migrate --dry-run
uv run python management/railway_commands.py migrate
uv run python management/railway_commands.py status
```

Data sync between environments is `management/railway_commands.py sync`. Read
`services/railway/sync.py` before running it: it inserts explicit primary keys,
so sequences must be reset afterwards or subsequent inserts hit duplicate-key
errors.

## Schema reference

Column-level documentation lives in `docs/reference/database-schema.md`.
`animals` has 39 columns and `organizations` 21, with GIN indexes on the JSONB
columns (`properties`, `dog_profiler_data`, `ships_to`).
