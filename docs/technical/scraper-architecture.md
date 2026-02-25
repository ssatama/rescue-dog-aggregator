# Scraper Architecture Documentation

## Overview

The scraper system follows a **Template Method Pattern** with a base class (`BaseScraper`) providing common functionality and organization-specific scrapers implementing extraction logic for each rescue organization's website.

**Current Status:** 13 scrapers, 12 active organizations, 1,500+ active dogs.

## Architecture Diagram

```
                                    +------------------+
                                    |   BaseScraper    |
                                    | (Template Class) |
                                    +--------+---------+
                                             |
         +-----------------------------------+-----------------------------------+
         |           |           |           |           |           |           |
    +----+----+  +---+---+  +----+----+  +---+---+  +----+----+ +----+----+ +----+----+
    |DogsTrust| |  REAN  | | Galgos  | |  Woof  | | ManyTears| |Tierschutz| |TheUnder |
    | Scraper | |Scraper | |del Sol  | |Project | | Rescue   | |verein    | |  dog    |
    +---------+ +--------+ +---------+ +--------+ +----------+ +----------+ +---------+
         |           |           |           |           |           |
    +----+----+  +---+----+  +---+----+  +---+----+  +----+----+  +---+----+
    | Daisy   | |  MISIS  | | Furry  | |  Pets  | | Animal   | |Santerpaws|
    | Family  | | Rescue  | |Rescue  | |Turkey  | |Bosnia    | | Bulgarian|
    +---------+ +---------+ +--------+ +--------+ +----------+ +----------+
```

## Production Deployment

### Railway Cron Job

Scrapers run automatically on Railway as a cron service:

**Schedule:** Tue/Thu/Sat at 6am UTC

**Entry Point:** `management/railway_scraper_cron.py`

**Multi-Service Architecture:**

```bash
# start.sh routes based on SERVICE_TYPE env var
if [ "$SERVICE_TYPE" = "cron" ]; then
    exec python management/railway_scraper_cron.py
else
    exec uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8080}
fi
```

**Cron Job Features:**

- Graceful shutdown handling (SIGTERM/SIGINT)
- JSON summary output for monitoring
- Per-organization error isolation
- Sentry integration for error tracking
- Dry-run mode for testing

```bash
# Usage
python management/railway_scraper_cron.py           # Run all enabled
python management/railway_scraper_cron.py --org=misisrescue  # Single org
python management/railway_scraper_cron.py --dry-run # Preview
python management/railway_scraper_cron.py --list    # List scrapers
python management/railway_scraper_cron.py --json    # JSON output only
```

### Sentry Integration

Dedicated scraper error tracking via `scrapers/sentry_integration.py`:

```python
from scrapers.sentry_integration import (
    init_scraper_sentry,      # Initialize for scraper context
    capture_scraper_error,    # Capture with org context
    alert_zero_dogs_found,    # Warning when no dogs found
    alert_partial_failure,    # Warning when fewer dogs than expected
    scrape_transaction,       # Performance tracking context
    add_scrape_breadcrumb,    # Debug breadcrumbs
)
```

**Alert Types:**

| Alert                    | Trigger                          | Severity |
| ------------------------ | -------------------------------- | -------- |
| `zero_dogs_found`        | Scraper returns 0 dogs           | Warning  |
| `partial_failure`        | Dogs < 50% of historical average | Warning  |
| `llm_enrichment_failure` | LLM fails for multiple dogs      | Warning  |
| `scraper_error`          | Exception during scraping        | Error    |

---

## Browser Automation: Playwright Migration

### Overview

All browser-dependent scrapers have been migrated from **Selenium** to **Playwright** for Browserless v2 compatibility.

**Why Playwright?**

- Browserless v2 dropped Selenium/WebDriver support
- Only Playwright/Puppeteer work via CDP (Chrome DevTools Protocol)
- Better async support for production workloads
- Unified API across local and remote browsers

### PlaywrightBrowserService

**Location:** `services/playwright_browser_service.py`

```python
from services.playwright_browser_service import (
    PlaywrightBrowserService,
    PlaywrightOptions,
    PlaywrightResult,
    get_playwright_service,
)
```

**Environment Detection:**

| Environment Variable      | Value         | Behavior                       |
| ------------------------- | ------------- | ------------------------------ |
| `USE_PLAYWRIGHT`          | `true`        | Enables Playwright (required)  |
| `BROWSERLESS_WS_ENDPOINT` | WebSocket URL | Uses remote Browserless        |
| `BROWSERLESS_TOKEN`       | Auth token    | Authentication for Browserless |

