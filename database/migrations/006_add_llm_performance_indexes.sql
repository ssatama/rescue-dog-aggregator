-- Migration: Add performance indexes for LLM enhanced data queries
-- Purpose: Optimize queries for the new enhanced animal data API
-- Target: Support 20,000+ animals with <100ms single query, <500ms bulk operations

-- Specialized index for description (frequently accessed for detail pages)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_animals_profiler_description 
  ON animals ((dog_profiler_data->>'description')) 
  WHERE dog_profiler_data IS NOT NULL;

-- Specialized index for tagline (new requirement for detail pages)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_animals_profiler_tagline 
  ON animals ((dog_profiler_data->>'tagline')) 
  WHERE dog_profiler_data IS NOT NULL;

-- Composite index for detail page optimization (primary use case)
-- Use a simpler index without including the full JSONB column
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_animals_profiler_detail_page 
  ON animals (id, (dog_profiler_data IS NOT NULL))
  WHERE dog_profiler_data IS NOT NULL 
    AND dog_profiler_data != '{}'::jsonb;

-- Filter attributes index for efficient filtering
-- Covers energy_level, trainability, experience_level for filter queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_animals_profiler_energy 
  ON animals ((dog_profiler_data->>'energy_level'))
  WHERE dog_profiler_data IS NOT NULL 
    AND dog_profiler_data->>'energy_level' IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_animals_profiler_trainability 
  ON animals ((dog_profiler_data->>'trainability'))
  WHERE dog_profiler_data IS NOT NULL 
    AND dog_profiler_data->>'trainability' IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_animals_profiler_experience 
  ON animals ((dog_profiler_data->>'experience_level'))
  WHERE dog_profiler_data IS NOT NULL 
    AND dog_profiler_data->>'experience_level' IS NOT NULL;

-- Composite index for compatibility filters (good_with_*)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_animals_profiler_compatibility 
  ON animals (
    (dog_profiler_data->>'good_with_kids'),
    (dog_profiler_data->>'good_with_dogs'),
    (dog_profiler_data->>'good_with_cats')
  )
  WHERE dog_profiler_data IS NOT NULL;

-- Index for checking enhanced data availability
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_animals_has_profiler_data 
  ON animals ((dog_profiler_data IS NOT NULL))
  WHERE status = 'available';

-- Analyze the table to update statistics for query planner
ANALYZE animals;