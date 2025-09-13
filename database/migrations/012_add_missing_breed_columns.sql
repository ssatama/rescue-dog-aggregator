-- Migration: Add missing breed-related columns
-- Date: 2025-01-13
-- Purpose: Add columns that exist in production but are missing from schema.sql

-- Add breed confidence column
ALTER TABLE animals 
ADD COLUMN IF NOT EXISTS breed_confidence VARCHAR(50);

-- Add breed type column  
ALTER TABLE animals
ADD COLUMN IF NOT EXISTS breed_type VARCHAR(50);

-- Add primary breed column
ALTER TABLE animals
ADD COLUMN IF NOT EXISTS primary_breed VARCHAR(255);

-- Add secondary breed column
ALTER TABLE animals
ADD COLUMN IF NOT EXISTS secondary_breed VARCHAR(255);

-- Add active column with default
ALTER TABLE animals
ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

-- Add dog profiler data column
ALTER TABLE animals
ADD COLUMN IF NOT EXISTS dog_profiler_data JSONB;

-- Add translations column
ALTER TABLE animals
ADD COLUMN IF NOT EXISTS translations JSONB;

-- Add LLM processing flags column with default
ALTER TABLE animals
ADD COLUMN IF NOT EXISTS llm_processing_flags JSONB DEFAULT '{}';

-- Create index on primary_breed for performance
CREATE INDEX IF NOT EXISTS idx_animals_primary_breed 
ON animals(primary_breed) 
WHERE primary_breed IS NOT NULL;

-- Create index on breed_type for filtering
CREATE INDEX IF NOT EXISTS idx_animals_breed_type 
ON animals(breed_type) 
WHERE breed_type IS NOT NULL;

-- Create composite index for breed queries
CREATE INDEX IF NOT EXISTS idx_animals_breed_composite 
ON animals(breed_type, primary_breed, secondary_breed) 
WHERE status = 'available';

-- Update migration tracking
INSERT INTO schema_migrations (version, description) 
VALUES ('012', 'Add missing breed-related columns and indexes')
ON CONFLICT (version) DO NOTHING;