**Configuration Options:**

```python
@dataclass
class PlaywrightOptions:
    headless: bool = True
    viewport_width: int = 1920
    viewport_height: int = 1080
    user_agent: Optional[str] = None
    random_user_agent: bool = True
    timeout: int = 60000
    stealth_mode: bool = False
    disable_images: bool = False
    wait_until: str = "domcontentloaded"  # networkidle, load, domcontentloaded
```

**Usage Pattern in Scrapers:**

```python
if os.environ.get("USE_PLAYWRIGHT", "false").lower() == "true":
    # Playwright path (Railway/production)
    playwright_service = get_playwright_service()
    options = PlaywrightOptions(headless=True, timeout=60000)

    async with playwright_service.get_browser(options) as browser_result:
        page = browser_result.page
        await page.goto(url, wait_until="networkidle")
        content = await page.content()
else:
    # Selenium fallback (local development)
    driver = webdriver.Chrome()
    driver.get(url)
    content = driver.page_source
```

### Browserless v2 Integration

**Production Configuration:**

```bash
BROWSERLESS_WS_ENDPOINT=wss://chrome.browserless.io
BROWSERLESS_TOKEN=<your-token>
USE_PLAYWRIGHT=true
```

**Connection Flow:**

1. Service checks for `BROWSERLESS_WS_ENDPOINT`
2. Builds WebSocket URL with token: `wss://host?token=xxx`
3. Connects via CDP: `playwright.chromium.connect_over_cdp(ws_url)`
4. Returns `PlaywrightResult` with browser, context, page

---

## BaseScraper (`scrapers/base_scraper.py`)

### Purpose

Provides common scraping infrastructure, configuration loading, error handling, rate limiting, and data standardization for all organization scrapers.

### Key Design Patterns

| Pattern                  | Implementation                                                             |
| ------------------------ | -------------------------------------------------------------------------- |
| **Template Method**      | `run()` orchestrates scraping phases, subclasses override `collect_data()` |
| **Context Manager**      | `__enter__`/`__exit__` for automatic resource cleanup                      |
| **Null Object**          | Default services prevent null checks throughout code                       |
| **Dependency Injection** | Services passed via constructor for testability                            |

### Constructor Parameters

```python
def __init__(
    self,
    config_id: str = None,           # YAML config identifier (preferred)
    organization_id: int = None,      # Legacy database ID (deprecated)
    metrics_collector=None,           # Performance tracking
    session_manager=None,             # Session state
    database_service=None,            # Database operations
):
```

### Core Configuration (Loaded from YAML)

| Property                | Type    | Source  | Description                             |
| ----------------------- | ------- | ------- | --------------------------------------- |
| `organization_id`       | `int`   | YAML/DB | Database organization ID                |
| `organization_name`     | `str`   | YAML    | Display name                            |
| `base_url`              | `str`   | YAML    | Website base URL                        |
| `rate_limit_delay`      | `float` | YAML    | Seconds between requests (default: 1.0) |
| `batch_size`            | `int`   | YAML    | Animals per batch (default: 10)         |
| `timeout`               | `int`   | YAML    | HTTP timeout seconds (default: 30)      |
| `max_retries`           | `int`   | YAML    | Retry attempts (default: 3)             |
| `skip_existing_animals` | `bool`  | YAML    | Filter already-scraped animals          |

### Main Entry Point: `run()`

Template method orchestrating the scraping pipeline:

```python
def run(self) -> Dict[str, Any]:
    """
    Pipeline phases:
    1. Initialize metrics tracking
    2. Call collect_data() - SUBCLASS IMPLEMENTS
    3. Process animals (standardization)
    4. Upload images to R2 storage
    5. Save to database
    6. Update stale data detection
    7. Return summary stats
    """
```

**Return Value:**

```python
{
    "animals_added": int,
    "animals_updated": int,
    "animals_unchanged": int,
    "images_uploaded": int,
    "images_failed": int,
    "total_processed": int,
    "errors": List[str],
}
```

### Abstract Method: `collect_data()`

**REQUIRED** - Each scraper must implement this method:

