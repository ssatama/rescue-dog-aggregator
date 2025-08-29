# Database Administrator Runbook - Rescue Dog Aggregator

## Emergency Contacts & Information

**Database Type**: PostgreSQL  
**Application**: Rescue Dog Aggregator  
**Primary Tables**: animals, organizations, scrape_logs, service_regions  
**Expected RTO**: 15 minutes  
**Expected RPO**: 1 hour  

## 1. Daily Operations Checklist

### Morning Health Check (5 minutes)
```sql
-- Check database connectivity and basic metrics
SELECT 
    COUNT(*) as total_animals,
    COUNT(*) FILTER (WHERE status = 'available') as available_animals,
    COUNT(DISTINCT organization_id) as active_organizations
FROM animals;

-- Check recent scraping activity
SELECT 
    organization_id,
    MAX(started_at) as last_scrape,
    COUNT(*) as scrapes_last_24h
FROM scrape_logs 
WHERE started_at > NOW() - INTERVAL '24 hours'
GROUP BY organization_id
ORDER BY last_scrape DESC;

-- Check database size and growth
SELECT 
    pg_size_pretty(pg_database_size(current_database())) as database_size,
    pg_size_pretty(pg_total_relation_size('animals')) as animals_table_size;
```

### Performance Monitoring
```sql
-- Check index usage statistics
SELECT 
    schemaname, tablename, indexname,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    round(idx_tup_fetch::numeric / NULLIF(idx_scan, 0), 2) as avg_fetch_per_scan
FROM pg_stat_user_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('animals', 'organizations')
  AND idx_scan > 0
ORDER BY idx_scan DESC
LIMIT 20;

-- Check slow queries (if pg_stat_statements enabled)
-- SELECT query, calls, total_time, mean_time 
-- FROM pg_stat_statements 
-- ORDER BY mean_time DESC LIMIT 10;
```

## 2. Backup Strategy

### Automated Daily Backups
```bash
#!/bin/bash
# backup_daily.sh - Run via cron daily at 2 AM

DB_NAME="rescue_dogs"
BACKUP_DIR="/var/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${DATE}.sql.gz"

# Create backup with compression
pg_dump -h localhost -U postgres -d $DB_NAME | gzip > $BACKUP_FILE

# Verify backup file was created
if [ -f "$BACKUP_FILE" ]; then
    echo "Backup created successfully: $BACKUP_FILE"
    
    # Test backup integrity
    gunzip -t $BACKUP_FILE
    if [ $? -eq 0 ]; then
        echo "Backup integrity verified"
    else
        echo "ERROR: Backup file corrupted!" | mail -s "DB Backup Failed" admin@example.com
    fi
else
    echo "ERROR: Backup failed!" | mail -s "DB Backup Failed" admin@example.com
fi

# Clean up backups older than 30 days
find $BACKUP_DIR -name "${DB_NAME}_*.sql.gz" -mtime +30 -delete
```

### Weekly Full Backup with Point-in-Time Recovery
```bash
#!/bin/bash
# backup_weekly.sh - Run via cron weekly on Sunday at 1 AM

DB_NAME="rescue_dogs"
BACKUP_BASE="/var/backups/postgresql/weekly"
DATE=$(date +%Y%m%d)

# Base backup for point-in-time recovery
pg_basebackup -h localhost -U postgres -D "${BACKUP_BASE}/${DATE}" -Ft -z -P

# Archive WAL files (configure postgresql.conf for WAL archiving)
# archive_mode = on
# archive_command = 'cp %p /var/backups/postgresql/wal/%f'
```

### Backup Testing Script
```bash
#!/bin/bash
# test_backup.sh - Run monthly to verify backup restoration

DB_TEST="rescue_dogs_test"
LATEST_BACKUP=$(ls -t /var/backups/postgresql/rescue_dogs_*.sql.gz | head -1)

# Drop test database if exists
dropdb -h localhost -U postgres $DB_TEST 2>/dev/null

# Create test database
createdb -h localhost -U postgres $DB_TEST

# Restore from backup
gunzip -c $LATEST_BACKUP | psql -h localhost -U postgres -d $DB_TEST

# Verify restoration
COUNT=$(psql -h localhost -U postgres -d $DB_TEST -t -c "SELECT COUNT(*) FROM animals;")
if [ $COUNT -gt 0 ]; then
    echo "Backup restoration test PASSED: $COUNT animals restored"
else
    echo "Backup restoration test FAILED!" | mail -s "Backup Test Failed" admin@example.com
fi

# Cleanup
dropdb -h localhost -U postgres $DB_TEST
```

