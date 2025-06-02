-- Add config support to organizations table
-- This migration adds config_id and last_config_sync columns

BEGIN;

-- Add config_id column (nullable for backward compatibility)
ALTER TABLE organizations 
ADD COLUMN config_id VARCHAR(50) UNIQUE;

-- Add last_config_sync timestamp
ALTER TABLE organizations 
ADD COLUMN last_config_sync TIMESTAMP;

-- Add comment for the config_id column
COMMENT ON COLUMN organizations.config_id IS 'Unique identifier matching the config file name (without extension)';
COMMENT ON COLUMN organizations.last_config_sync IS 'Timestamp of last synchronization from config file';

-- Create index on config_id for faster lookups
CREATE INDEX idx_organizations_config_id ON organizations(config_id);

-- Update existing "Pets in Turkey" organization with config_id if it exists
UPDATE organizations 
SET config_id = 'pets-in-turkey' 
WHERE name = 'Pets in Turkey' AND config_id IS NULL;

COMMIT;