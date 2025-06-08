-- Migration: Add missing fields for breed_group and standardized_size
-- Description: Add columns that are referenced in API but missing from schema

BEGIN;

-- Add missing columns to animals table
ALTER TABLE animals 
ADD COLUMN IF NOT EXISTS breed_group VARCHAR(50),
ADD COLUMN IF NOT EXISTS standardized_size VARCHAR(50);

-- Add indexes for performance on new columns
CREATE INDEX IF NOT EXISTS idx_animals_breed_group ON animals(breed_group);
CREATE INDEX IF NOT EXISTS idx_animals_standardized_size ON animals(standardized_size);

-- Update existing animals to populate breed_group from standardization
-- This will be handled by the application logic, but we can set defaults
UPDATE animals 
SET breed_group = 'Unknown'
WHERE breed_group IS NULL;

UPDATE animals 
SET standardized_size = 'Medium'
WHERE standardized_size IS NULL AND size IS NULL;

COMMIT;