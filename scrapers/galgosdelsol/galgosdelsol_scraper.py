"""Scraper implementation for Galgos del Sol organization."""

import time
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

from scrapers.base_scraper import BaseScraper
from utils.standardization import (
    apply_standardization,
    normalize_breed_case,
    parse_age_text,
    standardize_age,
)


class GalgosDelSolScraper(BaseScraper):
    """Scraper for Galgos del Sol rescue organization.

    Galgos del Sol is a Spanish rescue organization focused on galgos and podencos.
    The scraper extracts available dogs from 4 listing pages and filters out reserved dogs.
    """

    def __init__(
        self,
        config_id: str = "galgosdelsol",
        metrics_collector=None,
        session_manager=None,
        database_service=None,
    ):
        """Initialize Galgos del Sol scraper.

        Args:
            config_id: Configuration ID for Galgos del Sol
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

        # Use config-driven base URL and organization name
        website_url = getattr(self.org_config.metadata, "website_url", "https://galgosdelsol.org")
        self.base_url = str(website_url).rstrip("/") if website_url else "https://galgosdelsol.org"
        
        # These are the specific scraping endpoints - keep as hardcoded scraping targets
        self.listing_urls = [
            "https://galgosdelsol.org/adoptables/galgos/",
            "https://galgosdelsol.org/adoptables/podencos/",
            "https://galgosdelsol.org/adoptables/pups-teens/",
            "https://galgosdelsol.org/adoptables/other-dogs/",
        ]
        self.organization_name = self.org_config.name

        # Initialize persistent session for efficiency
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "Mozilla/5.0 (compatible; RescueDogAggregator/1.0)"})

    def _get_filtered_animals(self) -> List[Dict[str, Any]]:
        """Get list of animals and apply skip_existing_animals filtering.

        Returns:
            List of filtered animals ready for detail scraping
        """
        # Get list of available dogs from all listing pages
        all_dogs_data = []
        seen_urls = set()  # Track URLs to prevent duplicates

        # Scrape each listing page to collect all animals
        for listing_url in self.listing_urls:
            try:
                # Respect rate limiting between requests
                time.sleep(self.rate_limit_delay)

                animals = self._scrape_listing_page(listing_url)

                for animal in animals:
                    adoption_url = animal["adoption_url"]

                    # Skip duplicates - some dogs appear on multiple pages
                    if adoption_url in seen_urls:
                        self.logger.debug(f"Skipping duplicate dog: {animal['name']} ({adoption_url})")
                        continue

                    seen_urls.add(adoption_url)
                    all_dogs_data.append(animal)

                self.logger.debug(f"Collected {len(animals)} animals from {listing_url}")

            except Exception as e:
                self.logger.error(f"Error collecting data from {listing_url}: {e}")
                continue

        if not all_dogs_data:
            self.logger.warning("No animals found to process")
            return []

        # Extract URLs and apply skip_existing_animals filtering
        all_urls = [animal["adoption_url"] for animal in all_dogs_data]

        # Set filtering stats before filtering
        self.set_filtering_stats(len(all_urls), 0)  # Initial stats

        # Apply skip_existing_animals filtering via BaseScraper
        if self.skip_existing_animals:
            filtered_urls = self._filter_existing_urls(all_urls)
            skipped_count = len(all_urls) - len(filtered_urls)

            # Update filtering stats
            self.set_filtering_stats(len(all_urls), skipped_count)

            # Create filtered animals list
            url_to_animal = {animal["adoption_url"]: animal for animal in all_dogs_data}
            filtered_animals = [url_to_animal[url] for url in filtered_urls if url in url_to_animal]

            self.logger.info(f"Skip existing animals enabled: {skipped_count} skipped, {len(filtered_animals)} to process")
            return filtered_animals
        else:
            self.logger.info(f"Processing all {len(all_dogs_data)} animals")
            return all_dogs_data

    def _process_animals_in_batches(self, animals: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process animals in batches respecting the configured batch_size.

        Args:
            animals: List of animals to process

        Returns:
            List of processed animals with detailed data
        """
        all_processed_data = []

        self.logger.info(f"Starting detail scraping for {len(animals)} animals using batch_size={self.batch_size}")

        # Split animals into batches based on batch_size
        batches = []
        for i in range(0, len(animals), self.batch_size):
            batch = animals[i : i + self.batch_size]
            batches.append(batch)

        self.logger.info(f"Split {len(animals)} animals into {len(batches)} batches of size {self.batch_size}")

        # Process each batch
        for batch_index, batch in enumerate(batches):
            try:
                self.logger.info(f"Processing batch {batch_index + 1}/{len(batches)}: {len(batch)} animals")

                for animal in batch:
                    try:
                        # Respect rate limiting between requests
                        time.sleep(self.rate_limit_delay)

                        # Scrape detail page if method exists
                        if hasattr(self, "_scrape_detail_page"):
                            detail_data = self._scrape_detail_page(animal["adoption_url"])
                            if detail_data:
                                animal.update(detail_data)

                        all_processed_data.append(animal)

                    except Exception as e:
                        self.logger.error(f"Error processing {animal.get('name', 'unknown')}: {e}")
                        # Continue with basic data even if detail scraping fails
                        all_processed_data.append(animal)
                        continue

                self.logger.info(f"Completed batch {batch_index + 1}/{len(batches)}: {len(batch)} animals processed")

            except Exception as e:
                self.logger.error(f"Error in batch {batch_index + 1}: {e}")
                # Add the batch animals with basic data to avoid losing them
                all_processed_data.extend(batch)
                continue

        return all_processed_data

    def collect_data(self) -> List[Dict[str, Any]]:
        """Collect all available dog data from all listing pages.

        This method implements the BaseScraper template method pattern.
        It uses the modern _get_filtered_animals() method to apply skip_existing_animals
        filtering, then enriches each animal with detailed data from detail pages.

        Returns:
            List of dog data dictionaries for database storage
        """
        try:
            # Phase 1: Get and filter animals using modern pattern
            animals = self._get_filtered_animals()
            if not animals:
                return []

            # Phase 2: Process animals in batches with detail data
            all_dogs_data = self._process_animals_in_batches(animals)

            self.logger.info(f"Total unique dogs collected: {len(all_dogs_data)}")
            return all_dogs_data

        except Exception as e:
            self.logger.error(f"Error collecting data from Galgos del Sol: {e}")
            return []

    def _scrape_detail_page(self, url: str) -> Dict[str, Any]:
        """Scrape detailed information from a dog's detail page.

        Args:
            url: URL of the detail page to scrape

        Returns:
            Dictionary with detailed dog information, or empty dict if reserved/error
        """
        return self.scrape_animal_details(url)

    def scrape_animal_details(self, url: str) -> Dict[str, Any]:
        """Scrape detailed information from a dog's detail page.

        Extracts all available information from the dog detail page including
        name, breed, description, age, sex, and hero image. Returns raw data
        without normalization as requested.

        Args:
            url: URL of the detail page to scrape

        Returns:
            Dictionary with detailed dog information, or empty dict if reserved/error
        """
        try:
            self.logger.debug(f"Scraping detail page: {url}")

            # Fetch the detail page using persistent session
            response = self.session.get(url, timeout=30)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, "html.parser")

            # Extract name from h2 heading
            name = self._extract_name(soup)
            if not name:
                self.logger.warning(f"Could not extract name from {url}")
                return {}

            # Check if dog is reserved (based on name or page content)
            if self._is_reserved_dog(soup, name):
                self.logger.debug(f"Skipping reserved dog: {name}")
                return {}

            # Extract basic information
            external_id = self._extract_external_id(url)

            # Extract properties from the detail page
            properties = self._extract_properties(soup)

            # Extract description
            description = self._extract_description(soup)

            # Extract hero image
            hero_image_url = self._extract_hero_image(soup)

            # Session 4 compliance: Include description in properties for Spanish organizations
            if description:
                properties["description"] = description

            # Build result dictionary with raw data (no normalization)
            result = {
                "name": name,
                "external_id": external_id,
                "adoption_url": url,
                "primary_image_url": hero_image_url,
                "original_image_url": hero_image_url,  # Same as primary for this site
                "animal_type": "dog",
                "status": "available",
                "properties": properties,
                "description": description,
            }

            # Add image_urls for R2 integration through BaseScraper template method
            if hero_image_url:
                result["image_urls"] = [hero_image_url]
            else:
                result["image_urls"] = []

            # Extract individual fields from properties for compatibility with zero NULLs compliance
            if properties:
                if "breed" in properties:
                    result["breed"] = properties["breed"] or "Mixed Breed"
                if "sex" in properties:
                    result["sex"] = properties["sex"] or "Unknown"
                if "age_text" in properties:
                    result["age_text"] = properties["age_text"] or "Unknown"

            # Ensure zero NULLs compliance - set proper defaults for missing fields
            if "breed" not in result:
                result["breed"] = "Mixed Breed"
            if "sex" not in result:
                result["sex"] = "Unknown"
            if "age_text" not in result:
                result["age_text"] = "Unknown"

            # Use BaseScraper fallback for size (not available on this site)
            result["size"] = "Medium"  # Default fallback as requested

            self.logger.debug(f"Successfully extracted data for {name}")
            return result

        except Exception as e:
            self.logger.error(f"Error scraping detail page {url}: {e}")
            return {}

    def _extract_name(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract dog name from detail page.

        Args:
            soup: BeautifulSoup object of the detail page

        Returns:
            Clean dog name or None if not found
        """
        # Look for h2 heading with the dog name
        heading = soup.find("h2")
        if heading:
            name = heading.get_text(strip=True)
            if name:
                return self._clean_dog_name(name)

        # Fallback: look in page title
        title_tag = soup.find("title")
        if title_tag:
            title_text = title_tag.get_text(strip=True)
            # Extract name from title like "APOLLO - Galgos del Sol"
            if " - " in title_text:
                name_part = title_text.split(" - ")[0].strip()
                if name_part:
                    return self._clean_dog_name(name_part)

        return None

    def _clean_dog_name(self, name: str) -> str:
        """Clean dog name by removing location data and normalizing case.

        Args:
            name: Raw dog name from the website

        Returns:
            Clean dog name in Title Case
        """
        if not name:
            return name

        # Strip whitespace
        name = name.strip()

        # Remove location data like "/ FINLAND", "/ CANADA", "IN UK", etc.
        import re

        # Handle "/" pattern: "BUTTON / FINLAND" -> "BUTTON"
        if "/" in name:
            name_parts = name.split("/")
            name = name_parts[0].strip()

        # Handle " IN " pattern: "NELA IN UK" -> "NELA"
        # Pattern: word boundaries around " IN " followed by country/location
        name = re.sub(r"\b IN \b[A-Z\s]+$", "", name, flags=re.IGNORECASE).strip()

        # Handle " - " pattern: "DOG - LOCATION" -> "DOG"
        if " - " in name:
            name_parts = name.split(" - ")
            name = name_parts[0].strip()

        # Convert to Title Case (handles ALL CAPS names)
        name = name.title()

        # Fix common title case issues with abbreviations and roman numerals
        # Convert "Ii" -> "II", "Iii" -> "III", etc.
        import re

        name = re.sub(r"\bIi\b", "II", name)
        name = re.sub(r"\bIii\b", "III", name)
        name = re.sub(r"\bIv\b", "IV", name)

        return name

    def _clean_breed(self, breed: str) -> str:
        """Clean breed by converting invalid categories to 'Mixed Breed'.

        Args:
            breed: Raw breed from the website

        Returns:
            Clean breed name or 'Mixed Breed' for age categories
        """
        if not breed:
            return "Mixed Breed"

        breed = breed.strip()

        # Convert age categories to Mixed Breed
        age_categories = [
            "puppy/teen",
            "puppy",
            "teen",
            "teenager",
            "young",
            "senior",
            "adult",
            "juvenile",
            "baby",
            "old",
        ]

        # Convert generic/unknown categories to Mixed Breed
        generic_categories = ["other dog", "other", "mixed", "unknown dog", "dog", "mutt"]

        breed_lower = breed.lower()

        if breed_lower in age_categories or breed_lower in generic_categories:
            return "Mixed Breed"

        # Keep legitimate breeds (Galgo, Podenco, etc.)
        return breed

    def _is_reserved_dog(self, soup: BeautifulSoup, name: str) -> bool:
        """Check if dog is reserved based on page content.

        Args:
            soup: BeautifulSoup object of the detail page
            name: Dog name extracted from page

        Returns:
            True if dog is reserved, False otherwise
        """
        # Check name for "Reserved" prefix
        if name and "reserved" in name.lower():
            return True

        # Check page content for reserved indicators - be more specific to avoid false positives
        page_text = soup.get_text().lower()

        # Only check for explicit reserved status, not words that might appear in descriptions
        reserved_indicators = [
            "dog is reserved",
            "currently reserved",
            "reserved for adoption",
            "adoption pending",
            "not available for adoption",
            "no longer available",
        ]

        for indicator in reserved_indicators:
            if indicator in page_text:
                return True

        return False

    def _extract_properties(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """Extract properties from detail page.

        Args:
            soup: BeautifulSoup object of the detail page

        Returns:
            Dictionary with extracted properties
        """
        properties: Dict[str, Any] = {}

        # Find the main content area with dog information
        main_content = soup.find("article") or soup.find("main")
        if not main_content:
            return properties

        # Extract structured data from the property section
        # Look for strong tags followed by text (Gender:, Breed:, etc.)
        if hasattr(main_content, "find_all"):
            strong_tags = main_content.find_all("strong")
        else:
            strong_tags = soup.find_all("strong")

        for strong_tag in strong_tags:
            try:
                key = strong_tag.get_text(strip=True)

                # Get the text that follows the strong tag
                value = ""

                # Special handling for breed - look for specific structures
                if key.rstrip(":").lower().strip() == "breed":
                    # Look for breed-list span or similar structure (original pattern)
                    breed_span = strong_tag.parent.find("span", class_="breed-list")
                    if breed_span:
                        inner_span = breed_span.find("span")
                        if inner_span:
                            value = inner_span.get_text(strip=True)

                    # Fallback 1: look for any span after the strong tag
                    if not value:
                        next_element = strong_tag.find_next_sibling()
                        if next_element and next_element.name == "span":
                            # Check if this span contains nested spans (breed structure)
                            nested_span = next_element.find("span")
                            if nested_span:
                                value = nested_span.get_text(strip=True)
                            else:
                                value = next_element.get_text(strip=True)

                    # Fallback 2: look for any element (div, span, etc.) after strong tag
                    if not value:
                        next_element = strong_tag.find_next_sibling()
                        if next_element and next_element.name in ["div", "span", "p"]:
                            value = next_element.get_text(strip=True)
                            # Clean up - stop at line breaks for breed field
                            if "\n" in value:
                                value = value.split("\n")[0].strip()

                # Standard extraction for other fields if not already found
                if not value:
                    # Try to get the next sibling text
                    next_sibling = strong_tag.next_sibling
                    if next_sibling:
                        if hasattr(next_sibling, "get_text"):
                            value = next_sibling.get_text(strip=True)
                        else:
                            value = str(next_sibling).strip()

                    # If still no value, look for the next element after the strong tag
                    if not value:
                        next_element = strong_tag.find_next_sibling()
                        if next_element:
                            # For breed, be very specific to avoid contamination
                            if key.rstrip(":").lower().strip() == "breed":
                                # Only take the immediate text content, not descendants
                                value = next_element.get_text(strip=True)
                                # Stop at the first line break or next strong element
                                if "\n" in value:
                                    value = value.split("\n")[0].strip()
                            else:
                                value = next_element.get_text(strip=True)

                # Clean up the key and store the property
                if key and value:
                    key_clean = key.rstrip(":").lower().strip()

                    # Standardize key names with zero NULLs compliance
                    if key_clean == "gender":
                        properties["sex"] = value or "Unknown"
                    elif key_clean == "breed":
                        cleaned_breed = self._clean_breed(value) if value else "Mixed Breed"
                        properties["breed"] = cleaned_breed
                    elif key_clean == "date of birth":
                        properties["date_of_birth"] = value
                        # Calculate age text from birth date using standardization utils
                        age_text = self._calculate_age_from_birth_date(value)
                        if age_text:
                            properties["age_text"] = age_text
                            # Use standardize_age to get structured age data
                            age_info = standardize_age(age_text)
                            if age_info.get("age_category"):
                                properties["age_category"] = age_info["age_category"]
                                properties["age_min_months"] = age_info["age_min_months"]
                                properties["age_max_months"] = age_info["age_max_months"]
                    elif key_clean == "date of arrival":
                        properties["date_of_arrival"] = value
                    else:
                        # Store other properties with original key
                        properties[key_clean] = value

            except Exception as e:
                self.logger.debug(f"Error extracting property from strong tag: {e}")
                continue

        return properties

    def _extract_description(self, soup: BeautifulSoup) -> str:
        """Extract description text from detail page.

        Args:
            soup: BeautifulSoup object of the detail page

        Returns:
            Description text or empty string if not found
        """
        # Find the main content area
        main_content = soup.find("article") or soup.find("main")
        if not main_content:
            return ""

        # Look for paragraph tags that contain the description
        if hasattr(main_content, "find_all"):
            paragraphs = main_content.find_all("p")
        else:
            paragraphs = soup.find_all("p")

        # Filter and score paragraphs
        valid_paragraphs = []

        for paragraph in paragraphs:
            text = paragraph.get_text(strip=True)

            # Skip empty paragraphs
            if not text:
                continue

            # Skip paragraphs that contain structured data (breed, gender, etc.)
            if any(keyword in text.lower() for keyword in ["gender:", "breed:", "date of birth:", "date of arrival:"]):
                continue

            # Skip paragraphs that start with status updates or announcements
            text_lower = text.lower()
            if any(text_lower.startswith(prefix) for prefix in ["update:", "urgent:", "reserved:", "adopted:"]):
                continue

            # This looks like a valid description paragraph
            valid_paragraphs.append(text)

        if not valid_paragraphs:
            return ""

        # Prefer longer paragraphs - they're more likely to be the main description
        # Sort by length (descending) and return the longest
        valid_paragraphs.sort(key=len, reverse=True)
        return valid_paragraphs[0]

    def _extract_hero_image(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract hero image URL from detail page.

        Args:
            soup: BeautifulSoup object of the detail page

        Returns:
            Hero image URL or None if not found
        """
        # Look for images in the main content area
        main_content = soup.find("article") or soup.find("main")
        if not main_content:
            return None

        # Try to find the main figure or image
        figure = main_content.find("figure") if hasattr(main_content, "find") else None
        if figure:
            img = figure.find("img")
            if img:
                # First check for srcset (responsive images)
                srcset = img.get("srcset")
                if srcset:
                    # Extract the first URL from srcset (format: "url1 width1, url2 width2, ...")
                    first_url = srcset.split(",")[0].strip().split()[0]
                    return self._clean_image_url(first_url)

                # Fallback to src attribute
                src = img.get("src")
                if src:
                    return self._clean_image_url(src)

        # Fallback: look for any img tag in the main content
        img = main_content.find("img") if hasattr(main_content, "find") else None
        if img:
            # First check for srcset (responsive images)
            srcset = img.get("srcset")
            if srcset:
                # Extract the first URL from srcset (format: "url1 width1, url2 width2, ...")
                first_url = srcset.split(",")[0].strip().split()[0]
                return self._clean_image_url(first_url)

            # Fallback to src attribute
            src = img.get("src")
            if src:
                return self._clean_image_url(src)

        return None

    def _clean_image_url(self, url: str) -> str:
        """Clean and normalize image URL with security validation.

        Args:
            url: Raw image URL

        Returns:
            Cleaned absolute URL, or empty string if dangerous
        """
        if not url:
            return url

        # Security validation - block dangerous protocols
        url_lower = url.lower().strip()
        dangerous_protocols = ["javascript:", "data:", "file:", "ftp:"]
        for protocol in dangerous_protocols:
            if url_lower.startswith(protocol):
                self.logger.warning(f"Blocked potentially dangerous URL protocol: {protocol}")
                return ""

        # Handle protocol-relative URLs
        if url.startswith("//"):
            url = "https:" + url
        elif url.startswith("/"):
            # Relative URL - make it absolute
            url = urljoin(self.base_url, url)

        return url

    def _calculate_age_from_birth_date(self, birth_date_str: str) -> Optional[str]:
        """Calculate age text from birth date string with robust validation.

        Args:
            birth_date_str: Birth date string like "June 15 2014"

        Returns:
            Age text like "10 years" or None if calculation fails
        """
        if not birth_date_str:
            return None

        try:
            import re
            from datetime import datetime

            # First try to parse as a proper date using multiple formats
            birth_date_str_clean = birth_date_str.strip()

            # List of common date formats to try
            date_formats = [
                "%B %d %Y",  # June 15 2014
                "%b %d %Y",  # Jun 15 2014
                "%d %B %Y",  # 15 June 2014
                "%d %b %Y",  # 15 Jun 2014
                "%Y-%m-%d",  # 2014-06-15
                "%m/%d/%Y",  # 9/02/2022
                "%m/%d/%y",  # 9/02/22
                "%d/%m/%Y",  # 02/09/2022
                "%d/%m/%y",  # 02/09/22
                "%B %Y",  # June 2014
                "%b %Y",  # Jun 2014
                "%Y",  # 2014
            ]

            birth_date = None
            for fmt in date_formats:
                try:
                    birth_date = datetime.strptime(birth_date_str_clean, fmt)
                    break
                except ValueError:
                    continue

            # If parsing failed, try extracting year only as fallback (only for year-only formats)
            if not birth_date:
                # Only use year fallback for strings that look like they should be just years
                # Don't use fallback for complex strings that failed full parsing

                # Check if string contains date separators or month names - if so, full parse should have worked
                has_date_indicators = any(
                    indicator in birth_date_str_clean.lower()
                    for indicator in [
                        "-",
                        "/",
                        "january",
                        "february",
                        "march",
                        "april",
                        "may",
                        "june",
                        "july",
                        "august",
                        "september",
                        "october",
                        "november",
                        "december",
                        "jan",
                        "feb",
                        "mar",
                        "apr",
                        "may",
                        "jun",
                        "jul",
                        "aug",
                        "sep",
                        "oct",
                        "nov",
                        "dec",
                    ]
                )

                if has_date_indicators:
                    # This looks like it should be a full date, don't fall back to year-only
                    return None

                # Only for simple strings that could be just years
                words = birth_date_str_clean.split()
                if len(words) == 1:  # Single word, likely just a year
                    year_match = re.search(r"\b(19|20)\d{2}\b", birth_date_str_clean)
                    if year_match:
                        year = int(year_match.group(0))
                        # Simple validation - year should be reasonable
                        current_year = datetime.now().year
                        if year <= current_year and year >= 1900:
                            birth_date = datetime(year, 1, 1)  # Use January 1st as fallback

                # If still no valid date, return None
                if not birth_date:
                    return None

            # Calculate age
            current_year = datetime.now().year
            birth_year = birth_date.year

            age_years = current_year - birth_year

            if age_years < 0:
                return None
            elif age_years == 0:
                return "Under 1 year"
            elif age_years == 1:
                return "1 year"
            else:
                return f"{age_years} years"

        except Exception as e:
            self.logger.debug(f"Error calculating age from birth date '{birth_date_str}': {e}")
            return None

    def _scrape_listing_page(self, url: str) -> List[Dict[str, Any]]:
        """Scrape a single listing page for available dogs.

        Args:
            url: URL of the listing page to scrape

        Returns:
            List of dictionaries containing animal data
        """
        try:
            # Fetch the listing page using persistent session
            response = self.session.get(url, timeout=30)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, "html.parser")

            # Find all dog links within the main content
            main_content = soup.find("main")
            if not main_content:
                self.logger.debug("No main content found")
                return []

            # Find all adoptable dog links using regular <a> tags
            # Check if main_content has find_all method (is a Tag or BeautifulSoup object)
            if hasattr(main_content, "find_all"):
                dog_links = main_content.find_all("a", href=lambda x: x and "/adoptable-dogs/" in x)
            else:
                dog_links = soup.find_all("a", href=lambda x: x and "/adoptable-dogs/" in x)

            self.logger.debug(f"Found {len(dog_links)} dog links")

            animals = []

            for link in dog_links:
                try:
                    # Extract name from link text
                    name = link.get_text(strip=True)
                    if not name:
                        self.logger.debug("No name found in link")
                        continue

                    # Clean name formatting
                    name = self._clean_dog_name(name)

                    self.logger.debug(f"Found dog name: {name}")

                    # Filter out reserved dogs
                    if not self._is_available_dog(name):
                        self.logger.debug(f"Filtering out reserved dog: {name}")
                        continue

                    # Extract URL
                    href = link.get("href")
                    if not href:
                        continue

                    # Handle both relative and absolute URLs
                    if href.startswith("http"):
                        adoption_url = href
                    else:
                        adoption_url = urljoin(self.base_url, href)

                    # Extract external ID from URL
                    external_id = self._extract_external_id(adoption_url)

                    # Create animal data structure
                    animal_data = {
                        "name": name,
                        "external_id": external_id,
                        "adoption_url": adoption_url,
                        "primary_image_url": None,  # Not extracted from listing page
                        "original_image_url": None,
                        "animal_type": "dog",
                        "status": "available",
                    }
                    animals.append(animal_data)
                    self.logger.debug(f"Added animal: {name}")

                except Exception as e:
                    self.logger.error(f"Error processing dog link: {e}")
                    continue

            self.logger.debug(f"Returning {len(animals)} animals")
            return animals

        except Exception as e:
            self.logger.error(f"Error scraping listing page {url}: {e}")
            return []

    def _is_available_dog(self, name: str) -> bool:
        """Check if a dog is available based on its name.

        Available dogs have no "Reserved" prefix. Dogs with "Reserved"
        in their name are not available.

        Args:
            name: Dog name from listing

        Returns:
            True if dog is available, False otherwise
        """
        if not name:
            return True

        # Check for reserved status - name starts with "Reserved" (case-insensitive)
        name_lower = name.lower()
        return not name_lower.startswith("reserved")

    def _extract_external_id(self, url: str) -> str:
        """Extract external ID from adoption URL.

        Args:
            url: Full adoption URL

        Returns:
            External ID extracted from URL path
        """
        # Extract the last part of the URL path, removing trailing slash
        return url.rstrip("/").split("/")[-1]
