"""Scraper implementation for Woof Project organization."""

import re
import time
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup, Tag

from scrapers.base_scraper import BaseScraper
from utils.optimized_standardization import standardize_breed, standardize_size_value


class WoofProjectScraper(BaseScraper):
    """Scraper for Woof Project rescue organization.

    Woof Project uses a WordPress-based website with paginated listings
    showing rescue dogs. Only available dogs (without ADOPTED/RESERVED
    status) are scraped.
    """

    def __init__(self, config_id: str = "woof-project", organization_id=None):
        """Initialize Woof Project scraper.

        Args:
            config_id: Configuration ID for Woof Project
            organization_id: Legacy organization ID (optional)
        """
        if organization_id is not None:
            super().__init__(organization_id=organization_id)
        else:
            super().__init__(config_id=config_id)

        self.base_url = "https://woofproject.eu"
        self.listing_url = "https://woofproject.eu/adoption/"

    def collect_data(self) -> List[Dict[str, Any]]:
        """Collect all available dog data.

        This method is called by BaseScraper.run() and must return
        a list of dictionaries containing dog data for database storage.

        Returns:
            List of dog data dictionaries
        """
        self.logger.info("Starting Woof Project data collection")

        # Get all available dogs from all pages
        available_dogs = self.get_animal_list()
        self.logger.info(f"Found {len(available_dogs)} available dogs")

        # Apply skip_existing_animals filtering
        dogs_to_process = available_dogs
        if self.skip_existing_animals and available_dogs:
            all_urls = [dog.get("url") for dog in available_dogs if dog.get("url") is not None]
            filtered_urls = self._filter_existing_urls(all_urls)
            filtered_urls_set = set(filtered_urls)

            original_count = len(available_dogs)
            dogs_to_process = [dog for dog in available_dogs if dog.get("url") in filtered_urls_set]
            skipped_count = original_count - len(dogs_to_process)

            # Track filtering stats for failure detection
            self.set_filtering_stats(original_count, skipped_count)

            self.logger.info(f"After filtering existing animals: processing {len(dogs_to_process)}/{len(available_dogs)} dogs")
        else:
            # No filtering applied
            self.set_filtering_stats(len(available_dogs), 0)

        # Collect detailed data for each dog
        all_dogs_data = []

        for dog_info in dogs_to_process:
            try:
                # Respect rate limiting
                self.respect_rate_limit()

                # Scrape detail page
                dog_data = self.scrape_animal_details(dog_info["url"])

                if dog_data:
                    all_dogs_data.append(dog_data)
                    self.logger.debug(f"Collected data for {dog_data['name']}")

            except Exception as e:
                self.logger.error(f"Error collecting data for {dog_info.get('url', 'unknown')}: {e}")
                continue

        self.logger.info(f"Successfully collected detailed data for {len(all_dogs_data)} dogs")
        return all_dogs_data

    def _is_available_dog(self, element: Tag) -> bool:
        """Check if a dog is available based on its listing element.

        Available dogs have no status badge. Dogs with ADOPTED or
        RESERVED H2 above their name are not available.

        Args:
            element: BeautifulSoup element for a dog listing

        Returns:
            True if dog is available, False otherwise
        """
        # Look for H2 tags that might contain status
        h2_tags = element.find_all("h2")

        for h2 in h2_tags:
            h2_text = h2.get_text(strip=True).upper()
            # Check for ADOPTED or RESERVED status
            if "ADOPTED" in h2_text or "RESERVED" in h2_text:
                return False

        return True

    def _standardize_name(self, name: str) -> str:
        """Standardize dog name to proper title case.

        Converts names like "LISBON" to "Lisbon" following other scraper patterns.

        Args:
            name: Raw dog name

        Returns:
            Standardized name in title case
        """
        if not name:
            return "Unknown"

        # Clean up the name
        cleaned = name.strip()

        # Convert to title case
        # Handle hyphenated names properly (e.g., "MAX-ZEUS" -> "Max-Zeus")
        if "-" in cleaned:
            parts = cleaned.split("-")
            standardized_parts = [part.title() for part in parts]
            return "-".join(standardized_parts)
        else:
            return cleaned.title()

    def _is_valid_dog_url(self, url: str) -> bool:
        """Check if URL is a valid individual dog page (not pagination).

        Args:
            url: URL to validate

        Returns:
            True if URL is an individual dog page, False if pagination or invalid
        """
        if not url or "/adoption/" not in url:
            return False

        # Extract the path part from full URLs
        if url.startswith("http"):
            # For full URLs like https://woofproject.eu/adoption/buddy/
            # Extract path after domain
            path_start = url.find("/adoption/")
            if path_start == -1:
                return False
            path = url[path_start:]
        else:
            # For relative URLs like /adoption/buddy/
            path = url

        # Split path into parts
        parts = path.split("/")

        # Valid individual dog URLs have exactly 4 parts: ['', 'adoption', 'dog-name', '']
        # Example: /adoption/lisbon/ -> ['', 'adoption', 'lisbon', '']
        if len(parts) != 4:
            return False

        # Second part should be 'adoption'
        if parts[1] != "adoption":
            return False

        # Third part should be dog name (not 'page' for pagination)
        dog_name_part = parts[2]
        if not dog_name_part or dog_name_part == "page":
            return False

        # Valid dog name should not contain numbers only (pagination IDs)
        if dog_name_part.isdigit():
            return False

        return True

    def _extract_dog_info(self, element: Tag) -> Optional[Dict[str, str]]:
        """Extract dog information from a listing element.

        Args:
            element: BeautifulSoup element for a dog listing

        Returns:
            Dictionary with dog info or None if extraction fails
        """
        try:
            # Find the h4 tag with the dog link
            h4_tag = element.find("h4")
            if not h4_tag or not isinstance(h4_tag, Tag):
                return None

            # Get the link element
            link_elem = h4_tag.find("a", href=True)
            if not link_elem or not isinstance(link_elem, Tag):
                return None

            # Extract name and URL
            name = link_elem.get_text(strip=True)
            relative_url = link_elem.get("href")

            if not name or not relative_url:
                return None

            # Ensure relative_url is a string
            if isinstance(relative_url, list):
                relative_url = relative_url[0] if relative_url else ""

            relative_url = str(relative_url)

            # Convert relative URL to absolute
            if relative_url.startswith("/"):
                full_url = self.base_url + relative_url
            elif relative_url.startswith("http"):
                full_url = relative_url
            else:
                full_url = urljoin(self.base_url, relative_url)

            return {"name": name, "url": full_url}

        except Exception as e:
            self.logger.error(f"Error extracting dog info: {e}")
            return None

    def get_animal_list(self) -> List[Dict[str, str]]:
        """Get list of available dogs from all listing pages.

        Fetches all paginated listing pages and extracts information about all
        available dogs. Dogs marked as ADOPTED or RESERVED are excluded.

        Returns:
            List of dictionaries containing:
            - name: Dog name
            - url: Full URL to dog detail page
        """
        all_dogs = []

        # Get all pagination URLs
        pagination_urls = self._get_pagination_urls()

        for page_url in pagination_urls:
            try:
                # Respect rate limiting
                self.respect_rate_limit()

                # Fetch this page
                soup = self._fetch_listing_page(page_url)
                if not soup:
                    self.logger.warning(f"Failed to fetch page: {page_url}")
                    continue

                # Extract dogs from this page
                page_dogs = self._extract_dogs_from_page(soup)
                all_dogs.extend(page_dogs)

                self.logger.info(f"Found {len(page_dogs)} dogs on page: {page_url}")

            except Exception as e:
                self.logger.error(f"Error processing page {page_url}: {e}")
                continue

        self.logger.info(f"Found {len(all_dogs)} total available dogs across all pages")
        return all_dogs

    def _get_pagination_urls(self) -> List[str]:
        """Generate pagination URLs dynamically by checking for pagination.

        Dynamically discovers pagination instead of using fixed page count.

        Returns:
            List of pagination URLs
        """
        urls = [self.listing_url]  # Always start with page 1

        # Check first page for pagination links
        try:
            soup = self._fetch_listing_page(self.listing_url)
            if soup:
                # Look for pagination links - common patterns
                pagination_links = []

                # Look for numbered pagination links
                for link in soup.find_all("a"):
                    href = link.get("href", "")
                    # Ensure href is a string before calling string methods
                    href_str = str(href) if href else ""
                    if "/page/" in href_str and href_str.startswith("/adoption/page/"):
                        pagination_links.append(href_str)

                # Extract page numbers and create full URLs
                page_numbers = set()
                for link in pagination_links:
                    try:
                        # Extract page number from URL like /adoption/page/2/
                        link_str = str(link)
                        page_num = int(link_str.split("/page/")[-1].rstrip("/"))
                        page_numbers.add(page_num)
                    except (ValueError, IndexError):
                        continue

                # Add URLs for discovered pages
                for page_num in sorted(page_numbers):
                    if page_num > 1:  # Page 1 already added
                        urls.append(f"{self.listing_url}page/{page_num}/")

                self.logger.info(f"Discovered {len(urls)} pages through pagination")

        except Exception as e:
            self.logger.warning(f"Could not auto-discover pagination, using fallback: {e}")
            # Fallback to at least check a few pages manually
            for page_num in range(2, 6):  # Check pages 2-5
                test_url = f"{self.listing_url}page/{page_num}/"
                try:
                    test_soup = self._fetch_listing_page(test_url)
                    if test_soup:
                        # Quick check if page has content
                        h2_tags = test_soup.find_all("h2")
                        if len(h2_tags) > 5:  # If page has reasonable content
                            urls.append(test_url)
                        else:
                            break  # Stop if page seems empty
                except Exception:
                    break  # Stop on error

        return urls

    def _fetch_listing_page(self, url: str) -> Optional[BeautifulSoup]:
        """Fetch and parse a listing page with lazy loading support.

        Args:
            url: URL to fetch

        Returns:
            BeautifulSoup object or None if error
        """
        try:
            self.logger.debug(f"Fetching listing page: {url}")

            # Try browser automation for lazy loading first
            try:
                return self._fetch_with_browser(url)
            except Exception as browser_error:
                self.logger.warning(f"Browser automation failed: {browser_error}, falling back to requests")

            # Fallback to requests with better headers
            headers = {
                "User-Agent": ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " "(KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"),
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
                "Accept-Encoding": "gzip, deflate",
                "Connection": "keep-alive",
                "Upgrade-Insecure-Requests": "1",
            }

            response = requests.get(url, timeout=self.timeout, headers=headers)
            response.raise_for_status()

            return BeautifulSoup(response.text, "html.parser")

        except Exception as e:
            self.logger.error(f"Error fetching listing page {url}: {e}")
            return None

    def _fetch_with_browser(self, url: str) -> Optional[BeautifulSoup]:
        """Fetch page using browser automation to handle lazy loading.

        Args:
            url: URL to fetch

        Returns:
            BeautifulSoup object or None if error
        """
        try:
            from selenium import webdriver
            from selenium.webdriver.chrome.options import Options

            # Setup enhanced Chrome options for headless browsing
            chrome_options = Options()
            chrome_options.add_argument("--headless")
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--window-size=1920,1080")
            chrome_options.add_argument("--disable-web-security")
            chrome_options.add_argument("--disable-features=VizDisplayCompositor")
            chrome_options.add_argument("--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " "(KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

            self.logger.debug(f"Starting browser automation for {url}")
            driver = webdriver.Chrome(options=chrome_options)

            try:
                driver.get(url)
                self.logger.debug("Page loaded, starting comprehensive lazy loading")

                # Trigger comprehensive lazy loading
                self._trigger_comprehensive_lazy_loading(driver)

                # Wait for adoption links and H2 elements to be present
                self._wait_for_essential_elements(driver)

                # Get page source and parse
                page_source = driver.page_source
                self.logger.debug(f"Retrieved page source ({len(page_source)} characters)")
                return BeautifulSoup(page_source, "html.parser")

            finally:
                driver.quit()

        except ImportError:
            self.logger.debug("Selenium not available, falling back to requests")
            return None
        except Exception as e:
            self.logger.warning(f"Browser automation error: {e}")
            return None

    def _trigger_comprehensive_lazy_loading(self, driver):
        """Trigger comprehensive lazy loading with progressive scrolling.

        Args:
            driver: Selenium WebDriver instance
        """
        try:
            # Initial wait for page to settle
            time.sleep(2)

            # First scroll to bottom to trigger initial lazy loading
            self.logger.debug("Scrolling to bottom to trigger initial lazy loading")
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)

            # Scroll back to top
            self.logger.debug("Scrolling back to top")
            driver.execute_script("window.scrollTo(0, 0);")
            time.sleep(1)

            # Progressive scrolling in smaller increments
            self.logger.debug("Starting progressive scrolling")
            total_height = driver.execute_script("return document.body.scrollHeight")

            # Scroll in 300px increments
            for i in range(0, total_height, 300):
                driver.execute_script(f"window.scrollTo(0, {i});")
                time.sleep(0.5)

            # Final scroll to bottom
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)

            # Final scroll to top for extraction
            driver.execute_script("window.scrollTo(0, 0);")
            time.sleep(1)

            self.logger.debug("Comprehensive lazy loading completed")

        except Exception as e:
            self.logger.warning(f"Error during lazy loading: {e}")

    def _wait_for_essential_elements(self, driver):
        """Wait for essential elements to be present on the page.

        Args:
            driver: Selenium WebDriver instance
        """
        try:
            from selenium.webdriver.common.by import By
            from selenium.webdriver.support import expected_conditions as EC
            from selenium.webdriver.support.ui import WebDriverWait

            wait = WebDriverWait(driver, 10)

            # Wait for H2 elements (dog names) to be present
            try:
                self.logger.debug("Waiting for H2 elements (dog names)")
                wait.until(EC.presence_of_element_located((By.TAG_NAME, "h2")))
                h2_count = len(driver.find_elements(By.TAG_NAME, "h2"))
                self.logger.debug(f"Found {h2_count} H2 elements")
            except Exception:
                self.logger.debug("No H2 elements found within timeout")

            # Wait for adoption links to be present
            try:
                self.logger.debug("Waiting for adoption links")
                wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, 'a[href*="/adoption/"]')))
                link_count = len(driver.find_elements(By.CSS_SELECTOR, 'a[href*="/adoption/"]'))
                self.logger.debug(f"Found {link_count} adoption links")
            except Exception:
                self.logger.debug("No adoption links found within timeout")

        except Exception as e:
            self.logger.warning(f"Error waiting for elements: {e}")

    def _extract_dogs_from_page(self, soup: BeautifulSoup) -> List[Dict[str, str]]:
        """Extract available dogs from a single listing page.

        Args:
            soup: BeautifulSoup object of the listing page

        Returns:
            List of dog information dictionaries
        """
        # Try the new method first, fall back to old method if needed
        try:
            return self._extract_dogs_from_page_new_method(soup)
        except Exception as e:
            self.logger.warning(f"New extraction method failed, falling back to old method: {e}")
            return self._extract_dogs_from_page_old_method(soup)

    def _extract_dogs_from_page_new_method(self, soup: BeautifulSoup) -> List[Dict[str, str]]:
        """Extract dogs using robust container-first approach.

        Instead of processing H2 tags linearly, this method finds containers
        that group together each dog's information (status, name, link) and
        processes each container independently.

        Args:
            soup: BeautifulSoup object of the listing page

        Returns:
            List of dog information dictionaries
        """
        dogs = []

        self.logger.debug("Starting robust container-first extraction")

        # Try multiple container strategies
        dogs_found = self._extract_dogs_by_widget_containers(soup)
        if dogs_found:
            dogs.extend(dogs_found)
        else:
            # Fallback to section-based extraction
            dogs.extend(self._extract_dogs_by_content_sections(soup))

        self.logger.info(f"Extracted {len(dogs)} dogs using robust method")
        return dogs

    def _extract_dogs_by_widget_containers(self, soup: BeautifulSoup) -> List[Dict[str, str]]:
        """Extract dogs by finding elementor widget containers."""
        dogs = []

        # Look for elementor widgets that contain dog information
        widget_containers = soup.find_all("div", class_=lambda x: x and any("elementor-widget" in cls for cls in x))

        self.logger.debug(f"Found {len(widget_containers)} widget containers")

        for widget in widget_containers:
            # Ensure widget is a Tag object before calling find_all
            if not isinstance(widget, Tag):
                continue

            # Check if this widget contains adoption links and dog names
            adoption_links = widget.find_all("a", href=lambda x: x and "/adoption/" in x and self._is_valid_dog_url(x))
            h2_tags = widget.find_all("h2")

            if not adoption_links or not h2_tags:
                continue

            # Process each adoption link in this widget
            for link in adoption_links:
                if not isinstance(link, Tag):
                    continue
                href = link.get("href", "")
                if not href or "/adoption/" not in href:
                    continue

                # Find the corresponding dog name H2 near this link
                dog_name = self._find_dog_name_near_link(link, widget)
                if not dog_name:
                    continue

                # Check if this dog is available (no ADOPTED/RESERVED in this widget)
                if self._is_dog_available_in_container(widget, dog_name):
                    # Convert relative URL to absolute
                    if href.startswith("/"):
                        href = f"https://woofproject.eu{href}"
                    elif not href.startswith("http"):
                        href = f"https://woofproject.eu/{href}"

                    dogs.append({"name": dog_name, "url": href})
                    self.logger.debug(f"Found available dog in widget: {dog_name}")
                else:
                    self.logger.debug(f"Skipping unavailable dog in widget: {dog_name}")

        return dogs

    def _extract_dogs_by_content_sections(self, soup: BeautifulSoup) -> List[Dict[str, str]]:
        """Fallback method: extract dogs by analyzing content sections."""
        dogs = []

        self.logger.debug("Using fallback content section extraction")

        # Find all adoption links first
        adoption_links = soup.find_all("a", href=lambda x: x and "/adoption/" in x and self._is_valid_dog_url(x))

        for link in adoption_links:
            href = link.get("href", "")

            # Find the parent container that might contain this dog's full info
            container = self._find_dog_container_for_link(link)
            if not container:
                continue

            # Find dog name in this container
            dog_name = self._find_dog_name_in_container(container)
            if not dog_name or not self._looks_like_dog_name(dog_name):
                continue

            # Check availability within this container
            if self._is_dog_available_in_container(container, dog_name):
                # Convert relative URL to absolute
                if href.startswith("/"):
                    href = f"https://woofproject.eu{href}"
                elif not href.startswith("http"):
                    href = f"https://woofproject.eu/{href}"

                dogs.append({"name": dog_name, "url": href})
                self.logger.debug(f"Found available dog in section: {dog_name}")
            else:
                self.logger.debug(f"Skipping unavailable dog in section: {dog_name}")

        return dogs

    def _find_dog_name_near_link(self, link, container):
        """Find dog name H2 near an adoption link within a container."""
        # Look for H2 tags in the same container
        h2_tags = container.find_all("h2")

        for h2 in h2_tags:
            text = h2.get_text(strip=True)
            if self._looks_like_dog_name(text) and text not in ["ADOPTED", "RESERVED"]:
                return text

        return None

    def _find_dog_container_for_link(self, link):
        """Find a reasonable container that groups a dog's information."""
        current = link

        # Walk up the DOM to find a container with both H2 and the link
        for level in range(8):
            current = current.parent
            if not current:
                break

            # Check if this container has both H2s and our link
            h2_tags = current.find_all("h2")
            if len(h2_tags) >= 1:
                # This container has H2s, it might be our dog container
                return current

        return None

    def _find_dog_name_in_container(self, container):
        """Find the dog name within a container."""
        h2_tags = container.find_all("h2")

        for h2 in h2_tags:
            text = h2.get_text(strip=True)
            if self._looks_like_dog_name(text) and text not in ["ADOPTED", "RESERVED"]:
                return text

        return None

    def _is_dog_available_in_container(self, container, dog_name):
        """Check if a dog is available by looking for ADOPTED/RESERVED in its container."""
        h2_tags = container.find_all("h2")

        # Look for ADOPTED/RESERVED status tags in this container
        status_tags = []
        dog_name_positions = []

        for i, h2 in enumerate(h2_tags):
            text = h2.get_text(strip=True)
            if text in ["ADOPTED", "RESERVED"]:
                status_tags.append((i, text))
            elif text == dog_name:
                dog_name_positions.append(i)

        # If no status tags found, dog is available
        if not status_tags:
            return True

        # If no dog name positions found, assume available (shouldn't happen)
        if not dog_name_positions:
            return True

        # Check if any status tag is immediately before our dog name
        for dog_pos in dog_name_positions:
            for status_pos, status_text in status_tags:
                if status_pos == dog_pos - 1:  # Status immediately before name
                    self.logger.debug(f"Found {status_text} immediately before {dog_name}")
                    return False

        # Additional check: if there are many status tags in this container,
        # be more conservative and check proximity
        if len(status_tags) > 2:
            for dog_pos in dog_name_positions:
                for status_pos, status_text in status_tags:
                    if abs(status_pos - dog_pos) <= 2:  # Status within 2 positions
                        self.logger.debug(f"Found {status_text} near {dog_name} (positions {status_pos}, {dog_pos})")
                        return False

        return True

    def _extract_dogs_from_page_old_method(self, soup: BeautifulSoup) -> List[Dict[str, str]]:
        """Original extraction method as fallback.

        Args:
            soup: BeautifulSoup object of the listing page

        Returns:
            List of dog information dictionaries
        """
        dogs = []

        # Find all fusion-text elements (each contains one dog)
        dog_elements = soup.find_all("div", class_="fusion-text")

        self.logger.debug(f"Found {len(dog_elements)} potential dog elements")

        for element in dog_elements:
            # Check if this dog is available (not adopted/reserved)
            if self._is_available_dog(element):
                # Extract dog info
                dog_info = self._extract_dog_info(element)
                if dog_info:
                    dogs.append(dog_info)
                    self.logger.debug(f"Found available dog: {dog_info['name']}")
                else:
                    self.logger.debug("Could not extract info from available dog element")
            else:
                # Log skipped dogs for debugging
                h4_tag = element.find("h4")
                if h4_tag:
                    link_elem = h4_tag.find("a")
                    name = link_elem.get_text(strip=True) if link_elem else "Unknown"
                    self.logger.debug(f"Skipping unavailable dog: {name}")

        return dogs

    def scrape_animal_details(self, url: str) -> Optional[Dict[str, Any]]:
        """Scrape detailed information for a single dog with NULL prevention.

        Args:
            url: Full URL to dog detail page

        Returns:
            Dictionary with dog data or None if error
        """
        try:
            self.logger.debug(f"Scraping detail page: {url}")

            # Fetch detail page
            soup = self._fetch_detail_page(url)
            if not soup:
                return None

            # Extract all data from detail page
            external_id = self._generate_external_id(url)
            name = self._extract_name_from_detail(soup)
            breed = self._extract_breed_from_detail(soup)
            age = self._extract_age_from_detail(soup)
            size = self._extract_size_from_detail(soup)
            description = self._extract_description_from_detail(soup)
            primary_image_url = self._extract_primary_image_from_detail(soup)

            # Extract sex from description patterns
            sex = self._extract_sex_from_description(description or "")

            # Apply standardization following other scraper patterns
            standardized_name = self._standardize_name(name or "Unknown")
            raw_breed = breed or "Mixed Breed"
            standardized_breed = standardize_breed(raw_breed)
            raw_size = size or "Medium"
            standardized_size = standardize_size_value(raw_size)

            # Build result dictionary with comprehensive NULL prevention and standardization
            result = {
                "name": standardized_name,
                "external_id": external_id,
                "adoption_url": url,
                "primary_image_url": primary_image_url,
                "description": description or "Rescue dog from Woof Project available for adoption",
                "breed": raw_breed,  # Original breed
                "standardized_breed": standardized_breed,  # Standardized breed
                "age_text": age or "Unknown age",  # Default age
                "size": raw_size,  # Original size
                "standardized_size": standardized_size,  # Standardized size
                "sex": sex or "Unknown",  # Default sex
                "animal_type": "dog",
                "status": "available",
            }

            # Additional properties for enhanced data - include actual content like working orgs
            properties = {
                "description": description or "No description available",
                "raw_name": name or "Unknown",
                "raw_description": description or "No description available",
                "breed": raw_breed,
                "age_text": age or "Unknown age",
                "size": raw_size,
                "sex": sex or "Unknown",
                "page_url": url,
                "source_page": url,
                "extracted_fields": {
                    "name_source": "title" if name else "default",
                    "breed_source": "pattern" if breed else "default",
                    "age_source": "pattern" if age else "default",
                    "size_source": "pattern" if size else "default",
                },
            }

            result["properties"] = properties

            self.logger.debug(f"Extracted data for {result['name']}: breed={result['breed']}, " f"age={result['age_text']}, size={result['size']}")

            return result

        except Exception as e:
            self.logger.error(f"Error scraping detail page {url}: {e}")
            return None

    def _extract_sex_from_description(self, description: str) -> Optional[str]:
        """Extract sex from description text using pronoun analysis.

        Args:
            description: Description text

        Returns:
            Sex (Male/Female) or None if not found
        """
        if not description:
            return None

        desc_lower = description.lower()

        # Look for gender indicators with word boundaries
        import re

        # Female indicators
        female_patterns = [r"\bshe\b", r"\bher\b", r"\bfemale\b", r"\bgirl\b"]
        # Male indicators
        male_patterns = [r"\bhe\b", r"\bhis\b", r"\bhim\b", r"\bmale\b", r"\bboy\b"]

        female_count = sum(1 for pattern in female_patterns if re.search(pattern, desc_lower))
        male_count = sum(1 for pattern in male_patterns if re.search(pattern, desc_lower))

        if female_count > male_count:
            return "Female"
        elif male_count > female_count:
            return "Male"

        return None

    def _fetch_detail_page(self, url: str) -> Optional[BeautifulSoup]:
        """Fetch and parse a detail page.

        Args:
            url: URL to fetch

        Returns:
            BeautifulSoup object or None if error
        """
        try:
            response = requests.get(url, timeout=self.timeout, headers={"User-Agent": "Mozilla/5.0 (compatible; RescueDogAggregator/1.0)"})
            response.raise_for_status()

            return BeautifulSoup(response.text, "html.parser")

        except Exception as e:
            self.logger.error(f"Error fetching detail page {url}: {e}")
            return None

    def _generate_external_id(self, url: str) -> str:
        """Generate external ID from URL.

        Args:
            url: Dog detail page URL

        Returns:
            External ID extracted from URL
        """
        # Extract the last part of the URL path
        return url.rstrip("/").split("/")[-1]

    def _extract_name_from_detail(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract dog name from detail page.

        Args:
            soup: BeautifulSoup object of detail page

        Returns:
            Dog name or None if not found
        """
        # Try h1 tag first
        h1_tag = soup.find("h1")
        if h1_tag:
            name = h1_tag.get_text(strip=True)
            if name and name != "Woof Project":  # Skip site title
                return name

        # For Elementor-based pages, look for H2 with elementor-heading-title class
        h2_headings = soup.find_all("h2", class_="elementor-heading-title")
        for h2 in h2_headings:
            h2_text = h2.get_text(strip=True)
            # Look for patterns like "Meet DOGNAME" or just "DOGNAME"
            if h2_text.startswith("Meet "):
                # Extract name after "Meet "
                name = h2_text[5:].strip()
                if name and self._looks_like_dog_name(name):
                    return name
            elif h2_text.startswith("About "):
                # Extract name after "About "
                name = h2_text[6:].strip()
                if name and self._looks_like_dog_name(name):
                    return name
            elif self._looks_like_dog_name(h2_text):
                # Direct dog name
                return h2_text

        # Try title tag as fallback
        title_tag = soup.find("title")
        if title_tag:
            title_text = title_tag.get_text(strip=True)
            # Extract name before " - Woof Project"
            if " - " in title_text:
                name = title_text.split(" - ")[0].strip()
                if name:
                    return name

        return None

    def _extract_breed_from_detail(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract breed from detail page with comprehensive fallback.

        Args:
            soup: BeautifulSoup object of detail page

        Returns:
            Breed or None if not found
        """
        # Look for breed in content
        content_area = soup.find("div", class_="post-content") or soup

        # Primary: Look for paragraphs with "Breed:" pattern
        for p in content_area.find_all("p"):
            p_text = p.get_text().strip()
            if "breed:" in p_text.lower():
                # Extract text after "Breed:"
                parts = p_text.split(":")
                if len(parts) > 1:
                    breed = parts[1].strip()
                    if breed:
                        return breed

        # Fallback: Look for common breed names in any text
        text_content = content_area.get_text().lower()

        # Common dog breeds to look for
        common_breeds = [
            "labrador",
            "golden retriever",
            "german shepherd",
            "bulldog",
            "poodle",
            "beagle",
            "rottweiler",
            "yorkshire terrier",
            "dachshund",
            "siberian husky",
            "boxer",
            "border collie",
            "cocker spaniel",
            "australian shepherd",
            "chihuahua",
            "shih tzu",
            "boston terrier",
            "pomeranian",
            "mastiff",
            "pointer",
            "hound",
            "terrier",
            "spaniel",
            "retriever",
            "shepherd",
            "mixed breed",
            "cross",
            "mix",
        ]

        for breed in common_breeds:
            if breed in text_content:
                # Capitalize properly
                return " ".join(word.capitalize() for word in breed.split())

        return None

    def _extract_age_from_detail(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract age from detail page with comprehensive fallback.

        Args:
            soup: BeautifulSoup object of detail page

        Returns:
            Age text or None if not found
        """
        # Look for age in content
        content_area = soup.find("div", class_="post-content") or soup

        # Primary: Look for paragraphs with "Age:" pattern
        for p in content_area.find_all("p"):
            p_text = p.get_text().strip()
            if "age:" in p_text.lower():
                # Extract text after "Age:"
                parts = p_text.split(":")
                if len(parts) > 1:
                    age = parts[1].strip()
                    if age:
                        return age

        # Fallback: Look for age patterns in text
        text_content = content_area.get_text()

        import re

        age_patterns = [
            (r"(\d+)\s+years?\s+old", lambda m: f"{m.group(1)} years"),
            (r"(\d+)\s+months?\s+old", lambda m: f"{m.group(1)} months"),
            (r"around\s+(\d+)\s+years?", lambda m: f"around {m.group(1)} years"),
            (r"approximately\s+(\d+)\s+years?", lambda m: f"approximately {m.group(1)} years"),
            (r"(\d+)\s*-\s*(\d+)\s+years?", lambda m: f"{m.group(1)}-{m.group(2)} years"),
            # Pattern for "♡ DOGNAME, 2 years (Estimated DOB...)"
            (r"♡\s+[A-Z]+,\s+(\d+)\s+years?", lambda m: f"{m.group(1)} years"),
            # Pattern for just "2 years" after commas
            (r",\s+(\d+)\s+years?", lambda m: f"{m.group(1)} years"),
            (r"\b(puppy|young|adult|senior)\b", lambda m: m.group(1)),
        ]

        for pattern, formatter in age_patterns:
            match = re.search(pattern, text_content, re.IGNORECASE)
            if match:
                return formatter(match)

        return None

    def _extract_size_from_detail(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract size from detail page with comprehensive fallback.

        Args:
            soup: BeautifulSoup object of detail page

        Returns:
            Size or None if not found
        """
        # Look for size in content
        content_area = soup.find("div", class_="post-content") or soup

        # Primary: Look for paragraphs with "Size:" pattern
        for p in content_area.find_all("p"):
            p_text = p.get_text().strip()
            if "size:" in p_text.lower():
                # Extract text after "Size:"
                parts = p_text.split(":")
                if len(parts) > 1:
                    size = parts[1].strip()
                    if size:
                        return size

        # Fallback: Look for size indicators in text
        text_content = content_area.get_text().lower()

        # Size patterns to look for
        size_patterns = [
            ("small", ["small", "tiny", "little"]),
            ("medium", ["medium", "mid-size", "mid size"]),
            ("large", ["large", "big"]),
            ("extra large", ["extra large", "xlarge", "x-large", "huge", "giant"]),
        ]

        for size_category, keywords in size_patterns:
            for keyword in keywords:
                if keyword in text_content:
                    return size_category.capitalize()

        # Fallback: Look for weight mentions and estimate size
        import re

        weight_patterns = [
            r"(\d+)\s*(?:kg|kilos?|pounds?|lbs?)",
            r"weighs?\s+(\d+)",
        ]

        for pattern in weight_patterns:
            match = re.search(pattern, text_content)
            if match:
                try:
                    weight = float(match.group(1))
                    # Assume kg if not specified, convert rough estimates
                    if weight > 50:  # Likely pounds
                        weight_kg = weight * 0.453592
                    else:
                        weight_kg = weight

                    return self._estimate_size_from_weight(weight_kg)
                except (ValueError, TypeError):
                    continue

        return None

    def _estimate_size_from_weight(self, weight_kg: float) -> str:
        """Estimate size category from weight.

        Args:
            weight_kg: Weight in kilograms

        Returns:
            Size category
        """
        if weight_kg < 5:
            return "Small"
        elif weight_kg < 12:
            return "Small"
        elif weight_kg < 25:
            return "Medium"
        elif weight_kg < 40:
            return "Large"
        else:
            return "Extra Large"

    def _extract_description_from_detail(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract clean description using multi-stage filtering pipeline.

        Args:
            soup: BeautifulSoup object of detail page

        Returns:
            Clean description text or None if not found
        """
        # Use optimized pattern-based extraction (no complex DOM traversal needed)
        return self._extract_filtered_description(soup)

    def _extract_filtered_description(self, soup: BeautifulSoup) -> Optional[str]:
        """Multi-stage filtering pipeline for clean description extraction.

        Based on comprehensive analysis, uses a 3-stage approach:
        1. Find story start patterns
        2. Truncate at end markers
        3. Sanitize remaining metadata

        Args:
            soup: BeautifulSoup object of detail page

        Returns:
            Clean description text or None if not found
        """
        import re

        # Get all text content
        content_area = soup.find("div", class_="post-content") or soup
        full_text = content_area.get_text(separator=" ", strip=True) if content_area else ""

        if not full_text:
            return None

        # STAGE 1: Find story start patterns (most reliable)
        story_start_patterns = [
            r"are you looking for",
            r"hi,?\s+i\s+am",
            r"hello,?\s+(my\s+name\s+is|i\s+am)",
            r"let\s+me\s+tell\s+you",
            r"my\s+name\s+is",
        ]

        description = None
        for pattern in story_start_patterns:
            match = re.search(pattern, full_text, re.IGNORECASE)
            if match:
                description = full_text[match.start() :]
                self.logger.debug(f"Found story start with pattern: {pattern}")
                break

        # If no story start found, try removing navigation blocks from beginning
        if not description:
            # Remove everything before the actual content
            navigation_removal_patterns = [
                r"^.*?adopt\s+me\s+\w+\s+looks\s+like:.*?(?=are\s+you|hi,?\s+i|hello|let\s+me|my\s+name)",
                r"^.*?skip\s+to\s+content.*?(?=are\s+you|hi,?\s+i|hello|let\s+me|my\s+name)",
                r"^.*?home\s+adopt\s+volunteer.*?(?=are\s+you|hi,?\s+i|hello|let\s+me|my\s+name)",
                r"^.*?woof\s+project.*?(?=are\s+you|hi,?\s+i|hello|let\s+me|my\s+name)",
            ]

            description = full_text
            for nav_pattern in navigation_removal_patterns:
                description = re.sub(nav_pattern, "", description, flags=re.IGNORECASE)
                if len(description) < len(full_text):  # If pattern matched and removed content
                    self.logger.debug(f"Removed navigation with pattern: {nav_pattern[:50]}...")
                    break

        # STAGE 2: Truncate at end markers
        end_markers = [
            "share this:",
            "sharing is caring",
            "adoption application",
            "previous post",
            "next post",
            "– woof project",
            "woof project",
            "let's home them all",
            "site map",
            "legal",
        ]

        earliest_end_index = len(description)
        for marker in end_markers:
            index = description.lower().find(marker.lower())
            if index != -1:
                earliest_end_index = min(earliest_end_index, index)
                self.logger.debug(f"Found end marker: {marker}")

        description = description[:earliest_end_index]

        # STAGE 3: Sanitize metadata patterns
        unwanted_patterns = [
            r"adopt\s+me\s+\w+",  # "Adopt Me LISBON"
            r"looks\s+like:.*?(?=\.|$|[A-Z])",  # "Looks like: Breed info"
            r"sex:.*?(?=\.|$|[A-Z])",  # "Sex: Male"
            r"location:.*?(?=\.|$|[A-Z])",  # "Location: Cyprus"
            r"estimated\s+age:.*?(?=\.|$|[A-Z])",  # "Estimated age: 2 years"
            r"size:.*?(?=\.|$|[A-Z])",  # "Size: Medium"
            r"ask\s+about\s+\w+",  # "Ask About LISBON"
            r"house\s+trained.*?(?=\.|$|[A-Z])",  # Metadata fields
            r"health.*?(?=\.|$|[A-Z])",  # Health info
            r"prefers\s+home\s+with.*?(?=\.|$|[A-Z])",  # Home preferences
        ]

        for pattern in unwanted_patterns:
            before_length = len(description)
            description = re.sub(pattern, "", description, flags=re.IGNORECASE)
            if len(description) < before_length:
                self.logger.debug(f"Removed metadata with pattern: {pattern[:30]}...")

        # Final cleanup
        description = re.sub(r"\s+", " ", description).strip()

        # Quality check - must have substantial content
        if len(description) < 50:
            self.logger.debug(f"Description too short ({len(description)} chars), using fallback")
            fallback_text = re.sub(r"\s+", " ", full_text).strip()
            return fallback_text if fallback_text else None

        self.logger.debug(f"Extracted {len(description)} chars using multi-stage pipeline")
        return description

    def _extract_primary_image_from_detail(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract primary image URL from detail page.

        Prioritizes wp-content/uploads images (actual dog photos) over other images.

        Args:
            soup: BeautifulSoup object of detail page

        Returns:
            Primary image URL or None if not found
        """
        # Find all img tags in the entire document
        img_tags = soup.find_all("img")

        # Collect all potential image URLs
        candidate_images = []

        for img in img_tags:
            src = img.get("src")
            if not src:
                continue

            # Ensure absolute URL
            if src.startswith("//"):
                src = "https:" + src
            elif src.startswith("/"):
                src = self.base_url + src
            elif not src.startswith("http"):
                src = urljoin(self.base_url, src)

            # Skip obvious non-dog images
            src_lower = src.lower()
            if any(skip in src_lower for skip in ["icon", "logo", "favicon", "button", "header", "footer"]):
                continue

            # Add to candidates with priority scoring
            priority = self._score_image_priority(src, img)
            if priority > 0:
                candidate_images.append((priority, src))

        # Sort by priority (highest first) and return best match
        if candidate_images:
            candidate_images.sort(key=lambda x: x[0], reverse=True)
            return candidate_images[0][1]

        return None

    def _score_image_priority(self, src: str, img_tag) -> int:
        """Score image priority for selection as primary dog photo.

        Args:
            src: Image source URL
            img_tag: BeautifulSoup img element

        Returns:
            Priority score (higher = better, 0 = skip)
        """
        src_lower = src.lower()

        # Skip obvious site/UI images first
        if any(skip in src_lower for skip in ["icon", "logo", "login", "video_icon", "thumb"]):
            return 0

        # HIGHEST PRIORITY: wp-content/uploads images from current year (actual dog photos)
        if "wp-content/uploads" in src_lower:
            # Prioritize current/recent year images (likely fresh dog photos)
            if "/2025/" in src_lower or "/2024/" in src_lower:
                score = 120
            else:
                score = 80

            # Bonus for high resolution images (likely main dog photos)
            width = img_tag.get("width")
            height = img_tag.get("height")
            if width and height:
                try:
                    w, h = int(width), int(height)
                    if w >= 1000 and h >= 1000:  # High res photos
                        score += 20
                    elif w >= 500 and h >= 400:  # Medium res photos
                        score += 10
                except (ValueError, TypeError):
                    pass

            # Bonus for JPEG format (photos vs icons)
            if src_lower.endswith((".jpg", ".jpeg")):
                score += 10

            return score

        # HIGH PRIORITY: Images with dog-related alt text
        alt_text = (img_tag.get("alt", "") or "").lower()
        if any(word in alt_text for word in ["dog", "puppy", "pet", "rescue", "adopt"]):
            return 80

        # MEDIUM PRIORITY: Large images likely to be main photos
        # Check for size attributes or class names suggesting large images
        width = img_tag.get("width")
        height = img_tag.get("height")
        img_class = img_tag.get("class", []) or []
        img_class_str = " ".join(img_class).lower() if img_class else ""

        if any(size_class in img_class_str for size_class in ["large", "full", "hero", "main", "featured"]):
            return 60

        if width and height:
            try:
                w, h = int(width), int(height)
                if w >= 300 and h >= 200:  # Reasonable size for dog photo
                    return 50
            except (ValueError, TypeError):
                pass

        # LOW PRIORITY: Images in content area
        if "post-content" in str(img_tag.parent) or "content" in str(img_tag.parent):
            return 30

        # BASIC PRIORITY: Any other reasonable image
        # Skip very small images or thumbnails
        if any(small in src_lower for small in ["thumb", "small", "mini", "tiny"]):
            return 0

        return 20

    def _looks_like_dog_name(self, text: str) -> bool:
        """Check if H2 text looks like a dog name.

        Args:
            text: H2 text content

        Returns:
            True if it looks like a dog name
        """
        if not text:
            return False

        # Skip common non-dog headings (convert all to uppercase for comparison)
        non_dog_headings = [
            "ADOPTED",
            "RESERVED",
            "IT'S SIMPLE",
            "FALL IN",
            "WE",
            "SIGN THE",
            "YOU",
            "READ MORE",
            "ON ADOPTION PROCESS",
            "TOGETHER WE CAN",
            "OUR RESCUE PARTNERS",
            "LET'S HOME THEM ALL",
            "SITE MAP",
            "LEGAL",
            "01",
            "02",
            "03",
            "04",
            "IT'S SIMPLE. FALL IN LOVE. APPLY.",
            "FALL INLOVE ANDAPPLY",
            "WEHOMECHECK",
            "SIGN THEADOPTIONCONTRACTAND PAY THEADOPTIONDONATION",
            "YOUCOLLECTYOURNEW BESTFRIEND",
        ]

        text_upper = text.upper()
        for heading in non_dog_headings:
            if heading == text_upper:  # Exact match instead of substring
                return False

        # Dog names are typically single words or short phrases, all caps
        if len(text) > 50:  # Too long to be a dog name
            return False

        # Should be mostly alphabetic (allowing some special chars)
        if not re.match(r"^[A-Z\s\-\(\)]+$", text.upper()):
            return False

        return True

    def _find_dog_url_near_h2(self, h2_element: Tag, dog_name: str) -> Optional[str]:
        """Find the adoption URL for a dog near its H2 element.

        The structure on woofproject.eu is:
        - H2 is in an elementor-widget-heading
        - Image/link is in a sibling elementor-widget-image

        Args:
            h2_element: The H2 element containing the dog name
            dog_name: The dog name (for logging)

        Returns:
            Full adoption URL or None if not found
        """
        # First try: Navigate up to find the widget level (for live site)
        current = h2_element

        # Go up to the widget level (usually 2-3 levels up)
        for level in range(5):
            current = current.parent
            if not current:
                break

            # Check if this looks like a widget container
            classes = current.get("class", [])
            if "elementor-widget" in classes:
                # Found widget level, now look for sibling widgets with links
                if current.parent:
                    siblings = current.parent.find_all(recursive=False)

                    for sibling in siblings:
                        if sibling == current:
                            continue

                        # Look for adoption links in this sibling
                        links = sibling.find_all("a", href=True)
                        for link in links:
                            href = link.get("href")
                            if href and "/adoption/" in href:
                                # Check if this link contains the dog name
                                dog_name_lower = dog_name.lower().replace(" ", "-").replace("(", "").replace(")", "")
                                if dog_name_lower in href.lower():
                                    # Convert to absolute URL
                                    if href.startswith("/"):
                                        return self.base_url + href
                                    elif href.startswith("http"):
                                        return href
                                    else:
                                        return urljoin(self.base_url, href)

                # Also try looking at this level for any adoption links
                links = current.find_all("a", href=True)
                for link in links:
                    href = link.get("href")
                    if href and "/adoption/" in href:
                        dog_name_lower = dog_name.lower().replace(" ", "-").replace("(", "").replace(")", "")
                        if dog_name_lower in href.lower():
                            if href.startswith("/"):
                                return self.base_url + href
                            elif href.startswith("http"):
                                return href
                            else:
                                return urljoin(self.base_url, href)

        # Second try: Fallback to simple sibling traversal (for tests and simpler structures)
        current = h2_element
        for _ in range(10):  # Look back up to 10 elements
            current = current.previous_sibling
            if not current:
                break

            # Skip text nodes and only process Tag elements
            if hasattr(current, "name") and current.name:
                # Check if this element itself is an adoption link
                if current.name == "a" and current.get("href"):
                    href = current.get("href")
                    if href and "/adoption/" in href:
                        # Convert to absolute URL
                        if href.startswith("/"):
                            return self.base_url + href
                        elif href.startswith("http"):
                            return href
                        else:
                            return urljoin(self.base_url, href)

                # Also look for adoption links inside this element
                link = current.find("a", href=True)
                if link:
                    href = link.get("href")
                    if href and "/adoption/" in href:
                        # Convert to absolute URL
                        if href.startswith("/"):
                            return self.base_url + href
                        elif href.startswith("http"):
                            return href
                        else:
                            return urljoin(self.base_url, href)

        self.logger.debug(f"Could not find adoption URL for {dog_name}")
        return None
