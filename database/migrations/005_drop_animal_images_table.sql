-- Migration: Drop animal_images table
-- Date: 2025-08-09
-- Purpose: Remove deprecated animal_images table as part of single-image architecture refactoring
-- 
-- The animal_images table is no longer needed because:
-- 1. We only use primary_image_url from the animals table
-- 2. Secondary images are not supported in the new architecture
-- 3. All image data is stored directly in the animals table

-- Drop the animal_images table if it exists
DROP TABLE IF EXISTS animal_images CASCADE;