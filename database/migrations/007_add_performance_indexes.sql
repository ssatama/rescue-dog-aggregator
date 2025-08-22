-- Migration: Add performance indexes for 2000+ dogs scalability
-- Purpose: Optimize query performance for common filter patterns
-- Target: Support <200ms response times with 5000+ animals

-- === Core Filtering Indexes ===

-- Status and availability filtering (most common filter)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_animals_status_availability 
  ON animals (status, availability_confidence)
  WHERE status = 'available';

-- Organization + status composite (for org-specific pages)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_animals_org_status 
  ON animals (organization_id, status)
  WHERE status = 'available';

-- Age range queries (commonly used filter)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_animals_age_range_optimized 
  ON animals (age_min_months, age_max_months)
  WHERE status = 'available' AND age_min_months IS NOT NULL;

-- Size filtering (frequent filter)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_animals_size_status 
  ON animals (standardized_size, status)
  WHERE status = 'available' AND standardized_size IS NOT NULL;

-- Breed group filtering (category browsing)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_animals_breed_group_status 
  ON animals (breed_group, status)
  WHERE status = 'available' AND breed_group IS NOT NULL;

-- === Search Optimization ===

-- Full-text search optimization (using trigram for fuzzy search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Name search with trigram index for fuzzy matching
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_animals_name_trgm 
  ON animals USING gin (name gin_trgm_ops)
  WHERE status = 'available';

-- Combined text search on name and breed
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_animals_search_text 
  ON animals USING gin (
    to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(breed, ''))
  )
  WHERE status = 'available';

-- === Location-Based Queries ===

-- Location country filtering (for international searches)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_animals_location_country 
  ON animals ((properties->>'location_country'))
  WHERE status = 'available' AND properties->>'location_country' IS NOT NULL;

-- Location region filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_animals_location_region 
  ON animals ((properties->>'location_region'))
  WHERE status = 'available' AND properties->>'location_region' IS NOT NULL;

-- === Sorting Optimization ===

-- Recent animals (for "newest" sort)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_animals_created_desc 
  ON animals (created_at DESC)
  WHERE status = 'available';

-- Updated animals (for freshness)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_animals_updated_desc 
  ON animals (updated_at DESC)
  WHERE status = 'available';

-- Name sorting (alphabetical browsing)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_animals_name_asc 
  ON animals (name ASC)
  WHERE status = 'available';

-- === Compatibility Filtering (for enhanced data) ===

-- Good with kids filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_animals_good_with_kids 
  ON animals ((properties->>'good_with_kids'))
  WHERE status = 'available' AND properties->>'good_with_kids' IS NOT NULL;

-- Good with dogs filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_animals_good_with_dogs 
  ON animals ((properties->>'good_with_dogs'))
  WHERE status = 'available' AND properties->>'good_with_dogs' IS NOT NULL;

-- Good with cats filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_animals_good_with_cats 
  ON animals ((properties->>'good_with_cats'))
  WHERE status = 'available' AND properties->>'good_with_cats' IS NOT NULL;

-- === Sitemap Generation ===

-- Sitemap quality filtering (for SEO optimization)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_animals_sitemap_quality 
  ON animals (
    status,
    (CASE WHEN length(COALESCE(properties->>'description', '')) > 200 THEN 1 ELSE 0 END),
    created_at DESC
  )
  WHERE status = 'available';

-- === Organization Queries ===

-- Active organizations with animal counts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_active 
  ON organizations (active, name)
  WHERE active = true;

-- Organization by country
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_country 
  ON organizations (country)
  WHERE active = true;

-- === Scrape Log Performance ===

-- Recent scrape logs by organization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scrape_logs_org_recent 
  ON scrape_logs (organization_id, started_at DESC);

-- Scrape status monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scrape_logs_status 
  ON scrape_logs (status, completed_at DESC)
  WHERE status IN ('success', 'failure');

-- === Statistics Queries ===

-- Count queries optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_animals_count_filters 
  ON animals (status, organization_id, standardized_size, breed_group)
  WHERE status = 'available';

-- === Analyze Tables for Query Planner ===

-- Update statistics for optimal query planning
ANALYZE animals;
ANALYZE organizations;
ANALYZE scrape_logs;

-- === Performance Notes ===

-- All indexes use CONCURRENTLY to avoid locking during creation
-- Partial indexes (WHERE clauses) reduce index size and improve performance
-- Focus on 'available' status since that's 90%+ of queries
-- Trigram index enables fuzzy text search for better UX
-- JSONB indexes target specific frequently-queried fields