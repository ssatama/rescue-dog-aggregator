# Railway Database Sync Feature

## Quick Start

**⚠️ Important**: Commands must be run from the project root directory.

### Essential Commands

```bash
# Check Railway connection and data sync status
uv run python management/railway_commands.py status

# Test Railway connection
uv run python management/railway_commands.py test-connection

# Run database migrations
uv run python management/railway_commands.py migrate
uv run python management/railway_commands.py migrate --dry-run  # Preview changes

# Sync data (incremental mode - default)
uv run python management/railway_commands.py sync
uv run python management/railway_commands.py sync --dry-run     # Preview sync

# Sync modes
uv run python management/railway_commands.py sync --mode incremental              # Default: safe updates
uv run python management/railway_commands.py sync --mode rebuild --confirm-destructive  # Complete rebuild
uv run python management/railway_commands.py sync --mode force --confirm-destructive    # Emergency bypass

# Sync options
uv run python management/railway_commands.py sync --skip-validation  # Skip post-sync checks
uv run python management/railway_commands.py sync --skip-indexes     # Skip index sync

# Complete setup (migration + initial sync)
uv run python management/railway_commands.py setup
uv run python management/railway_commands.py setup --dry-run        # Preview setup
```

### Command Arguments Reference

| Command | Arguments | Description |
|---------|-----------|-------------|
| `status` | None | Shows connection status and data counts |
| `test-connection` | None | Tests Railway database connection |
| `migrate` | `--dry-run` | Runs Alembic migrations |
| `sync` | `--dry-run`<br>`--skip-validation`<br>`--skip-indexes`<br>`--mode [incremental\|rebuild\|force]`<br>`--confirm-destructive` | Syncs local data to Railway |
| `setup` | `--dry-run` | Complete setup: migration + sync |

## Overview

The Railway Database Sync is a critical infrastructure component that synchronizes data from the local development database to the production Railway database. It provides a robust, multi-phase synchronization process with strong safety mechanisms and data integrity guarantees.

**Key Benefits:**
- 🔄 **Multi-Phase Sync**: 5-phase approach ensures correct ordering and dependencies
- 🛡️ **Safety Mechanisms**: Multiple validation layers prevent data corruption
- 🗺️ **ID Mapping**: Automatic translation between local and production IDs
- 🎯 **Transaction Safety**: Independent transactions prevent cascade failures
- 📊 **Schema Validation**: Ensures database structure compatibility

## Architecture

### System Flow

```mermaid
graph TD
    A[Start Sync Process] --> B[Phase 1: Schema Validation]
    B --> C{Schemas Match?}
    C -->|No| D[Abort: Schema Mismatch]
    C -->|Yes| E[Phase 2: Index Sync]
    E --> F[Phase 3: Organization Sync]
    F --> G[Phase 4: Build ID Mapping]
    G --> H[Phase 5: Dependent Tables]
    H --> I[Post-Sync Validation]
    I --> J{Integrity Check}
    J -->|Pass| K[Success]
    J -->|Fail| L[Rollback & Alert]
```

### Components

#### 1. **Main Sync Module** (`services/railway/sync.py`)
Core orchestrator that manages the entire synchronization pipeline.

**Key Features:**
- 5-phase synchronization workflow
- Organization ID mapping for foreign keys
- Chunked processing for memory efficiency
- Comprehensive validation at each phase
- Support for INCREMENTAL, REBUILD, and FORCE modes

#### 2. **Connection Manager** (`services/railway/connection.py`)
Handles database connections with pooling and safety mechanisms.

**Connection Configuration:**
```python
# Connection pooling parameters
pool_size: 5          # Base connection pool
max_overflow: 10      # Additional connections when needed
pool_timeout: 30      # Connection wait timeout (seconds)
pool_recycle: 3600    # Recycle connections hourly
```

#### 3. **Migration Manager** (`services/railway/migration.py`)
Manages Alembic-based schema migrations with file locking.

**Features:**
- Initial schema from `database/schema.sql`
- File-based locking to prevent race conditions
- Migration status tracking
- 120-second lock timeout protection

#### 4. **Index Synchronization** (`services/railway/index_sync.py`)
Ensures database indexes match between environments.

**Capabilities:**
- Automatic index difference detection
- Primary key and unique constraint preservation
- Railway compatibility adjustments (removes CONCURRENTLY)
- Table statistics updates post-sync

## Configuration

### Environment Variables
```bash
# Required for Railway connection
RAILWAY_DATABASE_URL=postgresql://user:pass@host:port/database

# Optional configuration
RAILWAY_SYNC_MODE=INCREMENTAL  # INCREMENTAL|REBUILD|FORCE
RAILWAY_SYNC_BATCH_SIZE=1000   # Records per batch
RAILWAY_SYNC_TIMEOUT=300       # Sync timeout in seconds
```

### Safety Thresholds
Minimum record requirements before sync (prevents accidental data wipes):

