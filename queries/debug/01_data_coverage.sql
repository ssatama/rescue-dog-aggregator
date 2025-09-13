-- Data Coverage Dashboard
-- Shows overall data completeness and quality metrics

-- Overall data coverage
SELECT 
    COUNT(*) as total_dogs,
    COUNT(CASE WHEN status = 'available' THEN 1 END) as available_dogs,
    COUNT(breed) as has_breed,
    COUNT(primary_image_url) as has_image,
    COUNT(dog_profiler_data) as has_profiler_data,
    COUNT(translations) as has_translations,
    ROUND(100.0 * COUNT(breed) / COUNT(*), 2) as pct_with_breed,
    ROUND(100.0 * COUNT(primary_image_url) / COUNT(*), 2) as pct_with_image,
    ROUND(100.0 * COUNT(dog_profiler_data) / COUNT(*), 2) as pct_profiled
FROM animals
WHERE active = true;

-- Field completeness by organization
SELECT 
    o.name as organization,
    COUNT(a.id) as total_dogs,
    ROUND(100.0 * COUNT(a.breed) / COUNT(*), 1) as pct_breed,
    ROUND(100.0 * COUNT(a.primary_image_url) / COUNT(*), 1) as pct_image,
    ROUND(100.0 * COUNT(a.properties->>'description') / COUNT(*), 1) as pct_description,
    ROUND(100.0 * COUNT(a.properties->>'adoption_fee') / COUNT(*), 1) as pct_fee,
    ROUND(100.0 * COUNT(a.properties->>'weight') / COUNT(*), 1) as pct_weight
FROM animals a
JOIN organizations o ON a.organization_id = o.id
WHERE a.active = true
GROUP BY o.name
ORDER BY total_dogs DESC;

-- Availability confidence distribution
SELECT 
    availability_confidence,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentage,
    MIN(last_seen_at) as oldest_last_seen,
    MAX(last_seen_at) as newest_last_seen
FROM animals
WHERE active = true
GROUP BY availability_confidence
ORDER BY 
    CASE availability_confidence
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 3
    END;

-- Dogs missing critical data
SELECT 
    'No breed information' as missing_field,
    COUNT(*) as count
FROM animals WHERE active = true AND (breed IS NULL OR breed = '')
UNION ALL
SELECT 'No image URL', COUNT(*)
FROM animals WHERE active = true AND primary_image_url IS NULL
UNION ALL
SELECT 'No adoption URL', COUNT(*)
FROM animals WHERE active = true AND (adoption_url IS NULL OR adoption_url = '')
UNION ALL
SELECT 'No description', COUNT(*)
FROM animals WHERE active = true AND properties->>'description' IS NULL
UNION ALL
SELECT 'No size information', COUNT(*)
FROM animals WHERE active = true AND (size IS NULL OR size = '')
ORDER BY count DESC;