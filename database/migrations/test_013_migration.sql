-- Test script for migration 013_adoption_status_tracking
-- Run this on a test database to validate the migration

-- Pre-migration setup: Create test data
BEGIN;

-- Create some test animals with different statuses
INSERT INTO animals (name, status, availability_confidence, consecutive_scrapes_missing, organization_id, animal_type)
VALUES 
    ('Test Dog 1', 'available', 'high', 0, 1, 'dog'),
    ('Test Dog 2', 'unavailable', 'low', 5, 1, 'dog'),
    ('Test Dog 3', 'unavailable', 'low', 10, 1, 'dog')
ON CONFLICT DO NOTHING;

-- Record initial state
SELECT 'BEFORE MIGRATION:' as phase;
SELECT status, COUNT(*) as count 
FROM animals 
WHERE name LIKE 'Test Dog%'
GROUP BY status;

COMMIT;

-- Run the migration
\i 013_adoption_status_tracking.sql

-- Test post-migration state
BEGIN;

-- Check that unavailable became unknown
SELECT 'AFTER MIGRATION:' as phase;
SELECT status, COUNT(*) as count 
FROM animals 
WHERE name LIKE 'Test Dog%'
GROUP BY status;

-- Test new status values
UPDATE animals 
SET status = 'adopted', 
    adoption_check_data = '{"evidence": "test", "confidence": 0.95}'::jsonb,
    adoption_checked_at = NOW()
WHERE name = 'Test Dog 1';

UPDATE animals 
SET status = 'reserved'
WHERE name = 'Test Dog 2';

-- Verify constraints work
SELECT 'Testing valid status values:' as test;
SELECT name, status, adoption_check_data IS NOT NULL as has_adoption_data
FROM animals 
WHERE name LIKE 'Test Dog%'
ORDER BY name;

-- Try invalid status (should fail)
SELECT 'Testing invalid status (should fail):' as test;
UPDATE animals 
SET status = 'invalid_status'
WHERE name = 'Test Dog 3';  -- This should raise an error

ROLLBACK;

-- Test the rollback
\i 013_adoption_status_tracking_rollback.sql

-- Verify rollback worked
SELECT 'AFTER ROLLBACK:' as phase;
SELECT status, COUNT(*) as count 
FROM animals 
WHERE name LIKE 'Test Dog%'
GROUP BY status;

-- Clean up test data
DELETE FROM animals WHERE name LIKE 'Test Dog%';