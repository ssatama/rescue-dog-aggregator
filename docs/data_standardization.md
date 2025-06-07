# Data Standardization Approach

## Overview

One of the core challenges in aggregating rescue dog data is the inconsistent format of information across different sources. The Rescue Dog Aggregator addresses this through a comprehensive standardization system that normalizes key data attributes while preserving original information.

## Standardization Components

### 1. Breed Standardization

The system maps various breed descriptions to standardized names:

- **Input examples**: "Lab mix", "Labrador/Retriever", "Yellow Lab"
- **Standardized output**: "Labrador Retriever Mix"

Additionally, breeds are categorized into groups:
- Sporting
- Hound
- Working
- Terrier
- Toy
- Non-Sporting
- Herding
- Mixed
- Unknown

This enables more consistent filtering and navigation by breed type.

### 2. Age Standardization

Age information comes in many formats:

- **Input examples**: "2 years old", "6 months", "young", "senior"
- **Standardized output**: 
  - Age in months (minimum and maximum range)
  - Age category (Puppy, Young, Adult, Senior)

The system uses pattern matching to extract numerical ages when available, and provides reasonable ranges when only descriptive terms are used.

### 3. Size Standardization

Size descriptions vary widely:

- **Input examples**: "Small", "Medium", "40 kg", "Large dog"
- **Standardized output**: Consistent size categories
  - Tiny (< 5 kg)
  - Small (5-10 kg)
  - Medium (10-25 kg)
  - Large (25-40 kg)
  - Extra Large (40+ kg)

When specific weights are provided, they're mapped to the appropriate category.

## Implementation Details

### Database Structure

The standardization is reflected in the database schema, now enhanced with production-ready availability tracking:

```sql
-- Core animal identification
id SERIAL PRIMARY KEY,
name VARCHAR(255) NOT NULL,
organization_id INTEGER NOT NULL,
animal_type VARCHAR(50) DEFAULT 'dog',
external_id VARCHAR(255),

-- Original fields (preserved for transparency)
breed VARCHAR(255),
age_text VARCHAR(100),
size VARCHAR(50),

-- Standardized fields (AI-processed)
standardized_breed VARCHAR(100),
breed_group VARCHAR(50),
age_min_months INTEGER,
age_max_months INTEGER,
standardized_size VARCHAR(50),

-- Availability management (production-ready)
status VARCHAR(50) DEFAULT 'available',
availability_confidence VARCHAR(20) DEFAULT 'high',
last_seen_at TIMESTAMP,
consecutive_scrapes_missing INTEGER DEFAULT 0,

-- Metadata and tracking
language VARCHAR(10) DEFAULT 'en',
properties JSONB,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
last_scraped_at TIMESTAMP,

-- Images and adoption
primary_image_url TEXT,
original_image_url TEXT,
adoption_url TEXT NOT NULL
```

### Enhanced Logging Schema

The `scrape_logs` table now includes comprehensive metrics:

```sql
-- Basic scrape tracking
id SERIAL PRIMARY KEY,
organization_id INTEGER NOT NULL,
started_at TIMESTAMP,
completed_at TIMESTAMP,
status VARCHAR(50), -- 'success', 'error', 'warning'

-- Legacy counts (maintained for compatibility)
dogs_found INTEGER,
dogs_added INTEGER, 
dogs_updated INTEGER,

-- Enhanced metrics (production-ready)
detailed_metrics JSONB, -- Comprehensive statistics
duration_seconds NUMERIC(10,2), -- Performance tracking
data_quality_score NUMERIC(3,2), -- 0-1 quality assessment
error_message TEXT
```

### Availability Confidence System

The availability confidence system provides users with reliable data:

| Confidence Level | Meaning | Transition |
|------------------|---------|------------|
| `high` | Recently seen in scrape (0 missed scrapes) | Default for new/updated animals |
| `medium` | 1 missed scrape | Auto-transition after 1 week |
| `low` | 2-3 missed scrapes | Auto-transition after 2-3 weeks |
| `unavailable` | 4+ missed scrapes | Auto-transition after 4+ weeks |

### Quality Scoring Algorithm

Data quality is automatically assessed on a 0-1 scale:

**Required Fields (70% weight)**:
- `name` - Animal's name
- `breed` - Breed information  
- `age_text` - Age description
- `external_id` - Unique identifier from source

**Optional Fields (30% weight)**:
- `sex` - Male/Female
- `size` - Size description
- `primary_image_url` - Photo
- `adoption_url` - Link to adoption page

**Calculation**: 
```
score = (required_completeness * 0.7) + (optional_completeness * 0.3)
```

Example quality scores:
- **0.85-1.0**: Excellent (all required + most optional fields)
- **0.70-0.84**: Good (all required + some optional fields)  
- **0.50-0.69**: Fair (most required fields)
- **0.0-0.49**: Poor (missing required fields)

### Detailed Metrics JSONB Structure

The `detailed_metrics` field stores comprehensive scrape statistics:

```json
{
  "animals_found": 25,           // Total animals discovered
  "animals_added": 3,            // New animals created
  "animals_updated": 12,         // Existing animals updated
  "animals_unchanged": 10,       // Animals with no changes
  "images_uploaded": 23,         // Successful image uploads
  "images_failed": 2,            // Failed image uploads
  "duration_seconds": 45.2,      // Total scrape duration
  "data_quality_score": 0.87,    // Average quality score
  "potential_failure_detected": false, // Partial failure flag
  "scrape_session_id": "2024-06-07T18:30:00", // Session timestamp
  "error_recovery_triggered": false // Whether error recovery was used
}
```

### Migration Information

To upgrade existing databases to support availability management:

```sql
-- Apply availability tracking columns
\i database/migrations/001_add_duplicate_stale_detection.sql

-- Apply detailed metrics tracking
\i database/migrations/002_add_detailed_metrics.sql
```

These migrations add:
- Availability confidence and tracking columns to `animals` table
- JSONB metrics and performance columns to `scrape_logs` table
- Appropriate indexes for efficient querying
- Default values for existing records