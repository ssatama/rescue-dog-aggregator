-- Migration 009: Security fixes and index restoration
-- Purpose: Add transaction management, restore GIN indexes, add monitoring
-- Created: 2025-08-22

-- ============================================================================
-- TRANSACTION MANAGEMENT
-- Note: CONCURRENTLY operations cannot be in transactions, handled separately
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: RESTORE GIN INDEXES FOR EXACT TEXT SEARCH
-- These were mistakenly dropped in migration 008, but serve different purposes
-- than trigram indexes (exact vs fuzzy search)
-- ============================================================================

-- Restore exact name search (for autocomplete and exact matches)
-- Note: Cannot use CONCURRENTLY inside transaction
CREATE INDEX IF NOT EXISTS idx_animals_name_gin 
  ON animals USING gin (to_tsvector('english', name))
  WHERE status = 'available';

-- Restore exact breed search
CREATE INDEX IF NOT EXISTS idx_animals_breed_gin 
  ON animals USING gin (to_tsvector('english', breed))
  WHERE status = 'available' AND breed IS NOT NULL;

-- ============================================================================
-- STEP 2: ADD INDEX MONITORING TABLE
-- Track index usage and effectiveness
-- ============================================================================

CREATE TABLE IF NOT EXISTS index_monitoring (
    id SERIAL PRIMARY KEY,
    monitoring_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    index_name VARCHAR(255) NOT NULL,
    table_name VARCHAR(255) NOT NULL,
    idx_scan BIGINT,
    idx_tup_read BIGINT,
    idx_tup_fetch BIGINT,
    index_size_bytes BIGINT,
    table_size_bytes BIGINT,
    effectiveness_score DECIMAL(5, 2),
    notes TEXT
);

-- Create index on monitoring table for quick lookups
CREATE INDEX IF NOT EXISTS idx_monitoring_date_table 
  ON index_monitoring (monitoring_date DESC, table_name);

-- ============================================================================
-- STEP 3: ADD INDEX BACKUP TABLE FOR ROLLBACK CAPABILITY
-- Store index definitions before modifications
-- ============================================================================

CREATE TABLE IF NOT EXISTS index_backups (
    id SERIAL PRIMARY KEY,
    backup_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    table_name VARCHAR(255) NOT NULL,
    index_name VARCHAR(255) NOT NULL,
    index_definition TEXT NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('CREATE', 'DROP', 'MODIFY')),
    applied BOOLEAN DEFAULT FALSE,
    rollback_definition TEXT
);

-- Index for finding latest backups
CREATE INDEX IF NOT EXISTS idx_backup_date_table 
  ON index_backups (backup_date DESC, table_name);

-- ============================================================================
-- STEP 4: CREATE MONITORING FUNCTION
-- Function to capture index statistics
-- ============================================================================

CREATE OR REPLACE FUNCTION capture_index_stats() RETURNS void AS $$
DECLARE
    rec RECORD;
BEGIN
    -- Capture statistics for all indexes
    FOR rec IN 
        SELECT 
            s.indexrelname AS index_name,
            s.relname AS table_name,
            s.idx_scan,
            s.idx_tup_read,
            s.idx_tup_fetch,
            pg_relation_size(s.indexrelid) AS index_size,
            pg_relation_size(s.relid) AS table_size,
            CASE 
                WHEN s.idx_scan = 0 THEN 0
                ELSE ROUND((s.idx_tup_fetch::numeric / NULLIF(s.idx_scan, 0))::numeric, 2)
            END AS effectiveness
        FROM pg_stat_user_indexes s
        WHERE s.schemaname = 'public'
    LOOP
        INSERT INTO index_monitoring (
            index_name, table_name, idx_scan, idx_tup_read, 
            idx_tup_fetch, index_size_bytes, table_size_bytes, 
            effectiveness_score
        ) VALUES (
            rec.index_name, rec.table_name, rec.idx_scan, 
            rec.idx_tup_read, rec.idx_tup_fetch, rec.index_size, 
            rec.table_size, rec.effectiveness
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 5: ADD COMMENTS FOR RESTORED INDEXES
-- ============================================================================

COMMENT ON INDEX idx_animals_name_gin IS 'GIN index for exact text search on animal names';
COMMENT ON INDEX idx_animals_breed_gin IS 'GIN index for exact text search on breeds';
COMMENT ON TABLE index_monitoring IS 'Tracks index usage statistics for performance monitoring';
COMMENT ON TABLE index_backups IS 'Stores index definitions for rollback capability';

-- ============================================================================
-- STEP 6: ANALYZE TABLES
-- ============================================================================

ANALYZE animals;
ANALYZE organizations;
ANALYZE index_monitoring;
ANALYZE index_backups;

-- ============================================================================
-- COMMIT TRANSACTION
-- ============================================================================

COMMIT;

-- ============================================================================
-- INDEXES THAT REQUIRE CONCURRENTLY (RUN SEPARATELY)
-- These must be run outside of a transaction
-- ============================================================================

-- Run these separately after the main migration:
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_animals_name_gin_concurrent 
--   ON animals USING gin (to_tsvector('english', name))
--   WHERE status = 'available';

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- If this migration needs to be rolled back, run:
-- 
-- BEGIN;
-- DROP INDEX IF EXISTS idx_animals_name_gin;
-- DROP INDEX IF EXISTS idx_animals_breed_gin;
-- DROP TABLE IF EXISTS index_monitoring CASCADE;
-- DROP TABLE IF EXISTS index_backups CASCADE;
-- DROP FUNCTION IF EXISTS capture_index_stats();
-- COMMIT;
-- ============================================================================