# Organization configuration

YAML configuration for each rescue organization on the platform. 13 organizations
are configured; `configs/llm_organizations.yaml` separately controls which 12 of
them get LLM enrichment.

Files are validated against `schemas/organization.schema.json` when loaded by
`utils/config_loader.py`.

## Format

```yaml
schema_version: "1.0"
id: "animalrescuebosnia"          # kebab-case, must match the filename
name: "Animal Rescue Bosnia"
enabled: true                      # false disables the scraper
scraper:
  class_name: "AnimalRescueBosniaScraper"
  module: "scrapers.animalrescuebosnia.animalrescuebosnia_scraper"
  config:                          # optional, scraper-specific
    rate_limit_delay: 2.5
    max_retries: 3
    timeout: 240
    batch_size: 6
    skip_existing_animals: true
    enable_llm_profiling: true
    llm_organization_id: 15        # links to configs/llm_organizations.yaml
metadata:
  website_url: "https://www.animal-rescue-bosnia.org/"
  description: |
    Free text, shown on the organization page.
  location:
    country: "BA"                  # ISO 3166-1 alpha-2
    city: "Goražde"
  service_regions: ["BA"]          # where dogs are rescued from
  ships_to: ["UK", "AT", "DE"]     # where dogs can be adopted to
  social_media:
    facebook: "https://..."
```

**Required:** `schema_version`, `id`, `name`, `enabled`, `scraper.class_name`,
`scraper.module`, `metadata.website_url`.

## Adding an organization

1. Create `configs/organizations/<id>.yaml` with `enabled: false`.
2. Build the scraper class under `scrapers/<id>/` - see `scrapers/README.md`.
3. Sync and verify:
   ```bash
   uv run python management/config_commands.py list
   uv run python management/config_commands.py sync
   ```
4. Flip `enabled: true` once a test run looks right.

To enable LLM enrichment, add an entry to `configs/llm_organizations.yaml` with a
prompt template in `prompts/organizations/`, and set `llm_organization_id` in the
scraper config to match.

## Common validation errors

- **Invalid id** - must be kebab-case, 2-50 characters, and match the filename
- **Missing required field** - see the list above
- **Invalid country code** - must be ISO 3166-1 alpha-2 (`US`, `DE`, `BA`)
- **Malformed URL** - `website_url` and social media links must be absolute URLs
