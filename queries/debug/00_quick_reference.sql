-- Quick Debug Queries
-- Most commonly needed queries for daily debugging

-- ============================================
-- QUICK STATS
-- ============================================

-- Total active dogs
SELECT COUNT(*) as total_active_dogs FROM animals WHERE active = true;

-- Dogs by status
SELECT status, COUNT(*) FROM animals WHERE active = true GROUP BY status;

-- Today's scraping activity
SELECT o.name, sl.dogs_found, sl.dogs_added, sl.status, sl.started_at
FROM scrape_logs sl JOIN organizations o ON sl.organization_id = o.id
WHERE DATE(sl.started_at) = CURRENT_DATE
ORDER BY sl.started_at DESC;

-- ============================================
-- FIND SPECIFIC DOGS
-- ============================================

-- Find by name (change 'harley')
SELECT id, name, breed, organization_id FROM animals 
WHERE LOWER(name) LIKE '%harley%' AND active = true;

-- Find by ID
SELECT * FROM animals WHERE id = 1234;

-- Recently added (last hour)
SELECT id, name, breed, created_at FROM animals 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- ============================================
-- DATA ISSUES
-- ============================================

-- Dogs missing images
SELECT COUNT(*) FROM animals 
WHERE active = true AND primary_image_url IS NULL;

-- Dogs with low availability confidence
SELECT name, breed, last_seen_at, consecutive_scrapes_missing 
FROM animals 
WHERE active = true AND availability_confidence = 'low'
LIMIT 20;

-- Potential duplicates (same name)
SELECT name, COUNT(*), array_agg(id) as ids
FROM animals WHERE active = true
GROUP BY name HAVING COUNT(*) > 1;

-- ============================================
-- ORGANIZATION HEALTH
-- ============================================

-- Quick org summary
SELECT o.name, COUNT(a.id) as dogs, MAX(sl.started_at) as last_scrape
FROM organizations o
LEFT JOIN animals a ON o.id = a.organization_id AND a.active = true
LEFT JOIN scrape_logs sl ON o.id = sl.organization_id
WHERE o.active = true
GROUP BY o.name
ORDER BY dogs DESC;

-- Orgs not scraped recently
SELECT name FROM organizations o
WHERE active = true 
AND NOT EXISTS (
    SELECT 1 FROM scrape_logs sl 
    WHERE sl.organization_id = o.id 
    AND sl.started_at > NOW() - INTERVAL '48 hours'
);

-- ============================================
-- BREED QUICK CHECKS
-- ============================================

-- Most common breeds today
SELECT primary_breed, COUNT(*) as count
FROM animals 
WHERE active = true AND primary_breed NOT IN ('Mixed Breed', 'Unknown')
GROUP BY primary_breed 
ORDER BY count DESC 
LIMIT 10;

-- Breed data issues
SELECT COUNT(*) as dogs_with_unknown_breed_type
FROM animals 
WHERE active = true 
  AND breed_type = 'unknown' 
  AND primary_breed NOT IN ('Unknown', 'Mixed Breed', 'Mix');

-- ============================================
-- PERFORMANCE
-- ============================================

-- Slow scrapes today
SELECT o.name, sl.duration_seconds, sl.dogs_found
FROM scrape_logs sl JOIN organizations o ON sl.organization_id = o.id
WHERE DATE(sl.started_at) = CURRENT_DATE AND sl.duration_seconds > 60
ORDER BY sl.duration_seconds DESC;

-- Database table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================
-- USEFUL JOINS
-- ============================================

-- Full dog details with org
SELECT 
    a.id, a.name, a.breed, a.size, a.age_text,
    o.name as org_name, o.country as org_country,
    a.availability_confidence, a.last_seen_at
FROM animals a
JOIN organizations o ON a.organization_id = o.id
WHERE a.id = 1234;  -- Change ID

-- ============================================
-- COPY-PASTE TEMPLATES
-- ============================================

-- Update availability confidence for specific org
-- UPDATE animals SET availability_confidence = 'high', consecutive_scrapes_missing = 0 
-- WHERE organization_id = (SELECT id FROM organizations WHERE name = 'Dogs Trust')
-- AND last_seen_at > NOW() - INTERVAL '24 hours';

-- Mark dogs as inactive if not seen in 30 days
-- UPDATE animals SET active = false 
-- WHERE last_seen_at < NOW() - INTERVAL '30 days' 
-- AND availability_confidence = 'low';

-- Reset scrape counters for testing
-- UPDATE animals SET consecutive_scrapes_missing = 0, availability_confidence = 'high'
-- WHERE organization_id = 1;