```python
def collect_data(self) -> List[Dict[str, Any]]:
    """
    Returns list of raw animal dictionaries.

    Required fields in each dict:
    - name: str
    - external_id: str (unique per organization)
    - adoption_url: str
    - animal_type: str ("dog")

    Optional but recommended:
    - breed: str
    - age_text: str (e.g., "2 years")
    - sex: str ("Male"/"Female"/"Unknown")
    - size: str ("Small"/"Medium"/"Large")
    - description: str
    - primary_image_url: str
    - properties: Dict[str, Any] (arbitrary metadata)
    """
```

### Unified Standardization: `process_animal()`

Normalizes raw scraped data to database schema:

```python
def process_animal(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transformations applied:
    - standardize_age() -> age_min_months, age_max_months, age_category
    - standardize_size() -> standardized_size
    - standardize_breed() -> standardized_breed
    - standardize_sex() -> standardized_sex
    - Generate slug from name
    - Set availability_confidence
    """
```

### Skip Existing Animals Filtering

Optimization to avoid re-scraping unchanged animals:

```python
def _filter_existing_urls(self, urls: List[str]) -> List[str]:
    """
    Queries database for existing animals by adoption_url.
    Returns only URLs that don't exist or need updating.
    """

def set_filtering_stats(self, total: int, skipped: int) -> None:
    """Track filtering for metrics and failure detection."""
```

### Image Processing Integration

```python
def _process_images(self, animals: List[Dict]) -> None:
    """
    For each animal with image_urls:
    1. Download from source
    2. Process (resize, optimize)
    3. Upload to Cloudflare R2
    4. Update animal with R2 URL
    5. Generate blur_data_url placeholder
    """
```

### Error Handling & Recovery

```python
def handle_scraper_failure(self, error: str) -> None:
    """Log failure, update metrics, mark org as stale."""

def update_stale_data_detection(self) -> None:
    """Track last successful scrape timestamp."""
```

---

## Organization-Specific Scrapers

### Active Organizations (12)

| Config ID                   | Country    | Technology | Notes                           |
| --------------------------- | ---------- | ---------- | ------------------------------- |
| `dogstrust`                 | UK/Ireland | Playwright | JavaScript-rendered, pagination |
| `manytearsrescue`           | UK         | Playwright | High volume, batch processing   |
| `rean`                      | Romania/UK | Playwright | Multi-page, lazy-loaded images  |
| `woof_project`              | UK         | Playwright | Elementor lazy loading          |
| `misis_rescue`              | Montenegro | Playwright | Pagination, scrolling           |
| `daisy_family_rescue`       | Greece     | Playwright | Two-phase scraping              |
| `tierschutzverein_europa`   | Germany    | HTTP       | Translation layer               |
| `theunderdog`               | Malta      | HTTP       | Standard WordPress              |
| `furryrescueitaly`          | Italy      | HTTP       | Standard HTML                   |
| `pets_in_turkey`            | Turkey     | HTTP       | Standard HTML                   |
| `animalrescuebosnia`        | Bosnia     | HTTP       | Standard HTML                   |
| `santerpawsbulgarianrescue` | Bulgaria   | HTTP       | Standard HTML                   |

**Inactive:** `galgosdelsol` (Spain) - scraper exists but organization disabled.

### Common Implementation Pattern

All scrapers follow this structure with Playwright/Selenium dual-mode support:

```python
import os
from scrapers.base_scraper import BaseScraper

if os.environ.get("USE_PLAYWRIGHT", "false").lower() == "true":
    from services.playwright_browser_service import PlaywrightOptions, get_playwright_service

class OrganizationScraper(BaseScraper):
    def __init__(self, config_id: str = "org-id", ...):
        super().__init__(config_id=config_id, ...)
        self.base_url = "https://example.org"
        self.listing_url = f"{self.base_url}/dogs"

    def collect_data(self) -> List[Dict[str, Any]]:
        if os.environ.get("USE_PLAYWRIGHT", "false").lower() == "true":
            return self._collect_with_playwright()
        return self._collect_with_selenium()

    async def _collect_with_playwright(self) -> List[Dict[str, Any]]:
        playwright_service = get_playwright_service()
        options = PlaywrightOptions(headless=True, timeout=60000)

        async with playwright_service.get_browser(options) as browser_result:
            page = browser_result.page
            await page.goto(self.listing_url, wait_until="networkidle")
            # ... scraping logic
```

---

### 1. Dogs Trust (`scrapers/dogstrust/dogstrust_scraper.py`)

**Organization:** Dogs Trust UK - Large UK charity with JavaScript-rendered listings.

**Scraping Strategy:** Hybrid Playwright + HTTP

