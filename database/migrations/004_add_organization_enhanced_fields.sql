-- Migration: Add enhanced organization fields missing from organizations table
-- Description: Add ships_to, total_dogs, new_this_week, service_regions, and other metadata fields

BEGIN;

-- Add enhanced organization fields
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS ships_to JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS service_regions JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS total_dogs INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS new_this_week INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS recent_dogs JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS established_year INTEGER,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS country VARCHAR(100),
ADD COLUMN IF NOT EXISTS city VARCHAR(100);

-- Add indexes for performance on new columns
CREATE INDEX IF NOT EXISTS idx_organizations_ships_to ON organizations USING gin(ships_to);
CREATE INDEX IF NOT EXISTS idx_organizations_service_regions ON organizations USING gin(service_regions);
CREATE INDEX IF NOT EXISTS idx_organizations_total_dogs ON organizations(total_dogs);
CREATE INDEX IF NOT EXISTS idx_organizations_country ON organizations(country);

-- Add comments for documentation
COMMENT ON COLUMN organizations.ships_to IS 'Countries/regions this organization ships rescued animals to';
COMMENT ON COLUMN organizations.service_regions IS 'Regions where this organization operates';
COMMENT ON COLUMN organizations.total_dogs IS 'Total number of dogs currently available from this organization';
COMMENT ON COLUMN organizations.new_this_week IS 'Number of new dogs added this week';
COMMENT ON COLUMN organizations.recent_dogs IS 'Array of recent dog IDs for quick access';
COMMENT ON COLUMN organizations.established_year IS 'Year the organization was established';
COMMENT ON COLUMN organizations.logo_url IS 'URL to organization logo image';
COMMENT ON COLUMN organizations.country IS 'Primary country where organization operates';
COMMENT ON COLUMN organizations.city IS 'Primary city where organization operates';

COMMIT;