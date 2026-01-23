# Deployment Guide - Rescue Dog Aggregator

Complete guide for deploying the Rescue Dog Aggregator platform with Railway database integration, LLM configuration, and automated scraping operations.

## Prerequisites

### Required Environment Variables

**Backend Core:**
```bash
# Database
DB_HOST=your-postgres-host
DB_NAME=rescue_dogs_production
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# Security
TESTING=false  # Critical: Must be false in production

# R2 and Cloudflare Images (Required)
R2_ACCOUNT_ID=your-r2-account-id
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_BUCKET_NAME=your-bucket-name
R2_CUSTOM_DOMAIN=your-custom-domain.com
CLOUDFLARE_IMAGES_DELIVERY_URL=https://imagedelivery.net/your-account-hash
```

**LLM Configuration:**
```bash
# Core LLM API
OPENROUTER_API_KEY=sk-or-v1-xxx...  # Required
LLM_DEFAULT_MODEL=openrouter/auto
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_TIMEOUT_SECONDS=30.0

# Production Optimizations
LLM_CACHE_ENABLED=true
LLM_CACHE_MAX_SIZE=2000
LLM_CACHE_TTL_SECONDS=7200
LLM_RETRY_MAX_ATTEMPTS=5
LLM_BATCH_DEFAULT_SIZE=10
LLM_BATCH_MAX_SIZE=25
LLM_BATCH_CONCURRENT=15
```

**Railway Database:**
```bash
RAILWAY_DATABASE_URL=postgresql://user:pass@host:5432/db
```

**Frontend:**
```bash
NEXT_PUBLIC_API_URL=https://your-api-domain.com
NEXT_PUBLIC_R2_CUSTOM_DOMAIN=your-custom-domain.com
NEXT_PUBLIC_CLOUDFLARE_IMAGES_DELIVERY_URL=https://imagedelivery.net/your-account-hash
```

## Local Development Setup

### 1. Database Setup
```bash
# Create local database
createdb rescue_dogs_local

# Apply schema
psql rescue_dogs_local < database/schema.sql

# Run migrations
alembic upgrade head
```

### 2. Environment Configuration
```bash
# Create .env file
ENVIRONMENT=development
OPENROUTER_API_KEY=sk-or-v1-dev-key
LLM_DEFAULT_MODEL=anthropic/claude-3-haiku
LLM_BATCH_DEFAULT_SIZE=3
LLM_CACHE_MAX_SIZE=500
```

### 3. Dependencies
```bash
# Backend
uv sync

# Frontend
cd frontend
pnpm install
```

### 4. Test Setup
```bash
# Backend tests (168 test files)
uv run pytest tests/ -m "unit or fast" -v

# Frontend tests (276 test files)
cd frontend && pnpm test
```

## Railway Database Deployment

### 1. Railway Setup
```bash
# Create Railway account and PostgreSQL service
# Get DATABASE_URL from Railway dashboard
export RAILWAY_DATABASE_URL="postgresql://username:password@host:port/database"
```

### 2. Database Migration
```bash
# Test connection
uv run python -m management.railway_commands test-connection

# Run complete setup (migration + initial sync)
uv run python -m management.railway_commands setup

# Verify deployment
uv run python -m management.railway_commands status
```

### 3. Data Synchronization
```bash
# Incremental sync (default - safe for daily use)
uv run python -m management.railway_commands sync

# After major local changes
uv run python -m management.railway_commands sync --mode rebuild --confirm-destructive

# Preview changes
uv run python -m management.railway_commands sync --dry-run
```

### 4. Sync Modes
- **incremental** (default): Safe daily sync, validates counts
- **rebuild**: Clears Railway, pushes all local data (requires thresholds)
- **force**: Emergency mode, bypasses validation (admin only)

## Production Deployment

### 1. Pre-Deployment Tests
```bash
# Critical test suite
uv run pytest tests/integration/ tests/security/ tests/resilience/ -v

# Frontend build test
cd frontend && pnpm build

# Code quality check
uv run ruff check .
```

### 2. Database Setup
```bash
# Production database
createdb rescue_dogs_production
psql rescue_dogs_production < database/schema.sql

# Apply all migrations
alembic upgrade head
```

### 3. Service Verification
```bash
# Test integrations
uv run python -c "
from utils.r2_service import R2Service
from services.llm.config import get_llm_config
print('R2 configured:', R2Service()._s3_client is not None)
print('LLM configured:', get_llm_config().openrouter_api_key is not None)
"
```

### 4. Deploy Applications

**Backend (FastAPI):**
1. Deploy to your platform (Railway, Heroku, AWS, etc.)
2. Set all environment variables
3. Verify health: `GET /health`
4. Test API: `GET /api/animals?limit=5`

**Frontend (Next.js):**
1. Deploy to Vercel (recommended)
2. Set frontend environment variables
3. Verify build and image loading

## Weekly Scraping Automation

### 1. Cron Job Setup
```bash
# Edit crontab
crontab -e

# Run all 12 organizations every Monday at 2 AM
0 2 * * 1 cd /path/to/rescue-dog-aggregator && uv run python management/config_commands.py run-all >> /var/log/scraper.log 2>&1

# Or stagger individual organizations
0 2 * * 1 cd /path/to/rescue-dog-aggregator && uv run python management/config_commands.py run pets-in-turkey >> /var/log/scraper.log 2>&1
0 3 * * 1 cd /path/to/rescue-dog-aggregator && uv run python management/config_commands.py run rean >> /var/log/scraper.log 2>&1
0 4 * * 1 cd /path/to/rescue-dog-aggregator && uv run python management/config_commands.py run tierschutzverein-europa >> /var/log/scraper.log 2>&1
```

