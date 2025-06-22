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
    established_year INTEGER
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
    
    -- Add column to store original image URLs for fallback
    original_image_url TEXT
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Service Regions
CREATE TABLE IF NOT EXISTS service_regions (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    country VARCHAR(100) NOT NULL,
    region VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organization_id, country, region)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_animals_organization ON animals(organization_id);
CREATE INDEX IF NOT EXISTS idx_animals_status ON animals(status);
CREATE INDEX IF NOT EXISTS idx_animals_breed ON animals(breed);
CREATE INDEX IF NOT EXISTS idx_animals_sex ON animals(sex);
CREATE INDEX IF NOT EXISTS idx_animals_size ON animals(size);
CREATE INDEX IF NOT EXISTS idx_animals_animal_type ON animals(animal_type);
CREATE INDEX IF NOT EXISTS idx_animals_standardized_breed ON animals(standardized_breed);
CREATE INDEX IF NOT EXISTS idx_animals_standardized_size ON animals(standardized_size);

-- Text search indexes
CREATE INDEX IF NOT EXISTS idx_animals_name_gin ON animals USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_animals_breed_gin ON animals USING gin(to_tsvector('english', breed));

-- JSON properties index
CREATE INDEX IF NOT EXISTS idx_animals_properties ON animals USING gin(properties);

-- Service regions indexes
CREATE INDEX IF NOT EXISTS idx_service_regions_organization ON service_regions(organization_id);
CREATE INDEX IF NOT EXISTS idx_service_regions_country ON service_regions(country);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_animals_original_image_url ON animals(original_image_url);
CREATE INDEX IF NOT EXISTS idx_animal_images_original_image_url ON animal_images(original_image_url);