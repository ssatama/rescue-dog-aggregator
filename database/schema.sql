-- Source Organizations
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

-- Dogs
CREATE TABLE dogs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    organization_id INTEGER NOT NULL REFERENCES organizations(id),
    external_id VARCHAR(255),           -- ID from the source website (if available)
    primary_image_url TEXT,             -- Main image URL
    adoption_url TEXT NOT NULL,         -- Link to adopt/learn more
    status VARCHAR(50) DEFAULT 'available',  -- available, pending, adopted
    
    -- Core searchable fields that most sites will have
    breed VARCHAR(255),
    age_text VARCHAR(100),              -- Age as provided by the source (e.g., "2 years")
    sex VARCHAR(50),
    size VARCHAR(50),                   -- Small, Medium, Large, etc.
    
    -- Extended properties as JSON - stores all additional fields
    properties JSONB,                   -- Flexible storage for all other attributes
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_scraped_at TIMESTAMP,
    source_last_updated TIMESTAMP       -- When the source last updated this dog (if available)
);

-- Additional Dog Images
CREATE TABLE dog_images (
    id SERIAL PRIMARY KEY,
    dog_id INTEGER NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scrape Logs
CREATE TABLE scrape_logs (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id),
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    dogs_found INTEGER,
    dogs_added INTEGER,
    dogs_updated INTEGER,
    status VARCHAR(50) NOT NULL,        -- success, error, partial
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Performance
CREATE INDEX idx_dogs_organization ON dogs(organization_id);
CREATE INDEX idx_dogs_status ON dogs(status);
CREATE INDEX idx_dogs_breed ON dogs(breed);
CREATE INDEX idx_dogs_sex ON dogs(sex);
CREATE INDEX idx_dogs_size ON dogs(size);

-- For text search
CREATE INDEX idx_dogs_name_gin ON dogs USING gin(to_tsvector('english', name));
CREATE INDEX idx_dogs_breed_gin ON dogs USING gin(to_tsvector('english', breed));

-- For JSON properties search
CREATE INDEX idx_dogs_properties ON dogs USING gin(properties);