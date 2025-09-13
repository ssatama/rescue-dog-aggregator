-- Breed Data Analysis
-- Comprehensive breed coverage and standardization metrics

-- Breed type distribution with statistics
SELECT 
    breed_type,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentage,
    ROUND(AVG(CASE WHEN breed_confidence ~ '^[0-9.]+$' THEN CAST(breed_confidence AS NUMERIC) ELSE NULL END)::numeric, 2) as avg_confidence
FROM animals
WHERE active = true
GROUP BY breed_type
ORDER BY count DESC;

-- Top 25 most common breeds (excluding generic)
SELECT 
    primary_breed,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentage,
    COUNT(DISTINCT organization_id) as num_orgs_with_breed
FROM animals
WHERE active = true 
  AND primary_breed NOT IN ('Mixed Breed', 'Mix', 'Unknown', '')
GROUP BY primary_breed
ORDER BY count DESC
LIMIT 25;

-- Breed standardization effectiveness
SELECT 
    'Total unique original breeds' as metric,
    COUNT(DISTINCT breed) as value
FROM animals WHERE active = true AND breed IS NOT NULL
UNION ALL
SELECT 
    'Total unique standardized breeds',
    COUNT(DISTINCT standardized_breed)
FROM animals WHERE active = true
UNION ALL
SELECT 
    'Total unique primary breeds',
    COUNT(DISTINCT primary_breed)
FROM animals WHERE active = true
UNION ALL
SELECT 
    'Reduction from original to standardized',
    COUNT(DISTINCT breed) - COUNT(DISTINCT standardized_breed)
FROM animals WHERE active = true AND breed IS NOT NULL;

-- Organization breed diversity profile
SELECT 
    o.name as organization,
    COUNT(DISTINCT a.primary_breed) as unique_breeds,
    COUNT(a.id) as total_dogs,
    ROUND(COUNT(DISTINCT a.primary_breed)::numeric / COUNT(a.id) * 100, 1) as breed_diversity_score,
    ROUND(100.0 * SUM(CASE WHEN a.breed_type = 'mixed' THEN 1 ELSE 0 END) / COUNT(*), 1) as pct_mixed,
    ROUND(100.0 * SUM(CASE WHEN a.breed_type = 'purebred' THEN 1 ELSE 0 END) / COUNT(*), 1) as pct_purebred,
    ROUND(100.0 * SUM(CASE WHEN a.breed_type = 'unknown' THEN 1 ELSE 0 END) / COUNT(*), 1) as pct_unknown
FROM animals a
JOIN organizations o ON a.organization_id = o.id
WHERE a.active = true
GROUP BY o.name
ORDER BY total_dogs DESC;

-- Breed data quality issues
SELECT 
    'Breed type unknown but has specific breed' as issue,
    COUNT(*) as count
FROM animals
WHERE active = true 
  AND breed_type = 'unknown'
  AND primary_breed NOT IN ('Unknown', 'Mixed Breed', 'Mix', '')
UNION ALL
SELECT 
    'High confidence but unknown breed',
    COUNT(*)
FROM animals
WHERE active = true
  AND CASE WHEN breed_confidence ~ '^[0-9.]+$' THEN CAST(breed_confidence AS NUMERIC) ELSE 0 END > 0.8
  AND (primary_breed = 'Unknown' OR breed_type = 'unknown')
UNION ALL
SELECT 
    'Mixed breed but very high confidence',
    COUNT(*)
FROM animals  
WHERE active = true
  AND breed_type = 'mixed'
  AND CASE WHEN breed_confidence ~ '^[0-9.]+$' THEN CAST(breed_confidence AS NUMERIC) ELSE 0 END >= 0.9
UNION ALL
SELECT 
    'Breed contains special characters/issues',
    COUNT(*)
FROM animals
WHERE active = true
  AND (
    primary_breed LIKE '%/%' OR
    primary_breed LIKE '%(%' OR
    primary_breed LIKE '%x %' OR
    LENGTH(primary_breed) > 40
  )
ORDER BY count DESC;

-- Breed group distribution
SELECT 
    breed_group,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentage
FROM animals
WHERE active = true
  AND breed_group IS NOT NULL
  AND breed_group NOT IN ('Mixed', 'Unknown')
GROUP BY breed_group
ORDER BY count DESC;