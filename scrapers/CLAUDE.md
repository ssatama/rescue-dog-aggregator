# Scraper Development Guide

## Modern BaseScraper Architecture

**BaseScraper has been refactored with modern design patterns:**

### 🏗️ **Null Object Pattern**
- Services default to null objects instead of None
- Eliminates conditional checks throughout the codebase
- `metrics_collector` automatically defaults to `NullMetricsCollector()`

### 🔄 **Context Manager Pattern**
- BaseScraper supports `with` statements for automatic resource management
- Database connections automatically opened/closed
- Exception-safe resource cleanup

### 📋 **Template Method Pattern**
- `run()` method decomposed into focused phases:
  - `_setup_scrape()` - Initialize logging and sessions
  - `_collect_and_time_data()` - Data collection with timing
  - `_process_animals_data()` - Database operations
  - `_finalize_scrape()` - Stale data detection
  - `_log_completion_metrics()` - Comprehensive metrics

### 💉 **Enhanced Dependency Injection**
- Clean service injection at constructor level
- Supports custom implementations for testing
- Backward compatible with legacy usage

## Development Workflow

1. Create YAML config in `configs/organizations/`
2. Write extraction tests with HTML fixtures / DOM structures
3. Implement scraper inheriting from BaseScraper (use modern patterns)
4. Test with real site (respecting rate limits)

## Implementation Patterns

### Modern Scraper Implementation

```python
from scrapers.base_scraper import BaseScraper
from services.metrics_collector import MetricsCollector

class MyOrganizationScraper(BaseScraper):
    """Modern scraper using new architectural patterns."""
    
    def collect_data(self):
        """Implement this abstract method - called by Template Method."""
        # Context manager handles connections automatically
        # Metrics collection is automatic via null object pattern
        # Focus only on data extraction logic
        return [self._extract_dog(card) for card in self._get_dog_cards()]
    
    def _get_dog_cards(self):
        """Extract dog card elements from the page."""
        # Implementation here
        pass
    
    def _extract_dog(self, element):
        """Extract individual dog data from DOM element."""
        return {
            'name': self._safe_extract(element, 'h3'),
            'age_text': self._safe_extract(element, '.age'),
            'external_id': self._generate_external_id(element)
        }
```

### Context Manager Usage

```python
# Recommended: Automatic resource management
with MyOrganizationScraper(config_id="my-org") as scraper:
    success = scraper.run()

# Legacy support: Manual connection handling
scraper = MyOrganizationScraper(config_id="my-org")
success = scraper.run()  # Still works, handles connections internally
```

### Service Injection for Testing

```python
# Custom metrics for testing/monitoring
custom_metrics = MetricsCollector(logger=my_logger)
scraper = MyOrganizationScraper(
    config_id="my-org",
    metrics_collector=custom_metrics,
    session_manager=mock_session_manager
)
```

### Data Extraction Patterns

```python
def _extract_dog(self, element):
    """Extract dog data using safe extraction patterns."""
    return {
        'name': self._safe_extract(element, 'h3'),
        'age_text': self._safe_extract(element, '.age'),
        'external_id': self._generate_external_id(element)
    }
```

### Required Fields

- name, organization_id, external_id (mandatory)
- age_text, age_min_months, age_max_months, sex, size (standardized values)
- image_urls[] (validated URLs only)

## Best Practices & Common Issues

### ✅ **Modern Best Practices**

- **Use Context Manager**: `with scraper:` for automatic resource management
- **Leverage Template Method**: Only implement `collect_data()`, let BaseScraper handle the rest
- **Service Injection**: Use dependency injection for testing and customization
- **Focus on Extraction**: Business logic handled by BaseScraper phases

### ⚠️ **Common Issues & Solutions**

- **Missing organization_id** → Use `self.organization_id` (automatically set)
- **Age formats** → Normalize to age_text, age_min_months, age_max_months using standardization utils
- **External IDs** → Must be unique and stable across scrapes
- **Rate limiting** → Use `self.respect_rate_limit()` between requests
- **Database connections** → Use context manager or let `run()` handle automatically
- **Metrics tracking** → Automatic via Null Object Pattern (no conditional checks needed)
- **Error handling** → Template Method handles failures gracefully
- **Resource cleanup** → Context manager ensures proper cleanup

## Testing Scrapers

```bash
# Validate config
python management/config_commands.py validate org-name

# Test extraction only
pytest tests/scrapers/test_org_name.py -v

# Full integration test
python management/config_commands.py run org-name --test
```
