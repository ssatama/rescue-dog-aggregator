# Organization Configuration Files

This directory contains YAML configuration files for rescue organizations integrated into the platform.

## File Structure

## Configuration Format

Each organization is defined by a YAML file following the JSON schema in `schemas/organization.schema.json`.

### Required Fields

- `schema_version`: Version of the config format (currently "1.0")
- `id`: Unique identifier (kebab-case, 2-50 characters)
- `name`: Human-readable organization name
- `enabled`: Boolean flag to enable/disable the scraper
- `scraper.class_name`: Python class name (PascalCase)
- `scraper.module`: Python module path relative to `scrapers/`
- `metadata.website_url`: Organization's main website

### Optional Fields

- `scraper.config`: Scraper-specific settings (rate limits, timeouts, etc.)
- `metadata.social_media`: Social media URLs
- `metadata.location`: Primary location (country, region, city)
- `metadata.service_regions`: Geographic regions served
- `metadata.contact`: Contact information
- `metadata.description`: Organization description


## Adding a New Organization
 - Create a new YAML file in configs/organizations/
 - Use kebab-case for the filename: organization-name.yaml
 - Follow the schema defined in schemas/organization.schema.json
 - Ensure the id field matches the filename (without extension)
 - Set enabled: false initially for testing
 - Create the corresponding scraper class in scrapers
 - Test the configuration before enabling
## Validation
 - Configurations are automatically validated against the JSON schema when loaded. Common validation errors:
 - Invalid ID format: Must be kebab-case, 2-50 characters
 - Missing required fields: All required fields must be present
 - Invalid URLs: Must be properly formatted URLs
 - Invalid country codes: Must be ISO 3166-1 alpha-2 codes (e.g., "US", "TR", "DE")
 - Country Codes
 - Use ISO 3166-1 alpha-2 country codes
 - See ISO 3166-1 alpha-2 for complete list.
