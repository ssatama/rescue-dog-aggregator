-- ============================================
-- BREED DATA MASTER REFERENCE
-- All breed-related columns and their purpose
-- ============================================

-- The animals table has 8 breed-related columns:
-- 1. breed           - Original breed text from source
-- 2. standardized_breed - Normalized/cleaned breed name
-- 3. breed_group     - AKC group (Hound, Working, Terrier, etc.)
-- 4. breed_type      - Classification (purebred, mixed, crossbreed, unknown)
-- 5. breed_confidence - Confidence score as string ('0.9', '0.5', '0.3', etc.)
-- 6. primary_breed   - Main breed for mixed breeds
-- 7. secondary_breed - Secondary breed for mixes
-- 8. breed_slug      - URL-friendly breed identifier

-- ============================================
-- COMPLETE BREED COVERAGE ANALYSIS
-- ============================================

-- All breed columns coverage at once
SELECT 
    COUNT(*) as total_dogs,
    -- Coverage counts
    COUNT(breed) as has_breed,
    COUNT(standardized_breed) as has_standardized,
    COUNT(breed_group) as has_group,
    COUNT(breed_type) as has_type,
    COUNT(breed_confidence) as has_confidence,
    COUNT(primary_breed) as has_primary,
    COUNT(secondary_breed) as has_secondary,
    COUNT(breed_slug) as has_slug,
    -- Coverage percentages
    ROUND(100.0 * COUNT(breed) / COUNT(*), 2) as pct_breed,
    ROUND(100.0 * COUNT(standardized_breed) / COUNT(*), 2) as pct_standardized,
    ROUND(100.0 * COUNT(secondary_breed) / COUNT(*), 2) as pct_secondary
FROM animals
WHERE active = true;

-- ============================================
-- BREED VS STANDARDIZED BREED COMPARISON
-- ============================================

-- See how breed standardization is working
SELECT 
    breed as original,
    standardized_breed as standardized,
    COUNT(*) as count
FROM animals
WHERE active = true
  AND breed != standardized_breed
  AND breed IS NOT NULL
GROUP BY breed, standardized_breed
ORDER BY count DESC
LIMIT 20;

-- ============================================
-- BREED TYPE DISTRIBUTION
-- ============================================

SELECT 
    breed_type,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentage,
    STRING_AGG(DISTINCT breed_confidence, ', ' ORDER BY breed_confidence) as confidence_values_used
FROM animals
WHERE active = true
GROUP BY breed_type
ORDER BY count DESC;

-- ============================================
-- BREED CONFIDENCE ANALYSIS
-- ============================================

-- Confidence values distribution
SELECT 
    breed_confidence,
    breed_type,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentage
FROM animals
WHERE active = true
GROUP BY breed_confidence, breed_type
ORDER BY breed_confidence DESC, count DESC;

-- ============================================
-- BREED GROUP DISTRIBUTION
-- ============================================

SELECT 
    breed_group,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentage,
    COUNT(DISTINCT primary_breed) as unique_primary_breeds
FROM animals
WHERE active = true
GROUP BY breed_group
ORDER BY count DESC;

-- ============================================
-- PRIMARY VS SECONDARY BREED PATTERNS
-- ============================================

-- Top primary breeds
SELECT 
    primary_breed,
    COUNT(*) as total,
    COUNT(secondary_breed) as has_secondary,
    ROUND(100.0 * COUNT(secondary_breed) / COUNT(*), 1) as pct_with_secondary,
    STRING_AGG(DISTINCT secondary_breed, ', ' ORDER BY secondary_breed) as secondary_breeds_seen
FROM animals
WHERE active = true
  AND primary_breed NOT IN ('Mixed Breed', 'Mix', 'Unknown')
GROUP BY primary_breed
HAVING COUNT(*) > 10
ORDER BY total DESC
LIMIT 20;

-- ============================================
-- BREED DATA QUALITY CHECKS
-- ============================================

-- Find inconsistencies
SELECT 
    'Purebred with secondary breed' as issue,
    COUNT(*) as count,
    STRING_AGG(DISTINCT primary_breed || ' + ' || secondary_breed, '; ' ORDER BY primary_breed LIMIT 5) as examples
FROM animals
WHERE active = true 
  AND breed_type = 'purebred' 
  AND secondary_breed IS NOT NULL
UNION ALL
SELECT 
    'High confidence (0.9) but not purebred',
    COUNT(*),
    STRING_AGG(DISTINCT primary_breed || ' (' || breed_type || ')', '; ' ORDER BY primary_breed LIMIT 5)
