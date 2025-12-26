# Scraper Architecture Documentation

## Overview

The scraper system follows a **Template Method Pattern** with a base class (`BaseScraper`) providing common functionality and organization-specific scrapers implementing extraction logic for each rescue organization's website.

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
```

## BaseScraper (`scrapers/base_scraper.py`)

### Purpose
Provides common scraping infrastructure, configuration loading, error handling, rate limiting, and data standardization for all organization scrapers.

### Key Design Patterns

| Pattern | Implementation |
|---------|----------------|
| **Template Method** | `run()` orchestrates scraping phases, subclasses override `collect_data()` |
| **Context Manager** | `__enter__`/`__exit__` for automatic resource cleanup |
| **Null Object** | Default services prevent null checks throughout code |
| **Dependency Injection** | Services passed via constructor for testability |

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

| Property | Type | Source | Description |
|----------|------|--------|-------------|
| `organization_id` | `int` | YAML/DB | Database organization ID |
| `organization_name` | `str` | YAML | Display name |
| `base_url` | `str` | YAML | Website base URL |
| `rate_limit_delay` | `float` | YAML | Seconds between requests (default: 1.0) |
| `batch_size` | `int` | YAML | Animals per batch (default: 10) |
| `timeout` | `int` | YAML | HTTP timeout seconds (default: 30) |
| `max_retries` | `int` | YAML | Retry attempts (default: 3) |
| `skip_existing_animals` | `bool` | YAML | Filter already-scraped animals |

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

### Common Implementation Pattern

All scrapers follow this structure:

```python
class OrganizationScraper(BaseScraper):
    def __init__(self, config_id: str = "org-id", ...):
        super().__init__(config_id=config_id, ...)
        self.base_url = "https://example.org"
        self.listing_url = f"{self.base_url}/dogs"

    def collect_data(self) -> List[Dict[str, Any]]:
        # 1. Get filtered animal list
        animals = self._get_filtered_animals()

        # 2. Process in batches
        return self._process_animals_in_batches(animals)

    def _get_filtered_animals(self) -> List[Dict]:
        # Get listing page(s)
        # Extract basic animal info
        # Apply skip_existing_animals filter
        pass

    def scrape_animal_details(self, url: str) -> Dict[str, Any]:
        # Fetch detail page
        # Extract all fields
        # Call self.process_animal() for standardization
        pass
```

---

### 1. Dogs Trust (`scrapers/dogstrust/dogstrust_scraper.py`)

**Organization:** Dogs Trust UK - Large UK charity with JavaScript-rendered listings.

**Scraping Strategy:** Hybrid Selenium + HTTP

| Phase | Technology | Reason |
|-------|------------|--------|
| Listing pages | Selenium | JavaScript-rendered, pagination |
| Detail pages | HTTP/requests | Static HTML, faster |

**Key Methods:**

```python
def get_animal_list(self, max_pages_to_scrape: int = None) -> List[Dict]:
    """
    Uses Selenium to:
    1. Navigate to listing page
    2. Accept cookies
    3. Apply "Hide reserved dogs" filter
    4. Scroll to trigger lazy loading
    5. Click through pagination (detected from "X of Y")
    6. Extract dog cards from each page
    """

def _scrape_animal_details_http(self, adoption_url: str) -> Dict:
    """
    HTTP request with retry logic to extract:
    - Name (h1)
    - Breed, Age, Sex, Size (filter links)
    - Location (center filter)
    - Description (two-part: "Are you right for..." + "Is X right for you...")
    - Behavioral traits (good_with_children/dogs/cats)
    - Primary image
    """
```

**Special Features:**
- `_extract_behavioral_traits()` - Parses "Can live with" section
- `_normalize_text()` - Handles smart quotes from Windows encoding
- Parallel processing with ThreadPoolExecutor

**External ID Pattern:** `3592421` (numeric from URL)

---

### 2. REAN (`scrapers/rean/dogs_scraper.py`)

**Organization:** Rescuing European Animals in Need - Romania/UK rescue.

**Scraping Strategy:** Multi-page Selenium with unified image association

| Phase | Technology | Reason |
|-------|------------|--------|
| Both pages | Selenium | wsimg.com CDN lazy-loads images |

**Key Methods:**

```python
def scrape_animals(self) -> List[Dict]:
    """
    Scrapes two pages:
    - /dogs-%26-puppies-in-romania
    - /dogs-in-foster-in-the-uk
    """

