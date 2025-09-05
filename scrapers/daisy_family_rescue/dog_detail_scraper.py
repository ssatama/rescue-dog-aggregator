import re
from typing import Any, Dict, Optional
from urllib.parse import urlparse

from selenium import webdriver
from selenium.common.exceptions import NoSuchElementException, TimeoutException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


class DaisyFamilyRescueDogDetailScraper:
    """Scraper for individual dog detail pages from Daisy Family Rescue."""

    def __init__(self, base_url: str = "https://daisyfamilyrescue.de"):
        """Initialize the detail scraper."""
        self.base_url = base_url

        # German field patterns found in inspection
        self.steckbrief_patterns = [
            "Alter:",
            "Geschlecht:",
            "Rasse:",
            "Herkunft:",
            "Aufenthaltsort:",
            "Gewicht:",
            "Schulterhöhe:",
            "Charakter:",
            "Verträgt sich mit",
            "Halter:",
            "Traumzuhause:",
            "Schutzgebühr:",
        ]

        # Field mappings for standardization
        self.sex_translations = {
            "weiblich": "Female",
            "männlich": "Male",
            "hündin": "Female",
            "rüde": "Male",
        }

        self.breed_translations = {
            "mischling": "mixed breed",
            "deutscher schäferhund": "german shepherd",
            "golden retriever": "golden retriever",
            "labrador": "labrador",
            "terrier": "terrier",
        }

        # Size categories based on height (cm)
        self.size_categories = {"small": (0, 40), "medium": (40, 60), "large": (60, 100)}

    def setup_driver(self, headless: bool = True) -> webdriver.Chrome:
        """Setup Chrome driver for scraping."""
        chrome_options = Options()
        if headless:
            chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument("--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

        return webdriver.Chrome(options=chrome_options)

    def extract_dog_details(self, dog_url: str, logger=None) -> Optional[Dict[str, Any]]:
        """Extract detailed information from a single dog's detail page."""
        driver = None

        try:
            driver = self.setup_driver()

            if logger:
                logger.info(f"Loading dog detail page: {dog_url}")

            driver.get(dog_url)

            # Wait for page to load
            WebDriverWait(driver, 30).until(EC.presence_of_element_located((By.TAG_NAME, "body")))

            # Extract all the data
            dog_data = {
                "adoption_url": dog_url,
                "external_id": self._extract_external_id_from_url(dog_url),
                "properties": {
                    "source": "daisyfamilyrescue.de",
                    "extraction_method": "detail_page",
                    "language": "de",
                },
            }

            # Extract Steckbrief data
            steckbrief_data = self._extract_steckbrief_data(driver, logger)
            if steckbrief_data:
                # Process and standardize the data
                processed_data = self._process_steckbrief_data(steckbrief_data, logger)
                dog_data.update(processed_data)

            # Extract main dog image
            image_url = self._extract_main_image(driver, logger)
            if image_url:
                dog_data["primary_image_url"] = image_url

            # Extract additional description text
            description = self._extract_description(driver, logger)
            if description:
                # Ensure properties is still a dictionary after update
                if "properties" not in dog_data:
                    dog_data["properties"] = {}
                if isinstance(dog_data["properties"], dict):
                    dog_data["properties"]["german_description"] = description

            # Extract dog name from page title or content
            name = self._extract_dog_name(driver, logger)
            if name:
                dog_data["name"] = name

            if logger:
                logger.debug(f"Extracted details for dog: {dog_data.get('name', 'Unknown')}")

            return dog_data

        except Exception as e:
            if logger:
                logger.error(f"Error extracting details from {dog_url}: {e}")
            return None

        finally:
            if driver:
                driver.quit()

    def _extract_steckbrief_data(self, driver: webdriver.Chrome, logger=None) -> Dict[str, str]:
        """Extract structured data from the Steckbrief section."""
        steckbrief_data = {}

        try:
            # Find the Steckbrief section header
            steckbrief_header = WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.XPATH, "//h4[contains(text(), 'Steckbrief')]")))

            if logger:
                logger.debug("Found Steckbrief section")

            # Get the container that contains all the data
            # Try different container approaches - the data is in the great-grandparent or ancestor section
            try:
                steckbrief_container = steckbrief_header.find_element(By.XPATH, "../../..")
            except NoSuchElementException:
                try:
                    steckbrief_container = steckbrief_header.find_element(By.XPATH, "ancestor::section[1]")
                except NoSuchElementException:
                    # Fallback to grandparent
                    steckbrief_container = steckbrief_header.find_element(By.XPATH, "../..")

            # Extract all text from the container
            container_text = steckbrief_container.text

            # Parse structured fields from the text
            for pattern in self.steckbrief_patterns:
                value = self._extract_field_value(container_text, pattern)
                if value:
                    steckbrief_data[pattern] = value
                    if logger:
                        logger.debug(f"Extracted {pattern} {value}")

        except TimeoutException:
            if logger:
                logger.warning("Steckbrief section not found")
        except Exception as e:
            if logger:
                logger.error(f"Error extracting Steckbrief data: {e}")

        return steckbrief_data

    def _extract_field_value(self, text: str, field_pattern: str) -> Optional[str]:
        """Extract the value for a specific field from text."""
        # Create regex pattern to match field and its value
        # Pattern: "Alter: 03/2020" or "Geschlecht: weiblich, kastriert"
        pattern = rf"{re.escape(field_pattern)}\s*([^\n]+)"
        match = re.search(pattern, text, re.IGNORECASE)

        if match:
            value = match.group(1).strip()
            # Remove the field name if it's repeated
            value = re.sub(rf"^{re.escape(field_pattern)}\s*", "", value).strip()
            return value if value else None

        return None

    def _process_steckbrief_data(self, steckbrief_data: Dict[str, str], logger=None) -> Dict[str, Any]:
        """Process and standardize the raw Steckbrief data."""
        processed_data = {}

        # Process age/birth date - just extract the age text for unified parsing
        if "Alter:" in steckbrief_data:
            processed_data["age_text"] = steckbrief_data["Alter:"]
            processed_data["age"] = steckbrief_data["Alter:"]  # Unified standardization expects 'age' field

        # Process gender/sex
        if "Geschlecht:" in steckbrief_data:
            sex_data = self._parse_sex(steckbrief_data["Geschlecht:"])
            if sex_data:
                processed_data.update(sex_data)

        # Process breed
        if "Rasse:" in steckbrief_data:
            breed = self._parse_breed(steckbrief_data["Rasse:"])
            if breed:
                processed_data["breed"] = breed

        # Process weight
        if "Gewicht:" in steckbrief_data:
            weight = self._parse_weight(steckbrief_data["Gewicht:"])
            if weight:
                processed_data["weight_kg"] = weight

        # Process height and determine size
        if "Schulterhöhe:" in steckbrief_data:
            height = self._parse_height(steckbrief_data["Schulterhöhe:"])
            if height:
                processed_data["height_cm"] = height
                size = self._determine_size(height)
                if size:
                    processed_data["size"] = size

        # Process location/origin
        if "Herkunft:" in steckbrief_data:
            origin = self._parse_location(steckbrief_data["Herkunft:"])
            if origin:
                processed_data["properties"] = processed_data.get("properties", {})
                processed_data["properties"]["origin"] = origin

        if "Aufenthaltsort:" in steckbrief_data:
            location = self._parse_location(steckbrief_data["Aufenthaltsort:"])
            if location:
                processed_data["properties"] = processed_data.get("properties", {})
                processed_data["properties"]["current_location"] = location

        # Store character description
        if "Charakter:" in steckbrief_data:
            processed_data["properties"] = processed_data.get("properties", {})
            processed_data["properties"]["character_german"] = steckbrief_data["Charakter:"]

        # Store compatibility info
        if "Verträgt sich mit" in steckbrief_data:
            processed_data["properties"] = processed_data.get("properties", {})
            processed_data["properties"]["compatibility_german"] = steckbrief_data["Verträgt sich mit"]

        # Store adoption fee
        if "Schutzgebühr:" in steckbrief_data:
            fee = self._parse_adoption_fee(steckbrief_data["Schutzgebühr:"])
            if fee:
                processed_data["properties"] = processed_data.get("properties", {})
                processed_data["properties"]["adoption_fee_eur"] = fee

        return processed_data

    def _parse_sex(self, sex_text: str) -> Optional[Dict[str, Any]]:
        """Parse sex from German text like 'weiblich, kastriert'."""
        if not sex_text:
            return None

        sex_data: Dict[str, Any] = {}
        sex_lower = sex_text.lower()

        # Determine gender
        gender = None
        for german, english in self.sex_translations.items():
            if german in sex_lower:
                gender = english
                break

        if gender:
            sex_data["sex"] = gender

        # Check for spay/neuter status
        if "kastriert" in sex_lower or "sterilisiert" in sex_lower:
            sex_data["properties"] = {"spayed_neutered": True}

        # Store original German text
        if "properties" not in sex_data:
            sex_data["properties"] = {}
        sex_data["properties"]["sex_german"] = sex_text

        return sex_data

    def _parse_breed(self, breed_text: str) -> Optional[str]:
        """Parse breed from German text."""
        if not breed_text:
            return None

        breed_lower = breed_text.lower()

        # Check for known breed translations
        for german, english in self.breed_translations.items():
            if german in breed_lower:
                return english

        # Return original if no translation found
        return breed_text

    def _parse_weight(self, weight_text: str) -> Optional[float]:
        """Parse weight from text like '19 kg'."""
        if not weight_text:
            return None

        # Extract number followed by kg
        weight_match = re.search(r"(\d+(?:\.\d+)?)\s*kg", weight_text.lower())
        if weight_match:
            return float(weight_match.group(1))

        return None

    def _parse_height(self, height_text: str) -> Optional[int]:
        """Parse height from text like '53 cm'."""
        if not height_text:
            return None

        # Extract number followed by cm
        height_match = re.search(r"(\d+)\s*cm", height_text.lower())
        if height_match:
            return int(height_match.group(1))

        return None

    def _determine_size(self, height_cm: int) -> Optional[str]:
        """Determine size category based on height."""
        # Size mapping with proper case for frontend compatibility
        size_mapping = {"small": "Small", "medium": "Medium", "large": "Large"}

        for size, (min_height, max_height) in self.size_categories.items():
            if min_height <= height_cm < max_height:
                return size_mapping.get(size, size)

        # Handle edge cases
        if height_cm >= 100:
            return "Large"  # Proper case
        elif height_cm <= 0:
            return None

        return "medium"  # Default fallback

    def _parse_location(self, location_text: str) -> Optional[str]:
        """Parse location from text."""
        if not location_text:
            return None

        # Basic cleaning - remove extra whitespace
        location = location_text.strip()

        # Translate common German locations
        location_translations = {
            "nordmazedonien": "North Macedonia",
            "deutschland": "Germany",
            "münchen": "Munich",
            "berlin": "Berlin",
            "köln": "Cologne",
        }

        location_lower = location.lower()
        for german, english in location_translations.items():
            if german in location_lower:
                return english

        return location

    def _parse_adoption_fee(self, fee_text: str) -> Optional[float]:
        """Parse adoption fee from text like '615 €'."""
        if not fee_text:
            return None

        # Extract number before € symbol
        fee_match = re.search(r"(\d+(?:\.\d+)?)\s*€", fee_text)
        if fee_match:
            return float(fee_match.group(1))

        return None

    def _extract_main_image(self, driver: webdriver.Chrome, logger=None) -> Optional[str]:
        """Extract the main dog image from the page."""
        try:
            # Look for images with specific patterns (found in inspection)
            image_selectors = [
                "img[alt*='beitragsbild']",  # Main content image
                "img[src*='brownie']",  # Example from inspection
                "img[src*='wp-content/uploads']",  # WordPress uploads
                ".elementor-image img",  # Elementor image widgets
                "article img",  # Any image in article
                "main img",  # Any image in main content
            ]

            for selector in image_selectors:
                try:
                    img_elements = driver.find_elements(By.CSS_SELECTOR, selector)
                    for img in img_elements:
                        src = img.get_attribute("src")
                        alt = img.get_attribute("alt") or ""

                        # Skip common non-dog images
                        if src and self._is_valid_dog_image(src, alt):
                            if logger:
                                logger.debug(f"Found main image: {src}")
                            return src
                except Exception:
                    continue

            if logger:
                logger.warning("No valid dog image found")

        except Exception as e:
            if logger:
                logger.error(f"Error extracting main image: {e}")

        return None

    def _is_valid_dog_image(self, src: str, alt: str) -> bool:
        """Check if an image URL is likely a dog photo."""
        if not src:
            return False

        src_lower = src.lower()
        alt_lower = alt.lower()

        # Skip common non-dog images
        skip_patterns = [
            "logo",
            "close",
            "cookie",
            "icon",
            "button",
            "facebook",
            "instagram",
            "social",
            "header",
        ]

        for pattern in skip_patterns:
            if pattern in src_lower or pattern in alt_lower:
                return False

        # Look for dog-related patterns
        dog_patterns = ["beitragsbild", "hund", "dog", "wp-content/uploads"]

        for pattern in dog_patterns:
            if pattern in src_lower:
                return True

        # Check file extensions
        image_extensions = [".jpg", ".jpeg", ".png", ".webp"]
        if any(ext in src_lower for ext in image_extensions):
            return True

        return False

    def _extract_description(self, driver: webdriver.Chrome, logger=None) -> Optional[str]:
        """Extract additional description text from the page."""
        try:
            # Look for content areas that might contain descriptions
            description_selectors = [
                ".elementor-text-editor",
                ".entry-content",
                ".post-content",
                "main p",
                ".content p",
            ]

            description_parts = []

            for selector in description_selectors:
                try:
                    elements = driver.find_elements(By.CSS_SELECTOR, selector)
                    for element in elements:
                        text = element.text.strip()
                        if text and len(text) > 50:  # Only substantial text
                            # Skip if it's just the Steckbrief content
                            if "steckbrief" not in text.lower():
                                description_parts.append(text)
                except Exception:
                    continue

            if description_parts:
                full_description = "\n\n".join(description_parts)
                if logger:
                    logger.debug(f"Extracted description: {len(full_description)} characters")
                return full_description

        except Exception as e:
            if logger:
                logger.error(f"Error extracting description: {e}")

        return None

    def _extract_dog_name(self, driver: webdriver.Chrome, logger=None) -> Optional[str]:
        """Extract dog name from page title or content."""
        try:
            # Try to get name from page title
            page_title = driver.title
            if page_title:
                # Pattern: "Dog Name - Daisy Family Rescue..."
                title_match = re.search(r"^([^-]+)", page_title)
                if title_match:
                    name = title_match.group(1).strip()
                    if name and name.lower() not in ["daisy", "family", "rescue"]:
                        if logger:
                            logger.debug(f"Extracted name from title: {name}")
                        return name

            # Try to get name from h1 or main heading
            heading_selectors = ["h1", ".entry-title", ".post-title"]
            for selector in heading_selectors:
                try:
                    heading = driver.find_element(By.CSS_SELECTOR, selector)
                    heading_text = heading.text.strip()
                    if heading_text and len(heading_text) < 50:  # Reasonable name length
                        # Extract just the name part
                        name_match = re.search(r"^([^-]+)", heading_text)
                        if name_match:
                            name = name_match.group(1).strip()
                            if logger:
                                logger.debug(f"Extracted name from heading: {name}")
                            return name
                except Exception:
                    continue

        except Exception as e:
            if logger:
                logger.error(f"Error extracting dog name: {e}")

        return None

    def _extract_external_id_from_url(self, url: str) -> str:
        """Extract external ID from dog detail page URL."""
        try:
            # URL pattern: https://daisyfamilyrescue.de/hund-{name}/
            parsed = urlparse(url)
            path_parts = parsed.path.strip("/").split("/")

            if len(path_parts) >= 1 and path_parts[0].startswith("hund-"):
                return path_parts[0]  # e.g., "hund-brownie"

        except Exception:
            pass

        # Fallback: generate ID from URL
        import hashlib

        return hashlib.md5(url.encode()).hexdigest()[:8]
