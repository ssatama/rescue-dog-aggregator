"""Main scraper implementation for MisisRescue.

This module provides the main scraper class that orchestrates the complete
scraping process for MisisRescue website, including pagination handling,
Reserved section detection, and data collection.
"""

import re
import time
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup, Tag
from selenium import webdriver
from selenium.common.exceptions import NoSuchElementException, TimeoutException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from scrapers.base_scraper import BaseScraper

from .detail_parser import MisisRescueDetailParser


class MisisRescueScraper(BaseScraper):
    """Scraper for MISI's Rescue organization.

    IMPORTANT: Only scrapes available dogs, skips Reserved section entirely.
    Inherits from BaseScraper which provides database operations, error handling,
    metrics logging, and image uploading functionality.
    """

    def __init__(self, config_id: str = "misisrescue", organization_id=None):
        """Initialize with configuration."""
        if organization_id is not None:
            # Legacy mode - use organization_id
            super().__init__(organization_id=organization_id)
        else:
            # New mode - use config_id
            super().__init__(config_id=config_id)
        self.base_url = "https://www.misisrescue.com"
        self.listing_url = "https://www.misisrescue.com/available-for-adoption"
        self.detail_parser = MisisRescueDetailParser()

    def collect_data(self) -> List[Dict[str, Any]]:
        """Main entry point - collect all dog data.

        CRITICAL: Must skip Reserved section shown in screenshots!

        This method is called by BaseScraper which handles:
        - Database operations
        - Error handling
        - Metrics logging
        - Image uploading

        Returns:
            List of dog data dictionaries for BaseScraper processing
        """
        all_dogs = []

        try:
            self.logger.info("Starting MisisRescue data collection")

            # Get all dog URLs from all pages (handles pagination)
            dogs_from_listing = self._get_all_dogs_from_listing()
            self.logger.info(f"Found {len(dogs_from_listing)} available dogs from listing pages")

            # Convert to full URLs
            all_urls = []
            for dog_info in dogs_from_listing:
                relative_url = dog_info["url"]
                full_url = urljoin(self.base_url, relative_url)
                all_urls.append(full_url)

            # Debug: Show sample URLs being processed
            if all_urls:
                self.logger.info(f"Sample URLs from listing (first 3):")
                for url in all_urls[:3]:
                    self.logger.info(f"  {url}")

            # Filter existing URLs if skip is enabled
            self.logger.info(f"🔍 skip_existing_animals: {self.skip_existing_animals}")
            if self.skip_existing_animals:
                self.logger.info(f"📋 Filtering {len(all_urls)} URLs to skip existing animals...")

            urls_to_process = self._filter_existing_urls(all_urls)

            # Track filtering stats for failure detection
            total_skipped = len(all_urls) - len(urls_to_process)
            self.set_filtering_stats(len(all_urls), total_skipped)

            if self.skip_existing_animals and len(urls_to_process) != len(all_urls):
                self.logger.info(f"✅ SKIP EXISTING ANIMALS: Processing {len(urls_to_process)} new URLs (skipped {len(all_urls) - len(urls_to_process)} existing)")
            else:
                self.logger.info(f"📊 Processing all {len(urls_to_process)} URLs")

            # Process URLs in batches with retry mechanism (MisisRescue-specific)
            if urls_to_process:
                all_dogs = self._process_dogs_in_batches(urls_to_process)
            else:
                all_dogs = []

            self.logger.info(f"Successfully collected {len(all_dogs)} valid dogs")
            return all_dogs

        except Exception as e:
            self.logger.error(f"Error in collect_data: {e}")
            return []

    def _get_all_dogs_from_listing(self) -> List[Dict[str, str]]:
        """Get all dog data from listing page.

        IMPORTANT: The website uses JavaScript-based pagination. You must CLICK
        the pagination buttons to navigate between pages. URL parameters don't work.

        Returns:
            List of dog dictionaries with url, name, and image_url
        """
        self.logger.info("Extracting all dogs from all pagination pages")

        all_dogs = []
        page_num = 1

        # Use a single driver session for all pages
        driver = None
        try:
            driver = self._setup_selenium_driver()

            # Load the first page
            self.logger.info(f"Loading initial page: {self.listing_url}")
            driver.get(self.listing_url)

            # Wait for page to load
            WebDriverWait(driver, self.timeout).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
            time.sleep(5)  # Give Wix time to load dynamic content

            # Scroll to bottom to load all dogs on page 1 (lazy loading)
            self._scroll_to_load_all_content(driver)

            # Extract dogs from page 1
            soup = BeautifulSoup(driver.page_source, "html.parser")
            page_dogs = self._extract_dogs_before_reserved(soup)
            self._assign_images_to_dogs(page_dogs, soup)

            all_dogs.extend(page_dogs)
            self.logger.info(f"Page {page_num}: Found {len(page_dogs)} dogs")

            # Now click through pages 2, 3, 4, etc.
            page_num = 2
            while page_num <= 10:  # Safety limit
                try:
                    # Try to find and click the page button
                    if not self._click_pagination_button(driver, page_num):
                        self.logger.info(f"No page {page_num} button found, stopping pagination")
                        break

                    # Wait for page to load after click
                    time.sleep(5)

                    # Scroll to bottom to load all dogs on this page (lazy loading)
                    self._scroll_to_load_all_content(driver)

                    # Extract dogs from this page
                    soup = BeautifulSoup(driver.page_source, "html.parser")
                    page_dogs = self._extract_dogs_before_reserved(soup)
                    self._assign_images_to_dogs(page_dogs, soup)

                    if not page_dogs:
                        self.logger.info(f"No dogs found on page {page_num}, stopping pagination")
                        break

                    all_dogs.extend(page_dogs)
                    self.logger.info(f"Page {page_num}: Found {len(page_dogs)} dogs")

                    page_num += 1

                except Exception as e:
                    self.logger.error(f"Error processing page {page_num}: {e}")
                    break

        finally:
            if driver:
                driver.quit()

        # Remove duplicates (in case same dog appears on multiple pages)
        unique_dogs = []
        seen_urls = set()
        for dog in all_dogs:
            if dog["url"] not in seen_urls:
                unique_dogs.append(dog)
                seen_urls.add(dog["url"])

        self.logger.info(f"Found {len(unique_dogs)} unique dogs across all pages")
        return unique_dogs

    def _get_all_dog_urls(self) -> List[str]:
        """Get all dog URLs from all pages, handling pagination.

        Screenshots show pages 1-4 with numbered pagination buttons.

        Returns:
            List of dog detail page URLs
        """
        all_urls = []
        page_num = 1

        while True:
            try:
                self.logger.info(f"Extracting URLs from page {page_num}")
                page_urls = self._extract_dog_urls_from_page(page_num)

                if not page_urls:
                    self.logger.info(f"No more dogs found on page {page_num}, stopping pagination")
                    break

                all_urls.extend(page_urls)
                self.logger.info(f"Found {len(page_urls)} dogs on page {page_num}")

                page_num += 1

                # Safety limit based on screenshots showing 4 pages
                if page_num > 10:
                    self.logger.warning("Reached maximum page limit (10), stopping")
                    break

            except Exception as e:
                self.logger.error(f"Error extracting URLs from page {page_num}: {e}")
                break

        return all_urls

    def _extract_dogs_from_page(self, page_num: int) -> List[Dict[str, str]]:
        """Extract dog data from a specific page including images.

        Args:
            page_num: Page number to scrape

        Returns:
            List of dog dictionaries with url, name, and image_url
        """
        driver = None

        try:
            driver = self._setup_selenium_driver()

            # Construct page URL
            if page_num == 1:
                page_url = self.listing_url
            else:
                page_url = f"{self.listing_url}?page={page_num}"

            self.logger.info(f"Loading page: {page_url}")
            driver.get(page_url)

            # Wait for page to load
            WebDriverWait(driver, self.timeout).until(EC.presence_of_element_located((By.TAG_NAME, "body")))

            # Give Wix site more time to load dynamic content
            time.sleep(5)

            # Parse page with BeautifulSoup
            soup = BeautifulSoup(driver.page_source, "html.parser")

            # Extract dogs with images from available section
            available_dogs = self._extract_dogs_before_reserved(soup)

            # Extract and assign images to dogs (simplified approach for Wix sites)
            self._assign_images_to_dogs(available_dogs, soup)

            return available_dogs

        except Exception as e:
            self.logger.error(f"Error extracting dogs from page {page_num}: {e}")
            return []
        finally:
            if driver:
                driver.quit()

    def _extract_dog_urls_from_page(self, page_num: int) -> List[str]:
        """Extract dog URLs from a specific page.

        CRITICAL: Must stop extraction when Reserved section is detected!

        Args:
            page_num: Page number to scrape

        Returns:
            List of dog URLs from available section only
        """
        driver = None

        try:
            driver = self._setup_selenium_driver()

            # Construct page URL
            if page_num == 1:
                page_url = self.listing_url
            else:
                page_url = f"{self.listing_url}?page={page_num}"

            self.logger.info(f"Loading page: {page_url}")
            driver.get(page_url)

            # Wait for page to load
            WebDriverWait(driver, self.timeout).until(EC.presence_of_element_located((By.TAG_NAME, "body")))

            # Parse page with BeautifulSoup
            soup = BeautifulSoup(driver.page_source, "html.parser")

            # Extract dogs only from available section (before Reserved)
            available_dogs = self._extract_dogs_before_reserved(soup)

            # Convert to full URLs
            dog_urls = []
            for dog in available_dogs:
                full_url = urljoin(self.base_url, dog["url"])
                dog_urls.append(full_url)

            return dog_urls

        except Exception as e:
            self.logger.error(f"Error extracting URLs from page {page_num}: {e}")
            return []
        finally:
            if driver:
                driver.quit()

    def _extract_dogs_before_reserved(self, soup: BeautifulSoup) -> List[Dict[str, str]]:
        """Extract dog links only from available section, stop at Reserved.

        CRITICAL: This is the key method that enforces the Reserved section skip!

        Fixed logic: Reserved dogs are individual dog names with "(reserved)" in them,
        not section headers. We skip dogs that are themselves marked as reserved.

        Args:
            soup: BeautifulSoup object of the page

        Returns:
            List of dog dictionaries with URL and name
        """
        dogs = []

        # Find all potential dog links (based on DOM analysis)
        # Handle both relative and absolute URLs
        dog_links = soup.find_all("a", href=lambda href: href and "/post/" in href)

        self.logger.info(f"Found {len(dog_links)} total dog links")

        for link in dog_links:
            # Ensure we are dealing with a Tag object
            if not isinstance(link, Tag):
                continue

            # Extract dog info
            href = link.get("href")
            name = link.get_text(strip=True) or "Unknown"

            if href and isinstance(href, str) and "/post/" in href:
                # Check if this individual dog is marked as reserved
                if self._is_reserved_dog(name):
                    self.logger.info(f"Skipping reserved dog: {name}")
                    continue

                # Convert full URL to relative path for consistency
                if href.startswith("http"):
                    from urllib.parse import urlparse

                    parsed = urlparse(href)
                    relative_url = parsed.path
                else:
                    relative_url = href

                self.logger.debug(f"Processing available dog: {name} at {relative_url}")

                # Add available dog (image will be assigned later)
                dogs.append({"url": relative_url, "name": name, "image_url": None})  # Will be assigned by _assign_images_to_dogs

        return dogs

    def _assign_images_to_dogs(self, dogs: List[Dict[str, str]], soup: BeautifulSoup) -> None:
        """Assign images to dogs from the listing page.

        For Wix sites, images are often in separate elements from links.
        This method finds dog images on the page and assigns them to dogs in order.

        Args:
            dogs: List of dog dictionaries to update with image URLs
            soup: BeautifulSoup object of the listing page
        """
        if not dogs:
            return

        # Find all potential dog images on the page
        all_images = soup.find_all("img")
        dog_images = []

        for img in all_images:
            if not isinstance(img, Tag):
                continue
            src = img.get("src")
            if not isinstance(src, str):
                continue

            # Filter for likely dog photos from Wix static content
            if (
                "wixstatic.com" in src
                and any(ext in src.lower() for ext in [".jpg", ".jpeg", ".png", ".webp"])
                and not any(skip in src.lower() for skip in ["logo", "icon", "button", "header", "footer"])
            ):

                # Skip very small images (likely icons)
                if "w_" in src:
                    # Extract width from Wix URL parameters
                    try:
                        width_param = [p for p in src.split(",") if "w_" in p][0]
                        width = int(width_param.split("w_")[1])
                        if width < 200:  # Skip small images
                            continue
                    except (IndexError, ValueError):
                        pass

                dog_images.append(src)

        self.logger.info(f"Found {len(dog_images)} potential dog images on listing page")

        # Assign images to dogs using deterministic matching
        # Sort both lists to ensure consistent assignment across runs
        sorted_dogs = sorted(dogs, key=lambda d: d["url"])  # Sort by URL for stability
        sorted_images = sorted(dog_images)  # Sort images for stability

        for i, dog in enumerate(sorted_dogs):
            if i < len(sorted_images):
                dog["image_url"] = sorted_images[i]
                self.logger.debug(f"Assigned image to {dog['name']}: {sorted_images[i]}")
            else:
                # If we run out of images, leave image_url as None
                self.logger.debug(f"No image available for {dog['name']}")

    def _is_reserved_dog(self, name: str) -> bool:
        """Check if a dog name indicates it's reserved.

        Args:
            name: Dog name to check

        Returns:
            True if dog is marked as reserved
        """
        if not name:
            return False

        name_lower = name.lower()

        # Check for reserved indicators in dog name
        reserved_indicators = [
            "reserved",
            "reserviert",
            "bereits reserviert",
            "wir sind bereits reserviert",
            "(reserved)",
            "(reserviert)",
        ]

        for indicator in reserved_indicators:
            if indicator in name_lower:
                return True

        return False

    def _is_link_in_reserved_section(self, link, soup: BeautifulSoup) -> bool:
        """Check if a dog link is in the Reserved section.

        Args:
            link: BeautifulSoup link element
            soup: Full page soup for context

        Returns:
            True if link is in Reserved section
        """
        # Find any Reserved section headers
        reserved_headers = soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"])

        for header in reserved_headers:
            if isinstance(header, Tag) and self._is_reserved_section(header):
                # Check if this link comes after the Reserved header in DOM order
                # Get all elements in document order
                all_elements = soup.find_all()

                try:
                    header_index = all_elements.index(header)
                    link_index = all_elements.index(link)

                    # If link comes after reserved header, it's in reserved section
                    if link_index > header_index:
                        return True
                except ValueError:
                    # Element not found in list, continue checking
                    continue

        return False

    def _is_reserved_section(self, element: Tag) -> bool:
        """Check if element is a Reserved section header.

        Screenshots show clear "Reserved" headers - must detect these!

        Args:
            element: BeautifulSoup element to check

        Returns:
            True if element indicates Reserved section
        """
        if not element:
            return False

        text = element.get_text().lower().strip()

        # Check for various Reserved section indicators
        reserved_indicators = [
            "reserved",
            "reserviert",
            "bereits reserviert",
            "wir sind bereits reserviert",
        ]

        for indicator in reserved_indicators:
            if indicator in text:
                return True

        return False

    def _scrape_dog_detail(self, url: str) -> Optional[Dict[str, Any]]:
        """Scrape individual dog detail page.

        Args:
            url: Full URL to dog detail page

        Returns:
            Dog data dictionary or None if error
        """
        driver = None

        try:
            driver = self._setup_selenium_driver()

            self.logger.debug(f"Loading detail page: {url}")
            driver.get(url)

            # Enhanced wait for Wix dynamic content to fully load
            try:
                # Wait for main content to appear
                WebDriverWait(driver, self.timeout).until(EC.presence_of_element_located((By.TAG_NAME, "body")))

                # Give extra time for Wix to load dynamic content
                time.sleep(3)

                # Scroll to trigger lazy loading of all content
                self._scroll_detail_page_for_content(driver)

                # Wait for any h1 tag (dog name) to ensure content loaded
                WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, "h1")))

                # Additional wait for images to load
                time.sleep(2)

            except TimeoutException:
                self.logger.warning(f"Timeout waiting for content on {url}, proceeding with what loaded")

            # Parse with BeautifulSoup and detail parser
            soup = BeautifulSoup(driver.page_source, "html.parser")
            dog_data = self.detail_parser.parse_detail_page(soup)

            # Add required fields for BaseScraper
            dog_data["external_id"] = self._generate_external_id(url)
            dog_data["adoption_url"] = url
            dog_data["organization_id"] = self.organization_id

            # Extract the main image - try hero image first, then grid fallback
            main_image_url = self._extract_main_image(driver, soup)
            if main_image_url:
                dog_data["image_urls"] = [main_image_url]
                dog_data["primary_image_url"] = main_image_url
            else:
                self.logger.warning(f"No image found for dog at {url}")

            return dog_data

        except Exception as e:
            self.logger.error(f"Error scraping dog detail {url}: {e}")
            return None
        finally:
            if driver:
                driver.quit()

    def _extract_image_urls(self, soup: BeautifulSoup) -> List[str]:
        """Extract image URLs from dog detail page.

        Args:
            soup: BeautifulSoup object of detail page

        Returns:
            List of image URLs
        """
        image_urls = []

        # Look for images in various containers
        img_tags = soup.find_all("img")

        for img in img_tags:
            if not isinstance(img, Tag):
                continue
            src = img.get("src")
            # Ensure src is a string, as .get() can return a list for some attributes
            if isinstance(src, str) and self._is_valid_dog_image(src):
                # Convert relative URLs to absolute
                full_url = urljoin(self.base_url, src)
                image_urls.append(full_url)

        return image_urls

    def _is_valid_dog_image(self, src: str) -> bool:
        """Check if image URL is likely a dog photo.

        Args:
            src: Image source URL

        Returns:
            True if likely a dog image
        """
        if not src:
            return False

        src_lower = src.lower()

        # Skip common non-dog images
        skip_patterns = ["logo", "icon", "button", "social", "header", "footer"]

        for pattern in skip_patterns:
            if pattern in src_lower:
                return False

        # Check for image file extensions
        image_extensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"]

        if any(ext in src_lower for ext in image_extensions):
            return True

        return False

    def _generate_external_id(self, url: str) -> str:
        """Generate external ID from dog detail page URL.

        Args:
            url: Dog detail page URL

        Returns:
            External ID string
        """
        try:
            # Extract from URL pattern: /post/dog-name
            parsed = urlparse(url)
            path_parts = parsed.path.strip("/").split("/")

            if len(path_parts) >= 2 and path_parts[0] == "post":
                return path_parts[1]

        except Exception:
            pass

        # Fallback: generate from URL hash
        import hashlib

        return hashlib.md5(url.encode()).hexdigest()[:8]

    def _validate_dog_data(self, dog_data: Dict[str, Any]) -> bool:
        """Validate dog data has required fields using enhanced BaseScraper validation.

        Args:
            dog_data: Dog data dictionary

        Returns:
            True if data is valid
        """
        # Use enhanced validation from BaseScraper that includes invalid name detection
        return self._validate_animal_data(dog_data)

    def _setup_selenium_driver(self) -> webdriver.Chrome:
        """Setup Chrome WebDriver with appropriate options.

        Returns:
            Configured Chrome WebDriver instance
        """
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument("--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

        return webdriver.Chrome(options=chrome_options)

    def _click_pagination_button(self, driver: webdriver.Chrome, page_num: int) -> bool:
        """Click a pagination button to navigate to a specific page.

        Args:
            driver: Selenium WebDriver instance
            page_num: Page number to navigate to

        Returns:
            True if button was found and clicked, False otherwise
        """
        try:
            # Look for clickable page number using XPath
            # This handles buttons, links, or spans with the page number
            xpath = f'//button[text()="{page_num}"] | //a[text()="{page_num}"] | //span[text()="{page_num}"]'
            elements = driver.find_elements(By.XPATH, xpath)

            if not elements:
                self.logger.debug(f"No pagination button found for page {page_num}")
                return False

            element = elements[0]
            self.logger.debug(f"Found pagination button for page {page_num}")

            # Scroll to element to ensure it's visible
            driver.execute_script("arguments[0].scrollIntoView(true);", element)
            time.sleep(1)

            # Try to click the element
            element.click()
            self.logger.info(f"✅ Successfully clicked page {page_num} button")
            return True

        except Exception as e:
            self.logger.error(f"Error clicking page {page_num} button: {e}")
            return False

    def _scroll_to_load_all_content(self, driver: webdriver.Chrome) -> None:
        """Scroll to bottom of page to trigger lazy loading of all dogs.

        Args:
            driver: Selenium WebDriver instance
        """
        self.logger.info("Scrolling to load all content (lazy loading)")

        # Get initial number of dogs
        initial_dogs = len(driver.find_elements(By.XPATH, '//a[contains(@href, "/post/")]'))
        self.logger.debug(f"Initial dogs visible: {initial_dogs}")

        scroll_attempts = 0
        max_scrolls = 20  # Safety limit

        while scroll_attempts < max_scrolls:
            # Scroll to bottom
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)  # Wait for lazy loading

            # Check if new dogs loaded
            current_dogs = len(driver.find_elements(By.XPATH, '//a[contains(@href, "/post/")]'))

            if current_dogs > initial_dogs:
                self.logger.debug(f"New dogs loaded: {current_dogs} (was {initial_dogs})")
                initial_dogs = current_dogs
                scroll_attempts = 0  # Reset counter when new content loads
            else:
                scroll_attempts += 1

            # If no new content loaded for several attempts, we're done
            if scroll_attempts >= 3:
                break

        final_dogs = len(driver.find_elements(By.XPATH, '//a[contains(@href, "/post/")]'))
        self.logger.info(f"Finished scrolling. Total dogs visible: {final_dogs}")

    def _scroll_detail_page_for_content(self, driver: webdriver.Chrome) -> None:
        """Scroll detail page to load all content including images.

        Args:
            driver: Selenium WebDriver instance
        """
        self.logger.debug("Scrolling detail page to load all content")

        # Scroll to multiple positions to trigger all lazy loading
        scroll_positions = [0, 0.25, 0.5, 0.75, 1.0]

        for position in scroll_positions:
            scroll_target = f"document.body.scrollHeight * {position}"
            driver.execute_script(f"window.scrollTo(0, {scroll_target});")
            time.sleep(1)  # Wait for content to load at each position

        # Scroll back to top to ensure hero image loads
        driver.execute_script("window.scrollTo(0, 0);")
        time.sleep(1)

        # Final scroll to image grid area (usually middle of page)
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight * 0.5);")
        time.sleep(1)

    def _extract_main_image(self, driver: webdriver.Chrome, soup: BeautifulSoup) -> Optional[str]:
        """Extract the main image for the dog - hero image or enhanced grid fallback.

        Args:
            driver: Selenium WebDriver instance
            soup: BeautifulSoup object of the detail page

        Returns:
            URL of the main image or None if not found
        """
        # First try to get hero image
        hero_url = self._extract_hero_image(soup)

        # Check if hero image is good quality (at least 600px wide)
        if hero_url and self._is_high_quality_image(hero_url):
            self.logger.debug(f"Using high-quality hero image: {hero_url}")
            return hero_url

        # If no hero image or low quality, try enhanced grid extraction with click-and-wait
        self.logger.debug("Hero image not suitable, trying enhanced grid extraction")
        grid_image = self._extract_first_grid_image(driver, soup)
        if grid_image:
            self.logger.debug(f"Using enhanced grid image: {grid_image}")
            return grid_image

        # Last resort - return any hero image we found
        if hero_url:
            self.logger.debug(f"Using fallback hero image: {hero_url}")
            return hero_url

        self.logger.warning("No suitable image found")
        return None

    def _is_high_quality_image(self, image_url: str) -> bool:
        """Check if image is high quality (>= 600px width).

        Args:
            image_url: Image URL to check

        Returns:
            True if image is high quality
        """
        if not image_url:
            return False

        width = self._extract_image_width(image_url)
        return width is not None and width >= 600

    def _extract_first_grid_image(self, driver: webdriver.Chrome, soup: BeautifulSoup) -> Optional[str]:
        """Extract the first image from the image grid with click-and-wait for high-res.

        IMPORTANT: Avoid images from 'Related Posts' section at bottom of page.

        Args:
            driver: Selenium WebDriver instance
            soup: BeautifulSoup object of the detail page

        Returns:
            URL of the first grid image or None if not found
        """
        try:
            # Wait for image grid to be present
            WebDriverWait(driver, 5).until(EC.presence_of_element_located((By.CSS_SELECTOR, "img[src*='wixstatic.com']")))

            # Find all grid images using WebDriver, but exclude related posts section
            # Try to find main content area first to avoid related posts
            main_content_images: List[Any] = []

            # Try multiple selectors to find main content area
            main_content_selectors = [
                "main img[src*='wixstatic.com']",  # Images in main content
                "article img[src*='wixstatic.com']",  # Images in article
                "[data-testid='richTextElement'] img[src*='wixstatic.com']",  # Wix rich text
                ".main img[src*='wixstatic.com']",  # Main class
            ]

            for selector in main_content_selectors:
                try:
                    content_images = driver.find_elements(By.CSS_SELECTOR, selector)
                    if content_images:
                        main_content_images = content_images
                        self.logger.debug(f"Found {len(main_content_images)} images in main content using selector: {selector}")
                        break
                except Exception as e:
                    self.logger.debug(f"Selector {selector} failed: {e}")

            # If no main content images found, fall back to all images but filter out related posts
            if not main_content_images:
                all_images = driver.find_elements(By.CSS_SELECTOR, "img[src*='wixstatic.com']")
                self.logger.debug(f"Found {len(all_images)} total images on page")

                # Filter out images that are likely from related posts section
                main_content_images = []
                for img in all_images:
                    try:
                        # Check if image is in related posts section
                        parent_text = img.find_element(
                            By.XPATH,
                            "./ancestor::*[contains(text(), 'Related') or contains(text(), 'related')]",
                        )
                        if parent_text:
                            self.logger.debug("Skipping image in related posts section")
                            continue
                    except NoSuchElementException:
                        # If no related posts parent found, it's likely in main content
                        pass

                    # Check if image is near bottom of page (likely related posts)
                    try:
                        img_location = img.location_once_scrolled_into_view
                        page_height = driver.execute_script("return document.body.scrollHeight")
                        if img_location["y"] > page_height * 0.8:  # Bottom 20% of page
                            self.logger.debug(f"Skipping image near bottom of page (y={img_location['y']}, page_height={page_height})")
                            continue
                    except Exception:
                        pass

                    main_content_images.append(img)

                self.logger.debug(f"Filtered to {len(main_content_images)} main content images")

            # Look for suitable grid images (skip first few which are usually hero/header)
            suitable_images = []
            for i, img in enumerate(main_content_images[2:], 2):  # Skip first 2
                try:
                    src = img.get_attribute("src")
                    if src and "w_" in src and not any(skip in src.lower() for skip in ["logo", "icon", "button", "header", "footer"]) and img.is_displayed() and img.is_enabled():

                        # Check minimum size
                        width = self._extract_image_width(src)
                        if width and width >= 200:  # Minimum size for grid image

                            # CRITICAL: Exclude 289x162 images which are likely related posts
                            size = img.size
                            if size and size.get("width") == 289 and size.get("height") == 162:
                                self.logger.debug(f"Skipping 289x162 image {i} (likely related posts): {src[:100]}...")
                                continue

                            # Exclude images with specific problematic hash that we know is wrong
                            if "ef9e05_aac9fec0f9a64d0fba7e40a67965686b" in src:
                                self.logger.debug(f"Skipping known problematic image {i}: {src[:100]}...")
                                continue

                            suitable_images.append((i, img, src, width))
                            self.logger.debug(f"Suitable grid image {i}: width={width}px, size={size}")

                except Exception as e:
                    self.logger.debug(f"Skipping image {i}: {e}")

            if not suitable_images:
                self.logger.warning("No suitable grid images found for click-and-wait")
                return None

            # Sort by width (largest first) and take the first one
            suitable_images.sort(key=lambda x: x[3], reverse=True)
            img_index, first_grid_img, initial_src, initial_width = suitable_images[0]

            self.logger.debug(f"Selected grid image {img_index}: {initial_width}px wide")

            # Scroll to image and click
            driver.execute_script("arguments[0].scrollIntoView(true);", first_grid_img)
            time.sleep(1)

            self.logger.debug(f"Initial grid image: {initial_src}")

            # Click to trigger high-res loading
            try:
                first_grid_img.click()
                self.logger.debug("Clicked grid image, waiting for high-res version...")

                # Wait up to 5 seconds for high-res version to load
                high_res_src = self._wait_for_high_res_image(driver, first_grid_img, initial_src)

                if high_res_src and high_res_src != initial_src:
                    self.logger.debug(f"High-res grid image loaded: {high_res_src}")
                    return high_res_src
                else:
                    self.logger.debug("High-res image didn't load, using initial version")
                    return initial_src

            except Exception as e:
                self.logger.error(f"Error clicking grid image: {e}")
                return initial_src

        except TimeoutException:
            self.logger.debug("No image grid found on page")
        except Exception as e:
            self.logger.error(f"Error extracting grid image: {e}")

        return None

    def _extract_hero_image(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract the main hero image from the detail page.

        The hero image is the main large image displayed at the top of the detail page.
        IMPORTANT: Avoid images from 'Related Posts' section at bottom of page.

        Args:
            soup: BeautifulSoup object of the detail page

        Returns:
            URL of the hero image or None if not found
        """
        # Look for the main hero image - usually the largest image near the top
        # In Wix sites, this is often the first substantial image
        # But we need to avoid the related posts section at the bottom

        # First try to find images in main content areas only
        main_content_images: List[Tag] = []

        # Try to find main content containers first
        main_selectors = [
            "main img",
            "article img",
            "[role='main'] img",
            ".main img",
        ]  # Images in main content  # Images in article  # Images in main role  # Images in main class

        for selector in main_selectors:
            try:
                content_imgs = soup.select(selector)
                if content_imgs:
                    main_content_images.extend(content_imgs)
                    self.logger.debug(f"Found {len(content_imgs)} images with selector: {selector}")
            except Exception as e:
                self.logger.debug(f"Selector {selector} failed: {e}")

        # If no main content images found, fall back to all images but filter out related posts
        if not main_content_images:
            all_images = soup.find_all("img")

            for img in all_images:
                if not isinstance(img, Tag):
                    continue

                # Check if image is in related posts section
                is_in_related_posts = False

                # Check if any parent element contains "related" text
                parent = img.parent
                while parent and parent.name != "html":
                    parent_text = parent.get_text().lower() if parent.get_text() else ""
                    if "related" in parent_text and "post" in parent_text:
                        is_in_related_posts = True
                        break
                    parent = parent.parent

                # Check for specific related posts classes/IDs that Wix might use
                parent_attrs = str(img.parent) if img.parent else ""
                if any(term in parent_attrs.lower() for term in ["related", "recommendation", "suggestion"]):
                    is_in_related_posts = True

                if not is_in_related_posts:
                    main_content_images.append(img)

        self.logger.debug(f"Filtered to {len(main_content_images)} main content images")

        # Now look for hero images in the filtered list
        for img in main_content_images:
            # Make sure img is a Tag that has the get method
            if not isinstance(img, Tag):
                continue

            # Get the src attribute safely
            src = img.get("src")
            if not isinstance(src, str):
                continue

            # Filter for substantial dog photos from Wix static content
            if (
                "wixstatic.com" in src
                and any(ext in src.lower() for ext in [".jpg", ".jpeg", ".png", ".webp"])
                and not any(skip in src.lower() for skip in ["logo", "icon", "button", "header", "footer"])
            ):

                # CRITICAL: Exclude images with specific problematic hash that we know is wrong
                if "ef9e05_aac9fec0f9a64d0fba7e40a67965686b" in src:
                    self.logger.debug(f"Skipping known problematic hero image: {src[:100]}...")
                    continue

                # Look for larger images (hero images are typically bigger)
                if "w_" in src:
                    try:
                        width_param = [p for p in src.split(",") if "w_" in p][0]
                        width = int(width_param.split("w_")[1])

                        # CRITICAL: Exclude 289x162 images which are likely related posts
                        height_param = [p for p in src.split(",") if "h_" in p and "h_" in p][0] if any("h_" in p for p in src.split(",")) else None
                        if height_param:
                            try:
                                height = int(height_param.split("h_")[1])
                                if width == 289 and height == 162:
                                    self.logger.debug(f"Skipping 289x162 hero image (likely related posts): {src[:100]}...")
                                    continue
                            except (IndexError, ValueError):
                                pass

                        # Hero images are typically at least 400px wide
                        if width >= 400:
                            self.logger.debug(f"Found hero image: {src}")
                            return src
                    except (IndexError, ValueError):
                        # Continue if we can't parse the width
                        pass
                else:
                    # Return any image we found if we can't determine size
                    self.logger.debug(f"Found potential hero image: {src}")
                    return src

        self.logger.warning("No hero image found on detail page")
        return None

    def _process_dogs_in_batches(self, urls: List[str]) -> List[Dict[str, Any]]:
        """Process dog URLs in batches using concurrent processing (MisisRescue-specific).

        Args:
            urls: List of URLs to process

        Returns:
            List of valid dog data dictionaries
        """
        if not urls:
            return []

        # Split URLs into batches
        batches = [urls[i : i + self.batch_size] for i in range(0, len(urls), self.batch_size)]
        all_results = []

        self.logger.info(f"Processing {len(urls)} URLs in {len(batches)} batches of {self.batch_size}")

        for batch_num, batch_urls in enumerate(batches, 1):
            self.logger.info(f"Processing batch {batch_num}/{len(batches)} ({len(batch_urls)} URLs)")

            batch_results = self._process_single_batch(batch_urls)
            all_results.extend(batch_results)

            # Rate limiting between batches
            if batch_num < len(batches):
                time.sleep(self.rate_limit_delay)

        self.logger.info(f"Batch processing complete. Processed {len(all_results)} valid dogs from {len(urls)} URLs")
        return all_results

    def _process_single_batch(self, urls: List[str]) -> List[Dict[str, Any]]:
        """Process a single batch of URLs concurrently.

        Args:
            urls: Batch of URLs to process

        Returns:
            List of valid dog data dictionaries from this batch
        """
        from concurrent.futures import ThreadPoolExecutor, as_completed

        results = []

        with ThreadPoolExecutor(max_workers=self.batch_size) as executor:
            # Submit all tasks
            future_to_url = {executor.submit(self._scrape_with_retry, self._scrape_dog_detail, url): url for url in urls}

            # Collect results as they complete
            for future in as_completed(future_to_url):
                url = future_to_url[future]
                try:
                    result = future.result()
                    if result and self._validate_dog_data(result):
                        results.append(result)
                    else:
                        self.logger.warning(f"Invalid or empty data for URL: {url}")
                except Exception as e:
                    self.logger.error(f"Error processing {url}: {e}")

        return results

    def _extract_image_width(self, image_url: str) -> Optional[int]:
        """Extract width from Wix image URL parameters.

        Args:
            image_url: Wix image URL containing width parameter

        Returns:
            Width in pixels or None if not found
        """
        if not image_url or "w_" not in image_url:
            return None

        try:
            width_param = [p for p in image_url.split(",") if "w_" in p][0]
            width = int(width_param.split("w_")[1])
            return width
        except (IndexError, ValueError):
            return None

    def _wait_for_high_res_image(self, driver: webdriver.Chrome, img_element, initial_src: str, max_wait: int = 5) -> Optional[str]:
        """Wait for image src to change to high-res version after clicking.

        Args:
            driver: Selenium WebDriver instance
            img_element: WebDriver image element
            initial_src: Initial image source URL
            max_wait: Maximum seconds to wait

        Returns:
            High-res image URL or None if timeout
        """
        start_time = time.time()

        while time.time() - start_time < max_wait:
            try:
                current_src = img_element.get_attribute("src")

                # Check if src has changed (indicating high-res loaded)
                if current_src != initial_src:
                    current_width = self._extract_image_width(current_src)
                    initial_width = self._extract_image_width(initial_src)

                    self.logger.debug(f"Image src changed: {initial_width}px → {current_width}px")
                    return current_src

            except Exception as e:
                self.logger.debug(f"Error checking image: {e}")

            time.sleep(0.5)  # Check every 500ms

        self.logger.debug("Timeout waiting for high-res image")
        return None