## 3. Replication Setup

### Master Configuration (postgresql.conf)
```ini
# Replication settings
wal_level = replica
max_wal_senders = 3
max_replication_slots = 3
synchronous_commit = on
synchronous_standby_names = 'standby1'

# Archive settings for point-in-time recovery
archive_mode = on
archive_command = 'cp %p /var/backups/postgresql/wal/%f'
archive_timeout = 300
```

### Replica Setup Script
```bash
#!/bin/bash
# setup_replica.sh

MASTER_HOST="10.0.1.10"
REPLICA_DATA_DIR="/var/lib/postgresql/13/replica"
REPLICATION_USER="replicator"

# Stop PostgreSQL on replica
systemctl stop postgresql

# Clear replica data directory
rm -rf $REPLICA_DATA_DIR/*

# Create base backup from master
pg_basebackup -h $MASTER_HOST -D $REPLICA_DATA_DIR -U $REPLICATION_USER -v -P -W

# Create recovery.conf for replica
cat > $REPLICA_DATA_DIR/recovery.conf << EOF
standby_mode = 'on'
primary_conninfo = 'host=$MASTER_HOST port=5432 user=$REPLICATION_USER'
trigger_file = '/tmp/postgresql.trigger'
EOF

# Start replica
systemctl start postgresql
```

### Replication Monitoring
```sql
-- On Master: Check replication status
SELECT 
    client_addr,
    application_name,
    state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn,
    sync_state
FROM pg_stat_replication;

-- On Replica: Check lag
SELECT 
    now() - pg_last_xact_replay_timestamp() AS replication_delay,
    pg_is_in_recovery() as is_replica;
```

## 4. User Management & Security

### Create Application Users
```sql
-- Read-only user for analytics
CREATE ROLE analytics_readonly;
GRANT CONNECT ON DATABASE rescue_dogs TO analytics_readonly;
GRANT USAGE ON SCHEMA public TO analytics_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO analytics_readonly;

-- Application user for scraping
CREATE ROLE scraper_app;
GRANT CONNECT ON DATABASE rescue_dogs TO scraper_app;
GRANT USAGE ON SCHEMA public TO scraper_app;
GRANT SELECT, INSERT, UPDATE ON animals, organizations, scrape_logs TO scraper_app;
GRANT SELECT ON service_regions TO scraper_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO scraper_app;

-- Web application user
CREATE ROLE webapp;
GRANT CONNECT ON DATABASE rescue_dogs TO webapp;
GRANT USAGE ON SCHEMA public TO webapp;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO webapp;
GRANT INSERT, UPDATE ON scrape_logs TO webapp;

-- Create actual users
CREATE USER analytics_user WITH PASSWORD 'secure_password_1';
GRANT analytics_readonly TO analytics_user;

CREATE USER scraper_user WITH PASSWORD 'secure_password_2';
GRANT scraper_app TO scraper_user;

CREATE USER web_user WITH PASSWORD 'secure_password_3';
GRANT webapp TO web_user;
```

### Security Audit Script
```sql
-- Check user permissions
SELECT 
    r.rolname as username,
    r.rolsuper as is_superuser,
    r.rolcreaterole as can_create_roles,
    r.rolcreatedb as can_create_db,
    r.rolcanlogin as can_login,
    r.rolvaliduntil as password_expires
FROM pg_roles r
WHERE r.rolcanlogin = true
ORDER BY r.rolname;

-- Check table permissions
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasinserts,
    hasupdates,
    hasdeletes
FROM pg_tables
WHERE schemaname = 'public';
```

## 5. Performance Monitoring & Optimization

