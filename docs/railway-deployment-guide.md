# Railway Database Deployment Guide

## Overview

This guide provides complete instructions for deploying the Rescue Dog Aggregator to Railway (PostgreSQL database) with ongoing synchronization capabilities. The system includes comprehensive database management, migration tools, and data synchronization features.

## System Architecture

### Components

1. **Connection Management** (`services/railway/connection.py`)
   - SQLAlchemy-based Railway database connections
   - Connection pooling with retry logic
   - Context managers for safe session handling
   - Environment variable configuration

2. **Migration System** (`services/railway/migration.py`)
   - Alembic-based database migrations
   - Automatic configuration generation
   - Migration creation and execution
   - Status tracking and dry-run capabilities

3. **Data Synchronization** (`services/railway/sync.py`)
   - Full data sync from local to Railway database (all 5 tables)
   - Batch processing for large datasets (organizations, animals, scrape_logs, service_regions)
   - Schema validation with automatic column order verification
   - Independent transaction processing for each table
   - Bulk ID mapping to prevent N+1 query performance issues
   - Data integrity validation
   - Incremental sync detection

4. **CLI Management** (`management/railway_commands.py`)
   - Complete command-line interface
   - Commands: `test-connection`, `migrate`, `sync`, `status`, `setup`
   - Dry-run support for all operations
   - User-friendly progress indicators

### Test Coverage

- Comprehensive test suite covering all Railway functionality
- Connection management tests
- Migration system tests  
- Data synchronization tests
- CLI command tests
- Integration tests

## Prerequisites

### 1. Railway Account Setup

1. **Create Railway Account**
   ```bash
   # Visit https://railway.app and create an account
   # Choose the PostgreSQL database service
   ```

2. **Create PostgreSQL Database**
   - In Railway dashboard, click "New Project"
   - Select "Provision PostgreSQL"
   - Note the generated database URL

3. **Get Database Connection URL**
   - Go to your PostgreSQL service in Railway
   - Click "Connect" tab
   - Copy the "DATABASE_URL" (starts with `postgresql://`)

### 2. Local Environment Setup

1. **Set Environment Variable**
   ```bash
   # Add to your .env file or export directly
   export RAILWAY_DATABASE_URL="postgresql://username:password@host:port/database"
   ```

2. **Install Dependencies**
   ```bash
   # Ensure SQLAlchemy and Alembic are installed
   pip install sqlalchemy>=2.0.0 alembic>=1.13.0
   ```

3. **Verify Local Database**
   ```bash
   # Ensure your local database has data to sync
   python management/config_commands.py list
   ```

## Railway CLI Commands

### Command Reference

#### 1. Test Connection
```bash
python -m management.railway_commands test-connection
```
- **Purpose**: Verify Railway database connectivity
- **Exit Codes**: 0 (success), 1 (failure)
- **Required**: `RAILWAY_DATABASE_URL` environment variable

#### 2. Database Migration
```bash
# Run migrations
python -m management.railway_commands migrate

# Dry run (preview changes)
python -m management.railway_commands migrate --dry-run
```
- **Purpose**: Set up Railway database schema
- **Features**: 
  - Automatic Alembic configuration generation
  - Creates `migrations/railway/` directory structure
  - Generates initial migration from local schema

#### 3. Data Synchronization
```bash
# Full sync (default incremental mode)
python -m management.railway_commands sync

# Explicit incremental sync
python -m management.railway_commands sync --mode incremental

# Rebuild sync (clears Railway, pushes all local data)
python -m management.railway_commands sync --mode rebuild --confirm-destructive

# Force sync (bypasses all validation - emergency use only)
python -m management.railway_commands sync --mode force --confirm-destructive

# Dry run (preview changes)
python -m management.railway_commands sync --dry-run

# Skip validation
python -m management.railway_commands sync --skip-validation
```
- **Purpose**: Sync data from local database to Railway
- **Sync Modes**:
  - **incremental** (default): Local count must be ≥ Railway count for each table
  - **rebuild**: Clears Railway tables, pushes all local data (requires safety thresholds)
  - **force**: Bypasses all validation checks (emergency use only)
- **Features**:
  - Batch processing (100 records per batch by default)
  - Organizations synced first (animals reference organizations)
  - Automatic data integrity validation
  - Conflict resolution with UPSERT operations (100% idempotent)
  - Can be run multiple times per day without issues
  - Safety thresholds prevent accidental data loss

