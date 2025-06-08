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

## Advanced Standardization Features

### Language Detection and Multilingual Support

The system now includes automatic language detection for international rescue organizations:

```python
# Automatic language detection
def detect_language(text: str) -> str:
    """Detect language of animal description text."""
    # Uses langdetect library for automatic detection
    # Supports major European languages: en, es, fr, de, it, nl, etc.
    return detected_language or 'en'  # Default to English
```

**Language Field Usage**:
- `language` field stores detected language code (ISO 639-1)
- Enables language-specific text processing
- Supports multilingual search and filtering
- Preserves original language content for authenticity

### Enhanced Breed Mapping

The breed standardization system includes comprehensive mapping:

**Breed Normalization Examples**:
```python
breed_mappings = {
    # Mix variations
    "lab mix": "Labrador Retriever Mix",
    "pitt bull mix": "Pit Bull Mix", 
    "shepherd mix": "German Shepherd Mix",
    
    # Regional variations
    "alsatian": "German Shepherd",
    "grey hound": "Greyhound",
    
    # Size descriptors
    "small terrier": "Terrier (Small)",
    "large spaniel": "Spaniel (Large)",
    
    # Multi-language support
    "perro sin raza": "Mixed Breed",  # Spanish
    "croisé": "Mixed Breed",          # French
    "mischling": "Mixed Breed"        # German
}
```

**Breed Group Classifications**:
- **Sporting**: Retrievers, Pointers, Setters, Spaniels
- **Hound**: Beagles, Bloodhounds, Greyhounds, Basset Hounds
- **Working**: Rottweilers, Boxers, Great Danes, Mastiffs
- **Terrier**: Bull Terriers, Jack Russell, Yorkshire Terrier
- **Toy**: Chihuahuas, Pugs, Maltese, Pomeranians
- **Non-Sporting**: Bulldogs, Poodles, Dalmatians
- **Herding**: German Shepherds, Border Collies, Australian Shepherds
- **Mixed**: Any combination or unknown pure breed
- **Unknown**: Cannot be determined from available information

### Advanced Age Processing

Enhanced age standardization handles complex descriptions:

**Age Pattern Recognition**:
```python
age_patterns = {
    # Numerical patterns
    r"(\d+)\s+years?\s+old": lambda m: int(m.group(1)) * 12,
    r"(\d+)\s+months?\s+old": lambda m: int(m.group(1)),
    r"(\d+\.5)\s+years?": lambda m: int(float(m.group(1)) * 12),
    
    # Descriptive patterns
    r"puppy|puppies": 6,      # Average puppy age
    r"young|juvenile": 18,    # Young adult
    r"adult": 48,             # Middle age
    r"senior|elderly": 96,    # Senior dog
    
    # Multi-language patterns
    r"cachorro": 6,           # Spanish: puppy
    r"joven": 18,             # Spanish: young
    r"adulto": 48,            # Spanish: adult
    r"anciano": 96            # Spanish: senior
}
```

**Age Categories**:
- **Puppy**: 0-12 months
- **Young**: 1-3 years (12-36 months)
- **Adult**: 3-7 years (36-84 months)
- **Senior**: 7+ years (84+ months)

### Size Standardization with Weight Integration

Enhanced size mapping includes weight-based classification:

**Size Determination Logic**:
```python
def determine_size(weight_kg: float = None, size_text: str = None) -> str:
    """Determine standardized size from weight or description."""
    
    # Weight-based classification (most accurate)
    if weight_kg:
        if weight_kg < 5: return "Tiny"
        elif weight_kg < 15: return "Small"
        elif weight_kg < 30: return "Medium"
        elif weight_kg < 45: return "Large"
        else: return "Extra Large"
    
    # Text-based classification (fallback)
    if size_text:
        size_lower = size_text.lower()
        if any(term in size_lower for term in ['tiny', 'teacup', 'mini']):
            return "Tiny"
        elif any(term in size_lower for term in ['small', 'little', 'compact']):
            return "Small"
        elif any(term in size_lower for term in ['medium', 'mid-size', 'average']):
            return "Medium"
        elif any(term in size_lower for term in ['large', 'big']):
            return "Large"
        elif any(term in size_lower for term in ['extra large', 'giant', 'massive']):
            return "Extra Large"
    
    return "Unknown"
```

### Image Processing and Standardization

Image handling includes comprehensive processing:

**Image Standardization Pipeline**:
1. **URL Validation**: Verify image URLs are accessible
2. **Format Detection**: Identify image format (JPEG, PNG, WebP)
3. **Cloudinary Upload**: Upload to CDN with transformations
4. **Fallback Preservation**: Keep original URLs for error recovery
5. **Quality Assessment**: Evaluate image quality and completeness

**Image Transformations**:
```python
cloudinary_transforms = {
    'thumbnail': 'w_300,h_300,c_fill,g_auto,q_auto,f_auto',
    'detail': 'w_800,h_600,c_fit,q_auto,f_auto',
    'card': 'w_400,h_300,c_fill,g_auto,q_auto,f_auto'
}
```

### Standardization Quality Validation

Quality validation ensures standardization effectiveness:

**Validation Checks**:
```python
def validate_standardization_quality(animal_data: dict) -> dict:
    """Validate quality of standardized data."""
    
    quality_issues = []
    
    # Breed validation
    if animal_data.get('standardized_breed') == 'Unknown' and animal_data.get('breed'):
        quality_issues.append('breed_not_standardized')
    
    # Age validation
    if not animal_data.get('age_min_months') and animal_data.get('age_text'):
        quality_issues.append('age_not_parsed')
    
    # Size validation
    if animal_data.get('standardized_size') == 'Unknown' and animal_data.get('size'):
        quality_issues.append('size_not_standardized')
    
    return {
        'quality_score': calculate_quality_score(animal_data),
        'issues': quality_issues,
        'completeness': calculate_completeness(animal_data)
    }
```

## Data Flow and Processing

### Standardization Pipeline

1. **Raw Data Extraction**: Scrapers collect original data from websites
2. **Language Detection**: Automatic language identification
3. **Field Standardization**: Apply breed, age, and size mapping
4. **Quality Assessment**: Calculate completeness and accuracy scores
5. **Image Processing**: Upload and optimize images via Cloudinary
6. **Database Storage**: Store both original and standardized data
7. **Availability Tracking**: Initialize confidence and session tracking

### Error Handling and Recovery

**Standardization Error Recovery**:
- Preserve original data when standardization fails
- Log standardization errors for analysis
- Provide fallback values for critical fields
- Mark quality issues for manual review

**Data Consistency Checks**:
- Validate age ranges are logical (min ≤ max)
- Ensure breed groups match standardized breeds
- Verify size categories align with weight data
- Check language detection accuracy

### Performance Optimization

**Caching and Efficiency**:
- Cache frequent breed mappings in memory
- Batch standardization operations
- Index standardized fields for fast querying
- Use JSONB for flexible property storage

**Monitoring and Metrics**:
- Track standardization success rates
- Monitor quality score distributions
- Alert on declining standardization accuracy
- Performance metrics for processing time

This comprehensive standardization system ensures data quality and consistency across all rescue organizations while preserving original information for transparency and debugging purposes.