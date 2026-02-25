# Database Schema Reference

This document provides complete documentation of the PostgreSQL database schema for the Rescue Dog Aggregator platform.

## Schema Overview

The database is designed around a central challenge: **normalizing heterogeneous data from multiple sources for reliable querying**. The schema addresses this through:

- **Dual Data Storage**: Preserving original scraped values alongside normalized, standardized fields
- **Data Quality Tracking**: Monitoring availability confidence and scrape operation metrics
- **Flexible Metadata**: Using JSONB fields for semi-structured data that varies by source
- **Performance Optimization**: Strategic indexing including full-text search capabilities
- **LLM Enhancement**: AI-powered enrichment fields for improved descriptions and profiling
- **Global Test Isolation**: Comprehensive fixtures prevent test data contamination

This design accommodates the reality that source data is inconsistent while providing a clean, queryable interface for the application across 12 active organizations with 1,500+ active dogs.

## Core Tables

### organizations
Stores rescue organization metadata and configuration.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Unique organization identifier |
| `name` | VARCHAR(255) | NOT NULL | Organization display name |
| `website_url` | TEXT | NOT NULL | Official website URL |
| `description` | TEXT | | Organization description |
| `country` | VARCHAR(100) | | Primary country of operation |
| `city` | VARCHAR(100) | | Primary city location |
| `logo_url` | TEXT | | Organization logo image URL |
| `active` | BOOLEAN | DEFAULT TRUE | Whether organization is currently active |
| `config_id` | VARCHAR(50) | UNIQUE | Configuration identifier for scraper settings |
| `last_config_sync` | TIMESTAMP | | Last configuration synchronization time |
| `social_media` | JSONB | DEFAULT '{}' | Social media profile links |
| `ships_to` | JSONB | DEFAULT '[]' | Array of countries/regions served |
| `service_regions` | JSONB | DEFAULT '[]' | Geographic service area metadata |
| `total_dogs` | INTEGER | DEFAULT 0 | Current total dog count |
| `new_this_week` | INTEGER | DEFAULT 0 | New dogs added this week |
| `recent_dogs` | JSONB | DEFAULT '[]' | Recent dog listing metadata |
| `established_year` | INTEGER | | Year organization was established |
| `adoption_fees` | JSONB | DEFAULT '{}' | Dynamic pricing structure for adoptions |
| `slug` | VARCHAR(255) | NOT NULL, UNIQUE | URL-friendly organization identifier |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | When organization was added |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last modification timestamp |

**JSONB Field Examples:**
```json
// social_media
{
  "facebook": "https://facebook.com/rescue-org",
  "instagram": "https://instagram.com/rescue-org",
  "website": "https://rescue-org.com"
}

// ships_to
["US", "CA", "MX"]

// service_regions
[
  {"country": "US", "state": "CA", "cities": ["Los Angeles", "San Francisco"]},
  {"country": "US", "state": "NV", "cities": ["Las Vegas"]}
]
```

### animals
Main table storing animal (primarily dog) listings with availability tracking and LLM enrichment.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Unique animal identifier |
| `name` | VARCHAR(255) | NOT NULL | Animal's name |
| `organization_id` | INTEGER | NOT NULL, FK → organizations(id) | Foreign key to organizations table |
| `animal_type` | VARCHAR(50) | NOT NULL, DEFAULT 'dog' | Type of animal |
| `external_id` | VARCHAR(255) | | Original identifier from source organization |
| `primary_image_url` | TEXT | | Optimized primary image URL |
| `original_image_url` | TEXT | | Original image URL for fallback |
| `adoption_url` | TEXT | NOT NULL | Direct link to adoption page |
| `status` | VARCHAR(50) | DEFAULT 'available' | Adoption status (available, pending, adopted) |
| `breed` | VARCHAR(255) | | Original breed information from source |
| `standardized_breed` | VARCHAR(100) | | Normalized breed classification |
| `breed_group` | VARCHAR(50) | | AKC/breed group classification |
| `breed_type` | VARCHAR(20) | | Breed type (purebred, mixed, unknown) |
| `breed_confidence` | VARCHAR(20) | | Confidence in breed identification |
| `primary_breed` | VARCHAR(255) | | Primary breed for mixed breeds |
| `secondary_breed` | VARCHAR(255) | | Secondary breed for mixed breeds |
| `age_text` | VARCHAR(100) | | Original age description from source |
| `age_min_months` | INTEGER | | Minimum age in months (parsed) |
| `age_max_months` | INTEGER | | Maximum age in months (parsed) |
| `sex` | VARCHAR(50) | | Animal's sex |
| `size` | VARCHAR(50) | | Original size description from source |
| `standardized_size` | VARCHAR(50) | | Normalized size (small, medium, large, extra-large) |
| `language` | VARCHAR(10) | DEFAULT 'en' | Content language |
| `properties` | JSONB | | Additional metadata and characteristics |
| `dog_profiler_data` | JSONB | | AI-generated personality profile |
| `translations` | JSONB | | Multi-language translations |
| `llm_processing_flags` | JSONB | DEFAULT '{}' | Processing status flags |
| `last_seen_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last time animal was found during scraping |
| `consecutive_scrapes_missing` | INTEGER | DEFAULT 0 | Count of consecutive scrapes where animal was not found |
| `availability_confidence` | VARCHAR(10) | DEFAULT 'high', CHECK IN ('high','medium','low') | Confidence level |
| `adoption_check_data` | JSONB | | Adoption detection results |
| `adoption_checked_at` | TIMESTAMP | | When adoption check was last run |
| `active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Whether animal is active in system |
| `slug` | VARCHAR(255) | UNIQUE | URL-friendly identifier |
| `breed_slug` | VARCHAR(255) | | URL-friendly breed identifier |
| `blur_data_url` | TEXT | | Blur placeholder for image loading |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | When the animal was first added |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last modification timestamp |
| `last_scraped_at` | TIMESTAMP | | Last scraping attempt |

