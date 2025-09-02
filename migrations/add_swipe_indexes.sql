-- Migration: Add indexes for swipe feature performance optimization
-- Date: 2025-08-31
-- Purpose: Optimize database queries for the swipe feature

-- EXISTING INDEXES WE CAN USE:
-- idx_animals_dog_profiler_data: GIN index on dog_profiler_data JSONB
-- idx_animals_created_desc: For ordering by created_at DESC (available dogs)
-- idx_organizations_country: For filtering by organization country
-- idx_animals_organization: For joining with organizations table
-- idx_animals_properties: GIN index on properties JSONB

-- NEW INDEXES NEEDED:

-- 1. Index for quality_score filtering (most critical for swipe performance)
-- This enables fast filtering of dogs with quality_score > 0.7
CREATE INDEX IF NOT EXISTS idx_animals_quality_score 
ON animals (((properties->>'quality_score')::float))
WHERE (properties->>'quality_score')::float > 0.7 
  AND dog_profiler_data IS NOT NULL;

-- 2. Composite index for swipe query optimization
-- Combines org join + quality filtering for optimal query plan
CREATE INDEX IF NOT EXISTS idx_animals_swipe_composite 
ON animals (organization_id, created_at DESC)
WHERE (properties->>'quality_score')::float > 0.7 
  AND dog_profiler_data IS NOT NULL
  AND status = 'available';

-- Analyze tables to update statistics for query planner
ANALYZE animals;
ANALYZE organizations;