# Debug Queries

This folder contains SQL queries for debugging and monitoring the Rescue Dog Aggregator database.

## ⚠️ Important: Multi-Language Properties

**Tierschutzverein Europa (TSV)** stores properties in German:
- `Beschreibung` instead of `description`
- `Rasse` instead of `breed`
- `Geschlecht` instead of `sex`
- etc.

All queries have been updated to handle both English and German field names. TSV is scraping data correctly - it's just in German!

## Files

### 00_quick_reference.sql
**Quick copy-paste queries for common debugging tasks**
- Total counts and basic stats
- Find specific dogs by name/ID
- Check for missing data
- Organization health checks
- Performance monitoring
- Template UPDATE statements (commented out for safety)

### breed_master.sql ⭐
**Complete breed data reference - ALL 8 breed columns explained**
- Comprehensive breed column documentation
- Coverage analysis for all breed fields
- Breed type and confidence distributions
- Primary vs secondary breed patterns
- Data quality checks and inconsistencies
- Organization breed profiles
- Breed standardization effectiveness

### todays_dogs.sql ⭐ NEW
**Daily scraping quality check for all dogs added today**
- Summary stats with data completeness
- Detailed view with quality indicators (✅/❌/⚠️)
- Organization breakdown showing language (EN/DE)
- Issue finder for missing data
- **Important**: Handles both English and German fields (TSV uses "Beschreibung" not "description")

### properties_analysis.sql ⭐ NEW
**Understanding the properties JSONB field across organizations**
- Property keys by organization
- German field translations (for TSV)
- Sample properties from each org
- Multi-language field coverage
- Shows that TSV stores German keys (Beschreibung, Rasse, Katzentest, etc.)

### 01_data_coverage.sql  
**Overall data quality and completeness metrics**
- Field coverage percentages
- Missing critical data identification
- Availability confidence distribution
- Organization-level data completeness

### 02_breed_analysis.sql
**Comprehensive breed data inspection**
- Breed type and confidence distributions
- Standardization effectiveness metrics
- Organization breed diversity profiles
- Data quality issues in breed fields
- Top breeds by frequency

### 03_scraping_health.sql
**Monitor scraping operations and data freshness**
- Recent scrape activity (last 7 days)
- Organization scraping health metrics
- Data freshness by organization
- Error tracking and debugging
- Dogs disappearing from scrapes
- Daily scraping summary

### 04_individual_dogs.sql
**Detailed queries for debugging specific dogs**
- Find dogs by name (partial match)
- Complete dog profile inspection
- JSON properties exploration
- Recently added dogs
- Data anomaly detection
- Potential duplicate detection
- Profiler data field exploration

### 05_profiler_status.sql (UPDATED)
**AI dog profiling status and quality**
- Profiler coverage stats
- Organization-level profiling metrics
- Quality score distributions
- Model usage analysis
- Confidence scores by field
- Dogs needing profiling
- Recent profiling activity

### 06_organization_analysis.sql
**Deep dive into organization-specific patterns**
- Organization summary dashboard
- Data quality scorecards
- External ID pattern analysis
- Scraping performance metrics
- Age and size distributions
- Performance benchmarking

## Usage

### With pgweb (current setup)
1. Start pgweb: `npm run db:local` or `npm run db:prod`
2. Copy queries from these files
3. Paste and run in pgweb interface

### With TablePlus (recommended)
1. Save connection profiles for local and production
2. Use "SQL Editor" tab
3. Can save queries as snippets within TablePlus

### With psql
```bash
# Run entire file
psql -d rescue_dogs -f queries/debug/00_quick_reference.sql

# Run specific query
psql -d rescue_dogs -c "SELECT COUNT(*) FROM animals WHERE active = true;"
```

### With VS Code
1. Install PostgreSQL extension
2. Configure connection in settings
3. Open .sql files and run with Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux)

## Common Debugging Workflows

### 1. Check if today's scrapes ran
```sql
-- From 00_quick_reference.sql - Today's scraping activity
```

### 2. Investigate missing dogs
```sql
-- From 03_scraping_health.sql - Dogs disappearing section
```

### 3. Debug specific dog data
```sql
-- From 04_individual_dogs.sql - Change name/ID in WHERE clause
```

### 4. Monitor data quality
```sql
-- From 01_data_coverage.sql - Run field completeness queries
```

### 5. Check breed normalization
```sql
-- From 02_breed_analysis.sql - Breed data quality issues
```

## Safety Notes

- All UPDATE/DELETE statements are commented out
- Always use WHERE clauses when modifying data
- Test on local database first
- Keep production database read-only when possible

## Performance Tips

- Most queries use existing indexes
- Limit results when exploring large datasets
- Use EXPLAIN ANALYZE for slow queries
- Check 00_quick_reference.sql for database size monitoring
