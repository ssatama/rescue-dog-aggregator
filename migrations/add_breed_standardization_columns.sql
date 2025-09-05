-- Migration: Add breed standardization columns
-- Date: 2025-01-05
-- Purpose: Add columns for unified breed data standardization feature

-- Add the 4 new breed-related columns to the animals table
ALTER TABLE animals 
ADD COLUMN IF NOT EXISTS breed_confidence VARCHAR(50),
ADD COLUMN IF NOT EXISTS breed_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS primary_breed VARCHAR(100),
ADD COLUMN IF NOT EXISTS secondary_breed VARCHAR(100);

-- Add indexes for breed columns to optimize queries
CREATE INDEX IF NOT EXISTS idx_animals_breed_confidence ON animals (breed_confidence);
CREATE INDEX IF NOT EXISTS idx_animals_breed_type ON animals (breed_type);
CREATE INDEX IF NOT EXISTS idx_animals_primary_breed ON animals (primary_breed);
CREATE INDEX IF NOT EXISTS idx_animals_secondary_breed ON animals (secondary_breed);

-- Composite index for breed-related queries
CREATE INDEX IF NOT EXISTS idx_animals_breed_composite 
ON animals (breed_type, primary_breed, secondary_breed)
WHERE breed_confidence IS NOT NULL;

-- Update statistics for query planner
ANALYZE animals;