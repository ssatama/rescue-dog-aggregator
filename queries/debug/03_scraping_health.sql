-- Scraping Health & Recent Activity
-- Monitor scraping operations and data freshness

-- Recent scrape summary (last 7 days)
SELECT 
    o.name as organization,
    sl.started_at::date as scrape_date,
    sl.dogs_found,
    sl.dogs_added,
    sl.dogs_updated,
    sl.status,
    sl.duration_seconds,
    sl.data_quality_score
FROM scrape_logs sl
JOIN organizations o ON sl.organization_id = o.id
WHERE sl.started_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY sl.started_at DESC;

-- Organization scraping health
SELECT 
    o.name as organization,
    o.active,
    COUNT(sl.id) as total_scrapes_last_week,
    MAX(sl.started_at) as last_scrape,
    ROUND(EXTRACT(EPOCH FROM (NOW() - MAX(sl.started_at)))/3600, 1) as hours_since_last_scrape,
    AVG(sl.dogs_found) as avg_dogs_found,
    AVG(sl.duration_seconds) as avg_duration_seconds,
    SUM(CASE WHEN sl.status = 'error' THEN 1 ELSE 0 END) as error_count
FROM organizations o
LEFT JOIN scrape_logs sl ON o.id = sl.organization_id 
    AND sl.started_at >= CURRENT_DATE - INTERVAL '7 days'
WHERE o.active = true
GROUP BY o.id, o.name, o.active
ORDER BY hours_since_last_scrape DESC NULLS FIRST;

-- Data freshness by organization
SELECT 
    o.name as organization,
    COUNT(a.id) as total_dogs,
    COUNT(CASE WHEN a.last_seen_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as seen_last_24h,
    COUNT(CASE WHEN a.last_seen_at >= NOW() - INTERVAL '7 days' THEN 1 END) as seen_last_week,
    COUNT(CASE WHEN a.availability_confidence = 'high' THEN 1 END) as high_confidence,
    COUNT(CASE WHEN a.availability_confidence = 'medium' THEN 1 END) as medium_confidence,
    COUNT(CASE WHEN a.availability_confidence = 'low' THEN 1 END) as low_confidence,
    COUNT(CASE WHEN a.consecutive_scrapes_missing > 0 THEN 1 END) as dogs_missing_scrapes
FROM animals a
JOIN organizations o ON a.organization_id = o.id
WHERE a.active = true
GROUP BY o.name
ORDER BY total_dogs DESC;

-- Recent scraping errors
SELECT 
    o.name as organization,
    sl.started_at,
    sl.status,
    sl.error_message,
    sl.dogs_found,
    sl.duration_seconds
FROM scrape_logs sl
JOIN organizations o ON sl.organization_id = o.id
WHERE sl.status = 'error'
  AND sl.started_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY sl.started_at DESC;

-- Dogs disappearing (high consecutive scrapes missing)
SELECT 
    o.name as organization,
    a.name as dog_name,
    a.breed,
    a.consecutive_scrapes_missing,
    a.last_seen_at,
    ROUND(EXTRACT(EPOCH FROM (NOW() - a.last_seen_at))/86400, 1) as days_since_seen,
    a.availability_confidence,
    a.adoption_url
FROM animals a
JOIN organizations o ON a.organization_id = o.id
WHERE a.active = true
  AND a.consecutive_scrapes_missing >= 3
ORDER BY a.consecutive_scrapes_missing DESC, a.last_seen_at DESC
LIMIT 50;

-- Scraping metrics summary
SELECT 
    COUNT(DISTINCT organization_id) as orgs_scraped_today,
    SUM(dogs_found) as total_dogs_found_today,
    SUM(dogs_added) as total_dogs_added_today,
    SUM(dogs_updated) as total_dogs_updated_today,
    AVG(duration_seconds) as avg_scrape_duration,
    AVG(data_quality_score) as avg_quality_score
FROM scrape_logs
WHERE started_at::date = CURRENT_DATE;
