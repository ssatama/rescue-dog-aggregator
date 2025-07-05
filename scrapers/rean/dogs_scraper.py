import re
import time
from typing import Any, Dict, List, Optional

import requests
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

from scrapers.base_scraper import BaseScraper


class REANScraper(BaseScraper):
    """REAN (Rescuing European Animals in Need) scraper for Romania and UK foster dogs."""

    def __init__(self, config_id="rean", organization_id=None):
        """Initialize REAN scraper with configuration."""
        if organization_id is not None:
            # Legacy mode - use organization_id
            super().__init__(organization_id=organization_id)
        else:
            # New mode - use config_id
            super().__init__(config_id=config_id)
        self.base_url = "https://rean.org.uk"
        self.pages = {
            "romania": "/dogs-%26-puppies-in-romania",
            "uk_foster": "/dogs-in-foster-in-the-uk",
        }

    def extract_dog_content_from_html(self, html_content: str) -> List[str]:
        """
        Extract individual dog content blocks from HTML.

        Args:
            html_content: Raw HTML content

        Returns:
            List of text blocks, each containing info about one dog
        """
        try:
            soup = BeautifulSoup(html_content, "html.parser")

            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()

            # Look for elements that might contain dog information
            # Try to find paragraph tags with dog-related content
            dog_blocks = []

            # Approach 1: Look for paragraphs containing age information
            paragraphs = soup.find_all(["p", "div", "span"])
            current_block = []

            for element in paragraphs:
                text = element.get_text().strip()
                if not text:
                    continue

                # Check if this text contains dog-related information
                if any(pattern in text.lower() for pattern in ["months old", "years old", "vaccinated", "chipped"]):
                    current_block.append(text)
                elif "updated" in text.lower() and re.search(r"\d+/\d+/\d+", text):
                    # This is an update timestamp - include it in the current block
                    # then finalize the dog block
                    current_block.append(text)
                    if current_block:
                        dog_blocks.append(" ".join(current_block))
                        current_block = []
                elif current_block:  # We're in a dog block, collect all text
                    current_block.append(text)
                elif len(text) > 20:  # Standalone text that might be part of a dog block
                    # Start a new block if this looks like it could be dog content
                    current_block.append(text)

            # Add the last block if it exists
            if current_block:
                dog_blocks.append(" ".join(current_block))

            # If no blocks found, try a different approach
            if not dog_blocks:
                # Get all text and try to parse it with improved patterns
                full_text = soup.get_text()

                # Look for dog name patterns in the full text
                # This is a fallback approach
                name_age_pattern = r"([A-Za-z]+)\s+is\s+(?:around\s+)?(\d+(?:\.\d+)?)\s+(months?|years?)\s+old"
                matches = re.finditer(name_age_pattern, full_text, re.IGNORECASE)

                for match in matches:
                    # Extract surrounding context for each dog
                    start = max(0, match.start() - 100)
                    end = min(len(full_text), match.end() + 300)
                    context = full_text[start:end].strip()
                    if context:
                        dog_blocks.append(context)

            self.logger.info(f"Extracted {len(dog_blocks)} dog content blocks from HTML")
            return dog_blocks

        except Exception as e:
            self.logger.error(f"Error extracting dog content from HTML: {e}")
            return []

    def extract_images_from_html(self, html_content: str) -> List[str]:
        """
        Extract image URLs from HTML content.

        Args:
            html_content: Raw HTML content

        Returns:
            List of image URLs (excluding base64 placeholders)
        """
        try:
            soup = BeautifulSoup(html_content, "html.parser")
            image_urls = []

            # Extract from img tags
            for img in soup.find_all("img"):
                # Only process Tag elements (not NavigableString or other types)
                if not hasattr(img, "get"):
                    continue

                # Check src attribute
                src = img.get("src", "")
                if src and not src.startswith("data:"):
                    # Normalize protocol-relative URLs
                    if src.startswith("//"):
                        src = "https:" + src
                    image_urls.append(src)

                # Check data-src for lazy loading
                data_src = img.get("data-src", "")
                if data_src and not data_src.startswith("data:"):
                    if data_src.startswith("//"):
                        data_src = "https:" + data_src
                    image_urls.append(data_src)

            # Extract from CSS background-image styles
            for element in soup.find_all(attrs={"style": True}):
                # Only process Tag elements (not NavigableString or other types)
                if not hasattr(element, "get"):
                    continue
                style = element.get("style", "")
                # Look for background-image URLs
                bg_matches = re.findall(r"background-image:\s*url\(['\"]?([^'\")\s]+)['\"]?\)", style)
                for bg_url in bg_matches:
                    if not bg_url.startswith("data:"):
                        if bg_url.startswith("//"):
                            bg_url = "https:" + bg_url
                        image_urls.append(bg_url)

            # Remove duplicates while preserving order
            unique_images = []
            for url in image_urls:
                if url not in unique_images:
                    unique_images.append(url)

            self.logger.info(f"Extracted {len(unique_images)} image URLs from HTML")
            return unique_images

        except Exception as e:
            self.logger.error(f"Error extracting images from HTML: {e}")
            return []

    def determine_dog_image(self, dog_name: str, available_images: List[str]) -> Optional[str]:
        """
        Determine the best image for a specific dog.

        Args:
            dog_name: Name of the dog
            available_images: List of available image URLs from the page

        Returns:
            Best image URL for the dog, or None if no suitable image found
        """
        # Filter out known non-dog images (like logos)
        dog_images = []
        for img_url in available_images:
            # Skip obvious logos and icons
            if any(term in img_url.lower() for term in ["logo", "icon", "favicon"]):
                continue
            dog_images.append(img_url)

        # For now, since REAN uses placeholders, we'll return None
        # This allows the system to use default placeholder handling
        # In the future, this method can be enhanced to:
        # 1. Match images to dogs by position/context
        # 2. Use facial recognition or AI to identify dog photos
        # 3. Use external image sources (Facebook, etc.)

        if dog_images:
            # Log available images for debugging
            self.logger.info(f"Available images for {dog_name}: {len(dog_images)} found")
            # For now, return None to use system defaults
            # TODO: Implement image-to-dog matching logic

        return None

    def extract_images_with_browser(self, url: str) -> List[str]:
        """
        Extract image URLs using Selenium WebDriver to handle JavaScript-loaded images.

        This method uses browser automation to:
        1. Load the page and wait for JavaScript execution
        2. Scroll to trigger lazy loading of images
        3. Extract actual image URLs from wsimg.com CDN
        4. Filter out placeholders and non-REAN images

        Args:
            url: The URL to scrape for images

        Returns:
            List of actual image URLs from REAN's CDN (wsimg.com)
        """
        try:
            # Configure Chrome options for headless operation
            chrome_options = Options()
            chrome_options.add_argument("--headless")  # Run in background
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--window-size=1920,1080")
            chrome_options.add_argument("--user-agent=Mozilla/5.0 (compatible; RescueDogAggregator/1.0)")

            # Initialize WebDriver
            self.logger.info(f"Starting browser automation for image extraction: {url}")
            driver = webdriver.Chrome(options=chrome_options)

            try:
                # Load the page
                driver.get(url)
                self.logger.info("Page loaded, waiting for JavaScript execution...")

                # Wait for initial page load and JavaScript execution
                time.sleep(5)

                # Scroll to the bottom to trigger lazy loading of all images
                self.logger.info("Scrolling to trigger lazy loading...")
                driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                time.sleep(3)  # Wait for lazy loading to complete

                # Scroll back to top and then slowly down to ensure all images
                # load
                driver.execute_script("window.scrollTo(0, 0);")
                time.sleep(1)

                # Progressive scroll to ensure all images are in viewport at
                # some point
                total_height = driver.execute_script("return document.body.scrollHeight")
                current_position = 0
                scroll_increment = 500

                while current_position < total_height:
                    driver.execute_script(f"window.scrollTo(0, {current_position});")
                    time.sleep(1)  # Allow images to load
                    current_position += scroll_increment

                self.logger.info("Scrolling complete, extracting image URLs...")

                # Extract all image elements
                img_elements = driver.find_elements(By.TAG_NAME, "img")
                self.logger.info(f"Found {len(img_elements)} img elements on page")

                # Filter for actual REAN CDN images (wsimg.com)
                actual_images = []
                for img in img_elements:
                    src = img.get_attribute("src")
                    if src and self._is_valid_rean_image(src):
                        # Clean the URL to remove problematic transformations
                        cleaned_src = self._clean_wsimg_url(src)
                        actual_images.append(cleaned_src)
                        self.logger.debug(f"Found valid REAN image: {cleaned_src[:80]}...")

                self.logger.info(f"Extracted {len(actual_images)} valid REAN images from {url}")
                return actual_images

            finally:
                # Always clean up the browser
                driver.quit()

        except Exception as e:
            self.logger.error(f"Error during browser-based image extraction: {e}")
            return []

    def _is_valid_rean_image(self, src: str) -> bool:
        """
        Check if an image URL is a valid REAN dog image.

        Args:
            src: Image source URL

        Returns:
            True if this appears to be a valid REAN dog image
        """
        if not src:
            return False

        # Skip placeholder images
        if src.startswith("data:"):
            return False

        # Must be from REAN's CDN (GoDaddy Website Builder uses wsimg.com)
        if "wsimg.com" not in src:
            return False

        # Skip obvious non-dog images
        exclude_patterns = [
            "logo",
            "icon",
            "favicon",
            "header",
            "footer",
            "background",
            "banner",
            "button",
            "arrow",
        ]

        src_lower = src.lower()
        for pattern in exclude_patterns:
            if pattern in src_lower:
                return False

        return True

    def _clean_wsimg_url(self, wsimg_url: str) -> str:
        """
        Clean wsimg.com URLs to remove problematic transformations for Cloudinary.

        Args:
            wsimg_url: Original wsimg.com URL with transformations

        Returns:
            Cleaned URL that Cloudinary can process
        """
        if not wsimg_url or "wsimg.com" not in wsimg_url:
            return wsimg_url

        # Remove transformation parameters that cause issues with Cloudinary
        # Example: .../image.jpg/:/cr=t:12.5%25,l:0%25,w:100%25,h:75%25/rs=w:600,h:600,cg:true
        # We want: .../image.jpg

        try:
            # Split on '/:/'' which marks the start of transformations
            if "/::/" in wsimg_url:
                # Handle double colon format (note the extra slash)
                clean_url = wsimg_url.split("/::/")[0]
            elif "/::" in wsimg_url:
                # Handle double colon format without slash
                clean_url = wsimg_url.split("/::")[0]
            elif "/:/" in wsimg_url:
                # Handle single colon format (more common)
                clean_url = wsimg_url.split("/:/")[0]
            else:
                # No transformations found, return as-is
                clean_url = wsimg_url

            self.logger.debug(f"Cleaned wsimg URL: {wsimg_url[:80]}... -> {clean_url[:80]}...")
            return clean_url

        except Exception as e:
            self.logger.warning(f"Error cleaning wsimg URL {wsimg_url[:50]}...: {e}")
            return wsimg_url

    def associate_images_with_dogs(self, dog_data_list: List[Dict[str, Any]], image_urls: List[str]) -> List[Dict[str, Any]]:
        """
        Associate extracted images with specific dogs using improved matching algorithms.

        This method addresses the "off by one" image association issue by implementing
        multiple strategies to correctly match images to dogs:

        1. Smart offset detection for header/navigation images
        2. Content-aware filtering of non-dog images
        3. Fallback to position-based matching with offset correction

        Args:
            dog_data_list: List of dog data dictionaries
            image_urls: List of image URLs extracted from the page

        Returns:
            List of dog data with associated primary_image_url where available
        """
        if not dog_data_list:
            return []

        self.logger.info(f"Associating {len(image_urls)} images with {len(dog_data_list)} dogs using improved matching")

        # Step 1: Filter out obvious non-dog images with enhanced filtering
        filtered_images = self._filter_non_dog_images(image_urls)
        self.logger.info(f"Filtered {len(image_urls)} raw images down to {len(filtered_images)} potential dog images")

        # Step 2: Detect and correct for common offset patterns
        offset = self._detect_image_offset(filtered_images, len(dog_data_list))
        if offset > 0:
            self.logger.info(f"Detected image offset of {offset} - adjusting association strategy")

        # Step 3: Associate images with dogs using corrected positioning
        enriched_dogs = []

        for i, dog_data in enumerate(dog_data_list):
            enriched_dog = dog_data.copy()

            # Apply offset correction for association
            image_index = i + offset

            if image_index < len(filtered_images):
                enriched_dog["primary_image_url"] = filtered_images[image_index]
                self.logger.debug(f"Associated image {image_index+1} (offset-corrected) with dog '{dog_data.get('name', 'Unknown')}'")
            else:
                # No image available for this dog
                self.logger.debug(f"No image available for dog '{dog_data.get('name', 'Unknown')}'")

            enriched_dogs.append(enriched_dog)

        # Log summary
        dogs_with_images = sum(1 for dog in enriched_dogs if "primary_image_url" in dog)
        self.logger.info(f"Successfully associated images with {dogs_with_images}/{len(dog_data_list)} dogs (offset: {offset})")

        return enriched_dogs

    def _filter_non_dog_images(self, image_urls: List[str]) -> List[str]:
        """
        Enhanced filtering to remove non-dog images more effectively.

        Args:
            image_urls: List of image URLs to filter

        Returns:
            List of URLs that are likely to be dog photos
        """
        filtered_images = []

        for url in image_urls:
            # Skip if basic REAN image validation fails
            if not self._is_valid_rean_image(url):
                continue

            # Enhanced filtering for common non-dog image patterns
            url_lower = url.lower()

            # More comprehensive exclusion patterns
            exclude_patterns = [
                "logo",
                "icon",
                "favicon",
                "header",
                "footer",
                "background",
                "banner",
                "button",
                "arrow",
                "nav",
                "menu",
                "social",
                "contact",
                "about",
                "home",
                "placeholder",
                "default",
                "blank",
                "spacer",
            ]

            # Skip images that match exclusion patterns
            if any(pattern in url_lower for pattern in exclude_patterns):
                self.logger.debug(f"Filtered out non-dog image: {url[:50]}...")
                continue

            # Size-based filtering (if possible to determine from URL)
            # Very small images are likely icons or decorative elements
            if any(size_indicator in url_lower for size_indicator in ["_16x16", "_32x32", "_64x64", "_thumb"]):
                self.logger.debug(f"Filtered out small/thumbnail image: {url[:50]}...")
                continue

            # This image passed all filters
            filtered_images.append(url)
            self.logger.debug(f"Accepted potential dog image: {url[:50]}...")

        return filtered_images

    def _detect_image_offset(self, filtered_images: List[str], num_dogs: int) -> int:
        """
        Detect if there's a systematic offset in image positioning.

        This addresses the common issue where header/navigation images
        cause a consistent "off by one" association problem.

        Args:
            filtered_images: List of filtered image URLs
            num_dogs: Number of dogs to associate images with

        Returns:
            Offset to apply to image indexing (0 means no offset needed)
        """
        if not filtered_images or num_dogs == 0:
            return 0

        # Pattern 1: If we have exactly one more image than dogs,
        # it's likely there's one header/navigation image at the start
        if len(filtered_images) == num_dogs + 1:
            self.logger.debug("Detected potential header image - applying offset of 1")
            return 1

        # Pattern 2: If we have significantly more images than dogs,
        # there might be multiple header/footer images
        if len(filtered_images) > num_dogs * 1.5:
            # Use heuristic: assume first 1-2 images are likely non-dog
            if len(filtered_images) >= num_dogs + 2:
                self.logger.debug("Detected multiple header/footer images - applying offset of 2")
                return 2
            else:
                self.logger.debug("Detected single header image - applying offset of 1")
                return 1

        # Pattern 3: Perfect match or fewer images than dogs - no offset needed
        self.logger.debug("No systematic offset detected - using direct association")
        return 0

    def extract_dogs_with_images_unified(self, url: str, page_type: str) -> List[Dict[str, Any]]:
        """
        Extract dogs and their images in a single pass using DOM structure.

        This unified approach maintains the spatial relationship between text and images
        by processing each dog container as a complete unit, eliminating the "off by one"
        image association issues.

        Args:
            url: The URL to scrape
            page_type: Type of page (romania/uk_foster)

        Returns:
            List of dog data dictionaries with correctly associated images
        """
        try:
            # Configure Chrome options for headless operation
            chrome_options = Options()
            chrome_options.add_argument("--headless")
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--window-size=1920,1080")
            chrome_options.add_argument("--user-agent=Mozilla/5.0 (compatible; RescueDogAggregator/1.0)")

            self.logger.info(f"Starting unified browser extraction for: {url}")
            driver = webdriver.Chrome(options=chrome_options)

            try:
                # Load the page
                driver.get(url)
                self.logger.info("Page loaded, waiting for JavaScript and lazy loading...")

                # Wait for initial page load and JavaScript execution
                time.sleep(5)

                # Trigger lazy loading by scrolling
                self._trigger_comprehensive_lazy_loading(driver)

                # Wait for images to load after scrolling
                time.sleep(3)

                # Extract dogs using unified DOM approach
                dogs_data = self._extract_dogs_from_dom(driver, page_type)

                self.logger.info(f"Successfully extracted {len(dogs_data)} dogs with unified approach")
                return dogs_data

            finally:
                driver.quit()

        except Exception as e:
            self.logger.error(f"Error during unified browser extraction: {e}")
            # Fallback to legacy method if unified approach fails
            self.logger.info("Falling back to legacy extraction method...")
            return self._extract_dogs_legacy_fallback(url, page_type)

    def _trigger_comprehensive_lazy_loading(self, driver):
        """
        Comprehensively trigger lazy loading for all images on the page.

        Args:
            driver: Selenium WebDriver instance
        """
        try:
            # Get total page height
            total_height = driver.execute_script("return document.body.scrollHeight")

            # Progressive scroll to ensure all images load
            self.logger.debug("Triggering comprehensive lazy loading...")

            # Scroll to bottom first
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)

            # Scroll back to top
            driver.execute_script("window.scrollTo(0, 0);")
            time.sleep(1)

            # Progressive scroll in smaller increments
            current_position = 0
            scroll_increment = 300

            while current_position < total_height:
                driver.execute_script(f"window.scrollTo(0, {current_position});")
                time.sleep(0.5)  # Allow images to load
                current_position += scroll_increment

            # Final scroll to bottom and back to top
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)
            driver.execute_script("window.scrollTo(0, 0);")
            time.sleep(1)

            self.logger.debug("Lazy loading trigger completed")

        except Exception as e:
            self.logger.warning(f"Error during lazy loading trigger: {e}")

    def _extract_dogs_from_dom(self, driver, page_type: str) -> List[Dict[str, Any]]:
        """
        Extract dog data from DOM using unified container approach.

        Args:
            driver: Selenium WebDriver instance
            page_type: Type of page (romania/uk_foster)

        Returns:
            List of dog data dictionaries with images
        """
        dogs_data = []

        try:
            # Find all dog containers using the discovered DOM structure
            dog_containers = self._find_dog_containers(driver)
            self.logger.info(f"Found {len(dog_containers)} dog containers in DOM")

            for i, container in enumerate(dog_containers):
                try:
                    # Extract all data from this single container
                    dog_data = self._extract_single_dog_from_container(container, page_type, i + 1)

                    if dog_data and dog_data.get("name"):
                        dogs_data.append(dog_data)
                        self.logger.debug(f"Successfully extracted dog: {dog_data.get('name')}")
                    else:
                        self.logger.warning(f"Container {i+1} did not yield valid dog data")

                except Exception as e:
                    self.logger.error(f"Error extracting from container {i+1}: {e}")
                    continue

            return dogs_data

        except Exception as e:
            self.logger.error(f"Error during DOM extraction: {e}")
            return []

    def _find_dog_containers(self, driver):
        """
        Find dog containers using robust CSS selectors.

        Args:
            driver: Selenium WebDriver instance

        Returns:
            List of WebDriver elements representing dog containers
        """
        # Try multiple CSS selectors based on DOM investigation
        selectors_to_try = [
            "div.x-el-article",  # Primary selector from investigation
            "div.x.c1-5",  # Alternative selector
            "div[class*='x-el-article']",  # Partial class match
            "div[class*='c1-5']",  # Another partial match
        ]

        for selector in selectors_to_try:
            try:
                containers = driver.find_elements(By.CSS_SELECTOR, selector)
                if containers:
                    self.logger.debug(f"Found {len(containers)} containers with selector: {selector}")
                    # Validate containers have expected dog content
                    valid_containers = self._validate_dog_containers(containers)
                    if valid_containers:
                        self.logger.info(f"Using selector '{selector}' - found {len(valid_containers)} valid dog containers")
                        return valid_containers

            except Exception as e:
                self.logger.debug(f"Selector '{selector}' failed: {e}")
                continue

        # Fallback: try to find containers with h3 headers (dog names)
        self.logger.warning("Primary selectors failed, trying fallback approach...")
        try:
            # Find all h3 elements and get their parent containers
            h3_elements = driver.find_elements(By.TAG_NAME, "h3")
            containers = []
            for h3 in h3_elements:
                # Check if this h3 contains dog-like content
                text = h3.text.strip()
                if any(pattern in text.lower() for pattern in ["months old", "years old"]):
                    # Get the parent container that likely contains the full
                    # dog info
                    parent = h3.find_element(By.XPATH, "./..")
                    containers.append(parent)

            if containers:
                self.logger.info(f"Fallback approach found {len(containers)} potential dog containers")
                return containers

        except Exception as e:
            self.logger.error(f"Fallback container detection failed: {e}")

        return []

    def _validate_dog_containers(self, containers):
        """
        Validate that containers actually contain dog information.

        Args:
            containers: List of WebDriver elements

        Returns:
            List of validated containers
        """
        valid_containers = []

        for container in containers:
            try:
                # Check if container has expected dog content structure
                text_content = container.text.strip()

                # Must contain age information to be a valid dog container
                if any(pattern in text_content.lower() for pattern in ["months old", "years old", "vaccinated", "chipped"]):
                    valid_containers.append(container)

            except Exception as e:
                self.logger.debug(f"Error validating container: {e}")
                continue

        return valid_containers

    def _extract_single_dog_from_container(self, container, page_type: str, container_num: int) -> Dict[str, Any]:
        """
        Extract complete dog data from a single DOM container.

        Args:
            container: WebDriver element representing the dog container
            page_type: Type of page (romania/uk_foster)
            container_num: Container number for logging

        Returns:
            Dictionary with dog data including correctly associated image
        """
        try:
            # Extract text content from container
            full_text = container.text.strip()

            # Extract dog data using existing text processing logic
            dog_data = self.extract_dog_data(full_text, page_type)

            if not dog_data or not dog_data.get("name"):
                self.logger.debug(f"Container {container_num} did not yield valid dog data from text: {full_text[:100]}...")
                return None

            # Extract image from the same container
            image_url = self._extract_image_from_container(container, dog_data.get("name"), container_num)

            # Associate the image with the dog data
            if image_url:
                dog_data["primary_image_url"] = image_url
                self.logger.debug(f"Successfully associated image for {dog_data.get('name')}: {image_url[:50]}...")
            else:
                self.logger.debug(f"No valid image found for {dog_data.get('name')} in container {container_num}")

            return dog_data

        except Exception as e:
            self.logger.error(f"Error extracting dog from container {container_num}: {e}")
            return None

    def _extract_image_from_container(self, container, dog_name: str, container_num: int) -> Optional[str]:
        """
        Extract image URL from a dog container.

        Args:
            container: WebDriver element representing the dog container
            dog_name: Name of the dog for logging
            container_num: Container number for logging

        Returns:
            Image URL if found and valid, None otherwise
        """
        try:
            # Find image element within this container
            img_elements = container.find_elements(By.TAG_NAME, "img")

            for img in img_elements:
                # Get image source - try multiple attributes for dynamic
                # loading
                img_src = img.get_attribute("src")
                data_src = img.get_attribute("data-src")

                # Prefer data-src for lazy loading, fallback to src
                actual_src = data_src if data_src else img_src

                if actual_src and self._is_valid_rean_image(actual_src):
                    # Clean the URL for Cloudinary compatibility
                    cleaned_url = self._clean_wsimg_url(actual_src)
                    self.logger.debug(f"Found valid image for {dog_name}: {cleaned_url[:50]}...")
                    return cleaned_url
                else:
                    self.logger.debug(f"Skipping invalid image for {dog_name}: {actual_src[:50] if actual_src else 'No src'}...")

            self.logger.debug(f"No valid images found in container {container_num} for {dog_name}")
            return None

        except Exception as e:
            self.logger.error(f"Error extracting image from container {container_num}: {e}")
            return None

    def _extract_dogs_legacy_fallback(self, url: str, page_type: str) -> List[Dict[str, Any]]:
        """
        Fallback to legacy extraction method if unified approach fails.

        Args:
            url: The URL to scrape
            page_type: Type of page (romania/uk_foster)

        Returns:
            List of dog data using legacy approach
        """
        try:
            self.logger.info("Executing legacy fallback extraction...")

            # Use the original approach as fallback
            html_content = self.scrape_page(url)
            if not html_content:
                return []

            dog_blocks = self.extract_dog_content_from_html(html_content)
            available_images = self.extract_images_with_browser(url)

            dog_data_list = []
            for entry in dog_blocks:
                dog_data = self.extract_dog_data(entry, page_type)
                if dog_data and dog_data.get("name"):
                    dog_data_list.append(dog_data)

            # Use the improved association logic
            enriched_dog_data_list = self.associate_images_with_dogs(dog_data_list, available_images)

            self.logger.info(f"Legacy fallback extracted {len(enriched_dog_data_list)} dogs")
            return enriched_dog_data_list

        except Exception as e:
            self.logger.error(f"Legacy fallback also failed: {e}")
            return []

    def scrape_animals(self) -> List[Dict[str, Any]]:
        """
        Main scraping method that processes both Romania and UK pages.

        Returns:
            List of standardized animal data dictionaries
        """
        all_animals = []

        try:
            for page_type, page_path in self.pages.items():
                self.logger.info(f"Scraping {page_type} page: {page_path}")

                # Use unified extraction to get dogs with correctly associated
                # images
                page_url = f"{self.base_url}{page_path}"
                enriched_dog_data_list = self.extract_dogs_with_images_unified(page_url, page_type)
                self.logger.info(f"Found {len(enriched_dog_data_list)} dogs with unified extraction on {page_type} page")

                # Convert to standardized format and add to results
                for dog_data in enriched_dog_data_list:
                    try:
                        standardized_data = self.standardize_animal_data(dog_data, page_type)
                        all_animals.append(standardized_data)
                    except Exception as e:
                        self.logger.error(f"Error processing dog entry: {e}")
                        continue

                # Rate limiting between pages
                # Not the last page
                if page_type != list(self.pages.keys())[-1]:
                    time.sleep(self.rate_limit_delay)

            self.logger.info(f"Successfully scraped {len(all_animals)} dogs total")
            return all_animals

        except Exception as e:
            self.logger.error(f"Critical error during scraping: {e}")
            self.handle_scraper_failure(str(e))
            return []
        finally:
            self.update_stale_data_detection()

    def scrape_page(self, url: str) -> Optional[str]:
        """
        Scrape a single page with error handling and retries.

        Args:
            url: The URL to scrape

        Returns:
            Page content as string or None if failed
        """
        for attempt in range(self.max_retries + 1):
            try:
                self.logger.info(f"Attempting to scrape {url} (attempt {attempt + 1})")

                response = requests.get(
                    url,
                    timeout=self.timeout,
                    headers={"User-Agent": "Mozilla/5.0 (compatible; RescueDogAggregator/1.0)"},
                )
                response.raise_for_status()

                return response.text

            except Exception as e:
                self.logger.warning(f"Attempt {attempt + 1} failed for {url}: {e}")
                if attempt < self.max_retries:
                    time.sleep(2**attempt)  # Exponential backoff
                else:
                    self.logger.error(f"All attempts failed for {url}")

        return None

    def split_dog_entries(self, page_text: str, page_type: str) -> List[str]:
        """
        Split page text into individual dog entries using update timestamps.

        Args:
            page_text: Raw page content
            page_type: Type of page (romania/uk_foster)

        Returns:
            List of individual dog entry texts
        """
        if not page_text or not page_text.strip():
            return []

        # Split by update timestamps but preserve them in the preceding entry
        # Use a capturing group to keep the timestamps
        timestamp_pattern = r"(\(Updated \d{1,2}/\d{1,2}/\d{2,4}\))"
        parts = re.split(timestamp_pattern, page_text)

        # Reconstruct entries with their timestamps
        entries_with_timestamps = []
        for i in range(0, len(parts) - 1, 2):
            entry = parts[i]
            if i + 1 < len(parts) and parts[i + 1].startswith("(Updated"):
                # Append the timestamp to this entry
                entry = entry + " " + parts[i + 1]
            entries_with_timestamps.append(entry)

        # If there's a final part without timestamp, add it
        if len(parts) % 2 == 1 and parts[-1].strip():
            entries_with_timestamps.append(parts[-1])

        parts = entries_with_timestamps

        # Clean and filter entries
        cleaned_entries = []
        for part in parts:
            part = part.strip()
            # Only keep substantial entries that likely contain dog information
            # Look for key indicators like age mentions or vaccination status
            if part and len(part) > 50 and any(word in part.lower() for word in ["months", "years", "old", "vaccinated", "chipped"]):
                cleaned_entries.append(part)

        # If no timestamp-based splitting worked, try alternative approaches
        if not cleaned_entries and page_text.strip():
            # Fallback: split by paragraph breaks and filter
            paragraphs = page_text.split("\n\n")
            for paragraph in paragraphs:
                paragraph = paragraph.strip()
                if len(paragraph) > 50 and any(word in paragraph.lower() for word in ["months", "years", "old", "vaccinated"]):
                    cleaned_entries.append(paragraph)

        return cleaned_entries

    def extract_name(self, text: str) -> Optional[str]:
        """
        Extract dog name from text entry.

        Args:
            text: Dog entry text

        Returns:
            Extracted name or None
        """
        if not text:
            return None

        # Pattern 1: "Our Name is..." or "Name is X years/months old"
        name_pattern = r"^(?:Our\s+)?([A-Za-z]+(?:\s+[A-Za-z]+)*?)\s+is\s+(?:looking|around\s+)?\d"
        match = re.search(name_pattern, text.strip())
        if match:
            name = match.group(1).strip()
            # Filter out descriptive words to get the actual name
            descriptive_words = ["little", "friendly", "sweet", "puppy", "big", "soft"]
            name_words = name.split()
            actual_name = []
            for word in name_words:
                if word.lower() not in descriptive_words:
                    actual_name.append(word)
            if actual_name:
                # Take the last non-descriptive word as the name
                final_name = actual_name[-1]
                # Filter out organization name
                if final_name.lower() == "rean":
                    return None
                return final_name

        # Pattern 2: "Our Name is looking for..."
        our_pattern = r"^Our\s+([A-Za-z]+)\s+is\s+looking"
        match = re.search(our_pattern, text.strip())
        if match:
            name = match.group(1).strip()
            if name.lower() == "rean":
                return None
            return name

        # Pattern 3: Handle location prefixes in name extraction
        # "- Location Name is..." or "- in Location Name is..."
        location_pattern = r"^-\s*(?:in\s+)?[A-Za-z]+\s+([A-Za-z]+)\s+(?:-\s+\d+\s+(?:months?|years?)\s+old\s+)?(?:is|was)"
        match = re.search(location_pattern, text.strip())
        if match:
            name = match.group(1).strip()
            if name.lower() == "rean":
                return None
            return name

        # Pattern 4: Look for capitalized words at the beginning, excluding locations
        words = text.strip().split()[:7]  # Check first 7 words for more context
        skip_words = [
            "little",
            "sweet",
            "puppy",
            "this",
            "the",
            "our",
            "in",
            "wrexham",
            "romania",
            "manchester",
            "london",
            "birmingham",
        ]
        found_dash = False

        for i, word in enumerate(words):
            # Skip the dash and location words that come after it
            if word == "-":
                found_dash = True
                continue
            # Skip first few words after dash (likely location)
            if found_dash and i < 3:
                continue
            if word[0].isupper() and word.isalpha() and len(word) > 2:
                if word.lower() not in skip_words:
                    # Filter out organization name
                    if word.lower() == "rean":
                        continue
                    return word

        return None

    def extract_age(self, text: str) -> Optional[str]:
        """
        Extract age information from text.

        Args:
            text: Dog entry text

        Returns:
            Age string (e.g., "5 months", "1.5 years")
        """
        if not text:
            return None

        # Pattern: "around X months/years old" or "X months/years old"
        age_patterns = [
            r"(?:around\s+)?(\d+(?:\.\d+)?)\s+(months?)\s+old",
            r"(?:around\s+)?(\d+(?:\.\d+)?)\s+(years?)\s+old",
        ]

        for pattern in age_patterns:
            match = re.search(pattern, text.lower())
            if match:
                number = match.group(1)
                unit = match.group(2)
                return f"{number} {unit}"

        return None

    def determine_location(self, text: str, page_type: str) -> str:
        """
        Determine current location of the dog.

        Args:
            text: Dog entry text
            page_type: Type of page (romania/uk_foster)

        Returns:
            Location string
        """
        if page_type == "romania":
            return "Romania"

        # For UK foster dogs, extract specific location
        uk_locations = [
            "Norfolk",
            "Lincolnshire",
            "Derby",
            "London",
            "Manchester",
            "Birmingham",
        ]
        text_lower = text.lower()

        for location in uk_locations:
            if location.lower() in text_lower:
                return location

        # Default for UK if no specific location found
        return "UK"

    def extract_medical_status(self, text: str) -> Optional[str]:
        """
        Extract medical/vaccination status.

        Args:
            text: Dog entry text

        Returns:
            Medical status string
        """
        if not text:
            return None

        text_lower = text.lower()

        # Common patterns
        medical_patterns = [
            r"(spayed,?\s+vaccinated\s+and\s+chipped)",
            r"(neutered,?\s+vaccinated\s+and\s+chipped)",
            r"(vaccinated\s+and\s+chipped)",
        ]

        for pattern in medical_patterns:
            match = re.search(pattern, text_lower)
            if match:
                return match.group(1)

        return None

    def assess_urgency(self, text: str) -> str:
        """
        Assess urgency level based on text content.

        Args:
            text: Dog entry text

        Returns:
            Urgency level: "urgent" or "standard"
        """
        if not text:
            return "standard"

        text_lower = text.lower()
        urgent_keywords = [
            "desperately",
            "urgent",
            "emergency",
            "stuck",
            "dire",
            "ready to travel",
            "needs urgent",
            "critical",
        ]

        for keyword in urgent_keywords:
            if keyword in text_lower:
                return "urgent"

        return "standard"

    def extract_weight(self, text: str) -> Optional[float]:
        """
        Extract weight in kg from text.

        Args:
            text: Dog entry text

        Returns:
            Weight in kg or None
        """
        if not text:
            return None

        # Pattern: "X kg" or "Xkg"
        weight_pattern = r"(\d+(?:\.\d+)?)\s*kg"
        match = re.search(weight_pattern, text.lower())

        if match:
            try:
                return float(match.group(1))
            except ValueError:
                return None

        return None

    def predict_size_from_weight(self, weight_kg: float) -> str:
        """
        Predict size category from weight.

        Args:
            weight_kg: Weight in kilograms

        Returns:
            Size category
        """
        if weight_kg < 15:
            return "Small"
        elif weight_kg < 30:
            return "Medium"
        else:
            return "Large"

    def predict_size_from_description(self, text: str) -> Optional[str]:
        """
        Predict size from descriptive text.

        Args:
            text: Dog entry text

        Returns:
            Size category or None
        """
        if not text:
            return None

        text_lower = text.lower()

        if any(word in text_lower for word in ["little", "small", "tiny"]):
            return "Small"
        elif any(word in text_lower for word in ["medium", "mid-size"]):
            return "Medium"
        elif any(word in text_lower for word in ["big", "large", "huge"]):
            return "Large"

        return None

    def extract_rescue_context(self, text: str) -> str:
        """
        Extract rescue story/context from text.

        Args:
            text: Dog entry text

        Returns:
            Rescue context summary
        """
        if not text:
            return ""

        text_lower = text.lower()
        contexts = []

        # Common rescue contexts
        if "kill shelter" in text_lower:
            contexts.append("rescued from kill shelter")
        elif "shelter" in text_lower:
            contexts.append("rescued from shelter")

        if "streets" in text_lower or "street" in text_lower:
            contexts.append("found on streets")

        if "terrible conditions" in text_lower:
            contexts.append("rescued from terrible conditions")

        if "foster" in text_lower:
            contexts.append("in foster care")

        if contexts:
            return ", ".join(contexts)

        # Extract first sentence as context if no specific patterns found
        sentences = text.split(".")
        if sentences and len(sentences[0]) > 10:
            return sentences[0].strip()

        return "rescue story available"

    def extract_description_for_about_section(self, text: str) -> str:
        """
        Extract a clean description suitable for the About section.

        This processes the raw text to create a user-friendly description
        that will be displayed in the frontend's About section.

        Args:
            text: Dog entry text

        Returns:
            Clean description for About section
        """
        if not text:
            return ""

        # Clean up the text
        text = text.strip()

        # First, extract only content up to and including the update timestamp
        # This removes contact info, URLs, and application instructions that come after
        update_pattern = r"(\(Updated \d{1,2}/\d{1,2}/\d{2,4}\))"
        update_match = re.search(update_pattern, text)
        if update_match:
            # Keep everything up to and including the timestamp
            end_pos = update_match.end()
            text = text[:end_pos].strip()

        # Clean up whitespace
        text = re.sub(r"\s+", " ", text).strip()

        # Remove redundant name/age prefix patterns FIRST
        # Pattern 1: "Name - X months/years old" at the start
        text = re.sub(
            r"^[A-Za-z]+\s*-\s*\d+(?:\.\d+)?\s*(?:months?|years?)\s+old\s*",
            "",
            text,
            flags=re.IGNORECASE,
        )

        # Now remove location prefixes like "- Wrexham" or "- in Romania" at the start
        # This handles cases like "- Wrexham Nala is..." or "- in Romania Tiny is..."
        # First handle "- in Location" pattern (more permissive)
        text = re.sub(r"^-\s*in\s+[A-Za-z]+\s+", "", text).strip()
        # Then handle "- Location" pattern (more permissive - matches any word
        # after dash)
        text = re.sub(r"^-\s*[A-Za-z]+\s+", "", text).strip()

        # Pattern 2: Remove the first sentence if it's just basic info we already show
        # Look for patterns like "Lucky is 7 months old." or "Our Lucky is 7
        # months old."
        first_sentence_pattern = r"^(?:Our\s+)?[A-Za-z]+\s+is\s+(?:around\s+)?\d+(?:\.\d+)?\s*(?:months?|years?)\s+old\.?\s*"
        if re.match(first_sentence_pattern, text):
            # Remove this redundant first sentence
            text = re.sub(first_sentence_pattern, "", text).strip()

        # Split into sentences for processing
        sentences = text.split(".")

        # Collect meaningful sentences
        story_sentences = []
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue

            # Skip very short fragments
            if len(sentence) < 10:
                continue

            # Skip sentences that are contact instructions
            # Check if sentence contains contact/application keywords
            contact_keywords = [
                "please message us",
                "e-mail",
                "facebook",
                "apply to adopt",
                "following information",
                "current pets",
                "ages of children",
                "garden fencing",
                "working hours",
                "experience with dogs",
            ]

            # Count how many contact keywords are in this sentence
            contact_count = sum(1 for keyword in contact_keywords if keyword in sentence.lower())

            # If sentence has 2+ contact keywords, it's likely just instructions
            if contact_count >= 2:
                continue

            # Or if it starts with "Please message" or similar
            if sentence.lower().startswith(("please message", "please contact", "email", "e-mail")):
                continue

            story_sentences.append(sentence)

        if story_sentences:
            # Join sentences
            description = ". ".join(story_sentences)

            # Ensure proper ending
            if not description.endswith("."):
                description += "."

            # Add back the update timestamp if it was present and not already included
            if update_match and "(Updated" not in description:
                description = description.rstrip(".") + " " + update_match.group(1)

            # Only limit length if description is excessively long (over 2000 chars)
            if len(description) > 2000:
                # Find a good breaking point near 1800 chars
                break_point = description.rfind(". ", 0, 1800)
                if break_point > 1000:  # Ensure we don't break too early
                    description = description[: break_point + 1]
                else:
                    description = description[:1797] + "..."

            return description

        # Fallback: if no good sentences found, return cleaned original text
        return text

    def extract_dog_data(self, entry_text: str, page_type: str) -> Optional[Dict[str, Any]]:
        """
        Extract structured data from a dog entry.

        Args:
            entry_text: Raw text for one dog
            page_type: Type of page (romania/uk_foster)

        Returns:
            Dictionary with extracted dog data
        """
        if not entry_text or len(entry_text.strip()) < 20:
            return None

        try:
            name = self.extract_name(entry_text)
            if not name:
                return None

            age_text = self.extract_age(entry_text)
            weight_kg = self.extract_weight(entry_text)

            # Determine size
            size_prediction = None
            if weight_kg:
                size_prediction = self.predict_size_from_weight(weight_kg)
            else:
                size_prediction = self.predict_size_from_description(entry_text)

            # Extract description for About section
            about_description = self.extract_description_for_about_section(entry_text)

            # Create properties dictionary first
            properties = {
                "source_page": page_type,
                "current_location": self.determine_location(entry_text, page_type),
                "transport_required": page_type == "romania",
                "medical_status": self.extract_medical_status(entry_text),
                "rescue_context": self.extract_rescue_context(entry_text),
                "urgency_level": self.assess_urgency(entry_text),
                "origin_country": "Romania",
                # Store sample for debugging
                "raw_text": entry_text.strip()[:500],
                "description": about_description,  # Add description for About section
            }

            # Add weight and size if available
            if weight_kg:
                properties["weight_kg"] = weight_kg
            if size_prediction:
                properties["size_prediction"] = size_prediction

            dog_data = {
                "name": name,
                "age_text": age_text,
                "properties": properties,
            }

            # Validate that we have the essential fields
            validation_errors = self._validate_dog_data(dog_data, entry_text)
            if validation_errors:
                self.logger.warning(f"Validation issues for dog '{name}': {', '.join(validation_errors)}")
                # Log the raw text for debugging
                self.logger.debug(f"Raw text for validation issues: {entry_text[:200]}...")

            return dog_data

        except Exception as e:
            self.logger.error(f"Error extracting dog data from entry: {e}")
            return None

    def _validate_dog_data(self, dog_data: Dict[str, Any], entry_text: str) -> List[str]:
        """
        Validate that extracted dog data contains expected fields.

        Args:
            dog_data: Extracted dog data
            entry_text: Original entry text for reference

        Returns:
            List of validation error messages (empty if all good)
        """
        errors = []

        # Check essential fields
        if not dog_data.get("name"):
            errors.append("missing name")

        if not dog_data.get("age_text"):
            errors.append("missing age information")

        properties = dog_data.get("properties", {})
        description = properties.get("description", "")

        if not description or len(description.strip()) < 20:
            errors.append("missing or very short description")

        # Check if description seems complete (should include more than just basic info)
        if description and not any(
            word in description.lower()
            for word in [
                "friendly",
                "loving",
                "sweet",
                "playful",
                "gentle",
                "looking",
                "home",
                "foster",
                "rescue",
                "transport",
                "adopt",
                "family",
            ]
        ):
            errors.append("description may be incomplete - lacks personality/story content")

        # Check if update timestamp is preserved
        if "updated" in entry_text.lower() and "updated" not in description.lower():
            errors.append("update timestamp not preserved in description")

        return errors

    def standardize_animal_data(self, dog_data: Dict[str, Any], page_type: str) -> Dict[str, Any]:
        """
        Convert extracted data to standardized format for database.

        Args:
            dog_data: Raw extracted dog data
            page_type: Type of page (romania/uk_foster)

        Returns:
            Standardized animal data dictionary
        """
        name = dog_data.get("name", "Unknown")

        # Handle None name gracefully
        if name is None:
            name = "Unknown"

        # Create more stable external ID using name + breed + age + page type for
        # uniqueness
        import hashlib

        name_slug = name.lower().replace(" ", "-")
        breed = dog_data.get("breed", "unknown")
        age = dog_data.get("age_text", "unknown")
        sex = dog_data.get("sex", "unknown")

        # Create a hash of combined data for uniqueness
        combined_data = f"{name}-{breed}-{age}-{sex}-{page_type}"
        hash_suffix = hashlib.md5(combined_data.encode()).hexdigest()[:6]

        external_id = f"rean-{page_type}-{name_slug}-{hash_suffix}"

        # Build adoption URL (link to organization contact)
        if self.org_config:
            adoption_url = self.org_config.metadata.website_url
        else:
            # Fallback for legacy mode
            adoption_url = "https://rean.org.uk"

        # Handle properties safely - ensure it's a dictionary
        properties = dog_data.get("properties", {})
        if not isinstance(properties, dict):
            properties = {}

        standardized_data = {
            "external_id": external_id,
            "name": name,
            "organization_id": self.organization_id,  # Add organization_id
            "adoption_url": adoption_url,
            "animal_type": "dog",
            "age_text": dog_data.get("age_text"),
            "language": "en",
            "properties": properties,
        }

        # Add image URL if available
        if dog_data.get("primary_image_url"):
            standardized_data["primary_image_url"] = dog_data["primary_image_url"]
            # Set original_image_url to the same value for proper comparison in base_scraper
            # This prevents unnecessary re-uploads to Cloudinary when images haven't
            # changed
            standardized_data["original_image_url"] = dog_data["primary_image_url"]

        # Standardize age if available
        if dog_data.get("age_text"):
            try:
                age_months = self.standardize_age_to_months(dog_data["age_text"])
                if age_months:
                    standardized_data["age_min_months"] = age_months
                    standardized_data["age_max_months"] = age_months
            except Exception as e:
                self.logger.warning(f"Could not standardize age '{dog_data['age_text']}': {e}")

        # Set size if predicted - use safe properties access
        size_prediction = properties.get("size_prediction")
        if size_prediction:
            standardized_data["size"] = size_prediction
            standardized_data["standardized_size"] = size_prediction

        return standardized_data

    def standardize_age_to_months(self, age_text: str) -> Optional[int]:
        """
        Convert age text to months.

        Args:
            age_text: Age string like "5 months" or "1.5 years"

        Returns:
            Age in months or None
        """
        if not age_text:
            return None

        try:
            # Extract number and unit
            match = re.search(r"(\d+(?:\.\d+)?)\s+(months?|years?)", age_text.lower())
            if not match:
                return None

            number = float(match.group(1))
            unit = match.group(2)

            if "month" in unit:
                return int(number)
            elif "year" in unit:
                return int(number * 12)

        except (ValueError, AttributeError):
            pass

        return None

    def collect_data(self) -> List[Dict[str, Any]]:
        """
        Collect animal data from REAN website.

        This is the abstract method required by BaseScraper.

        Returns:
            List of dictionaries, each containing data for one animal
        """
        return self.scrape_animals()
