"""Scraper implementation for Dogs Trust organization."""

import concurrent.futures
import random
import re
import time
from threading import Lock
from typing import Any, Dict, List

import requests
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.wait import WebDriverWait

from scrapers.base_scraper import BaseScraper


class DogsTrustScraper(BaseScraper):
    """Scraper for Dogs Trust organization.

    Dogs Trust uses JavaScript-rendered listing pages requiring Selenium WebDriver
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
        self.listing_url = f"{self.base_url}/rehoming/dogs"
        self.organization_name = self.org_config.name

    def _get_filtered_animals(self, max_pages_to_scrape: int = None) -> List[Dict[str, Any]]:
        """Get list of animals and apply skip_existing_animals filtering.

        This method follows the Many Tears pattern for filtering existing animals
        to avoid re-scraping data that's already in the database.

        Returns:
            List of filtered animals ready for detail scraping
        """
        # Get list of available dogs from all listing pages
        animals = self.get_animal_list(max_pages_to_scrape=max_pages_to_scrape)

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
        """Process animals in parallel batches using ThreadPoolExecutor.

        This method follows the Many Tears pattern for parallel processing,
        but uses HTTP requests instead of Selenium for detail pages since
        Dogs Trust detail pages don't require JavaScript rendering.

        Args:
            animals: List of animals to process

        Returns:
            List of processed animals with detailed data
        """
        all_dogs_data = []
        seen_urls = set()  # Track URLs to prevent duplicates

        self.logger.info(f"Starting detail scraping for {len(animals)} animals using batch_size={self.batch_size}")

        # Thread-safe collections
        results_lock = Lock()

        def process_animal_batch(animal_batch):
            """Process a batch of animals using HTTP requests"""
            batch_results = []

            try:
                for animal in animal_batch:
                    adoption_url = animal["adoption_url"]

                    # Skip duplicates - atomic check and add to prevent race condition
                    with results_lock:
                        if adoption_url in seen_urls:
                            self.logger.debug(f"Skipping duplicate dog: {animal.get('name', 'unknown')} ({adoption_url})")
                            continue
                        seen_urls.add(adoption_url)
                    # Lock released here - now safe to process without holding lock

                    try:
                        # Rate limiting with randomization for natural browsing pattern
                        time.sleep(self.rate_limit_delay + random.uniform(-0.2, 0.3))

                        # Extract detailed data via HTTP requests (faster than Selenium)
                        detail_data = self._scrape_animal_details_http(adoption_url)

                        if detail_data:
                            # Merge detail data with listing data (detail data takes precedence)
                            animal.update(detail_data)

                        batch_results.append(animal)

                    except Exception as e:
                        self.logger.error(f"Failed to process {animal.get('name', 'unknown')}: {e}")
                        # Continue processing other animals on individual failures
                        continue

            except Exception as e:
                self.logger.error(f"Error in batch processing: {e}")

            return batch_results

        # Split animals into batches based on batch_size
        batches = []
        for i in range(0, len(animals), self.batch_size):
            batch = animals[i : i + self.batch_size]
            batches.append(batch)

        self.logger.info(f"Split {len(animals)} animals into {len(batches)} batches of size {self.batch_size}")

        # Process batches with controlled concurrency
        max_workers = min(self.batch_size, 5)  # Increased parallelization for better performance

        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all batches
            future_to_batch = {executor.submit(process_animal_batch, batch): i for i, batch in enumerate(batches)}

            # Collect results as they complete
            for future in concurrent.futures.as_completed(future_to_batch):
                batch_index = future_to_batch[future]
                try:
                    batch_results = future.result(timeout=300)  # 5 minute timeout per batch
                    all_dogs_data.extend(batch_results)
                    self.logger.info(f"Completed batch {batch_index + 1}/{len(batches)}: {len(batch_results)} animals processed")
                except Exception as e:
                    self.logger.error(f"Batch {batch_index + 1} failed: {e}")
                    continue

        return all_dogs_data

    def collect_data(self, max_pages_to_scrape: int = None) -> List[Dict[str, Any]]:
        """Collect all available dog data from listing pages.

        This method implements the BaseScraper template method pattern with
        enhanced parallel processing following the Many Tears Rescue pattern.

        It extracts dogs from all listing pages using Selenium with pagination,
        filters existing animals if configured, then scrapes detailed information
        for each dog using parallel HTTP requests.

        Returns:
            List of dog data dictionaries for database storage
        """
        try:
            # Phase 1: Get and filter animals
            animals = self._get_filtered_animals(max_pages_to_scrape=max_pages_to_scrape)
            if not animals:
                return []

            # Phase 2: Process animals in parallel with HTTP requests
            all_dogs_data = self._process_animals_parallel(animals)

            self.logger.info(f"Total unique dogs collected: {len(all_dogs_data)}")
            return all_dogs_data

        except Exception as e:
            self.logger.error(f"Error collecting data from Dogs Trust: {e}")
            return []

    def get_animal_list(self, max_pages_to_scrape: int = None) -> List[Dict[str, Any]]:
        """Fetch list of available dogs using Selenium WebDriver with pagination.

        Handles JavaScript-rendered listing pages by using headless Chrome.
        Applies filters to hide reserved dogs and iterates through all pages
        using navigation buttons.

        Args:
            max_pages_to_scrape: Optional limit on number of pages to scrape for debugging.
                                If None, scrapes all available pages.

        Returns:
            List of dictionaries containing basic dog information from all pages
        """
        driver = self._setup_selenium_driver()
        all_dogs = []

        # Log scraping mode
        if max_pages_to_scrape:
            self.logger.info(f"DEBUG MODE: Limiting scrape to {max_pages_to_scrape} pages")
        else:
            self.logger.info("Scraping all available pages")

        try:
            # Navigate to the initial page
            url = self.listing_url
            self.logger.debug(f"Loading initial page: {url}")
            driver.get(url)

            # Wait for initial page load
            wait = WebDriverWait(driver, 15)

            # Handle cookie consent banner if present
            try:
                # Quick check for cookie consent banner
                time.sleep(0.5)

                # Try to accept cookies if banner is present
                cookie_selectors = [
                    "//button[contains(text(), 'Accept all')]",
                    "//button[contains(text(), 'Accept All')]",
                    "//button[contains(text(), 'Accept')]",
                    "//button[@id='onetrust-accept-btn-handler']",
                    "//button[contains(@class, 'accept')]",
                    "//button[contains(@aria-label, 'accept')]",
                ]

                for selector in cookie_selectors:
                    try:
                        cookie_button = driver.find_element(By.XPATH, selector)
                        if cookie_button and cookie_button.is_displayed():
                            cookie_button.click()
                            self.logger.info("Accepted cookie consent")
                            time.sleep(0.3)  # Brief wait for banner to disappear
                            break
                    except:
                        continue

            except Exception as e:
                self.logger.debug(f"No cookie consent banner found or couldn't click: {e}")

            # Wait for the page to fully load and dog cards to appear
            try:
                wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, 'a[href*="/rehoming/dogs/"]')))
                self.logger.info("Initial page loaded successfully")
            except Exception as e:
                self.logger.warning(f"Timeout waiting for initial page load: {e}")

            # Apply filter to hide reserved dogs
            try:
                self.logger.info("Applying filter to hide reserved dogs...")

                # Look for and click the Filters button
                filters_button = None

                # Try multiple possible selectors for the filters button
                filter_selectors = [
                    "//button[contains(text(), 'Filters')]",
                    "//button[contains(text(), 'Filter')]",
                    "//button[contains(@aria-label, 'filter')]",
                    "//button[contains(@aria-label, 'Filter')]",
                    "//button[contains(@class, 'filter')]",
                    "//div[contains(@class, 'filter')]//button",
                    "//button[@data-testid='filters-button']",
                ]

                for selector in filter_selectors:
                    try:
                        filters_button = driver.find_element(By.XPATH, selector)
                        if filters_button and filters_button.is_displayed():
                            self.logger.debug(f"Found filters button with selector: {selector}")
                            break
                    except:
                        continue

                if filters_button:
                    # Scroll to and click the filters button using JavaScript to avoid overlay issues
                    driver.execute_script("arguments[0].scrollIntoView(true);", filters_button)
                    time.sleep(0.5)
                    # Use JavaScript click to bypass any overlapping elements
                    driver.execute_script("arguments[0].click();", filters_button)
                    self.logger.info("Clicked filters button")

                    # Wait for filter panel to open
                    time.sleep(1)

                    # Look for the "Hide reserved dogs" option
                    # Try multiple possible ways to find this option
                    reserved_selectors = [
                        "//label[contains(text(), 'Hide reserved')]",
                        "//label[contains(text(), 'hide reserved')]",
                        "//input[@type='checkbox'][contains(@name, 'reserved')]",
                        "//input[@type='checkbox'][contains(@id, 'reserved')]",
                        "//span[contains(text(), 'Hide reserved')]",
                        "//div[contains(text(), 'Hide reserved')]",
                        "//*[contains(text(), 'Available dogs only')]",
                        "//*[contains(text(), 'Show available')]",
                    ]

                    checkbox_clicked = False
                    for selector in reserved_selectors:
                        try:
                            element = driver.find_element(By.XPATH, selector)
                            if element:
                                # If it's a label, click it; if it's an input, check if it needs to be clicked
                                if element.tag_name == "input":
                                    if not element.is_selected():
                                        # Use JavaScript to click checkbox to avoid overlay issues
                                        driver.execute_script("arguments[0].click();", element)
                                        checkbox_clicked = True
                                        self.logger.info(f"Checked 'Hide reserved dogs' checkbox")
                                else:
                                    element.click()
                                    checkbox_clicked = True
                                    self.logger.info(f"Clicked 'Hide reserved dogs' option")
                                break
                        except:
                            continue

                    if checkbox_clicked:
                        # Apply the filter
                        apply_selectors = [
                            "//button[contains(text(), 'Show')]",
                            "//button[contains(text(), 'Apply')]",
                            "//button[contains(text(), 'Update')]",
                            "//button[contains(text(), 'Search')]",
                            "//button[contains(@type, 'submit')]",
                            "//button[@data-testid='apply-filters']",
                        ]

                        for selector in apply_selectors:
                            try:
                                apply_button = driver.find_element(By.XPATH, selector)
                                if apply_button and apply_button.is_displayed():
                                    # Use JavaScript to click apply button to avoid overlay issues
                                    driver.execute_script("arguments[0].click();", apply_button)
                                    self.logger.info("Applied filter to hide reserved dogs")
                                    # Wait for page to reload with filter applied
                                    time.sleep(1)
                                    break
                            except:
                                continue
                    else:
                        self.logger.warning("Could not find 'Hide reserved dogs' option")
                else:
                    self.logger.warning("Could not find filters button - proceeding without filter")

            except Exception as e:
                self.logger.warning(f"Could not apply filter to hide reserved dogs: {e}")
                self.logger.info("Proceeding without filter - will manually filter reserved dogs")

            # Add a bit of scrolling to trigger any lazy-loaded content
            try:
                self.logger.debug("Scrolling to trigger lazy-loaded content...")
                driver.execute_script("window.scrollTo(0, document.body.scrollHeight / 2);")
                time.sleep(0.3)
                driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                time.sleep(0.3)
                driver.execute_script("window.scrollTo(0, 0);")
                time.sleep(0.2)
            except Exception as e:
                self.logger.debug(f"Scrolling failed (not critical): {e}")

            # Track pagination
            page_num = 0
            max_pages = None
            pages_scraped = 0

            while True:
                # Parse the current page content
                soup = BeautifulSoup(driver.page_source, "html.parser")

                # Detect max pages from pagination indicator on first iteration
                if max_pages is None:
                    max_pages = self._detect_max_pages(soup)
                    self.logger.info(f"Detected maximum pages: {max_pages}")

                # Extract dogs from current page
                page_dogs = self._extract_dogs_from_page(soup)
                if page_dogs:
                    all_dogs.extend(page_dogs)
                    self.logger.info(f"Page {page_num}: Found {len(page_dogs)} dogs (total so far: {len(all_dogs)})")
                else:
                    self.logger.warning(f"Page {page_num}: No dogs found - may indicate JavaScript loading issue")

                pages_scraped += 1

                # Check if we've reached the debug limit
                if max_pages_to_scrape and pages_scraped >= max_pages_to_scrape:
                    self.logger.info(f"Reached debug limit of {max_pages_to_scrape} pages")
                    break

                # Check if we should continue to next page
                if max_pages is not None and page_num >= max_pages - 1:
                    self.logger.info(f"Reached last page ({max_pages} total)")
                    break

                # Try to navigate to the next page using the Next button
                try:
                    # Scroll down to ensure pagination controls are visible
                    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                    time.sleep(0.5)

                    # Find and click the Next button
                    next_button = None
                    next_selectors = [
                        "//button[@aria-label='Next']",
                        "//button[contains(@aria-label, 'Next')]",
                        "//button[contains(text(), 'Next') and not(@disabled)]",
                        "//button[contains(., 'Next') and not(@disabled)]",
                        "//a[contains(text(), 'Next') and not(contains(@class, 'disabled'))]",
                        "//button[@aria-label='Next page' and not(@disabled)]",
                        "//a[@aria-label='Next page']",
                        "//button[normalize-space()='Next']",
                    ]

                    for selector in next_selectors:
                        try:
                            next_button = driver.find_element(By.XPATH, selector)
                            if next_button and next_button.is_displayed():
                                break
                        except:
                            continue

                    if next_button:
                        self.logger.debug(f"Clicking Next button to navigate to page {page_num + 1}")
                        driver.execute_script("arguments[0].scrollIntoView(true);", next_button)
                        time.sleep(0.2)  # Brief pause for scroll
                        # Use JavaScript to click next button to avoid overlay issues
                        driver.execute_script("arguments[0].click();", next_button)

                        # Wait for the new page to load with randomized delay
                        time.sleep(self.rate_limit_delay + random.uniform(0, 0.5))  # Randomized delay for natural pattern

                        # Wait for new content to appear
                        try:
                            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, 'a[href*="/rehoming/dogs/"]')))
                        except:
                            self.logger.warning(f"Timeout waiting for page {page_num + 1} to load")

                        # Scroll to trigger lazy loading on the new page
                        driver.execute_script("window.scrollTo(0, document.body.scrollHeight / 2);")
                        time.sleep(0.2)
                        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                        time.sleep(0.2)

                        page_num += 1
                    else:
                        self.logger.info("No enabled Next button found - reached end of results")
                        break
                except Exception as e:
                    self.logger.info(f"Could not find or click Next button: {e} - assuming end of results")
                    break

        except Exception as e:
            self.logger.error(f"Error during pagination scraping: {e}")
        finally:
            driver.quit()

        self.logger.info(f"Total dogs collected across all pages: {len(all_dogs)}")
        return all_dogs

    def _setup_selenium_driver(self):
        """Setup Selenium Chrome WebDriver for JavaScript-rendered pages.

        Configures headless Chrome with options optimized for Dogs Trust site.
        Based on successful patterns from Many Tears Rescue implementation.

        Returns:
            Configured Chrome WebDriver instance
        """
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument("--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

        driver = webdriver.Chrome(options=chrome_options)
        driver.set_page_load_timeout(30)

        return driver

    def _detect_max_pages(self, soup: BeautifulSoup) -> int:
        """Detect maximum page count from pagination indicator.

        Looks for pagination text like "1 of 47" to determine total pages.
        Based on analysis findings showing 47 total pages.

        Args:
            soup: BeautifulSoup object of the listing page

        Returns:
            Maximum page number detected (defaults to 47 if not found)
        """
        # Look for pagination indicator with pattern "X of Y"
        elements = soup.find_all(string=re.compile(r"\d+ of \d+"))
        for element in elements:
            element_text = str(element).strip()
            match = re.search(r"(\d+) of (\d+)", element_text)
            if match:
                total_pages = int(match.group(2))
                self.logger.debug(f"Found pagination indicator: {element_text}")
                return total_pages

        # Fallback to analysis-discovered value
        self.logger.warning("Could not detect max pages, defaulting to 47")
        return 47

    def _extract_dogs_from_page(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
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

                # Check if this dog is reserved
                # Look for RESERVED indicator within the link element
                link_text = link.get_text(separator=" ", strip=True)
                if "RESERVED" in link_text:
                    self.logger.debug(f"Skipping reserved dog: {href}")
                    continue

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
            "age_text": "Unknown",
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

    def _scrape_animal_details_http(self, adoption_url: str) -> Dict[str, Any]:
        """Scrape detailed information from individual dog page using HTTP requests.

        Uses standard HTTP requests as analysis showed detail pages don't require JavaScript.
        Extracts comprehensive data following the field mappings from analysis phase.

        Args:
            adoption_url: URL of the individual dog adoption page

        Returns:
            Dictionary with detailed dog information following BaseScraper format
        """
        try:
            # Use HTTP requests for detail pages (faster than Selenium)
            headers = {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            }

            # Fix timeout configuration - use safe default if self.timeout is not an int
            timeout = getattr(self, "timeout", 30)
            if not isinstance(timeout, (int, float)):
                timeout = 30

            response = requests.get(adoption_url, headers=headers, timeout=timeout)
            response.raise_for_status()

            # Parse HTML with BeautifulSoup
            soup = BeautifulSoup(response.text, "html.parser")

            # Extract core fields using analysis-identified selectors
            name = self._extract_name(soup)
            breed = self._extract_breed(soup)
            age_text = self._extract_age(soup)
            sex = self._extract_sex(soup)
            size = self._extract_size(soup)
            location = self._extract_location(soup)
            description = self._extract_description(soup)
            primary_image_url = self._extract_primary_image(soup)

            # Note: Standardization will be applied later via process_animal()

            # BUILD PROPERTIES JSON following Many Tears Rescue pattern
            properties = {}

            # Add structured data from DOM (reference ID, basic info)
            structured_data = {}
            if breed:
                structured_data["breed"] = breed
            if age_text:
                structured_data["age_text"] = age_text
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

            # Extract behavioral traits (good with children/dogs/cats)
            try:
                behavioral_traits = self._extract_behavioral_traits(soup)
                properties.update(behavioral_traits)
            except Exception as e:
                self.logger.error(f"Error extracting behavioral traits: {e}")

            # CRITICAL: Store description in properties (Many Tears pattern)
            properties["description"] = description or ""

            # Build raw result for unified standardization processing
            raw_result = {
                "name": name or "Unknown",
                "breed": breed or "Mixed Breed",
                "age": age_text or "Unknown",  # Changed from age_text to age for standardization
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

            # Add image_urls for R2 integration
            if primary_image_url:
                raw_result["image_urls"] = [primary_image_url]
            else:
                raw_result["image_urls"] = []

            # Apply unified standardization
            return self.process_animal(raw_result)

        except Exception as e:
            self.logger.error(f"Error scraping details from {adoption_url}: {e}")
            return {}

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

    def _extract_description(self, soup: BeautifulSoup) -> str:
        """Extract description from two-part pattern identified in analysis.

        Combines "Are you right for [Name]?" and "Is [Name] right for you?" sections.
        """
        description_parts = []

        # Find the two description sections
        h2_elements = soup.find_all("h2")
        for h2 in h2_elements:
            h2_text = h2.get_text(strip=True)

            if "Are you right for" in h2_text:
                # Get the following paragraph
                next_p = h2.find_next("p")
                if next_p:
                    text = next_p.get_text(strip=True)
                    # Normalize smart quotes and special characters
                    text = self._normalize_text(text)
                    description_parts.append(text)

            elif "right for you" in h2_text:
                # Get the following paragraph
                next_p = h2.find_next("p")
                if next_p:
                    text = next_p.get_text(strip=True)
                    # Normalize smart quotes and special characters
                    text = self._normalize_text(text)
                    description_parts.append(text)

        # Combine parts with newline separator
        return "\n\n".join(description_parts) if description_parts else ""

    def _extract_primary_image(self, soup: BeautifulSoup) -> str:
        """Extract primary image URL from main carousel."""
        # Look for the main hero image in carousel
        images = soup.find_all("img")
        for img in images:
            # Check if img is a Tag object before calling get()
            if hasattr(img, "get"):
                src = img.get("src", "")
                alt = img.get("alt", "")

                # Main dog images typically have the dog name in alt text or are in specific containers
                # Fixed: Changed logic to INCLUDE dog images instead of excluding them
                if src and alt and len(alt) > 10:
                    # Make URL absolute if needed
                    if src.startswith("/"):
                        return f"{self.base_url}{src}"
                    return src

        return ""

    def _extract_additional_properties(self, soup: BeautifulSoup) -> Dict[str, Any]:
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

        # Extract compatibility information
        compatibility = self._extract_compatibility(soup)
        if compatibility:
            additional_properties.update(compatibility)

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
        medical_patterns = ["I need ongoing medical care", "ongoing medical care", "medical care"]

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

    def _extract_living_situation(self, soup: BeautifulSoup) -> Dict[str, str]:
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

    def _extract_compatibility(self, soup: BeautifulSoup) -> Dict[str, str]:
        """Extract compatibility information from Dogs Trust detail page.

        Looks for "May live with" label and extracts the associated value which
        typically contains links like "Dogs", "Primary school age children", etc.

        Args:
            soup: BeautifulSoup object of the detail page

        Returns:
            Dictionary with compatibility properties
        """
        compatibility = {}

        # Find all div elements that might contain the property
        property_containers = soup.find_all("div")

        for container in property_containers:
            container_text = container.get_text(strip=True)

            # Check if this container has "May live with" and is reasonably sized
            if "May live with" in container_text and len(container_text) < 300:
                # Look for links within this container (compatibility items are often links)
                links = container.find_all("a")
                if links:
                    # Extract text from all links that are compatibility values
                    compatibility_items = []
                    for link in links:
                        link_text = link.get_text(strip=True)
                        # Filter out navigation links
                        if link_text and len(link_text) < 50 and "May live with" not in link_text:
                            # Check if this looks like a compatibility value
                            if any(
                                word in link_text.lower()
                                for word in [
                                    "dog",
                                    "cat",
                                    "child",
                                    "primary",
                                    "secondary",
                                    "preschool",
                                ]
                            ):
                                compatibility_items.append(link_text)

                    if compatibility_items:
                        # Join multiple compatibility items
                        compatibility["may_live_with"] = ", ".join(compatibility_items)
                        break
                else:
                    # No links, try to extract value directly after "May live with"
                    if "May live with" in container_text:
                        parts = container_text.split("May live with")
                        if len(parts) > 1:
                            value = parts[1].strip().lstrip(":").strip()
                            # Take only the first 200 chars to avoid getting entire page
                            if value and len(value) < 200:
                                compatibility["may_live_with"] = value
                                break

        return compatibility

    def _extract_behavioral_traits(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """Extract behavioral traits (good with children/dogs/cats) from Dogs Trust detail page.

        Looks for "Can live with" section and parses the list items to determine
        compatibility with children, dogs, and cats.

        Args:
            soup: BeautifulSoup object of the detail page

        Returns:
            Dictionary with behavioral trait properties:
            - good_with_children: True/False/"Yes (age+)"
            - good_with_dogs: True/False/"Maybe"
            - good_with_cats: True/False/"Unknown"
        """
        traits = {"good_with_children": "Unknown", "good_with_dogs": "Unknown", "good_with_cats": "Unknown"}

        # Look for "Can live with" section
        can_live_with_sections = soup.find_all(
            lambda tag: tag.name in ["div", "section"] and tag.find(lambda t: t.name in ["h2", "h3", "h4"] and "can live with" in (t.get_text(strip=True).lower() if t.get_text(strip=True) else ""))
        )

        for section in can_live_with_sections:
            # Find list items in this section
            list_items = section.find_all("li")

            for item in list_items:
                text = item.get_text(strip=True).lower()

                # Check for children compatibility
                if "child" in text or ("adult" in text and ("only" in text or "prefer" in text)):
                    if "aged" in text or "age" in text:
                        # Extract age requirement
                        import re

                        age_match = re.search(r"aged?\s+(\d+)\+?", text)
                        if age_match:
                            age = age_match.group(1)
                            traits["good_with_children"] = f"Yes ({age}+)"
                        else:
                            if "child" in text:
                                traits["good_with_children"] = True
                    elif "could live with children" in text:
                        traits["good_with_children"] = True
                    elif "adult" in text and ("only" in text or "prefer" in text):
                        traits["good_with_children"] = False

                # Check for dog compatibility
                if "dog" in text:
                    if "only dog" in text or "no other dogs" in text or "be the only dog" in text:
                        traits["good_with_dogs"] = False
                    elif "may be able" in text or ("may" in text and "dogs" in text):
                        traits["good_with_dogs"] = "Maybe"
                    elif "love" in text and "dogs" in text:
                        traits["good_with_dogs"] = True
                    elif "can live with" in text and "dogs" in text:
                        traits["good_with_dogs"] = True
                    elif "other dogs" in text and "live with" in text:
                        traits["good_with_dogs"] = True

                # Check for cat compatibility
                if "cat" in text:
                    if "no cats" in text:
                        traits["good_with_cats"] = False
                    elif "can live with cats" in text or "live with cats" in text:
                        traits["good_with_cats"] = True
                    elif "may" in text and "cats" in text:
                        traits["good_with_cats"] = "Maybe"

        # Also check the "May live with" field if present
        may_live_with_text = ""
        for div in soup.find_all("div"):
            if "May live with" in div.get_text(strip=True):
                may_live_with_text = div.get_text(strip=True).lower()
                break

        if may_live_with_text:
            if "primary school age children" in may_live_with_text:
                if traits["good_with_children"] == "Unknown":
                    traits["good_with_children"] = "Yes (5+)"
            elif "secondary school age children" in may_live_with_text:
                if traits["good_with_children"] == "Unknown":
                    traits["good_with_children"] = "Yes (11+)"

            if "dogs" in may_live_with_text and traits["good_with_dogs"] == "Unknown":
                traits["good_with_dogs"] = True

            if "cats" in may_live_with_text and traits["good_with_cats"] == "Unknown":
                traits["good_with_cats"] = True

        return traits

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
