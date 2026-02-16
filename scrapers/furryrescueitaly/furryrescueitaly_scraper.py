"""Scraper implementation for Furry Rescue Italy organization."""

import re
import time
from typing import Any
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

from scrapers.base_scraper import BaseScraper

# Using unified standardization through base_scraper.process_animal()


class FurryRescueItalyScraper(BaseScraper):
    """Scraper for Furry Rescue Italy organization.

    Furry Rescue Italy uses static HTML pages with URL-based pagination.
    All content is available without JavaScript rendering, making
    BeautifulSoup + requests the optimal approach.
    """

    def __init__(
        self,
        config_id: str = "furryrescueitaly",
        metrics_collector=None,
        session_manager=None,
        database_service=None,
    ):
        """Initialize Furry Rescue Italy scraper.

        Args:
            config_id: Configuration ID for Furry Rescue Italy
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

        # Use config-driven URLs exclusively (no hardcoded fallbacks)
        website_url = self.org_config.metadata.website_url
        if not website_url:
            raise ValueError(f"No website_url configured for {config_id}")
        self.base_url = str(website_url).rstrip("/")
        self.listing_url = f"{self.base_url}/adoptions/"
        self.organization_name = self.org_config.name

        # Headers for respectful scraping
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }

        self.logger.info(f"Initialized with config: rate_limit_delay={self.rate_limit_delay}, batch_size={self.batch_size}, skip_existing_animals={self.skip_existing_animals}")

    def get_animal_list(self, max_pages_to_scrape: int | None = None) -> list[dict[str, Any]]:
        """Get list of all available dogs from listing pages.

        Args:
            max_pages_to_scrape: Maximum number of pages to scrape (None for all)

        Returns:
            List of dictionaries containing dog information
        """
        self.logger.info(f"get_animal_list: Starting with max_pages_to_scrape={max_pages_to_scrape}")
        self.logger.info(f"get_animal_list: Base URL: {self.base_url}")
        self.logger.info(f"get_animal_list: Listing URL: {self.listing_url}")

        all_dogs = []
        current_page = 1
        max_pages_detected = None

        try:
            while True:
                # Check if we've reached the page limit
                if max_pages_to_scrape and current_page > max_pages_to_scrape:
                    self.logger.info(f"Reached max pages limit ({max_pages_to_scrape})")
                    break

                # Build URL for current page
                if current_page == 1:
                    url = self.listing_url
                else:
                    url = f"{self.listing_url}page/{current_page}/"

                self.logger.info(f"Fetching page {current_page}: {url}")

                # Rate limiting for respectful scraping (applies to all pages)
                if current_page > 1 or all_dogs:  # Rate limit all pages except the very first request
                    time.sleep(self.rate_limit_delay)

                # Fetch the page
                try:
                    response = requests.get(url, headers=self.headers, timeout=self.timeout)
                    response.raise_for_status()
                except Exception as e:
                    self.logger.error(f"Error fetching page {current_page}: {e}")
                    break

                soup = BeautifulSoup(response.text, "html.parser")

                # Extract dogs from current page
                page_dogs = self._extract_dogs_from_page(soup)

                self.logger.info(f"Page {current_page}: _extract_dogs_from_page returned {len(page_dogs)} dogs")
                if not page_dogs:
                    self.logger.info(f"No dogs found on page {current_page}, stopping pagination")
                    break

                all_dogs.extend(page_dogs)
                self.logger.info(f"Found {len(page_dogs)} dogs on page {current_page}")

                # Check for pagination to determine if there are more pages
                if not max_pages_detected:
                    max_pages_detected = self._detect_max_pages(soup)
                    if max_pages_detected:
                        self.logger.info(f"Detected {max_pages_detected} total pages")

                # Check if we've reached the last page
                if max_pages_detected and current_page >= max_pages_detected:
                    self.logger.info(f"Reached last page ({max_pages_detected})")
                    break

                current_page += 1

        except Exception as e:
            self.logger.error(f"Error in get_animal_list: {e}")

        self.logger.info(f"Total dogs found: {len(all_dogs)}")
        return all_dogs

    def _extract_dogs_from_page(self, soup: BeautifulSoup) -> list[dict[str, Any]]:
        """Extract dog information from a listing page.

        Args:
            soup: BeautifulSoup object of the page

        Returns:
            List of dog dictionaries
        """
        dogs = []

        # Look for the specific structure: h6 with class="adoption-header"
        headings = soup.find_all("h6", class_="adoption-header")
        self.logger.debug(f"_extract_dogs_from_page: Found {len(headings)} adoption-header headings")

        for heading in headings:
            text = heading.get_text(strip=True)

            # Check if we have a valid dog name (usually uppercase)
            if not text or len(text) < 2:
                continue

            # Filter out reserved dogs
            if "RESERVED" in text.upper() or "(RESERVED)" in text.upper():
                self.logger.debug(f"Skipping reserved dog: {text}")
                continue

            # Find the parent container that holds all the dog information
            # Looking for the closest div that contains the whole card
            parent = heading.find_parent("div", class_="adopt-card")
            if not parent:
                parent = heading.find_parent("div", id=lambda x: x and x.startswith("post-"))
            if not parent:
                parent = heading.find_parent("article")

            if not parent:
                self.logger.debug(f"Could not find parent container for {text}")
                continue

            # Convert UPPERCASE names to Title Case for better presentation
            name = text.title() if text.isupper() else text
            dog_data = {"name": name}

            # Find the adoption link - should be in a btn class
            link = parent.find("a", class_="btn")
            if not link:
                # Fallback to any link with /adoption/ in href
                link = parent.find("a", href=lambda x: x and "/adoption/" in x)

            if link:
                href = link.get("href", "")
                if not href.startswith("http"):
                    href = urljoin(self.base_url, href)
                dog_data["adoption_url"] = href

                # CRITICAL FIX: Generate external_id to prevent duplicates
                dog_data["external_id"] = self._generate_external_id(name, href)
            else:
                # Skip dogs without adoption links
                self.logger.debug(f"No adoption link found for {text}")
                continue

            # Extract basic info from list items within the same card
            info_items = parent.find_all("li")
            for item in info_items:
                item_text = item.get_text(strip=True)

                # More flexible parsing for Born/Born: format
                if "Born" in item_text:
                    # Handle both "Born:" and "Born" formats
                    if ":" in item_text:
                        born_text = item_text.split(":", 1)[1].strip()
                    else:
                        # Extract text after "Born"
                        born_text = item_text.replace("Born", "").strip()
                    if born_text:
                        dog_data["born"] = born_text

                # More flexible parsing for Weight/weight format
                elif "Weight" in item_text or "weight" in item_text:
                    # Handle both "Weight:" and "weight" formats
                    if ":" in item_text:
                        weight_text = item_text.split(":", 1)[1].strip()
                    else:
                        # Extract text after "Weight" or "weight"
                        weight_text = item_text.replace("Weight", "").replace("weight", "").strip()
                    if weight_text:
                        dog_data["weight"] = weight_text

                # Extract location
                elif "Location" in item_text:
                    if ":" in item_text:
                        location_text = item_text.split(":", 1)[1].strip()
                    else:
                        location_text = item_text.replace("Location", "").strip()
                    if location_text:
                        dog_data["location"] = location_text

            # Add required fields for BaseScraper
            dog_data["animal_type"] = "dog"
            dog_data["status"] = "available"
            dog_data["organization_id"] = self.org_config.id

            dogs.append(dog_data)
            self.logger.debug(f"Extracted dog: {name} with URL: {dog_data.get('adoption_url', 'N/A')}")

        self.logger.info(f"_extract_dogs_from_page: Returning {len(dogs)} dogs")
        return dogs

    def _detect_max_pages(self, soup: BeautifulSoup) -> int | None:
        """Detect the maximum number of pages from pagination.

        Args:
            soup: BeautifulSoup object of the page

        Returns:
            Maximum page number or None if not detected
        """
        pagination = soup.find("div", class_="pagination")
        if not pagination:
            return None

        page_links = pagination.find_all("a", href=True)
        page_numbers = []

        for link in page_links:
            href = link.get("href", "")
            if "/page/" in href:
                try:
                    # Extract page number from URL like /adoptions/page/3/
                    parts = href.rstrip("/").split("/")
                    if parts[-1].isdigit():
                        page_numbers.append(int(parts[-1]))
                except (ValueError, IndexError):
                    continue

        if page_numbers:
            return max(page_numbers)

        return None

    def scrape_animal_details(self, url: str) -> dict[str, Any]:
        """Scrape detailed information from an animal's detail page.

        Args:
            url: URL of the animal's detail page

        Returns:
            Dictionary containing detailed animal information
        """
        try:
            self.logger.info(f"Scraping details from: {url}")

            # Rate limiting for respectful scraping
            time.sleep(self.rate_limit_delay)

            response = requests.get(url, headers=self.headers, timeout=self.timeout)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")

            details = {}

            # Extract name
            name = self._extract_name_from_detail(soup)
            if name:
                details["name"] = name

            # Extract hero image (first 600x600 image)
            hero_image = self._extract_hero_image(soup)
            if hero_image:
                details["primary_image_url"] = hero_image

            # Extract properties from bulleted list
            properties = self._extract_properties(soup)
            if properties:
                details["properties"] = properties

                # Extract weight from size/future_size if present
                size_text = properties.get("size") or properties.get("future_size")
                if size_text:
                    weight = self._extract_weight_from_size(size_text)
                    if weight:
                        properties["weight"] = weight

            # Extract and clean description
            description = self._extract_clean_description(soup)
            if description:
                details["description"] = description

            return details

        except Exception as e:
            self.logger.error(f"Error scraping details from {url}: {e}")
            return {}

    def _extract_name_from_detail(self, soup: BeautifulSoup) -> str | None:
        """Extract dog name from detail page."""
        # Try fusion-tb-text class first
        name_element = soup.find("h4", class_="fusion-tb-text")
        if name_element:
            return name_element.get_text(strip=True)

        # Fallback to any uppercase heading
        for tag in ["h4", "h5", "h6"]:
            headings = soup.find_all(tag)
            for heading in headings:
                text = heading.get_text(strip=True)
                if text and text.isupper() and len(text) > 2:
                    return text

        return None

    def _extract_hero_image(self, soup: BeautifulSoup) -> str | None:
        """Extract the first 600x600 image as hero image."""
        # Look for fusion-tb-images-container first
        container = soup.find("div", class_="fusion-tb-images-container")
        if container:
            img = container.find("img")
            if img and img.get("src"):
                return img["src"]

        # Fallback to any 600x600 image
        all_images = soup.find_all("img", src=True)
        for img in all_images:
            src = img["src"]
            if "600x600" in src:
                return src

        return None

    def _extract_properties(self, soup: BeautifulSoup) -> dict[str, Any]:
        """Extract properties from bullet point div elements."""

        properties = {}

        # PRIMARY METHOD: Look for bullet-point properties in div content
        # Website uses <div dir="auto">• Property: Value</div> format
        bullet_divs = soup.find_all("div", attrs={"dir": "auto"})

        for div in bullet_divs:
            text = div.get_text()

            # Skip if not a bullet point
            if "•" not in text:
                continue

            # Split by bullet points in case multiple are in one div
            lines = text.split("•")
            for line in lines:
                line = line.strip()
                if not line or ":" not in line:
                    continue

                # Parse bullet point format: Property: Value
                key, value = line.split(":", 1)
                key = key.strip().lower()
                value = value.strip()

                # Map keys to standardized property names and clean values
                if key == "born":
                    # Clean and truncate born field to prevent database errors
                    cleaned_born = self._clean_age_field(value)
                    properties["born"] = cleaned_born
                elif key == "sex":
                    properties["sex"] = value
                elif key == "size":
                    properties["size"] = value
                elif key == "breed":
                    properties["breed"] = value
                elif key == "personality":
                    properties["personality"] = value
                elif key == "good with":
                    # For good_with, extract ONLY the compatibility part
                    # Remove any description text that might be mixed in
                    good_with_clean = self._clean_good_with_value(value)
                    properties["good_with"] = good_with_clean
                elif key == "weight":
                    properties["weight"] = value
                elif key == "location":
                    properties["location"] = value
                elif key == "future size":
                    properties["future_size"] = value

        # FALLBACK METHOD: Try standard <li> format as well (merge with existing properties)
        list_items = soup.find_all("li")
        for item in list_items:
            # Get only the direct text, not nested elements
            text = ""
            for content in item.contents:
                if isinstance(content, str):
                    text += content
                elif hasattr(content, "name") and content.name in [
                    "span",
                    "strong",
                    "b",
                ]:
                    text += content.get_text(strip=True)
                # Stop at any block-level element that might contain description
                elif hasattr(content, "name") and content.name in ["p", "div", "br"]:
                    break

            text = text.strip()
            if not text or ":" not in text:
                continue

            # Parse colon-separated format
            key, value = text.split(":", 1)
            key = key.strip().lower()
            value = value.strip()

            # Map keys similar to bullet point method
            if key == "born":
                properties["born"] = value
            elif key == "sex":
                properties["sex"] = value
            elif key == "size":
                properties["size"] = value
            elif key == "future size":
                properties["future_size"] = value
            elif key == "breed":
                properties["breed"] = value
            elif key == "personality":
                properties["personality"] = value
            elif key == "good with":
                good_with_clean = self._clean_good_with_value(value)
                properties["good_with"] = good_with_clean
            elif key == "weight":
                properties["weight"] = value
            elif key == "location":
                properties["location"] = value

        # THIRD FALLBACK: Thor's format <li class="h7">Born <span>October 2021</span></li>
        # Run this to supplement properties even if we already have some
        h7_items = soup.find_all("li", class_="h7")
        for item in h7_items:
            label_text = item.get_text(strip=True)
            span = item.find("span")
            if span:
                value = span.get_text(strip=True)
                key = label_text.replace(value, "").strip().lower()

                # Only add if we don't already have this property
                if key == "born" and "born" not in properties:
                    properties["born"] = value
                elif key == "weight" and "weight" not in properties:
                    properties["weight"] = value
                elif key == "location" and "location" not in properties:
                    properties["location"] = value
                elif key == "sex" and "sex" not in properties:
                    properties["sex"] = value
                elif key == "size" and "size" not in properties:
                    properties["size"] = value
                elif key == "breed" and "breed" not in properties:
                    properties["breed"] = value

        return properties

    def _clean_good_with_value(self, value: str) -> str:
        """Clean good_with value to extract only compatibility information."""

        if not value:
            return value

        # Common patterns to separate good_with from description
        separators = [
            "Hi ",
            "Hello ",
            "My name",
            "I am",
            "I'm",
            "Let me",
            "She is",
            "He is",
            "This is",
            "Meet ",
            "A lovely",
        ]

        # Try to split on description starters
        for separator in separators:
            if separator in value:
                good_with_part = value.split(separator, 1)[0].strip().rstrip(".")
                if good_with_part:
                    return good_with_part

        # If no separator found, look for sentence boundaries
        # Good_with typically ends after listing animals/people
        sentences = re.split(r"[.!?]\s+", value)
        if sentences:
            first_sentence = sentences[0].strip()
            # If first sentence is reasonable length for good_with, use it
            if len(first_sentence) < 100:
                return first_sentence

        # Fallback: return first 80 characters if value is too long
        if len(value) > 80:
            # Find a good breaking point (comma, space after "and", etc.)
            truncate_at = 80
            for i, char in enumerate(value[:80][::-1], 1):  # Search backwards
                if char in [",", " "] and value[80 - i : 80 - i + 4] != " and":
                    truncate_at = 80 - i
                    break
            return value[:truncate_at].strip().rstrip(",")

        return value

    def _clean_age_field(self, value: str) -> str:
        """Clean age/born field to extract only age information and stay within database limits."""
        if not value:
            return value

        # Age/born field should be short and focused
        # Remove common descriptive text that gets mixed into age fields
        value = value.strip()

        # If the value contains descriptive text starters, extract only the age part
        descriptive_starters = [
            "Hi ",
            "Hello ",
            "My name",
            "I am",
            "I'm",
            "Let me",
            "She is",
            "He is",
            "This is",
            "Meet ",
            "A lovely",
            "This beautiful",
            "This gorgeous",
            "This sweet",
        ]

        for starter in descriptive_starters:
            if starter in value:
                # Take only the part before the description starts
                age_part = value.split(starter, 1)[0].strip().rstrip(".")
                if age_part:
                    value = age_part
                break

        # Ensure age field stays within database limit (100 characters for age_text)
        # Good age values should be much shorter anyway
        if len(value) > 90:  # Leave some buffer
            # Find a good truncation point
            truncate_at = 90
            for i in range(90, max(0, 90 - 20), -1):  # Look back up to 20 chars
                if value[i] in [" ", ",", ".", "-"]:
                    truncate_at = i
                    break
            value = value[:truncate_at].strip().rstrip(".,")

        return value

    def _extract_clean_description(self, soup: BeautifulSoup) -> str:
        """Extract and clean description text, separate from properties."""
        description_parts = []

        # Method 1: Look for description in paragraph elements that are NOT bullet points
        paragraphs = soup.find_all("p")
        for p in paragraphs:
            text = p.get_text(strip=True)
            if text:
                # Skip if this looks like property data (starts with bullet or contains colon patterns)
                if text.startswith("•") or self._looks_like_property_data(text):
                    continue

                # Clean the text and add to description
                cleaned = self._clean_description_text(text)
                if cleaned:
                    description_parts.append(cleaned)

        # Method 2: Look for description in div elements that come after bullet points
        bullet_divs = soup.find_all("div", attrs={"dir": "auto"})
        bullet_div_container = None

        # Find the container that holds bullet points
        for div in bullet_divs:
            if div.get_text(strip=True).startswith("•"):
                bullet_div_container = div.find_parent()
                break

        if bullet_div_container:
            # Look for description paragraphs after the bullet point container
            next_elements = bullet_div_container.find_next_siblings()
            for element in next_elements:
                if element.name in ["p", "div"]:
                    text = element.get_text(strip=True)
                    if text and not text.startswith("•") and not self._looks_like_property_data(text):
                        cleaned = self._clean_description_text(text)
                        if cleaned:
                            description_parts.append(cleaned)

        # Join all description parts
        full_description = "\n\n".join(description_parts)

        # Final cleanup to remove any remaining contact sections
        if "Foster/Adoption FORM" in full_description:
            full_description = full_description.split("Foster/Adoption FORM")[0]

        if "Full RBU" in full_description:
            full_description = full_description.split("Full RBU")[0]

        return full_description.strip()

    def _looks_like_property_data(self, text: str) -> bool:
        """Check if text looks like property data rather than description."""
        if not text:
            return False

        # Check for property-like patterns
        property_indicators = [
            ":",
            "Born",
            "Sex",
            "Size",
            "Breed",
            "Good with",
            "Weight",
            "Location",
        ]  # Colon indicates key-value pair

        # If text is very short and contains property indicators, it's likely property data
        if len(text) < 50:
            for indicator in property_indicators:
                if indicator in text:
                    return True

        # If text starts with common property labels
        text_lower = text.lower()
        if any(
            text_lower.startswith(label.lower())
            for label in [
                "born",
                "sex",
                "size",
                "breed",
                "good with",
                "weight",
                "location",
            ]
        ):
            return True

        return False

    def _clean_description_text(self, text: str) -> str:
        """Remove contact info, emojis, and administrative text from description."""

        # Define unwanted content patterns in a more maintainable way
        EMOJI_PATTERNS = [
            r"[👉📝🇮🇹🇬🇧🇩🇪💕🐾📸💙🩷❤🎉🙏✨🌟🔥💯🎁🏠🐕🐈]",  # Common emojis
        ]

        CONTACT_PATTERNS = [
            r".*WhatsApp.*",
            r".*@furryrescue.*",
            r".*https://forms\.gle.*",
        ]

        ADMIN_PATTERNS = [
            r".*Follow & Support.*",
            r".*Full RBU.*",
            r".*adoption fees.*",
            r".*home check.*",
            r".*Foster/Adoption FORM.*",
            r".*© \d+ Furry Rescue Italy.*",  # Copyright footer
            r".*Design by.*",  # Design credits
            r".*All rights reserved.*",  # Rights notice
        ]

        result = text

        # Remove contact and admin patterns (whole lines)
        for pattern in CONTACT_PATTERNS + ADMIN_PATTERNS:
            # Remove entire lines containing these patterns
            result = re.sub(f".*{pattern}.*\n?", "", result, flags=re.IGNORECASE | re.MULTILINE)

        # Remove lines that start with emojis (likely footer/contact lines)
        result = re.sub(r"^[👉📝🇮🇹🇬🇧🇩🇪💕🐾📸💙🩷❤]+.*$", "", result, flags=re.MULTILINE)

        # For lines with emojis in the middle, remove everything from the emoji onward
        result = re.sub(r"[👉📝🇮🇹🇬🇧🇩🇪💕🐾📸💙🩷❤].*$", "", result, flags=re.MULTILINE)

        # Remove any remaining emojis
        for pattern in EMOJI_PATTERNS:
            result = re.sub(pattern, "", result)

        # Clean up extra whitespace
        result = re.sub(r"\n{3,}", "\n\n", result)  # Max 2 newlines
        result = re.sub(r"[ \t]+", " ", result)  # Single spaces
        result = re.sub(r"^\s+|\s+$", "", result, flags=re.MULTILINE)  # Trim lines

        return result.strip()

    def _extract_weight_from_size(self, size_text: str) -> str | None:
        """Extract weight information from size text."""

        # Look for patterns like "20-25 kg", "28 kgs", "10kg"
        patterns = [
            r"(\d+[-–]\d+\s*kg[s]?)",  # Range like 20-25 kg
            r"(\d+\s*kg[s]?)",  # Single value like 28 kgs
            r"(\d+kg)",  # No space like 10kg
        ]

        for pattern in patterns:
            match = re.search(pattern, size_text, re.IGNORECASE)
            if match:
                return match.group(1)

        return None

    def collect_data(self) -> list[dict[str, Any]]:
        """Collect all animal data from the website.

        This is the main method called by BaseScraper.run().
        Gets listing data and enriches with detail page information.

        Returns:
            List of animal dictionaries with all available data
        """
        self.logger.info("collect_data: Starting data collection")

        # Get all animals from listing pages
        self.logger.info("collect_data: Calling get_animal_list()")
        animals = self.get_animal_list()
        self.logger.info(f"collect_data: get_animal_list() returned {len(animals)} animals")

        if not animals:
            self.logger.warning("No animals found to process")
            return []

        # Apply filtering if configured
        # Uses self.filtering_service.filter_existing_animals() which records ALL external_ids
        # BEFORE filtering to ensure mark_skipped_animals_as_seen() works correctly
        if self.skip_existing_animals:
            animals = self.filtering_service.filter_existing_animals(animals)
            self._sync_filtering_stats()
        else:
            self.total_animals_before_filter = len(animals)
            self.total_animals_skipped = 0

        # For small sites (<=10 animals), process sequentially
        # For larger sites, use simple parallel processing
        if len(animals) <= 10:
            enriched_animals = self._process_animals_sequentially(animals)
        else:
            enriched_animals = self._process_animals_parallel(animals)

        self.logger.info(f"Successfully enriched {len(enriched_animals)} animals with detail data")

        return enriched_animals

    def _process_animals_sequentially(self, animals: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Process animals sequentially - best for small datasets."""
        enriched_animals = []

        for i, animal in enumerate(animals, 1):
            try:
                self.logger.info(f"Processing {i}/{len(animals)}: {animal.get('name', 'Unknown')}")

                # Scrape detail page
                if "adoption_url" in animal:
                    details = self.scrape_animal_details(animal["adoption_url"])

                    # Merge detail data with listing data
                    if details:
                        self._merge_animal_details(animal, details)

                # Validate required fields before adding
                if self._validate_animal_data(animal):
                    enriched_animals.append(animal)
                else:
                    self.logger.warning(f"Skipping animal {animal.get('name', 'Unknown')} due to missing required fields")

            except Exception as e:
                self.logger.error(f"Error processing animal {animal.get('name', 'Unknown')}: {e}")
                # Still add the animal with whatever data we have if it's valid
                if self._validate_animal_data(animal):
                    enriched_animals.append(animal)

        return enriched_animals

    def _process_animals_parallel(self, animals: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Process animals in parallel batches - for larger datasets."""
        import concurrent.futures
        from threading import Lock

        enriched_animals = []
        results_lock = Lock()

        # Use batch_size from config, default to 4 for this small site
        batch_size = min(self.batch_size, 4)  # Don't overdo it for 50 dogs

        self.logger.info(f"Processing {len(animals)} animals in parallel with batch_size={batch_size}")

        def process_single_animal(animal: dict[str, Any]) -> dict[str, Any]:
            """Process a single animal with detail enrichment."""
            try:
                # Rate limiting between requests
                time.sleep(self.rate_limit_delay)

                if "adoption_url" in animal:
                    details = self.scrape_animal_details(animal["adoption_url"])
                    if details:
                        self._merge_animal_details(animal, details)

                return animal
            except Exception as e:
                self.logger.error(f"Error processing {animal.get('name', 'Unknown')}: {e}")
                return animal

        # Process in parallel
        with concurrent.futures.ThreadPoolExecutor(max_workers=batch_size) as executor:
            future_to_animal = {executor.submit(process_single_animal, animal): animal for animal in animals}

            for future in concurrent.futures.as_completed(future_to_animal):
                try:
                    result = future.result()
                    if self._validate_animal_data(result):
                        with results_lock:
                            enriched_animals.append(result)
                    else:
                        self.logger.warning(f"Skipping animal {result.get('name', 'Unknown')} due to missing required fields")
                except Exception as e:
                    original_animal = future_to_animal[future]
                    self.logger.error(f"Failed to process {original_animal.get('name', 'Unknown')}: {e}")
                    # Add with original data if valid
                    if self._validate_animal_data(original_animal):
                        with results_lock:
                            enriched_animals.append(original_animal)

        return enriched_animals

    def _merge_animal_details(self, animal: dict[str, Any], details: dict[str, Any]) -> None:
        """Merge detail page data into animal dictionary."""
        # Update name if found on detail page (convert from UPPERCASE to Title Case)
        if "name" in details and details["name"]:
            # Convert UPPERCASE names to Title Case
            name = details["name"]
            if name.isupper():
                name = name.title()
            animal["name"] = name

        # Add primary image
        if "primary_image_url" in details:
            animal["primary_image_url"] = details["primary_image_url"]
            # Also add to image_urls for R2 upload
            animal["image_urls"] = [details["primary_image_url"]]

        # Add properties (including description)
        if "properties" in details:
            # Preserve existing properties and add new ones
            if "properties" not in animal:
                animal["properties"] = {}
            animal["properties"].update(details["properties"])
        else:
            # Initialize properties if not present
            if "properties" not in animal:
                animal["properties"] = {}

        # CRITICAL FIX: Store description INSIDE properties, not at top level
        if "description" in details and details["description"]:
            # Store main description in properties
            animal["properties"]["description"] = details["description"]

            # If there's also a description from good_with extraction, merge them
            if "description" in animal["properties"] and animal["properties"]["description"] != details["description"]:
                # Merge if they're different
                existing_desc = animal["properties"]["description"]
                new_desc = details["description"]
                if new_desc not in existing_desc:
                    animal["properties"]["description"] = existing_desc + "\n\n" + new_desc

        # Prepare data for unified standardization
        # Extract key fields to match expected format
        props = animal["properties"]

        # Set breed at top level for standardization
        if "breed" in props:
            animal["breed"] = props["breed"]
        else:
            animal["breed"] = "Mixed Breed"

        # Set sex at top level
        if "sex" in props:
            sex_value = props["sex"].lower()
            if "female" in sex_value or sex_value == "f":
                animal["sex"] = "Female"
            elif "male" in sex_value or sex_value == "m":
                animal["sex"] = "Male"
            else:
                animal["sex"] = props["sex"]

        # Set size at top level - extract from weight info if needed
        if "size" in props:
            # Extract size category from "(20+ kg)" format
            size_value = props["size"].lower()
            if "tiny" in size_value or "very small" in size_value:
                animal["size"] = "Tiny"
            elif "small" in size_value and "medium" not in size_value:
                animal["size"] = "Small"
            elif "large" in size_value:
                animal["size"] = "Large"
            else:
                animal["size"] = "Medium"
        elif "future_size" in props:
            size_value = props["future_size"].lower()
            if "tiny" in size_value or "very small" in size_value:
                animal["size"] = "Tiny"
            elif "small" in size_value and "medium" not in size_value:
                animal["size"] = "Small"
            elif "large" in size_value:
                animal["size"] = "Large"
            else:
                animal["size"] = "Medium"

        # Set age at top level (renamed from age_text to age for unified standardization)
        if "born" in props:
            animal["age"] = props["born"]
        elif "age_category" in props:
            animal["age"] = props["age_category"]

        # Apply unified standardization
        animal = self.process_animal(animal)

        # Preserve good_with field processing
        if "good_with" in props:
            good_with_value = props["good_with"].lower()
            good_with_list = []

            if "dog" in good_with_value:
                good_with_list.append("dogs")
            if "cat" in good_with_value:
                good_with_list.append("cats")
            if "child" in good_with_value or "kid" in good_with_value:
                good_with_list.append("children")

            if good_with_list:
                props["good_with_list"] = good_with_list

        # Preserve location processing
        if "location" in props:
            location = props["location"].strip()
            if location.lower() in ["italy", "italia", "it"]:
                props["location_country"] = "IT"
            elif location.lower() in ["uk", "united kingdom", "england"]:
                props["location_country"] = "UK"

    def _validate_animal_data(self, animal: dict[str, Any]) -> bool:
        """Validate that animal has all required fields with non-null values."""
        required_fields = ["name", "animal_type", "status", "organization_id"]

        for field in required_fields:
            if field not in animal or animal[field] is None:
                self.logger.debug(f"Animal missing required field: {field}")
                return False

        # Ensure we have at least some data beyond required fields
        if "adoption_url" not in animal:
            self.logger.debug("Animal has no adoption URL")
            return False

        return True

    def _generate_external_id(self, name: str, adoption_url: str) -> str:
        """Generate unique external_id to prevent duplicate animals.

        Args:
            name: Animal name
            adoption_url: Animal's adoption page URL

        Returns:
            Unique external_id string
        """

        # Create name slug (lowercase, alphanumeric only)
        name_clean = re.sub(r"[^a-zA-Z0-9]", "", name.lower())

        # Extract URL slug if available
        url_slug = adoption_url.rstrip("/").split("/")[-1]
        url_clean = re.sub(r"[^a-zA-Z0-9]", "", url_slug.lower())

        # Combine organization prefix + name + url slug for uniqueness
        if url_clean and url_clean != name_clean:
            external_id = f"fri-{name_clean}-{url_clean}"
        else:
            external_id = f"fri-{name_clean}"

        return external_id[:100]  # Ensure it doesn't exceed database limits
