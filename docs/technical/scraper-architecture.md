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

**Schedule:** Mon/Thu/Sat at 3pm UTC

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

Browser-dependent scrapers use **Playwright**, the only browser path since #566 removed Selenium.

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
playwright_service = get_playwright_service()
options = PlaywrightOptions(headless=True, timeout=60000)

async with playwright_service.get_browser(options) as browser_result:
    page = browser_result.page
    await page.goto(url, wait_until="networkidle")
    content = await page.content()
```

Tests patch the module's `get_playwright_service` with
`tests/fixtures/playwright_fakes.py`, which serves saved HTML from `page.content()`.

### Browserless v2 Integration

**Production Configuration:**

```bash
BROWSERLESS_WS_ENDPOINT=wss://chrome.browserless.io
BROWSERLESS_TOKEN=<your-token>
```

**Connection Flow:**

1. Service checks for `BROWSERLESS_WS_ENDPOINT`
2. Builds WebSocket URL with token: `wss://host?token=xxx`
3. Connects via CDP: `playwright.chromium.connect_over_cdp(ws_url)`
4. Returns `PlaywrightResult` with browser, context, page

---

## BaseScraper (`scrapers/base_scraper.py`)

### Purpose

Runs a scrape for one organization: setup, `collect_data()` (the subclass), the
save phase, stale detection and the run's report. Since #569 it is split by
concern into mixins, so each file reads on its own:

