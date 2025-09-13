-- LLM/Profiler Processing Status
-- Monitor AI-powered dog profiling

-- Overall profiler coverage
SELECT 
    COUNT(*) as total_dogs,
    COUNT(dog_profiler_data) as has_profiler_data,
    COUNT(translations) as has_translations,
    COUNT(llm_processing_flags) as has_processing_flags,
    ROUND(100.0 * COUNT(dog_profiler_data) / COUNT(*), 2) as pct_profiled,
    COUNT(CASE WHEN dog_profiler_data->>'quality_score' IS NOT NULL THEN 1 END) as has_quality_score
FROM animals
WHERE active = true;

-- Profiler data by organization
SELECT 
    o.name as organization,
    COUNT(a.id) as total_dogs,
    COUNT(a.dog_profiler_data) as profiled_count,
    ROUND(100.0 * COUNT(a.dog_profiler_data) / COUNT(*), 1) as pct_profiled,
    AVG((a.dog_profiler_data->>'quality_score')::int) as avg_quality_score,
    COUNT(DISTINCT a.dog_profiler_data->>'model_used') as models_used
FROM animals a
JOIN organizations o ON a.organization_id = o.id
WHERE a.active = true
GROUP BY o.name
ORDER BY total_dogs DESC;

-- Model usage distribution
SELECT 
    dog_profiler_data->>'model_used' as model,
    COUNT(*) as dogs_profiled,
    AVG((dog_profiler_data->>'quality_score')::int) as avg_quality_score,
    AVG((dog_profiler_data->>'processing_time_ms')::int) as avg_processing_ms
FROM animals
WHERE active = true 
  AND dog_profiler_data IS NOT NULL
GROUP BY dog_profiler_data->>'model_used'
ORDER BY dogs_profiled DESC;

-- Dogs needing profiling
SELECT 
    a.id,
    a.name,
    o.name as organization,
    a.breed,
    LENGTH(COALESCE(a.properties->>'description', '')) as original_desc_length,
    a.created_at
FROM animals a
JOIN organizations o ON a.organization_id = o.id
WHERE a.active = true
  AND a.status = 'available'
  AND a.dog_profiler_data IS NULL
ORDER BY a.created_at DESC
LIMIT 50;

-- Profiler data quality distribution
SELECT 
    CASE 
        WHEN (dog_profiler_data->>'quality_score')::int >= 90 THEN '90-100 (Excellent)'
        WHEN (dog_profiler_data->>'quality_score')::int >= 80 THEN '80-89 (Good)'
        WHEN (dog_profiler_data->>'quality_score')::int >= 70 THEN '70-79 (Fair)'
        WHEN (dog_profiler_data->>'quality_score')::int >= 60 THEN '60-69 (Poor)'
        ELSE '<60 (Very Poor)'
    END as quality_range,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentage
FROM animals
WHERE active = true 
  AND dog_profiler_data->>'quality_score' IS NOT NULL
GROUP BY quality_range
ORDER BY quality_range;

-- Profiler field completeness
SELECT 
    COUNT(*) as total_profiled,
    COUNT(CASE WHEN dog_profiler_data->>'tagline' IS NOT NULL THEN 1 END) as has_tagline,
    COUNT(CASE WHEN dog_profiler_data->>'description' IS NOT NULL THEN 1 END) as has_description,
    COUNT(CASE WHEN dog_profiler_data->>'personality_traits' IS NOT NULL THEN 1 END) as has_traits,
    COUNT(CASE WHEN dog_profiler_data->>'good_with_dogs' IS NOT NULL THEN 1 END) as has_dog_compatibility,
    COUNT(CASE WHEN dog_profiler_data->>'good_with_cats' IS NOT NULL THEN 1 END) as has_cat_compatibility,
    COUNT(CASE WHEN dog_profiler_data->>'good_with_children' IS NOT NULL THEN 1 END) as has_child_compatibility,
    COUNT(CASE WHEN dog_profiler_data->>'energy_level' IS NOT NULL THEN 1 END) as has_energy_level,
    COUNT(CASE WHEN dog_profiler_data->>'experience_level' IS NOT NULL THEN 1 END) as has_experience_level
FROM animals
WHERE active = true
  AND dog_profiler_data IS NOT NULL;

-- Recent profiling activity
SELECT 
    DATE(dog_profiler_data->>'profiled_at') as profile_date,
    COUNT(*) as dogs_profiled,
    COUNT(DISTINCT organization_id) as orgs_processed,
    AVG((dog_profiler_data->>'quality_score')::int) as avg_quality,
    AVG((dog_profiler_data->>'processing_time_ms')::int) as avg_processing_ms
FROM animals
WHERE dog_profiler_data->>'profiled_at' IS NOT NULL
  AND (dog_profiler_data->>'profiled_at')::timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(dog_profiler_data->>'profiled_at')
ORDER BY profile_date DESC;

-- Sample profiled dogs with high quality scores
SELECT 
    a.id,
    a.name,
    o.name as organization,
    a.breed,
    dog_profiler_data->>'tagline' as tagline,
    (dog_profiler_data->>'quality_score')::int as quality_score,
    dog_profiler_data->>'personality_traits' as traits,
    dog_profiler_data->>'energy_level' as energy,
    dog_profiler_data->>'good_with_dogs' as good_with_dogs
FROM animals a
JOIN organizations o ON a.organization_id = o.id
WHERE a.active = true
  AND (dog_profiler_data->>'quality_score')::int >= 90
ORDER BY (dog_profiler_data->>'quality_score')::int DESC
LIMIT 10;

-- Confidence scores analysis
SELECT 
    key as field,
    ROUND(AVG(value::float), 2) as avg_confidence,
    COUNT(*) as occurrences
FROM animals,
     jsonb_each_text(dog_profiler_data->'confidence_scores')
WHERE active = true
  AND dog_profiler_data->'confidence_scores' IS NOT NULL
GROUP BY key
ORDER BY avg_confidence DESC;

-- Dogs with low quality profiles (needing re-processing)
SELECT 
    a.id,
    a.name,
    o.name as organization,
    (a.dog_profiler_data->>'quality_score')::int as quality_score,
    a.dog_profiler_data->>'model_used' as model,
    DATE(a.dog_profiler_data->>'profiled_at') as profiled_date
FROM animals a
JOIN organizations o ON a.organization_id = o.id
WHERE a.active = true
  AND a.dog_profiler_data IS NOT NULL
  AND (a.dog_profiler_data->>'quality_score')::int < 70
ORDER BY quality_score ASC
LIMIT 20;
