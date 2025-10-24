-- Migration: Add blur_data_url column for image placeholders
-- Date: 2025-10-24
-- Purpose: Add blur_data_url column to support Low Quality Image Placeholders (LQIP)
--          Improves perceived performance and reduces CLS (Cumulative Layout Shift)

-- Add blur_data_url column to animals table
-- Stores base64-encoded tiny blurred versions of primary_image_url
ALTER TABLE animals 
ADD COLUMN IF NOT EXISTS blur_data_url TEXT;

-- Add comment to document column purpose
COMMENT ON COLUMN animals.blur_data_url IS 
'Base64-encoded blurred placeholder image (20x15px) for LQIP. Generated async from primary_image_url.';

-- Create partial index for efficient bulk generation queries
-- Only index rows that have images but no blur URL yet
CREATE INDEX IF NOT EXISTS idx_animals_blur_data_url_null
ON animals (id)
WHERE blur_data_url IS NULL AND primary_image_url IS NOT NULL;

-- Update statistics for query planner
ANALYZE animals;
