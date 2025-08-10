# SCRAPERS - Rescue Dog Aggregator

## Mission

Build robust, efficient scrapers for rescue organizations using modern patterns. Focus: reliability, data quality, respectful scraping.

## Architecture Overview

### Modern BaseScraper (Post-Refactoring)

**Modern design patterns implemented:**

- **Null Object Pattern**: Services default to null objects (no conditional checks)
- **Context Manager**: Use `with scraper:` for automatic connection handling  
- **Template Method**: `run()` decomposed into focused phases
- **Dependency Injection**: Clean service injection at constructor level

### Example Usage

```python
# Modern pattern with context manager
with MyScraper(config_id="org-name") as scraper:
    result = scraper.run()  # Automatic connection management

# Service injection for testing/customization
scraper = MyScraper(
    config_id="org-name",
    metrics_collector=CustomMetricsCollector(),
    session_manager=CustomSessionManager()
)
```

## Core Scraper Rules

### 1. Configuration-Driven Architecture

**ALWAYS use YAML configs** - never hardcode URLs or settings:

```yaml
# configs/organizations/org-name.yaml
schema_version: "1.0"
id: "org-name"
name: "Organization Name"
scraper:
  class_name: "OrgNameScraper"
  module: "scrapers.org_name.org_scraper"
  config:
    rate_limit_delay: 2.5
    max_retries: 3
    timeout: 240
```

### 2. Template Method Implementation

**MANDATORY**: Inherit from BaseScraper and implement `collect_data()`:

```python
class OrgScraper(BaseScraper):
    def collect_data(self) -> List[Dict[str, Any]]:
        """Extract and return all animal data."""
        # Your scraping logic here
        return animals_list
```

### 3. Service Injection Pattern

**Constructor must accept optional services**:

```python
def __init__(self, config_id: str, metrics_collector=None, 
             session_manager=None, database_service=None):
    super().__init__(
        config_id=config_id,
        metrics_collector=metrics_collector,
        session_manager=session_manager, 
        database_service=database_service,
    )
```

## Data Quality Standards

### Zero NULLs Compliance

**Required fields must have defaults**:

```python
# Good - always provide defaults
animal_data = {
    "name": name or "Unknown",
    "breed": breed or "Mixed Breed", 
    "size": size or "Medium",
    "animal_type": "dog",
    "status": "available"
}

# Bad - NULL values cause database errors
animal_data = {
    "name": name,  # Could be None
    "breed": None,  # Will fail validation
}
```

### Standardization Integration

**ALWAYS use standardization utilities**:

```python
from utils.standardization import (
    standardize_age, 
    normalize_breed_case,
    apply_standardization
)

# Age processing
age_info = standardize_age(raw_age_text)
if age_info.get("age_min_months") is not None:
    properties["age_min_months"] = age_info["age_min_months"]

# Breed normalization  
properties["breed"] = normalize_breed_case(raw_breed)
```

## Best Practices

### 1. Respectful Scraping

```python
# Rate limiting - adjust per site
time.sleep(3)  # For slow sites
time.sleep(0.5)  # For faster sites

# Proper headers
headers = {
    "User-Agent": "Mozilla/5.0 (compatible; RescueDogAggregator/1.0)",
    "X-Requested-With": "XMLHttpRequest"  # For AJAX requests
}
```

### 2. Error Handling Strategy

```python
def collect_data(self) -> List[Dict[str, Any]]:
    all_data = []
    try:
        # Main scraping logic
        animals = self.get_animal_list()
        for animal in animals:
            try:
                # Individual processing - continue on failure
                detail_data = self._scrape_details(animal["url"]) 
                if detail_data:
                    animal.update(detail_data)
                all_data.append(animal)
            except Exception as e:
                self.logger.error(f"Failed to process {animal.get('name', 'unknown')}: {e}")
                continue  # Don't let one failure stop the whole scrape
    except Exception as e:
        self.logger.error(f"Critical error in collect_data: {e}")
    
    return all_data
```

