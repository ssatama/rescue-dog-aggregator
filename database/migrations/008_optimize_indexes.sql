-- Migration 008: Optimize and consolidate indexes
-- Purpose: Reduce index proliferation, remove redundancies, sync environments
-- Target: Reduce from 50 to ~30 strategic indexes

-- ============================================================================
-- STEP 1: DROP REDUNDANT INDEXES
-- ============================================================================

-- Duplicate indexes (keep one, drop duplicates)
DROP INDEX IF EXISTS idx_animals_type;  -- Keep idx_animals_animal_type
DROP INDEX IF EXISTS idx_animals_active;  -- Use idx_animals_status instead
DROP INDEX IF EXISTS idx_animals_last_session;  -- Rarely queried
DROP INDEX IF EXISTS idx_animals_slug;  -- Keep animals_slug_key unique constraint

-- ============================================================================
-- STEP 2: CONSOLIDATE SEARCH INDEXES
-- ============================================================================

-- Remove overlapping text search indexes (keep trigram for fuzzy)
DROP INDEX IF EXISTS idx_animals_name_gin;  -- Redundant with trigram
DROP INDEX IF EXISTS idx_animals_breed_gin;  -- Redundant with trigram
-- Keep idx_animals_name_trgm for fuzzy search
-- Keep idx_animals_search_text for combined name+breed search

-- ============================================================================
-- STEP 3: OPTIMIZE JSONB PROFILER INDEXES
-- ============================================================================

-- Drop individual field indexes on dog_profiler_data
DROP INDEX IF EXISTS idx_animals_profiler_description;
DROP INDEX IF EXISTS idx_animals_profiler_tagline;
DROP INDEX IF EXISTS idx_animals_profiler_energy;
DROP INDEX IF EXISTS idx_animals_profiler_trainability;
DROP INDEX IF EXISTS idx_animals_profiler_experience;
DROP INDEX IF EXISTS idx_animals_profiler_detail_page;
DROP INDEX IF EXISTS idx_animals_profiler_compatibility;
DROP INDEX IF EXISTS idx_animals_has_profiler_data;

-- Keep only the main GIN index for JSONB queries
-- idx_animals_dog_profiler_data already exists and is sufficient

-- ============================================================================
-- STEP 4: CREATE MISSING STRATEGIC INDEXES (if not exists)
-- ============================================================================

-- Ensure critical composite indexes exist for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_animals_org_status_created 
ON animals (organization_id, status, created_at DESC) 
WHERE status = 'available';

-- Ensure covering index for filter counts (without age_category which doesn't exist)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_animals_filter_counts 
ON animals (status, organization_id, standardized_size, breed_group, sex) 
WHERE status = 'available';

-- ============================================================================
-- STEP 5: DOCUMENT REMAINING INDEXES
-- ============================================================================

COMMENT ON INDEX animals_pkey IS 'Primary key for unique identification';
COMMENT ON INDEX animals_external_id_org_unique IS 'Ensures unique external_id per organization';
COMMENT ON INDEX idx_animals_slug IS 'Unique constraint for URL slugs';

COMMENT ON INDEX idx_animals_status IS 'Filter by availability status';
COMMENT ON INDEX idx_animals_organization IS 'Filter by organization';
COMMENT ON INDEX idx_animals_animal_type IS 'Filter by animal type (dog, cat, etc)';
COMMENT ON INDEX idx_animals_breed IS 'Exact breed filtering';
COMMENT ON INDEX idx_animals_standardized_breed IS 'Standardized breed filtering';
COMMENT ON INDEX idx_animals_breed_group IS 'Breed group filtering (terrier, hound, etc)';

COMMENT ON INDEX idx_animals_sex IS 'Filter by sex (male/female)';
COMMENT ON INDEX idx_animals_size IS 'Filter by original size text';
COMMENT ON INDEX idx_animals_standardized_size IS 'Filter by standardized size';
COMMENT ON INDEX idx_animals_availability_confidence IS 'Filter by availability confidence level';

COMMENT ON INDEX idx_animals_name_trgm IS 'Fuzzy text search on names using trigrams';
COMMENT ON INDEX idx_animals_search_text IS 'Full-text search on name and breed combined';
COMMENT ON INDEX idx_animals_dog_profiler_data IS 'JSONB queries on profiler data';
COMMENT ON INDEX idx_animals_properties IS 'JSONB queries on properties';
COMMENT ON INDEX idx_animals_translations IS 'JSONB queries on translations';

COMMENT ON INDEX idx_animals_created_desc IS 'Sort by newest first (available only)';
COMMENT ON INDEX idx_animals_updated_desc IS 'Sort by recently updated (available only)';
COMMENT ON INDEX idx_animals_name_asc IS 'Sort alphabetically by name (available only)';

COMMENT ON INDEX idx_animals_org_status IS 'Composite: filter by org and status';
COMMENT ON INDEX idx_animals_status_availability IS 'Composite: status and confidence';
COMMENT ON INDEX idx_animals_size_status IS 'Composite: size and status filters';
COMMENT ON INDEX idx_animals_breed_group_status IS 'Composite: breed group and status';
COMMENT ON INDEX idx_animals_count_filters IS 'Covering index for count queries';
COMMENT ON INDEX idx_animals_sitemap_quality IS 'Sitemap generation with quality filtering';

COMMENT ON INDEX idx_animals_last_seen_at IS 'Track when animal was last seen';
COMMENT ON INDEX idx_animals_consecutive_missing IS 'Find stale records';
COMMENT ON INDEX idx_animals_original_image_url IS 'Lookup by original image';
COMMENT ON INDEX idx_animals_llm_processed_at IS 'Track LLM processing status';

-- Location-based partial indexes
COMMENT ON INDEX idx_animals_location_country IS 'Filter by location country (available only)';
COMMENT ON INDEX idx_animals_location_region IS 'Filter by location region (available only)';
COMMENT ON INDEX idx_animals_good_with_kids IS 'Compatibility filter: kids (available only)';
COMMENT ON INDEX idx_animals_good_with_dogs IS 'Compatibility filter: dogs (available only)';
COMMENT ON INDEX idx_animals_good_with_cats IS 'Compatibility filter: cats (available only)';

-- Age range index
COMMENT ON INDEX idx_animals_age_range_optimized IS 'Age range queries (available with age data)';

-- ============================================================================
-- STEP 6: UPDATE STATISTICS
-- ============================================================================

ANALYZE animals;

-- ============================================================================
-- MIGRATION SUMMARY
-- Expected result: ~30-35 strategic indexes (down from 50)
-- Removed: Redundant, rarely-used, and over-specific JSONB field indexes
-- Kept: Core filtering, sorting, search, and composite indexes
-- ============================================================================