| Phase         | Technology | Reason                          |
| ------------- | ---------- | ------------------------------- |
| Listing pages | Playwright | JavaScript-rendered, pagination |
| Detail pages  | HTTP       | Static HTML, faster             |

**Key Methods:**

```python
def get_animal_list(self, max_pages_to_scrape: int = None) -> List[Dict]:
    """
    Uses Playwright to:
    1. Navigate to listing page
    2. Handle OneTrust cookie overlay
    3. Apply "Hide reserved dogs" filter
    4. Scroll to trigger lazy loading
    5. Click through pagination (detected from "X of Y")
    6. Extract dog cards from each page
    """
```

**Special Features:**

- OneTrust cookie consent overlay handling
- `_extract_behavioral_traits()` - Parses "Can live with" section
- `_normalize_text()` - Handles smart quotes from Windows encoding
- Parallel processing with ThreadPoolExecutor

**External ID Pattern:** `3592421` (numeric from URL)

---

### 2. REAN (`scrapers/rean/dogs_scraper.py`)

**Organization:** Rescuing European Animals in Need - Romania/UK rescue.

**Scraping Strategy:** Multi-page Playwright with scrolling for lazy-loaded images

| Phase      | Technology | Reason                          |
| ---------- | ---------- | ------------------------------- |
| Both pages | Playwright | wsimg.com CDN lazy-loads images |

**Key Methods:**

```python
def scrape_animals(self) -> List[Dict]:
    """
    Scrapes two pages with progressive scrolling:
    - /dogs-%26-puppies-in-romania
    - /dogs-in-foster-in-the-uk
    """
```

**Special Features:**

- Progressive scrolling for lazy-loaded images
- `_clean_wsimg_url()` - Removes CDN transformation parameters for R2
- `_detect_image_offset()` - Corrects for header images
- `extract_description_for_about_section()` - Cleans contact info from descriptions

**External ID Pattern:** `rean-romania-lucky-abc123` (hashed)

---

### 3. MISIS Rescue (`scrapers/misis_rescue/scraper.py`)

**Organization:** Montenegro rescue with paginated listings.

**Scraping Strategy:** Playwright with pagination and scrolling

| Phase   | Technology | Reason                  |
| ------- | ---------- | ----------------------- |
| Listing | Playwright | AJAX pagination         |
| Detail  | Playwright | Dynamic content loading |

**Key Features:**

- Multi-page navigation via AJAX pagination
- Progressive scrolling per page
- `networkidle` wait strategy for dynamic content
- Detail page scraping with Playwright

**Special Handling:**

```python
# Wait for network idle to ensure all content loaded
await page.goto(url, wait_until="networkidle", timeout=60000)

# Scroll to trigger lazy loading
await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
await page.wait_for_timeout(2000)
```

---

### 4. Woof Project (`scrapers/woof_project/dogs_scraper.py`)

**Organization:** EU rescue aggregator (Cyprus, etc.)

**Scraping Strategy:** Playwright for Elementor lazy loading

| Phase   | Technology | Reason                 |
| ------- | ---------- | ---------------------- |
| Listing | Playwright | Elementor lazy loading |
| Detail  | HTTP       | Static content         |

**Key Methods:**

```python
def _trigger_comprehensive_lazy_loading(self, page) -> None:
    """
    Progressive scrolling for Elementor:
    1. Scroll in increments
    2. Wait for images to load
    3. Check for new content
    """

def _extract_dogs_by_widget_containers(self, soup) -> List[Dict]:
    """
    Finds elementor-widget containers with both:
    - Adoption links
    - H2 dog names
    Filters ADOPTED/RESERVED by checking proximity to name.
    """
```

**Special Features:**

- `_is_dog_available_in_container()` - Proximity-based ADOPTED/RESERVED detection
- `_extract_filtered_description()` - 3-stage pipeline removing navigation/metadata
- `_score_image_priority()` - Weighted scoring for best dog photo

**External ID Pattern:** `wp-lisbon` (slug-based)

---

### 5. Many Tears Rescue (`scrapers/manytearsrescue/`)

**Organization:** Large UK rescue with high volume.

**Scraping Strategy:** Playwright for JavaScript-heavy site

| Phase   | Technology | Reason                |
| ------- | ---------- | --------------------- |
| Listing | Playwright | JavaScript pagination |
| Detail  | Playwright | Dynamic content       |

**Key Features:**

- Pagination handling with Playwright
- Parallel batch processing for detail pages
- Comprehensive behavioral trait extraction
- Image URL cleaning for R2