```python
SAFETY_THRESHOLDS = {
    "organizations": 5,    # At least 5 organizations
    "animals": 50,         # At least 50 animals
    "scrape_logs": 10,     # At least 10 logs
    "service_regions": 1   # At least 1 service region
}
```

## Sync Modes

### INCREMENTAL (Default)
Safe mode for regular syncs:
- Requires local_count ≥ railway_count
- Updates existing records, adds new ones
- No data deletion
- Fastest performance

### REBUILD
Complete rebuild of Railway database:
- Clears Railway data first (with safety checks)
- Requires minimum thresholds met
- Full data replacement
- Use for structural changes

### FORCE
Emergency bypass mode:
- Skips all validation checks
- Use only when absolutely necessary
- Logs warnings for audit trail
- Manual verification recommended

## Implementation Details

### 5-Phase Sync Process

#### Phase 1: Schema Validation
Validates database structure compatibility:
```python
# Column-by-column comparison
- Column names match
- Data types compatible
- Null constraints aligned
- Default values consistent
```

#### Phase 2: Index Synchronization
Syncs performance-critical indexes:
```python
# Index sync process
1. Fetch local indexes
2. Fetch Railway indexes
3. Identify differences
4. Drop obsolete Railway indexes
5. Create missing indexes
6. Update table statistics
```

#### Phase 3: Organization Sync
Foundation table with special handling:
```python
# Chunked processing (1000 records/batch)
INSERT INTO organizations (...) VALUES (...)
ON CONFLICT (config_id) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = EXCLUDED.updated_at
```

#### Phase 4: ID Mapping
Critical translation layer:
```python
# Build mapping dictionary
local_org_id -> railway_org_id

# Optimized with bulk queries
SELECT id, config_id FROM organizations
WHERE config_id IN (batch_of_100_config_ids)
```

#### Phase 5: Dependent Tables
Syncs tables with foreign keys:

**Animals Table:**
```python
# Batch processing (100 records/batch)
# Uses ID mapping for organization_id
INSERT INTO animals (...) VALUES (...)
ON CONFLICT (external_id, organization_id) DO UPDATE
```

**Service Regions Table:**
```python
# Country-based deduplication
INSERT INTO service_regions (...) VALUES (...)
ON CONFLICT (organization_id, country) DO UPDATE
```

### Data Transformations

**JSON Field Handling:**
- `properties` → JSON serialization
- `social_media` → JSON serialization
- `dog_profiler_data` → JSON serialization
- `adoption_check_data` → JSON serialization

**Datetime Handling:**
- ISO format conversion
- UTC timezone enforcement
- Null-safe processing

### Transaction Management

Each table uses independent transactions:
```python
with railway_session() as session:
    try:
        # Sync operations for single table
        session.commit()  # Success
    except Exception as e:
        session.rollback()  # Isolated failure
        # Continue with next table
```

### Memory Management

**Chunking Strategy:**
- Organizations: 1000 records/chunk
- Animals: 100 records/batch (complex JSON fields)
- Scrape logs: 500 records/batch
- Warning at 10,000+ animals (memory pressure)

## Usage

### CLI Commands

```bash
# Check status before syncing
uv run python management/railway_commands.py status

# Standard incremental sync
uv run python management/railway_commands.py sync

# Rebuild mode (complete replacement)
uv run python management/railway_commands.py sync --mode rebuild --confirm-destructive

# Force mode (emergency bypass)
uv run python management/railway_commands.py sync --mode force --confirm-destructive

# Dry run to preview changes
uv run python management/railway_commands.py sync --dry-run

# Skip post-sync validation (faster but less safe)
uv run python management/railway_commands.py sync --skip-validation

# Skip index synchronization
uv run python management/railway_commands.py sync --skip-indexes
```

### Programmatic Usage

```python
from services.railway.sync import sync_all_data_to_railway

# Basic sync with default settings
result = sync_all_data_to_railway()

# Custom configuration
result = sync_all_data_to_railway(
    mode='INCREMENTAL',
    validate=True,
    verbose=True
)

# Check result
if result['success']:
    print(f"Synced {result['total_records']} records")
else:
    print(f"Sync failed: {result['error']}")
```

## Error Handling

### Common Errors and Solutions

**1. Schema Mismatch**
```
Error: Local and Railway schemas don't match
Solution: Run migrations on Railway database first
```

**2. Connection Pool Exhaustion**
```
Error: QueuePool limit of size 5 overflow 10 reached
Solution: Check for connection leaks, increase pool size
```

**3. Foreign Key Violations**
```
Error: violates foreign key constraint
Solution: Ensure Phase 3 (orgs) completes before Phase 5
```

**4. Memory Issues**
```
Warning: Large dataset (10000+ animals)
Solution: Reduce batch sizes or implement cursor-based streaming
```

### Retry Mechanism

Exponential backoff for transient failures:
```python
retry_delay = 2 ** attempt  # 2, 4, 8 seconds
max_retries = 3
```

