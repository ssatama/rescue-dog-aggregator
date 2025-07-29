import hashlib
import re
import time
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from webdriver_manager.chrome import ChromeDriverManager

from scrapers.base_scraper import BaseScraper
from scrapers.tierschutzverein_europa.translations import normalize_name, translate_age, translate_breed, translate_gender


class TierschutzvereinEuropaScraper(BaseScraper):
    """Tierschutzverein Europa e.V. scraper for German rescue dogs."""

    def __init__(self, config_id="tierschutzverein-europa", organization_id=None):
        """Initialize Tierschutzverein Europa scraper with configuration."""
        if organization_id is not None:
            # Legacy mode - use organization_id
            super().__init__(organization_id=organization_id)
        else:
            # New mode - use config_id
            super().__init__(config_id=config_id)

        self.base_url: str = "https://tierschutzverein-europa.de"
        self.listing_url: str = "https://tierschutzverein-europa.de/tiervermittlung/"

    def collect_data(self) -> List[Dict[str, Any]]:
        """Main entry point - implements abstract method from BaseScraper."""
        all_dogs = []

        # Use unified Selenium approach as primary method (based on DOM
        # investigation)
        try:
            all_dogs = self._extract_with_selenium_unified()
            if len(all_dogs) > 0:
                self.logger.info(f"Successfully extracted {len(all_dogs)} dogs using unified Selenium approach")
                # Apply translation before returning to BaseScraper
                if all_dogs:
                    all_dogs = self._translate_and_normalize_dogs(all_dogs)
                return all_dogs
        except Exception as e:
            self.logger.warning(f"Unified Selenium extraction failed: {e}")

        # Fallback to legacy Selenium if unified fails
        try:
            all_dogs = self._extract_with_selenium()
            self.logger.info(f"Successfully extracted {len(all_dogs)} dogs using legacy Selenium approach")
            # Apply translation before returning to BaseScraper
            if all_dogs:
                all_dogs = self._translate_and_normalize_dogs(all_dogs)
            return all_dogs
        except Exception as e:
            self.logger.warning(f"Legacy Selenium extraction failed: {e}")

        # Final fallback to requests approach
        try:
            all_dogs = self._extract_with_requests()
            if len(all_dogs) > 0:
                self.logger.info(f"Successfully extracted {len(all_dogs)} dogs using requests approach")
                # Apply translation before returning to BaseScraper
                all_dogs = self._translate_and_normalize_dogs(all_dogs)
            return all_dogs
        except Exception as e:
            self.logger.error(f"All extraction methods failed. Last error: {e}")
            return []

        # Fallback return in case no extraction method is attempted
        if all_dogs:
            all_dogs = self._translate_and_normalize_dogs(all_dogs)
        return all_dogs

    def _translate_and_normalize_dogs(self, dogs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Translate German data to English for BaseScraper processing.

        This is the critical point where raw German data is translated to English
        before being passed to BaseScraper's standardization methods.

        Args:
            dogs: List of dog dictionaries with German data

        Returns:
            List of dog dictionaries with English data ready for base_scraper standardization
        """
        translated_dogs = []

        for dog in dogs:
            try:
                # Create copy to avoid modifying original
                translated_dog = dog.copy()

                # Fix name capitalization
                if translated_dog.get("name"):
                    translated_dog["name"] = normalize_name(translated_dog["name"])

                # Translate core fields
                if translated_dog.get("sex"):
                    translated_sex = translate_gender(translated_dog["sex"])
                    if translated_sex:
                        translated_dog["sex"] = translated_sex

                if translated_dog.get("age_text"):
                    translated_age = translate_age(translated_dog["age_text"])
                    if translated_age:
                        translated_dog["age_text"] = translated_age
                    elif translated_dog["age_text"].lower() == "unbekannt":
                        translated_dog["age_text"] = None

                if translated_dog.get("breed"):
                    translated_breed = translate_breed(translated_dog["breed"])
                    if translated_breed:
                        translated_dog["breed"] = translated_breed

                # Update language in properties
                if "properties" not in translated_dog:
                    translated_dog["properties"] = {}
                translated_dog["properties"]["language"] = "en"
                translated_dog["properties"]["original_language"] = "de"

                translated_dogs.append(translated_dog)

            except Exception as e:
                self.logger.error(f"Translation failed for {dog.get('name', 'unknown')}: {e}")
                # Return original with error flag rather than lose the dog
                dog_with_error = dog.copy()
                if "properties" not in dog_with_error:
                    dog_with_error["properties"] = {}
                dog_with_error["properties"]["translation_error"] = str(e)
                translated_dogs.append(dog_with_error)

        self.logger.info(f"Translated {len(translated_dogs)} dogs from German to English")
        return translated_dogs

    def _extract_with_requests(self) -> List[Dict[str, Any]]:
        """Extract using requests + BeautifulSoup."""
        all_dogs = []

        # Process all 12 pages
        for page in range(1, 13):
            try:
                page_url = self.get_page_url(page)
                self.logger.info(f"Processing page {page}: {page_url}")

                response = requests.get(
                    page_url,
                    timeout=getattr(self, "timeout", 30),
                    headers={"User-Agent": "Mozilla/5.0 (compatible; rescue-dog-aggregator)"},
                )
                response.raise_for_status()

                page_dogs = self._extract_dogs_from_html(response.text, page_url)
                all_dogs.extend(page_dogs)

                # Rate limiting
                rate_limit = getattr(self, "rate_limit_delay", 3.0)
                time.sleep(rate_limit)

            except Exception as e:
                self.logger.error(f"Failed to process page {page}: {e}")
                continue

        return all_dogs

    def _extract_with_selenium(self) -> List[Dict[str, Any]]:
        """Fallback to Selenium unified extraction."""
        all_dogs = []
        driver = None

        try:
            # Setup Chrome options
            chrome_options = Options()
            headless = getattr(self.org_config, "scraper", {}).get("config", {}).get("headless", True) if hasattr(self, "org_config") and self.org_config else True
            if headless:
                chrome_options.add_argument("--headless")
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-gpu")

            driver = webdriver.Chrome(
                service=webdriver.chrome.service.Service(ChromeDriverManager().install()),
                options=chrome_options,
            )

            # Process all 12 pages
            for page in range(1, 13):
                try:
                    page_url = self.get_page_url(page)
                    self.logger.info(f"Processing page {page} with Selenium: {page_url}")

                    driver.get(page_url)

                    # Wait for content to load
                    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CLASS_NAME, "x-col")))

                    # Get page source and extract dogs
                    page_dogs = self._extract_dogs_from_html(driver.page_source, page_url)
                    all_dogs.extend(page_dogs)

                    # Rate limiting
                    rate_limit = getattr(self, "rate_limit_delay", 3.0)
                    time.sleep(rate_limit)

                except Exception as e:
                    self.logger.error(f"Failed to process page {page} with Selenium: {e}")
                    continue

        finally:
            if driver:
                driver.quit()

        return all_dogs

    def _extract_single_dog_from_link(self, link_element, href: str) -> Optional[Dict[str, Any]]:
        """Extract dog data from a link element."""
        try:
            # Extract the external ID from the URL path
            path_parts = href.strip("/").split("/")
            if len(path_parts) < 2 or path_parts[0] != "tiervermittlung":
                return None

            external_id = path_parts[1]  # This is the dog's URL slug

            # Extract name from the URL slug or link text
            name = self._extract_name_from_url(external_id) or link_element.get_text(strip=True)
            if not name or len(name) < 2:
                return None

            # Look for image within the link
            image_url = self._extract_image_from_link(link_element)

            # Get all text content from the link for analysis
            link_text = link_element.get_text(strip=True)

            # Extract details from the text content
            age_text = self.extract_age_from_text(link_text) or "Unbekannt"
            sex = self.extract_gender_from_text(link_text) or "Unbekannt"
            breed = self.extract_breed_from_text(link_text) or "Mischling"

            # Build full adoption URL
            adoption_url = urljoin(self.base_url, href) if not href.startswith("http") else href

            # Basic validation
            if not self._is_valid_dog_link(name, link_text, href):
                return None

            return {
                "name": name,
                "external_id": external_id,
                "age_text": age_text,
                "sex": sex,
                "breed": breed,
                "primary_image_url": image_url,
                "adoption_url": adoption_url,
                "properties": {
                    "source": "tierschutzverein-europa.de",
                    "country": "DE",
                    "extraction_method": "link_based",
                    "language": "de",
                },
            }

        except Exception as e:
            self.logger.warning(f"Failed to extract dog from link: {e}")
            return None

    def _extract_name_from_url(self, url_slug: str) -> Optional[str]:
        """Extract dog name from URL slug like 'sasha-in-spanien-ada-canals'."""
        if not url_slug:
            return None

        # Remove common location patterns
        url_slug = re.sub(r"-in-(spanien|deutschland|rumaenien)", "", url_slug)
        url_slug = re.sub(r"-ada-canals?$", "", url_slug)  # Location suffix

        # Take the first part as the name
        parts = url_slug.split("-")
        if parts:
            name = parts[0].capitalize()
            # Add second part if it looks like part of the name
            if len(parts) > 1 and len(parts[1]) <= 10 and parts[1].isalpha():
                name += " " + parts[1].capitalize()
            return name

        return None

    def _extract_image_from_link(self, link_element) -> Optional[str]:
        """Extract image URL from link element."""
        # Look for img tags within the link
        img_tags = link_element.find_all("img")

        for img in img_tags:
            src = img.get("src") or img.get("data-src")
            if src and self.is_valid_url(str(src)):
                # Convert relative URLs to absolute
                if str(src).startswith("/"):
                    src = urljoin(self.base_url, str(src))
                return str(src)

        return None

    def _is_valid_dog_link(self, name: str, text: str, href: str) -> bool:
        """Validate that this link represents a real dog listing."""
        # Skip obvious non-dog pages
        invalid_patterns = ["mitgliedschaft", "spende", "kontakt", "home", "about"]
        href_lower = href.lower()

        if any(pattern in href_lower for pattern in invalid_patterns):
            return False

        # Check for reasonable name
        if not name or len(name) < 2 or name.lower() in ["ihre", "mehr", "info"]:
            return False

        # URL should contain the dog listing pattern
        if "/tiervermittlung/" not in href:
            return False

        return True

    def _extract_dogs_from_html(self, html_content: str, page_url: str) -> List[Dict[str, Any]]:
        """Extract dog data from HTML content."""
        dogs = []

        try:
            soup = BeautifulSoup(html_content, "html.parser")

            # Look for links that point to individual dog pages
            # Pattern: /tiervermittlung/dog-name-location/
            dog_links = soup.find_all("a", href=True)

            for link in dog_links:
                # Check if link is a Tag element before calling get
                if not hasattr(link, "get"):
                    continue
                href = link.get("href", "")
                # Check if this looks like a dog page URL
                if "/tiervermittlung/" in href and href.count("/") >= 3:
                    try:
                        dog_data = self._extract_single_dog_from_link(link, href)
                        if dog_data:
                            dogs.append(dog_data)
                    except Exception as e:
                        self.logger.warning(f"Failed to extract dog from link: {e}")
                        continue

        except Exception as e:
            self.logger.error(f"Failed to parse HTML content: {e}")

        return dogs

    def _extract_single_dog(self, container) -> Optional[Dict[str, Any]]:
        """Extract data from a single dog container."""
        try:
            # Extract name - look for text content that might be a dog name
            name = self._extract_name_from_container(container)
            if not name:
                return None

            # Extract image
            image_url = self._extract_image_from_container(container)

            # Extract text content for other details
            text_content = container.get_text(strip=True)

            # Extract individual fields
            age_text = self.extract_age_from_text(text_content) or "Unbekannt"
            sex = self.extract_gender_from_text(text_content) or "Unbekannt"
            breed = self.extract_breed_from_text(text_content) or "Mischling"

            # Generate external ID
            external_id = self.generate_external_id(name, text_content)

            # Build adoption URL
            adoption_url = self.build_adoption_url(external_id)

            # Validate that this looks like a real dog listing
            if not self._is_valid_dog_data(name, text_content, image_url):
                return None

            return {
                "name": name,
                "external_id": external_id,
                "age_text": age_text,
                "sex": sex,
                "breed": breed,
                "primary_image_url": image_url,
                "adoption_url": adoption_url,
                "properties": {
                    "source": "tierschutzverein-europa.de",
                    "country": "DE",
                    "extraction_method": "legacy_single",
                    "language": "de",
                },
            }

        except Exception as e:
            self.logger.warning(f"Failed to extract single dog: {e}")
            return None

    def _extract_name_from_container(self, container) -> Optional[str]:
        """Extract dog name from container."""
        # Look for text elements that might contain names
        text_elements = container.find_all(["span", "div", "p", "h1", "h2", "h3"])

        # Skip containers that clearly aren't dog listings
        container_text = container.get_text(strip=True).lower()
        skip_keywords = [
            "mitgliedschaft",
            "spende",
            "paypal",
            "ihre unterstützung",
            "unterstützen",
        ]
        if any(keyword in container_text for keyword in skip_keywords):
            return None

        for element in text_elements:
            text = element.get_text(strip=True)
            if text and 3 <= len(text) <= 50:  # Names are typically short but not too short
                # Check if this looks like a dog name (starts with capital, no
                # numbers)
                if re.match(r"^[A-ZÄÖÜ][a-zäöüA-ZÄÖÜ\s\-]+$", text):
                    # Additional filtering for common dog names vs website text
                    if text.lower() not in [
                        "ihre",
                        "mehr",
                        "info",
                        "details",
                        "kontakt",
                    ]:
                        return normalize_name(self.extract_name_from_text(text))

        return None

    def _extract_image_from_container(self, container) -> Optional[str]:
        """Extract image URL from container."""
        # Look for images
        img_elements = container.find_all("img")

        for img in img_elements:
            src = img.get("src") or img.get("data-src")
            if src and self.is_valid_url(str(src)):
                # Convert relative URLs to absolute
                if str(src).startswith("/"):
                    src = urljoin(self.base_url, str(src))
                return str(src)

        return None

    def get_page_url(self, page: int) -> str:
        """Generate URL for specific page."""
        if page == 1:
            return self.listing_url
        return f"{self.listing_url}page/{page}/"

    def extract_name_from_text(self, text: str) -> str:
        """Extract name from text patterns."""
        text = text.strip()

        # Handle pattern like "Sasha - 2 Jahre, Hündin"
        if " - " in text:
            name = text.split(" - ")[0].strip()
            if name:
                return normalize_name(name)

        # Handle other patterns
        name_patterns = [
            r"^([A-ZÄÖÜ][a-zäöüA-ZÄÖÜ\-]+)",  # First capitalized word
            # Name before article
            r"([A-ZÄÖÜ][a-zäöüA-ZÄÖÜ\-]+)\s+(?:der|die|das|ist|sucht)",
        ]

        for pattern in name_patterns:
            match = re.search(pattern, text)
            if match:
                return normalize_name(match.group(1).strip())

        # Fallback: return first word if it looks like a name
        words = text.split()
        if words and re.match(r"^[A-ZÄÖÜ][a-zäöüA-ZÄÖÜ\-]+$", words[0]):
            return normalize_name(words[0])

        # Final fallback to first 20 characters, normalized
        return normalize_name(text[:20]) if text else ""

    def extract_age_from_text(self, text: str) -> Optional[str]:
        """Extract age from German text patterns."""
        age_patterns = [
            r"(ca\.\s*\d+(?:,\d+)?\s+Jahre?)",
            r"(etwa\s+\d+(?:,\d+)?\s+Jahre?)",
            r"(\d+(?:,\d+)?\s+Jahre?)(?:\s+alt)?",
            r"(\d+\s+Monate?)(?:\s+alt)?",
        ]

        for pattern in age_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()

        return None

    def extract_gender_from_text(self, text: str) -> Optional[str]:
        """Extract gender from German text."""
        text_lower = text.lower()

        if "hündin" in text_lower or "weiblich" in text_lower or "female" in text_lower:
            return "Hündin"
        elif "rüde" in text_lower or "männlich" in text_lower or "male" in text_lower:
            return "Rüde"

        return None

    def extract_breed_from_text(self, text: str) -> str:
        """Extract breed from German text patterns."""
        # Common German breed patterns
        breed_patterns = [
            r"(Deutscher Schäferhund)",
            r"(Golden Retriever(?:\s+Mix)?)",
            r"(Labrador)",
            r"(Mischling)",
            r"([A-ZÄÖÜ][a-zäöüA-ZÄÖÜ\s]+(?:hund|retriever|terrier|spaniel|mix))",
        ]

        for pattern in breed_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()

        # Default fallback
        return "Mischling"

    def generate_external_id(self, name: str, details: str) -> str:
        """Generate unique external ID from name and details."""
        # Normalize name for ID - handle German characters
        normalized_name = name.lower()
        # Replace German umlauts for URL-safe IDs
        normalized_name = normalized_name.replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
        normalized_name = re.sub(r"[^\w\s-]", "", normalized_name)
        normalized_name = re.sub(r"\s+", "-", normalized_name.strip())

        # Extract age for uniqueness
        age = self.extract_age_from_text(details)
        if age:
            age_normalized = age.lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue")
            age_normalized = re.sub(r"[^\w]", "-", age_normalized)
            base_id = f"{normalized_name}-{age_normalized}"
        else:
            base_id = normalized_name

        # Add hash for uniqueness
        hash_input = f"{name}-{details}"
        hash_suffix = hashlib.md5(hash_input.encode()).hexdigest()[:6]

        return f"{base_id}-{hash_suffix}"

    def build_adoption_url(self, external_id: str) -> str:
        """Build adoption URL for a dog."""
        return f"{self.base_url}/tiervermittlung/{external_id}/"

    def is_valid_url(self, url: str) -> bool:
        """Validate URL format."""
        if not url:
            return False

        # Check for basic URL structure
        try:
            result = urlparse(url)
            return all([result.scheme, result.netloc])
        except BaseException:
            return False

    def normalize_german_text(self, text: str) -> str:
        """Normalize German text while preserving umlauts."""
        if not text:
            return ""

        # Normalize whitespace and line breaks
        text = re.sub(r"\s+", " ", text.strip())

        return text

    def _is_valid_dog_data(self, name: str, content: str, image_url: Optional[str]) -> bool:
        """Validate that extracted data represents a real dog listing."""
        # Skip if name looks like website navigation or general text
        invalid_names = [
            "ihre",
            "mitgliedschaft",
            "spende",
            "mehr",
            "info",
            "kontakt",
            "details",
            "home",
            "über",
        ]
        if name.lower() in invalid_names:
            return False

        # Check for dog-related content in the text
        dog_indicators = [
            "hund",
            "hündin",
            "rüde",
            "jahre",
            "monate",
            "welp",
            "mix",
            "rasse",
        ]
        content_lower = content.lower()

        # If we have clear dog indicators, it's likely valid
        if any(indicator in content_lower for indicator in dog_indicators):
            return True

        # If we have a reasonable image (not PayPal/donation), it might be
        # valid
        if image_url and "paypal" not in image_url.lower() and "donation" not in image_url.lower():
            return True

        # Otherwise, be conservative and skip
        return False

    def extract_data_from_article_text(self, article_text: str) -> Dict[str, Any]:
        """Extract dog data from article text structure found during DOM investigation."""
        result = {}

        # Extract name (first line, usually the dog's name in capitals)
        lines = [line.strip() for line in article_text.strip().split("\n") if line.strip()]
        if lines:
            # First line is typically the dog's name
            name = lines[0]
            if name and len(name) < 20 and re.match(r"^[A-ZÄÖÜ][A-ZÄÖÜa-zäöüß\s-]*$", name):
                # Normalize ALL CAPS names to proper capitalization
                result["name"] = normalize_name(name)

        # Extract structured data using regex patterns found in investigation
        breed_match = re.search(r"Rasse:\s*([^\n]+)", article_text)
        if breed_match:
            result["breed"] = breed_match.group(1).strip()

        gender_match = re.search(r"Geschlecht:\s*(männlich|weiblich)", article_text)
        if gender_match:
            gender = gender_match.group(1)
            result["sex"] = "Rüde" if gender == "männlich" else "Hündin"

        # Extract age from birthday
        birthday_match = re.search(r"Geburtstag:\s*(\d{2})\.(\d{4})\s*\((\d+)\s+Jahre?\s+alt\)", article_text)
        if birthday_match:
            years = birthday_match.group(3)
            result["age_text"] = f"{years} Jahre"

        return result

    def extract_external_id_from_url(self, url: str) -> str:
        """Extract external ID from URL patterns found during investigation."""
        # Handle both full URLs and partial paths
        if url.startswith("/"):
            url_path = url
        else:
            parsed = urlparse(url)
            url_path = parsed.path

        # Extract from pattern /tiervermittlung/external-id/
        parts = url_path.strip("/").split("/")
        if len(parts) >= 2 and parts[0] == "tiervermittlung":
            return parts[1]

        return ""

    def extract_profile_image_from_images(self, images: List[tuple]) -> Optional[str]:
        """Extract profile image URL from list of (url, alt_text) tuples.

        Based on investigation, profile images are typically the third image
        and are 300x300px from the tierschutzverein-europa.de domain.
        """
        for i, (img_url, alt_text) in enumerate(images):
            # Look for the profile image pattern found in investigation
            if "tierschutzverein-europa.de" in img_url and "Profilbild" in (alt_text or "") and "300x300" in img_url:
                return str(img_url)

        # Fallback: third image if available and looks like a profile
        if len(images) >= 3:
            third_img_url, third_alt = images[2]
            if "tierschutzverein-europa.de" in third_img_url:
                return str(third_img_url)

        return None

    def _extract_with_selenium_unified(self) -> List[Dict[str, Any]]:
        """Enhanced Selenium extraction using DOM investigation findings."""
        all_dogs = []
        driver = None

        try:
            # Setup Chrome options
            chrome_options = Options()
            chrome_options.add_argument("--headless")
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--window-size=1920,1080")
            chrome_options.add_argument("--user-agent=Mozilla/5.0 (compatible; rescue-dog-aggregator)")

            driver = webdriver.Chrome(options=chrome_options)

            # Process all 12 pages
            for page in range(1, 13):
                try:
                    page_url = self.get_page_url(page)
                    self.logger.info(f"Processing page {page} with unified Selenium: {page_url}")

                    driver.get(page_url)
                    time.sleep(5)  # Wait for page load

                    # Find article elements (dog containers) based on
                    # investigation
                    articles = driver.find_elements(By.TAG_NAME, "article")
                    self.logger.info(f"Found {len(articles)} article elements on page {page}")

                    for i, article in enumerate(articles):
                        try:
                            # Check if this is a dog article
                            classes = article.get_attribute("class") or ""
                            if "tiervermittlung" in classes and "type-tiervermittlung" in classes:
                                # Extract all data from this container
                                dog_data = self._extract_dog_from_article_element(article, i + 1)
                                if dog_data and dog_data.get("name"):
                                    all_dogs.append(dog_data)
                                    self.logger.debug(f"Extracted dog: {dog_data.get('name')} from article {i+1}")
                        except Exception as e:
                            self.logger.warning(f"Error processing article {i+1}: {e}")
                            continue

                    # Rate limiting
                    time.sleep(getattr(self, "rate_limit_delay", 3.0))

                except Exception as e:
                    self.logger.error(f"Failed to process page {page}: {e}")
                    continue

        finally:
            if driver:
                driver.quit()

        return all_dogs

    def _extract_dog_from_article_element(self, article, article_num: int) -> Optional[Dict[str, Any]]:
        """Extract complete dog data from an article element using investigation findings."""
        try:
            # Get text content
            text_content = article.text

            # Extract data using the patterns found in investigation
            dog_data = self.extract_data_from_article_text(text_content)
            if not dog_data.get("name"):
                return None

            # Look for links within this article to get external_id
            links = article.find_elements(By.TAG_NAME, "a")
            external_id = None
            adoption_url = None

            for link in links:
                href = link.get_attribute("href")
                if href and "/tiervermittlung/" in href and href.count("/") >= 4:
                    external_id = self.extract_external_id_from_url(href)
                    adoption_url = href
                    break

            if not external_id:
                # Generate fallback external_id
                external_id = self.generate_external_id(dog_data["name"], text_content)
                adoption_url = self.build_adoption_url(external_id)

            # Extract images from this article
            images = article.find_elements(By.TAG_NAME, "img")
            image_data = []
            for img in images:
                src = img.get_attribute("src")
                alt = img.get_attribute("alt")
                if src and not src.startswith("data:"):
                    image_data.append((src, alt))

            # Get profile image
            primary_image_url = self.extract_profile_image_from_images(image_data)

            # Build final dog data with properties
            result = {
                "name": dog_data["name"],
                "external_id": external_id,
                "age_text": dog_data.get("age_text", "Unbekannt"),
                "sex": dog_data.get("sex", "Unbekannt"),
                "breed": dog_data.get("breed", "Mischling"),
                "adoption_url": adoption_url or self.build_adoption_url(external_id),
                "properties": {
                    "source": "tierschutzverein-europa.de",
                    "country": "DE",
                    "extraction_method": "unified_selenium",
                    "language": "de",
                },
            }

            if primary_image_url:
                result["primary_image_url"] = primary_image_url

            return result

        except Exception as e:
            self.logger.error(f"Error extracting dog from article {article_num}: {e}")
            return None
