"""Scraper implementation for Dogs Trust organization."""

import asyncio
import random
import re
import time
from typing import Any

import requests
from bs4 import BeautifulSoup, Tag
from playwright.async_api import Error as PlaywrightError
from playwright.async_api import TimeoutError as PlaywrightTimeoutError

from scrapers.base_scraper import BaseScraper
from services.playwright_browser_service import PlaywrightOptions

# Browserless v2 sessions occasionally close mid-pagination — the remote browser
# is torn down server-side, surfacing as a TargetClosedError partway through the
# scrape (e.g. at page.content()). Matched by message because Playwright only
# exports TargetClosedError from a private module, not the public async_api.
_BROWSER_CLOSED_SIGNATURES = (
    "target page, context or browser has been closed",
    "target closed",
    "browser has been closed",
    "connection closed",
)


DETAIL_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "DNT": "1",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}


def _is_browser_closed_error(error: BaseException) -> bool:
    """True if the error is a Browserless session drop worth a full-scrape retry."""
    message = str(error).lower()
    return any(signature in message for signature in _BROWSER_CLOSED_SIGNATURES)


class DogsTrustScraper(BaseScraper):
    """Scraper for Dogs Trust organization.

    Dogs Trust uses JavaScript-rendered listing pages requiring Playwright
    for listing page scraping, while detail pages work with standard HTTP requests.
    This hybrid approach follows the patterns established in the analysis phase.
    """

    def __init__(
        self,
        config_id: str = "dogstrust",
        metrics_collector=None,
        session_manager=None,
        database_service=None,
    ):
        """Initialize Dogs Trust scraper.

        Args:
            config_id: Configuration ID for Dogs Trust
            metrics_collector: Optional metrics collector service
            session_manager: Optional session manager service
            database_service: Optional database service
        """
        super().__init__(
            config_id=config_id,
            metrics_collector=metrics_collector,
            session_manager=session_manager,
            database_service=database_service,
        )

        # Use config-driven URLs instead of hardcoded values
        website_url = getattr(self.org_config.metadata, "website_url", "https://www.dogstrust.org.uk")
        self.base_url = str(website_url).rstrip("/") if website_url else "https://www.dogstrust.org.uk"
        # Navigate directly to the canonical parameterized URL the site
        # redirects to. Skipping the redirect removes one anti-bot interception
        # point and a race where wait_for_selector can fire on the pre-redirect
        # page.
        self.listing_url = (
            f"{self.base_url}/rehoming/dogs"
            "?page=0&sort=NEW&liveWithCats=false&liveWithDogs=false"
            "&liveWithPreschool=false&liveWithPrimary=false&liveWithSecondary=false"
            "&noReserved=false&isUnderdog=false&currentDistance=1000"
        )
        self.organization_name = self.org_config.name

    def _get_filtered_animals(self, max_pages_to_scrape: int = None) -> list[dict[str, Any]]:
        """Get list of animals and apply skip_existing_animals filtering.

        Uses self.filtering_service.filter_existing_animals() which records ALL external_ids
        BEFORE filtering to ensure mark_found_animals_as_seen() works correctly.

        Returns:
            List of filtered animals ready for detail scraping
        """
        # Get list of available dogs from all listing pages
        animals = self.get_animal_list(max_pages_to_scrape=max_pages_to_scrape)

        if not animals:
            self.logger.warning("No animals found to process")
            return []

        # Use filtering_service method that records external_ids BEFORE filtering
        # This is critical for mark_found_animals_as_seen() to work correctly
        result = self.filtering_service.filter_existing_animals(animals)
        self._sync_filtering_stats()
        return result

    def _process_animals_parallel(self, animals: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Each dog's detail page over HTTP, merged over its listing data (#567)."""

        def fetch(animal: dict[str, Any]) -> dict[str, Any]:
            animal.update(self._scrape_animal_details_http(animal["adoption_url"]))
            return animal

        return self.fetch_details(animals, fetch, max_workers=min(self.batch_size, 5), attempts=self.max_retries + 1)

    def collect_data(self, max_pages_to_scrape: int = None) -> list[dict[str, Any]]:
        """Collect all available dog data from listing pages.

        Exceptions propagate to BaseScraper._run_with_connection, which routes
        them through capture_scraper_error (real Sentry exception with stack
        trace) and handle_scraper_failure (status="error" in scrape_logs).
        Catching here would re-introduce the silent-failure pathology this
        scraper had: return [] -> animals_found == 0 -> misleading
        alert_zero_dogs_found Sentry alert with no actionable trace.
        """
        animals = self._get_filtered_animals(max_pages_to_scrape=max_pages_to_scrape)
        if not animals:
            return []

        all_dogs_data = self._process_animals_parallel(animals)
        self.logger.info(f"Total unique dogs collected: {len(all_dogs_data)}")
        return all_dogs_data

    def get_animal_list(self, max_pages_to_scrape: int = None) -> list[dict[str, Any]]:
        """Fetch list of available dogs using browser automation with pagination.

        Handles JavaScript-rendered listing pages by using headless browser.
        Applies filters to hide reserved dogs and iterates through all pages
        using navigation buttons.

        Args:
            max_pages_to_scrape: Optional limit on number of pages to scrape for debugging.
                                If None, scrapes all available pages.

        Returns:
            List of dictionaries containing basic dog information from all pages
        """
        return self._run_playwright_pagination_with_retry(max_pages_to_scrape)

    def _run_playwright_pagination_with_retry(self, max_pages_to_scrape: int = None, max_attempts: int = 3) -> list[dict[str, Any]]:
        """Run Playwright pagination, retrying from a fresh browser on a session drop.

        ``browser_manager.with_browser_retry`` only retries browser *acquisition*; a Browserless
        session that dies mid-pagination (TargetClosedError at page.content())
        otherwise loses the whole scrape and fires a Sentry alert. Retrying from
        page 0 with a new browser is the safe recovery — salvaging the partial
        pages collected so far would let stale detection mark unseen dogs as
        adopted. Non-session-drop errors (e.g. a genuine initial-load timeout)
        are re-raised immediately so real failures still surface.
        """
        for attempt in range(1, max_attempts + 1):
            try:
                return asyncio.run(self._get_animal_list_playwright(max_pages_to_scrape))
            except PlaywrightError as error:
                if not _is_browser_closed_error(error) or attempt == max_attempts:
                    raise
                delay = 2.0 * attempt
                self.logger.warning(f"Browserless session dropped mid-scrape (attempt {attempt}/{max_attempts}): {error}; retrying from a fresh browser in {delay}s")
                time.sleep(delay)

    async def _get_animal_list_playwright(self, max_pages_to_scrape: int = None) -> list[dict[str, Any]]:
        """Fetch list of available dogs using Playwright with pagination.

        Async implementation using Playwright for Browserless v2 compatibility.
        """
        all_dogs = []

        if max_pages_to_scrape:
            self.logger.info(f"DEBUG MODE: Limiting scrape to {max_pages_to_scrape} pages")
        else:
            self.logger.info("Scraping all available pages (Playwright)")

        options = PlaywrightOptions(
            headless=True,
            viewport_width=1920,
            viewport_height=1080,
            timeout=30000,
            stealth_mode=True,
        )

        # Use retry wrapper for resilient browser connection
        async with self.browser_manager.with_browser_retry(options) as browser_result:
            page = browser_result.page
            self.logger.info(f"Using {'remote Browserless' if browser_result.is_remote else 'local Chromium'} for Dogs Trust scraping")

            try:
                url = self.listing_url
                self.logger.debug(f"Loading initial page: {url}")
                await page.goto(url, wait_until="domcontentloaded")

                # Handle cookie consent banner if present (OneTrust)
                # CRITICAL: Remote Browserless may have timing differences - be aggressive with overlay removal
                try:
                    await asyncio.sleep(2.0)  # Longer wait for remote browsers to render overlay
                    cookie_selectors = [
                        "#onetrust-accept-btn-handler",
                        "button:has-text('Accept all')",
                        "button:has-text('Accept All')",
                        "button:has-text('Accept')",
                    ]
                    cookie_clicked = False
                    for selector in cookie_selectors:
                        try:
                            cookie_button = page.locator(selector).first
                            if await cookie_button.is_visible(timeout=3000):
                                # Use JavaScript click to bypass any overlay issues
                                await page.evaluate(f"document.querySelector('{selector}')?.click()")
                                self.logger.info("Accepted cookie consent via JavaScript click")
                                cookie_clicked = True
                                await asyncio.sleep(1.5)
                                break
                        except Exception:
                            continue

                    # Wait briefly for overlay to start disappearing
                    if cookie_clicked:
                        try:
                            await page.wait_for_selector("#onetrust-consent-sdk", state="hidden", timeout=3000)
                            self.logger.debug("OneTrust overlay dismissed naturally")
                        except Exception:
                            pass  # Will force-remove below

                except Exception as e:
                    self.logger.debug(f"Cookie consent handling exception: {e}")

                # ALWAYS force-remove OneTrust overlays (even if click seemed successful)
                # This ensures no overlay blocks subsequent interactions on remote browsers
                try:
                    removed = await page.evaluate(
                        """
                        (() => {
                            let removed = 0;
                            const overlay = document.querySelector('#onetrust-consent-sdk');
                            if (overlay) { overlay.remove(); removed++; }
                            const darkFilter = document.querySelector('.onetrust-pc-dark-filter');
                            if (darkFilter) { darkFilter.remove(); removed++; }
                            // Also remove any other OneTrust elements that might block clicks
                            document.querySelectorAll('[class*="onetrust"]').forEach(el => {
                                if (el.style.position === 'fixed' || getComputedStyle(el).position === 'fixed') {
                                    el.remove();
                                    removed++;
                                }
                            });
                            return removed;
                        })()
                    """
                    )
                    if removed > 0:
                        self.logger.debug(f"Force-removed {removed} OneTrust overlay element(s)")
                    await asyncio.sleep(0.5)  # Brief pause for DOM to update
                except Exception as e:
                    self.logger.debug(f"Overlay removal error (non-critical): {e}")

                # Remote Browserless under stealth_mode intermittently fails
                # to render the initial page. Raise rather than return [] so
                # the failure surfaces as a real Sentry exception instead of
                # a misleading zero-dogs alert.
                dog_card_selector = 'a[href*="/rehoming/dogs/"]'
                max_initial_attempts = 3
                for attempt in range(1, max_initial_attempts + 1):
                    try:
                        await page.wait_for_selector(dog_card_selector, timeout=45000, state="attached")
                        if attempt == 1:
                            self.logger.info("Initial page loaded successfully")
                        else:
                            self.logger.info(f"Initial page loaded successfully on attempt {attempt}/{max_initial_attempts}")
                        break
                    except PlaywrightTimeoutError as err:
                        if attempt == max_initial_attempts:
                            self.logger.error(f"Initial page load failed after {max_initial_attempts} attempts: {err}")
                            raise
                        self.logger.warning(f"Initial page load timed out (attempt {attempt}/{max_initial_attempts}): {err}; reloading and retrying...")
                        await page.reload(wait_until="domcontentloaded")
                        await asyncio.sleep(1.0)
                        # OneTrust overlays can re-render after the reload.
                        try:
                            await page.evaluate(
                                """
                                (() => {
                                    document.querySelector('#onetrust-consent-sdk')?.remove();
                                    document.querySelector('.onetrust-pc-dark-filter')?.remove();
                                })()
                            """
                            )
                        except Exception as overlay_err:
                            self.logger.debug(f"Post-reload overlay removal error (non-critical): {overlay_err}")

                # Apply filter to hide reserved dogs
                try:
                    self.logger.info("Applying filter to hide reserved dogs...")
                    filter_selectors = [
                        "button:has-text('Filters')",
                        "button:has-text('Filter')",
                    ]
                    filters_button = None
                    for selector in filter_selectors:
                        try:
                            btn = page.locator(selector).first
                            if await btn.is_visible():
                                filters_button = btn
                                break
                        except Exception:
                            continue

                    if filters_button:
                        await filters_button.scroll_into_view_if_needed()
                        await asyncio.sleep(0.5)
                        # Use JavaScript click to bypass any remaining overlay issues
                        try:
                            await page.evaluate(
                                """
                                (() => {
                                    const btn = document.querySelector('#dogs-filter-button')
                                        || document.querySelector('button[id*="filter"]')
                                        || [...document.querySelectorAll('button')].find(b => b.textContent.includes('Filter'));
                                    if (btn) btn.click();
                                })()
                            """
                            )
                            self.logger.info("Clicked filters button via JavaScript")
                        except Exception:
                            # Fallback to Playwright click
                            await filters_button.click()
                            self.logger.info("Clicked filters button via Playwright")
                        await asyncio.sleep(1)

                        reserved_selectors = [
                            "label:has-text('Hide reserved')",
                            "input[name*='reserved']",
                            "span:has-text('Hide reserved')",
                        ]
                        checkbox_clicked = False
                        for selector in reserved_selectors:
                            try:
                                element = page.locator(selector).first
                                if await element.is_visible():
                                    await element.click()
                                    checkbox_clicked = True
                                    self.logger.info("Clicked 'Hide reserved dogs' option")
                                    break
                            except Exception:
                                continue

                        if checkbox_clicked:
                            apply_selectors = [
                                "button:has-text('Show')",
                                "button:has-text('Apply')",
                                "button:has-text('Update')",
                                "button[type='submit']",
                            ]
                            for selector in apply_selectors:
                                try:
                                    apply_button = page.locator(selector).first
                                    if await apply_button.is_visible():
                                        await apply_button.click()
                                        self.logger.info("Applied filter to hide reserved dogs")
                                        await asyncio.sleep(1)
                                        break
                                except Exception:
                                    continue
                except Exception as e:
                    self.logger.warning(f"Could not apply filter: {e}")

                # Scroll to trigger lazy-loaded content
                await page.evaluate("window.scrollTo(0, document.body.scrollHeight / 2)")
                await asyncio.sleep(0.3)
                await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                await asyncio.sleep(0.3)
                await page.evaluate("window.scrollTo(0, 0)")
                await asyncio.sleep(0.2)

                # Pagination loop — Dogs Trust is a client-side SPA: navigating
                # directly to ?page=N is rewritten back to page 0, so we must
                # advance by clicking the "Next" control and waiting for the
                # cards to re-render. The control's aria-label is "Go to next
                # page"; older selectors ("Next") no longer match, which is what
                # stranded the scraper on page 0.
                page_num = 0
                max_pages = None

                while True:
                    html_content = await page.content()
                    soup = BeautifulSoup(html_content, "html.parser")

                    if max_pages is None:
                        max_pages = self._detect_max_pages(soup)
                        self.logger.info(f"Detected maximum pages: {max_pages}")

                    page_dogs = self._extract_dogs_from_page(soup)
                    if page_dogs:
                        all_dogs.extend(page_dogs)
                        self.logger.info(f"Page {page_num}: Found {len(page_dogs)} dogs (total so far: {len(all_dogs)})")
                    elif page_num > 0:
                        # An empty page past the first means we've run off the end
                        # of the results — stop even if the detected max is higher
                        # (the indicator can be stale or fall back to a fixed bound).
                        self.logger.info(f"Page {page_num}: No dogs found - reached end of results")
                        break
                    else:
                        self.logger.warning(f"Page {page_num}: No dogs found")

                    pages_scraped = page_num + 1
                    if max_pages_to_scrape and pages_scraped >= max_pages_to_scrape:
                        self.logger.info(f"Reached debug limit of {max_pages_to_scrape} pages")
                        break

                    if max_pages is not None and page_num >= max_pages - 1:
                        self.logger.info(f"Reached last page ({max_pages} total)")
                        break

                    # "Go to next page" is the current control; the rest are
                    # retained as defensive fallbacks against another label change.
                    next_selectors = [
                        "button[aria-label='Go to next page']",
                        "button[aria-label='Next']",
                        "a[aria-label='Next page']",
                        "button:has-text('Next')",
                    ]
                    next_button = None
                    for selector in next_selectors:
                        try:
                            btn = page.locator(selector).first
                            if await btn.is_visible() and await btn.is_enabled():
                                next_button = btn
                                break
                        except Exception:
                            continue

                    if not next_button:
                        self.logger.info("No enabled Next button found - reached end of results")
                        break

                    # Capture the current first card so we can detect the
                    # client-side re-render after clicking Next.
                    prev_first_href = await page.evaluate(
                        """() => {
                            const a = document.querySelector('a[href*="/rehoming/dogs/"]');
                            return a ? a.getAttribute('href') : null;
                        }"""
                    )

                    self.logger.debug(f"Clicking Next to navigate to page {page_num + 1}")
                    await next_button.scroll_into_view_if_needed()
                    await asyncio.sleep(0.3)
                    try:
                        await next_button.click(timeout=10000)
                    except Exception:
                        # Fallback to a JS click if an overlay intercepts the click.
                        await page.evaluate(
                            """() => {
                                const btn = document.querySelector('button[aria-label="Go to next page"]')
                                    || document.querySelector('button[aria-label="Next"]')
                                    || document.querySelector('a[aria-label="Next page"]')
                                    || [...document.querySelectorAll('button')].find(b => b.textContent.includes('Next'));
                                if (btn) btn.click();
                            }"""
                        )

                    # Wait for the listing to re-render with a different first
                    # card. A timeout means the click did not advance the page
                    # (stale/intercepted click, or genuinely no further results),
                    # so stop rather than advance — re-reading the same DOM would
                    # silently duplicate or skip pages, this scraper's historical
                    # failure mode.
                    try:
                        await page.wait_for_function(
                            """(prev) => {
                                const a = document.querySelector('a[href*="/rehoming/dogs/"]');
                                return a && a.getAttribute('href') !== prev;
                            }""",
                            arg=prev_first_href,
                            timeout=15000,
                        )
                    except PlaywrightTimeoutError:
                        self.logger.warning(f"Page {page_num + 1} did not render after clicking Next - stopping pagination")
                        break

                    await asyncio.sleep(self.rate_limit_delay + random.uniform(0.3, 0.8))
                    page_num += 1

            except Exception as e:
                self.logger.error(f"Error during Playwright pagination scraping: {e}")
                # Propagate so collect_data() can record a real failure instead
                # of silently returning [] and triggering the misleading
                # zero-dogs Sentry alert.
                raise

        self.logger.info(f"Total dogs collected across all pages: {len(all_dogs)}")
        return all_dogs

    def _detect_max_pages(self, soup: BeautifulSoup) -> int:
        """Detect maximum page count from pagination indicator.

        Looks for pagination text like "1 / 38" (or legacy "1 of 47") to
        determine total pages, falling back to a fixed bound if not found.

        Args:
            soup: BeautifulSoup object of the listing page

        Returns:
            Total page count from the indicator, or a fixed fallback bound if
            none is found. The fallback is only a ceiling — the pagination loop's
            empty-page check is the real terminator, so the exact value is not
            load-bearing.
        """
        # Look for pagination indicator with pattern "X of Y" or "X / Y".
        # Dogs Trust switched the rendered separator from "of" to "/", so accept both.
        indicator_pattern = re.compile(r"\d+\s*(?:of|/)\s*\d+")
        elements = soup.find_all(string=indicator_pattern)
        for element in elements:
            element_text = str(element).strip()
            match = re.search(r"(\d+)\s*(?:of|/)\s*(\d+)", element_text)
            if match:
                total_pages = int(match.group(2))
                self.logger.debug(f"Found pagination indicator: {element_text}")
                return total_pages

        # Fallback to analysis-discovered value
        self.logger.warning("Could not detect max pages, defaulting to 47")
        return 47

    def _extract_dogs_from_page(self, soup: BeautifulSoup) -> list[dict[str, Any]]:
        """Extract dog information from a single listing page.

        Uses CSS selectors identified in analysis phase:
        - Dog detail links: a[href*="/rehoming/dogs/"] with proper filtering
        - Filters out reserved dogs since we're not using noReserved parameter

        Args:
            soup: BeautifulSoup object of the listing page

        Returns:
            List of dog data dictionaries with basic information (excluding reserved dogs)
        """
        dogs = []
        seen_urls = set()  # Track URLs to avoid duplicates on same page

        # Find all dog card links - more flexible regex to handle variable ID lengths
        # Pattern matches: /rehoming/dogs/{breed-slug}/{id} where ID can be any length
        dog_links = soup.find_all("a", href=re.compile(r"/rehoming/dogs/[^/]+/\d+$"))

        for link in dog_links:
            try:
                # Extract the href to check for duplicates
                href = link.get("href", "")
                if href in seen_urls:
                    continue  # Skip duplicate links on the same page
                seen_urls.add(href)

                # Check if this dog is reserved. The card renders the indicator
                # as "Reserved" (title case); match case-insensitively so a
                # casing change on the site doesn't let reserved dogs slip through.
                link_text = link.get_text(separator=" ", strip=True)
                if "reserved" in link_text.lower():
                    self.logger.debug(f"Skipping reserved dog: {href}")
                    continue

                dog_data = self._extract_card_data(link)
                if dog_data:
                    dogs.append(dog_data)
            except Exception as e:
                self.logger.warning(f"Failed to extract data from dog card: {e}")
                continue

        return dogs

    def _extract_card_data(self, link_element) -> dict[str, Any]:
        """Extract data from a single dog card element.

        Args:
            link_element: BeautifulSoup element representing a dog card link

        Returns:
            Dictionary containing dog data with required fields
        """
        # Extract URL and ensure it's absolute
        relative_url = link_element.get("href", "")
        if relative_url.startswith("http"):
            adoption_url = relative_url
        elif relative_url.startswith("/"):
            adoption_url = f"{self.base_url}{relative_url}"
        else:
            adoption_url = f"{self.base_url}/{relative_url}"

        # Extract external ID from URL (e.g., /rehoming/dogs/weimaraner/3592421 -> "3592421")
        external_id = self._extract_external_id_from_url(adoption_url)

        # Basic dog data structure with required fields
        # Values will be enriched in detail scraping phase
        dog_data = {
            "external_id": external_id,
            "adoption_url": adoption_url,
            "animal_type": "dog",
            "status": "available",
            # Default values for required fields (will be enriched in detail scraping)
            "name": "Unknown",
            "breed": "Mixed Breed",
            "size": "Medium",
            "age_text": None,
            "sex": "Unknown",
            "location": "UK",
            "description": "",
        }

        return dog_data

    def _extract_external_id_from_url(self, url: str) -> str:
        """Extract external ID from adoption URL.

        Args:
            url: Full adoption URL (e.g., https://www.dogstrust.org.uk/rehoming/dogs/weimaraner/3592421)

        Returns:
            External ID string (e.g., "3592421")
        """
        # Extract ID from URL pattern /rehoming/dogs/{breed-slug}/{id} - ID can be any length
        match = re.search(r"/rehoming/dogs/[^/]+/(\d+)/?$", url)
        return match.group(1) if match else url.split("/")[-1] if url.split("/")[-1].isdigit() else "unknown"

    def _scrape_animal_details_http(self, adoption_url: str) -> dict[str, Any]:
        """Scrape detailed information from individual dog page using HTTP requests.

        Uses standard HTTP requests as analysis showed detail pages don't require JavaScript.
        Extracts comprehensive data following the field mappings from analysis phase.

        Args:
            adoption_url: URL of the individual dog adoption page

        Returns:
            Dictionary with detailed dog information following BaseScraper format
        """
        # One request: fetch_details retries, each attempt within the rate limit (#567)
        response = requests.get(adoption_url, headers=DETAIL_HEADERS, timeout=self.timeout)
        response.raise_for_status()

        # Parse HTML with BeautifulSoup
        soup = self._soup_from_response(response)

        # Extract core fields using analysis-identified selectors
        name = self._extract_name(soup)
        breed = self._extract_breed(soup)
        age = self._extract_age(soup)
        sex = self._extract_sex(soup)
        size = self._extract_size(soup)
        location = self._extract_location(soup)
        description = self._extract_description(soup)
        dog_id = self._extract_external_id_from_url(adoption_url)
        primary_image_url = self._extract_primary_image(soup, dog_id)

        # Note: Standardization will be applied later via process_animal()

        # BUILD PROPERTIES JSON following Many Tears Rescue pattern
        properties = {}

        # Add structured data from DOM (reference ID, basic info)
        structured_data = {}
        if breed:
            structured_data["breed"] = breed
        if age:
            structured_data["age_text"] = age
        if sex:
            structured_data["sex"] = sex
        if size:
            structured_data["size"] = size
        if location:
            structured_data["location"] = location

        properties.update(structured_data)

        # Extract additional properties specific to Dogs Trust
        try:
            additional_properties = self._extract_additional_properties(soup)
            properties.update(additional_properties)
        except Exception as e:
            print(f"Error in _extract_additional_properties: {e}")
            import traceback

            traceback.print_exc()

        # CRITICAL: Store description in properties (Many Tears pattern)
        properties["description"] = description or ""

        # Build raw result for unified standardization processing
        raw_result = {
            "name": name or "Unknown",
            "breed": breed or "Mixed Breed",
            "age": age,  # Unified standardization expects 'age' field
            "sex": sex or "Unknown",
            "size": size or "Medium",
            "location": location or "UK",
            "description": description or "",
            "primary_image_url": primary_image_url,
            "original_image_url": primary_image_url,
            "animal_type": "dog",
            "status": "available",
            "properties": properties,  # Following Many Tears pattern
        }

        # The dog's photo gallery, hero first (#487)
        raw_result["image_urls"] = self._extract_image_urls(soup, dog_id)

        # Apply unified standardization
        return self.process_animal(raw_result)

    def _extract_name(self, soup: BeautifulSoup) -> str:
        """Extract dog name from h1 heading."""
        name_element = soup.find("h1")
        return name_element.get_text(strip=True) if name_element else ""

    def _extract_breed(self, soup: BeautifulSoup) -> str:
        """Extract breed from filter link."""
        breed_link = soup.find("a", href=re.compile(r"breed%5B0%5D="))
        return breed_link.get_text(strip=True) if breed_link else ""

    def _extract_age(self, soup: BeautifulSoup) -> str:
        """Extract age from filter link."""
        age_link = soup.find("a", href=re.compile(r"age%5B0%5D="))
        return age_link.get_text(strip=True) if age_link else ""

    def _extract_sex(self, soup: BeautifulSoup) -> str:
        """Extract sex from filter link."""
        sex_link = soup.find("a", href=re.compile(r"gender%5B0%5D="))
        return sex_link.get_text(strip=True) if sex_link else ""

    def _extract_size(self, soup: BeautifulSoup) -> str:
        """Extract size from filter link."""
        size_link = soup.find("a", href=re.compile(r"size%5B0%5D="))
        return size_link.get_text(strip=True) if size_link else ""

    def _extract_location(self, soup: BeautifulSoup) -> str:
        """Extract location from center filter link."""
        location_link = soup.find("a", href=re.compile(r"centres%5B0%5D="))
        return location_link.get_text(strip=True) if location_link else ""

    def _soup_from_response(self, response) -> BeautifulSoup:
        """Parse a detail page response, decoding it as the page declares.

        Dogs Trust sends text/html with no charset, so requests falls back to
        ISO-8859-1 and response.text turns every smart quote into mojibake.
        Handing BeautifulSoup the raw bytes lets it read the meta charset
        instead.
        """
        return BeautifulSoup(response.content, "html.parser")

    def _extract_description(self, soup: BeautifulSoup) -> str:
        """Extract description from the two per-dog sections.

        Combines "Are you right for [Name]?" and "Is [Name] right for you?".
        The body of each section is a sibling element of the heading, not a
        <p>, so the section must be walked by sibling rather than searched for
        a paragraph: a document-wide paragraph search escapes the section and
        finds the breed-guide promo further down the page instead.
        """
        description_parts: list[str] = []

        for h2 in soup.find_all("h2"):
            h2_text = h2.get_text(strip=True)

            if "Are you right for" not in h2_text and "right for you" not in h2_text:
                continue

            body = self._extract_section_body(h2)
            if not body:
                continue

            text = self._normalize_text(body)
            if text not in description_parts:
                description_parts.append(text)

        return "\n\n".join(description_parts)

    def _extract_section_body(self, heading: Tag) -> str:
        """Collect the text that belongs to a heading's own section.

        Stops at the next heading so the walk cannot spill into whatever
        content block follows.
        """
        parts = []

        for sibling in heading.find_next_siblings():
            if sibling.name in ("h1", "h2", "h3", "h4", "h5", "h6"):
                break
            text = sibling.get_text(" ", strip=True)
            if text:
                parts.append(text)

        return " ".join(parts)

    def _extract_primary_image(self, soup: BeautifulSoup, dog_id: str | None = None) -> str:
        """Extract this dog's primary photo from the detail page.

        The dog's own photos are served under /images/{size}/dogs/{dog_id}/.
        Promotional and breed-illustration images sit under /images/{size}/assets/
        and appear before the dog's photos in the DOM, so matching on the dog id
        avoids returning a placeholder. Related-dog cards use other ids.
        """
        if dog_id:
            id_path = f"/dogs/{dog_id}/"
            for img in soup.find_all("img"):
                if hasattr(img, "get"):
                    src = img.get("src", "")
                    if src and id_path in src:
                        return f"{self.base_url}{src}" if src.startswith("/") else src
            return ""

        return ""

    def _extract_image_urls(self, soup: BeautifulSoup, dog_id: str | None = None) -> list[str]:
        """All of this dog's photos in page order, hero first.

        Same rule as the hero: only /images/{size}/dogs/{dog_id}/ belongs to
        this dog. Promotional images live under /assets/, and related-dog cards
        use other ids (400x300 thumbnails of other dogs). Each photo appears in
        several sizes and as .webp; one URL per file is kept.
        """
        if not dog_id:
            return []
        id_path = f"/dogs/{dog_id}/"
        urls: list[str] = []
        seen_files: set[str] = set()
        for img in soup.find_all("img"):
            src = img.get("src", "") if hasattr(img, "get") else ""
            if not src or id_path not in src:
                continue
            file_name = src.rsplit("/", 1)[-1].removesuffix(".webp")
            if file_name in seen_files:
                continue
            seen_files.add(file_name)
            urls.append(f"{self.base_url}{src}" if src.startswith("/") else src)
        return urls

    def _extract_additional_properties(self, soup: BeautifulSoup) -> dict[str, Any]:
        """Extract additional Dogs Trust-specific properties.

        This method aggregates all additional property extraction methods
        following the modular pattern identified in the test requirements.

        Args:
            soup: BeautifulSoup object of the detail page

        Returns:
            Dictionary containing all additional properties found
        """
        additional_properties = {}

        # Extract medical care information
        medical_care = self._extract_medical_care(soup)
        if medical_care:
            additional_properties["medical_care"] = medical_care

        # Extract living situation information
        living_situation = self._extract_living_situation(soup)
        if living_situation:
            additional_properties.update(living_situation)

        # Compatibility: may_live_with and good_with_* (#516)
        try:
            additional_properties.update(self._extract_compatibility(soup))
        except Exception as e:
            self.logger.error(f"Error extracting compatibility: {e}")

        return additional_properties

    def _extract_medical_care(self, soup: BeautifulSoup) -> str:
        """Extract medical care information from Dogs Trust detail page.

        Looks for medical care indicators like "I need ongoing medical care"
        using targeted DOM navigation based on label-value pattern.

        Args:
            soup: BeautifulSoup object of the detail page

        Returns:
            Medical care text or empty string if not found
        """
        # Look for text containing "medical care" indicators
        medical_patterns = [
            "I need ongoing medical care",
            "ongoing medical care",
            "medical care",
        ]

        for pattern in medical_patterns:
            # Find elements containing the medical care text
            elements = soup.find_all(string=lambda text: text and pattern.lower() in text.lower())

            for element in elements:
                if element and element.strip():
                    # Get the parent element
                    parent = element.parent if hasattr(element, "parent") else None
                    if parent:
                        # Get clean text from parent, limited to reasonable length
                        parent_text = parent.get_text(strip=True)
                        if parent_text and len(parent_text) < 200:
                            # Check if this is actually medical care info (not navigation/header)
                            if "medical" in parent_text.lower() and len(parent_text) > 10:
                                return parent_text

        return ""

    def _extract_living_situation(self, soup: BeautifulSoup) -> dict[str, str]:
        """Extract living situation information from Dogs Trust detail page.

        Uses targeted DOM navigation to find "Living off site" label and its value.
        Based on actual DOM structure where label and value are adjacent elements.

        Args:
            soup: BeautifulSoup object of the detail page

        Returns:
            Dictionary with living situation properties
        """
        living_situation = {}

        # Find all generic div elements that might contain the property
        # Based on DOM analysis, properties are in generic elements with label and value
        property_containers = soup.find_all("div")

        for container in property_containers:
            # Look for "Living off site" text within this container
            container_text = container.get_text(strip=True)

            # Check if this container has "Living off site" and is not too long (to avoid full page containers)
            if "Living off site" in container_text and len(container_text) < 50:
                # Extract the value after "Living off site"
                # The value is typically "Yes" or "No" following the label
                if "Living off site" in container_text:
                    # Split by "Living off site" and get what comes after
                    parts = container_text.split("Living off site")
                    if len(parts) > 1:
                        value = parts[1].strip().lstrip(":").strip()
                        # Check if we got a valid value
                        if value and value.lower() in ["yes", "no"]:
                            living_situation["living_off_site"] = value.capitalize()
                            break

        return living_situation

    # The chips' search parameters: /rehoming/dogs?liveWithDogs=true (#516).
    # Keyed on these, not the labels, which have changed before ("Secondary"
    # became "Secondary school children" in 2026). Children in priority
    # order: the youngest listed wins.
    LIVE_WITH_TRAITS = {
        "Dogs": ("good_with_dogs", True),
        "Cats": ("good_with_cats", True),
        "Preschool": ("good_with_children", True),
        "Primary": ("good_with_children", "Yes (5+)"),
        "Secondary": ("good_with_children", "Yes (11+)"),
    }
    _MAY_LIVE_WITH = re.compile(r"^\s*may live with:?\s*$", re.IGNORECASE)

    def _may_live_with(self, soup: BeautifulSoup) -> list[tuple[str, str]]:
        """The "May live with" chips as (parameter, label): ("Dogs", "Dogs").

        Only the card whose label says "May live with": matching text in any
        div used to reach the page wrapper, whose text always says "dogs".
        A label without its card, or a card without chips, is logged.
        """
        label = soup.find(string=self._MAY_LIVE_WITH)
        if not label:
            return []
        card = label.find_parent(class_=re.compile("traitCard"))
        if not card:
            self.logger.warning("'May live with' label outside a trait card: the page layout changed")
            return []
        chips: dict[str, str] = {}  # one per parameter, in page order
        for link in card.find_all("a", href=True):
            match = re.search(r"liveWith(\w+)=true", link["href"])
            if match and match.group(1) not in chips:
                chips[match.group(1)] = link.get_text(strip=True) or match.group(1)
        if not chips:
            self.logger.warning(f"'May live with' card without chips: {card.get_text(' ', strip=True)[:100]!r}")
        return list(chips.items())

    def _extract_compatibility(self, soup: BeautifulSoup) -> dict[str, Any]:
        """may_live_with and good_with_dogs/cats/children, from one read of the chips.

        may_live_with is the labels, "Cats, Dogs, Secondary school children".
        A chip means yes. No chip means the rescue didn't say, so the key is
        left out: not "Unknown", and not "no" either (#516). Children:
        preschool any age, primary "Yes (5+)", secondary only "Yes (11+)".
        """
        chips = self._may_live_with(soup)
        if not chips:
            return {}
        present = {parameter for parameter, _ in chips}
        for parameter, label in chips:
            if parameter not in self.LIVE_WITH_TRAITS:
                self.logger.warning(f"Unknown 'May live with' chip: {label!r} (liveWith{parameter})")
        compatibility: dict[str, Any] = {"may_live_with": ", ".join(label for _, label in chips)}
        for parameter, (key, value) in self.LIVE_WITH_TRAITS.items():
            if parameter in present:
                compatibility.setdefault(key, value)
        return compatibility

    def _normalize_text(self, text: str) -> str:
        """Normalize text by replacing smart quotes and special characters.

        Args:
            text: Text to normalize (may contain smart quotes)

        Returns:
            Normalized text with standard ASCII characters
        """
        if not text:
            return text

        # Replace smart quotes with standard quotes
        replacements = {
            "\u2019": "'",  # Right single quotation mark
            "\u2018": "'",  # Left single quotation mark
            "\u201c": '"',  # Left double quotation mark
            "\u201d": '"',  # Right double quotation mark
            "\u2013": "-",  # En dash
            "\u2014": "-",  # Em dash
            "\u2026": "...",  # Ellipsis
            "\u00a0": " ",  # Non-breaking space
        }

        for old, new in replacements.items():
            text = text.replace(old, new)

        return text
