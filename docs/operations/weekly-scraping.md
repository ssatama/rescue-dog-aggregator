# Weekly Scraping Guide for Production Operations

## Overview

This guide covers the setup, monitoring, and maintenance of weekly scraping operations for the Rescue Dog Aggregator in production environments. The system is designed to handle weekly schedules with automatic stale data management and robust error recovery.

## Scheduling Weekly Scrapes

### Cron Job Setup

Set up automated weekly scraping using cron jobs:

```bash
# Edit crontab
crontab -e

# Add weekly scraping jobs
# Run all scrapers every Monday at 2 AM (8 organizations total)
0 2 * * 1 cd /path/to/rescue-dog-aggregator && source venv/bin/activate && python management/config_commands.py run-all >> /var/log/rescue-scraper.log 2>&1

# Or stagger individual organizations to distribute load (current organizations: 8 total)
0 2 * * 1 cd /path/to/rescue-dog-aggregator && source venv/bin/activate && python management/config_commands.py run pets-in-turkey >> /var/log/rescue-scraper.log 2>&1
0 3 * * 1 cd /path/to/rescue-dog-aggregator && source venv/bin/activate && python management/config_commands.py run rean >> /var/log/rescue-scraper.log 2>&1
0 4 * * 1 cd /path/to/rescue-dog-aggregator && source venv/bin/activate && python management/config_commands.py run tierschutzverein-europa >> /var/log/rescue-scraper.log 2>&1
# Add remaining 5 organizations as needed
```

### Environment Considerations

```bash
# Ensure proper environment in cron
0 2 * * 1 cd /path/to/rescue-dog-aggregator && \
  source .env && \
  source venv/bin/activate && \
  python management/config_commands.py run-all >> /var/log/rescue-scraper.log 2>&1
```

### Log Rotation

Set up log rotation to prevent disk space issues:

```bash
# Create logrotate config: /etc/logrotate.d/rescue-scraper
/var/log/rescue-scraper.log {
    weekly
    rotate 8
    compress
    delaycompress
    missingok
    notifempty
    create 644 rescue rescue
}
```

## Monitoring and Health Checks

### Daily Health Checks

Create a daily monitoring script:

```bash
#!/bin/bash
# /opt/monitoring/daily_scraper_check.sh

DB_NAME="rescue_dogs_production"
LOG_FILE="/var/log/daily_health_check.log"
DATE=$(date +"%Y-%m-%d %H:%M:%S")

echo "[$DATE] Starting daily health check" >> $LOG_FILE

# Check recent scrape status
RECENT_FAILURES=$(psql -t -h localhost $DB_NAME -c "
SELECT COUNT(*) FROM scrape_logs 
WHERE status = 'error' AND started_at > NOW() - INTERVAL '24 hours';
")

if [ "$RECENT_FAILURES" -gt "0" ]; then
    echo "[$DATE] WARNING: $RECENT_FAILURES failed scrapes in last 24 hours" >> $LOG_FILE
    echo "Failed scrapes detected: $RECENT_FAILURES" | mail -s "Scraper Health Alert" admin@yoursite.com
fi

# Check availability distribution (Normal range: varies with modern confidence system)
LOW_CONFIDENCE=$(psql -t -h localhost $DB_NAME -c "
SELECT COUNT(*) FROM animals 
WHERE availability_confidence = 'low' AND status = 'available';
")

if [ "$LOW_CONFIDENCE" -gt "50" ]; then
    echo "[$DATE] WARNING: $LOW_CONFIDENCE animals with low confidence (check thresholds)" >> $LOG_FILE
fi

# Check for stale organizations (Current active orgs: 8)
STALE_ORGS=$(psql -t -h localhost $DB_NAME -c "
SELECT COUNT(*) FROM organizations o
WHERE o.active = true AND NOT EXISTS (
    SELECT 1 FROM scrape_logs sl 
    WHERE sl.organization_id = o.id 
    AND sl.started_at > NOW() - INTERVAL '14 days'
    AND sl.status = 'success'
);
")

if [ "$STALE_ORGS" -gt "0" ]; then
    echo "[$DATE] WARNING: $STALE_ORGS organizations haven't scraped successfully in 14 days" >> $LOG_FILE
fi

echo "[$DATE] Health check completed" >> $LOG_FILE
```

```bash
# Schedule daily health check
# Add to crontab
0 8 * * * /opt/monitoring/daily_scraper_check.sh
```

### Real-Time Monitoring Queries