### 2. Log Rotation
```bash
# Create /etc/logrotate.d/rescue-scraper
/var/log/scraper.log {
    weekly
    rotate 8
    compress
    delaycompress
    missingok
    notifempty
    create 644 rescue rescue
}
```

### 3. Health Monitoring
```bash
#!/bin/bash
# Daily health check script
DB_NAME="rescue_dogs_production"

# Check recent failures
FAILURES=$(psql -t $DB_NAME -c "
SELECT COUNT(*) FROM scrape_logs 
WHERE status = 'error' AND started_at > NOW() - INTERVAL '24 hours';
")

if [ "$FAILURES" -gt "0" ]; then
    echo "WARNING: $FAILURES failed scrapes" | mail -s "Scraper Alert" admin@site.com
fi

# Schedule: 0 8 * * * /opt/monitoring/health_check.sh
```

## Monitoring and Maintenance

### 1. Health Checks
```bash
# API health
curl https://your-api-domain.com/health

# Test availability system
curl "https://your-api-domain.com/api/animals?limit=5"

# Verify 12 organizations
curl "https://your-api-domain.com/api/organizations" | jq 'length'
```

### 2. Data Quality Monitoring
```sql
-- Check availability distribution
SELECT status, availability_confidence, COUNT(*) as count
FROM animals 
GROUP BY status, availability_confidence 
ORDER BY status, availability_confidence;

-- Recent scrape performance
SELECT o.name, sl.status, sl.dogs_found, sl.data_quality_score
FROM scrape_logs sl 
JOIN organizations o ON sl.organization_id = o.id 
WHERE sl.started_at > NOW() - INTERVAL '7 days'
ORDER BY sl.started_at DESC;
```

### 3. LLM Service Monitoring
```bash
# Check LLM configuration
uv run python -c "
from services.llm.config import get_llm_config, validate_config
config = get_llm_config()
print(f'Model: {config.model.default_model}')
print(f'Cache: {config.cache.enabled}')
print(f'Valid: {validate_config()}')
"

# Monitor LLM processing
uv run python -m management.llm_commands enrich-descriptions --organization pets-turkey --batch-size 5
```

### 4. Railway Sync Monitoring
```bash
# Daily Railway sync check
uv run python -m management.railway_commands status

# Weekly full sync
uv run python -m management.railway_commands sync

# After scraping operations
uv run python management/config_commands.py sync  # Local updates first
uv run python -m management.railway_commands sync  # Then sync to Railway
```

## Troubleshooting

### Common Issues

**Images not loading:**
```bash
# Check R2 integration
uv run python -c "
from utils.r2_service import R2Service
service = R2Service()
print('R2 configured:', service._s3_client is not None)
"
```

**API errors:**
```bash
# Check database connection
psql rescue_dogs_production -c "SELECT COUNT(*) FROM animals;"

# Verify environment variables
echo $TESTING  # Should be 'false' in production
```

**LLM service issues:**
```bash
# Validate configuration
uv run python -c "
from services.llm.config import validate_config
if not validate_config():
    raise ValueError('Invalid LLM configuration')
"

# Test API connection
uv run python -c "
from services.llm_data_service import OpenRouterLLMDataService
service = OpenRouterLLMDataService()
print('LLM service ready')
"
```

**Scraper failures:**
```bash
# Manual recovery
uv run python management/config_commands.py run pets-in-turkey

# Debug specific scraper
uv run python -c "
from scrapers.pets_in_turkey.dogs_scraper import PetsInTurkeyScraper
with PetsInTurkeyScraper(config_id='pets-in-turkey') as scraper:
    animals = scraper.collect_data()
    print(f'Found {len(animals)} animals')
"
```

**Railway sync issues:**
```sql
-- Check data mismatches
SELECT 'organizations' as table_name, COUNT(*) FROM organizations
UNION ALL
SELECT 'animals', COUNT(*) FROM animals
UNION ALL
SELECT 'scrape_logs', COUNT(*) FROM scrape_logs;
```

### Performance Issues

**Database optimization:**
```sql
-- Analyze tables
ANALYZE animals;
ANALYZE scrape_logs;
ANALYZE organizations;

-- Update statistics
VACUUM ANALYZE;
```

**LLM optimization:**
```bash
# Production settings in .env
LLM_CACHE_MAX_SIZE=3000
LLM_BATCH_DEFAULT_SIZE=15
LLM_RETRY_MAX_ATTEMPTS=5
LLM_BATCH_CONCURRENT=15
```

## Security Checklist

- [ ] `TESTING=false` in production
- [ ] Database credentials secured
- [ ] API keys in environment variables only
- [ ] CORS properly configured
- [ ] SSL/TLS enabled
- [ ] Regular security updates
- [ ] LLM API key secured and rotated

## Regular Maintenance Tasks

**Daily:**
- Monitor scraper logs
- Check API health
- Verify data quality scores

**Weekly:**
- Run database maintenance
- Review availability confidence distribution
- Update dependencies if needed
- Sync Railway database

**Monthly:**
- Security audit
- Performance optimization review
- LLM usage and cost analysis
- Backup verification

## Emergency Procedures

**Database failure:**
- API returns cached responses
- Frontend displays error messages
- Restore from backup

**Image CDN failure:**
- Images fall back to original URLs
- System continues functioning

**LLM service failure:**
- Disable LLM features via feature flags
- Continue core functionality
- Monitor service restoration

**Critical security issue:**
```bash
# Run security tests
uv run pytest tests/security/ -v
# Review recent deployments
# Update dependencies if needed
```

This deployment guide provides comprehensive coverage for all aspects of the platform deployment, from initial setup through ongoing maintenance and monitoring.