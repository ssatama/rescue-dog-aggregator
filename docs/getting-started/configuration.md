# Configuration System Guide

## Overview

The Rescue Dog Aggregator uses a YAML-based configuration system to manage rescue organizations. This approach provides flexibility, maintainability, and ease of deployment with automatic service region management.

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
  service_regions:              # Geographic service areas (NEW!)
    - country: "US"             # Structured format
      regions: ["CA", "NV", "OR"]
    - "EU: Germany"             # Flat format: "Country: Region"
    - "EU: Netherlands"
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
python management/config_commands.py list

# List only enabled organizations
python management/config_commands.py list --enabled-only
```

### Organization Details

```bash
# Show detailed information for specific org (including service regions)
python management/config_commands.py show <org-id>

# Example:
python management/config_commands.py show pets-in-turkey
```

### Configuration Validation

```bash
# Validate all config files
python management/config_commands.py validate
```

### Database Synchronization

**⚠️ Important**: This command now automatically syncs service regions!

```bash
# Sync all organizations to database (includes service regions)
python management/config_commands.py sync

# Dry run (show what would be changed)
python management/config_commands.py sync --dry-run
```

### Scraper Management

```bash
# Run specific scraper
python management/config_commands.py run <org-id>

# Run all enabled scrapers
python management/config_commands.py run-all
```

## Service Regions Feature

### What are Service Regions?

Service regions define the geographic areas where an organization operates or accepts animals from. This enables location-based filtering in the API and frontend.

### Configuration Formats

**Structured Format** (Recommended):
```yaml
service_regions:
  - country: "US"
    regions: ["CA", "NV", "OR", "WA"]
  - country: "Canada" 
    regions: ["BC", "AB"]
```

**Flat Format** (Simple):
```yaml
service_regions:
  - "US: California"
  - "US: Nevada"
  - "EU: Germany"
```

**Country Only**:
```yaml
service_regions:
  - country: "Turkey"  # All regions in Turkey
```

### API Endpoints for Location Filtering

After syncing organizations, these endpoints become available:

```bash
# Get all countries with available animals
curl "http://localhost:8000/api/animals/meta/available_countries"

# Get regions for a specific country
curl "http://localhost:8000/api/animals/meta/available_regions?country=US"

# Filter animals by location
curl "http://localhost:8000/api/animals?country=US&region=CA"
```

## Configuration Best Practices

### 1. Naming Conventions

- **Config ID**: Use lowercase, hyphen-separated (e.g., `pets-in-turkey`)
- **File names**: Match the config ID (e.g., `pets-in-turkey.yaml`)
- **Class names**: Use PascalCase (e.g., `PetsInTurkeyScraper`)

### 2. Service Regions

- Use ISO country codes when possible (US, CA, TR, DE, etc.)
- For regions, use standard abbreviations (state codes, province codes)
- Be consistent within your system
- Test location filtering after adding regions

### 3. Rate Limiting

- Set appropriate `rate_limit_delay` to respect target websites
- Start with 2-3 seconds and adjust based on website response
- Monitor for 429 (Too Many Requests) errors

### 4. Error Handling

- Set reasonable `max_retries` (3-5 attempts)
- Use appropriate `timeout` values (30-60 seconds)
- Test with various network conditions

### 5. Metadata Completeness

- Always include `website_url` and `description`
- Provide accurate location information
- Add social media links when available
- Define service regions for location-based features

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
  service_regions:
    - country: "US"
      regions: ["CA", "NV"]
  contact:
    email: "info@neworg.com"
```

### Step 3: Validate Configuration

```bash
python management/config_commands.py validate
```

### Step 4: Sync to Database

```bash
# This will create the organization AND sync service regions
python management/config_commands.py sync
```

### Step 5: Implement Scraper

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

### Step 6: Test and Deploy

```bash
# Test scraper
python management/config_commands.py run new-org

# Validate results
python management/config_commands.py show new-org

# Test location filtering
curl "http://localhost:8000/api/animals?country=US&region=CA"
```

## Troubleshooting

### Common Issues

**Config Validation Errors**
- Check YAML syntax with online validators
- Ensure all required fields are present
- Verify field types match schema

**Service Regions Not Appearing**
- Run `python management/config_commands.py sync` to populate regions
- Check that service_regions are defined in your config
- Verify database connection

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
# Check sync status (includes service regions coverage)
python management/config_commands.py sync --dry-run

# Show specific organization (includes service regions)
python management/config_commands.py show pets-in-turkey

# Check config loading
python -c "
from utils.config_loader import ConfigLoader
loader = ConfigLoader()
config = loader.load_config('pets-in-turkey')
print('Service regions:', config.metadata.service_regions)
"

# Test API endpoints
curl "http://localhost:8000/api/animals/meta/available_countries"
```

### Service Regions Debugging

```bash
# Check service regions in database
psql -d rescue_dogs -c "
SELECT o.name, sr.country, sr.region 
FROM organizations o 
JOIN service_regions sr ON o.id = sr.organization_id 
ORDER BY o.name, sr.country, sr.region;
"

# Count service regions coverage
python management/config_commands.py sync --dry-run
# Look for "Service Regions Status" section
```

## Migration Guide

### Existing Organizations

If you have existing organizations without service regions:

1. **Add service regions to configs**:
   ```yaml
   # Add to existing config files
   metadata:
     # ... existing metadata ...
     service_regions:
       - country: "US"
         regions: ["CA", "NV"]
   ```

2. **Sync to database**:
   ```bash
   python management/config_commands.py sync
   ```

3. **Verify sync**:
   ```bash
   python management/config_commands.py show your-org-id
   ```

The system will automatically populate the `service_regions` table and enable location-based filtering for all organizations.

## Next Steps

After setting up your configuration:

1. **Test Your Scraper**: Follow [Development Workflow - Adding New Tests](../development/workflow.md) to add tests for your scraper
2. **Troubleshooting**: If issues arise, see [Troubleshooting Guide](../operations/troubleshooting.md)  
3. **API Integration**: Use [API Reference - Organizations Endpoints](../api/reference.md#organizations-api) for frontend integration
4. **Production Deployment**: See [Weekly Scraping Guide](../operations/weekly-scraping.md) for scheduling