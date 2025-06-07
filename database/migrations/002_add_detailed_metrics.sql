-- Migration: Add detailed metrics tracking to scrape logs
-- Description: Add JSONB column for storing detailed scrape metrics and duration tracking

BEGIN;

-- Add detailed metrics column to scrape_logs
ALTER TABLE scrape_logs 
ADD COLUMN IF NOT EXISTS detailed_metrics JSONB,
ADD COLUMN IF NOT EXISTS duration_seconds NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS data_quality_score NUMERIC(3,2) CHECK (data_quality_score >= 0 AND data_quality_score <= 1);

-- Add indexes for querying metrics
CREATE INDEX IF NOT EXISTS idx_scrape_logs_detailed_metrics ON scrape_logs USING gin(detailed_metrics);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_duration ON scrape_logs(duration_seconds);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_quality_score ON scrape_logs(data_quality_score);

COMMIT;