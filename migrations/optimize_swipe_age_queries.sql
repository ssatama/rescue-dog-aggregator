-- Migration: Optimize swipe age queries with indexes
-- Date: 2025-01-02
-- Purpose: Add indexes to improve performance of age filtering in swipe endpoint

-- Create GIN index for age_text pattern matching
-- This will speed up regex queries on the age_text field
CREATE INDEX IF NOT EXISTS idx_animals_age_text_pattern 
ON animals USING gin(age_text gin_trgm_ops);

-- Create functional index for quality_score from dog_profiler_data JSONB
-- This will speed up filtering by quality_score > 0.7
CREATE INDEX IF NOT EXISTS idx_animals_quality_score 
ON animals((dog_profiler_data->>'quality_score')::float) 
WHERE dog_profiler_data IS NOT NULL;

-- Create index for status and animal_type combo
-- This will speed up the base query filter for available dogs
CREATE INDEX IF NOT EXISTS idx_animals_status_type 
ON animals(status, animal_type) 
WHERE status = 'available' AND animal_type = 'dog';

-- Create index for created_at to help with sorting new dogs
CREATE INDEX IF NOT EXISTS idx_animals_created_at 
ON animals(created_at DESC);

-- Note: Run ANALYZE after creating indexes to update statistics
ANALYZE animals;