#### Recent Scrape Status
```sql
-- Check last week's scrape performance
SELECT 
    o.name as organization,
    sl.status,
    sl.started_at,
    sl.dogs_found,
    sl.data_quality_score,
    sl.duration_seconds,
    CASE 
        WHEN sl.detailed_metrics->>'potential_failure_detected' = 'true' 
        THEN '⚠️ Potential Failure' 
        ELSE '✅ Normal' 
    END as failure_status
FROM scrape_logs sl
JOIN organizations o ON sl.organization_id = o.id
WHERE sl.started_at > NOW() - INTERVAL '7 days'
ORDER BY sl.started_at DESC;
```

#### Availability Health Dashboard
```sql
-- Current availability distribution
SELECT 
    status,
    availability_confidence,
    COUNT(*) as animal_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM animals
GROUP BY status, availability_confidence
ORDER BY 
    CASE status WHEN 'available' THEN 1 ELSE 2 END,
    CASE availability_confidence 
        WHEN 'high' THEN 1 
        WHEN 'medium' THEN 2 
        WHEN 'low' THEN 3 
    END;
```

#### Quality Trends
```sql
-- Data quality trends over last month
SELECT 
    DATE(started_at) as scrape_date,
    AVG(data_quality_score) as avg_quality,
    MIN(data_quality_score) as min_quality,
    MAX(data_quality_score) as max_quality,
    COUNT(*) as scrape_count
FROM scrape_logs
WHERE started_at > NOW() - INTERVAL '30 days'
  AND data_quality_score IS NOT NULL
GROUP BY DATE(started_at)
ORDER BY scrape_date DESC
LIMIT 30;
```

## Troubleshooting Common Issues

### Scraper Failures

#### Identify Failed Scrapes
```sql
-- Recent failures with details
SELECT 
    o.name,
    sl.started_at,
    sl.error_message,
    sl.detailed_metrics->>'animals_found' as animals_found,
    sl.detailed_metrics->>'potential_failure_detected' as potential_failure
FROM scrape_logs sl
JOIN organizations o ON sl.organization_id = o.id
WHERE sl.status = 'error' 
  AND sl.started_at > NOW() - INTERVAL '7 days'
ORDER BY sl.started_at DESC;
```

#### Manual Recovery
```bash
# ALWAYS activate virtual environment first (REQUIRED)
source venv/bin/activate

# Re-run failed scraper (8 organizations available)
python management/config_commands.py run pets-in-turkey

# Check specific organization status
python management/config_commands.py show pets-in-turkey

# Validate configuration for all organizations
python management/config_commands.py validate

# List all available organizations (should show 8)
python management/config_commands.py list
```

### Partial Failures

#### Identify Potential Failures
```sql
-- Check for partial failures (low animal counts)
SELECT 
    o.name,
    sl.started_at,
    sl.dogs_found,
    LAG(sl.dogs_found) OVER (PARTITION BY o.id ORDER BY sl.started_at) as previous_count,
    sl.detailed_metrics->>'potential_failure_detected' as flagged_as_failure
FROM scrape_logs sl
JOIN organizations o ON sl.organization_id = o.id
WHERE sl.started_at > NOW() - INTERVAL '30 days'
  AND sl.status IN ('success', 'warning')
ORDER BY o.name, sl.started_at DESC;
```

#### Investigation Steps
```bash
# 1. Check organization website manually
curl -I "https://organization-website.com/adoptable-dogs"

# 2. Run scraper in debug mode
python -c "
from scrapers.pets_in_turkey.dogs_scraper import PetsInTurkeyScraper
scraper = PetsInTurkeyScraper(config_id='pets-in-turkey')
try:
    animals = scraper.collect_data()
    print(f'Found {len(animals)} animals')
    if animals:
        print('Sample animal:', animals[0])
        print(f'Primary image URL: {animals[0].get(\"primary_image_url\", \"None\")}')
        print(f'Image URLs count: {len(animals[0].get(\"image_urls\", []))}')
except Exception as e:
    print(f'Error: {e}')
"

# 3. Check recent website changes
# Compare HTML structure or API responses
```

### Data Quality Issues

#### Low Quality Scores
```sql
-- Identify organizations with declining quality
SELECT 
    o.name,
    AVG(sl.data_quality_score) as avg_quality,
    COUNT(*) as scrape_count,
    MIN(sl.data_quality_score) as min_quality
FROM scrape_logs sl
JOIN organizations o ON sl.organization_id = o.id
WHERE sl.started_at > NOW() - INTERVAL '30 days'
  AND sl.data_quality_score IS NOT NULL
GROUP BY o.id, o.name
HAVING AVG(sl.data_quality_score) < 0.7
ORDER BY avg_quality ASC;
```

