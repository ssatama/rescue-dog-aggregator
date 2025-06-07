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
# Run all scrapers every Monday at 2 AM
0 2 * * 1 cd /path/to/rescue-dog-aggregator && /path/to/venv/bin/python management/config_commands.py run-all >> /var/log/rescue-scraper.log 2>&1

# Or stagger individual organizations to distribute load
0 2 * * 1 cd /path/to/rescue-dog-aggregator && /path/to/venv/bin/python management/config_commands.py run pets-in-turkey >> /var/log/rescue-scraper.log 2>&1
0 3 * * 1 cd /path/to/rescue-dog-aggregator && /path/to/venv/bin/python management/config_commands.py run other-org >> /var/log/rescue-scraper.log 2>&1
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
RECENT_FAILURES=$(psql -t $DB_NAME -c "
SELECT COUNT(*) FROM scrape_logs 
WHERE status = 'error' AND started_at > NOW() - INTERVAL '24 hours';
")

if [ "$RECENT_FAILURES" -gt "0" ]; then
    echo "[$DATE] WARNING: $RECENT_FAILURES failed scrapes in last 24 hours" >> $LOG_FILE
    echo "Failed scrapes detected: $RECENT_FAILURES" | mail -s "Scraper Health Alert" admin@yoursite.com
fi

# Check availability distribution
LOW_CONFIDENCE=$(psql -t $DB_NAME -c "
SELECT COUNT(*) FROM animals 
WHERE availability_confidence = 'low' AND status = 'available';
")

if [ "$LOW_CONFIDENCE" -gt "50" ]; then
    echo "[$DATE] WARNING: $LOW_CONFIDENCE animals with low confidence" >> $LOG_FILE
fi

# Check for stale organizations
STALE_ORGS=$(psql -t $DB_NAME -c "
SELECT COUNT(*) FROM organizations o
WHERE NOT EXISTS (
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
# Re-run failed scraper
python management/config_commands.py run pets-in-turkey

# Check specific organization status
python management/config_commands.py show pets-in-turkey

# Validate configuration
python management/config_commands.py validate
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
# Review and adjust rate limiting in organization configs
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

## Best Practices

### Configuration Management
- Keep organization configs in version control
- Test configuration changes in staging first
- Use `--dry-run` before applying sync operations
- Maintain backup of working configurations

### Data Integrity
- Monitor availability confidence distributions
- Set up alerts for sudden drops in animal counts
- Regularly verify API filtering is working correctly
- Check that new animals get proper confidence scoring

### Security
- Use environment variables for sensitive data
- Rotate database credentials regularly
- Monitor for unusual access patterns
- Keep scraper dependencies updated

### Documentation
- Document any custom modifications to scrapers
- Keep runbooks updated for common issues
- Document performance tuning decisions
- Maintain incident response procedures

This guide provides a comprehensive foundation for managing weekly scraping operations in production. Adapt the monitoring thresholds and alert frequencies based on your specific needs and organization requirements.