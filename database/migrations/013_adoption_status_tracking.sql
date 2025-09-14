-- Migration: Add adoption status tracking
-- Date: 2025-01-14
-- Purpose: Enable tracking of dog adoption outcomes (adopted/reserved/unknown)
-- while preserving SEO by keeping all dogs in sitemap

BEGIN;

-- Step 1: Update existing status values
-- Change 'unavailable' to 'unknown' to better represent the state
UPDATE animals 
SET status = 'unknown' 
WHERE status = 'unavailable';

-- Step 2: Add CHECK constraint for valid status values
-- Using CHECK instead of ENUM for easier future modifications
ALTER TABLE animals 
DROP CONSTRAINT IF EXISTS animals_status_check;

ALTER TABLE animals 
ADD CONSTRAINT animals_status_check 
CHECK (status IN ('available', 'unknown', 'adopted', 'reserved'));

-- Step 3: Add adoption tracking columns
ALTER TABLE animals 
ADD COLUMN IF NOT EXISTS adoption_check_data JSONB,
ADD COLUMN IF NOT EXISTS adoption_checked_at TIMESTAMP;

-- Step 4: Create performance index for adoption checking queries
-- This index optimizes the query to find dogs needing adoption checks
CREATE INDEX IF NOT EXISTS idx_animals_adoption_check 
ON animals(organization_id, consecutive_scrapes_missing, status)
WHERE status NOT IN ('adopted', 'reserved');

-- Step 5: Create index for adoption_checked_at for monitoring
CREATE INDEX IF NOT EXISTS idx_animals_adoption_checked_at
ON animals(adoption_checked_at)
WHERE adoption_checked_at IS NOT NULL;

-- Step 6: Add comment documentation
COMMENT ON COLUMN animals.status IS 'Dog availability status: available (shown in listings), unknown (checking status), adopted (found home), reserved (adoption pending)';
COMMENT ON COLUMN animals.adoption_check_data IS 'Firecrawl API response data including evidence and confidence score';
COMMENT ON COLUMN animals.adoption_checked_at IS 'Timestamp of last adoption status check via Firecrawl';

-- Step 7: Update migration tracking
INSERT INTO schema_migrations (version, description) 
VALUES ('013', 'Add adoption status tracking with adopted/reserved states')
ON CONFLICT (version) DO NOTHING;

-- Step 8: Verify migration success
DO $$
DECLARE
    unknown_count INTEGER;
    constraint_exists BOOLEAN;
BEGIN
    -- Check that unavailable was converted to unknown
    SELECT COUNT(*) INTO unknown_count 
    FROM animals 
    WHERE status = 'unavailable';
    
    IF unknown_count > 0 THEN
        RAISE EXCEPTION 'Migration failed: % animals still have status=unavailable', unknown_count;
    END IF;
    
    -- Check that constraint was created
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.check_constraints 
        WHERE constraint_name = 'animals_status_check'
    ) INTO constraint_exists;
    
    IF NOT constraint_exists THEN
        RAISE EXCEPTION 'Migration failed: status check constraint not created';
    END IF;
    
    RAISE NOTICE 'Migration 013 completed successfully';
END $$;

COMMIT;