## Monitoring & Logging

### Key Metrics to Monitor

**Performance Metrics:**
- Total sync duration
- Records per second
- Memory usage peaks
- Connection pool utilization

**Data Integrity Metrics:**
- Pre/post sync counts
- ID mapping success rate
- Validation pass/fail ratio
- Conflict resolution counts

### Sentry Integration

The sync process includes Sentry monitoring for:
- Schema validation failures
- Connection errors
- Transaction rollbacks
- Performance anomalies
- Safety threshold violations

### Log Levels

```python
INFO: Phase transitions, record counts
WARNING: Safety threshold checks, memory pressure
ERROR: Transaction failures, schema mismatches
CRITICAL: Data loss risk, corruption detected
```

## Testing

### Test Coverage

```bash
# Unit tests for sync logic
uv run pytest tests/services/test_railway_sync.py

# Connection management tests
uv run pytest tests/services/test_railway_connection.py

# Migration tests
uv run pytest tests/services/test_railway_migration.py

# Integration tests
uv run pytest tests/integration/test_railway_full_sync.py
```

### Test Scenarios
- ✅ Incremental sync with new records
- ✅ Rebuild mode with safety checks
- ✅ Force mode bypass
- ✅ Schema validation failures
- ✅ ID mapping correctness
- ✅ Transaction isolation
- ✅ Retry mechanism
- ✅ Connection pool management
- ✅ Large dataset handling
- ✅ Conflict resolution

## Security Considerations

### SQL Injection Prevention
- Whitelisted table names validated against fixed list
- Parameterized queries for all data values
- Index/table name validation (alphanumeric + underscore only)

### Connection Security
- SSL/TLS enforced for Railway connection
- Credentials stored in environment variables
- Connection string never logged
- Automatic connection recycling

### Data Protection
- Read-only operations on local database
- Transaction boundaries for atomicity
- Validation before and after sync
- Audit logging for all operations

## Performance Optimization

### Current Optimizations
- Chunked processing to manage memory
- Bulk INSERT with ON CONFLICT
- Connection pooling with recycling
- Index-optimized queries
- Parallel ID mapping lookups

### Recommended Improvements

**1. Streaming for Large Datasets**
```python
# Use server-side cursors for 10,000+ records
with connection.cursor(name='sync_cursor') as cursor:
    cursor.itersize = 1000
    cursor.execute(query)
    for batch in cursor:
        process_batch(batch)
```

**2. Parallel Table Processing**
```python
# Process independent tables concurrently
from concurrent.futures import ThreadPoolExecutor

with ThreadPoolExecutor(max_workers=3) as executor:
    futures = [
        executor.submit(sync_scrape_logs),
        executor.submit(sync_service_regions),
        executor.submit(sync_metrics)
    ]
```

**3. Differential Sync**
```python
# Only sync changed records using updated_at
WHERE updated_at > last_sync_timestamp
```

## Troubleshooting

### Diagnostic Commands

```bash
# Check connection and data sync status
uv run python management/railway_commands.py status

# Test Railway connection
uv run python management/railway_commands.py test-connection

# Validate schemas (dry run)
uv run python management/railway_commands.py migrate --dry-run

# Preview sync without making changes
uv run python management/railway_commands.py sync --dry-run

# Complete diagnostic (preview full setup)
uv run python management/railway_commands.py setup --dry-run
```

### Common Issues

**Sync appears stuck:**
1. Check Railway database locks: `SELECT * FROM pg_locks;`
2. Monitor connection pool: Check for exhaustion
3. Review memory usage: Large dataset processing
4. Check network latency to Railway

**Data not appearing in Railway:**
1. Verify sync completed: Check logs for success message
2. Validate connection string: Ensure pointing to correct database
3. Check transaction commits: Look for rollback messages
4. Verify ID mapping: Ensure foreign keys translated correctly

**Performance degradation:**
1. Analyze index usage: `EXPLAIN ANALYZE` on slow queries
2. Check connection pool saturation
3. Review batch sizes: May need adjustment
4. Monitor Railway database CPU/memory

## Future Enhancements

### Planned Features
- 📊 Real-time sync progress dashboard
- 🔄 Incremental sync with change tracking
- 📈 Performance metrics collection
- 🔐 Encrypted credential management
- 🚀 Parallel table processing
- 📝 Sync history and rollback capability

### API Extensions
- REST endpoint for triggering sync
- WebSocket for real-time progress
- GraphQL for sync status queries
- Webhook notifications on completion

## Related Documentation

- [Database Schema](../reference/database-schema.md)
- [Deployment Guide](../guides/deployment.md)
- [Testing Strategy](../guides/testing.md)
- [Architecture Overview](../technical/architecture.md)

## Support

For issues with Railway database sync:
1. Check the [troubleshooting section](#troubleshooting)
2. Review test files for implementation examples
3. Monitor Sentry for error details
4. Check Railway database logs
5. Open an issue with sync logs and configuration