#### 4. Status Monitoring
```bash
python -m management.railway_commands status
```
- **Purpose**: Check sync status and data counts
- **Displays**:
  - Railway connection status
  - Local vs Railway record counts
  - Data mismatch detection
  - Sync recommendations

#### 5. Complete Setup
```bash
# Full setup (migration + sync)
python -m management.railway_commands setup

# Dry run setup
python -m management.railway_commands setup --dry-run
```
- **Purpose**: Complete Railway deployment (migration + initial sync)
- **Process**:
  1. Database schema migration
  2. Initial data synchronization
  3. Data integrity validation
  4. Final status report

## Deployment Workflow

### Initial Deployment

1. **Setup Railway Account & Database**
   ```bash
   # Follow Railway account setup instructions above
   export RAILWAY_DATABASE_URL="your_railway_database_url"
   ```

2. **Test Connection**
   ```bash
   python -m management.railway_commands test-connection
   # Expected: ✅ Railway connection successful
   ```

3. **Complete Setup**
   ```bash
   python -m management.railway_commands setup
   # This runs migration + initial data sync
   ```

4. **Verify Deployment**
   ```bash
   python -m management.railway_commands status
   # Expected: ✅ Local and Railway databases are in sync
   ```

### Ongoing Sync Operations

#### Typical Week-to-Week Usage

**Daily Operations** (Automated/As Needed):
```bash
# Quick status check
python -m management.railway_commands status

# If data mismatches detected, sync immediately  
python -m management.railway_commands sync
```

**Weekly Operations** (Recommended):
```bash
# Monday: Full status review
python -m management.railway_commands status

# Wednesday: Preventive sync (if needed)
python -m management.railway_commands sync --dry-run
python -m management.railway_commands sync

# Friday: End-of-week validation
python -m management.railway_commands status
```

**After Major Data Updates** (Post-Scraping):
```bash
# After running scrapers or config updates
python management/config_commands.py sync    # Update local data first
python -m management.railway_commands sync   # Then sync to Railway (100% idempotent)
python -m management.railway_commands status # Verify 100% match
```

**Data Recovery Scenarios**:
```bash
# If you accidentally cleared local data and need fresh start from Railway
python -m management.railway_commands sync --mode rebuild --confirm-destructive

# If sync validation is blocking legitimate operations (emergency only)
python -m management.railway_commands sync --mode force --confirm-destructive
```

**High-Frequency Sync Support**:
The system is designed to handle frequent synchronization:
- Can be run 100+ times per day without issues
- All operations are 100% idempotent
- No data corruption or duplication occurs
- Perfect for automated workflows or frequent manual updates

**Typical Data Patterns**:
- **Organizations**: 8 records (stable, rarely changes)
- **Animals**: 800+ records (high turnover, daily updates)
- **Animal_images**: 200+ records (grows with new animals)
- **Scrape_logs**: 300+ records (grows continuously)
- **Service_regions**: 100+ records (stable, occasional updates)

### Sync Mode Details

#### Incremental Mode (Default)
**Usage**: `python -m management.railway_commands sync` or `--mode incremental`

**Validation Rules**:
- Local record count must be ≥ Railway record count for each table
- Prevents data loss when Railway has more recent data
- Best for routine syncing after local updates

**Use Cases**:
- Daily sync operations
- After scraping new animals
- Regular maintenance sync

#### Rebuild Mode
**Usage**: `python -m management.railway_commands sync --mode rebuild --confirm-destructive`

**Validation Rules**:
- Local data must meet safety thresholds:
  - Organizations: ≥5 records
  - Animals: ≥50 records  
  - Scrape_logs: ≥10 records
  - Service_regions: ≥1 record
  - Animal_images: ≥0 records (can be empty)
- Clears ALL Railway tables before pushing local data
- **DESTRUCTIVE**: Permanently deletes Railway data

**Use Cases**:
- After intentionally clearing local data for fresh start
- When local database structure has changed significantly
- Database corruption recovery

#### Force Mode (Emergency Only)
**Usage**: `python -m management.railway_commands sync --mode force --confirm-destructive`

**Validation Rules**:
- **BYPASSES ALL VALIDATION**
- No safety checks or data integrity validation
- **DANGEROUS**: Can cause data loss or corruption

**Use Cases**:
- Emergency situations when validation is incorrectly blocking sync
- Database recovery when normal validation fails
- Should only be used by experienced administrators

### Problem-Specific Examples  

