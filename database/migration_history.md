# Database Schema Management

## Current Architecture (2026-02-16)

### Single Source of Truth: `schema.sql`

`database/schema.sql` is the **sole source of truth** for database structure in dev and CI.
It contains all tables, columns, constraints, and indexes synced with production.

**Production migrations** use Alembic in `migrations/railway/` — the only migration system.

### Setup Workflow

1. `python database/db_setup.py` — creates tables and indexes from schema.sql
2. `python management/config_commands.py sync` — syncs organization configs
3. `python management/config_commands.py run [org-id]` — runs scrapers

### Core Tables

- **organizations** — rescue organizations with metadata and configuration
- **animals** — dogs available for adoption with standardized fields
- **animal_images** — multiple images per animal
- **scrape_logs** — detailed scraping metrics and monitoring
- **service_regions** — geographic service areas per organization

## Migration History (Archived)

### Previous Migration Systems (Removed)

The project previously had 3 coexisting migration systems from organic growth:

1. **`database/migrations/*.sql`** — 13 incremental SQL files (removed 2026-02-16, consolidated into schema.sql)
2. **Root `migrations/*.sql`** — 4 orphaned SQL files (removed 2026-02-16)
3. **`schema_migrations` table** — dead migration tracking table (removed from schema.sql 2026-02-16)

Supporting code also removed:
- `ensure_migration_tracking()`, `add_organization()`, `setup_initial_data()`, `verify_index_performance()` from db_setup.py
- `management/railway_schema_migration.py`, `management/verify_migration.py`, `management/drop_unused_indexes.py`
- CI step that ran `database/migrations/*.sql` after schema.sql

### Evolution Timeline

- **2024-06-07**: Production-ready availability management added
- **2025-05-31**: Cleanup and standardization (dogs -> animals)
- **2025-07-09**: Migration files first consolidated into schema.sql
- **2026-02-16**: Full rationalization — single source of truth established, all orphaned files deleted

## Troubleshooting

### Common Issues

**"Table already exists" errors:**
- Normal behavior — schema.sql uses `CREATE TABLE IF NOT EXISTS`
- Safe to run multiple times

**Missing columns:**
- Drop and recreate database: `dropdb rescue_dogs && createdb rescue_dogs`
- Re-run: `python database/db_setup.py`

**Schema drift from production:**
- Query prod indexes: `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'animals';`
- Compare with schema.sql and update as needed
- Use Alembic in `migrations/railway/` for production schema changes
