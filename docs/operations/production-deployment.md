# Production Deployment Guide

## Prerequisites

### Environment Variables

**Backend:**
```bash
# Database
DB_HOST=your-postgres-host
DB_NAME=rescue_dogs_production
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# Cloudinary (Required for image processing)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Security
TESTING=false  # Critical: Must be false in production
```

**Frontend:**
```bash
NEXT_PUBLIC_API_URL=https://your-api-domain.com
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
```

## Pre-Deployment Checklist

### 1. Run Critical Tests

```bash
# Backend critical tests
pytest tests/integration/ tests/security/ tests/resilience/ tests/data_consistency/ -v

# Frontend tests
cd frontend && npm test

# All tests must pass before deployment
```

### 2. Security Verification

```bash
# Run security-specific tests
pytest tests/security/ -v

# Verify no sensitive data in environment
echo $CLOUDINARY_API_SECRET  # Should not be visible in logs
```

### 3. Database Setup

```bash
# Create production database
createdb rescue_dogs_production

# Run schema
psql rescue_dogs_production < database/schema.sql

# Apply production-ready migrations
psql rescue_dogs_production -f database/migrations/001_add_duplicate_stale_detection.sql
psql rescue_dogs_production -f database/migrations/002_add_detailed_metrics.sql

# Verify tables and new columns created
psql rescue_dogs_production -c "\dt"
psql rescue_dogs_production -c "\d animals"
psql rescue_dogs_production -c "\d scrape_logs"
```

### 4. Image Processing Test

```bash
# Test Cloudinary integration
python -c "
from utils.cloudinary_service import CloudinaryService
service = CloudinaryService()
print('Cloudinary configured:', service.cloudinary_service is not None)
"
```
## CORS Configuration

### Production CORS Setup

1. **Set Allowed Origins**
   ```bash
   # Only include your actual frontend domains
   ALLOWED_ORIGINS=https://rescuedogs.com,https://www.rescuedogs.com```

2. **Verify CORS Headers**

# Test from your frontend domain
 ```bash
    curl -H "Origin: https://rescuedogs.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://api.rescuedogs.com/api/animals```

2. **Common CORS Issues**

- Missing origin in ALLOWED_ORIGINS
- Using http:// instead of https:// in production
- Trailing slashes in origins (remove them)
- Frontend and API on different subdomains not configured

# Should return proper CORS headers

## Deployment Steps

### Backend (FastAPI)

1. **Deploy to your platform** (Heroku, AWS, DigitalOcean, etc.)
2. **Set environment variables** (see above)
3. **Verify health endpoint**: `GET /health`
4. **Test API endpoints**: `GET /api/animals?limit=5`

### Frontend (Next.js)

1. **Deploy to Vercel** (recommended) or your platform
2. **Set environment variables**
3. **Verify build**: `npm run build`
4. **Test image loading** and error handling

## Post-Deployment Verification

### 1. API Health Check

```bash
curl https://your-api-domain.com/health
# Should return: {"status": "healthy"}
```

### 2. Availability System Test

```bash
# Test default filtering (should show only available + high/medium confidence)
curl "https://your-api-domain.com/api/animals?limit=5"

# Verify response includes availability fields
curl "https://your-api-domain.com/api/animals?limit=1" | jq '.[] | {name, status, availability_confidence, last_seen_at}'

# Test override parameters
curl "https://your-api-domain.com/api/animals?status=all&availability_confidence=all&limit=5"
```

### 3. Image Processing Test

```bash
curl "https://your-api-domain.com/api/animals?limit=1"
# Verify primary_image_url contains Cloudinary URLs
```

### 4. Frontend Functionality

- [ ] Dogs page loads with images
- [ ] Filters work correctly
- [ ] Individual dog pages display properly
- [ ] Error states show user-friendly messages
- [ ] Images load with proper fallbacks
- [ ] Only available animals with good confidence shown by default
- [ ] Admin can override filters to see all animals

### 5. Error Handling Test

- [ ] Invalid API requests return proper error responses
- [ ] Image load failures fall back to original URLs
- [ ] Database connection issues are handled gracefully
- [ ] Partial scraper failures don't affect existing animal status
- [ ] API availability filtering works correctly

## Weekly Scraping Setup

### Production Scheduling

Set up weekly scraping with cron jobs for reliable data updates:

```bash
# Add to crontab (crontab -e)
# Run all scrapers every Monday at 2 AM
0 2 * * 1 cd /path/to/rescue-dog-aggregator && python management/config_commands.py run-all >> /var/log/scraper.log 2>&1

# Or run individual scrapers at different times
0 2 * * 1 cd /path/to/rescue-dog-aggregator && python management/config_commands.py run pets-in-turkey >> /var/log/scraper.log 2>&1
0 3 * * 1 cd /path/to/rescue-dog-aggregator && python management/config_commands.py run other-org >> /var/log/scraper.log 2>&1
```

### Health Monitoring

Monitor scraper performance and data quality:

```bash
# Check recent scrape status
psql rescue_dogs_production -c "
SELECT o.name, sl.status, sl.started_at, sl.dogs_found, 
       sl.data_quality_score, sl.duration_seconds
FROM scrape_logs sl 
JOIN organizations o ON sl.organization_id = o.id 
WHERE sl.started_at > NOW() - INTERVAL '7 days'
ORDER BY sl.started_at DESC;"

# Check availability distribution
psql rescue_dogs_production -c "
SELECT status, availability_confidence, COUNT(*) as count
FROM animals 
GROUP BY status, availability_confidence 
ORDER BY status, availability_confidence;"

# Monitor for potential failures
psql rescue_dogs_production -c "
SELECT organization_id, COUNT(*) as failure_count
FROM scrape_logs 
WHERE status IN ('error', 'warning') 
  AND started_at > NOW() - INTERVAL '30 days'
GROUP BY organization_id
HAVING COUNT(*) > 2;"
```

### Alerting Setup

Set up alerts for critical issues:

```bash
# Create monitoring script: /opt/monitoring/check_scrapers.sh
#!/bin/bash
FAILED_SCRAPES=$(psql -t rescue_dogs_production -c "
SELECT COUNT(*) FROM scrape_logs 
WHERE status = 'error' AND started_at > NOW() - INTERVAL '24 hours';")

if [ "$FAILED_SCRAPES" -gt "0" ]; then
    echo "WARNING: $FAILED_SCRAPES failed scrapes in last 24 hours" | mail -s "Scraper Alert" admin@yoursite.com
fi

# Add to crontab to run every 4 hours
0 */4 * * * /opt/monitoring/check_scrapers.sh
```

## Monitoring and Maintenance

### Log Monitoring

Monitor for these key events:
- **Scraper failures**: Check `scrape_logs` table for `status = 'error'`
- **Partial failures**: Monitor `detailed_metrics->'potential_failure_detected'`
- **Data quality drops**: Track `data_quality_score < 0.5`
- **Availability confidence issues**: Monitor animals stuck in `low` confidence
- **Image upload failures**: Check Cloudinary integration
- **Database connection errors**: Monitor connection pool
- **API response time degradation**: Performance monitoring

### Quality Assurance Queries

```sql
-- Animals with declining confidence
SELECT name, organization_id, availability_confidence, 
       consecutive_scrapes_missing, last_seen_at
FROM animals 
WHERE availability_confidence IN ('low', 'medium')
ORDER BY consecutive_scrapes_missing DESC, last_seen_at ASC
LIMIT 20;

-- Data quality trends
SELECT DATE(started_at) as scrape_date,
       AVG(data_quality_score) as avg_quality,
       COUNT(*) as scrape_count
FROM scrape_logs 
WHERE started_at > NOW() - INTERVAL '30 days'
  AND data_quality_score IS NOT NULL
GROUP BY DATE(started_at)
ORDER BY scrape_date DESC;

-- Organizations needing attention
SELECT o.name, 
       COUNT(CASE WHEN a.status = 'unavailable' THEN 1 END) as unavailable,
       COUNT(CASE WHEN a.availability_confidence = 'low' THEN 1 END) as low_confidence,
       MAX(sl.started_at) as last_scrape
FROM organizations o
LEFT JOIN animals a ON o.id = a.organization_id
LEFT JOIN scrape_logs sl ON o.id = sl.organization_id
GROUP BY o.id, o.name
HAVING COUNT(CASE WHEN a.status = 'unavailable' THEN 1 END) > 5
    OR MAX(sl.started_at) < NOW() - INTERVAL '14 days';
```

### Regular Tasks

1. **Daily**: Check scraper logs and availability distribution
2. **Weekly**: Review data quality scores and error patterns  
3. **Monthly**: Analyze availability confidence trends and user impact
4. **Quarterly**: Security audit, dependency updates, and performance optimization

## Troubleshooting

### Common Issues

**Images not loading:**
1. Check Cloudinary credentials
2. Verify CORS settings
3. Test fallback to original URLs

**API errors:**
1. Check database connection
2. Verify environment variables
3. Review application logs

**Performance issues:**
1. Monitor database query performance (especially availability filtering queries)
2. Check Cloudinary bandwidth usage
3. Verify frontend bundle size
4. Review scraper duration trends in `detailed_metrics`

**CORS errors:**
1. Check ALLOWED_ORIGINS includes your frontend URL
2. Verify no trailing slashes in origin URLs
3. Ensure ENVIRONMENT is set to 'production'
4. Check browser console for specific CORS error messages
5. Verify API returns correct headers with curl test

### Emergency Procedures

**Image CDN failure:**
- Images automatically fall back to original URLs
- No action needed, system continues functioning

**Database failure:**
- API returns cached responses where possible
- Frontend displays appropriate error messages
- Restore from backup when available

**Availability system issues:**
- Check for animals stuck in low confidence: `SELECT * FROM animals WHERE availability_confidence = 'low' AND consecutive_scrapes_missing < 2;`
- Review partial failure detection: `SELECT * FROM scrape_logs WHERE detailed_metrics->'potential_failure_detected' = 'true';`
- Verify stale data detection is working: Check `last_seen_at` timestamps are updating

**Critical security issue:**
- Run security tests: `pytest tests/security/ -v`
- Review recent deployments  
- Update dependencies if needed

**Data quality issues:**
- Monitor quality scores: `SELECT AVG(data_quality_score) FROM scrape_logs WHERE started_at > NOW() - INTERVAL '7 days';`
- Check for missing required fields in recent scrapes
- Review standardization accuracy