#### Scenario: "I cleared scrape_logs locally and now sync fails"
**Problem**: Local scrape_logs=88, Railway=413, sync fails with validation error

**Solution**:
```bash
# Option 1: Use rebuild mode (recommended)
python -m management.railway_commands sync --mode rebuild --confirm-destructive

# Option 2: Force mode (if rebuild validation fails)  
python -m management.railway_commands sync --mode force --confirm-destructive

# Verify the sync worked
python -m management.railway_commands status
```

**Explanation**: Clearing local data creates a count mismatch. Rebuild mode safely clears Railway and repopulates with current local data.

#### Regular Data Sync
```bash
# Check current status
python -m management.railway_commands status

# Sync new/updated data  
python -m management.railway_commands sync

# Verify sync completed successfully
python -m management.railway_commands status
```

#### Data Validation
```bash
# Preview what would be synced
python -m management.railway_commands sync --dry-run

# Check for data mismatches
python -m management.railway_commands status
```

## Configuration Details

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `RAILWAY_DATABASE_URL` | Yes | Complete Railway PostgreSQL connection URL | `postgresql://user:pass@host:5432/db` |
| `RAILWAY_CONNECTION_TIMEOUT` | No | Connection timeout in seconds (default: 30) | `60` |

### Database Schema

The system syncs the following tables from local to Railway:

1. **organizations** (8 records typically)
   - Core organization data with explicit ID preservation
   - Configuration metadata
   - Social media links  
   - Shipping information

2. **animals** (800+ records typically)
   - Complete animal profiles with explicit ID preservation
   - Adoption status
   - Primary image URLs
   - Availability tracking

3. **~~animal_images~~ (REMOVED)** - Multi-image functionality removed in favor of single primary_image_url
   - Additional animal photos with explicit ID preservation
   - Primary/secondary image flags
   - Original image URLs

4. **scrape_logs** (300+ records typically)
   - Scraping operation history with explicit ID preservation
   - Performance metrics
   - Error tracking

5. **service_regions** (100+ records typically)
   - Organization service areas with explicit ID preservation
   - Country/region mappings
   - Service availability status

### Sync Behavior

- **ID Preservation**: All tables maintain exact ID values from local database (critical fix applied 2025-07-13)
- **Schema Validation**: Pre-sync verification ensures Railway tables match local schema exactly
- **Conflict Resolution**: Uses `ON CONFLICT ... DO UPDATE` (UPSERT)
- **Batch Size**: 100 records per batch (configurable)
- **Transaction Isolation**: Each table syncs in independent transactions for partial success capability
- **Bulk Operations**: Organization ID mapping built in bulk to prevent N+1 query performance issues
- **Validation**: Automatic record count comparison post-sync
- **Dependencies**: Organizations synced before animals, then scrape_logs, and service_regions
- **Safety**: All operations support dry-run mode

### Recent Critical Fixes (2025-07-14)

**Issue Resolved**: Primary key violations on repeated sync runs
- **Problem**: `scrape_logs` tables used plain INSERT statements without conflict handling, causing primary key violations when data already existed in Railway (animal_images table was removed in refactoring)
- **Solution**: Added `ON CONFLICT (id) DO UPDATE SET...` clauses to make all INSERT statements idempotent
- **Impact**: Sync now works perfectly even when run 100+ times per day, always syncing latest local database state to Railway
- **Tables Fixed**: scrape_logs (organizations, animals, service_regions already had proper UPSERT; animal_images table was removed)
- **Verification**: Manual row-by-row testing confirmed 100% data integrity and schema match

## Troubleshooting

### Common Issues

#### 1. Connection Failures
```bash
❌ RAILWAY_DATABASE_URL environment variable not set
```
**Solution**: Set the environment variable with your Railway database URL

```bash
❌ Railway connection failed
```
**Solutions**:
- Verify Railway database URL is correct
- Check Railway service is running
- Verify network connectivity
- Check Railway dashboard for service status

#### 2. Migration Issues
```bash
❌ Railway database migration failed
```
**Solutions**:
- Ensure Railway database is empty for initial setup
- Check Alembic configuration in `migrations/railway/`
- Verify local database schema is valid
- Run with `--dry-run` first to preview changes

#### 3. Sync Failures
```bash
❌ Railway data sync failed
⚠ Data mismatch detected
```
**Solutions**:
- Check sync logs for specific errors
- Verify data integrity in local database
- Run sync with `--dry-run` to preview
- Check Railway database constraints
- Ensure organizations exist before syncing animals

