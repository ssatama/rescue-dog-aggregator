import hashlib
import re
import time
from datetime import datetime
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin, urlparse

from selenium import webdriver
from selenium.common.exceptions import NoSuchElementException, TimeoutException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from webdriver_manager.chrome import ChromeDriverManager

from scrapers.base_scraper import BaseScraper

from .dog_detail_scraper import DaisyFamilyRescueDogDetailScraper
from .translations import normalize_name, translate_dog_data


class DaisyFamilyRescueScraper(BaseScraper):
    """Daisy Family Rescue e.V. scraper for German and North Macedonian rescue dogs.

    Integrates listing scraper, detail scraper, and translation services
    following the production-ready patterns from BaseScraper.
    """

    def __init__(self, config_id="daisyfamilyrescue", organization_id=None):
        """Initialize Daisy Family Rescue scraper with configuration."""
        if organization_id is not None:
            # Legacy mode - use organization_id
            super().__init__(organization_id=organization_id)
        else:
            # New mode - use config_id
            super().__init__(config_id=config_id)

        self.base_url: str = "https://daisyfamilyrescue.de"
        self.listing_url: str = "https://daisyfamilyrescue.de/unsere-hunde/"

        # Target sections based on inspection findings
        self.target_sections = [
            "Bei einer Pflegestelle in Deutschland",
            "Hündinnen in Nordmazedonien",
            "Rüden in Nordmazedonien",
        ]

        # Sections to skip
        self.skip_sections = ["In medizinischer Behandlung", "Wir sind bereits reserviert"]

        # Initialize detail scraper for enhanced data extraction
        self.detail_scraper = None

    def collect_data(self) -> List[Dict[str, Any]]:
        """Main entry point - implements abstract method from BaseScraper.

        Orchestrates the complete scraping flow:
        1. Extract basic dog listings from main page
        2. Enhance each dog with detailed information
        3. Apply German-to-English translation
        4. Return standardized data for BaseScraper processing
        """
        all_dogs = []

        try:
            self.logger.info(f"Starting Daisy Family Rescue scrape from {self.listing_url}")

            # Step 1: Extract dogs using Selenium with section filtering
            all_dogs = self._extract_with_selenium()

            if len(all_dogs) == 0:
                self.logger.warning("No dogs extracted from main listing")
                return []

            self.logger.info(f"Extracted {len(all_dogs)} dogs from main listing")

            # Step 2: Apply translation before returning to BaseScraper
            # This ensures all German text is translated to English for standardization
            all_dogs = self._translate_and_normalize_dogs(all_dogs)

            self.logger.info(f"Translation completed for {len(all_dogs)} dogs")
            return all_dogs

        except Exception as e:
            self.logger.error(f"Error in collect_data: {e}")
            # Return empty list to trigger partial failure detection in BaseScraper
            return []

    def _translate_and_normalize_dogs(self, dogs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Translate German data to English using comprehensive translation service.

        This is the critical integration point where raw German data is translated
        to English before being passed to BaseScraper's standardization methods.
        Follows the same pattern as tierschutzverein_europa scraper.
        """
        translated_dogs = []
        translation_errors = 0

        for dog in dogs:
            try:
                # Create copy to avoid modifying original
                translated_dog = dog.copy()

                # Normalize name using our translation service
                if translated_dog.get("name"):
                    normalized_name = normalize_name(translated_dog["name"])
                    if normalized_name:
                        translated_dog["name"] = normalized_name

                # Apply comprehensive translation using our translation service
                translated_dog = translate_dog_data(translated_dog)

                # Ensure language properties are set for BaseScraper
                if "properties" not in translated_dog:
                    translated_dog["properties"] = {}
                translated_dog["properties"]["language"] = "en"
                translated_dog["properties"]["original_language"] = "de"
                translated_dog["properties"]["translation_service"] = "daisy_family_rescue"

                translated_dogs.append(translated_dog)

            except Exception as e:
                self.logger.error(f"Translation failed for {dog.get('name', 'unknown')}: {e}")
                translation_errors += 1

                # Return original with error flag rather than lose the dog
                dog_with_error = dog.copy()
                if "properties" not in dog_with_error:
                    dog_with_error["properties"] = {}
                dog_with_error["properties"]["translation_error"] = str(e)
                dog_with_error["properties"]["language"] = "de"  # Keep original language
                translated_dogs.append(dog_with_error)

        if translation_errors > 0:
            self.logger.warning(f"Translation errors occurred for {translation_errors} dogs")

        self.logger.info(f"Translated {len(translated_dogs) - translation_errors}/{len(translated_dogs)} dogs from German to English")
        return translated_dogs

    def _extract_with_selenium(self) -> List[Dict[str, Any]]:
        """Extract dogs using Selenium with section filtering."""
        all_dogs = []
        driver = None

        try:
            # Setup Chrome options with config-driven settings
            chrome_options = Options()

            # Check for headless setting from config (default: True for production)
            headless = True
            if hasattr(self, "org_config") and self.org_config:
                scraper_config = self.org_config.get_scraper_config_dict()
                headless = scraper_config.get("headless", True)

            if headless:
                chrome_options.add_argument("--headless")

            # Production-ready Chrome options
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--window-size=1920,1080")
            chrome_options.add_argument("--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
            chrome_options.add_argument("--disable-blink-features=AutomationControlled")
            chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
            chrome_options.add_experimental_option("useAutomationExtension", False)

            driver = webdriver.Chrome(options=chrome_options)

            self.logger.info(f"Loading main page: {self.listing_url}")
            driver.get(self.listing_url)

            # Wait for page to load
            WebDriverWait(driver, 30).until(EC.presence_of_element_located((By.TAG_NAME, "body")))

            # Handle lazy loading if needed
            self._handle_lazy_loading(driver)

            # Find and filter sections
            valid_dog_containers = self._filter_dogs_by_section(driver)

            # First pass: Extract basic dog data and URLs from all containers
            basic_dogs_data = []
            total_containers = len(valid_dog_containers)

            for i, container in enumerate(valid_dog_containers):
                try:
                    dog_data = self._extract_dog_from_container(container, i + 1)
                    if dog_data:
                        basic_dogs_data.append(dog_data)
                    else:
                        self.logger.warning(f"Failed to extract data from container {i+1}")
                except Exception as e:
                    self.logger.warning(f"Error processing dog container {i+1}: {e}")
                    continue

            # Apply skip_existing_animals filtering
            self.logger.info(f"🔍 skip_existing_animals: {self.skip_existing_animals}")
            if self.skip_existing_animals and basic_dogs_data:
                all_urls = [dog.get("adoption_url") for dog in basic_dogs_data if dog.get("adoption_url")]
                self.logger.info(f"📋 Filtering {len(all_urls)} URLs to skip existing animals...")
                filtered_urls = self._filter_existing_urls(all_urls)
                filtered_urls_set = set(filtered_urls)

                # Filter dogs to only those with URLs we should process
                original_count = len(basic_dogs_data)
                basic_dogs_data = [dog for dog in basic_dogs_data if dog.get("adoption_url") in filtered_urls_set]
                skipped_count = original_count - len(basic_dogs_data)

                # Track filtering stats for failure detection
                self.set_filtering_stats(original_count, skipped_count)

                self.logger.info(f"✅ SKIP EXISTING ANIMALS: Processing {len(basic_dogs_data)} new dogs (skipped {skipped_count} existing)")
            else:
                # No filtering applied
                self.set_filtering_stats(len(basic_dogs_data), 0)
                self.logger.info(f"📊 Processing all {len(basic_dogs_data)} dogs (skip_existing_animals: {self.skip_existing_animals})")

            # Second pass: Process the filtered dogs with detail page enhancement
            processed_count = 0
            for dog_data in basic_dogs_data:
                try:
                    # Enhance with detailed information from dog's detail page
                    enhanced_data = self._enhance_with_detail_page(dog_data)
                    if enhanced_data:
                        all_dogs.append(enhanced_data)
                        processed_count += 1
                        self.logger.debug(f"Processed {processed_count}/{len(basic_dogs_data)}: {enhanced_data.get('name')}")
                    else:
                        # Fallback to basic data if detail extraction fails
                        all_dogs.append(dog_data)
                        processed_count += 1
                        self.logger.warning(f"Used basic data for {dog_data.get('name')} (detail extraction failed)")

                except Exception as e:
                    self.logger.warning(f"Error processing dog {dog_data.get('name', 'unknown')}: {e}")
                    continue

            self.logger.info(f"Successfully processed {processed_count} out of {total_containers} containers")

            # Apply rate limiting using BaseScraper method
            self.respect_rate_limit()

        except Exception as e:
            self.logger.error(f"Failed to extract dogs with Selenium: {e}")
            raise

        finally:
            if driver:
                driver.quit()

        return all_dogs

    def _enhance_with_detail_page(self, basic_dog_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Enhance basic dog data with detailed information from the dog's detail page.

        Uses DaisyFamilyRescueDogDetailScraper to extract comprehensive information
        from individual dog profile pages, including Steckbrief data.
        """
        adoption_url = basic_dog_data.get("adoption_url")
        if not adoption_url:
            self.logger.warning(f"No adoption URL for dog {basic_dog_data.get('name')}")
            return basic_dog_data

        try:
            # Lazy initialize detail scraper to avoid circular imports
            if self.detail_scraper is None:
                self.detail_scraper = DaisyFamilyRescueDogDetailScraper()

            # Extract detailed information with rate limiting
            detailed_data = self.detail_scraper.extract_dog_details(adoption_url, self.logger)

            # Apply rate limiting between detail page requests
            self.respect_rate_limit()

            if detailed_data:
                # Merge basic data with detailed data
                # Detailed data takes precedence for overlapping fields
                merged_data = basic_dog_data.copy()

                # Update with detailed information
                for key, value in detailed_data.items():
                    if key == "properties":
                        # Merge properties dictionaries
                        merged_properties = merged_data.get("properties", {})
                        merged_properties.update(value)
                        merged_data["properties"] = merged_properties
                    else:
                        # Direct override for other fields
                        merged_data[key] = value

                # Ensure we have the basic fields from listing page
                if not merged_data.get("name") and basic_dog_data.get("name"):
                    merged_data["name"] = basic_dog_data["name"]

                self.logger.debug(f"Successfully enhanced data for {merged_data.get('name')}")
                return merged_data
            else:
                self.logger.warning(f"No detailed data extracted for {basic_dog_data.get('name')}, using basic data")
                return basic_dog_data

        except Exception as e:
            self.logger.error(f"Error enhancing dog data for {basic_dog_data.get('name')}: {e}")
            # Return basic data on error rather than losing the dog entirely
            return basic_dog_data

    def _handle_lazy_loading(self, driver: webdriver.Chrome):
        """Handle lazy loading based on inspection findings."""
        self.logger.info("Handling potential lazy loading...")

        # Based on inspection, WordPress uses native lazy loading, not JavaScript
        # Scroll to trigger any lazy-loaded content
        last_height = driver.execute_script("return document.body.scrollHeight")

        # Scroll down progressively
        for i in range(3):  # 3 scroll steps should be sufficient
            driver.execute_script(f"window.scrollTo(0, {(i+1) * last_height // 3});")
            time.sleep(2)  # Wait for content to load

        # Scroll to bottom
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)

        # Scroll back to top for processing
        driver.execute_script("window.scrollTo(0, 0);")
        time.sleep(1)

    def _filter_dogs_by_section(self, driver: webdriver.Chrome) -> List:
        """Filter dog containers to only include those from target sections."""
        valid_containers = []

        try:
            # Find all section headers
            section_headers = driver.find_elements(By.CSS_SELECTOR, "h2.elementor-heading-title.elementor-size-default")

            self.logger.info(f"Found {len(section_headers)} section headers")

            # Find all dog containers
            all_dog_containers = driver.find_elements(By.CSS_SELECTOR, "article.elementor-post.elementor-grid-item.ecs-post-loop")

            self.logger.info(f"Found {len(all_dog_containers)} total dog containers")

            # Map sections to their positions in DOM
            section_positions = {}
            for header in section_headers:
                section_text = header.text.strip()
                if section_text in self.target_sections or section_text in self.skip_sections:
                    # Get the DOM position of this header
                    header_position = driver.execute_script(
                        """
                        var elements = Array.from(document.querySelectorAll('*'));
                        return elements.indexOf(arguments[0]);
                    """,
                        header,
                    )
                    section_positions[section_text] = header_position
                    self.logger.info(f"Found section '{section_text}' at DOM position {header_position}")

            # Filter containers by section
            for container in all_dog_containers:
                container_position = driver.execute_script(
                    """
                    var elements = Array.from(document.querySelectorAll('*'));
                    return elements.indexOf(arguments[0]);
                """,
                    container,
                )

                # Find which section this container belongs to
                container_section = self._find_container_section(container_position, section_positions)

                if container_section in self.target_sections:
                    valid_containers.append(container)
                    self.logger.debug(f"Container at position {container_position} belongs to target section: {container_section}")
                elif container_section in self.skip_sections:
                    self.logger.debug(f"Skipping container at position {container_position} in section: {container_section}")
                else:
                    # If we can't determine section, include it to be safe
                    valid_containers.append(container)
                    self.logger.debug(f"Container at position {container_position} in unknown section, including")

        except Exception as e:
            self.logger.warning(f"Section filtering failed, using all containers: {e}")
            # Fallback: use all dog containers
            valid_containers = driver.find_elements(By.CSS_SELECTOR, "article.elementor-post.elementor-grid-item.ecs-post-loop")

        self.logger.info(f"Filtered to {len(valid_containers)} valid dog containers")
        return valid_containers

    def _find_container_section(self, container_position: int, section_positions: Dict[str, int]) -> Optional[str]:
        """Find which section a container belongs to based on DOM positions."""
        # Find the section header that comes before this container
        closest_section = None
        closest_distance = float("inf")

        for section_name, section_position in section_positions.items():
            if section_position < container_position:
                distance = container_position - section_position
                if distance < closest_distance:
                    closest_distance = distance
                    closest_section = section_name

        return closest_section

    def _extract_dog_from_container(self, container, container_num: int) -> Optional[Dict[str, Any]]:
        """Extract dog data from a single container element."""
        try:
            # Extract dog name and location from link text - try multiple selectors
            dog_link = None
            dog_url = None
            link_text = ""

            # Try different link selectors
            link_selectors = [
                "a[href*='/hund-']",
                "a[href*='/dog']",
                "a",  # Fallback to any link
            ]

            for selector in link_selectors:
                try:
                    links = container.find_elements(By.CSS_SELECTOR, selector)
                    for link in links:
                        href = link.get_attribute("href")
                        if href and ("hund-" in href or "/hund" in href):
                            link_text = link.text.strip()
                            if link_text:  # Skip links with empty text (image-only links)
                                dog_link = link
                                dog_url = href
                                break
                    if dog_link:
                        break
                except Exception:
                    continue

            if not dog_link or not dog_url:
                self.logger.warning(f"Could not find dog link in container {container_num}")
                return None

            # Parse name and location from text like "Brownie - in München"
            name, location = self._parse_name_and_location(link_text)
            if not name:
                self.logger.warning(f"Could not extract name from container {container_num}")
                return None

            # Extract image URL
            image_url = self._extract_image_from_container(container)

            # Extract external ID from URL
            external_id = self._extract_external_id_from_url(dog_url)

            # Extract any additional visible info from container text
            container_text = container.text
            additional_info = self._extract_additional_info_from_text(container_text)

            dog_data = {
                "name": name,
                "external_id": external_id,
                "adoption_url": dog_url,
                "primary_image_url": image_url,
                "status": "available",
                "animal_type": "dog",
                "properties": {
                    "source": "daisyfamilyrescue.de",
                    "country": "DE",  # Will be refined based on section
                    "extraction_method": "selenium_listing",
                    "language": "de",
                    "location": location,
                    "container_text": container_text[:200],  # First 200 chars for debugging
                },
            }

            # Add any additional extracted info
            dog_data.update(additional_info)

            # Validate the extracted data before returning
            if self._validate_dog_data(dog_data):
                return dog_data
            else:
                self.logger.warning(f"Data validation failed for dog in container {container_num}")
                return None

        except Exception as e:
            self.logger.error(f"Error extracting dog from container {container_num}: {e}")
            return None

    def _parse_name_and_location(self, link_text: str) -> tuple[Optional[str], Optional[str]]:
        """Parse dog name and location from link text like 'Brownie - in München'."""
        if not link_text:
            return None, None

        # Pattern: "Name - in Location" or "Name - Location"
        if " - " in link_text:
            parts = link_text.split(" - ", 1)
            name = parts[0].strip()
            location = parts[1].strip()

            # Remove "in " prefix from location
            if location.startswith("in "):
                location = location[3:].strip()
            elif location.startswith("im "):
                location = location[3:].strip()

            return name, location
        else:
            # Fallback: treat entire text as name
            return link_text.strip(), None

    def _extract_image_from_container(self, container) -> Optional[str]:
        """Extract image URL from container."""
        try:
            img_element = container.find_element(By.TAG_NAME, "img")
            img_src = img_element.get_attribute("src")

            # Validate URL
            if img_src and self._is_valid_image_url(img_src):
                return img_src

        except NoSuchElementException:
            pass
        except Exception as e:
            self.logger.warning(f"Error extracting image: {e}")

        return None

    def _is_valid_image_url(self, url: str) -> bool:
        """Validate that URL points to a valid image."""
        if not url:
            return False

        # Check for image file extensions or known image patterns
        image_patterns = [
            ".jpg",
            ".jpeg",
            ".png",
            ".gif",
            ".webp",
            "beitragsbild",
            "elementor/thumbs",
        ]  # Specific to this site

        url_lower = url.lower()
        return any(pattern in url_lower for pattern in image_patterns)

    def _extract_external_id_from_url(self, url: str) -> str:
        """Extract external ID from dog detail page URL."""
        try:
            # URL pattern: https://daisyfamilyrescue.de/hund-{name}/
            parsed = urlparse(url)
            path_parts = parsed.path.strip("/").split("/")

            if len(path_parts) >= 1 and path_parts[0].startswith("hund-"):
                return path_parts[0]  # e.g., "hund-brownie"

        except Exception as e:
            self.logger.warning(f"Error extracting external ID from URL {url}: {e}")

        # Fallback: generate ID from URL
        return hashlib.md5(url.encode()).hexdigest()[:8]

    def _extract_additional_info_from_text(self, container_text: str) -> Dict[str, Any]:
        """Extract additional information from container text."""
        additional_info = {}

        # Look for date patterns (birth date)
        date_pattern = r"(\d{2}/\d{4})"
        date_match = re.search(date_pattern, container_text)
        if date_match:
            additional_info["birth_date"] = date_match.group(1)

        # Look for size/weight patterns
        size_pattern = r"(\d+)cm"
        size_match = re.search(size_pattern, container_text)
        if size_match:
            additional_info["height_cm"] = int(size_match.group(1))

        weight_pattern = r"(\d+)kg"
        weight_match = re.search(weight_pattern, container_text)
        if weight_match:
            additional_info["weight_kg"] = int(weight_match.group(1))

        return additional_info

    def _validate_dog_data(self, dog_data: Dict[str, Any]) -> bool:
        """Validate dog data before processing.

        Ensures data meets minimum requirements for BaseScraper processing.
        """
        try:
            # Required fields check
            required_fields = ["name", "external_id"]
            for field in required_fields:
                if not dog_data.get(field):
                    self.logger.warning(f"Missing required field: {field}")
                    return False

            # Name validation
            name = dog_data.get("name", "")
            if len(name.strip()) < 2:
                self.logger.warning(f"Name too short: '{name}'")
                return False

            # External ID validation
            external_id = dog_data.get("external_id", "")
            if len(external_id.strip()) < 3:
                self.logger.warning(f"External ID too short: '{external_id}'")
                return False

            # URL validation
            adoption_url = dog_data.get("adoption_url")
            if adoption_url and not adoption_url.startswith("http"):
                self.logger.warning(f"Invalid adoption URL: {adoption_url}")
                return False

            return True

        except Exception as e:
            self.logger.error(f"Error validating dog data: {e}")
            return False

    def generate_external_id(self, name: str, url: str) -> str:
        """Generate unique external ID for a dog."""
        # Use URL-based ID as primary
        url_id = self._extract_external_id_from_url(url)
        if url_id:
            return url_id

        # Fallback: generate from name
        normalized_name = re.sub(r"[^\w\s-]", "", name.lower())
        normalized_name = re.sub(r"\s+", "-", normalized_name.strip())

        # Add hash for uniqueness
        hash_suffix = hashlib.md5(f"{name}-{url}".encode()).hexdigest()[:6]
        return f"{normalized_name}-{hash_suffix}"
