-- Performance & Monitoring Queries
-- Critical queries for production monitoring and optimization

-- ============================================
-- INDEX USAGE ANALYSIS
-- ============================================

-- Most used indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC
LIMIT 20;

-- Unused indexes (candidates for removal)
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public' 
  AND idx_scan = 0
  AND indexname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================
-- QUERY PERFORMANCE
-- ============================================

-- Slow queries (requires pg_stat_statements extension)
-- SELECT query, calls, mean_exec_time, max_exec_time, total_exec_time
-- FROM pg_stat_statements
-- WHERE query NOT LIKE '%pg_stat%'
-- ORDER BY mean_exec_time DESC
-- LIMIT 10;

-- Table scan statistics
SELECT 
    schemaname,
    tablename,
    seq_scan as sequential_scans,
    seq_tup_read as seq_tuples_read,
    idx_scan as index_scans,
    idx_tup_fetch as idx_tuples_fetched,
    CASE 
        WHEN seq_scan + idx_scan = 0 THEN 0
        ELSE ROUND(100.0 * seq_scan / (seq_scan + idx_scan), 2)
    END as seq_scan_percentage
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY seq_scan DESC;

-- ============================================
-- DATABASE HEALTH
-- ============================================

-- Table bloat estimation
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indexes_size,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_tuple_percent
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_dead_tup DESC;

-- Connection stats
SELECT 
    datname,
    numbackends as active_connections,
    xact_commit as committed_transactions,
    xact_rollback as rolled_back_transactions,
    blks_read as disk_blocks_read,
    blks_hit as buffer_hits,
    ROUND(100.0 * blks_hit / NULLIF(blks_hit + blks_read, 0), 2) as cache_hit_ratio
FROM pg_stat_database
WHERE datname = current_database();

-- Lock monitoring
SELECT 
    pg_locks.pid,
    pg_stat_activity.query,
    pg_locks.mode,
    pg_locks.granted,
    pg_stat_activity.state,
    age(now(), pg_stat_activity.query_start) as query_age
FROM pg_locks
JOIN pg_stat_activity ON pg_locks.pid = pg_stat_activity.pid
WHERE pg_locks.relation IS NOT NULL
ORDER BY query_age DESC;

-- ============================================
-- DATA GROWTH TRENDS
-- ============================================

-- Daily dog growth
SELECT 
    DATE(created_at) as date,
    COUNT(*) as dogs_added,
    SUM(COUNT(*)) OVER (ORDER BY DATE(created_at)) as cumulative_total
FROM animals
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Organization growth rates (last 30 days)
SELECT 
    o.name,
    COUNT(CASE WHEN a.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as last_7_days,
    COUNT(CASE WHEN a.created_at >= CURRENT_DATE - INTERVAL '14 days' 
              AND a.created_at < CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as prev_7_days,
    COUNT(CASE WHEN a.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as last_30_days,
    ROUND(100.0 * 
        (COUNT(CASE WHEN a.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) - 
         COUNT(CASE WHEN a.created_at >= CURRENT_DATE - INTERVAL '14 days' 
                    AND a.created_at < CURRENT_DATE - INTERVAL '7 days' THEN 1 END)) / 
        NULLIF(COUNT(CASE WHEN a.created_at >= CURRENT_DATE - INTERVAL '14 days' 
                    AND a.created_at < CURRENT_DATE - INTERVAL '7 days' THEN 1 END), 0), 1) as week_over_week_change
FROM organizations o
LEFT JOIN animals a ON o.id = a.organization_id AND a.active = true
WHERE o.active = true
GROUP BY o.name
ORDER BY last_7_days DESC;

-- ============================================
-- SCRAPING PERFORMANCE
-- ============================================

-- Scraping efficiency metrics
SELECT 
    DATE(started_at) as date,
    COUNT(*) as total_scrapes,
    AVG(duration_seconds) as avg_duration,
    MAX(duration_seconds) as max_duration,
    SUM(dogs_found) as total_dogs_found,
    SUM(dogs_added) as total_dogs_added,
    AVG(data_quality_score) as avg_quality,
    ROUND(100.0 * SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / COUNT(*), 1) as success_rate
FROM scrape_logs
WHERE started_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(started_at)
ORDER BY date DESC;

-- Hourly scraping pattern
SELECT 
    EXTRACT(HOUR FROM started_at) as hour,
    COUNT(*) as scrape_count,
    AVG(duration_seconds) as avg_duration,
    AVG(dogs_found) as avg_dogs_found
FROM scrape_logs
WHERE started_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY EXTRACT(HOUR FROM started_at)
ORDER BY hour;

-- ============================================
-- API PERFORMANCE INDICATORS
-- ============================================

-- Most accessed dogs (if you track views)
-- This would require a views/interactions table

-- Cache effectiveness (availability confidence as proxy)
SELECT 
    availability_confidence,
    COUNT(*) as count,
    AVG(EXTRACT(EPOCH FROM (NOW() - last_seen_at))/3600) as avg_hours_since_seen
FROM animals
WHERE active = true AND status = 'available'
GROUP BY availability_confidence
ORDER BY 
    CASE availability_confidence
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 3
    END;

-- ============================================
-- ALERTS & THRESHOLDS
-- ============================================

-- Critical alerts check
SELECT 
    'Organizations not scraped in 48h' as alert,
    COUNT(*) as count
FROM organizations o
WHERE o.active = true 
  AND NOT EXISTS (
    SELECT 1 FROM scrape_logs sl 
    WHERE sl.organization_id = o.id 
    AND sl.started_at > NOW() - INTERVAL '48 hours'
  )
UNION ALL
SELECT 
    'Dogs with very old last_seen (>30 days)',
    COUNT(*)
FROM animals
WHERE active = true 
  AND last_seen_at < NOW() - INTERVAL '30 days'
UNION ALL
SELECT 
    'Failed scrapes in last 24h',
    COUNT(*)
FROM scrape_logs
WHERE status = 'error' 
  AND started_at > NOW() - INTERVAL '24 hours'
UNION ALL
SELECT 
    'Tables with >20% dead tuples',
    COUNT(*)
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_dead_tup > 0.2 * n_live_tup;
