-- Rollback Migration: Remove adoption status tracking
-- Date: 2025-01-14
-- Purpose: Rollback script for migration 013_adoption_status_tracking.sql

BEGIN;

-- Step 1: Revert status values from 'unknown' back to 'unavailable'
UPDATE animals 
SET status = 'unavailable' 
WHERE status = 'unknown';

-- Step 2: Remove any adopted/reserved statuses (revert to unavailable)
-- This preserves data integrity by not losing dogs
UPDATE animals 
SET status = 'unavailable' 
WHERE status IN ('adopted', 'reserved');

-- Step 3: Drop the new CHECK constraint
ALTER TABLE animals 
DROP CONSTRAINT IF EXISTS animals_status_check;

-- Step 4: Remove adoption tracking columns
ALTER TABLE animals 
DROP COLUMN IF EXISTS adoption_check_data,
DROP COLUMN IF EXISTS adoption_checked_at;

-- Step 5: Drop adoption-related indexes
DROP INDEX IF EXISTS idx_animals_adoption_check;
DROP INDEX IF EXISTS idx_animals_adoption_checked_at;

-- Step 6: Remove migration tracking
DELETE FROM schema_migrations 
WHERE version = '013';

-- Step 7: Verify rollback success
DO $$
DECLARE
    new_status_count INTEGER;
    column_exists BOOLEAN;
BEGIN
    -- Check that no new status values remain
    SELECT COUNT(*) INTO new_status_count 
    FROM animals 
    WHERE status IN ('unknown', 'adopted', 'reserved');
    
    IF new_status_count > 0 THEN
        RAISE EXCEPTION 'Rollback failed: % animals still have new status values', new_status_count;
    END IF;
    
    -- Check that adoption columns were removed
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'animals' 
        AND column_name IN ('adoption_check_data', 'adoption_checked_at')
    ) INTO column_exists;
    
    IF column_exists THEN
        RAISE EXCEPTION 'Rollback failed: adoption columns still exist';
    END IF;
    
    RAISE NOTICE 'Rollback of migration 013 completed successfully';
END $$;

COMMIT;