#### Field Completeness Analysis
```sql
-- Check which fields are commonly missing
SELECT 
    CASE WHEN breed IS NULL OR breed = '' THEN 'Missing Breed' END as issue,
    COUNT(*) as count
FROM animals
WHERE created_at > NOW() - INTERVAL '7 days'
  AND (breed IS NULL OR breed = '')
UNION ALL
SELECT 
    CASE WHEN age_text IS NULL OR age_text = '' THEN 'Missing Age' END,
    COUNT(*)
FROM animals
WHERE created_at > NOW() - INTERVAL '7 days'
  AND (age_text IS NULL OR age_text = '')
-- Add more field checks as needed
```

### Availability System Issues

#### Animals Stuck in Low Confidence
```sql
-- Find animals that should be updated
SELECT 
    a.name,
    a.organization_id,
    a.availability_confidence,
    a.consecutive_scrapes_missing,
    a.last_seen_at,
    NOW() - a.last_seen_at as time_since_seen
FROM animals a
WHERE a.availability_confidence = 'low'
  AND a.consecutive_scrapes_missing < 2
ORDER BY a.last_seen_at ASC;
```

#### Fix Stuck Animals
```sql
-- Reset animals that should have higher confidence
UPDATE animals 
SET 
    availability_confidence = 'medium',
    consecutive_scrapes_missing = 1
WHERE availability_confidence = 'low' 
  AND consecutive_scrapes_missing < 2;
```

## Pets in Turkey Monitoring

### Selenium-Based Scraping Diagnostics

The Pets in Turkey scraper uses browser automation for reliable data extraction. Monitor scraping metrics:

```sql
-- Check Pets in Turkey scraping success rates
SELECT 
    sl.started_at,
    sl.status,
    sl.dogs_found,
    sl.detailed_metrics->>'dogs_with_real_descriptions' as description_quality,
    sl.detailed_metrics->>'dogs_with_image_urls' as image_extraction,
    sl.detailed_metrics->>'dogs_with_primary_images' as primary_images,
    sl.error_message
FROM scrape_logs sl
JOIN organizations o ON sl.organization_id = o.id
WHERE o.name = 'Pets in Turkey'
  AND sl.started_at > NOW() - INTERVAL '7 days'
ORDER BY sl.started_at DESC;
```

## Performance Optimization

### Database Maintenance

#### Weekly Maintenance Tasks
```bash
#!/bin/bash
# /opt/maintenance/weekly_db_maintenance.sh

DB_NAME="rescue_dogs_production"

# Analyze tables for query optimization
psql $DB_NAME -c "ANALYZE animals;"
psql $DB_NAME -c "ANALYZE scrape_logs;"
psql $DB_NAME -c "ANALYZE organizations;"

# Clean up old scrape logs (keep 1 year)
psql $DB_NAME -c "
DELETE FROM scrape_logs 
WHERE started_at < NOW() - INTERVAL '1 year';
"

# Update table statistics
psql $DB_NAME -c "VACUUM ANALYZE;"

echo "Weekly database maintenance completed at $(date)"
```

#### Index Monitoring
```sql
-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_tup_read DESC;
```

### Scraper Performance

#### Duration Monitoring
```sql
-- Scraper performance trends
SELECT 
    o.name,
    AVG(sl.duration_seconds) as avg_duration,
    MIN(sl.duration_seconds) as min_duration,
    MAX(sl.duration_seconds) as max_duration
FROM scrape_logs sl
JOIN organizations o ON sl.organization_id = o.id
WHERE sl.started_at > NOW() - INTERVAL '30 days'
  AND sl.duration_seconds IS NOT NULL
GROUP BY o.id, o.name
ORDER BY avg_duration DESC;
```

#### Rate Limiting Optimization
```bash
# ALWAYS activate virtual environment first
source venv/bin/activate

# Review and adjust rate limiting in organization configs (8 organizations)
python -c "
from utils.config_loader import ConfigLoader
loader = ConfigLoader()
for config_id in loader.list_organizations():
    config = loader.load_config(config_id)
    scraper_config = config.get_scraper_config_dict()
    print(f'{config_id}: rate_limit_delay = {scraper_config.get(\"rate_limit_delay\", \"default\")}')
"
```

## Alerting and Notifications

### Critical Alert Setup