| Module                       | Class            | What it owns                                                                  |
| ---------------------------- | ---------------- | ----------------------------------------------------------------------------- |
| `scrapers/base_scraper.py`   | `BaseScraper`    | Construction, `attach()`, `run()` and its phases, filtering stats              |
| `scrapers/request_pacing.py` | `RequestPacing`  | robots.txt, one request clock, back-off, `fetch_details`, `get_listing_page`  |
| `scrapers/dog_saving.py`     | `DogSaving`      | Validate, upload images, standardise (`process_animal`), save, mark seen      |
| `scrapers/stale_detection.py`| `StaleDetection` | Mark listed dogs seen, stale detection (skipped on a partial failure), adoptions |
| `scrapers/run_reporting.py`  | `RunReporting`   | The `scrape_logs` row, cache invalidation, loss and partial-failure alerts     |
| `scrapers/scrape_stats.py`   | `ScrapeStats`    | One run's save counts                                                         |
| `scrapers/contract.py`       | `ScrapedDog`     | What `collect_data()` returns (#568)                                          |

### Construction and services

Construction does no I/O (#569). `ScraperClass(config_id=...)` loads the YAML
config and builds its helpers; `organization_id` stays `None`. The loader
(`utils/secure_scraper_loader.py`) then initialises the pool, syncs the
organization row and calls:

```python
scraper.attach(
    organization_id,
    database_service=...,
    session_manager=...,
    image_processing_service=...,
    metrics_collector=...,
)
```

which also binds the filtering service and LLM handler. Tests pass
`organization_id=` to the constructor, or call `attach()` with fakes.
`backfill plan` builds a scraper with no database at all.

The scraper's logger is `scraper.<org>.<type>` with no level or handler of its
own: the runner's apply. The scraper holds no database connection of its own: its own queries (image
dedup, adoption checks) borrow one through `DatabaseService.connection()`.
Some `DatabaseService` methods still use its direct connection beside the pool.

### Core Configuration (Loaded from YAML)

| Property                | Type    | Source  | Description                             |
| ----------------------- | ------- | ------- | --------------------------------------- |
| `organization_id`       | `int`   | DB      | Set by `attach()` after the org sync    |
| `organization_name`     | `str`   | YAML    | Display name                            |
| `rate_limit_delay`      | `float` | YAML    | Minimum seconds between request starts to the site (default: 1.0) |
| `batch_size`            | `int`   | YAML    | Animals per batch (default: 6)          |
| `timeout`               | `int`   | YAML    | HTTP timeout seconds (default: 30)      |
| `max_retries`           | `int`   | YAML    | Retry attempts (default: 3)             |
| `skip_existing_animals` | `bool`  | YAML    | Filter already-scraped animals          |

### Main Entry Point: `run()`

Returns `True` when the run succeeded. Its phases:

1. Setup: robots.txt check, the `scrape_logs` row.
2. `collect_data()`, which the subclass implements. `filter_existing_animals`
   records every listed dog and keeps the filtering stats itself. The found
   count is taken once per run.
3. Save phase (`DogSaving`): validate every dog first, so a rejected dog costs
   no R2 upload; batch-upload images for the valid ones; then save each and mark
   it seen. Counts go into a `ScrapeStats`.
4. Stale detection, unless the run looks like a partial failure (a count drop,
   or too many save errors), then adoption checks.
5. LLM enrichment of new dogs, plus up to 10 stored dogs still without a
   profile (#622), for organizations that have it.
6. Completion: metrics, the `scrape_logs` row, frontend cache invalidation for
   changed dogs.

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

### Detail pages: `fetch_details()` (#567)

Every scraper that reads one page per dog goes through one helper:

```python
dogs = self.fetch_details(animals, fetch_one, max_workers=3, attempts=self.max_retries)
dogs = await self.fetch_details_async(animals, fetch_one)  # Playwright scrapers, one at a time
```

- **`rate_limit_delay` means one thing:** the minimum time between request
  starts to the site, across every worker. Workers share one request-slot
  clock, so 5 threads don't make 5 times the rate. A robots.txt Crawl-delay
  that raises the delay applies at once. Each retry waits for a slot too, and
  so must any extra request a fetch makes (`wait_for_request_slot()`, as
  MISIs does before its browser fallback).
- `get_listing_page` takes a slot too, and the first detail request waits one
  interval after the listing, so listing and detail pages share the clock.
- Only transient errors are retried: timeouts, dropped connections, 429, 5xx.
  A 404 or a parse error fails at once. A 429 or 503 pushes the whole
  scraper's clock back (by `Retry-After`, else exponential back-off), so every
  worker slows down. Retries feed `metrics_collector.track_retry`.
- `attempts` is total tries; pass `max_retries + 1`, as `get_listing_page` uses.
- Items with a URL already seen run once; results keep the input order.
- A dog whose fetch raises is logged, added to `detail_failures` and
  skipped; the rest go on. A fetcher that swallows its own errors and
  returns `{}` must raise `DetailPageError` instead. Failures become a run
  note, so the run ends as `warning` with the count in `scrape_logs`. A `None`
  result is left out without counting as a failure.
- `fetch_one` bounds its own time (every request has a timeout);
  `fetch_details_async` also cuts each fetch off after the org's `timeout`.
- A scraper that doesn't use `filter_existing_animals` must record every
  listed dog as found before fetching (`_record_all_found_external_ids`), or
  a skipped dog would go stale.
- `respect_rate_limit()` stays for sequential listing loops: it sleeps the
  full delay between pages.

### Skip Existing Animals Filtering

Optimization to avoid re-scraping unchanged animals:

```python
def filter_existing_animals(self, animals: list[dict]) -> list[dict]:
    """
    FilteringService: records every found external_id for stale detection,
    then drops animals whose external_id belongs to an available row.
    Matching is by external_id, not adoption_url: some sites (REAN) list
    every dog on one shared URL.
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

### Photo galleries (`animals.images`)

A scraper sets `primary_image_url` (the hero) and `image_urls`: the dog's own
photos as source URLs, in the rescue's order, hero first. After the hero batch,
`ImageProcessingService.batch_process_galleries` turns them into
`animals.images`, `[{"url", "original_url", "width", "height"}]`:

- at most 8 photos; a shorter side under 300px is dropped unless it is the only photo
- photos already on the row are reused with no network call, so re-scrapes are cheap
- new photos are uploaded in parallel under the same deterministic R2 key as the
  hero, with their size in the object metadata

Scrapers that only know the hero still produce a one-photo gallery. Scope the
extraction to the dog's own gallery (site logos, footer icons and related-dog
thumbnails are the usual leaks) and use
`utils.shared_extraction_patterns.gallery_urls(hero, candidates)` to put the hero
first, drop WordPress resizes of the same upload and skip HEIC/TIFF files.
Fixture-based tests live in `tests/scrapers/test_gallery_extraction.py`.

### Name cleaning (`scrapers/validation/name_cleaner.py`)

`AnimalValidator.validate_animal_data` passes every name through `clean_name`,
so a scraper that overrides `_validate_animal_data` must still call `super()`.
It removes what rescues decorate names with:

- Appeal labels (OVERLOOKED, URGENT, HOME NEEDED, FOSTER NEEDED…), with the
  dashes, stars and brackets around them. OVERLOOKED also sets
  `properties.overlooked`. A label between two parts leaves its separator
  ("Max - URGENT - RESERVED" becomes "Max - RESERVED").
- An appended breed word on a two-word name ("Lola Lab", "Rex GSD"), only when
  the dog's breed contains it. Longer names, titles ("Mr Beagle"), names that
  are the breed and pun-prone words (boxer, hound, pointer, setter, springer)
  stay whole.

RESERVED, ON HOLD and APPLICATIONS CLOSED are **kept**: nothing else records
them, and removing them would make a dog nobody can adopt look available. The
original goes to `properties.raw_name` (a scraper that strips its own labels
sets it first). Slugs are never changed, so URLs stay stable.

### Display location (`scrapers/validation/location_cleaner.py`)

The validator also sets `properties.display_location`, one readable place
("Snetterton, Norfolk", "Baeza, Spain"), from whatever the rescue stores:
Dogs Trust and Woof Project `location`, Tierschutzverein `Aufenthaltsort`
(postcodes, and partner shelters mapped to their towns in `SHELTER_PLACES`),
Daisy Family and REAN `current_location(_translated)`. A value that can't be
read as a place is left out. The dog page shows it, falling back to the
rescue's own town. MISIs, Many Tears, Santer Paws, Animal Rescue Bosnia, Pets
in Turkey and The Underdog publish no per-dog location.

### Rules for scraper changes

Settled in epic #554; don't re-ask them.

- **A listing failure raises; a detail-page failure skips one dog.** Never
  salvage partial listing pages: stale detection would retire the dogs on the
  missing pages.
- **Missing data is `None`, never a placeholder.** No "Medium", "Mixed Breed",
  "Unknown" or "UK" standing in for data the site didn't give.
- **A data fix ships with its backfill**: a registered step
  (`management/backfill_steps.py`) or, when a re-scrape repairs it,
  `backfill_commands.py apply --orgs`, with a `plan` in the PR.
- **Production is read-only from a session** (the `postgres` MCP tool, role
  `claude_ro`); `backfill apply` and other production writes run only when
  the maintainer says go. A schema migration goes to production *before* its
  PR merges; an id re-key right *after* the merge deploys and *before* the
  next cron.
- **Be a polite crawler.** Never exceed a rescue's configured rate or its
  robots.txt Crawl-delay, even while testing. Save a page as a fixture instead
  of re-fetching it.
- **Playwright is the only browser path** (#566 removed Selenium). Tests patch
  `get_playwright_service` with `tests/fixtures/playwright_fakes.py`.
- **The disabled scrapers stay** (Galgos del Sol, Furry Rescue Italy).
- **Name and location cleaning live in the validator.** Keep
  `properties.raw_name`, `overlooked` and `display_location` working.
- **Base-class changes must not need edits in the org scrapers.**

### Run counts and stale detection (#555, #558)

`scrape_logs.detailed_metrics` says what a run lost:

| Key | Meaning |
| --- | --- |
| `animals_rejected` | dogs the validator refused |
| `rejected` | the same, by reason: `missing_field`, `invalid_name`, `no_image` |
| `save_errors` | dogs whose `save_animal` returned no id |
| `images_uploaded` / `images_reused` / `images_failed` | per dog, from the batch upload |
| `phase_timings.llm_enrichment` | seconds spent profiling |

The rejected and failed `external_id`s (up to 20) are in the run's log line
"N collected, M not saved". More than 10% not saved sends a Sentry warning
(`scraper.alert_type=dogs_not_saved`). With skipping on, only new dogs are
collected, so one new dog the site lists without a photo reads as "1 of 1"
every run (Santer Paws' Bonus, 2026-09, has no photo on the rescue's site).

Every dog the site listed is marked seen before stale detection
(`SessionManager.mark_found_animals_as_seen`), whether it was skipped as
existing, rejected or failed to save. Dogs stale detection has retired
(status `unknown`) stay so until a save succeeds, and a new dog that fails
validation is never stored. Stale detection is skipped, with a run note that
makes the run a `warning`, when more than 20% of *found* dogs fail to save
(`SAVE_ERROR_PARTIAL_FAILURE_RATE`) or marking the found dogs fails, and a
failed stale update is noted too. The rate is over *found* dogs, not
collected ones: with skipping on only new dogs are collected, so one new dog
failing every run would read as 100%. Validator rejections don't count: they
repeat for the same dog every run.

### Listings fail loudly (#559)

A listing page that can't be read raises `ListingIncompleteError`;
`collect_data` lets it through, so the run is an `error` and stale detection
doesn't run. Every page the pagination says exists must list dogs; an empty
*first* page is left to the zero-dogs alert. `get_listing_page(url)` is the
plain-HTTP fetch, retrying timeouts, connection errors, 429 and 5xx
(`max_retries: 3` means 4 attempts). Per site: Many Tears reads `?page=N` up
to the highest numbered link; Santer Paws walks `/adopt/page/N/` until an
empty 200 past its highest `data-page`; Tierschutzverein reads numbered pages while a "→" link follows;
MISIs raises when a clicked page shows no `/post/` links or the previous
page's. A listing past its page limit raises (Tierschutzverein 50, Santer 20,
MISIs 10).

Known gap: the disabled Furry Rescue Italy and Galgos del Sol listings don't
raise yet (#630).

Dogs Trust's Playwright listing raises when it stops short of its "N / M"
indicator: a page that doesn't render after "Go to next page", a page with no
dog cards, or no enabled button before page M (#628). On the live site
(2026-09-29, 36 pages) the indicator was exact on every page and the button
was disabled on the last. Without an indicator it ends on an empty page or
the missing button. A listing that fails is retried from a fresh browser, up
to 3 times, as a dropped Browserless session is. The hide-reserved filter
isn't applied (page 1 read "0 filters active"), so reserved cards come
through and are skipped.

### Stored fields: breed, age, story

- **`breed_raw` keeps the rescue's text** (#560). `process_animal` sets it only
  when absent, because `save_animal` runs it a second time.
- **Ages keep up** (#561). An age is stored as the range of birth dates that
  fits what the rescue said (`birth_date_min`, `birth_date_max`) plus
  `age_observed_at`, all in `utils/birth_dates.py`. A scraper whose rescue
  publishes a date of birth passes the text as `date_of_birth` (day-first);
  otherwise the stated age is taken back from the day it was read. An
  unchanged `age_text` keeps its anchor, so a forced re-scrape of "3 months"
  a year later doesn't make the dog a puppy again. `age_min_months` /
  `age_max_months` stay stored columns, derived at save time and by
  `REFRESH_AGES_SQL` after every cron batch, so a month boundary can show up to
  three days late. Months cap at 360 (`MAX_DOG_AGE_MONTHS`). `age_text` is the
  text as last saved (for most rescues, as first read, since existing dogs
  are skipped); JSON-LD and the favourites compare view show it (#635).
- **The story is `properties.description`** (#568), the one key every reader
  uses (sitemap filter, prompt, page). The LLM grounding check
  (`services/llm/grounding.py`) takes the longest string, or list of strings,
  in `properties`.
- **Each run profiles new dogs and up to 10 older ones still without a
  profile** (#622), so a profile that failed (a timeout, an OpenRouter 429)
  is retried. Dogs under the grounding floor are left out: the profiler would
  skip them and alert on every run. Rescues with profiling off (Pets in
  Turkey) are never queried.

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
| `woof_project`              | UK         | HTTP       | Available dogs listed first     |
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

Browser scrapers follow this structure:

```python
from scrapers.base_scraper import BaseScraper
from services.playwright_browser_service import PlaywrightOptions, get_playwright_service

class OrganizationScraper(BaseScraper):
    def __init__(self, config_id: str = "org-id", ...):
        super().__init__(config_id=config_id, ...)
        self.base_url = "https://example.org"
        self.listing_url = f"{self.base_url}/dogs"

    def collect_data(self) -> List[Dict[str, Any]]:
        return asyncio.run(self._collect_with_playwright())

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
- `_extract_compatibility()` - The "May live with" chips, read by their `liveWith<X>` search parameter: `may_live_with` plus `good_with_dogs/cats/children` (a chip means yes; no chip leaves the key out)
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
| Detail  | HTTP       | Server-rendered Wix posts (browser fallback) |

**Key Features:**

- Multi-page navigation via AJAX pagination
- Progressive scrolling per page
- Detail pages over plain HTTP (Wix renders posts on the server), with the
  browser as fallback

**The post body (#562).** A dog is a Wix blog post; everything about it is in
`[data-hook="post-description"]`, and `detail_parser.py` reads nothing else
(the site menu once passed for the facts). The body is the story, then a facts
list under "Things you should know about X" (also "have to know"), then
adoption boilerplate from "How do you adopt X?". The story is
`properties.description` (the facts when a post has no story); the facts are
`raw_bullet_points`. Many posts tell most of the story as those bullets, so
the grounding check counts them (#620). 404/410 means the post is gone;
another non-200, or HTML without the post body, falls back to the browser.

- Age: the DOB bullet from its label on (DOB, date of birth, birthday; a bare
  "born" can be the dog's puppies) is `date_of_birth`. A stated age anchors at
  the post's `article:published_time`, passed as `age_stated_at`.
- Rate: a 429 backs off (4 × `rate_limit_delay`) and retries once, then skips
  the dog. Don't run MISIs dry runs back to back (two on 2026-09-26 got 196
  429s).
- Never detect an error page by substring ("500", "not found"): CSS like
  `font-weight:500` dropped real dogs. A missing post body is the signal.

---

### 4. Woof Project (`scrapers/woof_project/dogs_scraper.py`)

**Organization:** EU rescue aggregator (Cyprus, etc.)

**Scraping Strategy:** plain HTTP for listing and detail pages (#565; the
Playwright listing is gone).

- `get_animal_list` reads one `<article class="type-adoption">` card per dog;
  its name is the last `<h2>`. A status `<h2>` above the name (any case,
  "GEADOPTEERD" in Dutch) marks it adopted or reserved; any other heading
  there is logged and the dog kept (`_available_dog`).
- Available dogs come first, then the adoption archive, so the next page is
  read only while a page lists an available dog (`_next_page_url`). The
  archive holds badge-less old dogs, so reading every page would bring them
  back.
- `_extract_filtered_description()` strips navigation and metadata from the
  detail page's text.

**External ID Pattern:** `wp-{slug}` (`wp-lisbon`); a numeric slug is a real
post id (`wp-9270`).

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

**Fields (#563, #618).**

- `age_text` is the English translation of `Geburtstag` ("03.2025 (10 Monate
  alt)" → "10 months old"); the scraper never sets `age`, which
  `process_animal` would prefer. An untranslated age is `None` and logged.
  The birth range comes from `Geburtstag` as `date_of_birth`.
- Size comes from "Ungefähre Größe" by shoulder height, on the scale shared
  with Daisy (`utils/dog_size.py`: Small below 40 cm, Medium below 60, Large
  from 60; a range by its middle, #631; Animal Rescue Bosnia keeps its own five
  sizes), else the site's word. A dog still
  growing (the text says so, or under 12 months) gets no size and the save
  falls back to the breed's, unless the rescue gives an adult size ("klein
  bleibend", "Endgröße"). Two size words give none. A dog whose page says it
  is still growing ("im Wachstum", "wächst noch", "nicht ausgewachsen") and is
  under 24 months is stored with `properties.size_pending`, which
  skip-existing doesn't skip, so each run reads it again until the page gives
  a grown size or the dog turns 2. A plain puppy height ("ca. 35 cm" at 4
  months) isn't waited on: read again at a year, it would become the adult
  size, so such a dog keeps the breed's.
- The story is the post (`div.content`) from the top up to the "Videos" line
  (an `h2` or a `p`), without the "Beschreibung" heading: updates sit above
  that heading, stories open with their own title, and older posts have no
  "Beschreibung". Text keeps the page's own spacing, and a `<br>` reads
  as a space (#631, #654): `get_text(strip=True)` had stripped the space beside
  every tag ("hatBitte", "befindet.Im"), and a space at every tag split words
  the page wraps in tags ("H<span>ü</span>ndin"), so only `<br>` adds one.
- **The German story before profiling (decided, #631).** A dog shows its German
  `properties.description` only until its AI profile exists, which the same
  run writes minutes after the save. A profile that fails is retried by the
  next runs' backlog (#622, #633). On 2026-09-29, 0 of 373 active dogs were
  unprofiled, so the window is a run's LLM phase. Marking the description's
  language for the page isn't worth building for that.

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
from scrapers.base_scraper import BaseScraper
from services.playwright_browser_service import PlaywrightOptions, get_playwright_service

class NewOrgScraper(BaseScraper):
    def __init__(self, config_id: str = "new-org", **kwargs):
        super().__init__(config_id=config_id, **kwargs)
        self.base_url = "https://neworg.example.com"
        self.listing_url = f"{self.base_url}/dogs"

    def collect_data(self) -> List[Dict[str, Any]]:
        # Prefer plain HTTP (get_listing_page) when the site renders server-side
        return asyncio.run(self._collect_with_playwright())

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
# No BROWSERLESS_WS_ENDPOINT: Playwright uses local Chromium

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
@pytest.mark.unit        # Pure logic, no I/O
@pytest.mark.database    # Requires a PostgreSQL database
@pytest.mark.browser     # Requires a real browser (Playwright)
@pytest.mark.external    # Requires external APIs or credentials
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