**Unique Constraints:**
- `(external_id, organization_id)` - Prevents duplicate animals from same organization

**Availability Confidence Logic:**
- **High**: Animal seen in last scrape (0 missing scrapes)
- **Medium**: Animal missed 1 scrape
- **Low**: Animal missed 2-3 scrapes
- **Hidden**: Animal missed 4+ scrapes (not returned by API)

**Properties JSONB Examples:**
```json
{
  "weight": "45 lbs",
  "color": "Brown and white",
  "house_trained": true,
  "good_with_kids": true,
  "good_with_dogs": false,
  "good_with_cats": null,
  "energy_level": "high",
  "adoption_fee": "$350",
  "microchipped": true,
  "vaccinated": true,
  "spayed_neutered": true,
  "location_country": "US",
  "location_region": "CA",
  "quality_score": 0.85,
  "description": "Original description from source"
}
```

**Dog Profiler Data JSONB Example:**
```json
{
  "personality_traits": ["friendly", "energetic", "loyal"],
  "ideal_home": "Active family with yard",
  "training_level": "intermediate",
  "special_needs": [],
  "compatibility_score": {
    "families": 0.9,
    "singles": 0.7,
    "seniors": 0.5
  }
}
```

### ~~animal_images~~ (REMOVED)
Removed in favor of direct URL storage in the animals table (`primary_image_url` and `original_image_url` fields).

### scrape_logs
Comprehensive logging of scraping operations with quality metrics.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Unique log entry identifier |
| `organization_id` | INTEGER | NOT NULL, FK → organizations(id) | Foreign key to organizations table |
| `started_at` | TIMESTAMP | NOT NULL | Scrape operation start time |
| `completed_at` | TIMESTAMP | | Scrape operation completion time |
| `dogs_found` | INTEGER | | Total dogs discovered during scrape |
| `dogs_added` | INTEGER | | New dogs added to database |
| `dogs_updated` | INTEGER | | Existing dogs updated |
| `status` | VARCHAR(50) | NOT NULL | Operation status (success, error, partial) |
| `error_message` | TEXT | | Error details if operation failed |
| `detailed_metrics` | JSONB | | Comprehensive operation metrics |
| `duration_seconds` | NUMERIC(10,2) | | Total operation duration |
| `data_quality_score` | NUMERIC(3,2) | CHECK (0 ≤ score ≤ 1) | Quality score based on data completeness |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | When log entry was created |

**Detailed Metrics JSONB Example:**
```json
{
  "pages_scraped": 15,
  "parsing_errors": 2,
  "image_processing_errors": 1,
  "duplicate_animals_skipped": 3,
  "validation_failures": 0,
  "network_retries": 2,
  "average_page_load_time": 1.2
}
```

### service_regions
Geographic service areas for organizations (normalized relationship).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Unique region identifier |
| `organization_id` | INTEGER | NOT NULL, FK → organizations(id) | Foreign key to organizations table |
| `country` | VARCHAR(100) | NOT NULL | Country code or name |
| `region` | VARCHAR(100) | | State, province, or region |
| `active` | BOOLEAN | DEFAULT TRUE | Whether this service region is active |
| `notes` | TEXT | | Additional notes about the region |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | When region was added |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last modification timestamp |

**Unique Constraints:**
- `(organization_id, country)` - One entry per country per organization

## Relationships

The schema implements the following key relationships:

```
organizations (1) ──── (many) animals
organizations (1) ──── (many) service_regions
organizations (1) ──── (many) scrape_logs
```

**Key Constraints:**
- `animals.external_id + organization_id` must be unique (prevents duplicates)
- `service_regions.organization_id + country` must be unique
- All foreign key relationships are enforced with referential integrity

## Indexing Strategy

The database employs a comprehensive indexing strategy with 50+ indexes optimized for common query patterns:

### Performance-Critical Composite Indexes

#### Homepage Optimization
- `idx_animals_homepage_optimized`: (status, availability_confidence, created_at DESC) WHERE status = 'available'
  - Optimizes homepage queries with 60-80% performance improvement
- `idx_organizations_active_country`: (active, country, id) WHERE active = true
  - Speeds up organization JOINs by 40-50%

#### Search and Filtering
- `idx_animals_size_breed_status`: (status, standardized_size, breed_group, created_at DESC)
  - Supports multi-filter search queries
