# Scrapers

Configuration-driven web scrapers for rescue dog organizations.

## Architecture

### Modern Design Patterns (2025)

```python
# Context Manager Pattern - automatic resource cleanup
with MyScraper(config_id="org-name") as scraper:
    result = scraper.run()

# Dependency Injection - for testing and customization
scraper = MyScraper(
    config_id="org-name",
    metrics_collector=CustomMetricsCollector(),
    session_manager=CustomSessionManager()
)
```

### Base Scraper Features

- **Template Method Pattern**: Consistent scraping phases
- **Null Object Pattern**: No conditional service checks
- **Context Manager**: Automatic connection handling
- **Service Injection**: Clean dependency management
- **Error Recovery**: Automatic retries with backoff
- **Session Management**: Per-organization tracking

## Adding a New Scraper

### 1. Create Configuration

```yaml
# configs/organizations/new-org.yaml
organization:
  name: "New Organization"
  website: "https://example.org"
  
scraper:
  config:
    base_url: "https://example.org/dogs"
    detail_url_pattern: "https://example.org/dogs/{id}"
    
  selectors:
    list: ".dog-card"
    name: ".dog-name"
    age: ".dog-age"
    description: ".dog-description"
```

### 2. Implement Scraper

```python
# scrapers/new_org/new_org_scraper.py
from scrapers.base_scraper import BaseScraper

class NewOrgScraper(BaseScraper):
    def extract_dog_data(self, element):
        """Extract data from listing element."""
        return {
            'name': self.safe_extract(element, self.config['selectors']['name']),
            'age': self.safe_extract(element, self.config['selectors']['age']),
            # ... more fields
        }
```

### 3. Test First (TDD)

```python
# tests/scrapers/test_new_org_scraper.py
def test_extract_dog_data():
    scraper = NewOrgScraper(config_id="new-org")
    html = '<div class="dog-card">...</div>'
    
    result = scraper.extract_dog_data(html)
    
    assert result['name'] == "Expected Name"
    assert result['age'] == "2 years"
```

## Running Scrapers

```bash
# List all organizations
python management/config_commands.py list

# Run single scraper
python management/config_commands.py run new-org

# Run all scrapers
python management/config_commands.py run --all

# Test mode (no database writes)
python management/config_commands.py run new-org --test
```

## Data Standardization

The base scraper automatically standardizes:
- **Ages**: Converts to months (e.g., "2 years" → 24)
- **Sizes**: Maps to standard sizes (small/medium/large/giant)
- **Breeds**: Normalizes breed names
- **Locations**: Extracts country/region
- **Availability**: Tracks with confidence levels

## Quality Monitoring

```bash
# Check data quality
python monitoring/data_quality_monitor.py --org-id=26

# Monitor scraper health
tail -f logs/scraper.log
```

## Current Organizations (8)

1. Tierschutzverein Europa
2. Pets in Turkey
3. Galgos del Sol
4. Animal Rescue Bosnia
5. REAN UK
6. Santer Paws Bulgarian Rescue
7. Many Tears Animal Rescue
8. Dogs Trust

---

*For complete documentation, see [docs/](../docs/)*