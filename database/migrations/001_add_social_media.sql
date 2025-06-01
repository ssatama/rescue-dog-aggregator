-- Add social media fields to organizations
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS social_media JSONB DEFAULT '{}';

-- Update existing organizations with sample data
UPDATE organizations 
SET social_media = '{
  "facebook": "https://www.facebook.com/petsinturkey",
  "instagram": "https://www.instagram.com/petsinturkey"
}'
WHERE name = 'Pets in Turkey';