# Database Schema Management

## Current Architecture (2025-07-09)

### Schema-Only Approach

The project now uses **schema.sql as the single source of truth** for database setup. All database tables, columns, indexes, and constraints are defined in `/database/schema.sql`.

**Target Workflow:**
1. **Install everything** - `python database/db_setup.py`
2. **Run config sync** - `python management/config_commands.py sync`  
3. **Run scrapers** - `python management/config_commands.py run [org-id]`
4. **Result** - Database populated and everything working

### Schema Features

The current schema includes all production-ready features:

#### Core Tables
- **organizations** - Rescue organizations with metadata and configuration
- **animals** - Dogs available for adoption with standardized fields
- **animal_images** - Multiple images per animal
- **scrape_logs** - Detailed scraping metrics and monitoring
- **service_regions** - Geographic service areas per organization

#### Availability Management System
- `availability_confidence` - High/medium/low confidence scoring
- `last_seen_at` - Timestamp of last successful scrape
- `consecutive_scrapes_missing` - Counter for missing animals
- Automated stale data detection and confidence adjustment

#### Enhanced Metrics & Monitoring  
- `detailed_metrics` JSONB - Comprehensive scraping statistics
- `duration_seconds` - Performance tracking for each scrape
- `data_quality_score` - Quality assessment (0-1 range)
- GIN indexes for efficient JSONB queries

#### Configuration-Driven Architecture
- `config_id` - Links organizations to YAML configuration files
- `social_media` JSONB - Social media links and metadata
- `ships_to` JSONB - Countries organizations ship to
- `service_regions` - Structured geographic coverage

## Database Setup

### New Installation

```bash
# 1. Create database (if needed)
createdb rescue_dogs

# 2. Initialize schema and initial data
python database/db_setup.py

# 3. Sync organization configurations  
python management/config_commands.py sync

# 4. Verify setup
python management/config_commands.py list
```

### Development/Testing

```bash
# Create test database
createdb test_rescue_dogs

# Set testing environment
export TESTING=true

# Initialize test database
python database/db_setup.py

# Run tests to verify schema
pytest tests/ -v
```

## Schema Verification

### Check Core Tables

```sql
-- Verify all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Expected: animal_images, animals, organizations, scrape_logs, service_regions
```

### Check Availability System

```sql
-- Verify availability columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'animals'
  AND column_name IN ('availability_confidence', 'last_seen_at', 'consecutive_scrapes_missing');
```

### Check Enhanced Metrics

```sql  
-- Verify scrape logging columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'scrape_logs'
  AND column_name IN ('detailed_metrics', 'duration_seconds', 'data_quality_score');
```

### Check Indexes

```sql
-- Verify performance indexes
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('animals', 'scrape_logs', 'organizations')
ORDER BY tablename, indexname;
```

## Migration History (Archived)

### Previous Migration System (Removed 2025-07-09)

The project previously used incremental migration files that have been **completely removed** and consolidated into schema.sql:

- ❌ `001_add_duplicate_stale_detection.sql` - Availability tracking
- ❌ `002_add_detailed_metrics.sql` - Enhanced metrics  
- ❌ `003_add_config_support.sql` - Configuration support
- ❌ `003_add_missing_fields.sql` - Organization enhancement
- ❌ `scrape_sessions.sql` - Session tracking (unused)
- ❌ `database/archive/` directory - Legacy migration scripts

**All functionality is now in `database/schema.sql`** - No migration scripts needed.

### Evolution Timeline

- **2024-06-07**: Production-ready availability management added
- **2025-05-31**: Cleanup and standardization (dogs → animals)  
- **2025-07-09**: **Migration system removed** - schema.sql only approach

## Troubleshooting

### Common Issues

**"Table already exists" errors:**
- Normal behavior - schema.sql uses `CREATE TABLE IF NOT EXISTS`
- Safe to run multiple times

**Missing columns:**
- Drop and recreate database: `dropdb rescue_dogs && createdb rescue_dogs`
- Re-run: `python database/db_setup.py`

**Configuration sync issues:**
- Verify YAML files in `configs/organizations/`
- Run: `python management/config_commands.py validate`

### Validation Commands

```bash
# Test complete workflow
python database/db_setup.py && \
python management/config_commands.py sync && \
python management/config_commands.py run pets-in-turkey

# Check database state
psql rescue_dogs -c "SELECT COUNT(*) FROM organizations;"
psql rescue_dogs -c "SELECT COUNT(*) FROM animals;"
```