#### Email Alerts for Critical Issues
```bash
#!/bin/bash
# /opt/monitoring/critical_alerts.sh

DB_NAME="rescue_dogs_production"

# Check for complete scraper failures (no successful scrapes in 48 hours)
DEAD_SCRAPERS=$(psql -t $DB_NAME -c "
SELECT COUNT(DISTINCT o.id) FROM organizations o
WHERE o.active = true
  AND NOT EXISTS (
    SELECT 1 FROM scrape_logs sl 
    WHERE sl.organization_id = o.id 
    AND sl.started_at > NOW() - INTERVAL '48 hours'
    AND sl.status = 'success'
  );
")

if [ "$DEAD_SCRAPERS" -gt "0" ]; then
    echo "CRITICAL: $DEAD_SCRAPERS organizations have not scraped successfully in 48 hours" | \
    mail -s "CRITICAL: Scraper System Failure" admin@yoursite.com
fi

# Check for database connection issues
if ! psql $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
    echo "CRITICAL: Cannot connect to database $DB_NAME" | \
    mail -s "CRITICAL: Database Connection Failure" admin@yoursite.com
fi
```

#### Slack/Discord Integration
```bash
# Add to critical_alerts.sh
WEBHOOK_URL="your-slack-webhook-url"

if [ "$DEAD_SCRAPERS" -gt "0" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"🚨 CRITICAL: $DEAD_SCRAPERS organizations have not scraped successfully in 48 hours\"}" \
        $WEBHOOK_URL
fi
```

### Monitoring Dashboards

#### Grafana Dashboard Queries

**Scrape Success Rate**:
```sql
SELECT 
    DATE_TRUNC('day', started_at) as time,
    COUNT(CASE WHEN status = 'success' THEN 1 END) * 100.0 / COUNT(*) as success_rate
FROM scrape_logs
WHERE started_at > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', started_at)
ORDER BY time;
```

**Average Data Quality**:
```sql
SELECT 
    DATE_TRUNC('day', started_at) as time,
    AVG(data_quality_score) as avg_quality
FROM scrape_logs
WHERE started_at > NOW() - INTERVAL '30 days'
  AND data_quality_score IS NOT NULL
GROUP BY DATE_TRUNC('day', started_at)
ORDER BY time;
```

**Available Animals Count**:
```sql
SELECT 
    DATE_TRUNC('day', updated_at) as time,
    COUNT(*) as available_animals
FROM animals
WHERE status = 'available' 
  AND availability_confidence IN ('high', 'medium')
  AND updated_at > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', updated_at)
ORDER BY time;
```

## Advanced Scraping Features (2024 Updates)

### Unified DOM Extraction Monitoring

Monitor the new unified DOM extraction approach for supported organizations:

```sql
-- Check unified extraction success rates (modern BaseScraper architecture)
SELECT 
    o.name,
    COUNT(CASE WHEN sl.detailed_metrics->>'unified_extraction_used' = 'true' THEN 1 END) as unified_count,
    COUNT(CASE WHEN sl.detailed_metrics->>'fallback_to_legacy' = 'true' THEN 1 END) as fallback_count,
    COUNT(*) as total_scrapes,
    AVG(sl.data_quality_score) as avg_quality_score
FROM scrape_logs sl
JOIN organizations o ON sl.organization_id = o.id
WHERE sl.started_at > NOW() - INTERVAL '30 days'
  AND o.name IN ('REAN')  -- Organizations using unified extraction
GROUP BY o.id, o.name;
```

### Image Association Quality

Monitor image association accuracy with the new unified approach:

```sql
-- Check image association success
SELECT 
    o.name,
    COUNT(CASE WHEN a.primary_image_url IS NOT NULL THEN 1 END) as animals_with_images,
    COUNT(*) as total_animals,
    ROUND(COUNT(CASE WHEN a.primary_image_url IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2) as image_success_rate
FROM animals a
JOIN organizations o ON a.organization_id = o.id
WHERE a.created_at > NOW() - INTERVAL '7 days'
GROUP BY o.id, o.name
ORDER BY image_success_rate DESC;
```

### Troubleshooting Unified Extraction

```bash
# ALWAYS activate virtual environment first
source venv/bin/activate

# Debug extraction issues with modern BaseScraper architecture
python -c "
from scrapers.rean.dogs_scraper import REANScraper
# Use modern context manager pattern
with REANScraper(config_id='rean') as scraper:
    try:
        # Test extraction with service injection
        animals = scraper.collect_data()
        print(f'Found {len(animals)} animals')
        
        # Check image associations
        with_images = [d for d in animals if d.get('primary_image_url')]
        print(f'{len(with_images)} animals have associated images')
        
        # Sample output
        if animals:
            sample = animals[0]
            print(f'Sample animal: {sample.get(\"name\")} - Image: {sample.get(\"primary_image_url\", \"None\")[:50]}...')
            
    except Exception as e:
        print(f'Extraction error: {e}')
"
```

