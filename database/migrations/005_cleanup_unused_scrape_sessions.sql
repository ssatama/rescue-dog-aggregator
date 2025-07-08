-- Migration: Clean up unused scrape_sessions table and related columns
-- Description: Remove unused scrape_sessions table and related foreign key columns
-- Reason: Table exists but is never used, creating confusion and unnecessary complexity

BEGIN;

-- 1. Remove foreign key columns from animals table that reference scrape_sessions
ALTER TABLE animals 
DROP COLUMN IF EXISTS last_session_id,
DROP COLUMN IF EXISTS active;

-- 2. Drop the unused scrape_sessions table
DROP TABLE IF EXISTS scrape_sessions;

-- 3. Add comment to document the cleanup
COMMENT ON TABLE scrape_logs IS 'Primary scrape logging table - tracks scraper execution metrics and results';

COMMIT;