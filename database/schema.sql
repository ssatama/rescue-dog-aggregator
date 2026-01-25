-- Source Organizations
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    website_url TEXT NOT NULL,
    description TEXT,
    country VARCHAR(100),
    city VARCHAR(100),
    logo_url TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Enhanced organization fields
    social_media JSONB DEFAULT '{}',
    config_id VARCHAR(50) UNIQUE,
    last_config_sync TIMESTAMP,
    ships_to JSONB DEFAULT '[]',
    service_regions JSONB DEFAULT '[]',
    total_dogs INTEGER DEFAULT 0,
    new_this_week INTEGER DEFAULT 0,
    recent_dogs JSONB DEFAULT '[]',
    established_year INTEGER,
    
    -- Adoption fees structure (added for dynamic pricing)
    adoption_fees JSONB DEFAULT '{}',
    
    -- SEO-friendly URL slug
    slug VARCHAR(255) UNIQUE
);

-- Animals (Dogs only for now)
CREATE TABLE IF NOT EXISTS animals (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    organization_id INTEGER NOT NULL REFERENCES organizations(id),
    animal_type VARCHAR(50) NOT NULL DEFAULT 'dog',
    external_id VARCHAR(255),
    primary_image_url TEXT,
    adoption_url TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'available',

    -- Core searchable fields
    breed VARCHAR(255),
    breed_group VARCHAR(100),
    standardized_breed VARCHAR(100),
    age_text VARCHAR(100),
    age_min_months INTEGER,
    age_max_months INTEGER,
    sex VARCHAR(50),
    size VARCHAR(50),
    standardized_size VARCHAR(50),
    language VARCHAR(10) DEFAULT 'en',

    -- Extended properties as JSON
    properties JSONB,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_scraped_at TIMESTAMP,
    source_last_updated TIMESTAMP,
    
    -- Stale data tracking columns
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    consecutive_scrapes_missing INTEGER DEFAULT 0,
    availability_confidence VARCHAR(10) DEFAULT 'high' CHECK (availability_confidence IN ('high', 'medium', 'low')),

    -- Adoption tracking columns (added in migration 013)
    adoption_check_data JSONB,
    adoption_checked_at TIMESTAMP,

    -- Add column to store original image URLs for fallback
    original_image_url TEXT,
    
    -- Active status
    active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- SEO-friendly URL slug
    slug VARCHAR(255) UNIQUE,
    
    -- Dog profiling and AI processing
    dog_profiler_data JSONB,
    translations JSONB,
    llm_processing_flags JSONB DEFAULT '{}',
    
    -- Enhanced breed information
    breed_confidence VARCHAR(50),
    breed_type VARCHAR(50),
    primary_breed VARCHAR(255),
    secondary_breed VARCHAR(255),
    breed_slug VARCHAR(255),
    
    -- Unique constraint to prevent duplicates
    UNIQUE (external_id, organization_id),

    -- Status constraint (added in migration 013)
    CONSTRAINT animals_status_check CHECK (status IN ('available', 'unknown', 'adopted', 'reserved'))
);

-- Animal Images
CREATE TABLE IF NOT EXISTS animal_images (
    id SERIAL PRIMARY KEY,
    animal_id INTEGER NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Add column to store original image URLs for fallback
    original_image_url TEXT
);

-- Scrape Logs
CREATE TABLE IF NOT EXISTS scrape_logs (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id),
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    dogs_found INTEGER,
    dogs_added INTEGER,
    dogs_updated INTEGER,
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    detailed_metrics JSONB,
    duration_seconds NUMERIC(10,2),
    data_quality_score NUMERIC(3,2) CHECK (data_quality_score >= 0 AND data_quality_score <= 1)
);

-- Service Regions
CREATE TABLE IF NOT EXISTS service_regions (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    country VARCHAR(100) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    region VARCHAR(100),
    UNIQUE (organization_id, country)
);

-- ============================================================================
-- DATABASE MIGRATION TRACKING TABLE
-- ============================================================================

-- Migration tracking table to keep track of applied migrations
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(50) NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- ============================================================================
-- PERFORMANCE INDEXES (From Migration 010)
-- ============================================================================

