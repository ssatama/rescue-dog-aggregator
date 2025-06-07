# Database Migration History

## 2024-06-07: Production-Ready Availability Management
- **Migration 001**: `001_add_duplicate_stale_detection.sql`
  - Added availability tracking columns to `animals` table:
    - `availability_confidence` VARCHAR(20) DEFAULT 'high'
    - `last_seen_at` TIMESTAMP 
    - `consecutive_scrapes_missing` INTEGER DEFAULT 0
  - Created indexes for efficient querying
  - Updated existing records with default values
- **Migration 002**: `002_add_detailed_metrics.sql`
  - Enhanced `scrape_logs` table with production metrics:
    - `detailed_metrics` JSONB for comprehensive statistics
    - `duration_seconds` NUMERIC(10,2) for performance tracking
    - `data_quality_score` NUMERIC(3,2) for quality assessment
  - Added GIN indexes for JSONB queries
  - Constraints for quality score validation (0-1 range)

**Features Enabled**:
- Weekly scraping with stale data detection
- Automatic availability confidence scoring
- Partial failure detection and error recovery
- Enhanced monitoring and quality metrics
- API default filtering (available + high/medium confidence)

## 2025-05-31: Cleanup and Standardization
- Consolidated on `animals` and `animal_images` tables
- Removed legacy `dogs` and `dog_images` references
- Removed `/api/dogs` legacy endpoint
- Updated schema.sql to reflect current structure
- All tests passing
- Current state: 32 dogs, 1 organization (Pets in Turkey)

## Original Migration
- Started with `dogs` table
- Migrated to `animals` table for future extensibility
- Migration scripts archived in `database/archive/`

## Migration Application Guide

### For New Installations
```bash
# Apply schema
psql -d your_database < database/schema.sql

# Apply availability management (if not in schema)
psql -d your_database -f database/migrations/001_add_duplicate_stale_detection.sql
psql -d your_database -f database/migrations/002_add_detailed_metrics.sql
```

### For Existing Installations
```bash
# Check if migrations are needed
psql -d your_database -c "\d animals" | grep availability_confidence

# Apply if missing
psql -d your_database -f database/migrations/001_add_duplicate_stale_detection.sql
psql -d your_database -f database/migrations/002_add_detailed_metrics.sql
```

### For Test Database
```bash
# Ensure test database has availability features
DB_NAME=test_rescue_dogs psql -d test_rescue_dogs -f database/migrations/001_add_duplicate_stale_detection.sql
DB_NAME=test_rescue_dogs psql -d test_rescue_dogs -f database/migrations/002_add_detailed_metrics.sql
```

## Schema Verification

### Check Availability Columns
```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'animals' 
  AND column_name IN ('availability_confidence', 'last_seen_at', 'consecutive_scrapes_missing');
```

### Check Enhanced Metrics
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'scrape_logs' 
  AND column_name IN ('detailed_metrics', 'duration_seconds', 'data_quality_score');
```

### Verify Indexes
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('animals', 'scrape_logs') 
  AND indexname LIKE '%availability%' OR indexname LIKE '%metrics%';
```