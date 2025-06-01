-- Add columns to store original image URLs for fallback
ALTER TABLE animals ADD COLUMN IF NOT EXISTS original_image_url TEXT;
ALTER TABLE animal_images ADD COLUMN IF NOT EXISTS original_image_url TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_animals_original_image_url ON animals(original_image_url);
CREATE INDEX IF NOT EXISTS idx_animal_images_original_image_url ON animal_images(original_image_url);