### 3. Efficient Data Collection

**Prefer bulk endpoints over pagination when available**:

```python
# Good - Single AJAX request for all data
def get_animal_list(self) -> List[Dict[str, Any]]:
    response = requests.post(
        ajax_endpoint,
        data={"filter": "available", "limit": "all"}
    )
    
# Avoid - Multiple page requests when bulk is available  
def get_animal_list_paginated(self):
    for page in range(1, max_pages):
        # Multiple requests - slower and more resource intensive
```

### 4. Image Processing Integration

```python
# Add image_urls field for BaseScraper R2 integration
result = {
    "name": dog_name,
    "primary_image_url": main_image,
    "image_urls": [main_image, gallery_image1, gallery_image2]  # For upload
}
```

## Reference Implementation

**Study `scrapers/santerpawsbulgarianrescue/`** as the gold standard:

### Key Features:
- ✅ AJAX endpoint usage (O(1) vs O(n) requests)
- ✅ Comprehensive error handling
- ✅ Service injection pattern
- ✅ Configuration-driven setup
- ✅ Respectful rate limiting (3s delays)
- ✅ Robust data extraction with defaults
- ✅ Standardization integration
- ✅ Template method compliance
- ✅ Zero NULLs compliance

### Architecture Flow:
```
BaseScraper.run() 
  → collect_data() 
    → get_animal_list() [AJAX bulk fetch]
    → _scrape_animal_details() [Individual enrichment]
      → _extract_properties()
      → _extract_description() 
      → _extract_hero_image()
    → Apply standardization
    → Return enriched data
```

## Common Anti-Patterns

### ❌ NEVER DO

```python
# Hardcoded URLs
self.base_url = "https://hardcoded.com"  # Use config instead

# Missing error handling  
animals = self.get_animals()  # What if this fails?

# NULL values in required fields
return {"name": None}  # Will cause database errors

# Ignoring rate limits
for animal in animals:
    self.scrape_details(animal.url)  # Too aggressive

# Not using standardization
animal["breed"] = raw_breed  # Should use normalize_breed_case()
```

### ✅ ALWAYS DO

```python
# Config-driven URLs
self.base_url = self.org_config.metadata.website_url

# Comprehensive error handling
try:
    animals = self.get_animals()
except Exception as e:
    self.logger.error(f"Failed to get animals: {e}")
    return []

# Default values for required fields
return {"name": name or "Unknown"}

# Respectful rate limiting
time.sleep(self.rate_limit_delay)

# Use standardization utilities
animal["breed"] = normalize_breed_case(raw_breed)
```

## Testing Strategy

### TDD for Scrapers

```bash
# 1. Write test first
pytest tests/scrapers/test_my_scraper.py::test_collect_data_basic -v

# 2. See it fail
# 3. Write minimal implementation 
# 4. See it pass
# 5. Refactor
```

### Test Categories

1. **Unit Tests**: Individual method testing
2. **Integration Tests**: Full scrape simulation with mocked responses
3. **Validation Scripts**: Real-world data validation
4. **Performance Tests**: Rate limiting and error handling

## Development Workflow

### 1. RESEARCH Phase
- Study organization's website structure
- Identify AJAX endpoints vs pagination
- Analyze data fields and formats
- Check rate limiting requirements

### 2. PLAN Phase  
- Create YAML config
- Design scraper class structure
- Plan data extraction strategy
- Identify standardization needs

### 3. EXECUTE Phase
- Implement with TDD
- Follow template method pattern
- Add comprehensive error handling
- Integrate standardization
- Test with real data

## Quality Gates

**All scrapers must pass**:
- ✅ Configuration validation
- ✅ Template method compliance  
- ✅ Error handling robustness
- ✅ Zero NULLs compliance
- ✅ Standardization integration
- ✅ Rate limiting respect
- ✅ Service injection support

**Remember**: Scrapers are the foundation of data quality. Poor scraping = poor user experience.