### Key Performance Queries
```sql
-- Homepage performance check
EXPLAIN (ANALYZE, BUFFERS) 
SELECT a.*, o.name as org_name 
FROM animals a
JOIN organizations o ON a.organization_id = o.id
WHERE a.status = 'available' 
  AND o.active = true
ORDER BY a.availability_confidence, a.created_at DESC
LIMIT 50;

-- Index usage analysis
SELECT 
    t.tablename,
    indexname,
    c.reltuples::bigint AS num_rows,
    pg_size_pretty(pg_relation_size(quote_ident(t.tablename)::text)) AS table_size,
    pg_size_pretty(pg_relation_size(quote_ident(indexrelname)::text)) AS index_size,
    CASE WHEN indisunique THEN 'Y' ELSE 'N' END AS UNIQUE,
    idx_scan as number_of_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_tables t
LEFT OUTER JOIN pg_class c ON c.relname=t.tablename
LEFT OUTER JOIN 
    ( SELECT c.relname AS ctablename, ipg.relname AS indexname, x.indnatts AS number_of_columns, 
             idx_scan, idx_tup_read, idx_tup_fetch, indexrelname, indisunique FROM pg_index x
           JOIN pg_class c ON c.oid = x.indrelid
           JOIN pg_class ipg ON ipg.oid = x.indexrelid  
           JOIN pg_stat_all_indexes psai ON x.indexrelid = psai.indexrelid )
    AS foo
    ON t.tablename = foo.ctablename
WHERE t.schemaname='public'
ORDER BY 1,2;
```

### Weekly Maintenance Script
```bash
#!/bin/bash
# weekly_maintenance.sh - Run Sundays at 3 AM

DB_NAME="rescue_dogs"

# Update table statistics
psql -d $DB_NAME -c "ANALYZE;"

# Vacuum tables to reclaim space
psql -d $DB_NAME -c "VACUUM (ANALYZE, VERBOSE) animals;"
psql -d $DB_NAME -c "VACUUM (ANALYZE, VERBOSE) organizations;"
psql -d $DB_NAME -c "VACUUM (ANALYZE, VERBOSE) scrape_logs;"

# Check for unused indexes
psql -d $DB_NAME -c "
    SELECT schemaname, tablename, indexname, idx_scan
    FROM pg_stat_user_indexes
    WHERE idx_scan = 0
      AND schemaname = 'public'
    ORDER BY schemaname, tablename, indexname;"

# Reindex if fragmentation is high
# psql -d $DB_NAME -c "REINDEX INDEX CONCURRENTLY idx_animals_homepage_optimized;"
```

## 6. Disaster Recovery Procedures

### 3 AM Emergency Recovery Checklist

1. **Assess the Problem** (2 minutes)
   - Check if database is responding: `psql -d rescue_dogs -c "SELECT 1;"`
   - Check system resources: `df -h`, `free -m`, `top`
   - Check PostgreSQL logs: `tail -n 50 /var/log/postgresql/postgresql-13-main.log`

2. **Quick Fixes** (5 minutes)
   ```bash
   # Restart PostgreSQL service
   systemctl restart postgresql
   
   # Check if problem is connection limit
   psql -d rescue_dogs -c "SELECT count(*) FROM pg_stat_activity;"
   
   # Kill long-running queries if needed
   psql -d rescue_dogs -c "
       SELECT pg_terminate_backend(pid) 
       FROM pg_stat_activity 
       WHERE state = 'active' 
         AND query_start < now() - interval '10 minutes'
         AND query NOT LIKE '%pg_stat_activity%';"
   ```

3. **Data Recovery** (10 minutes if needed)
   ```bash
   # Find latest backup
   LATEST_BACKUP=$(ls -t /var/backups/postgresql/rescue_dogs_*.sql.gz | head -1)
   
   # Create recovery database
   createdb rescue_dogs_recovery
   
   # Restore from backup
   gunzip -c $LATEST_BACKUP | psql -d rescue_dogs_recovery
   
   # If data looks good, switch databases
   # (Coordinate with application team for maintenance window)
   ```

4. **Failover to Replica** (If replication is set up)
   ```bash
   # On replica server, promote to master
   touch /tmp/postgresql.trigger
   
   # Update application connection strings to point to new master
   # Update DNS or load balancer configuration
   ```