def extract_dogs_with_images_unified(self, url: str, page_type: str) -> List[Dict]:
    """
    Unified DOM approach to maintain image-to-dog association:
    1. Find dog containers
    2. Extract text + image from same container
    3. Prevents "off by one" image misassociation
    """

def extract_dog_data(self, entry_text: str, page_type: str) -> Dict:
    """
    Regex-based extraction from unstructured text:
    - Name: "Our Lucky is..." patterns
    - Age: "X months/years old"
    - Weight: "X kg"
    - Medical: "spayed, vaccinated and chipped"
    - Urgency: keywords like "desperately", "urgent"
    """
```

**Special Features:**
- `_clean_wsimg_url()` - Removes CDN transformation parameters for R2
- `_detect_image_offset()` - Corrects for header images
- `extract_description_for_about_section()` - Cleans contact info from descriptions

**External ID Pattern:** `rean-romania-lucky-abc123` (hashed)

---

### 3. Galgos del Sol (`scrapers/galgosdelsol/galgosdelsol_scraper.py`)

**Organization:** Spanish Galgo/Podenco rescue.

**Scraping Strategy:** Pure HTTP with detail page scraping

| Phase | Technology | Reason |
|-------|------------|--------|
| All pages | HTTP/requests | Static WordPress site |

**Key Methods:**

```python
def __init__(self, ...):
    self.listing_urls = [
        ".../adoptables/galgos/",
        ".../adoptables/podencos/",
        ".../adoptables/pups-teens/",
        ".../adoptables/other-dogs/",
    ]

def _scrape_listing_page(self, url: str) -> List[Dict]:
    """
    Finds <a> tags with /adoptable-dogs/ in href.
    Filters out "Reserved" names.
    """

def scrape_animal_details(self, url: str) -> Dict:
    """
    Extracts:
    - Name (h2, cleaned of location data like "/ FINLAND")
    - Breed (strong>Breed: pattern)
    - Age from date_of_birth calculation
    - Description (longest paragraph)
    - Hero image (figure > img)
    """
```

**Special Features:**
- `_clean_dog_name()` - Removes location suffixes ("/ FINLAND", "IN UK")
- `_clean_breed()` - Converts age categories to "Mixed Breed"
- `_calculate_age_from_birth_date()` - Date parsing with multiple formats
- `_clean_image_url()` - Security validation blocking dangerous protocols

**External ID Pattern:** `gds-apollo` (slug-based)

---

### 4. Woof Project (`scrapers/woof_project/dogs_scraper.py`)

**Organization:** EU rescue aggregator (Cyprus, etc.)

**Scraping Strategy:** Hybrid Selenium + HTTP with robust DOM parsing

| Phase | Technology | Reason |
|-------|------------|--------|
| Listing | Selenium (preferred) | Elementor lazy loading |
| Detail | HTTP | Static content |

**Key Methods:**

```python
def get_animal_list(self) -> List[Dict]:
    """
    1. Auto-discover pagination URLs
    2. Fetch each page with browser automation
    3. Use robust container-first extraction
    """

def _extract_dogs_by_widget_containers(self, soup) -> List[Dict]:
    """
    Finds elementor-widget containers with both:
    - Adoption links
    - H2 dog names
    Filters ADOPTED/RESERVED by checking proximity to name.
    """

def scrape_animal_details(self, url: str) -> Dict:
    """
    Multi-pattern extraction:
    - Breed: Pattern matching + common breed keywords
    - Age: Multiple regex patterns ("X years old", "♡ NAME, 2 years")
    - Sex: Pronoun analysis from description
    - Size: Pattern matching + weight-based estimation
    """
