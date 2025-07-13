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
   - Batch processing for large datasets (organizations, animals, animal_images, scrape_logs, service_regions)
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

- **75 comprehensive tests** covering all Railway functionality
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
python management/railway_commands.py test-connection
```
- **Purpose**: Verify Railway database connectivity
- **Exit Codes**: 0 (success), 1 (failure)
- **Required**: `RAILWAY_DATABASE_URL` environment variable

#### 2. Database Migration
```bash
# Run migrations
python management/railway_commands.py migrate

# Dry run (preview changes)
python management/railway_commands.py migrate --dry-run
```
- **Purpose**: Set up Railway database schema
- **Features**: 
  - Automatic Alembic configuration generation
  - Creates `migrations/railway/` directory structure
  - Generates initial migration from local schema

#### 3. Data Synchronization
```bash
# Full sync
python management/railway_commands.py sync

# Dry run (preview changes)
python management/railway_commands.py sync --dry-run

# Skip validation
python management/railway_commands.py sync --skip-validation
```
- **Purpose**: Sync data from local database to Railway
- **Features**:
  - Batch processing (100 records per batch by default)
  - Organizations synced first (animals reference organizations)
  - Automatic data integrity validation
  - Conflict resolution with UPSERT operations

#### 4. Status Monitoring
```bash
python management/railway_commands.py status
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
python management/railway_commands.py setup

# Dry run setup
python management/railway_commands.py setup --dry-run
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
   python management/railway_commands.py test-connection
   # Expected: ✅ Railway connection successful
   ```

3. **Complete Setup**
   ```bash
   python management/railway_commands.py setup
   # This runs migration + initial data sync
   ```

4. **Verify Deployment**
   ```bash
   python management/railway_commands.py status
   # Expected: ✅ Local and Railway databases are in sync
   ```

### Ongoing Sync Operations

#### Typical Week-to-Week Usage

**Daily Operations** (Automated/As Needed):
```bash
# Quick status check
python management/railway_commands.py status

# If data mismatches detected, sync immediately  
python management/railway_commands.py sync
```

**Weekly Operations** (Recommended):
```bash
# Monday: Full status review
python management/railway_commands.py status

# Wednesday: Preventive sync (if needed)
python management/railway_commands.py sync --dry-run
python management/railway_commands.py sync

# Friday: End-of-week validation
python management/railway_commands.py status
```

**After Major Data Updates** (Post-Scraping):
```bash
# After running scrapers or config updates
python management/config_commands.py sync    # Update local data first
python management/railway_commands.py sync   # Then sync to Railway
python management/railway_commands.py status # Verify 100% match
```

**Typical Data Patterns**:
- **Organizations**: 8 records (stable, rarely changes)
- **Animals**: 800+ records (high turnover, daily updates)
- **Animal_images**: 200+ records (grows with new animals)
- **Scrape_logs**: 300+ records (grows continuously)
- **Service_regions**: 100+ records (stable, occasional updates)

#### Regular Data Sync
```bash
# Check current status
python management/railway_commands.py status

# Sync new/updated data  
python management/railway_commands.py sync

# Verify sync completed successfully
python management/railway_commands.py status
```

#### Data Validation
```bash
# Preview what would be synced
python management/railway_commands.py sync --dry-run

# Check for data mismatches
python management/railway_commands.py status
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

3. **animal_images** (200+ records typically)
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
- **Dependencies**: Organizations synced before animals, then animal_images, scrape_logs, and service_regions
- **Safety**: All operations support dry-run mode

### Recent Critical Fixes (2025-07-13)

**Issue Resolved**: Railway database schema incompatibility
- **Problem**: Railway tables had `id` columns with `default: None, nullable: NO` requiring explicit ID values
- **Solution**: Updated all sync functions to include `id` columns in SELECT and INSERT statements
- **Impact**: All 5 tables now sync correctly with 100% data integrity
- **Tables Fixed**: organizations, animals, animal_images, scrape_logs, service_regions
- **Performance**: Added bulk ID mapping to eliminate N+1 query bottlenecks

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

### Debugging Commands

```bash
# Test connection first
python management/railway_commands.py test-connection

# Check current status
python management/railway_commands.py status

# Preview operations
python management/railway_commands.py migrate --dry-run
python management/railway_commands.py sync --dry-run

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
2. **Connection Security**: Railway enforces SSL connections by default
3. **Access Control**: Use Railway's built-in access controls
4. **Data Validation**: All sync operations include integrity validation
5. **Error Handling**: Sensitive information is not logged in error messages

## Maintenance

### Regular Tasks

1. **Monitor Sync Status**
   ```bash
   # Weekly status check
   python management/railway_commands.py status
   ```

2. **Data Integrity Verification**
   ```bash
   # Before/after major data updates
   python management/railway_commands.py sync --dry-run
   python management/railway_commands.py sync
   python management/railway_commands.py status
   ```

3. **Migration Updates**
   ```bash
   # When schema changes are needed
   python management/railway_commands.py migrate --dry-run
   python management/railway_commands.py migrate
   ```

### Performance Monitoring

- Monitor Railway dashboard for database performance
- Check sync operation logs for batch processing times
- Adjust batch sizes for optimal performance
- Monitor connection pool usage

## Support

### Test Coverage Verification

All Railway functionality is covered by 75 comprehensive tests:

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
- Comprehensive CLI help: `python management/railway_commands.py --help`
- Individual command help: `python management/railway_commands.py migrate --help`
- Status reporting: `python management/railway_commands.py status`

### Getting Help

1. **CLI Help**: All commands support `--help` flag
2. **Test Suite**: Run tests to verify system functionality
3. **Status Command**: Use for current system state
4. **Dry Run**: Use `--dry-run` to preview operations safely

---

**System Status**: Production-ready with comprehensive test coverage
**Deployment Method**: Environment variable configuration with user setup
**Sync Capability**: On-demand sync operations as requested
**Architecture**: TDD-compliant with 75 passing tests