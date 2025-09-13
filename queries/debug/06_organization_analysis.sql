-- Organization Analysis & Performance
-- Deep dive into organization-specific data and issues

-- Organization summary dashboard
SELECT 
    o.id,
    o.name,
    o.active,
    o.country,
    o.config_id,
    o.total_dogs,
    o.new_this_week,
    o.last_config_sync,
    COUNT(a.id) as actual_dog_count,
    COUNT(CASE WHEN a.status = 'available' THEN 1 END) as available_count,
    MAX(a.created_at) as newest_dog_added,
    MIN(a.created_at) as oldest_dog_added
FROM organizations o
LEFT JOIN animals a ON o.id = a.organization_id AND a.active = true
GROUP BY o.id, o.name, o.active, o.country, o.config_id, o.total_dogs, o.new_this_week, o.last_config_sync
ORDER BY actual_dog_count DESC;

-- Organization data quality scorecard
SELECT 
    o.name as organization,
    COUNT(a.id) as total_dogs,
    ROUND(100.0 * COUNT(a.breed) / NULLIF(COUNT(a.id), 0), 1) as breed_coverage,
    ROUND(100.0 * COUNT(a.primary_image_url) / NULLIF(COUNT(a.id), 0), 1) as image_coverage,
    ROUND(100.0 * COUNT(a.properties->>'description') / NULLIF(COUNT(a.id), 0), 1) as description_coverage,
    ROUND(100.0 * COUNT(a.dog_profiler_data) / NULLIF(COUNT(a.id), 0), 1) as llm_coverage,
    ROUND(100.0 * SUM(CASE WHEN a.availability_confidence = 'high' THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id), 0), 1) as high_confidence_pct,
    ROUND(AVG(
        (CASE WHEN a.breed IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN a.primary_image_url IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN a.properties->>'description' IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN a.size IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN a.age_text IS NOT NULL THEN 1 ELSE 0 END) * 20
    ), 1) as overall_quality_score
FROM organizations o
LEFT JOIN animals a ON o.id = a.organization_id AND a.active = true
WHERE o.active = true
GROUP BY o.name
ORDER BY overall_quality_score DESC;

-- External ID patterns by organization
SELECT 
    o.name as organization,
    COUNT(DISTINCT a.external_id) as unique_external_ids,
    COUNT(a.id) as total_dogs,
    MIN(LENGTH(a.external_id)) as min_id_length,
    MAX(LENGTH(a.external_id)) as max_id_length,
    COUNT(CASE WHEN a.external_id ~ '^[0-9]+$' THEN 1 END) as numeric_ids,
    COUNT(CASE WHEN a.external_id ~ '^[A-Z]' THEN 1 END) as starts_with_letter,
    LEFT(MIN(a.external_id), 20) as sample_min_id,
    LEFT(MAX(a.external_id), 20) as sample_max_id
FROM animals a
JOIN organizations o ON a.organization_id = o.id
WHERE a.active = true
  AND a.external_id IS NOT NULL
GROUP BY o.name
ORDER BY total_dogs DESC;

-- Scraping performance by organization (last 30 days)
SELECT 
    o.name as organization,
    COUNT(sl.id) as total_scrapes,
    AVG(sl.dogs_found) as avg_dogs_found,
    AVG(sl.dogs_added) as avg_dogs_added,
    AVG(sl.dogs_updated) as avg_dogs_updated,
    AVG(sl.duration_seconds) as avg_duration_sec,
    MAX(sl.duration_seconds) as max_duration_sec,
    MIN(sl.duration_seconds) as min_duration_sec,
    AVG(sl.data_quality_score) as avg_quality_score,
    SUM(CASE WHEN sl.status = 'success' THEN 1 ELSE 0 END) as successful_scrapes,
    SUM(CASE WHEN sl.status = 'error' THEN 1 ELSE 0 END) as failed_scrapes,
    ROUND(100.0 * SUM(CASE WHEN sl.status = 'success' THEN 1 ELSE 0 END) / COUNT(sl.id), 1) as success_rate
FROM organizations o
LEFT JOIN scrape_logs sl ON o.id = sl.organization_id 
    AND sl.started_at >= CURRENT_DATE - INTERVAL '30 days'
WHERE o.active = true
GROUP BY o.name
ORDER BY success_rate ASC, total_scrapes DESC;

-- Age distribution by organization
SELECT 
    o.name as organization,
    COUNT(CASE WHEN a.age_max_months <= 12 THEN 1 END) as puppies,
    COUNT(CASE WHEN a.age_min_months > 12 AND a.age_max_months <= 36 THEN 1 END) as young,
    COUNT(CASE WHEN a.age_min_months > 36 AND a.age_max_months <= 84 THEN 1 END) as adult,
    COUNT(CASE WHEN a.age_min_months > 84 THEN 1 END) as senior,
    COUNT(CASE WHEN a.age_min_months IS NULL THEN 1 END) as unknown_age,
    COUNT(*) as total
FROM animals a
JOIN organizations o ON a.organization_id = o.id
WHERE a.active = true
GROUP BY o.name
ORDER BY total DESC;

-- Size distribution by organization
SELECT 
    o.name as organization,
    COUNT(CASE WHEN a.standardized_size = 'small' THEN 1 END) as small,
    COUNT(CASE WHEN a.standardized_size = 'medium' THEN 1 END) as medium,
    COUNT(CASE WHEN a.standardized_size = 'large' THEN 1 END) as large,
    COUNT(CASE WHEN a.standardized_size = 'extra-large' THEN 1 END) as extra_large,
    COUNT(CASE WHEN a.standardized_size IS NULL OR a.standardized_size = '' THEN 1 END) as unknown_size,
    COUNT(*) as total
FROM animals a
JOIN organizations o ON a.organization_id = o.id
WHERE a.active = true
GROUP BY o.name
ORDER BY total DESC;

-- Most common breed by organization
WITH org_breeds AS (
    SELECT 
        o.name as organization,
        a.primary_breed,
        COUNT(*) as breed_count,
        ROW_NUMBER() OVER (PARTITION BY o.name ORDER BY COUNT(*) DESC) as rn
    FROM animals a
    JOIN organizations o ON a.organization_id = o.id
    WHERE a.active = true
      AND a.primary_breed NOT IN ('Mixed Breed', 'Unknown', '')
    GROUP BY o.name, a.primary_breed
)
SELECT 
    organization,
    primary_breed as most_common_breed,
    breed_count
FROM org_breeds
WHERE rn = 1
ORDER BY breed_count DESC;