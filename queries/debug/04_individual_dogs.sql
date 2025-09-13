-- Individual Dog Inspection
-- Detailed queries for debugging specific dogs

-- Find dog by name (partial match)
SELECT 
    a.id,
    a.name,
    o.name as organization,
    a.breed,
    a.age_text,
    a.sex,
    a.size,
    a.availability_confidence,
    a.consecutive_scrapes_missing,
    a.last_seen_at,
    a.adoption_url
FROM animals a
JOIN organizations o ON a.organization_id = o.id
WHERE a.active = true
  AND LOWER(a.name) LIKE LOWER('%harley%')  -- Change name here
ORDER BY a.last_seen_at DESC
LIMIT 20;

-- Complete dog profile by ID
SELECT 
    a.id,
    a.name,
    o.name as organization,
    a.external_id,
    a.breed as original_breed,
    a.standardized_breed,
    a.primary_breed,
    a.secondary_breed,
    a.breed_type,
    a.breed_confidence,
    a.breed_group,
    a.age_text,
    a.age_min_months,
    a.age_max_months,
    a.sex,
    a.size as original_size,
    a.standardized_size,
    a.status,
    a.availability_confidence,
    a.consecutive_scrapes_missing,
    a.last_seen_at,
    a.last_scraped_at,
    a.created_at,
    a.updated_at,
    a.primary_image_url,
    a.adoption_url,
    a.dog_profiler_data IS NOT NULL as has_profiler_data,
    (a.dog_profiler_data->>'quality_score')::int as profiler_quality_score
FROM animals a
JOIN organizations o ON a.organization_id = o.id
WHERE a.id = 1234;  -- Change ID here

-- Dog properties and profiler JSON data
SELECT 
    a.name,
    jsonb_pretty(a.properties) as properties,
    jsonb_pretty(a.dog_profiler_data) as profiler_data,
    jsonb_pretty(a.llm_processing_flags) as llm_flags
FROM animals a
WHERE a.id = 1234;  -- Change ID here

-- Recent dogs added (last 24 hours)
SELECT 
    a.id,
    a.name,
    o.name as organization,
    a.breed,
    a.created_at,
    a.primary_image_url IS NOT NULL as has_image,
    a.properties->>'description' IS NOT NULL as has_description,
    a.dog_profiler_data IS NOT NULL as has_profiler_data
FROM animals a
JOIN organizations o ON a.organization_id = o.id
WHERE a.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY a.created_at DESC;

-- Dogs with data anomalies
SELECT 
    a.id,
    a.name,
    o.name as organization,
    CASE
        WHEN a.age_min_months > a.age_max_months THEN 'Age range inverted'
        WHEN a.breed_type = 'purebred' AND a.secondary_breed IS NOT NULL THEN 'Purebred with secondary breed'
        WHEN a.breed_confidence = '0.9' AND a.breed_type != 'purebred' THEN 'High confidence non-purebred'
        WHEN a.availability_confidence = 'high' AND a.consecutive_scrapes_missing > 0 THEN 'High confidence but missing scrapes'
        WHEN LENGTH(a.name) > 30 THEN 'Very long name'
        WHEN a.name ~ '[0-9]{4,}' THEN 'Name contains long number'
        ELSE 'Other'
    END as anomaly_type,
    a.breed,
    a.breed_type,
    a.breed_confidence,
    a.availability_confidence,
    a.consecutive_scrapes_missing
FROM animals a
JOIN organizations o ON a.organization_id = o.id
WHERE a.active = true
  AND (
    a.age_min_months > a.age_max_months OR
    (a.breed_type = 'purebred' AND a.secondary_breed IS NOT NULL) OR
    (a.breed_confidence = '0.9' AND a.breed_type != 'purebred') OR
    (a.availability_confidence = 'high' AND a.consecutive_scrapes_missing > 0) OR
    LENGTH(a.name) > 30 OR
    a.name ~ '[0-9]{4,}'
  )
ORDER BY o.name, a.name
LIMIT 100;

-- Dogs with similar names (potential duplicates)
SELECT 
    a1.id as id1,
    a1.name as name1,
    o1.name as org1,
    a2.id as id2,
    a2.name as name2,
    o2.name as org2,
    a1.breed as breed1,
    a2.breed as breed2
FROM animals a1
JOIN animals a2 ON a1.id < a2.id 
    AND LOWER(a1.name) = LOWER(a2.name)
    AND a1.organization_id != a2.organization_id
JOIN organizations o1 ON a1.organization_id = o1.id
JOIN organizations o2 ON a2.organization_id = o2.id
WHERE a1.active = true 
  AND a2.active = true
ORDER BY a1.name;

-- Explore profiler data fields for a dog
SELECT 
    id,
    name,
    dog_profiler_data->>'tagline' as tagline,
    dog_profiler_data->>'quality_score' as quality_score,
    dog_profiler_data->>'personality_traits' as personality_traits,
    dog_profiler_data->>'good_with_dogs' as good_with_dogs,
    dog_profiler_data->>'good_with_cats' as good_with_cats,
    dog_profiler_data->>'good_with_children' as good_with_children,
    dog_profiler_data->>'energy_level' as energy_level,
    dog_profiler_data->>'experience_level' as experience_level
FROM animals
WHERE id = 1234;  -- Change ID here