# Scraper Development Guide

## Workflow

1. Create YAML config in `configs/organizations/`
2. Write extraction tests with HTML fixtures
3. Implement scraper inheriting from BaseScraper
4. Test with real site (respecting rate limits)

## Key Patterns

### Data Extraction

```python
def extract_dogs(self, soup):
    return [self._extract_dog(card) for card in soup.select('.dog-card')]

def _extract_dog(self, element):
    return {
        'name': self._safe_extract(element, 'h3'),
        'age': self._normalize_age(self._safe_extract(element, '.age')),
        'external_id': self._generate_external_id(element)
    }
```

### Required Fields

- name, organization_id, external_id (mandatory)
- age_years, sex, size (standardized values)
- image_urls[] (validated URLs only)

## Common Issues

- Missing organization_id → Use self.config.id
- Age formats → Normalize to years (float)
- External IDs → Must be unique and stable
- Rate limiting → Use self.respect_rate_limit()

## Testing Scrapers

```bash
# Validate config
python management/config_commands.py validate org-name

# Test extraction only
pytest tests/scrapers/test_org_name.py -v

# Full integration test
python management/config_commands.py run org-name --test
```
