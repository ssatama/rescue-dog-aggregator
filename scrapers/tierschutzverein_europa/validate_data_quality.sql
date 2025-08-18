-- Data Quality Validation Query for Tierschutzverein Europa (org_id=11)
-- Run this after the scraper completes to check improvements

-- Overall statistics
SELECT 
  COUNT(*) as total_animals,
  COUNT(DISTINCT external_id) as unique_animals,
  COUNT(standardized_breed) as with_breed,
  COUNT(standardized_size) as with_size,
  COUNT(sex) as with_sex,
  COUNT(age_min_months) as with_age_min,
  COUNT(age_max_months) as with_age_max,
  ROUND(100.0 * COUNT(standardized_breed) / COUNT(*), 1) as breed_quality_pct,
  ROUND(100.0 * COUNT(standardized_size) / COUNT(*), 1) as size_quality_pct,
  ROUND(100.0 * COUNT(sex) / COUNT(*), 1) as sex_quality_pct,
  ROUND(100.0 * COUNT(age_min_months) / COUNT(*), 1) as age_quality_pct
FROM animals 
WHERE organization_id = 11;

-- Check age_text translation (should be English, not German dates)
SELECT 
  name,
  age_text,
  age_min_months,
  age_max_months
FROM animals 
WHERE organization_id = 11
  AND age_text IS NOT NULL
LIMIT 10;

-- Check name normalization (should not have parentheses)
SELECT 
  name,
  external_id
FROM animals 
WHERE organization_id = 11
  AND (name LIKE '%(%' OR name LIKE '%)%' OR name = UPPER(name))
LIMIT 10;

-- Check breed translations and size inference
SELECT 
  name,
  breed,
  standardized_breed,
  standardized_size,
  weight_kg
FROM animals 
WHERE organization_id = 11
  AND standardized_size IS NULL
LIMIT 10;

-- Animals with successful standardization
SELECT 
  name,
  breed,
  standardized_breed,
  standardized_size,
  age_text,
  sex
FROM animals 
WHERE organization_id = 11
  AND standardized_breed IS NOT NULL
  AND standardized_size IS NOT NULL
  AND age_min_months IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Summary by breed to check translations
SELECT 
  breed,
  standardized_breed,
  COUNT(*) as count,
  COUNT(standardized_size) as with_size
FROM animals 
WHERE organization_id = 11
GROUP BY breed, standardized_breed
ORDER BY count DESC
LIMIT 20;