### Point-in-Time Recovery
```bash
#!/bin/bash
# point_in_time_recovery.sh
# Usage: ./point_in_time_recovery.sh "2024-08-29 14:30:00"

TARGET_TIME="$1"
RECOVERY_DIR="/var/lib/postgresql/recovery"
BASE_BACKUP_DIR="/var/backups/postgresql/weekly/20240825"  # Latest weekly backup
WAL_ARCHIVE="/var/backups/postgresql/wal"

# Stop PostgreSQL
systemctl stop postgresql

# Clear recovery directory
rm -rf $RECOVERY_DIR/*

# Extract base backup
tar -xzf $BASE_BACKUP_DIR/base.tar.gz -C $RECOVERY_DIR

# Create recovery.conf
cat > $RECOVERY_DIR/recovery.conf << EOF
restore_command = 'cp $WAL_ARCHIVE/%f %p'
recovery_target_time = '$TARGET_TIME'
recovery_target_action = 'promote'
EOF

# Start PostgreSQL with recovery
pg_ctl -D $RECOVERY_DIR start

# Monitor recovery progress
tail -f /var/log/postgresql/postgresql-13-main.log
```

## 7. Monitoring & Alerting Setup

### Critical Alerts
- Database down or unreachable
- Replication lag > 5 minutes
- Disk space < 10% free
- Connection count > 80% of max_connections
- No successful scrapes in last 6 hours

### Monitoring Queries for External Systems
```sql
-- Database health metrics
SELECT 
    'db_connections' as metric,
    count(*) as value
FROM pg_stat_activity
UNION ALL
SELECT 
    'db_size_mb' as metric,
    pg_database_size(current_database()) / (1024*1024) as value
UNION ALL
SELECT 
    'animals_available' as metric,
    count(*) as value
FROM animals WHERE status = 'available'
UNION ALL
SELECT 
    'successful_scrapes_last_hour' as metric,
    count(*) as value
FROM scrape_logs 
WHERE started_at > now() - interval '1 hour'
  AND status = 'completed';
```

### Connection Pooling with PgBouncer
```ini
# /etc/pgbouncer/pgbouncer.ini
[databases]
rescue_dogs = host=localhost port=5432 dbname=rescue_dogs

[pgbouncer]
listen_port = 6432
listen_addr = *
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
logfile = /var/log/pgbouncer/pgbouncer.log
pidfile = /var/run/pgbouncer/pgbouncer.pid

# Connection pool settings
pool_mode = transaction
max_client_conn = 200
default_pool_size = 25
reserve_pool_size = 5
```

## 8. Capacity Planning

### Growth Projections
- Current: ~2,200 animals, 8 organizations
- Expected growth: 100 new animals/day
- Storage growth: ~50MB/month
- Query load: Homepage queries are primary bottleneck

### Resource Monitoring
```sql
-- Monthly capacity report
SELECT 
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as new_animals,
    COUNT(DISTINCT organization_id) as active_orgs
FROM animals 
WHERE created_at > now() - interval '12 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month;

-- Storage usage trend
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 9. Troubleshooting Common Issues

### High CPU Usage
```sql
-- Check for sequential scans
SELECT schemaname, tablename, seq_scan, seq_tup_read, 
       idx_scan, idx_tup_fetch
FROM pg_stat_user_tables 
WHERE seq_scan > 1000 
ORDER BY seq_tup_read DESC;

-- Check for lock contention
SELECT blocked_locks.pid AS blocked_pid,
       blocked_activity.usename AS blocked_user,
       blocking_locks.pid AS blocking_pid,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query AS blocked_statement,
       blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.DATABASE IS NOT DISTINCT FROM blocked_locks.DATABASE
  AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
  AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
  AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
  AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
  AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
  AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
  AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
  AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.GRANTED;
```

### Disk Space Issues
```bash
# Check PostgreSQL data directory size
du -sh /var/lib/postgresql/*/main/

# Find largest tables and indexes
psql -d rescue_dogs -c "
    SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
        pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"

# Emergency space cleanup
psql -d rescue_dogs -c "VACUUM FULL VERBOSE animals;"
```

## 10. Performance Baseline Expectations

### Homepage Query Performance (with indexes)
- **Target**: < 50ms for 50 animals
- **Acceptable**: < 100ms
- **Alert threshold**: > 200ms

### Search Query Performance
- **Target**: < 200ms for text search
- **Acceptable**: < 500ms
- **Alert threshold**: > 1 second

### Database Size Growth
- **Current**: ~100MB
- **Growth rate**: ~50MB/month
- **Planning horizon**: Plan upgrades at 5GB

---

**Remember**: Always test recovery procedures in a non-production environment first!
**Emergency Contact**: admin@example.com
**On-call Rotation**: Check internal docs for current on-call schedule