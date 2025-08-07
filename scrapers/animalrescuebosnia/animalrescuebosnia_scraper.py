"""Animal Rescue Bosnia scraper implementation."""

import re
from typing import Any, Dict, List, Optional

import requests
from bs4 import BeautifulSoup

from scrapers.base_scraper import BaseScraper


class AnimalRescueBosniaScraper(BaseScraper):
    """Scraper for Animal Rescue Bosnia website."""

    def __init__(self, organization_id: Optional[int] = None, config_id: Optional[str] = None):
        """Initialize the scraper with config."""
        super().__init__(organization_id=organization_id, config_id=config_id)

        # Set base URLs
        self.base_url = "https://www.animal-rescue-bosnia.org"
        self.listing_url = f"{self.base_url}/our-dogs/"

    def get_animal_list(self) -> List[Dict[str, str]]:
        """Get list of available animals from listing page.

        Returns:
            List of dictionaries containing animal basic info:
            - name: Dog name
            - url: Full URL to detail page
            - thumbnail: URL to listing thumbnail image
        """
        try:
            # Fetch listing page
            response = requests.get(self.listing_url, timeout=self.timeout)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, "html.parser")

            # Find all headings to track sections
            all_elements = soup.find_all(["h1", "h2", "h3", "p", "img", "a"])

            animals = []
            in_bosnia_section = False
            current_dog = None

            for element in all_elements:
                # Check for section markers
                if hasattr(element, "name") and element.name in ["h1", "h2", "h3"]:
                    heading_text = element.get_text().strip()

                    # Check if we're entering Germany section
                    if "Germany" in heading_text and "waiting" in heading_text:
                        in_bosnia_section = False
                        current_dog = None
                        continue

                    # Check if we're entering Bosnia section
                    if "Bosnia" in heading_text and "waiting" in heading_text:
                        in_bosnia_section = True
                        current_dog = None
                        continue

                    # If we're in Bosnia section and this looks like a dog name
                    if in_bosnia_section and heading_text and len(heading_text) < 50:
                        # Check if it's not another section header
                        if not any(keyword in heading_text.lower() for keyword in ["waiting", "dogs", "our", "find"]):
                            # If we have a previous dog with required info, save it
                            if current_dog and current_dog["url"] and current_dog["name"]:
                                animals.append(current_dog)

                            # Start collecting new dog info
                            current_dog = {"name": heading_text, "url": None, "thumbnail": None}

                # If we have a current dog in Bosnia section, look for its details
                if current_dog and in_bosnia_section:
                    # Look for thumbnail image
                    if hasattr(element, "name") and element.name == "img" and not current_dog["thumbnail"]:
                        src = element.get("src", "") if hasattr(element, "get") else ""
                        if src and not src.startswith("data:"):
                            # Make absolute URL
                            if src.startswith("/"):
                                src = self.base_url + src
                            elif not src.startswith("http"):
                                src = self.base_url + "/" + src
                            current_dog["thumbnail"] = src

                    # Look for "More info" link
                    if hasattr(element, "name") and element.name == "a":
                        href = element.get("href", "") if hasattr(element, "get") else ""
                        link_text = element.get_text().strip().lower()

                        # Check if this is a detail page link
                        if href and ("more info" in link_text or "i am interested" in link_text or href.endswith(f"/{current_dog['name'].lower()}/")):
                            # Make absolute URL
                            if href.startswith("/"):
                                href = self.base_url + href
                            elif not href.startswith("http"):
                                href = self.base_url + "/" + href
                            current_dog["url"] = href

                            # Continue collecting info, don't reset yet
                            pass

            # Don't forget the last dog if we have one
            if current_dog and current_dog["url"] and current_dog["name"]:
                animals.append(current_dog)

            # World-class logging: Bosnia section stats handled by centralized system
            return animals

        except Exception as e:
            self.logger.error(f"Error fetching animal list: {e}")
            return []

    def scrape_animal_details(self, url: str) -> Optional[Dict[str, Any]]:
        """Scrape detailed information from a single animal page.

        Args:
            url: URL of the animal detail page

        Returns:
            Dictionary with animal data or None if dog is in Germany
        """
        try:
            # Fetch detail page
            response = requests.get(url, timeout=self.timeout)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, "html.parser")

            # Extract dog name
            h1 = soup.find("h1")
            if not h1:
                self.logger.warning(f"No h1 found on {url}")
                return None

            name = h1.get_text().strip()

            # Check if this is a non-dog page (organization description, etc.)
            if self._is_non_dog_page(name, soup):
                # World-class logging: Non-dog page detection handled by centralized system
                return None

            # Check if dog is in Germany - look for Germany indicators
            page_text = soup.get_text()
            if "We are already in Germany" in page_text or "Location: Germany" in page_text:
                # World-class logging: Location filtering handled by centralized system
                return None

            # Extract external ID from name
            external_id = name.lower().replace(" ", "-")

            # Extract hero image (first significant image, not in gallery)
            hero_image_url = None
            images = soup.find_all("img")

            # Look for first image that's not in a gallery
            for img in images:
                # Skip if image is inside a gallery div
                parent = img.parent
                while parent:
                    if hasattr(parent, "name") and parent.name == "div" and hasattr(parent, "get") and parent.get("class") and "gallery" in " ".join(parent.get("class") or []):
                        break
                    parent = parent.parent
                else:
                    # Not in gallery, use this image
                    src = img.get("src", "") if hasattr(img, "get") else ""
                    if src and isinstance(src, str) and not src.startswith("data:"):
                        if src.startswith("/"):
                            hero_image_url = self.base_url + src
                        elif not src.startswith("http"):
                            hero_image_url = self.base_url + "/" + src
                        else:
                            hero_image_url = src
                        break

            # Extract properties from Short description section
            properties = {}

            # Find Short description section
            short_desc_heading = None
            for heading in soup.find_all(["h2", "h3"]):
                if "Short description" in heading.get_text():
                    short_desc_heading = heading
                    break

            if short_desc_heading:
                # Look for the next sibling that contains the properties
                next_elem = short_desc_heading.find_next_sibling()
                if next_elem and hasattr(next_elem, "find_all"):
                    # Convert <br> tags to newlines before extracting text
                    for br in next_elem.find_all("br"):
                        br.replace_with("\n")

                    # Split by line breaks to handle each property separately
                    lines = next_elem.get_text().strip().split("\n")

                    # Process each line
                    for line in lines:
                        line = line.strip()
                        if ":" in line:
                            # Split on first colon
                            key, value = line.split(":", 1)
                            key = key.strip()
                            value = value.strip()

                            # Map to our property names
                            if key == "Breed":
                                properties["breed"] = value
                            elif key == "Gender":
                                properties["gender"] = value
                            elif key == "Date of birth":
                                properties["date_of_birth"] = value
                            elif key == "Height":
                                properties["height"] = value
                            elif key == "Weight":
                                properties["weight"] = value
                            elif key == "In a shelter from":
                                properties["shelter_entry"] = value

                    # Set None for missing fields
                    for field in [
                        "breed",
                        "gender",
                        "date_of_birth",
                        "height",
                        "weight",
                        "shelter_entry",
                    ]:
                        if field not in properties:
                            properties[field] = None

            # Extract description from About section
            description = None
            about_heading = None
            for heading in soup.find_all(["h2", "h3"]):
                if f"About {name}" in heading.get_text():
                    about_heading = heading
                    break

            if about_heading:
                # Get all text after the About heading until next heading
                desc_parts = []
                next_elem = about_heading.find_next_sibling()
                while next_elem and hasattr(next_elem, "name") and next_elem.name not in ["h1", "h2", "h3"]:
                    if hasattr(next_elem, "name") and next_elem.name == "p":
                        text = next_elem.get_text().strip()
                        if text:
                            desc_parts.append(text)
                    next_elem = next_elem.find_next_sibling()

                description = " ".join(desc_parts)

            # Build result dictionary with proper structure for BaseScraper
            result = {
                "name": name,
                "external_id": external_id,
                "adoption_url": url,
                "primary_image_url": hero_image_url,
                "original_image_url": hero_image_url,  # Same as primary for R2 comparison
                "animal_type": "dog",
                "status": "available",
                # Raw fields for standardization by BaseScraper
                "breed": properties.get("breed"),
                "age_text": self._calculate_age_text(properties.get("date_of_birth")),
                "sex": self._standardize_sex(properties.get("gender")),
                "size": self._extract_size_from_weight(properties.get("weight")),
                "standardized_size": self._standardize_size_for_database(self._extract_size_from_weight(properties.get("weight"))),
                # Properties for additional data storage
                "properties": {
                    **properties,
                    "description": description,  # Include description in properties
                    "raw_name": name,
                    "page_url": url,
                },
            }

            return result

        except Exception as e:
            self.logger.error(f"Error scraping animal details from {url}: {e}")
            return None

    def _calculate_age_text(self, date_of_birth: Optional[str]) -> Optional[str]:
        """Calculate age text from date of birth for standardization."""
        if not date_of_birth:
            return None

        try:
            # Parse date of birth like "January 2022"
            import re
            from datetime import datetime

            # Extract month and year
            match = re.search(r"(\w+)\s+(\d{4})", date_of_birth)
            if not match:
                return None

            month_name, year = match.groups()
            year = int(year)

            # Map month names
            month_map = {"january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6, "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12}

            month = month_map.get(month_name.lower())
            if not month:
                return None

            # Calculate age in years/months
            birth_date = datetime(year, month, 1)
            current_date = datetime.now()

            years = current_date.year - birth_date.year
            months = current_date.month - birth_date.month

            if months < 0:
                years -= 1
                months += 12

            total_months = years * 12 + months

            if total_months < 12:
                return f"{total_months} months"
            elif total_months < 24:
                return f"1 year {months} months" if months > 0 else "1 year"
            else:
                return f"{years} years {months} months" if months > 0 else f"{years} years"

        except Exception as e:
            self.logger.warning(f"Could not calculate age from '{date_of_birth}': {e}")
            return None

    def _standardize_sex(self, gender: Optional[str]) -> Optional[str]:
        """Standardize sex field from gender for frontend filters.

        Frontend expects "Male"/"Female" (not "M"/"F") for filters to work.
        """
        if not gender:
            return None

        gender_lower = gender.lower().strip()
        if gender_lower in ["male", "m"]:
            return "Male"
        elif gender_lower in ["female", "f"]:
            return "Female"
        else:
            return None

    def _extract_size_from_weight(self, weight: Optional[str]) -> Optional[str]:
        """Extract size category from weight."""
        if not weight:
            return None

        try:
            # Extract weight in kg
            import re

            match = re.search(r"(\d+(?:\.\d+)?)", weight)
            if not match:
                return None

            weight_kg = float(match.group(1))

            # Categorize by weight
            if weight_kg < 5:
                return "Tiny"
            elif weight_kg < 15:
                return "Small"
            elif weight_kg < 30:
                return "Medium"
            elif weight_kg < 45:
                return "Large"
            else:
                return "XLarge"

        except Exception as e:
            self.logger.warning(f"Could not extract size from weight '{weight}': {e}")
            return None

    def collect_data(self) -> List[Dict[str, Any]]:
        """Collect all animal data from Animal Rescue Bosnia.

        This method integrates with BaseScraper which handles:
        - Image upload to R2
        - Age/breed/size standardization
        - Database operations

        Features:
        - Parallel processing in batches (respects batch_size config)
        - Skip existing animals (respects skip_existing_animals config)
        - Rate limiting between batches

        Returns:
            List of dictionaries, each containing data for one animal
        """
        try:
            # Get list of animals in Bosnia
            animals_list = self.get_animal_list()
            # World-class logging: Animal list stats handled by centralized system

            # Extract URLs from animal list
            all_urls = [animal["url"] for animal in animals_list]

            # Filter existing URLs if skip is enabled
            if self.skip_existing_animals:
                urls_to_process = self._filter_existing_urls(all_urls)
                skipped_count = len(all_urls) - len(urls_to_process)

                # Track filtering stats for failure detection
                self.set_filtering_stats(len(all_urls), skipped_count)

                if len(urls_to_process) != len(all_urls):
                    # World-class logging: URL filtering stats handled by centralized system
                    pass
            else:
                urls_to_process = all_urls
                # No filtering applied
                self.set_filtering_stats(len(all_urls), 0)
                # World-class logging: Processing stats handled by centralized system

            # Process URLs in batches with parallel processing
            if urls_to_process:
                all_animals = self._process_dogs_in_batches(urls_to_process)
            else:
                all_animals = []

            # World-class logging: Collection results handled by centralized system
            return all_animals

        except Exception as e:
            self.logger.error(f"Error during data collection: {e}")
            return []

    def _process_dogs_in_batches(self, urls: List[str]) -> List[Dict[str, Any]]:
        """Process dog URLs in batches using parallel processing.

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

        # World-class logging: Batch processing handled by centralized system

        for batch_num, batch_urls in enumerate(batches, 1):
            # World-class logging: Batch progress handled by centralized system

            batch_results = self._process_single_batch(batch_urls)
            all_results.extend(batch_results)

            # Rate limiting between batches
            if batch_num < len(batches):
                self.logger.debug(f"Rate limiting for {self.rate_limit_delay}s between batches")
                self.respect_rate_limit()

        # World-class logging: Batch completion handled by centralized system
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
            future_to_url = {executor.submit(self._scrape_with_retry, self.scrape_animal_details, url): url for url in urls}

            # Collect results as they complete
            for future in as_completed(future_to_url):
                url = future_to_url[future]
                try:
                    result = future.result()
                    if result and self._validate_dog_data(result):
                        # Add organization_id for BaseScraper
                        result["organization_id"] = self.organization_id
                        results.append(result)
                        self.logger.debug(f"Successfully processed {result.get('name', 'unknown')} from {url}")
                    else:
                        self.logger.warning(f"Invalid or empty data for URL: {url}")
                except Exception as e:
                    self.logger.error(f"Error processing {url}: {e}")

        return results

    def _validate_dog_data(self, dog_data: Dict[str, Any]) -> bool:
        """Validate dog data has required fields.

        Args:
            dog_data: Dog data dictionary

        Returns:
            True if data is valid
        """
        if not dog_data:
            return False

        # Check required fields
        required_fields = ["name", "external_id", "adoption_url"]
        for field in required_fields:
            if field not in dog_data or not dog_data[field]:
                self.logger.warning(f"Missing required field '{field}' in dog data")
                return False

        return True

    def _is_non_dog_page(self, name: str, soup) -> bool:
        """Check if this page is not actually a dog page.

        Args:
            name: Extracted name from h1 tag
            soup: BeautifulSoup object of the page

        Returns:
            True if this appears to be a non-dog page (organization description, etc.)
        """
        if not name:
            return True

        # Check for very long names (likely organization descriptions)
        if len(name) > 50:
            self.logger.debug(f"Name too long ({len(name)} chars): {name[:50]}...")
            return True

        # Check for organization-related keywords
        name_lower = name.lower()
        org_keywords = ["animal rescue", "organisation", "organization", "rescue centre", "rescue center", "shelter", "charity", "foundation", "society"]

        for keyword in org_keywords:
            if keyword in name_lower:
                self.logger.debug(f"Organization keyword '{keyword}' found in name")
                return True

        # Check for dashes and organizational structure in name
        if "–" in name and ("rescue" in name_lower or "organisation" in name_lower):
            self.logger.debug(f"Organization structure detected in name: {name}")
            return True

        return False

    def _standardize_size_for_database(self, size: Optional[str]) -> Optional[str]:
        """Map size values to standardized_size for database storage.

        Args:
            size: Size value from scraper (Tiny, Small, Medium, Large, XLarge)

        Returns:
            Standardized size value for database
        """
        if not size:
            return None

        # Direct mapping - AnimalRescueBosnia uses standard size categories
        size_mapping = {"Tiny": "Tiny", "Small": "Small", "Medium": "Medium", "Large": "Large", "XLarge": "XLarge"}

        return size_mapping.get(size)
