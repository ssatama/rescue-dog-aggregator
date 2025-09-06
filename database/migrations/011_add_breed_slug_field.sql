-- Migration: 011_add_breed_slug_field.sql
-- Description: Add breed_slug field for URL routing in breed discovery feature
-- Date: 2025-01-06

-- Add breed_slug column if it doesn't exist
ALTER TABLE animals ADD COLUMN IF NOT EXISTS breed_slug VARCHAR(255);

-- Create index for breed_slug for efficient lookups
CREATE INDEX IF NOT EXISTS idx_animals_breed_slug ON animals(breed_slug);

-- Create index for primary_breed if it doesn't exist (for breed stats queries)
CREATE INDEX IF NOT EXISTS idx_animals_primary_breed ON animals(primary_breed);

-- Create index for breed_type if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_animals_breed_type ON animals(breed_type);

-- Populate breed_slug from primary_breed
-- Convert to lowercase, handle "Mix" suffix specially, replace non-alphanumeric with hyphens
UPDATE animals 
SET breed_slug = LOWER(
    REGEXP_REPLACE(
        REGEXP_REPLACE(
            REGEXP_REPLACE(
                REGEXP_REPLACE(primary_breed, '\s+Mix$', '-mix', 'i'),
                '[^a-zA-Z0-9-]+', '-', 'g'
            ),
            '-+', '-', 'g'
        ),
        '^-+|-+$', '', 'g'
    )
)
WHERE primary_breed IS NOT NULL AND breed_slug IS NULL;

-- Re-run backfill for rows with double hyphens to normalize existing data
UPDATE animals
SET breed_slug = REGEXP_REPLACE(breed_slug, '-+', '-', 'g')
WHERE breed_slug LIKE '%--%';

-- Update table statistics for query optimization
ANALYZE animals;

-- Add migration tracking if schema_migrations table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'schema_migrations') THEN
        INSERT INTO schema_migrations (version, description, applied_at) 
        VALUES ('011', 'Add breed_slug field for URL routing', NOW())
        ON CONFLICT (version) DO NOTHING;
    END IF;
END $$;