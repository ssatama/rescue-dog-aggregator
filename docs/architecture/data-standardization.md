# Data Standardization System - Comprehensive Technical Reference

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Standardization Components](#core-standardization-components)
4. [Advanced Features](#advanced-features)
5. [Database Integration](#database-integration)
6. [Quality Assurance](#quality-assurance)
7. [Performance Optimization](#performance-optimization)
8. [Multi-Language Support](#multi-language-support)
9. [Testing Strategy](#testing-strategy)
10. [API Integration](#api-integration)
11. [Troubleshooting](#troubleshooting)
12. [Migration Guide](#migration-guide)
13. [Best Practices](#best-practices)

## Overview

The Rescue Dog Aggregator's data standardization system is a comprehensive solution designed to normalize heterogeneous data from multiple international rescue organizations. The system handles complex multilingual inputs, ensures data consistency, and provides high-quality standardized outputs suitable for search, filtering, and display across the platform.

### Key Features

- **Multi-Language Support**: English, German, Spanish breed and age term recognition
- **Advanced Birth Date Parsing**: MM/YYYY and YYYY format support for European organizations
- **Comprehensive Breed Mapping**: 129+ breed entries covering all major breed groups
- **Intelligent Size Determination**: Weight-based and text-based classification
- **Quality Scoring**: Automated data quality assessment (0-1 scale)
- **Availability Tracking**: Confidence-based availability management
- **Performance Optimization**: Cached mappings and efficient processing
- **Idempotent Operations**: Consistent results across multiple standardization passes

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    Raw Data Input                                │
├─────────────────────────────────────────────────────────────────┤
│  • Scraped animal data from multiple organizations              │
│  • Various formats: English, German, Spanish                    │
│  • Inconsistent capitalization and terminology                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                Language Detection & Preprocessing                │
├─────────────────────────────────────────────────────────────────┤
│  • Automatic language identification                            │
│  • Text normalization and cleaning                              │
│  • Whitespace and format standardization                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Core Standardization Engine                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Breed          │  │  Age            │  │  Size           │ │
│  │  Standardization│  │  Standardization│  │  Standardization│ │
│  │                 │  │                 │  │                 │ │
│  │  • 129 mappings │  │  • Birth dates  │  │  • Weight-based │ │
│  │  • 9 groups     │  │  • Ranges       │  │  • Text-based   │ │
│  │  • Multi-lang   │  │  • Descriptive  │  │  • Fallback     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Quality Assessment                             │
├─────────────────────────────────────────────────────────────────┤
│  • Completeness scoring (0-1 scale)                             │
│  • Validation checks                                            │
│  • Error detection and recovery                                 │
│  • Consistency verification                                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Standardized Output                             │
├─────────────────────────────────────────────────────────────────┤
│  • Normalized breed names and groups                            │
│  • Standardized age categories and ranges                       │
│  • Consistent size classifications                               │
│  • Quality metrics and confidence scores                        │
│  • Preserved original data for transparency                     │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Pipeline

1. **Raw Data Ingestion**: Scraped data from rescue organizations
2. **Language Detection**: Automatic identification of content language
3. **Preprocessing**: Text cleaning, normalization, and validation
4. **Standardization**: Application of breed, age, and size mappings
5. **Quality Assessment**: Completeness and accuracy evaluation
6. **Output Generation**: Structured, standardized data with metadata
7. **Database Storage**: Persistent storage with indexing for performance

## Core Standardization Components

### 1. Breed Standardization

The breed standardization system processes over 129 unique breed patterns, mapping them to consistent names and classifications.

#### Breed Mapping Structure

```python
BREED_MAPPING = {
    # Format: "pattern": ("Standardized Name", "Breed Group", "Size Estimate")
    "labrador": ("Labrador Retriever", "Sporting", "Large"),
    "podenco": ("Podenco", "Hound", "Medium"),
    "galgo español": ("Galgo Español", "Hound", "Large"),
    # ... 126 more mappings
}
```

#### Breed Groups Classification

| Group | Description | Example Breeds | Characteristics |
|-------|-------------|----------------|-----------------|
| **Sporting** | Active hunting companions | Labrador, Golden Retriever, Pointer | High energy, water-friendly |
| **Hound** | Scent and sight hunters | Beagle, Greyhound, Podenco | Strong prey drive, excellent scenting |
| **Working** | Task-oriented breeds | Rottweiler, Boxer, Great Dane | Strength, intelligence, loyalty |
| **Terrier** | Vermin hunters | Jack Russell, Pit Bull, Yorkshire | Tenacious, fearless, alert |
| **Toy** | Companion breeds | Chihuahua, Pug, Maltese | Small size, affectionate nature |
| **Non-Sporting** | Diverse utility breeds | Bulldog, Poodle, Dalmatian | Varied purposes, unique traits |
| **Herding** | Livestock management | German Shepherd, Border Collie | Intelligence, trainability |
| **Mixed** | Crossbreeds and mixes | Any combination | Hybrid vigor, varied traits |
| **Unknown** | Unidentifiable breeds | Insufficient information | Requires manual review |

#### Advanced Breed Processing

```python
def standardize_breed(breed_text: str) -> Tuple[str, str, Optional[str]]:
    """
    Advanced breed standardization with multiple matching strategies.
    
    Matching Priority:
    1. Exact match (fastest)
    2. Partial match (contains)
    3. Mix breed handling
    4. Fallback capitalization
    
    Returns:
        Tuple of (standardized_breed, breed_group, size_estimate)
    """
    # Implementation handles:
    # - Case insensitive matching
    # - Multi-language terms
    # - Mix breed detection
    # - Size estimation integration
```

#### Multi-Language Breed Support

| Language | Example Mappings | Notes |
|----------|------------------|-------|
| **English** | "lab mix" → "Labrador Retriever Mix" | Primary language |
| **Spanish** | "perro sin raza" → "Mixed Breed" | Common in Spanish organizations |
| **German** | "mischling" → "Mixed Breed" | Used by German rescues |

### 2. Age Standardization

The age standardization system is the most complex component, handling diverse age formats including birth dates, ranges, and descriptive terms.

#### Age Pattern Recognition

```python
# Numerical patterns with validation
AGE_PATTERNS = {
    # Years (with bounds checking)
    r"(\d+(?:[.,]\d+)?)\s*(?:years?|y(?:rs?)?(?:\/o)?|yo|jahr)": 
        lambda m: validate_age_years(float(m.group(1).replace(",", "."))),
    
    # Months (with reasonable limits)
    r"(\d+)\s*(?:months?|mo|mon)": 
        lambda m: validate_age_months(int(m.group(1))),
    
    # Weeks (puppy age)
    r"(\d+)\s*(?:weeks?|wks?)": 
        lambda m: weeks_to_months(int(m.group(1))),
    
    # Birth dates (European format)
    r"(?:born\s*)?(\d{1,2})[/-](\d{4})": calculate_age_from_birth_date,
    r"(?:born\s*)?(\d{4})(?:\s|$)": calculate_age_from_birth_year,
}
```

#### Birth Date Processing (Advanced Feature)

The system supports birth date formats commonly used by European rescue organizations:

```python
def calculate_age_from_birth_date(age_text: str) -> Optional[Tuple[int, int]]:
    """
    Calculate age from birth date in MM/YYYY format.
    
    Supports:
    - MM/YYYY format (e.g., "03/2021")
    - "Born MM/YYYY" format (e.g., "Born 03/2021")
    - YYYY format (e.g., "2021", assumes mid-year)
    
    Validation:
    - Reasonable age bounds (0-20 years for dogs)
    - Valid month ranges (1-12)
    - Future date detection and handling
    """
    current_date = datetime.now()
    
    # Pattern matching and extraction
    birth_date_match = re.search(r"(?:born\s*)?(\d{1,2})[/-](\d{4})", age_text, re.IGNORECASE)
    
    if birth_date_match:
        birth_month = int(birth_date_match.group(1))
        birth_year = int(birth_date_match.group(2))
        
        # Comprehensive validation
        if not validate_birth_date(birth_year, birth_month, current_date):
            return None
            
        # Age calculation with uncertainty range
        age_months = calculate_months_difference(birth_year, birth_month, current_date)
        uncertainty_range = 2  # ±2 months for MM/YYYY format
        
        return (max(0, age_months - uncertainty_range), age_months + uncertainty_range)
    
    return None
```

#### Age Categories and Boundaries

| Category | Age Range | Months | Characteristics |
|----------|-----------|---------|-----------------|
| **Puppy** | 0-12 months | 0-12 | Rapid growth, high energy, training focus |
| **Young** | 1-3 years | 12-36 | Active, learning, socializing |
| **Adult** | 3-8 years | 36-96 | Stable, mature, consistent behavior |
| **Senior** | 8+ years | 96+ | Slower pace, health considerations |

#### Multi-Language Age Terms

```python
MULTILINGUAL_AGE_TERMS = {
    # English
    "puppy": ("Puppy", 2, 10),
    "young": ("Young", 12, 36),
    "adult": ("Adult", 36, 96),
    "senior": ("Senior", 96, 240),
    
    # Spanish
    "cachorro": ("Puppy", 2, 10),
    "joven": ("Young", 12, 36),
    "adulto": ("Adult", 36, 96),
    "anciano": ("Senior", 96, 240),
    
    # German
    "welpe": ("Puppy", 2, 10),
    "jung": ("Young", 12, 36),
    "erwachsen": ("Adult", 36, 96),
    "senior": ("Senior", 96, 240),
    "unbekannt": (None, None, None),  # Unknown
}
```

### 3. Size Standardization

Size standardization uses a dual approach: weight-based classification (when available) and text-based mapping (fallback).

#### Size Classification System

```python
SIZE_CATEGORIES = {
    "Tiny": {
        "weight_range": "< 5 kg",
        "height_range": "< 25 cm",
        "examples": ["Chihuahua", "Yorkshire Terrier", "Maltese"]
    },
    "Small": {
        "weight_range": "5-15 kg",
        "height_range": "25-40 cm", 
        "examples": ["Beagle", "Jack Russell", "French Bulldog"]
    },
    "Medium": {
        "weight_range": "15-30 kg",
        "height_range": "40-60 cm",
        "examples": ["Border Collie", "Australian Shepherd", "Cocker Spaniel"]
    },
    "Large": {
        "weight_range": "30-45 kg",
        "height_range": "60-70 cm",
        "examples": ["Labrador", "German Shepherd", "Golden Retriever"]
    },
    "XLarge": {
        "weight_range": "45+ kg",
        "height_range": "70+ cm",
        "examples": ["Great Dane", "Mastiff", "Saint Bernard"]
    }
}
```

#### Size Determination Logic

```python
def determine_size(weight_kg: float = None, size_text: str = None, breed: str = None) -> str:
    """
    Multi-source size determination with fallback hierarchy.
    
    Priority Order:
    1. Weight-based classification (most accurate)
    2. Text-based standardization (fallback)
    3. Breed-based estimation (last resort)
    """
    # Weight-based classification (highest priority)
    if weight_kg and weight_kg > 0:
        return classify_by_weight(weight_kg)
    
    # Text-based classification
    if size_text:
        standardized = standardize_size_value(size_text)
        if standardized:
            return standardized
    
    # Breed-based estimation (fallback)
    if breed:
        return get_size_from_breed(breed)
    
    return "Unknown"
```

## Advanced Features

### 1. Birth Date Parsing System

The birth date parsing system is specifically designed to handle European rescue organization formats:

#### Supported Formats

| Format | Example | Parsing Method | Accuracy |
|--------|---------|----------------|----------|
| **MM/YYYY** | "03/2021" | Direct calculation | ±2 months |
| **Born MM/YYYY** | "Born 03/2021" | Direct calculation | ±2 months |
| **YYYY** | "2021" | Assumes June birth | ±6 months |
| **Born YYYY** | "Born 2021" | Assumes June birth | ±6 months |

#### Implementation Details

```python
def parse_birth_date(age_text: str) -> Optional[Tuple[int, int]]:
    """
    Parse birth dates with comprehensive validation.
    
    Features:
    - Format flexibility (MM/YYYY, YYYY)
    - Reasonable age bounds (0-20 years)
    - Future date detection
    - Uncertainty quantification
    """
    current_date = datetime.now()
    
    # MM/YYYY format parsing
    if birth_date_match := re.search(r"(?:born\s*)?(\d{1,2})[/-](\d{4})", age_text, re.IGNORECASE):
        birth_month, birth_year = int(birth_date_match.group(1)), int(birth_date_match.group(2))
        
        # Validation checks
        if not (1 <= birth_month <= 12):
            return None
            
        if not (current_date.year - 20 <= birth_year <= current_date.year + 1):
            return None
            
        # Age calculation
        age_months = calculate_age_months(birth_year, birth_month, current_date)
        return (max(0, age_months), age_months + 2)  # ±2 months uncertainty
    
    # YYYY format parsing
    if year_match := re.search(r"(?:born\s*)?(\d{4})(?:\s|$)", age_text, re.IGNORECASE):
        birth_year = int(year_match.group(1))
        
        if not (current_date.year - 20 <= birth_year <= current_date.year + 1):
            return None
            
        # Assume mid-year birth
        age_months = calculate_age_months(birth_year, 6, current_date)
        return (max(0, age_months - 6), age_months + 6)  # ±6 months uncertainty
    
    return None
```

### 2. Quality Scoring Algorithm

The quality scoring system evaluates data completeness and accuracy on a 0-1 scale:

#### Scoring Components

```python
QUALITY_WEIGHTS = {
    "required_fields": 0.7,  # 70% weight
    "optional_fields": 0.3,  # 30% weight
}

REQUIRED_FIELDS = [
    "name",           # Animal name
    "breed",          # Breed information
    "age_text",       # Age description
    "external_id",    # Unique source identifier
]

OPTIONAL_FIELDS = [
    "sex",                # Gender
    "size",               # Size description
    "primary_image_url",  # Primary photo
    "adoption_url",       # Adoption link
    "standardized_breed", # Processed breed
    "age_min_months",     # Processed age
]
```

#### Quality Score Calculation

```python
def calculate_quality_score(animal_data: dict) -> float:
    """
    Calculate data quality score (0-1 scale).
    
    Formula:
    score = (required_completeness * 0.7) + (optional_completeness * 0.3)
    """
    required_present = sum(1 for field in REQUIRED_FIELDS 
                          if animal_data.get(field))
    required_completeness = required_present / len(REQUIRED_FIELDS)
    
    optional_present = sum(1 for field in OPTIONAL_FIELDS 
                          if animal_data.get(field))
    optional_completeness = optional_present / len(OPTIONAL_FIELDS)
    
    return (required_completeness * 0.7) + (optional_completeness * 0.3)
```

#### Quality Categories

| Score Range | Category | Description | Action |
|-------------|----------|-------------|--------|
| **0.85-1.0** | Excellent | All required + most optional fields | Ready for display |
| **0.70-0.84** | Good | All required + some optional fields | Ready for display |
| **0.50-0.69** | Fair | Most required fields present | Review recommended |
| **0.0-0.49** | Poor | Missing critical fields | Manual review required |

### 3. Availability Confidence System

The availability confidence system provides users with reliable adoption status information:

#### Confidence Levels

```python
CONFIDENCE_LEVELS = {
    "high": {
        "description": "Recently seen in scrape",
        "missed_scrapes": 0,
        "retention_period": "1 week",
        "display_priority": 1
    },
    "medium": {
        "description": "Missed 1 scrape",
        "missed_scrapes": 1,
        "retention_period": "2 weeks",
        "display_priority": 2
    },
    "low": {
        "description": "Missed 2-3 scrapes",
        "missed_scrapes": "2-3",
        "retention_period": "3-4 weeks",
        "display_priority": 3
    },
    "unavailable": {
        "description": "Missed 4+ scrapes",
        "missed_scrapes": "4+",
        "retention_period": "Archived",
        "display_priority": 4
    }
}
```

#### Transition Logic

```python
def update_availability_confidence(animal: dict, found_in_scrape: bool) -> dict:
    """
    Update availability confidence based on scrape results.
    
    Transition Rules:
    - Found: Reset to 'high' confidence
    - Not found: Increment missed scrapes, update confidence
    - Archive: After 4+ missed scrapes
    """
    if found_in_scrape:
        return {
            "availability_confidence": "high",
            "consecutive_scrapes_missing": 0,
            "last_seen_at": datetime.now()
        }
    else:
        missed = animal.get("consecutive_scrapes_missing", 0) + 1
        
        if missed >= 4:
            confidence = "unavailable"
            status = "archived"
        elif missed >= 2:
            confidence = "low"
            status = "available"
        elif missed >= 1:
            confidence = "medium"
            status = "available"
        else:
            confidence = "high"
            status = "available"
            
        return {
            "availability_confidence": confidence,
            "consecutive_scrapes_missing": missed,
            "status": status
        }
```

## Database Integration

### Enhanced Schema Design

The database schema is optimized for both standardized and original data storage:

```sql
-- Core animal table with standardization support
CREATE TABLE animals (
    -- Primary identification
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    organization_id INTEGER NOT NULL,
    external_id VARCHAR(255),
    
    -- Original data (preserved for transparency)
    breed VARCHAR(255),
    age_text VARCHAR(100),
    size VARCHAR(50),
    
    -- Standardized data (processed)
    standardized_breed VARCHAR(100),
    breed_group VARCHAR(50),
    age_min_months INTEGER,
    age_max_months INTEGER,
    standardized_size VARCHAR(50),
    
    -- Availability management
    status VARCHAR(50) DEFAULT 'available',
    availability_confidence VARCHAR(20) DEFAULT 'high',
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    consecutive_scrapes_missing INTEGER DEFAULT 0,
    
    -- Multi-language support
    language VARCHAR(10) DEFAULT 'en',
    
    -- Extended properties (JSONB for flexibility)
    properties JSONB,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_scraped_at TIMESTAMP,
    
    -- Image handling
    primary_image_url TEXT,
    original_image_url TEXT,
    adoption_url TEXT NOT NULL,
    
    -- Constraints
    UNIQUE (external_id, organization_id)
);
```

### Performance Indexes

```sql
-- Standardized field indexes for fast filtering
CREATE INDEX idx_animals_standardized_breed ON animals(standardized_breed);
CREATE INDEX idx_animals_breed_group ON animals(breed_group);
CREATE INDEX idx_animals_standardized_size ON animals(standardized_size);
CREATE INDEX idx_animals_age_range ON animals(age_min_months, age_max_months);

-- Availability tracking indexes
CREATE INDEX idx_animals_availability_confidence ON animals(availability_confidence);
CREATE INDEX idx_animals_last_seen_at ON animals(last_seen_at);
CREATE INDEX idx_animals_consecutive_missing ON animals(consecutive_scrapes_missing);

-- Full-text search indexes
CREATE INDEX idx_animals_name_gin ON animals USING gin(to_tsvector('english', name));
CREATE INDEX idx_animals_breed_gin ON animals USING gin(to_tsvector('english', breed));

-- JSONB property indexes
CREATE INDEX idx_animals_properties ON animals USING gin(properties);
```

### Scrape Logs with Detailed Metrics

```sql
-- Enhanced scrape logging
CREATE TABLE scrape_logs (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    status VARCHAR(50) NOT NULL,
    
    -- Legacy counts (maintained for compatibility)
    dogs_found INTEGER,
    dogs_added INTEGER,
    dogs_updated INTEGER,
    
    -- Enhanced metrics (JSONB for flexibility)
    detailed_metrics JSONB,
    duration_seconds NUMERIC(10,2),
    data_quality_score NUMERIC(3,2) CHECK (data_quality_score >= 0 AND data_quality_score <= 1),
    
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Detailed Metrics Structure

```json
{
  "scrape_session_id": "2024-07-08T14:30:00Z",
  "animals_found": 28,
  "animals_added": 4,
  "animals_updated": 15,
  "animals_unchanged": 9,
  "animals_archived": 2,
  
  "standardization_metrics": {
    "breeds_standardized": 26,
    "ages_parsed": 24,
    "sizes_determined": 25,
    "birth_dates_parsed": 8,
    "quality_scores": {
      "excellent": 12,
      "good": 10,
      "fair": 4,
      "poor": 2
    }
  },
  
  "image_processing": {
    "images_found": 27,
    "images_uploaded": 25,
    "images_failed": 2,
    "cloudinary_transforms": 25
  },
  
  "performance_metrics": {
    "duration_seconds": 47.3,
    "items_per_second": 0.59,
    "api_calls": 28,
    "retry_attempts": 3
  },
  
  "quality_assessment": {
    "overall_score": 0.87,
    "completeness_score": 0.92,
    "accuracy_score": 0.82,
    "consistency_score": 0.89
  },
  
  "error_recovery": {
    "partial_failures": 0,
    "recovered_items": 2,
    "unrecoverable_errors": 1
  }
}
```

## Quality Assurance

### Validation Pipeline

The quality assurance system includes multiple validation layers:

#### 1. Input Validation

```python
def validate_input_data(animal_data: dict) -> List[str]:
    """
    Validate input data quality and detect issues.
    
    Returns:
        List of validation issues (empty if valid)
    """
    issues = []
    
    # Required field validation
    if not animal_data.get("name"):
        issues.append("missing_name")
    
    if not animal_data.get("external_id"):
        issues.append("missing_external_id")
    
    # Data type validation
    if "age_text" in animal_data and not isinstance(animal_data["age_text"], str):
        issues.append("invalid_age_type")
    
    # Business logic validation
    if animal_data.get("age_min_months", 0) < 0:
        issues.append("negative_age")
    
    if animal_data.get("age_max_months", 0) > 300:  # 25 years
        issues.append("unrealistic_age")
    
    return issues
```

#### 2. Standardization Validation

```python
def validate_standardization_quality(animal_data: dict) -> dict:
    """
    Validate quality of standardized data.
    
    Returns:
        Validation report with issues and recommendations
    """
    issues = []
    recommendations = []
    
    # Breed validation
    if animal_data.get("standardized_breed") == "Unknown" and animal_data.get("breed"):
        issues.append("breed_not_standardized")
        recommendations.append("review_breed_mapping")
    
    # Age validation
    if not animal_data.get("age_min_months") and animal_data.get("age_text"):
        issues.append("age_not_parsed")
        recommendations.append("improve_age_parsing")
    
    # Size validation
    if animal_data.get("standardized_size") == "Unknown" and animal_data.get("size"):
        issues.append("size_not_standardized")
        recommendations.append("review_size_mapping")
    
    # Consistency validation
    age_min = animal_data.get("age_min_months", 0)
    age_max = animal_data.get("age_max_months", 0)
    if age_min > age_max and age_max > 0:
        issues.append("inconsistent_age_range")
    
    return {
        "quality_score": calculate_quality_score(animal_data),
        "issues": issues,
        "recommendations": recommendations,
        "completeness": calculate_completeness(animal_data)
    }
```

#### 3. Consistency Validation

```python
def validate_consistency(animal_data: dict) -> dict:
    """
    Validate internal consistency of standardized data.
    
    Checks:
    - Age ranges are logical
    - Breed groups match standardized breeds
    - Size categories align with breed expectations
    """
    consistency_issues = []
    
    # Age range consistency
    if animal_data.get("age_min_months", 0) > animal_data.get("age_max_months", 0):
        consistency_issues.append("inverted_age_range")
    
    # Breed group consistency
    breed = animal_data.get("standardized_breed")
    group = animal_data.get("breed_group")
    if breed and group:
        expected_group = get_breed_group(breed)
        if expected_group != group:
            consistency_issues.append("breed_group_mismatch")
    
    # Size breed consistency
    breed_size = get_size_from_breed(breed) if breed else None
    actual_size = animal_data.get("standardized_size")
    if breed_size and actual_size and breed_size != actual_size:
        # Allow some flexibility for mixed breeds
        if "Mix" not in breed:
            consistency_issues.append("size_breed_mismatch")
    
    return {
        "consistent": len(consistency_issues) == 0,
        "issues": consistency_issues
    }
```

### Error Handling and Recovery

```python
def apply_standardization_with_recovery(animal_data: dict) -> dict:
    """
    Apply standardization with comprehensive error handling.
    
    Features:
    - Graceful degradation on errors
    - Partial standardization support
    - Error logging and recovery
    """
    result = animal_data.copy()
    errors = []
    
    try:
        # Breed standardization
        if result.get("breed"):
            breed_result = standardize_breed(result["breed"])
            result.update({
                "standardized_breed": breed_result[0],
                "breed_group": breed_result[1],
                "breed_size_estimate": breed_result[2]
            })
    except Exception as e:
        errors.append(f"breed_standardization_error: {str(e)}")
        result["standardized_breed"] = "Unknown"
        result["breed_group"] = "Unknown"
    
    try:
        # Age standardization
        if result.get("age_text"):
            age_result = standardize_age(result["age_text"])
            result.update(age_result)
    except Exception as e:
        errors.append(f"age_standardization_error: {str(e)}")
        result.update({
            "age_category": None,
            "age_min_months": None,
            "age_max_months": None
        })
    
    try:
        # Size standardization
        size_result = determine_size_with_fallback(result)
        if size_result:
            result["standardized_size"] = size_result
    except Exception as e:
        errors.append(f"size_standardization_error: {str(e)}")
        result["standardized_size"] = "Unknown"
    
    # Store error information
    if errors:
        result["standardization_errors"] = errors
    
    return result
```

## Performance Optimization

### Caching Strategy

```python
# In-memory caching for frequently accessed mappings
from functools import lru_cache

@lru_cache(maxsize=1000)
def cached_breed_standardization(breed_text: str) -> Tuple[str, str, Optional[str]]:
    """Cached version of breed standardization for performance."""
    return standardize_breed(breed_text)

@lru_cache(maxsize=500)
def cached_age_parsing(age_text: str) -> Tuple[Optional[str], Optional[int], Optional[int]]:
    """Cached version of age parsing for performance."""
    return parse_age_text(age_text)
```

### Batch Processing

```python
def batch_standardize_animals(animals: List[dict], batch_size: int = 100) -> List[dict]:
    """
    Process animals in batches for optimal performance.
    
    Features:
    - Parallel processing support
    - Memory management
    - Progress tracking
    """
    results = []
    
    for i in range(0, len(animals), batch_size):
        batch = animals[i:i + batch_size]
        batch_results = []
        
        for animal in batch:
            try:
                standardized = apply_standardization(animal)
                batch_results.append(standardized)
            except Exception as e:
                # Log error but continue processing
                logger.error(f"Standardization error for animal {animal.get('id')}: {e}")
                batch_results.append(animal)  # Return original data
        
        results.extend(batch_results)
        
        # Progress reporting
        if i % (batch_size * 10) == 0:
            logger.info(f"Processed {i + len(batch)} of {len(animals)} animals")
    
    return results
```

### Database Query Optimization

```python
def get_animals_for_standardization(organization_id: int, limit: int = 1000) -> List[dict]:
    """
    Optimized query for retrieving animals requiring standardization.
    
    Features:
    - Index-optimized queries
    - Minimal data transfer
    - Batch processing ready
    """
    query = """
        SELECT 
            id, external_id, name, breed, age_text, size,
            standardized_breed, breed_group, standardized_size,
            age_min_months, age_max_months
        FROM animals 
        WHERE organization_id = %s
        AND (
            standardized_breed IS NULL OR
            (breed IS NOT NULL AND standardized_breed = 'Unknown') OR
            (age_text IS NOT NULL AND age_min_months IS NULL) OR
            (size IS NOT NULL AND standardized_size IS NULL)
        )
        ORDER BY last_scraped_at DESC
        LIMIT %s
    """
    
    return execute_query(query, (organization_id, limit))
```

### Monitoring and Metrics

```python
def track_standardization_performance(func):
    """Decorator to track standardization performance metrics."""
    def wrapper(*args, **kwargs):
        start_time = time.time()
        
        try:
            result = func(*args, **kwargs)
            duration = time.time() - start_time
            
            # Track success metrics
            metrics.increment('standardization.success')
            metrics.timing('standardization.duration', duration)
            
            return result
            
        except Exception as e:
            duration = time.time() - start_time
            
            # Track error metrics
            metrics.increment('standardization.error')
            metrics.timing('standardization.error_duration', duration)
            
            raise
    
    return wrapper
```

## Multi-Language Support

### Language Detection

```python
def detect_language(text: str) -> str:
    """
    Detect language of animal description text.
    
    Supports:
    - English (en)
    - Spanish (es)
    - German (de)
    - French (fr)
    - Italian (it)
    - Dutch (nl)
    """
    if not text:
        return 'en'  # Default to English
    
    # Simple keyword-based detection for common terms
    spanish_indicators = ['años', 'meses', 'cachorro', 'adulto', 'macho', 'hembra']
    german_indicators = ['jahre', 'monate', 'welpe', 'erwachsen', 'männlich', 'weiblich', 'unbekannt']
    
    text_lower = text.lower()
    
    if any(indicator in text_lower for indicator in spanish_indicators):
        return 'es'
    elif any(indicator in text_lower for indicator in german_indicators):
        return 'de'
    
    # Fallback to langdetect library for complex detection
    try:
        from langdetect import detect
        detected = detect(text)
        return detected if detected in ['en', 'es', 'de', 'fr', 'it', 'nl'] else 'en'
    except:
        return 'en'
```

### Multi-Language Breed Mapping

```python
MULTILINGUAL_BREED_MAPPING = {
    # Spanish breeds and terms
    "podenco": ("Podenco", "Hound", "Medium"),
    "podenca": ("Podenca", "Hound", "Medium"),
    "galgo": ("Galgo", "Hound", "Large"),
    "galga": ("Galga", "Hound", "Large"),
    "perro sin raza": ("Mixed Breed", "Mixed", "Medium"),
    "mestizo": ("Mixed Breed", "Mixed", "Medium"),
    
    # German breeds and terms
    "mischling": ("Mixed Breed", "Mixed", "Medium"),
    "schäferhund": ("German Shepherd", "Herding", "Large"),
    "deutscher schäferhund": ("German Shepherd", "Herding", "Large"),
    "golden retriever": ("Golden Retriever", "Sporting", "Large"),
    "labrador": ("Labrador Retriever", "Sporting", "Large"),
    
    # French breeds and terms
    "croisé": ("Mixed Breed", "Mixed", "Medium"),
    "berger allemand": ("German Shepherd", "Herding", "Large"),
    "labrador": ("Labrador Retriever", "Sporting", "Large"),
}
```

### Language-Specific Processing

```python
def standardize_with_language_context(animal_data: dict) -> dict:
    """
    Apply standardization with language-specific processing.
    
    Features:
    - Language detection
    - Localized term mapping
    - Cultural context awareness
    """
    result = animal_data.copy()
    
    # Detect language from combined text
    combined_text = f"{result.get('breed', '')} {result.get('age_text', '')} {result.get('size', '')}"
    detected_language = detect_language(combined_text)
    result['language'] = detected_language
    
    # Apply language-specific standardization
    if detected_language == 'es':
        result = apply_spanish_standardization(result)
    elif detected_language == 'de':
        result = apply_german_standardization(result)
    else:
        result = apply_english_standardization(result)
    
    return result
```

## Testing Strategy

### Unit Testing

```python
class TestBreedStandardization:
    """Comprehensive breed standardization tests."""
    
    def test_exact_breed_matches(self):
        """Test exact matches from breed mapping."""
        test_cases = [
            ("labrador", "Labrador Retriever", "Sporting", "Large"),
            ("german shepherd", "German Shepherd", "Herding", "Large"),
            ("podenco", "Podenco", "Hound", "Medium"),
        ]
        
        for input_breed, expected_breed, expected_group, expected_size in test_cases:
            result = standardize_breed(input_breed)
            assert result == (expected_breed, expected_group, expected_size)
    
    def test_case_insensitive_matching(self):
        """Test case insensitive breed matching."""
        variations = ["LABRADOR", "labrador", "Labrador", "LabraDor"]
        
        for variation in variations:
            result = standardize_breed(variation)
            assert result[0] == "Labrador Retriever"
    
    def test_mixed_breed_handling(self):
        """Test mixed breed detection and standardization."""
        mixed_breeds = ["lab mix", "german shepherd mix", "terrier cross"]
        
        for mixed_breed in mixed_breeds:
            result = standardize_breed(mixed_breed)
            assert "Mix" in result[0]
            assert result[1] == "Mixed"
```

### Integration Testing

```python
class TestFullStandardizationPipeline:
    """Test complete standardization pipeline."""
    
    def test_real_world_data_standardization(self):
        """Test with real data from rescue organizations."""
        test_animals = [
            {
                "name": "Bella",
                "breed": "labrador mix",
                "age_text": "Born 03/2021",
                "size": "large",
                "organization_id": 1
            },
            {
                "name": "Max",
                "breed": "Podenco",
                "age_text": "2 años",
                "size": "mediano",
                "organization_id": 2
            }
        ]
        
        for animal in test_animals:
            result = apply_standardization(animal)
            
            # Verify standardization occurred
            assert "standardized_breed" in result
            assert "age_min_months" in result
            assert "standardized_size" in result
            
            # Verify quality score
            quality = calculate_quality_score(result)
            assert 0 <= quality <= 1
```

### Performance Testing

```python
class TestStandardizationPerformance:
    """Test performance characteristics of standardization."""
    
    def test_batch_processing_performance(self):
        """Test batch processing performance."""
        # Generate test data
        animals = [generate_test_animal() for _ in range(1000)]
        
        start_time = time.time()
        results = batch_standardize_animals(animals)
        duration = time.time() - start_time
        
        # Performance assertions
        assert len(results) == len(animals)
        assert duration < 30  # Should process 1000 animals in under 30 seconds
        
        # Verify quality
        quality_scores = [calculate_quality_score(result) for result in results]
        avg_quality = sum(quality_scores) / len(quality_scores)
        assert avg_quality > 0.7  # Average quality should be good
```

### Consistency Testing

```python
class TestDataConsistency:
    """Test data consistency across standardization operations."""
    
    def test_idempotent_standardization(self):
        """Test that standardization is idempotent."""
        test_data = {
            "breed": "labrador mix",
            "age_text": "2 years",
            "size": "large"
        }
        
        first_pass = apply_standardization(test_data)
        second_pass = apply_standardization(first_pass)
        
        # Results should be identical
        assert first_pass["standardized_breed"] == second_pass["standardized_breed"]
        assert first_pass["age_min_months"] == second_pass["age_min_months"]
        assert first_pass["standardized_size"] == second_pass["standardized_size"]
```

## API Integration

### Standardization Endpoints

```python
@app.post("/api/standardize/animal")
async def standardize_animal(animal_data: dict):
    """
    Standardize a single animal record.
    
    Request:
    {
        "name": "Bella",
        "breed": "lab mix",
        "age_text": "2 years",
        "size": "large"
    }
    
    Response:
    {
        "original": {...},
        "standardized": {
            "standardized_breed": "Labrador Retriever Mix",
            "breed_group": "Mixed",
            "age_category": "Young",
            "age_min_months": 24,
            "age_max_months": 36,
            "standardized_size": "Large"
        },
        "quality_score": 0.87,
        "processing_time": 0.023
    }
    """
    start_time = time.time()
    
    try:
        # Validate input
        validation_issues = validate_input_data(animal_data)
        if validation_issues:
            raise HTTPException(400, f"Validation errors: {validation_issues}")
        
        # Apply standardization
        standardized = apply_standardization(animal_data)
        
        # Calculate quality metrics
        quality_score = calculate_quality_score(standardized)
        processing_time = time.time() - start_time
        
        return {
            "original": animal_data,
            "standardized": standardized,
            "quality_score": quality_score,
            "processing_time": processing_time
        }
        
    except Exception as e:
        logger.error(f"Standardization error: {e}")
        raise HTTPException(500, "Standardization failed")
```

### Batch Processing Endpoint

```python
@app.post("/api/standardize/batch")
async def standardize_animals_batch(animals: List[dict]):
    """
    Standardize multiple animal records in batch.
    
    Features:
    - Parallel processing
    - Error isolation
    - Progress tracking
    """
    if len(animals) > 1000:
        raise HTTPException(400, "Batch size cannot exceed 1000 animals")
    
    start_time = time.time()
    results = []
    errors = []
    
    try:
        # Process in batches
        batch_results = batch_standardize_animals(animals)
        
        for i, (original, standardized) in enumerate(zip(animals, batch_results)):
            try:
                quality_score = calculate_quality_score(standardized)
                results.append({
                    "index": i,
                    "original": original,
                    "standardized": standardized,
                    "quality_score": quality_score
                })
            except Exception as e:
                errors.append({
                    "index": i,
                    "error": str(e),
                    "original": original
                })
        
        processing_time = time.time() - start_time
        
        return {
            "results": results,
            "errors": errors,
            "summary": {
                "total_processed": len(animals),
                "successful": len(results),
                "failed": len(errors),
                "processing_time": processing_time,
                "items_per_second": len(animals) / processing_time
            }
        }
        
    except Exception as e:
        logger.error(f"Batch standardization error: {e}")
        raise HTTPException(500, "Batch standardization failed")
```

### Quality Assessment Endpoint

```python
@app.get("/api/standardization/quality/{organization_id}")
async def get_standardization_quality(organization_id: int):
    """
    Get standardization quality metrics for an organization.
    
    Response:
    {
        "organization_id": 1,
        "total_animals": 245,
        "quality_distribution": {
            "excellent": 125,
            "good": 87,
            "fair": 25,
            "poor": 8
        },
        "standardization_coverage": {
            "breeds_standardized": 0.92,
            "ages_parsed": 0.88,
            "sizes_determined": 0.95
        },
        "common_issues": [
            {"issue": "breed_not_standardized", "count": 12},
            {"issue": "age_not_parsed", "count": 8}
        ]
    }
    """
    # Get animals for organization
    animals = get_animals_by_organization(organization_id)
    
    # Calculate quality metrics
    quality_scores = [calculate_quality_score(animal) for animal in animals]
    
    # Distribution analysis
    distribution = {
        "excellent": sum(1 for score in quality_scores if score >= 0.85),
        "good": sum(1 for score in quality_scores if 0.70 <= score < 0.85),
        "fair": sum(1 for score in quality_scores if 0.50 <= score < 0.70),
        "poor": sum(1 for score in quality_scores if score < 0.50)
    }
    
    # Coverage analysis
    coverage = {
        "breeds_standardized": sum(1 for animal in animals if animal.get("standardized_breed") and animal["standardized_breed"] != "Unknown") / len(animals),
        "ages_parsed": sum(1 for animal in animals if animal.get("age_min_months")) / len(animals),
        "sizes_determined": sum(1 for animal in animals if animal.get("standardized_size") and animal["standardized_size"] != "Unknown") / len(animals)
    }
    
    return {
        "organization_id": organization_id,
        "total_animals": len(animals),
        "quality_distribution": distribution,
        "standardization_coverage": coverage,
        "average_quality_score": sum(quality_scores) / len(quality_scores) if quality_scores else 0
    }
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Birth Date Parsing Issues

**Problem**: Birth dates not being parsed correctly

**Symptoms**:
- `age_min_months` and `age_max_months` are NULL
- Age category is NULL despite having birth date information

**Diagnosis**:
```python
def diagnose_birth_date_parsing(age_text: str):
    """Diagnose birth date parsing issues."""
    print(f"Input: '{age_text}'")
    
    # Check format detection
    formats = [
        r"(?:born\s*)?(\d{1,2})[/-](\d{4})",
        r"(?:born\s*)?(\d{4})(?:\s|$)"
    ]
    
    for i, pattern in enumerate(formats):
        match = re.search(pattern, age_text, re.IGNORECASE)
        if match:
            print(f"Format {i+1} matched: {match.groups()}")
        else:
            print(f"Format {i+1} no match")
    
    # Check validation
    result = parse_age_text(age_text)
    print(f"Parse result: {result}")
```

**Solutions**:
1. **Format Issues**: Ensure birth dates use supported formats (MM/YYYY, YYYY)
2. **Validation Failures**: Check for reasonable age bounds (0-20 years)
3. **Future Dates**: Verify birth dates are not in the future

#### 2. Breed Standardization Issues

**Problem**: Breeds not being standardized correctly

**Symptoms**:
- `standardized_breed` is "Unknown" for known breeds
- Breed group is "Unknown"

**Diagnosis**:
```python
def diagnose_breed_standardization(breed_text: str):
    """Diagnose breed standardization issues."""
    print(f"Input: '{breed_text}'")
    
    # Check mapping
    clean_text = breed_text.strip().lower()
    print(f"Cleaned: '{clean_text}'")
    
    # Check for exact match
    if clean_text in BREED_MAPPING:
        print(f"Exact match: {BREED_MAPPING[clean_text]}")
    
    # Check for partial matches
    partial_matches = [key for key in BREED_MAPPING if key in clean_text]
    print(f"Partial matches: {partial_matches}")
    
    # Check result
    result = standardize_breed(breed_text)
    print(f"Result: {result}")
```

**Solutions**:
1. **Missing Mappings**: Add new breed patterns to `BREED_MAPPING`
2. **Spelling Variations**: Include common misspellings in mapping
3. **Language Issues**: Add multi-language breed terms

#### 3. Size Standardization Issues

**Problem**: Sizes not being standardized

**Symptoms**:
- `standardized_size` is NULL or "Unknown"
- Size information available but not processed

**Diagnosis**:
```python
def diagnose_size_standardization(animal_data: dict):
    """Diagnose size standardization issues."""
    print(f"Input data: {animal_data}")
    
    # Check size field
    if "size" in animal_data:
        size_result = standardize_size_value(animal_data["size"])
        print(f"Size field result: {size_result}")
    
    # Check breed size estimation
    if "breed" in animal_data:
        breed_size = get_size_from_breed(animal_data["breed"])
        print(f"Breed size estimate: {breed_size}")
    
    # Check full standardization
    result = apply_standardization(animal_data)
    print(f"Final size: {result.get('standardized_size')}")
```

**Solutions**:
1. **Size Mapping**: Add new size terms to `SIZE_MAPPINGS`
2. **Breed Estimation**: Ensure breed has size estimate in mapping
3. **Fallback Logic**: Verify size fallback logic is working

#### 4. Performance Issues

**Problem**: Slow standardization processing

**Symptoms**:
- Long processing times for large batches
- Memory usage increasing over time

**Diagnosis**:
```python
def diagnose_performance_issues():
    """Diagnose performance bottlenecks."""
    import cProfile
    import pstats
    
    # Profile standardization
    profiler = cProfile.Profile()
    profiler.enable()
    
    # Run standardization
    test_data = generate_test_animals(1000)
    batch_standardize_animals(test_data)
    
    profiler.disable()
    stats = pstats.Stats(profiler)
    stats.sort_stats('cumulative')
    stats.print_stats(10)
```

**Solutions**:
1. **Caching**: Enable LRU caching for frequently used functions
2. **Batch Size**: Reduce batch size for memory-intensive operations
3. **Database Optimization**: Ensure proper indexing for queries

### Debugging Tools

```python
def debug_standardization_pipeline(animal_data: dict):
    """
    Debug the entire standardization pipeline.
    
    Provides detailed information about each step.
    """
    print("=== Standardization Debug ===")
    print(f"Input: {animal_data}")
    
    # Input validation
    validation_issues = validate_input_data(animal_data)
    print(f"Validation issues: {validation_issues}")
    
    # Language detection
    combined_text = f"{animal_data.get('breed', '')} {animal_data.get('age_text', '')}"
    language = detect_language(combined_text)
    print(f"Detected language: {language}")
    
    # Breed standardization
    if animal_data.get('breed'):
        breed_result = standardize_breed(animal_data['breed'])
        print(f"Breed standardization: {breed_result}")
    
    # Age standardization
    if animal_data.get('age_text'):
        age_result = parse_age_text(animal_data['age_text'])
        print(f"Age parsing: {age_result}")
    
    # Size standardization
    if animal_data.get('size'):
        size_result = standardize_size_value(animal_data['size'])
        print(f"Size standardization: {size_result}")
    
    # Full standardization
    final_result = apply_standardization(animal_data)
    print(f"Final result: {final_result}")
    
    # Quality assessment
    quality_score = calculate_quality_score(final_result)
    print(f"Quality score: {quality_score}")
```

## Migration Guide

### Upgrading from Legacy System

#### 1. Database Schema Migration

```sql
-- Step 1: Add new standardization columns
ALTER TABLE animals ADD COLUMN IF NOT EXISTS standardized_breed VARCHAR(100);
ALTER TABLE animals ADD COLUMN IF NOT EXISTS breed_group VARCHAR(50);
ALTER TABLE animals ADD COLUMN IF NOT EXISTS age_min_months INTEGER;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS age_max_months INTEGER;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS standardized_size VARCHAR(50);
ALTER TABLE animals ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en';

-- Step 2: Add availability tracking
ALTER TABLE animals ADD COLUMN IF NOT EXISTS availability_confidence VARCHAR(20) DEFAULT 'high';
ALTER TABLE animals ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS consecutive_scrapes_missing INTEGER DEFAULT 0;

-- Step 3: Add quality tracking
ALTER TABLE scrape_logs ADD COLUMN IF NOT EXISTS detailed_metrics JSONB;
ALTER TABLE scrape_logs ADD COLUMN IF NOT EXISTS data_quality_score NUMERIC(3,2);
```

#### 2. Data Migration Script

```python
def migrate_existing_data():
    """
    Migrate existing animal data to new standardization format.
    
    Process:
    1. Backup existing data
    2. Apply standardization to all records
    3. Verify migration results
    4. Update indexes
    """
    # Backup
    backup_table('animals', 'animals_backup_pre_standardization')
    
    # Get all animals
    animals = get_all_animals()
    
    # Process in batches
    batch_size = 1000
    for i in range(0, len(animals), batch_size):
        batch = animals[i:i + batch_size]
        
        # Apply standardization
        standardized_batch = batch_standardize_animals(batch)
        
        # Update database
        update_animals_batch(standardized_batch)
        
        print(f"Migrated {i + len(batch)} of {len(animals)} animals")
    
    # Verify migration
    verify_migration_quality()
    
    # Update indexes
    rebuild_indexes()
```

#### 3. Configuration Updates

```python
# Update scraper configurations
SCRAPER_CONFIG_UPDATES = {
    "standardization": {
        "enabled": True,
        "language_detection": True,
        "quality_tracking": True,
        "batch_size": 100
    },
    "quality_thresholds": {
        "minimum_score": 0.5,
        "warning_score": 0.7,
        "excellent_score": 0.85
    }
}
```

### Rollback Plan

```python
def rollback_standardization():
    """
    Rollback standardization changes if issues occur.
    
    Steps:
    1. Restore from backup
    2. Remove new columns
    3. Revert configuration changes
    """
    # Restore backup
    restore_table('animals_backup_pre_standardization', 'animals')
    
    # Remove new columns
    remove_standardization_columns()
    
    # Revert configuration
    revert_scraper_configurations()
    
    print("Rollback completed successfully")
```

## Best Practices

### 1. Data Quality Management

```python
# Implement quality gates
def quality_gate_check(animal_data: dict) -> bool:
    """
    Check if animal data meets quality standards.
    
    Returns:
        True if data meets minimum quality requirements
    """
    quality_score = calculate_quality_score(animal_data)
    
    # Minimum quality threshold
    if quality_score < 0.5:
        return False
    
    # Required field validation
    required_fields = ['name', 'breed', 'external_id']
    if not all(animal_data.get(field) for field in required_fields):
        return False
    
    # Consistency validation
    consistency_check = validate_consistency(animal_data)
    if not consistency_check['consistent']:
        return False
    
    return True
```

### 2. Monitoring and Alerting

```python
# Set up monitoring
def setup_standardization_monitoring():
    """
    Set up monitoring for standardization system.
    
    Monitors:
    - Processing success rates
    - Quality score distributions
    - Performance metrics
    - Error rates
    """
    # Quality monitoring
    @monitor_quality_score
    def track_quality_scores():
        scores = get_recent_quality_scores()
        avg_score = sum(scores) / len(scores) if scores else 0
        
        if avg_score < 0.7:
            alert("Quality score below threshold", {"average": avg_score})
    
    # Performance monitoring
    @monitor_processing_time
    def track_processing_performance():
        recent_times = get_recent_processing_times()
        avg_time = sum(recent_times) / len(recent_times) if recent_times else 0
        
        if avg_time > 60:  # 60 seconds threshold
            alert("Processing time exceeds threshold", {"average": avg_time})
```

### 3. Continuous Improvement

```python
def analyze_standardization_gaps():
    """
    Analyze gaps in standardization coverage.
    
    Identifies:
    - Common unmatched breeds
    - Unparsed age formats
    - Unstandardized size terms
    """
    # Breed analysis
    unknown_breeds = get_animals_with_unknown_breeds()
    breed_frequency = Counter(animal['breed'] for animal in unknown_breeds)
    
    print("Top unmatched breeds:")
    for breed, count in breed_frequency.most_common(10):
        print(f"  {breed}: {count} occurrences")
    
    # Age analysis
    unparsed_ages = get_animals_with_unparsed_ages()
    age_frequency = Counter(animal['age_text'] for animal in unparsed_ages)
    
    print("Top unparsed age formats:")
    for age, count in age_frequency.most_common(10):
        print(f"  {age}: {count} occurrences")
    
    # Size analysis
    unknown_sizes = get_animals_with_unknown_sizes()
    size_frequency = Counter(animal['size'] for animal in unknown_sizes)
    
    print("Top unmatched sizes:")
    for size, count in size_frequency.most_common(10):
        print(f"  {size}: {count} occurrences")
```

### 4. Testing and Validation

```python
# Comprehensive testing strategy
def create_standardization_test_suite():
    """
    Create comprehensive test suite for standardization.
    
    Includes:
    - Unit tests for each component
    - Integration tests for full pipeline
    - Performance tests for batch processing
    - Regression tests for known issues
    """
    test_cases = [
        # Breed standardization
        ("labrador mix", "Labrador Retriever Mix", "Mixed", "Large"),
        ("podenco", "Podenco", "Hound", "Medium"),
        ("german shepherd", "German Shepherd", "Herding", "Large"),
        
        # Age standardization
        ("2 years", "Young", 24, 36),
        ("Born 03/2021", "Adult", 36, 48),
        ("puppy", "Puppy", 2, 10),
        
        # Size standardization
        ("large", "Large"),
        ("medium", "Medium"),
        ("small", "Small"),
    ]
    
    return generate_test_suite(test_cases)
```

---

This comprehensive documentation provides a complete technical reference for the Rescue Dog Aggregator's data standardization system. It covers all aspects from basic usage to advanced features, performance optimization, and troubleshooting. The system is designed to be robust, scalable, and maintainable while providing high-quality standardized data for the rescue dog platform.

For specific implementation details or advanced customizations, refer to the source code in `utils/standardization.py` and related test files.