## Enhanced Monitoring & Metrics

### Quality Score Analysis

Monitor the enhanced quality scoring system:

```sql
-- Detailed quality score breakdown
SELECT 
    o.name,
    AVG(sl.data_quality_score) as avg_quality,
    AVG((sl.detailed_metrics->>'required_fields_score')::float) as required_fields_avg,
    AVG((sl.detailed_metrics->>'optional_fields_score')::float) as optional_fields_avg,
    COUNT(*) as scrape_count
FROM scrape_logs sl
JOIN organizations o ON sl.organization_id = o.id
WHERE sl.started_at > NOW() - INTERVAL '30 days'
  AND sl.data_quality_score IS NOT NULL
GROUP BY o.id, o.name
ORDER BY avg_quality DESC;
```

### Session Tracking Validation

Ensure session tracking is working correctly:

```sql
-- Verify session tracking consistency
SELECT 
    o.name,
    COUNT(DISTINCT a.last_session_start) as session_count,
    MAX(a.last_session_start) as latest_session,
    COUNT(CASE WHEN a.last_seen_at > NOW() - INTERVAL '7 days' THEN 1 END) as recently_seen
FROM animals a
JOIN organizations o ON a.organization_id = o.id
WHERE a.status = 'available'
GROUP BY o.id, o.name
ORDER BY latest_session DESC;
```

### Availability Transition Monitoring

Track availability confidence transitions:

```sql
-- Monitor availability confidence changes
SELECT 
    availability_confidence,
    consecutive_scrapes_missing,
    COUNT(*) as animal_count,
    AVG(EXTRACT(days FROM NOW() - last_seen_at)) as avg_days_since_seen
FROM animals
WHERE status = 'available'
GROUP BY availability_confidence, consecutive_scrapes_missing
ORDER BY 
    CASE availability_confidence 
        WHEN 'high' THEN 1 
        WHEN 'medium' THEN 2 
        WHEN 'low' THEN 3 
    END,
    consecutive_scrapes_missing;
```

## Best Practices

### Configuration Management
- Keep organization configs in version control
- Test configuration changes in staging first
- Use `--dry-run` before applying sync operations
- Maintain backup of working configurations
- **Test unified extraction** after configuration changes

### Data Integrity
- Monitor availability confidence distributions
- Set up alerts for sudden drops in animal counts
- Regularly verify API filtering is working correctly
- Check that new animals get proper confidence scoring
- **Validate image association accuracy** for unified extraction

### Security
- Use environment variables for sensitive data
- Rotate database credentials regularly
- Monitor for unusual access patterns
- Keep scraper dependencies updated
- **Monitor browser automation security** for Selenium-based scrapers

### Performance Optimization
- **Monitor unified extraction performance** vs. legacy methods
- Set appropriate rate limits for browser automation
- Use headless browser mode for better performance
- Monitor memory usage during browser automation
- **Optimize lazy loading trigger patterns** based on website behavior

### Error Recovery
- **Test fallback mechanisms** from unified to legacy extraction
- Monitor partial failure detection accuracy
- Validate error recovery doesn't affect existing data
- Set up alerts for consistent extraction method failures
- **Document website structure changes** that may affect unified extraction

### Documentation
- Document any custom modifications to scrapers
- Keep runbooks updated for common issues
- Document performance tuning decisions
- Maintain incident response procedures
- **Document unified extraction selector strategies** for each organization
- **Maintain troubleshooting guides** for image association issues

### Production Readiness Checklist

**Before deploying new scrapers**:
- [ ] Unified extraction tested with real website data
- [ ] Image association accuracy validated
- [ ] Fallback to legacy method confirmed working
- [ ] Session tracking validated
- [ ] Quality scoring algorithms tested
- [ ] Error boundaries and recovery tested
- [ ] Performance benchmarks established
- [ ] Monitoring and alerting configured

**Weekly operations review**:
- [ ] Check unified extraction success rates
- [ ] Verify image association quality
- [ ] Review availability confidence distributions
- [ ] Validate session tracking consistency
- [ ] Monitor data quality trends
- [ ] Review error logs for extraction issues
- [ ] Performance comparison: unified vs. legacy methods

This enhanced guide provides comprehensive coverage for managing the modern, production-ready scraping system with unified DOM extraction, advanced availability management, and robust monitoring capabilities. Adapt the monitoring thresholds and procedures based on your specific operational requirements and organization needs.