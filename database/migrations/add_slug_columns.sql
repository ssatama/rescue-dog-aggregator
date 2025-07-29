-- Migration: Add slug columns for SEO-friendly URLs
-- For local development only - NOT for Railway yet
-- This migration adds slug columns to organizations and animals tables

BEGIN;

-- Add nullable slug columns
ALTER TABLE organizations ADD COLUMN slug VARCHAR(255);
ALTER TABLE animals ADD COLUMN slug VARCHAR(255);

-- Create temporary functions for slug generation
CREATE OR REPLACE FUNCTION generate_org_slug(name TEXT, id INTEGER) 
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(REGEXP_REPLACE(
    REGEXP_REPLACE(name, '[^a-zA-Z0-9\s]', '', 'g'),
    '\s+', '-', 'g'
  )) || '-' || id::TEXT;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_animal_slug(name TEXT, std_breed TEXT, breed TEXT, id INTEGER) 
RETURNS TEXT AS $$
DECLARE
  slug_parts TEXT[];
  breed_to_use TEXT;
BEGIN
  -- Start with sanitized name
  slug_parts := ARRAY[LOWER(REGEXP_REPLACE(
    REGEXP_REPLACE(name, '[^a-zA-Z0-9\s]', '', 'g'),
    '\s+', '-', 'g'
  ))];
  
  -- Add breed if available (prefer standardized_breed)
  breed_to_use := COALESCE(std_breed, breed);
  IF breed_to_use IS NOT NULL THEN
    slug_parts := slug_parts || LOWER(REGEXP_REPLACE(
      REGEXP_REPLACE(breed_to_use, '[^a-zA-Z0-9\s]', '', 'g'),
      '\s+', '-', 'g'
    ));
  END IF;
  
  -- Add ID for uniqueness
  slug_parts := slug_parts || id::TEXT;
  
  RETURN ARRAY_TO_STRING(slug_parts, '-');
END;
$$ LANGUAGE plpgsql;

-- Backfill slugs for existing data
UPDATE organizations SET slug = generate_org_slug(name, id);
UPDATE animals SET slug = generate_animal_slug(name, standardized_breed, breed, id);

-- Create unique indexes for fast lookup
CREATE UNIQUE INDEX idx_organizations_slug ON organizations(slug);
CREATE UNIQUE INDEX idx_animals_slug ON animals(slug);

-- Make columns NOT NULL after backfill
ALTER TABLE organizations ALTER COLUMN slug SET NOT NULL;
ALTER TABLE animals ALTER COLUMN slug SET NOT NULL;

-- Drop temporary functions
DROP FUNCTION generate_org_slug(TEXT, INTEGER);
DROP FUNCTION generate_animal_slug(TEXT, TEXT, TEXT, INTEGER);

COMMIT;