**Previous Issue (RESOLVED 2025-07-14)**: Primary key violations
```bash
❌ ~~duplicate key value violates unique constraint "animal_images_pkey"~~ (RESOLVED: animal_images table removed)
❌ duplicate key value violates unique constraint "scrape_logs_pkey"
```
**Fix Applied**: Added ON CONFLICT DO UPDATE clauses for 100% idempotency. Sync now works perfectly on repeated runs.

### Debugging Commands

```bash
# Test connection first
python -m management.railway_commands test-connection

# Check current status
python -m management.railway_commands status

# Preview operations
python -m management.railway_commands migrate --dry-run
python -m management.railway_commands sync --dry-run

# Check local data
python management/config_commands.py list
```

### Log Analysis

Monitor logs for these patterns:

**Success Indicators**:
```
✅ Railway connection successful
✅ Railway database migration completed successfully
✅ Railway data sync completed successfully
✅ Local and Railway databases are in sync
```

**Warning Indicators**:
```
⚠ Data mismatch detected
⚠ Railway database has more records than local
```

**Error Indicators**:
```
❌ Railway connection failed
❌ Railway database migration failed
❌ Railway data sync failed
```

## Advanced Usage

### Custom Batch Sizes

For large datasets, you can optimize sync performance:

```python
# In services/railway/sync.py
# Modify default batch size from 100 to larger value
sync_animals_to_railway(batch_size=500)
```

### Migration Customization

Custom migration messages:
```python
# In services/railway/migration.py
create_initial_migration(message="Custom deployment schema")
```

### Connection Tuning

Adjust connection pool settings in `services/railway/connection.py`:
```python
engine = create_engine(
    database_url,
    pool_size=10,      # Increase for high concurrency
    max_overflow=20,   # Allow more overflow connections
    pool_timeout=60,   # Longer timeout for busy periods
)
```

## Security Considerations

1. **Environment Variables**: Never commit `RAILWAY_DATABASE_URL` to version control
2. **Alembic Configuration**: 
   - `migrations/railway/alembic.ini` is gitignored to prevent credential exposure
   - The file uses "test" placeholder and loads actual database URL from environment variable
   - Never commit real database URLs to version control
3. **Connection Security**: Railway enforces SSL connections by default
4. **Access Control**: Use Railway's built-in access controls
5. **Data Validation**: All sync operations include integrity validation
6. **Error Handling**: Sensitive information is not logged in error messages

## Maintenance

### Regular Tasks

1. **Monitor Sync Status**
   ```bash
   # Weekly status check
   python -m management.railway_commands status
   ```

2. **Data Integrity Verification**
   ```bash
   # Before/after major data updates
   python -m management.railway_commands sync --dry-run
   python -m management.railway_commands sync
   python -m management.railway_commands status
   ```

3. **Migration Updates**
   ```bash
   # When schema changes are needed
   python -m management.railway_commands migrate --dry-run
   python -m management.railway_commands migrate
   ```

### Performance Monitoring

- Monitor Railway dashboard for database performance
- Check sync operation logs for batch processing times
- Adjust batch sizes for optimal performance
- Monitor connection pool usage

## Support

### Test Coverage Verification

All Railway functionality is covered by comprehensive tests:

```bash
# Run all Railway tests
pytest tests/railway/ -v

# Run specific test categories
pytest tests/railway/test_connection.py -v    # Connection tests
pytest tests/railway/test_migration.py -v    # Migration tests
pytest tests/railway/test_sync.py -v         # Sync tests
pytest tests/railway/test_cli.py -v          # CLI tests
```

### Documentation Updates

This system is designed to be self-documenting through:
- Comprehensive CLI help: `python -m management.railway_commands --help`
- Individual command help: `python -m management.railway_commands migrate --help`
- Status reporting: `python -m management.railway_commands status`

### Getting Help

1. **CLI Help**: All commands support `--help` flag
2. **Test Suite**: Run tests to verify system functionality
3. **Status Command**: Use for current system state
4. **Dry Run**: Use `--dry-run` to preview operations safely

---

**System Status**: Production-ready with 100% idempotent sync operations
**Deployment Method**: Environment variable configuration with user setup  
**Sync Capability**: High-frequency sync operations (100+ times per day supported)
**Architecture**: TDD-compliant with comprehensive test coverage
**Data Integrity**: Verified through manual row-by-row testing (2025-07-14)