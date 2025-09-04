# Unified Standardization API Documentation

## Overview

The Unified Standardization API provides a single, consistent interface for standardizing animal breed, age, and size data across all scrapers in the Rescue Dog Aggregator platform.

## Key Features

- **Breed Standardization**: Maps 500+ breed variations to standardized names
- **Critical Breed Fixes**: 
  - Lurcher → Hound group (fixes 53 dogs)
  - Staffordshire variations → Staffordshire Bull Terrier (fixes 25 dogs)
- **Designer Breed Support**: Tracks parent breeds for hybrids
- **Age Parsing**: Converts various age formats to months
- **Size Normalization**: Standardizes size categories with breed-based inference
- **Confidence Scoring**: Provides confidence levels for breed matches

## API Usage

### Basic Usage

```python
from utils.unified_standardization import UnifiedStandardizer

standardizer = UnifiedStandardizer()

# Standardize individual fields
result = standardizer.apply_full_standardization(
    breed="Lurcher",
    age="2 years",
    size="medium"
)
```

### In Scrapers via BaseScraper

All scrapers inheriting from `BaseScraper` automatically get standardization:

```python
class MyScraper(BaseScraper):
    def collect_data(self):
        # Return raw data - BaseScraper handles standardization
        return [{
            'breed': 'Staffy',  # Will be standardized to "Staffordshire Bull Terrier"
            'age': '3 years old',
            'size': 'Medium'
        }]
```

### Response Format

```python
{
    'breed': {
        'name': 'Lurcher',
        'group': 'Hound',  # Critical fix applied
        'confidence': 0.95,
        'is_mixed': False,
        'primary_breed': 'Lurcher',
        'secondary_breed': None,
        'breed_type': 'purebred'
    },
    'age': {
        'age_min_months': 24,
        'age_max_months': 24,
        'age_category': 'Adult',
        'original': '2 years'
    },
    'size': {
        'category': 'Medium',
        'weight_range': {'min': 25, 'max': 60},
        'source': 'provided'
    }
}
```

## Feature Flags

Control rollout using environment variables or configuration:

```python
from utils.feature_flags import is_scraper_standardization_enabled

# Check if standardization is enabled for a scraper
if is_scraper_standardization_enabled('rean'):
    # Use unified standardization
    pass
```

### Environment Variables

- `UNIFIED_STANDARDIZATION_ENABLED=true` - Enable globally
- `SCRAPER_REAN_UNIFIED_ENABLED=true` - Enable for specific scraper

## Critical Breed Fixes

### Lurcher Fix
- **Before**: breed_group = "Unknown"
- **After**: breed_group = "Hound"
- **Impact**: 53 dogs correctly categorized

### Staffordshire Standardization
Maps all variations to proper name:
- "Staffy" → "Staffordshire Bull Terrier"
- "Staffie" → "Staffordshire Bull Terrier"
- "Staff" → "Staffordshire Bull Terrier"
- "Staffordshire Terrier" → "Staffordshire Bull Terrier"

### Designer Breeds
Properly categorizes and tracks parent breeds:
- Labradoodle: Labrador Retriever × Poodle
- Cockapoo: Cocker Spaniel × Poodle
- Goldendoodle: Golden Retriever × Poodle
- And 5+ more designer breeds

## Migration Guide

### For Scrapers Without Standardization

1. Ensure scraper inherits from `BaseScraper`
2. Remove any custom standardization logic
3. Enable feature flag for testing
4. Validate data quality

### For Scrapers With Existing Standardization

1. Remove imports of `standardization.py` or `optimized_standardization.py`
2. Remove calls to standardization functions
3. Let `BaseScraper` handle standardization
4. Test with feature flag enabled

## Performance

- **LRU Caching**: Common breeds cached for fast lookups
- **Batch Processing**: Supports processing multiple animals efficiently
- **Memory Efficient**: ~2MB memory footprint with full breed database

## Testing

```bash
# Run standardization tests
pytest tests/utils/test_unified_standardization.py

# Run integration tests
pytest tests/integration/test_unified_simple.py

# Test with feature flags
export SCRAPER_REAN_UNIFIED_ENABLED=true
pytest tests/scrapers/test_rean_scraper.py
```

## Backwards Compatibility

The API maintains backwards compatibility with existing database schemas:
- All existing database fields are populated
- New fields (breed_confidence, primary_breed, etc.) are optional
- Gradual migration path via feature flags

## Support

For issues or questions about the Unified Standardization API:
- Check existing tests in `tests/utils/test_unified_standardization.py`
- Review implementation in `utils/unified_standardization.py`
- See migration examples in scraper implementations