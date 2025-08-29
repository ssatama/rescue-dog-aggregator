-- Migration 010 ROLLBACK: Remove enhanced performance indexes
-- Purpose: Rollback performance optimization indexes
-- Created: 2025-08-29
-- Use this file to undo migration 010_performance_indexes.sql

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- This rollback script removes the performance indexes added in migration 010
-- and restores the previous index structure where applicable.
-- 
-- WARNING: Rolling back these indexes will degrade homepage performance
-- Expected performance impact after rollback:
-- - Homepage queries: 60-80% slower
-- - Analytics queries: 70-90% slower  
-- - Location filtering: 50-70% slower
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: REMOVE ENHANCED COMPOSITE INDEXES
-- ============================================================================

-- Remove optimized homepage index
DROP INDEX IF EXISTS idx_animals_homepage_optimized;

-- Remove enhanced organization index  
DROP INDEX IF EXISTS idx_organizations_active_country;

-- Remove composite location index
DROP INDEX IF EXISTS idx_animals_location_composite;

-- Remove size/breed composite index
DROP INDEX IF EXISTS idx_animals_size_breed_status;

-- Remove analytics covering index
DROP INDEX IF EXISTS idx_animals_analytics_covering;

-- Remove enhanced search index
DROP INDEX IF EXISTS idx_animals_search_enhanced;

-- ============================================================================
-- STEP 2: RESTORE PREVIOUS INDEX STRUCTURE
-- ============================================================================

-- Restore original status + availability index
CREATE INDEX idx_animals_status_availability 
  ON animals (status, availability_confidence)
  WHERE status = 'available';

-- Restore original organization active index
CREATE INDEX idx_organizations_active 
  ON organizations (active, name)
  WHERE active = true;

-- Restore individual location indexes
CREATE INDEX idx_animals_location_country 
  ON animals ((properties->>'location_country'))
  WHERE status = 'available' 
    AND properties->>'location_country' IS NOT NULL;

CREATE INDEX idx_animals_location_region 
  ON animals ((properties->>'location_region'))
  WHERE status = 'available' 
    AND properties->>'location_region' IS NOT NULL;

-- Restore original size status index
CREATE INDEX idx_animals_size_status 
  ON animals (standardized_size, status)
  WHERE status = 'available' 
    AND standardized_size IS NOT NULL;

-- Restore original filter counts indexes
CREATE INDEX idx_animals_count_filters 
  ON animals (status, organization_id, standardized_size, breed_group)
  WHERE status = 'available';

CREATE INDEX idx_animals_filter_counts 
  ON animals (status, organization_id, standardized_size, breed_group, sex)
  WHERE status = 'available';

-- Restore original search index
CREATE INDEX idx_animals_search_text 
  ON animals USING gin (
    to_tsvector('english', 
      COALESCE(name, '') || ' ' || 
      COALESCE(breed, '')
    )
  )
  WHERE status = 'available';

-- ============================================================================
-- STEP 3: ADD COMMENTS TO RESTORED INDEXES
-- ============================================================================

COMMENT ON INDEX idx_animals_status_availability IS 
  'Restored original index for status and availability filtering';

COMMENT ON INDEX idx_organizations_active IS 
  'Restored original index for active organizations';

COMMENT ON INDEX idx_animals_location_country IS 
  'Restored original index for location country filtering';

COMMENT ON INDEX idx_animals_location_region IS 
  'Restored original index for location region filtering';

COMMENT ON INDEX idx_animals_size_status IS 
  'Restored original index for size filtering';

COMMENT ON INDEX idx_animals_count_filters IS 
  'Restored original index for count and filter queries';

COMMENT ON INDEX idx_animals_filter_counts IS 
  'Restored original index for comprehensive filter counts';

COMMENT ON INDEX idx_animals_search_text IS 
  'Restored original full-text search index';

-- ============================================================================
-- STEP 4: UPDATE STATISTICS
-- ============================================================================

ANALYZE animals;
ANALYZE organizations;

COMMIT;

-- ============================================================================
-- POST-ROLLBACK VERIFICATION
-- ============================================================================

-- After running this rollback, verify the restore with:
-- 
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
--   AND tablename IN ('animals', 'organizations')
--   AND indexname IN (
--     'idx_animals_status_availability',
--     'idx_organizations_active',
--     'idx_animals_location_country',
--     'idx_animals_location_region',
--     'idx_animals_size_status',
--     'idx_animals_count_filters',
--     'idx_animals_filter_counts',
--     'idx_animals_search_text'
--   )
-- ORDER BY tablename, indexname;

-- ============================================================================
-- PERFORMANCE EXPECTATIONS AFTER ROLLBACK
-- ============================================================================

-- 1. Homepage queries: Will return to baseline performance (slower)
-- 2. Analytics queries: Will use less efficient individual indexes
-- 3. Location filtering: Will require separate index lookups
-- 4. Search queries: Limited to name + breed only (no descriptions)
-- 5. Overall database size: Reduced by ~5-10%
-- 6. Write performance: Slightly improved due to fewer indexes

-- ============================================================================
-- NOTES
-- ============================================================================

-- This rollback is safe to run and will not affect data integrity.
-- However, application performance will degrade significantly.
-- 
-- If rollback is due to performance issues with the new indexes,
-- consider running VACUUM ANALYZE before rolling back, as the
-- issue might be stale statistics rather than the indexes themselves.