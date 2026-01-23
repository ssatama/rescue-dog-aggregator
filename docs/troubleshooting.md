# Troubleshooting Guide

*Primary audience: Claude Code*

## Quick Fixes for Common Issues

### Backend Issues

#### Module Import Errors
```bash
# Fix: Ensure __init__.py files exist
touch utils/__init__.py management/__init__.py scrapers/__init__.py

# Fix: Install dependencies
uv sync
```

#### Database Connection Failed
```bash
# Check PostgreSQL is running
psql -U $USER -d postgres -c "SELECT 1;"

# Create database if missing
createdb rescue_dogs
createdb test_rescue_dogs

# Run migrations
uv run python database/db_setup.py
```

#### Tests Failing with Database Errors
```bash
# Ensure test database exists
createdb test_rescue_dogs

# Check TESTING environment variable
TESTING=true uv run pytest tests/api/test_animals_api.py -v
```

#### Scraper Not Finding Animals
```bash
# Check organization config
uv run python management/config_commands.py show [org-name]

# Test scraper in isolation
uv run python management/config_commands.py run [org-name] --test

# Check website changes
curl -I https://[organization-website]
```

### Frontend Issues

#### Build Failures
```bash
# Clean install
cd frontend
rm -rf node_modules .next pnpm-lock.yaml
pnpm install
pnpm build
```

#### Hydration Mismatch Errors
```javascript
// Ensure consistent server/client rendering
// Wrap dynamic content in useEffect or use suppressHydrationWarning
```

#### API Connection Issues
```bash
# Check environment variables
echo $NEXT_PUBLIC_API_URL

# Verify API is running
curl http://localhost:8000/api/health

# Check CORS settings
# Ensure frontend URL is in allowed origins
```

#### Test Failures
```bash
# Clear Jest cache
pnpm test -- --clearCache

# Run specific test
pnpm test DogCard

# Debug mode
pnpm test -- --detectOpenHandles --forceExit
```

### Deployment Issues

#### Railway Database Sync Failing
```bash
# Check connection
RAILWAY_DATABASE_URL=$RAILWAY_DATABASE_URL psql -c "SELECT 1;"

# Manual sync
uv run python management/railway_commands.py sync --force

# Check for migrations
uv run alembic -c migrations/railway/alembic.ini current
```

#### Environment Variables Missing
```bash
# Backend required vars
export DATABASE_URL="postgresql://user:pass@localhost/rescue_dogs"
export CLOUDINARY_URL="cloudinary://..."
export REDIS_URL="redis://localhost:6379"

# Frontend required vars
export NEXT_PUBLIC_API_URL="https://api.yourdomain.com"
export NEXT_PUBLIC_GOOGLE_ANALYTICS_ID="GA-..."
```

#### Production Build Timeout
```bash
# Increase memory limit
NODE_OPTIONS="--max-old-space-size=4096" pnpm build

# Build locally and deploy
pnpm build
# Upload .next folder
```

### Data Quality Issues

#### Duplicate Animals
```sql
-- Find duplicates
SELECT external_id, organization_id, COUNT(*) 
FROM animals 
GROUP BY external_id, organization_id 
HAVING COUNT(*) > 1;

-- Remove duplicates (keep latest)
DELETE FROM animals a1
WHERE updated_at < (
  SELECT MAX(updated_at) 
  FROM animals a2 
  WHERE a1.external_id = a2.external_id 
  AND a1.organization_id = a2.organization_id
);
```

#### Stale Data Detection
```bash
# Check for stale animals
uv run python monitoring/data_quality_monitor.py --check-stale

# Mark stale animals as unavailable
uv run python management/emergency_operations.py --reset-stale-data
```

#### Missing Standardized Fields
```bash
# Re-run standardization
uv run python management/config_commands.py standardize --all

# Check specific organization
uv run python monitoring/data_quality_monitor.py --org-id=26
```

### Performance Issues

#### Slow API Responses
```bash
# Check database indexes
psql -d rescue_dogs -c "\di"

# Analyze query performance
EXPLAIN ANALYZE SELECT * FROM animals WHERE ...;

# Enable query caching
export REDIS_URL="redis://localhost:6379"
```

#### High Memory Usage
```bash
# Check for memory leaks
uv run python -m memory_profiler scrapers/run_all.py

# Limit concurrent scrapers
uv run python management/config_commands.py run --max-concurrent=2
```

#### Frontend Bundle Too Large
```bash
# Analyze bundle
pnpm analyze

# Enable tree shaking
# Check next.config.js for optimization settings
```

## Debug Commands

### Backend Debugging
```bash
# Interactive shell
uv run python -i
>>> from api.database import get_db_connection
>>> conn = get_db_connection()
>>> cursor = conn.cursor()
>>> cursor.execute("SELECT COUNT(*) FROM animals")
>>> cursor.fetchone()

# Test specific endpoint
curl -X GET "http://localhost:8000/api/animals?limit=10"

# Check logs
tail -f logs/scraper.log
tail -f logs/api.log
```

### Frontend Debugging
```bash
# Development mode with verbose logging
DEBUG=* pnpm dev

# Check build output
pnpm build > build.log 2>&1

# Test production build locally
pnpm build && pnpm start
```

### Database Debugging
```sql
-- Check table sizes
SELECT 
  schemaname AS table_schema,
  tablename AS table_name,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Active connections
SELECT * FROM pg_stat_activity WHERE datname = 'rescue_dogs';

-- Lock monitoring
SELECT * FROM pg_locks WHERE NOT granted;
```

## Emergency Procedures

### Complete Reset
```bash
# WARNING: This will delete all data
dropdb rescue_dogs
dropdb test_rescue_dogs
createdb rescue_dogs
createdb test_rescue_dogs
uv run python database/db_setup.py
uv run python management/config_commands.py sync

# Frontend reset
cd frontend
rm -rf node_modules .next pnpm-lock.yaml
pnpm install
pnpm build
```

### Rollback Deployment
```bash
# Railway
railway rollback

# Manual rollback
git checkout [last-known-good-commit]
git push --force
```

### Data Recovery
```bash
# From backup
psql rescue_dogs < backup.sql

# From Railway
uv run python management/railway_commands.py sync --from-railway
```

## Getting Help

1. Check logs in `logs/` directory
2. Review test output with `-v` flag
3. Enable debug mode in environment
4. Search existing issues on GitHub
5. Contact team with:
   - Error message
   - Steps to reproduce
   - Environment details
   - Recent changes