---

### 6. Daisy Family Rescue (`scrapers/daisy_family_rescue/`)

**Organization:** Greek rescue with two-phase scraping.

**Files:**

- `dogs_scraper.py` - Listing page scraper (Playwright)
- `dog_detail_scraper.py` - Detail page scraper (Playwright)

**Key Features:**

- Separated listing and detail scrapers
- Full Playwright for both phases
- Greek text handling

---

### 7. Tierschutzverein Europa (`scrapers/tierschutzverein_europa/`)

**Organization:** German rescue with translation support.

**Files:**

- `dogs_scraper.py` - Main scraper (HTTP)
- `translations.py` - German→English field mappings

**Key Features:**

- German text handling
- Translation layer for breed/size terms
- HTTP-only (no browser needed)

---

### 8. The Underdog (`scrapers/theunderdog/`)

**Organization:** Malta rescue organization.

**Files:**

- `theunderdog_scraper.py` - Main scraper (HTTP)
- `normalizer.py` - Data normalization utilities

---

### 9. Galgos del Sol (`scrapers/galgosdelsol/galgosdelsol_scraper.py`)

**Organization:** Spanish Galgo/Podenco rescue. **Currently inactive.**

**Scraping Strategy:** Pure HTTP with detail page scraping

**Special Features:**

- `_clean_dog_name()` - Removes location suffixes ("/ FINLAND", "IN UK")
- `_calculate_age_from_birth_date()` - Date parsing with multiple formats

---

## Secure Config Scraper Runner

**Location:** `utils/secure_config_scraper_runner.py`

Orchestrates batch scraper execution with safety features:

```python
from utils.secure_config_scraper_runner import (
    SecureConfigScraperRunner,
    ScraperRunResult,
    BatchRunResult,
    ScraperInfo,
)

runner = SecureConfigScraperRunner()

# List available scrapers
scrapers = runner.list_available_scrapers()

# Run single scraper
result = runner.run_scraper("dogstrust", sync_first=True)

# Run all enabled scrapers
batch_result = runner.run_all_enabled_scrapers()
```

**Features:**

- Config validation before execution
- Database sync before scraping
- Error isolation per organization
- Batch result aggregation

---

## Adding a New Scraper

### Step 1: Create Configuration

```yaml
# configs/organizations/new-org.yaml
organization:
  name: "New Organization"
  config_id: "new-org"

metadata:
  website_url: "https://neworg.example.com"
  country: "UK"

scraper:
  rate_limit_delay: 1.0
  batch_size: 10
  timeout: 30
  max_retries: 3
  skip_existing_animals: true
```

### Step 2: Create Scraper Package

```
scrapers/
└── new_org/
    ├── __init__.py
    └── new_org_scraper.py
```

### Step 3: Implement Scraper

```python
import os
from scrapers.base_scraper import BaseScraper

if os.environ.get("USE_PLAYWRIGHT", "false").lower() == "true":
    from services.playwright_browser_service import PlaywrightOptions, get_playwright_service

class NewOrgScraper(BaseScraper):
    def __init__(self, config_id: str = "new-org", **kwargs):
        super().__init__(config_id=config_id, **kwargs)
        self.base_url = "https://neworg.example.com"
        self.listing_url = f"{self.base_url}/dogs"

    def collect_data(self) -> List[Dict[str, Any]]:
        if os.environ.get("USE_PLAYWRIGHT", "false").lower() == "true":
            return self._collect_with_playwright()
        return self._collect_with_http()

    async def _collect_with_playwright(self) -> List[Dict[str, Any]]:
        playwright_service = get_playwright_service()
        options = PlaywrightOptions(
            headless=True,
            timeout=60000,
            wait_until="networkidle",
        )

        async with playwright_service.get_browser(options) as browser_result:
            page = browser_result.page
            await page.goto(self.listing_url, wait_until="networkidle")

            # Scroll for lazy loading
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await page.wait_for_timeout(2000)

            content = await page.content()
            return self._parse_listing(content)

    def _collect_with_http(self) -> List[Dict[str, Any]]:
        response = requests.get(self.listing_url, timeout=self.timeout)
        return self._parse_listing(response.text)
```

### Step 4: Write Tests (TDD)

```python
# tests/scrapers/test_new_org_scraper.py

def test_extract_name():
    scraper = NewOrgScraper(config_id="new-org")
    html = '<h1>Buddy</h1>'
    soup = BeautifulSoup(html, "html.parser")
    assert scraper._extract_name(soup) == "Buddy"

@pytest.mark.browser
def test_playwright_scraping():
    # Test with live site (marked as browser test)
    pass
```

