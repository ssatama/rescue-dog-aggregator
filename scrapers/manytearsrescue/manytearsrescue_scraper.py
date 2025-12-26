"""Scraper implementation for Many Tears Rescue organization."""

import random
import re
import time
from typing import Any, Dict, List, Union, cast
from urllib.parse import urljoin

from bs4 import BeautifulSoup, Tag
from selenium.common.exceptions import TimeoutException, WebDriverException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.wait import WebDriverWait

from scrapers.base_scraper import BaseScraper
from services.browser_service import BrowserOptions, get_browser_service


class ManyTearsRescueScraper(BaseScraper):
    """Scraper for Many Tears Rescue organization.

    Many Tears Rescue uses Cloudflare Bot Management which blocks standard HTTP requests.
    This scraper uses Selenium WebDriver to bypass the protection and extract dog data
    from listing pages with pagination support.
    """

    # User agents for rotation
    USER_AGENTS = [
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0",
    ]

    def __init__(
        self,
        config_id: str = "manytearsrescue",
        metrics_collector=None,
        session_manager=None,
        database_service=None,
    ):
        """Initialize Many Tears Rescue scraper.

        Args:
            config_id: Configuration ID for Many Tears Rescue
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
        website_url = getattr(self.org_config.metadata, "website_url", "https://www.manytearsrescue.org")
        self.base_url = str(website_url).rstrip("/") if website_url else "https://www.manytearsrescue.org"
        self.listing_url = f"{self.base_url}/adopt/dogs/"
        self.organization_name = self.org_config.name

    def _get_filtered_animals(self) -> List[Dict[str, Any]]:
        """Get list of animals and apply skip_existing_animals filtering.

        Returns:
            List of filtered animals ready for detail scraping
        """
        # Get list of available dogs from all listing pages
        animals = self.get_animal_list()

        if not animals:
            self.logger.warning("No animals found to process")
            return []

        # Extract URLs and apply skip_existing_animals filtering
        all_urls = [animal["adoption_url"] for animal in animals]

        # Set filtering stats before filtering
        self.set_filtering_stats(len(all_urls), 0)  # Initial stats

        # Apply skip_existing_animals filtering via BaseScraper
        if self.skip_existing_animals:
            filtered_urls = self._filter_existing_urls(all_urls)
            skipped_count = len(all_urls) - len(filtered_urls)

            # Update filtering stats
            self.set_filtering_stats(len(all_urls), skipped_count)

            # Create filtered animals list
            url_to_animal = {animal["adoption_url"]: animal for animal in animals}
            animals = [url_to_animal[url] for url in filtered_urls if url in url_to_animal]

            self.logger.info(f"Skip existing animals enabled: {skipped_count} skipped, {len(animals)} to process")
        else:
            self.logger.info(f"Processing all {len(animals)} animals")

        if not animals:
            self.logger.info("All animals are existing - no new animals to process")

        return animals

    def _process_animals_parallel(self, animals: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process animals with reduced parallelism to avoid resource exhaustion.

        Args:
            animals: List of animals to process

        Returns:
            List of processed animals with detailed data
        """
        all_dogs_data = []
        seen_urls = set()  # Track URLs to prevent duplicates

        # REDUCED PARALLELISM: Max 2 threads to avoid detection and resource issues
        import concurrent.futures
        from threading import Lock

        self.logger.info(f"Starting detail scraping for {len(animals)} animals using batch_size={self.batch_size}")

        # Thread-safe collections
        results_lock = Lock()

        def process_animal_batch(animal_batch):
            """Process a batch of animals with individual WebDriver per thread"""
            batch_results = []
            local_driver = None

            try:
                # Create WebDriver for this thread with stealth options
                local_driver = self._setup_selenium_driver()

                for animal in animal_batch:
                    adoption_url = animal["adoption_url"]

                    # Skip duplicates (shouldn't happen but safety check)
                    with results_lock:
                        if adoption_url in seen_urls:
                            self.logger.debug(f"Skipping duplicate dog: {animal['name']} ({adoption_url})")
                            continue
                        seen_urls.add(adoption_url)

                    # Random delay for respectful scraping
                    time.sleep(random.uniform(self.rate_limit_delay + 1, self.rate_limit_delay + 3))

                    # Use thread-local WebDriver (no locking needed)
                    detail_data = self._scrape_animal_details(adoption_url, driver=local_driver)

                    if detail_data:
                        # Merge detail data with listing data (detail data takes precedence)
                        animal.update(detail_data)

                    batch_results.append(animal)

            except Exception as e:
                self.logger.error(f"Error in batch processing: {e}")
            finally:
                # Clean up thread-local WebDriver
                if local_driver:
                    try:
                        local_driver.quit()
                    except:
                        pass

            return batch_results

        # Split animals into batches based on batch_size
        batches = []
        for i in range(0, len(animals), self.batch_size):
            batch = animals[i : i + self.batch_size]
            batches.append(batch)

        self.logger.info(f"Split {len(animals)} animals into {len(batches)} batches of size {self.batch_size}")

        # Process batches with reduced concurrency
        max_workers = min(2, len(batches))  # MAX 2 THREADS to prevent overwhelming

        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all batches
            future_to_batch = {executor.submit(process_animal_batch, batch): i for i, batch in enumerate(batches)}

            # Collect results as they complete with extended timeout
            for future in concurrent.futures.as_completed(future_to_batch):
                batch_index = future_to_batch[future]
                try:
                    batch_results = future.result(timeout=600)  # 10 minute timeout per batch
                    all_dogs_data.extend(batch_results)
                    self.logger.info(f"Completed batch {batch_index + 1}/{len(batches)}: {len(batch_results)} animals processed")
                except Exception as e:
                    self.logger.error(f"Batch {batch_index + 1} failed: {e}")
                    continue

        return all_dogs_data

    def collect_data(self) -> List[Dict[str, Any]]:
        """Collect all available dog data from listing pages.

        This method implements the BaseScraper template method pattern.
        It extracts dogs from all listing pages using pagination, then
        scrapes detailed information for each dog. Supports skip_existing_animals
        and batch_size parallelism configuration parameters.

        Returns:
            List of dog data dictionaries for database storage
        """
        try:
            # Phase 1: Get and filter animals
            animals = self._get_filtered_animals()
            if not animals:
                return []

            # Phase 2: Process animals in parallel with individual WebDrivers per thread
            all_dogs_data = self._process_animals_parallel(animals)

            self.logger.info(f"Total unique dogs collected: {len(all_dogs_data)}")
            return all_dogs_data

        except Exception as e:
            self.logger.error(f"Error collecting data from Many Tears Rescue: {e}")
            return []

    def get_animal_list(self) -> List[Dict[str, Any]]:
        """Fetch list of available dogs using Selenium WebDriver with pagination.

        Handles Cloudflare Bot Management by using headless Chrome with proper options.
        Iterates through all pages dynamically detecting the maximum page count.

        Returns:
            List of dictionaries containing basic dog information from all pages
        """
        driver = None
        all_dogs = []

        try:
            driver = self._setup_selenium_driver()

            # Start with page 1 to detect max pages
            page_num = 1
            max_pages = None
            consecutive_empty_pages = 0
            max_empty_pages = 2  # Stop after 2 consecutive empty pages

            while True:
                try:
                    if page_num == 1:
                        url = self.listing_url
                    else:
                        url = f"{self.listing_url}?page={page_num}"

                    self.logger.info(f"Fetching page {page_num}: {url}")

                    # Load page with retry logic
                    page_loaded = False
                    for retry in range(3):
                        try:
                            driver.get(url)

                            # Wait for page to load with random delay
                            wait_time = random.uniform(3, 7)
                            time.sleep(wait_time)

                            # Verify page loaded by checking for dog cards
                            WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "a[href*='/adopt/dogs/']")))
                            page_loaded = True
                            break
                        except TimeoutException:
                            self.logger.warning(f"Timeout on page {page_num}, retry {retry + 1}/3")
                            if retry < 2:
                                time.sleep(2 ** (retry + 1))  # Exponential backoff
                            continue

                    if not page_loaded:
                        self.logger.error(f"Failed to load page {page_num} after 3 retries")
                        break

                    # Random human-like scroll
                    driver.execute_script("window.scrollTo(0, document.body.scrollHeight * 0.3);")
                    time.sleep(random.uniform(0.5, 1.5))
                    driver.execute_script("window.scrollTo(0, document.body.scrollHeight * 0.6);")
                    time.sleep(random.uniform(0.5, 1.5))
                    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")

                    # Parse the page content
                    soup = BeautifulSoup(driver.page_source, "html.parser")

                    # Detect max pages from pagination links on first page
                    if max_pages is None:
                        max_pages = self._detect_max_pages(soup)
                        self.logger.info(f"Detected maximum pages: {max_pages}")

                    # Extract dogs from current page
                    page_dogs = self._extract_dogs_from_page(soup)
                    if page_dogs:
                        all_dogs.extend(page_dogs)
                        self.logger.info(f"Found {len(page_dogs)} dogs on page {page_num}")
                        consecutive_empty_pages = 0
                    else:
                        self.logger.warning(f"No dogs found on page {page_num}")
                        consecutive_empty_pages += 1

                        # Stop if too many empty pages
                        if consecutive_empty_pages >= max_empty_pages:
                            self.logger.info(f"Stopping after {max_empty_pages} consecutive empty pages")
                            break

                    # Check if we should continue to next page
                    if page_num >= max_pages:
                        self.logger.info(f"Reached max page {max_pages}")
                        break

                    page_num += 1

                    # Rate limiting between page requests with random delay
                    if page_num <= max_pages:
                        delay = random.uniform(self.rate_limit_delay + 2, self.rate_limit_delay + 5)
                        self.logger.debug(f"Waiting {delay:.1f}s before next page...")
                        time.sleep(delay)

                except Exception as e:
                    self.logger.error(f"Error processing page {page_num}: {e}")
                    consecutive_empty_pages += 1
                    if consecutive_empty_pages >= max_empty_pages:
                        break
                    continue

        except Exception as e:
            self.logger.error(f"Error during pagination scraping: {e}")
        finally:
            if driver:
                try:
                    driver.quit()
                except:
                    pass

        self.logger.info(f"Total dogs collected across all pages: {len(all_dogs)}")
        return all_dogs

    def _get_chrome_options(self):
        """Get standardized Chrome options for Cloudflare bypass.

        Centralized Chrome configuration to avoid code duplication.
        Uses comprehensive options optimized for bot detection bypass.

        Returns:
            Configured Chrome Options instance
        """
        chrome_options = Options()

        # Core headless settings
        chrome_options.add_argument("--headless=new")  # Use new headless mode
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")

        # Random viewport size for fingerprint variation
        width = random.randint(1366, 1920)
        height = random.randint(768, 1080)
        chrome_options.add_argument(f"--window-size={width},{height}")

        # Anti-detection arguments
        chrome_options.add_argument("--disable-blink-features=AutomationControlled")
        chrome_options.add_argument("--disable-features=IsolateOrigins,site-per-process")
        chrome_options.add_argument("--disable-web-security")
        chrome_options.add_argument("--disable-features=VizDisplayCompositor")
        chrome_options.add_argument("--disable-dev-tools")
        chrome_options.add_argument("--disable-extensions")
        chrome_options.add_argument("--disable-plugins")
        chrome_options.add_argument("--disable-images")  # Faster loading
        chrome_options.add_argument("--disable-javascript")  # Then re-enable selectively

        # Random user agent
        user_agent = random.choice(self.USER_AGENTS)
        chrome_options.add_argument(f"--user-agent={user_agent}")

        # Additional stealth options
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option("useAutomationExtension", False)

        # Disable logging to reduce detection
        chrome_options.add_experimental_option("excludeSwitches", ["enable-logging"])
        chrome_options.add_argument("--log-level=3")
        chrome_options.add_argument("--silent")

        # Performance optimizations
        prefs = {
            "profile.default_content_setting_values": {
                "images": 2,  # Block images
                "plugins": 2,  # Block plugins
                "popups": 2,  # Block popups
                "geolocation": 2,  # Block location
                "notifications": 2,  # Block notifications
                "media_stream": 2,  # Block media stream
            },
            "profile.managed_default_content_settings": {"images": 2},
        }
        chrome_options.add_experimental_option("prefs", prefs)

        return chrome_options

    def _setup_selenium_driver(self):
        """Setup Selenium WebDriver with Cloudflare bypass options.

        Uses centralized browser service that auto-detects environment:
        - Local: Uses Chrome with CDP stealth commands
        - Railway: Uses Browserless (CDP stealth not available)

        Returns:
            Configured WebDriver instance
        """
        browser_service = get_browser_service()

        width = random.randint(1366, 1920)
        height = random.randint(768, 1080)

        browser_options = BrowserOptions(
            headless=True,
            window_size=(width, height),
            user_agent=random.choice(self.USER_AGENTS),
            random_user_agent=False,
            page_load_timeout=60,
            implicit_wait=10,
            stealth_mode=True,
            disable_images=True,
        )

        browser_result = browser_service.create_driver(browser_options)
        self._browser_supports_cdp = browser_result.supports_cdp

        if browser_result.supports_cdp:
            self.logger.debug("Using local Chrome with CDP stealth mode")
        else:
            self.logger.info("Using remote Browserless (CDP stealth not available)")

        return browser_result.driver

    def _detect_max_pages(self, soup: BeautifulSoup) -> int:
        """Detect maximum page count from pagination links.

        Args:
            soup: BeautifulSoup object of the listing page

        Returns:
            Maximum page number detected (defaults to 1 if no pagination found)
        """
        # Look for pagination links with pattern ?page=N
        page_links = soup.find_all("a", href=re.compile(r"\?page=\d+"))
        page_numbers = []

        for link in page_links:
            if isinstance(link, Tag):
                href = link.get("href", "")
                href_str = str(href) if href else ""
                match = re.search(r"page=(\d+)", href_str)
                if match:
                    page_numbers.append(int(match.group(1)))

        # Return highest page number found, default to 1
        return max(page_numbers) if page_numbers else 1

    def _extract_dogs_from_page(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """Extract dog information from a single listing page.

        Uses CSS selectors identified in Session 1 analysis:
        - Dog cards: a[href*='/adopt/dogs/']
        - Dog names: h3 elements within cards

        Args:
            soup: BeautifulSoup object of the listing page

        Returns:
            List of dog data dictionaries with basic information
        """
        dogs = []

        # Find all dog card links using Session 1 selectors
        dog_links = soup.find_all("a", href=re.compile(r"/adopt/dogs/\d+/$"))

        for link in dog_links:
            try:
                dog_data = self._extract_card_data(link)
                if dog_data:
                    dogs.append(dog_data)
            except Exception as e:
                self.logger.warning(f"Failed to extract data from dog card: {e}")
                continue

        return dogs

    def _extract_card_data(self, link_element) -> Dict[str, Any]:
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

        # Extract dog name from h3 element
        name_elem = link_element.find("h3")
        name = name_elem.text.strip() if name_elem else "Unknown"

        # Extract external ID from URL (e.g., /adopt/dogs/2604/ -> "2604")
        external_id = self._extract_external_id_from_url(adoption_url)

        # Basic dog data structure with required fields
        dog_data = {
            "name": name,
            "adoption_url": adoption_url,
            "external_id": external_id,
            "animal_type": "dog",
            "status": "available",
            # Default values for required fields (will be enriched in detail scraping)
            "breed": "Mixed Breed",
            "size": None,  # Let unified standardization handle defaults
            "age": "Unknown",
            "sex": "Unknown",
            "location": "Wales, UK",
            "description": "",
            "requirements": "",
            "medical_info": "",
        }

        return dog_data

    def _extract_external_id_from_url(self, url: str) -> str:
        """Extract external ID from adoption URL.

        Args:
            url: Full adoption URL (e.g., https://www.manytearsrescue.org/adopt/dogs/2604/)

        Returns:
            External ID string (e.g., "2604")
        """
        # Extract ID from URL pattern /adopt/dogs/{id}/
        match = re.search(r"/adopt/dogs/(\d+)/?$", url)
        return match.group(1) if match else url.split("/")[-2] if url.split("/")[-2].isdigit() else "unknown"

    def _scrape_animal_details(self, adoption_url: str, driver=None) -> Dict[str, Any]:
        """Scrape detailed information from individual dog page using Selenium.

        Extracts comprehensive data including name, requirements sections, diary entries,
        compatibility sections, description, and hero image following the detailed
        requirements for comprehensive data extraction.

        Args:
            adoption_url: URL of the individual dog adoption page
            driver: Optional WebDriver instance (for testing)

        Returns:
            Dictionary with detailed dog information following BaseScraper format
        """
        local_driver = None
        try:
            self.logger.debug(f"Scraping details from: {adoption_url}")

            # Use provided driver (for testing) or create new one
            if driver is None:
                # Use browser service for driver creation
                local_driver = self._setup_selenium_driver()
                driver = local_driver
                driver.get(adoption_url)
                time.sleep(2)
            else:
                # Using shared WebDriver - navigate to the URL
                driver.get(adoption_url)
                time.sleep(2)

            # Parse HTML with BeautifulSoup
            soup = BeautifulSoup(driver.page_source, "html.parser")

            # Extract core fields
            name = self._extract_name(soup)
            hero_image_url = self._extract_hero_image(soup)
            description = self._extract_description(soup)

            # Extract structured data (age, breed, sex) from DOM
            structured_data = self._extract_structured_data_from_detail_page(soup)

            # Extract properties using comprehensive extraction methods
            properties = {}

            # Add structured data to properties
            properties.update(structured_data)

            # Extract 6 requirements sections
            requirements = self._extract_requirements_sections(soup)
            properties.update(requirements)

            # Extract diary entries (optional)
            diary_entries = self._extract_diary_entries(soup, driver=driver)
            if diary_entries:
                properties["diary_entries"] = diary_entries

            # Extract compatibility sections (optional)
            compatibility = self._extract_compatibility_sections(soup)
            properties.update(compatibility)

            # Filter sponsor text from description
            description = self._filter_sponsor_text(description)

            # CRITICAL FIX: Store description in properties so it gets saved to database
            properties["description"] = description or ""

            # Size will be handled in the field extraction section below

            # Build result following SanterPaws pattern with Zero NULLs compliance
            result = {
                "name": name or "Unknown",
                "description": description or "",
                "primary_image_url": hero_image_url,
                "original_image_url": hero_image_url,
                "properties": properties,
                "animal_type": "dog",
                "status": "available",
                "location": "Wales, UK",
            }

            # Extract individual fields from structured_data for compatibility with BaseScraper
            # Zero NULLs compliance - always provide defaults
            result["breed"] = structured_data.get("breed") or "Mixed Breed"
            result["sex"] = structured_data.get("sex") or "Unknown"
            result["age"] = structured_data.get("age") or "Unknown"
            result["age_text"] = structured_data.get("age_text") or structured_data.get("age") or "Unknown"

            # Size will be handled by unified standardization
            result["size"] = structured_data.get("size")

            # Add image_urls for R2 integration
            if hero_image_url:
                result["image_urls"] = [hero_image_url]
            else:
                result["image_urls"] = []

            # Apply unified standardization
            result = self.process_animal(result)

            self.logger.debug(f"Successfully extracted details for {name}")
            return result

        except Exception as e:
            self.logger.error(f"Error scraping details from {adoption_url}: {e}")
            return {}
        finally:
            if local_driver:
                local_driver.quit()

    def _extract_name(self, soup: BeautifulSoup) -> str:
        """Extract dog name from h1 heading.

        Args:
            soup: BeautifulSoup object of the detail page

        Returns:
            Dog name or empty string if not found
        """
        name_element = soup.find("h1")
        if name_element:
            return name_element.get_text(strip=True)
        return ""

    def _extract_hero_image(self, soup: BeautifulSoup) -> str:
        """Extract hero image URL from main content area.

        Args:
            soup: BeautifulSoup object of the detail page

        Returns:
            Hero image URL or empty string if not found
        """
        # Look for images in main content, excluding icons and small images
        images = soup.find_all("img")
        for img in images:
            if isinstance(img, Tag):
                src = img.get("src", "")
                src_str = str(src) if src else ""
            else:
                continue
            if "animal_images" in src_str and not src_str.endswith(".svg"):
                # Make URL absolute if needed
                if src_str.startswith("/"):
                    return f"{self.base_url}{src_str}"
                return src_str
        return ""

    def _extract_description(self, soup: BeautifulSoup) -> str:
        """Extract main description text from paragraph elements.

        Args:
            soup: BeautifulSoup object of the detail page

        Returns:
            Description text or empty string if not found
        """
        description_parts = []

        for p in soup.find_all("p"):
            # Skip paragraphs inside ul elements (these are requirements)
            if p.find_parent("ul"):
                continue

            # Skip paragraphs that come immediately after compatibility H1 headings
            # (like "Can live with other dogs", "Cat friendly")
            prev_h1 = p.find_previous_sibling("h1")
            if prev_h1:
                h1_text = prev_h1.get_text(strip=True).lower()
                if "can live with" in h1_text or "cat friendly" in h1_text:
                    continue

            text = p.get_text(strip=True)
            if text and len(text) > 30:  # Filter out short snippets
                # Skip footer, metadata, and sponsor sections
                if not any(
                    skip_text in text.lower()
                    for skip_text in ["many tears animal rescue, registered charity", "privacy policy", "cookie policy", "terms & conditions", "through the generosity of a gift of life sponsor"]
                ):
                    description_parts.append(text)

        return " ".join(description_parts)

    def _extract_structured_data_from_detail_page(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """Extract structured data (age, breed, sex) from detail page list items.

        Based on DOM analysis, structured data appears in a list format:
        - Available for Adoption (status)
        - 7 years (age)
        - Male (sex)
        - Shih Tzu (breed)
        - Location info
        - Compatibility info

        Args:
            soup: BeautifulSoup object of the detail page

        Returns:
            Dictionary with extracted structured data
        """
        structured_data = {}

        # Find the main info list - look for the list containing the basic info
        # Based on Playwright analysis, this appears after the donation amount
        info_lists = soup.find_all("ul")

        for ul in info_lists:
            if not isinstance(ul, Tag):
                continue
            items = ul.find_all("li")
            if len(items) >= 4:  # Should have at least status, age, sex, breed
                list_texts = [item.get_text(strip=True) for item in items]

                # Check if this looks like the main info list
                # Look for patterns like "X years", "Male/Female", breed names
                has_age_pattern = any("year" in text.lower() or "month" in text.lower() or "week" in text.lower() for text in list_texts)
                has_gender_pattern = any(text.lower() in ["male", "female"] for text in list_texts)

                if has_age_pattern and has_gender_pattern:
                    # Process each list item
                    for i, text in enumerate(list_texts):
                        text_lower = text.lower()

                        # Age extraction
                        if ("year" in text_lower or "month" in text_lower or "week" in text_lower) and text_lower not in ["male", "female"]:
                            # Store raw age text for unified standardization
                            structured_data["age"] = text

                        # Gender extraction
                        elif text_lower in ["male", "female"]:
                            structured_data["sex"] = text

                        # Breed extraction - typically appears after age and gender
                        elif (
                            i >= 2  # Should come after status, age, gender
                            and text_lower not in ["available for adoption", "male", "female"]
                            and not text_lower.startswith("in foster")
                            and not text_lower.startswith("can live with")
                            and not text_lower.startswith("untested with")
                            and not text_lower.startswith("no cats")
                            and
                            # Exclude location patterns that were being extracted as breeds
                            not ("many tears" in text_lower and ("llanelli" in text_lower or "carmarthen" in text_lower))
                            and not (", " in text and len(text.split(", ")) >= 3)  # Location format: "City, County, Country"
                            and not text_lower.endswith(" uk")  # UK location indicators
                            and not text_lower.endswith(" wales")
                            and len(text) > 2
                            and len(text) < 50
                        ):  # Reasonable breed name length

                            # Store raw breed for unified standardization
                            structured_data["breed"] = text

                    break  # Found the main info list, stop looking

        return structured_data

    def _extract_requirements_sections(self, soup: BeautifulSoup) -> Dict[str, str]:
        """Extract the 6 requirements sections from the structured list.

        Based on Playwright analysis, these are in a ul > li structure where
        each li contains an img with alt text and a p with the requirement text.
        However, the real website structure may differ, so we implement fallback strategies.

        Args:
            soup: BeautifulSoup object of the detail page

        Returns:
            Dictionary mapping requirement categories to their descriptions
        """
        requirements = {}

        # Strategy 1: Original test-based structure (ul > li with img + p)
        requirement_lists = soup.find_all("ul")

        for ul in requirement_lists:
            if not isinstance(ul, Tag):
                continue
            items = ul.find_all("li")
            if len(items) == 6:  # The requirements list has exactly 6 items
                for li in items:
                    if not isinstance(li, Tag):
                        continue
                    img = li.find("img")
                    p = li.find("p")

                    if img and p:
                        alt_text = img.get("alt", "") if hasattr(img, "get") else ""
                        requirement_text = p.get_text(strip=True)

                        # Map alt text to property keys
                        if "human family" in alt_text.lower():
                            requirements["human_family_requirements"] = requirement_text
                        elif "other pet" in alt_text.lower():
                            requirements["other_pet_requirements"] = requirement_text
                        elif "house and garden" in alt_text.lower():
                            requirements["house_garden_requirements"] = requirement_text
                        elif "out and about" in alt_text.lower():
                            requirements["out_about_requirements"] = requirement_text
                        elif "training" in alt_text.lower():
                            requirements["training_needs"] = requirement_text
                        elif "medical" in alt_text.lower():
                            requirements["medical_issues"] = requirement_text

                # If we found requirements using Strategy 1, return them
                if requirements:
                    break

        # Strategy 2: Optimized text pattern matching (O(n) instead of O(n²))
        if not requirements:
            # Define expected text patterns for each requirement category
            requirement_patterns = {
                "human_family_requirements": ["calm and quiet home", "adult only home", "quiet home", "family requirements"],
                "other_pet_requirements": ["at least one other dog", "resident dog", "other dog", "other pet", "live with a male dog", "haven't met cats", "met cats fine"],
                "house_garden_requirements": ["secure garden", "garden", "house and garden"],
                "out_about_requirements": ["walk on a lead", "walks", "out and about", "adventures"],
                "training_needs": ["house training", "never lived in a home", "training"],
                "medical_issues": ["ready for my forever home", "ready to find my forever home", "medical", "neutered"],
            }

            # OPTIMIZATION: Collect all paragraph elements once (O(n))
            all_paragraphs = soup.find_all(["p", "div", "span"])

            # Single pass through paragraphs for all patterns (O(n) instead of O(n²))
            for element in all_paragraphs:
                element_text = element.get_text(strip=True)
                if len(element_text) <= 20:  # Skip short text
                    continue

                element_text_lower = element_text.lower()

                # Check all patterns against this element
                for req_key, patterns in requirement_patterns.items():
                    if req_key in requirements:  # Already found this requirement
                        continue

                    # Check if any pattern matches this element
                    for pattern in patterns:
                        if pattern.lower() in element_text_lower:
                            requirements[req_key] = element_text
                            break  # Found match for this requirement

                    if req_key in requirements:  # Break out of patterns loop
                        break

        # Strategy 3: Optimized fallback search if Strategy 2 didn't find all 6
        if len(requirements) < 6:
            # Search for key phrases that should uniquely identify each requirement
            remaining_patterns = {
                "human_family_requirements": ["calm", "quiet", "adult only"],
                "other_pet_requirements": ["other dog", "resident", "cats"],
                "house_garden_requirements": ["garden", "secure"],
                "out_about_requirements": ["walk", "lead", "walks"],
                "training_needs": ["training", "house training", "home"],
                "medical_issues": ["ready", "forever home", "medical", "neutered"],
            }

            # OPTIMIZATION: Reuse paragraph elements from Strategy 2 (avoid re-scanning DOM)
            if "all_paragraphs" not in locals():
                all_paragraphs = soup.find_all("p")

            # Single pass through paragraphs for remaining patterns
            for p in all_paragraphs:
                p_text = p.get_text(strip=True)
                if len(p_text) <= 15:  # Skip short text
                    continue

                p_text_lower = p_text.lower()

                # Check remaining requirements
                for req_key, patterns in remaining_patterns.items():
                    if req_key not in requirements:  # Only check missing requirements
                        if any(pattern.lower() in p_text_lower for pattern in patterns):
                            requirements[req_key] = p_text
                            break  # Found match, move to next paragraph

        return requirements

    def _extract_diary_entries(self, soup: BeautifulSoup, driver=None) -> Dict[str, str]:
        """Extract diary entries from the optional diary section.

        Diary entries appear as clickable buttons with dates that expand to show full content.
        Uses WebDriver to click buttons and extract expanded diary text.

        Args:
            soup: BeautifulSoup object of the detail page
            driver: Optional WebDriver instance for clicking diary buttons

        Returns:
            Dictionary mapping dates to full diary entry content
        """
        diary_entries: Dict[str, str] = {}

        # Find diary heading first
        diary_heading = None
        for h2 in soup.find_all("h2"):
            if "diary" in h2.get_text(strip=True).lower():
                diary_heading = h2
                break

        if not diary_heading:
            return diary_entries

        # Find the diary list after the heading
        ul = diary_heading.find_next("ul")
        if not ul:
            return diary_entries

        # If no driver available, fall back to basic extraction
        if not driver:
            buttons = ul.find_all("button") if isinstance(ul, Tag) else []
            for button in buttons:
                button_text = button.get_text(strip=True)
                if button_text:
                    # Extract date from button text if possible
                    date_match = re.match(r"^(\d{2}-\d{2}-\d{2})\s+(.+)$", button_text)
                    if date_match:
                        date = date_match.group(1)
                        title = date_match.group(2)
                        diary_entries[date] = f"Title: {title} (Full content requires WebDriver)"
                    else:
                        diary_entries[button_text] = "Title only extracted"
            return diary_entries

        # Enhanced WebDriver-based diary extraction
        try:
            # Find all diary buttons using WebDriver
            diary_buttons = driver.find_elements(By.XPATH, "//h2[contains(translate(text(), 'DIARY', 'diary'), 'diary')]/following-sibling::ul//button")

            for button_element in diary_buttons:
                try:
                    # Get button text to extract date and title
                    button_text = button_element.text.strip()
                    if not button_text:
                        continue

                    # Extract date from button text
                    date_match = re.match(r"^(\d{2}-\d{2}-\d{2})\s+(.+)$", button_text)
                    if date_match:
                        diary_date = date_match.group(1)
                        diary_title = date_match.group(2)
                    else:
                        # Use full text as key if no date pattern
                        diary_date = button_text
                        diary_title = button_text

                    # Click the diary button to expand content
                    driver.execute_script("arguments[0].scrollIntoView();", button_element)
                    time.sleep(0.5)  # Brief pause for scroll

                    # Click using JavaScript to avoid interception issues
                    driver.execute_script("arguments[0].click();", button_element)

                    # Wait for content to expand
                    time.sleep(1)

                    # Extract expanded diary content from the same li element
                    # Look for paragraphs that appear after clicking
                    parent_li = button_element.find_element(By.XPATH, "./ancestor::li[1]")
                    diary_paragraphs = parent_li.find_elements(By.XPATH, ".//p")

                    diary_content_parts = []
                    for p in diary_paragraphs:
                        p_text = p.text.strip()
                        # Filter out button text and short snippets
                        if p_text and len(p_text) > 20 and p_text != button_text:
                            diary_content_parts.append(p_text)

                    # Store diary entry
                    if diary_content_parts:
                        full_diary_content = "\n\n".join(diary_content_parts)
                        diary_entries[diary_date] = full_diary_content
                        self.logger.debug(f"Extracted diary entry for {diary_date}: {len(full_diary_content)} chars")
                    else:
                        # Fallback to title if no content found
                        diary_entries[diary_date] = f"Title: {diary_title}"

                except Exception as button_error:
                    self.logger.warning(f"Failed to extract diary entry from button '{button_text}': {button_error}")
                    continue

        except Exception as e:
            self.logger.warning(f"Error during WebDriver diary extraction: {e}")
            # Fallback to basic extraction without clicking - re-parse with BeautifulSoup
            if driver:
                soup_fallback = BeautifulSoup(driver.page_source, "html.parser")
                diary_heading_fallback = None
                for h2 in soup_fallback.find_all("h2"):
                    if "diary" in h2.get_text(strip=True).lower():
                        diary_heading_fallback = h2
                        break
                if diary_heading_fallback:
                    ul_fallback = diary_heading_fallback.find_next("ul")
                    if ul_fallback and hasattr(ul_fallback, "find_all"):
                        buttons = ul_fallback.find_all("button")
                        for button in buttons:
                            button_text = button.get_text(strip=True)
                            if button_text:
                                diary_entries[button_text] = "Fallback: WebDriver extraction failed"

        return diary_entries

    def _extract_compatibility_sections(self, soup: BeautifulSoup) -> Dict[str, str]:
        """Extract compatibility sections from h1 headings.

        Based on Playwright analysis, compatibility sections are h1 elements
        with titles like "Can live with other dogs", "Cat friendly" followed
        by paragraph descriptions.

        Args:
            soup: BeautifulSoup object of the detail page

        Returns:
            Dictionary mapping compatibility types to descriptions
        """
        compatibility = {}

        # Find all h1 elements that might be compatibility sections
        h1_elements = soup.find_all("h1")

        for h1 in h1_elements:
            heading_text = h1.get_text(strip=True).lower()

            # Check for compatibility section patterns
            if "can live with" in heading_text and "dog" in heading_text:
                next_p = h1.find_next("p")
                if next_p:
                    compatibility["can_live_with_dogs"] = next_p.get_text(strip=True)

            elif "cat friendly" in heading_text:
                next_p = h1.find_next("p")
                if next_p:
                    compatibility["cat_friendly"] = next_p.get_text(strip=True)

        return compatibility

    def _filter_sponsor_text(self, description: str) -> str:
        """Filter out Gift of Life sponsor text from description.

        Removes patterns like "Gift of Life by [Name]" and standalone sponsor sections.

        Args:
            description: Raw description text

        Returns:
            Filtered description text
        """
        if not description:
            return description

        # Split into sentences and filter out sponsor sentences
        sentences = []
        for sentence in description.split("."):
            sentence = sentence.strip()
            if sentence:
                # Skip sentences containing Gift of Life sponsor text
                sentence_lower = sentence.lower()
                if "gift of life by" in sentence_lower or "through the generosity of a gift of life sponsor" in sentence_lower:
                    continue
                sentences.append(sentence)

        # Rejoin sentences
        result = ". ".join(sentences)
        if result and not result.endswith("."):
            result += "."

        # Clean up extra whitespace
        result = " ".join(result.split())

        return result