- `idx_animals_location_composite`: (status, location_country, location_region)
  - Optimizes location-based filtering

#### Analytics Coverage
- `idx_animals_analytics_covering`: (status, organization_id, standardized_size, breed_group, sex, availability_confidence, created_at)
  - Covering index for dashboard analytics with 70-90% improvement

### B-Tree Indexes (Standard Queries)
- All foreign key columns for fast JOINs
- Single column indexes: `status`, `breed`, `size`, `sex`, `availability_confidence`
- Temporal columns: `last_seen_at`, `created_at`, `updated_at`
- Breed-related: `breed_type`, `breed_confidence`, `primary_breed`, `secondary_breed`
- Unique indexes: `animals.slug`, `organizations.slug`, `organizations.config_id`

### GIN Indexes (Advanced Search)
- **Full-Text Search**: 
  - `idx_animals_name_gin`: to_tsvector on name field
  - `idx_animals_breed_gin`: to_tsvector on breed field
  - `idx_animals_search_enhanced`: Combined tsvector on (name + breed + description)
  - `idx_animals_name_trgm`: Trigram index for fuzzy name matching
- **JSONB Queries**: 
  - `animals.properties`: General properties access
  - `animals.dog_profiler_data`: AI profiling data
  - `animals.translations`: Multi-language support
  - `organizations.social_media`, `organizations.ships_to`, `organizations.service_regions`
  - `scrape_logs.detailed_metrics`

### Specialized Indexes
- **Behavioral Traits**: `good_with_kids`, `good_with_dogs`, `good_with_cats` (filtered on properties JSONB)
- **Quality Filtering**: `idx_animals_quality_score` for high-quality profiles
- **Swipe Feature**: `idx_animals_swipe_composite` for mobile swipe functionality
- **SEO/Sitemap**: `idx_animals_sitemap_quality` for content quality ranking

### Performance Considerations
- Partial indexes with WHERE clauses reduce index size and improve query speed
- Covering indexes eliminate table lookups for analytics queries
- Strategic use of DESC ordering in indexes matches common sort patterns
- JSONB GIN indexes enable efficient key-value queries within JSON documents
- Trigram indexes support fuzzy text matching for improved search UX

## Data Quality & Standardization

### Dual Storage Pattern
The schema preserves original data while providing normalized alternatives:
- `breed` (original) → `standardized_breed` (normalized)
- `size` (original) → `standardized_size` (normalized)  
- `image_url` (optimized) → `original_image_url` (fallback)

This approach enables:
- Data lineage and debugging capabilities
- Reliable searching and filtering
- Graceful degradation when processing fails

### Quality Metrics
- **Data Quality Score**: Calculated based on field completeness, validation success, and parsing accuracy
- **Availability Confidence**: Tracks data freshness and reliability over time
- **Scrape Metrics**: Detailed operation logging for performance monitoring and issue diagnosis

## JSONB Usage Patterns

JSONB fields provide flexibility for varying data structures while maintaining queryability:

### Query Examples
```sql
-- Find animals good with kids
SELECT * FROM animals 
WHERE properties->>'good_with_kids' = 'true';

-- Find organizations with Instagram
SELECT * FROM organizations 
WHERE social_media ? 'instagram';

-- Search within detailed metrics
SELECT * FROM scrape_logs 
WHERE detailed_metrics->>'parsing_errors'::int > 5;
```

### Best Practices
- Use consistent key naming within JSONB fields
- Validate JSONB structure at application level
- Index commonly queried JSONB keys for performance
- Preserve original structure while normalizing critical search fields

## Recent Schema Evolution

### 2025-2026 Updates
- **LLM Integration**: `dog_profiler_data`, `translations`, `llm_processing_flags` fields for AI enrichment
- **Breed Standardization**: `breed_confidence`, `breed_type`, `primary_breed`, `secondary_breed`, `breed_slug`
- **Adoption Tracking**: `adoption_check_data`, `adoption_checked_at`, status constraint
- **Image Optimization**: `blur_data_url` for placeholder loading, `original_image_url` for fallback
- **Performance**: 50+ strategic indexes for query optimization (composite, partial, GIN)

### Migration Strategy
- **Dev/CI**: `database/schema.sql` is the single source of truth (see `database/migration_history.md`)
- **Production**: Alembic in `migrations/railway/`

### Performance Metrics
- **Homepage Load**: 200ms → 40ms (80% improvement)
- **Search Queries**: 50-70% faster with composite indexes
- **Analytics Queries**: 70-90% faster with covering indexes
- **Full-Text Search**: Enhanced with trigram matching for fuzzy search

### Environment Configuration
- **Development**: Local PostgreSQL with test isolation
- **Production**: Railway PostgreSQL with automated backups
- **Testing**: Complete database isolation via global fixtures
- **Monitoring**: Sentry integration for performance tracking

## Migration and Maintenance

For database setup and migration information, see:
- [Database Migration History](../../database/migration_history.md)
- [Installation Guide](../guides/installation.md)
- [Deployment Guide](../guides/deployment.md)

The schema supports both development and production environments with identical structure and indexing strategies, enhanced test isolation, and comprehensive monitoring.