---

## Technology Decision Matrix

| Site Characteristic         | Recommended Technology                   |
| --------------------------- | ---------------------------------------- |
| Static HTML                 | HTTP/requests                            |
| JavaScript-rendered listing | Playwright for listing, HTTP for details |
| Lazy-loaded images          | Playwright with scroll triggers          |
| Pagination via JS/AJAX      | Playwright with networkidle wait         |
| Simple WordPress            | HTTP/requests                            |
| Elementor-based             | Playwright with comprehensive scrolling  |
| Cookie consent overlays     | Playwright with overlay handling         |

---

## Environment Variables

### Required for Production (Railway)

```bash
# Database
DATABASE_URL=postgresql://user:pass@host/db
# or
RAILWAY_DATABASE_URL=postgresql://...

# Browser automation
USE_PLAYWRIGHT=true
BROWSERLESS_WS_ENDPOINT=wss://chrome.browserless.io
BROWSERLESS_TOKEN=<token>

# Monitoring
SENTRY_DSN_BACKEND=https://xxx@sentry.io/xxx
ENVIRONMENT=production

# Image storage
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=xxx
R2_ENDPOINT_URL=xxx

# LLM enrichment
OPENROUTER_API_KEY=xxx
```

### Local Development

```bash
# No browser service needed - uses local Chromium or Selenium
USE_PLAYWRIGHT=false  # or unset

# Local database
DATABASE_URL=postgresql://localhost/rescue_dogs
```

---

## Testing Scrapers

### Unit Tests

```bash
pytest tests/scrapers/test_<org>_scraper.py -v
```

### Integration Tests (with live sites)

```bash
pytest tests/scrapers/test_<org>_scraper.py -m browser -v
```

### Test Markers

```python
@pytest.mark.unit        # Pure logic, no IO
@pytest.mark.fast        # < 1 second
@pytest.mark.browser     # Playwright/Selenium required
@pytest.mark.external    # Hits live sites
@pytest.mark.slow        # > 5 seconds
```

### Running Scrapers

```bash
# Via Railway cron runner
python management/railway_scraper_cron.py --org=dogstrust

# Via config commands
python management/config_commands.py run <config-id>

# All organizations
python management/config_commands.py run --all

# Test mode (no DB writes)
python management/config_commands.py run <config-id> --test

# List available scrapers
python management/railway_scraper_cron.py --list
```

---

## Common Extraction Utilities

### Location: `utils/shared_extraction_patterns.py`

```python
def extract_age_from_text(text: str) -> Optional[float]:
    """Returns age in years."""

def extract_weight_from_text(text: str) -> Optional[float]:
    """Returns weight in kg."""
```

### Location: `utils/standardization.py`

```python
def standardize_age(age_text: str) -> Dict:
    """Returns {age_min_months, age_max_months, age_category}"""

def standardize_size(size: str) -> str:
    """Normalizes to Small/Medium/Large/Giant"""

def standardize_breed(breed: str) -> str:
    """Normalizes breed names"""
```

---

## Appendix: Field Mappings

### Required Database Fields

| Field             | Type  | Source                           |
| ----------------- | ----- | -------------------------------- |
| `external_id`     | `str` | Unique per org, from URL or hash |
| `name`            | `str` | Page title or heading            |
| `organization_id` | `int` | From config                      |
| `adoption_url`    | `str` | Detail page URL                  |
| `animal_type`     | `str` | Always "dog"                     |
| `status`          | `str` | "available" unless reserved      |

### Standardized Fields (via `process_animal()`)

| Raw Field         | Standardized Field                                 |
| ----------------- | -------------------------------------------------- |
| `age`, `age_text` | `age_min_months`, `age_max_months`, `age_category` |
| `size`            | `standardized_size`                                |
| `breed`           | `standardized_breed`                               |
| `sex`             | `standardized_sex`                                 |
| `name`            | `slug`                                             |

### Properties JSONB

Arbitrary organization-specific data stored in `properties` column:

- `description` - About text
- `medical_status` - Vaccination info
- `behavioral_traits` - good_with_children/dogs/cats
- `source_page` - Which listing page
- `raw_text` - Original content for debugging

---

**Last Updated:** 2026-02-25
**Current Scale:** 13 scrapers | 12 active organizations | 1,500+ active dogs
