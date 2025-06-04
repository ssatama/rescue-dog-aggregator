-- Migration: Add duplicate detection and stale data tracking
-- Description: Add columns and constraints for duplicate prevention and stale data detection

BEGIN;

-- Add new columns for stale data tracking
ALTER TABLE animals 
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS consecutive_scrapes_missing INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS availability_confidence VARCHAR(10) DEFAULT 'high' CHECK (availability_confidence IN ('high', 'medium', 'low'));

-- Create unique constraint to prevent duplicates
-- This ensures one animal per (external_id, organization_id) combination
ALTER TABLE animals 
ADD CONSTRAINT animals_external_id_org_unique 
UNIQUE (external_id, organization_id);

-- Add indexes for performance on new columns
CREATE INDEX IF NOT EXISTS idx_animals_last_seen_at ON animals(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_animals_consecutive_missing ON animals(consecutive_scrapes_missing);
CREATE INDEX IF NOT EXISTS idx_animals_availability_confidence ON animals(availability_confidence);

-- Update existing animals to have proper last_seen_at values
-- Set to created_at or current timestamp if created_at is null
UPDATE animals 
SET last_seen_at = COALESCE(created_at, CURRENT_TIMESTAMP)
WHERE last_seen_at IS NULL;

COMMIT;