FROM animals
WHERE active = true
  AND breed_confidence = '0.9'
  AND breed_type != 'purebred'
UNION ALL
SELECT 
    'Unknown type but specific breed',
    COUNT(*),
    STRING_AGG(DISTINCT primary_breed, '; ' ORDER BY primary_breed LIMIT 5)
FROM animals
WHERE active = true
  AND breed_type = 'unknown'
  AND primary_breed NOT IN ('Unknown', 'Mixed Breed', 'Mix')
UNION ALL
SELECT 
    'Mixed but no secondary breed',
    COUNT(*),
    STRING_AGG(DISTINCT primary_breed, '; ' ORDER BY primary_breed LIMIT 5)
FROM animals
WHERE active = true
  AND breed_type = 'mixed'
  AND secondary_breed IS NULL;

-- ============================================
-- BREED SLUG ANALYSIS
-- ============================================

-- Check breed slug patterns
SELECT 
    primary_breed,
    breed_slug,
    COUNT(*) as count
FROM animals
WHERE active = true
GROUP BY primary_breed, breed_slug
HAVING COUNT(*) > 5
ORDER BY count DESC
LIMIT 20;

-- ============================================
-- ORGANIZATION BREED PROFILES
-- ============================================

SELECT 
    o.name as organization,
    COUNT(DISTINCT a.primary_breed) as unique_breeds,
    COUNT(a.id) as total_dogs,
    -- Type distribution
    ROUND(100.0 * SUM(CASE WHEN a.breed_type = 'purebred' THEN 1 ELSE 0 END) / COUNT(*), 1) as pct_purebred,
    ROUND(100.0 * SUM(CASE WHEN a.breed_type = 'mixed' THEN 1 ELSE 0 END) / COUNT(*), 1) as pct_mixed,
    ROUND(100.0 * SUM(CASE WHEN a.breed_type = 'crossbreed' THEN 1 ELSE 0 END) / COUNT(*), 1) as pct_crossbreed,
    ROUND(100.0 * SUM(CASE WHEN a.breed_type = 'unknown' THEN 1 ELSE 0 END) / COUNT(*), 1) as pct_unknown,
    -- Most common breed
    MODE() WITHIN GROUP (ORDER BY a.primary_breed) as most_common_breed
FROM animals a
JOIN organizations o ON a.organization_id = o.id
WHERE a.active = true
GROUP BY o.name
ORDER BY total_dogs DESC;

-- ============================================
-- BREED NAME LENGTH & PATTERNS
-- ============================================

-- Check for data issues in breed names
SELECT 
    'Very long breed names (>40 chars)' as pattern,
    COUNT(*) as count,
    STRING_AGG(primary_breed, '; ' ORDER BY LENGTH(primary_breed) DESC LIMIT 3) as examples
FROM animals
WHERE active = true AND LENGTH(primary_breed) > 40
UNION ALL
SELECT 
    'Contains slash (/)',
    COUNT(*),
    STRING_AGG(primary_breed, '; ' ORDER BY primary_breed LIMIT 3)
FROM animals
WHERE active = true AND primary_breed LIKE '%/%'
UNION ALL
SELECT 
    'Contains parentheses',
    COUNT(*),
    STRING_AGG(primary_breed, '; ' ORDER BY primary_breed LIMIT 3)
FROM animals
WHERE active = true AND primary_breed LIKE '%(%'
UNION ALL
SELECT 
    'Contains X (cross notation)',
    COUNT(*),
    STRING_AGG(primary_breed, '; ' ORDER BY primary_breed LIMIT 3)
FROM animals
WHERE active = true AND (primary_breed LIKE '% x %' OR primary_breed LIKE '% X %');

-- ============================================
-- EXPLORE SPECIFIC DOG'S BREED DATA
-- ============================================

-- Complete breed info for a specific dog
SELECT 
    id,
    name,
    breed as original_breed,
    standardized_breed,
    breed_group,
    breed_type,
    breed_confidence,
    primary_breed,
    secondary_breed,
    breed_slug
FROM animals
WHERE id = 1234;  -- Change ID here

-- Find dogs by breed
SELECT 
    id,
    name,
    breed,
    primary_breed,
    secondary_breed,
    breed_type,
    breed_confidence
FROM animals
WHERE active = true
  AND (
    LOWER(breed) LIKE '%golden%' OR
    LOWER(primary_breed) LIKE '%golden%' OR
    LOWER(secondary_breed) LIKE '%golden%'
  )
LIMIT 20;
