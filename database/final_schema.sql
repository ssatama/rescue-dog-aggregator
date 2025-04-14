CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    website_url TEXT NOT NULL,
    description TEXT,
    country VARCHAR(100),
    city VARCHAR(100),
    logo_url TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Standardization Tables (from migration)
CREATE TABLE breed_standards (
    id SERIAL PRIMARY KEY,
    original_text VARCHAR(255) NOT NULL,
    standardized_value VARCHAR(100) NOT NULL,
    animal_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE size_standards (
    id SERIAL PRIMARY KEY,
    original_text VARCHAR(255) NOT NULL,
    standardized_value VARCHAR(50) NOT NULL,
    animal_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Service Regions Table (from migration)
CREATE TABLE service_regions (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    country VARCHAR(100) NOT NULL,
    region VARCHAR(100),
    active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Animals Table (Combined/Migrated Schema)
CREATE TABLE animals (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    organization_id INTEGER NOT NULL REFERENCES organizations(id),
    animal_type VARCHAR(50) NOT NULL DEFAULT 'dog', -- Added in migration
    external_id VARCHAR(255),
    primary_image_url TEXT,
    adoption_url TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'available',
    breed VARCHAR(255),
    standardized_breed VARCHAR(100), -- Added in migration
    breed_group VARCHAR(100),        -- Added in migration
    age_text VARCHAR(100),
    age_min_months INTEGER,          -- Added in migration
    age_max_months INTEGER,          -- Added in migration
    age_category VARCHAR(50),        -- Added in migration
    sex VARCHAR(50),
    size VARCHAR(50),
    standardized_size VARCHAR(50),   -- Added in migration
    language VARCHAR(10) DEFAULT 'en',
    properties JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_scraped_at TIMESTAMP,
    source_last_updated TIMESTAMP
);

-- Animal Images Table (Migrated Schema)
CREATE TABLE animal_images (
    id SERIAL PRIMARY KEY,
    animal_id INTEGER NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scrape Logs Table (from original schema)
CREATE TABLE scrape_logs (
    id SERIAL PRIMARY KEY,
    scraper_name VARCHAR(255) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    status VARCHAR(50) NOT NULL, -- e.g., 'started', 'completed', 'failed'
    animals_found INTEGER DEFAULT 0,
    new_animals_added INTEGER DEFAULT 0,
    animals_updated INTEGER DEFAULT 0,
    images_added INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes (Combined from original schema and migration)
CREATE INDEX idx_animals_organization ON animals(organization_id);
CREATE INDEX idx_animals_status ON animals(status);
CREATE INDEX idx_animals_type ON animals(animal_type);
CREATE INDEX idx_animals_breed ON animals(breed);
CREATE INDEX idx_animals_standardized_breed ON animals(standardized_breed);
CREATE INDEX idx_animals_sex ON animals(sex);
CREATE INDEX idx_animals_size ON animals(size);
CREATE INDEX idx_animals_standardized_size ON animals(standardized_size);
CREATE INDEX idx_animals_breed_group ON animals(breed_group);
CREATE INDEX idx_animals_age_category ON animals(age_category);
CREATE INDEX idx_animals_name_gin ON animals USING gin(to_tsvector('english', name));
CREATE INDEX idx_animals_breed_gin ON animals USING gin(to_tsvector('english', breed));
CREATE INDEX idx_animals_properties ON animals USING gin(properties);
CREATE INDEX idx_animal_images_animal_id ON animal_images(animal_id);
CREATE INDEX idx_scrape_logs_scraper_name ON scrape_logs(scraper_name);
CREATE INDEX idx_scrape_logs_status ON scrape_logs(status);
CREATE INDEX idx_service_regions_org_id ON service_regions(organization_id);