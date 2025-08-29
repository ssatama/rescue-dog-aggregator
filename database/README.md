# Database Administration - Rescue Dog Aggregator

This directory contains all database administration tools, scripts, and documentation for the Rescue Dog Aggregator production database.

## Files Overview

### Core Schema and Setup
- **`schema.sql`** - Complete database schema with performance indexes
- **`db_setup.py`** - Database initialization and setup script
- **`config.py`** - Database configuration (imported from project root)

### Administrative Tools
- **`db_admin_runbook.md`** - Complete operational runbook for database administrators
- **`monitoring/db_health_check.py`** - Comprehensive database health monitoring script
- **`scripts/backup_automation.py`** - Automated backup system with verification
- **`scripts/setup_cron_jobs.sh`** - Cron job setup for automated operations
- **`scripts/weekly_maintenance.sh`** - Auto-generated maintenance script

### Migration Files
- **`migrations/010_performance_indexes.sql`** - Latest performance optimization migration
- Additional migration files for database evolution tracking

## Quick Start

### 1. Initialize New Database
```bash
# Set up complete database with performance indexes
python database/db_setup.py
```

### 2. Monitor Database Health
```bash
# Run health check
python database/monitoring/db_health_check.py --verbose

# Run with JSON output for monitoring systems
python database/monitoring/db_health_check.py --json
```

### 3. Set Up Automated Operations
```bash
# Install automated backup and monitoring cron jobs
sudo database/scripts/setup_cron_jobs.sh install

# Check status
database/scripts/setup_cron_jobs.sh status
```

### 4. Manual Backup Operations
```bash
# Create daily backup
python database/scripts/backup_automation.py daily

# Create weekly base backup
python database/scripts/backup_automation.py weekly

# Test backup restoration
python database/scripts/backup_automation.py test-restore
```

## Performance Indexes

The database includes optimized performance indexes from migration 010:

### Homepage Query Optimization
- **`idx_animals_homepage_optimized`** - Optimized for `WHERE status = 'available'` with sorting
- **`idx_organizations_active_country`** - Organization filtering with country support

### Search and Filtering
- **`idx_animals_location_composite`** - Location-based filtering with JSON properties
- **`idx_animals_size_breed_status`** - Size and breed filtering with recency
- **`idx_animals_search_enhanced`** - Full-text search across name, breed, and description

### Analytics and Reporting
- **`idx_animals_analytics_covering`** - Covering index for dashboard queries

### Expected Performance Improvements
- Homepage queries: 60-80% faster (200ms → 40-80ms)
- Location queries: 50-70% faster
- Analytics queries: 70-90% faster
- Search queries: 40-60% faster

## Monitoring and Alerting

### Automated Health Checks
- **Connection monitoring** - Tracks active connections and limits
- **Performance monitoring** - Query execution times and index usage
- **Data integrity checks** - Animal counts, organization activity
- **Replication lag monitoring** - If replication is configured
- **Disk usage tracking** - Database size and growth trends

### Alert Thresholds
- Connection usage > 80%
- Homepage queries > 200ms
- No successful scrapes in 6 hours
- Available animals < 100
- Database response time > 100ms

### Log Locations (when cron jobs are installed)
- `/var/log/db_backup_daily.log` - Daily backup operations
- `/var/log/db_backup_weekly.log` - Weekly base backups
- `/var/log/db_health_check.log` - Hourly health checks
- `/var/log/db_maintenance.log` - Weekly maintenance tasks

## Backup Strategy

### Tiered Backup System
1. **Daily Backups** - Compressed SQL dumps at 2 AM
2. **Weekly Base Backups** - Point-in-time recovery on Sundays
3. **Automated Testing** - Monthly backup restoration verification
4. **Retention Policies** - 30 days daily, 90 days weekly

### Recovery Procedures
- **RTO (Recovery Time Objective)**: 15 minutes
- **RPO (Recovery Point Objective)**: 1 hour
- **Failover**: Automated replica promotion (if configured)
- **Point-in-time recovery**: From weekly base + WAL archives

## Database Administration Tasks

### Daily Operations (Automated)
- Health check monitoring
- Backup creation and verification
- Log rotation and cleanup

### Weekly Operations (Automated)
- Table statistics updates (`ANALYZE`)
- Vacuum operations for space reclamation
- Index usage analysis
- Database size monitoring

### Monthly Operations (Semi-automated)
- Backup restoration testing
- Performance baseline review
- Capacity planning assessment

### Manual Emergency Procedures
See `db_admin_runbook.md` for detailed 3 AM emergency procedures including:
- Database connection issues
- Performance degradation
- Disk space problems
- Data corruption recovery
- Failover procedures

## Security and Access Control

### User Roles
- **`analytics_readonly`** - Read-only access for reporting
- **`scraper_app`** - Insert/update access for data collection
- **`webapp`** - Application-level read access

### Connection Pooling
- PgBouncer configuration included in runbook
- Recommended pool sizes and connection limits
- Transaction-level pooling for optimal performance

## Troubleshooting

### Common Issues
1. **High CPU Usage** - Check for sequential scans and lock contention
2. **Slow Queries** - Verify index usage with `EXPLAIN ANALYZE`
3. **Disk Space** - Emergency cleanup procedures and vacuum operations
4. **Connection Limits** - Pool configuration and connection management

### Diagnostic Queries
```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public' AND idx_scan > 0
ORDER BY idx_scan DESC;

-- Monitor query performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM animals 
WHERE status = 'available' 
ORDER BY created_at DESC LIMIT 50;

-- Check database size
SELECT pg_size_pretty(pg_database_size(current_database()));
```

## Configuration

### Environment Variables
- `DB_HOST` - Database host (default: localhost)
- `DB_NAME` - Database name (default: rescue_dogs)
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password

### Customization
Update the following in automation scripts:
- **Email notifications** - Set admin email in cron setup
- **Backup retention** - Adjust days in backup_automation.py
- **Alert thresholds** - Modify in db_health_check.py
- **Monitoring frequency** - Change cron schedules

## Production Deployment Checklist

- [ ] Run `python database/db_setup.py` to initialize schema
- [ ] Verify all performance indexes are created
- [ ] Configure backup storage location
- [ ] Set up email notifications for alerts
- [ ] Install cron jobs with `sudo ./setup_cron_jobs.sh install`
- [ ] Test backup and restoration procedures
- [ ] Configure connection pooling (PgBouncer)
- [ ] Set up monitoring dashboard integration
- [ ] Document recovery procedures for operations team
- [ ] Perform initial capacity planning assessment

## Support and Maintenance

For database issues or questions:
1. Check the `db_admin_runbook.md` for detailed procedures
2. Run health check: `python database/monitoring/db_health_check.py`
3. Review recent logs in `/var/log/`
4. Contact database administrator or operations team

---

**Last Updated**: 2025-08-29  
**Schema Version**: 010 (Performance Indexes)  
**Backup Strategy**: Daily + Weekly with automated testing  
**Monitoring**: Automated health checks with email alerts