```

**Special Features:**
- `_trigger_comprehensive_lazy_loading()` - Progressive scrolling
- `_is_dog_available_in_container()` - Proximity-based ADOPTED/RESERVED detection
- `_extract_filtered_description()` - 3-stage pipeline removing navigation/metadata
- `_score_image_priority()` - Weighted scoring for best dog photo

**External ID Pattern:** `wp-lisbon` (slug-based)

---

### 5. Many Tears Rescue (`scrapers/manytearsrescue/`)

**Organization:** Large UK rescue with high volume.

**Scraping Strategy:** Selenium for JavaScript-heavy site

**Key Features:**
- Parallel batch processing
- Image URL cleaning for R2
- Comprehensive behavioral trait extraction

---

### 6. Tierschutzverein Europa (`scrapers/tierschutzverein_europa/`)

**Organization:** German rescue with translation support.

**Files:**
- `dogs_scraper.py` - Main scraper
- `translations.py` - German→English field mappings

**Key Features:**
- German text handling
- Translation layer for breed/size terms
- `validate_data_quality.sql` - Quality checks

---

### 7. The Underdog (`scrapers/theunderdog/`)

**Organization:** UK rescue organization.

**Files:**
- `theunderdog_scraper.py` - Main scraper
- `normalizer.py` - Data normalization utilities

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
from scrapers.base_scraper import BaseScraper

class NewOrgScraper(BaseScraper):
    def __init__(self, config_id: str = "new-org", **kwargs):
        super().__init__(config_id=config_id, **kwargs)
        self.base_url = "https://neworg.example.com"
        self.listing_url = f"{self.base_url}/dogs"

    def collect_data(self) -> List[Dict[str, Any]]:
        animals = self._get_filtered_animals()
        return self._process_animals_in_batches(animals)

    def _get_filtered_animals(self) -> List[Dict[str, Any]]:
        # Get listing URLs
        all_urls = [...]

        # Apply filtering
        if self.skip_existing_animals:
            filtered_urls = self._filter_existing_urls(all_urls)
            skipped = len(all_urls) - len(filtered_urls)
            self.set_filtering_stats(len(all_urls), skipped)
            return [...]
        return [...]

    def _process_animals_in_batches(self, animals: List) -> List[Dict]:
        results = []
        for i in range(0, len(animals), self.batch_size):
            batch = animals[i:i + self.batch_size]
            for animal in batch:
                time.sleep(self.rate_limit_delay)
                detail = self.scrape_animal_details(animal["url"])
                if detail:
                    results.append(detail)
        return results

    def scrape_animal_details(self, url: str) -> Dict[str, Any]:
        # Fetch and parse
        response = requests.get(url, timeout=self.timeout)
        soup = BeautifulSoup(response.content, "html.parser")

        # Extract fields
        result = {
            "name": self._extract_name(soup),
            "external_id": self._generate_id(url),
            "adoption_url": url,
            "breed": self._extract_breed(soup),
            "age": self._extract_age(soup),
            "sex": self._extract_sex(soup),
            "size": self._extract_size(soup),
            "description": self._extract_description(soup),
            "primary_image_url": self._extract_image(soup),
            "animal_type": "dog",
            "status": "available",
            "properties": {...},
        }

        # Apply unified standardization
        return self.process_animal(result)
```

### Step 4: Write Tests (TDD)

```python
# tests/scrapers/test_new_org_scraper.py

def test_extract_name():
    scraper = NewOrgScraper(config_id="new-org")
    html = '<h1>Buddy</h1>'
    soup = BeautifulSoup(html, "html.parser")

    assert scraper._extract_name(soup) == "Buddy"

def test_skip_existing_animals():
    # Test filtering logic
    pass
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

## Technology Decision Matrix

| Site Characteristic | Recommended Technology |
|---------------------|----------------------|
| Static HTML | HTTP/requests |
| JavaScript-rendered listing | Selenium for listing, HTTP for details |
| Lazy-loaded images | Selenium with scroll triggers |
| Pagination via JS | Selenium with click navigation |
| Simple WordPress | HTTP/requests |
| Elementor-based | Selenium with comprehensive scrolling |

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

### Running Scrapers
```bash
# Single organization
python management/config_commands.py run <config-id>

# All organizations
python management/config_commands.py run --all

# Test mode (no DB writes)
python management/config_commands.py run <config-id> --test
```

---

## Appendix: Field Mappings

### Required Database Fields

| Field | Type | Source |
|-------|------|--------|
| `external_id` | `str` | Unique per org, from URL or hash |
| `name` | `str` | Page title or heading |
| `organization_id` | `int` | From config |
| `adoption_url` | `str` | Detail page URL |
| `animal_type` | `str` | Always "dog" |
| `status` | `str` | "available" unless reserved |

### Standardized Fields (via `process_animal()`)

| Raw Field | Standardized Field |
|-----------|-------------------|
| `age`, `age_text` | `age_min_months`, `age_max_months`, `age_category` |
| `size` | `standardized_size` |
| `breed` | `standardized_breed` |
| `sex` | `standardized_sex` |
| `name` | `slug` |

### Properties JSONB

Arbitrary organization-specific data stored in `properties` column:
- `description` - About text
- `medical_status` - Vaccination info
- `behavioral_traits` - good_with_children/dogs/cats
- `source_page` - Which listing page
- `raw_text` - Original content for debugging