-- STEP 1: Enhanced composite index for homepage queries
-- Optimized for homepage queries: WHERE status = 'available' ORDER BY availability_confidence, created_at DESC
-- Expected performance improvement: 60-80% faster homepage queries
CREATE INDEX IF NOT EXISTS idx_animals_homepage_optimized 
  ON animals (status, availability_confidence, created_at DESC)
  WHERE status = 'available';

COMMENT ON INDEX idx_animals_homepage_optimized IS 
  'Optimized composite index for homepage queries: status + availability_confidence + created_at DESC. 
   Supports filtering available animals with quality ranking and recency sorting.
   Expected 60-80% performance improvement for homepage queries.';

-- STEP 2: Organization join optimization  
-- Enhanced organization filtering index for homepage JOINs
-- Supports: WHERE organizations.active = true AND organizations.country = ?
CREATE INDEX IF NOT EXISTS idx_organizations_active_country 
  ON organizations (active, country, id)
  WHERE active = true;

COMMENT ON INDEX idx_organizations_active_country IS 
  'Composite index for organization filtering in homepage queries.
   Supports active organization filtering by country with covering index for ID.
   Expected 40-50% improvement for organization JOINs.';

-- STEP 3: Analytics and counting optimizations
-- Comprehensive covering index for analytics queries
CREATE INDEX IF NOT EXISTS idx_animals_analytics_covering 
  ON animals (status, organization_id, standardized_size, breed_group, sex, 
              availability_confidence, created_at)
  WHERE status = 'available';

COMMENT ON INDEX idx_animals_analytics_covering IS 
  'Covering index for analytics and count queries.
   Includes all commonly filtered columns to avoid table lookups.
   Expected 70-90% improvement for dashboard analytics queries.';

-- ============================================================================
-- LEGACY INDEXES (Maintained for backward compatibility)
-- ============================================================================

-- Basic indexes for core functionality
CREATE INDEX IF NOT EXISTS idx_animals_organization ON animals(organization_id);
CREATE INDEX IF NOT EXISTS idx_animals_status ON animals(status);
CREATE INDEX IF NOT EXISTS idx_animals_breed ON animals(breed);
CREATE INDEX IF NOT EXISTS idx_animals_breed_group ON animals(breed_group);
CREATE INDEX IF NOT EXISTS idx_animals_sex ON animals(sex);
CREATE INDEX IF NOT EXISTS idx_animals_size ON animals(size);
CREATE INDEX IF NOT EXISTS idx_animals_animal_type ON animals(animal_type);
CREATE INDEX IF NOT EXISTS idx_animals_standardized_breed ON animals(standardized_breed);
CREATE INDEX IF NOT EXISTS idx_animals_standardized_size ON animals(standardized_size);

-- Service regions indexes
CREATE INDEX IF NOT EXISTS idx_service_regions_organization ON service_regions(organization_id);
CREATE INDEX IF NOT EXISTS idx_service_regions_country ON service_regions(country);

-- Stale data tracking indexes
CREATE INDEX IF NOT EXISTS idx_animals_last_seen_at ON animals(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_animals_consecutive_missing ON animals(consecutive_scrapes_missing);
CREATE INDEX IF NOT EXISTS idx_animals_availability_confidence ON animals(availability_confidence);

-- Adoption tracking indexes (added in migration 013)
CREATE INDEX IF NOT EXISTS idx_animals_adoption_check
ON animals(organization_id, consecutive_scrapes_missing, status)
WHERE status NOT IN ('adopted', 'reserved');

-- Image URL indexes
CREATE INDEX IF NOT EXISTS idx_animals_original_image_url ON animals(original_image_url);
CREATE INDEX IF NOT EXISTS idx_animal_images_original_image_url ON animal_images(original_image_url);

-- Scrape logs indexes
CREATE INDEX IF NOT EXISTS idx_scrape_logs_detailed_metrics ON scrape_logs USING gin(detailed_metrics);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_duration ON scrape_logs(duration_seconds);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_quality_score ON scrape_logs(data_quality_score);

-- SEO slug indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_animals_slug ON animals(slug);