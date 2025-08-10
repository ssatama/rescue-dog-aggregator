# Database Schema Reference

This document provides complete documentation of the PostgreSQL database schema for the Rescue Dog Aggregator platform as of August 2025.

## Schema Overview

The database is designed around a central challenge: **normalizing heterogeneous data from multiple sources for reliable querying**. The schema addresses this through:

- **Dual Data Storage**: Preserving original scraped values alongside normalized, standardized fields
- **Data Quality Tracking**: Monitoring availability confidence and scrape operation metrics
- **Flexible Metadata**: Using JSONB fields for semi-structured data that varies by source
- **Performance Optimization**: Strategic indexing including full-text search capabilities
- **Global Test Isolation**: Comprehensive fixtures prevent test data contamination

This design accommodates the reality that source data is inconsistent while providing a clean, queryable interface for the application across 8 active organizations.

## Core Tables

### organizations
Stores rescue organization metadata and configuration.

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PRIMARY KEY | Unique organization identifier |
| `name` | VARCHAR(255) | Organization display name |
| `website_url` | TEXT | Official website URL |
| `description` | TEXT | Organization description |
| `country` | VARCHAR(100) | Primary country of operation |
| `city` | VARCHAR(100) | Primary city location |
| `logo_url` | TEXT | Organization logo image URL |
| `active` | BOOLEAN | Whether organization is currently active |
| `config_id` | VARCHAR(50) UNIQUE | Configuration identifier for scraper settings |
| `last_config_sync` | TIMESTAMP | Last configuration synchronization time |
| `social_media` | JSONB | Social media profile links |
| `ships_to` | JSONB | Array of countries/regions served |
| `service_regions` | JSONB | Geographic service area metadata |
| `total_dogs` | INTEGER | Current total dog count |
| `new_this_week` | INTEGER | New dogs added this week |
| `recent_dogs` | JSONB | Recent dog listing metadata |
| `established_year` | INTEGER | Year organization was established |
| `adoption_url` | TEXT | Base URL for adoption process (Added 2025) |
| `donate_url` | TEXT | Donation page URL (Added 2025) |
| `is_foster_based` | BOOLEAN | Whether organization uses foster homes |
| `slug` | VARCHAR(100) UNIQUE | URL-friendly organization identifier |

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
Main table storing animal (primarily dog) listings with availability tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PRIMARY KEY | Unique animal identifier |
| `name` | VARCHAR(255) | Animal's name |
| `organization_id` | INTEGER | Foreign key to organizations table |
| `animal_type` | VARCHAR(50) | Type of animal (default: 'dog') |
| `external_id` | VARCHAR(255) | Original identifier from source organization |
| `primary_image_url` | TEXT | Optimized primary image URL |
| `original_image_url` | TEXT | Original image URL for fallback |
| `adoption_url` | TEXT | Direct link to adoption page |
| `status` | VARCHAR(50) | Adoption status (available, pending, adopted) |
| `breed` | VARCHAR(255) | Original breed information from source |
| `standardized_breed` | VARCHAR(100) | Normalized breed classification |
| `breed_group` | VARCHAR(100) | AKC/breed group classification |
| `age_text` | VARCHAR(100) | Original age description from source |
| `age_min_months` | INTEGER | Minimum age in months (parsed) |
| `age_max_months` | INTEGER | Maximum age in months (parsed) |
| `sex` | VARCHAR(50) | Animal's sex |
| `size` | VARCHAR(50) | Original size description from source |
| `standardized_size` | VARCHAR(50) | Normalized size (small, medium, large, extra-large) |
| `language` | VARCHAR(10) | Content language (default: 'en') |
| `properties` | JSONB | Additional metadata and characteristics |
| `last_seen_at` | TIMESTAMP | Last time animal was found during scraping |
| `consecutive_scrapes_missing` | INTEGER | Count of consecutive scrapes where animal was not found |
| `availability_confidence` | VARCHAR(10) | Confidence level: 'high', 'medium', 'low' |
| `created_at` | TIMESTAMP | When the animal was first added |
| `updated_at` | TIMESTAMP | Last modification timestamp |
| `description` | TEXT | Animal description/bio (Added 2025) |
| `location` | VARCHAR(255) | Geographic location |
| `weight` | VARCHAR(50) | Original weight description |
| `standardized_weight_lbs` | INTEGER | Normalized weight in pounds |

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
  "spayed_neutered": true
}
```

### ~~animal_images~~ (REMOVED)
Supports multiple images per animal with primary image designation.

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PRIMARY KEY | Unique image identifier |
| `animal_id` | INTEGER | Foreign key to animals table |
| `image_url` | TEXT | Optimized image URL |
| `original_image_url` | TEXT | Original image URL for fallback |
| `is_primary` | BOOLEAN | Whether this is the primary display image |

### scrape_logs
Comprehensive logging of scraping operations with quality metrics.

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PRIMARY KEY | Unique log entry identifier |
| `organization_id` | INTEGER | Foreign key to organizations table |
| `started_at` | TIMESTAMP | Scrape operation start time |
| `completed_at` | TIMESTAMP | Scrape operation completion time |
| `dogs_found` | INTEGER | Total dogs discovered during scrape |
| `dogs_added` | INTEGER | New dogs added to database |
| `dogs_updated` | INTEGER | Existing dogs updated |
| `status` | VARCHAR(50) | Operation status (success, error, partial) |
| `error_message` | TEXT | Error details if operation failed |
| `detailed_metrics` | JSONB | Comprehensive operation metrics |
| `duration_seconds` | NUMERIC(10,2) | Total operation duration |
| `data_quality_score` | NUMERIC(3,2) | Quality score (0.0-1.0) based on data completeness |

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

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PRIMARY KEY | Unique region identifier |
| `organization_id` | INTEGER | Foreign key to organizations table |
| `country` | VARCHAR(100) | Country code or name |
| `region` | VARCHAR(100) | State, province, or region |

## Relationships

The schema implements the following key relationships:

```
organizations (1) ──── (many) animals
organizations (1) ──── (many) service_regions  
organizations (1) ──── (many) scrape_logs
~~animals (1) ──── (many) animal_images~~ (REMOVED: Multi-image support eliminated)
```

**Key Constraints:**
- `animals.external_id + organization_id` must be unique (prevents duplicates)
- `service_regions.organization_id + country + region` must be unique
- All foreign key relationships are enforced with referential integrity

## Indexing Strategy

The database employs a comprehensive indexing strategy optimized for common query patterns:

### B-Tree Indexes (Standard Queries)
- All foreign key columns for fast JOINs
- Frequently filtered columns: `status`, `breed`, `size`, `availability_confidence`
- Temporal columns: `last_seen_at`, `created_at`

### GIN Indexes (Advanced Search)
- **Full-Text Search**: `animals.name` and `animals.breed` using PostgreSQL's `to_tsvector`
- **JSONB Queries**: `animals.properties`, `organizations.social_media`, `scrape_logs.detailed_metrics`

### Performance Considerations
- Indexes optimize read performance for common search and filter operations
- Write operations (INSERT/UPDATE) have minimal overhead due to strategic index selection
- JSONB indexes enable efficient key-value queries within JSON documents

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

## 2025 Schema Updates

### Recent Additions
- **Organization enhancements**: Added `adoption_url`, `donate_url`, `is_foster_based`, `slug` fields
- **Animal improvements**: Added `description`, `location`, `weight`, `standardized_weight_lbs`, `created_at`, `updated_at`
- **Test isolation**: Global fixtures prevent test data from affecting production schema
- **Railway deployment**: Production database hosted on Railway with automatic migrations

### Migration Files
Recent migrations include:
```
database/migrations/
├── 001_initial_schema.sql
├── 002_add_standardization_fields.sql  
├── 003_add_missing_fields.sql
└── 004_add_organization_enhanced_fields.sql

database/migrations/railway/
├── versions/
└── alembic.ini (Production migrations)
```

### Performance Optimizations
- **Composite indexes**: Added for common filter combinations (`status` + `availability_confidence`)
- **JSONB GIN indexes**: Optimized for properties and social_media queries
- **Full-text search**: Enhanced tsvector indexes for breed and name searching
- **Query monitoring**: Added query performance tracking for slow query identification

### Development vs Production
- **Development**: Uses local PostgreSQL with test isolation fixtures
- **Production**: Railway PostgreSQL with automated backups and monitoring
- **Testing**: Comprehensive database isolation prevents test contamination
- **Migrations**: Automated via Alembic for production, manual for development

## Migration and Maintenance

For database setup and migration information, see:
- [Database Migration History](../../database/migration_history.md)
- [Installation Guide](../getting-started/installation.md)
- [Railway Deployment Guide](../operations/production-deployment.md)

The schema supports both development and production environments with identical structure and indexing strategies, enhanced test isolation, and comprehensive monitoring.