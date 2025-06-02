# Configuration System Guide

## Overview

The Rescue Dog Aggregator uses a YAML-based configuration system to manage rescue organizations. This approach provides flexibility, maintainability, and ease of deployment.

## Configuration Structure

### Organization Config Files

Location: `configs/organizations/<org-id>.yaml`

```yaml
schema_version: "1.0"           # Config schema version
id: "unique-org-id"             # Unique identifier
name: "Organization Display Name" # Human-readable name
enabled: true                   # Whether to include in scraping

scraper:
  class_name: "OrgScraper"      # Python class name
  module: "scrapers.org_module" # Python module path
  config:                       # Scraper-specific settings
    rate_limit_delay: 2.0       # Delay between requests (seconds)
    max_retries: 3              # Maximum retry attempts
    timeout: 30                 # Request timeout (seconds)

metadata:
  website_url: "https://org.com" # Organization website
  description: "Description"     # About the organization
  location:
    country: "US"               # Country code
    state: "CA"                 # State/province (optional)
    city: "City Name"           # City name
  contact:
    email: "info@org.com"       # Contact email
    phone: "+1-555-0123"        # Phone (optional)
  social_media:                 # Social media links (all optional)
    facebook: "https://facebook.com/org"
    instagram: "https://instagram.com/org"
    twitter: "https://twitter.com/org"
```

## Management Commands

### Listing Organizations

```bash
# List all organizations
python manage.py list-organizations

# List only enabled organizations
python manage.py list-organizations --enabled-only

# Show detailed information for specific org
python manage.py show-organization <org-id>
```

### Configuration Validation

```bash
# Validate all config files
python manage.py validate-configs

# Validate specific organization
python manage.py validate-configs <org-id>
```

### Database Synchronization

```bash
# Sync all organizations to database
python manage.py sync-organizations

# Dry run (show what would be changed)
python manage.py sync-organizations --dry-run

# Sync specific organization
python manage.py sync-organizations <org-id>
```

### Scraper Management

```bash
# Run specific scraper
python manage.py run-scraper <org-id>

# Run all enabled scrapers
python manage.py run-all-scrapers

# List available scrapers
python manage.py list-scrapers
```

## Configuration Best Practices

### 1. Naming Conventions

- **Config ID**: Use lowercase, hyphen-separated (e.g., `pets-in-turkey`)
- **File names**: Match the config ID (e.g., `pets-in-turkey.yaml`)
- **Class names**: Use PascalCase (e.g., `PetsInTurkeyScraper`)

### 2. Rate Limiting

- Set appropriate `rate_limit_delay` to respect target websites
- Start with 2-3 seconds and adjust based on website response
- Monitor for 429 (Too Many Requests) errors

### 3. Error Handling

- Set reasonable `max_retries` (3-5 attempts)
- Use appropriate `timeout` values (30-60 seconds)
- Test with various network conditions

### 4. Metadata Completeness

- Always include `website_url` and `description`
- Provide accurate location information
- Add social media links when available

## Adding New Organizations

### Step 1: Create Configuration

```bash
# Create new config file
touch configs/organizations/new-org.yaml
```

### Step 2: Define Configuration

```yaml
schema_version: "1.0"
id: "new-org"
name: "New Rescue Organization" 
enabled: true
scraper:
  class_name: "NewOrgScraper"
  module: "scrapers.new_org"
  config:
    rate_limit_delay: 2.0
    max_retries: 3
    timeout: 30
metadata:
  website_url: "https://neworg.com"
  description: "New rescue organization"
  location:
    country: "US"
    city: "City Name"
  contact:
    email: "info@neworg.com"
```

### Step 3: Validate Configuration

```bash
python manage.py validate-configs new-org
```

### Step 4: Implement Scraper

```python
# scrapers/new_org/__init__.py
from .scraper import NewOrgScraper

# scrapers/new_org/scraper.py
from scrapers.base_scraper import BaseScraper

class NewOrgScraper(BaseScraper):
    def collect_data(self):
        """Implement data collection logic."""
        # Your scraping implementation here
        dogs_data = []
        return dogs_data
```

### Step 5: Test and Deploy

```bash
# Sync to database
python manage.py sync-organizations new-org

# Test scraper
python manage.py run-scraper new-org

# Validate results
python manage.py show-organization new-org
```

## Troubleshooting

### Common Issues

**Config Validation Errors**
- Check YAML syntax with online validators
- Ensure all required fields are present
- Verify field types match schema

**Scraper Import Errors**
- Check module path in config matches actual file structure
- Ensure class name matches exactly
- Verify Python module has proper `__init__.py` files

**Database Sync Issues**
- Check database connection
- Verify config file permissions
- Look for duplicate organization IDs

### Debugging Commands

```bash
# Check config loading
python -c "
from utils.config_loader import ConfigLoader
loader = ConfigLoader()
config = loader.load_config('org-id')
print(config)
"

# Test scraper import
python -c "
from utils.config_scraper_runner import ConfigScraperRunner
from utils.config_loader import ConfigLoader
runner = ConfigScraperRunner(ConfigLoader())
print(runner.list_available_scrapers())
"
```