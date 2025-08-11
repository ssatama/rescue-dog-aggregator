"""Scraper implementation for Santer Paws Bulgarian Rescue organization."""

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


class SanterPawsBulgarianRescueScraper(BaseScraper):
    """Scraper for Santer Paws Bulgarian Rescue organization.

    Santer Paws Bulgarian Rescue is a UK-registered charity rescuing dogs from Bulgaria.
    The scraper uses WP Grid Builder AJAX endpoint to fetch all available dogs efficiently.
    """

    def __init__(
        self,
        config_id: str = "santerpawsbulgarianrescue",
        metrics_collector=None,
        session_manager=None,
        database_service=None,
    ):
        """Initialize Santer Paws Bulgarian Rescue scraper.

        Args:
            config_id: Configuration ID for Santer Paws Bulgarian Rescue
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

        self.base_url = "https://santerpawsbulgarianrescue.com"
        self.listing_url = "https://santerpawsbulgarianrescue.com/adopt/"
        self.organization_name = "Santer Paws Bulgarian Rescue"

        # Log configuration values for debugging
        self.logger.info(
            f"Initialized with config: rate_limit_delay={self.rate_limit_delay}, "
            f"batch_size={self.batch_size}, skip_existing_animals={self.skip_existing_animals}, "
            f"max_retries={self.max_retries}, timeout={self.timeout}"
        )

    def _get_filtered_animals(self) -> List[Dict[str, Any]]:
        """Get list of animals and apply skip_existing_animals filtering.

        Returns:
            List of filtered animals ready for detail scraping
        """
        # Get list of available dogs from all listing pages
        animals = self.get_animal_list()

        if not animals:
            self.logger.warning("No animals found to process")
            return []

        # Extract URLs and apply skip_existing_animals filtering
        all_urls = [animal["adoption_url"] for animal in animals]

        # Apply skip_existing_animals filtering via BaseScraper
        if self.skip_existing_animals:
            filtered_urls = self._filter_existing_urls(all_urls)
            skipped_count = len(all_urls) - len(filtered_urls)

            # Set filtering stats with final counts
            self.set_filtering_stats(len(all_urls), skipped_count)

            # Create filtered animals list
            url_to_animal = {animal["adoption_url"]: animal for animal in animals}
            animals = [url_to_animal[url] for url in filtered_urls if url in url_to_animal]

            self.logger.info(f"Skip existing animals enabled: {skipped_count} skipped, {len(animals)} to process")
        else:
            # Set filtering stats for no filtering case
            self.set_filtering_stats(len(all_urls), 0)
            self.logger.info(f"Processing all {len(animals)} animals")

        if not animals:
            self.logger.info("All animals are existing - no new animals to process")

        return animals

    def _process_animals_parallel(self, animals: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process animals in parallel batches for efficient detail scraping.

        Uses ThreadPoolExecutor to process animals in batches based on batch_size config.
        Each batch runs concurrently to improve performance while respecting rate limits.

        Args:
            animals: List of animals to process

        Returns:
            List of processed animals with detailed data
        """
        all_dogs_data = []
        seen_urls = set()  # Track URLs to prevent duplicates

        # Single-threaded fallback for small batches or when batch_size=1
        if len(animals) <= self.batch_size or self.batch_size == 1:
            self.logger.info(f"Using single-threaded processing for {len(animals)} animals")

            for animal in animals:
                adoption_url = animal["adoption_url"]

                # Skip duplicates (shouldn't happen but safety check)
                if adoption_url in seen_urls:
                    self.logger.debug(f"Skipping duplicate dog: {animal['name']} ({adoption_url})")
                    continue
                seen_urls.add(adoption_url)

                # Rate limiting for respectful scraping
                time.sleep(self.rate_limit_delay)

                # Scrape detail page for additional information
                try:
                    detail_data = self._scrape_animal_details(adoption_url)
                    if detail_data:
                        animal.update(detail_data)
                except Exception as e:
                    self.logger.error(f"Error scraping details for {animal['name']}: {e}")
                    # Continue processing even if detail scraping fails

                all_dogs_data.append(animal)

            return all_dogs_data

        # Parallel processing for larger batches
        import concurrent.futures
        from threading import Lock

        self.logger.info(f"Starting parallel detail scraping for {len(animals)} animals using batch_size={self.batch_size}")

        # Thread-safe collections
        results_lock = Lock()

        def process_animal_batch(animal_batch):
            """Process a batch of animals in parallel"""
            batch_results = []

            try:
                for animal in animal_batch:
                    adoption_url = animal["adoption_url"]

                    # Skip duplicates (thread-safe check)
                    with results_lock:
                        if adoption_url in seen_urls:
                            self.logger.debug(f"Skipping duplicate dog: {animal['name']} ({adoption_url})")
                            continue
                        seen_urls.add(adoption_url)

                    # Rate limiting for respectful scraping
                    time.sleep(self.rate_limit_delay)

                    # Scrape detail page for additional information
                    try:
                        detail_data = self._scrape_animal_details(adoption_url)
                        if detail_data:
                            # Merge detail data with listing data (detail data takes precedence)
                            animal.update(detail_data)
                    except Exception as e:
                        # Log error but continue processing (animal will be added without detail data)
                        self.logger.error(f"Error scraping details for {animal.get('name', 'unknown')}: {e}")
                        # Continue processing - animal will be added with listing data only

                    batch_results.append(animal)

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
        # Limit concurrent threads to prevent overwhelming the target server
        max_workers = min(3, len(batches))  # Max 3 concurrent batches

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

    def collect_data(self) -> List[Dict[str, Any]]:
        """Collect all available dog data from the listing page.

        This method implements the BaseScraper template method pattern.
        It extracts dogs from the listing page, applies filtering based on
        skip_existing_animals, and then processes them in parallel batches
        for efficient detail scraping.

        Returns:
            List of dog data dictionaries for database storage
        """
        try:
            # Phase 1: Get and filter animals
            animals = self._get_filtered_animals()
            if not animals:
                return []

            # Phase 2: Process animals in parallel batches for detail scraping
            all_dogs_data = self._process_animals_parallel(animals)

            self.logger.info(f"Total unique dogs collected: {len(all_dogs_data)}")
            return all_dogs_data

        except Exception as e:
            self.logger.error(f"Error collecting data: {e}")
            return []

    def get_animal_list(self) -> List[Dict[str, Any]]:
        """Fetch list of available dogs using WP Grid Builder AJAX endpoint.

        Makes a POST request to the AJAX endpoint with availability filter
        to get all available dogs in a single request.

        Returns:
            List of dictionaries containing basic dog information
        """
        try:
            # Prepare AJAX request
            data = {
                "wpgb-ajax": "render",
                "_adoption_status_adopt": "available",  # Filter for available dogs only
            }

            headers = {
                "User-Agent": "Mozilla/5.0 (compatible; RescueDogAggregator/1.0)",
                "X-Requested-With": "XMLHttpRequest",
                "Content-Type": "application/x-www-form-urlencoded",
            }

            self.logger.debug(f"Fetching dogs from AJAX endpoint: {self.listing_url}")

            # Make POST request to AJAX endpoint
            response = requests.post(
                self.listing_url,
                data=data,
                headers=headers,
                timeout=30,
            )
            response.raise_for_status()

            # Parse HTML response
            soup = BeautifulSoup(response.text, "html.parser")

            # Find all dog cards
            dog_cards = soup.find_all("article", class_="bde-loop-item")
            self.logger.debug(f"Found {len(dog_cards)} dog cards")

            animals = []

            for card in dog_cards:
                try:
                    # Skip if not a Tag element
                    if not hasattr(card, "find"):
                        continue

                    # Find the link to the adoption page
                    link = card.find("a", href=lambda x: x and "/adoption/" in x)
                    if not link:
                        continue

                    # Extract URL
                    adoption_url = link.get("href")
                    if not adoption_url:
                        continue

                    # Make URL absolute if needed
                    if not adoption_url.startswith("http"):
                        adoption_url = urljoin(self.base_url, adoption_url)

                    # Extract name from URL
                    name = self._extract_dog_name_from_url(adoption_url)
                    if not name:
                        self.logger.warning(f"Could not extract name from URL: {adoption_url}")
                        continue

                    # Extract external ID from URL
                    external_id = self._extract_external_id(adoption_url)

                    # Create animal data structure
                    animal_data = {
                        "name": name,
                        "external_id": external_id,
                        "adoption_url": adoption_url,
                        "animal_type": "dog",
                        "status": "available",  # All dogs from this endpoint are available
                        "primary_image_url": None,  # Will be extracted in detail page (future)
                        "original_image_url": None,
                    }

                    animals.append(animal_data)
                    self.logger.debug(f"Added dog: {name} ({external_id})")

                except Exception as e:
                    self.logger.error(f"Error processing dog card: {e}")
                    continue

            self.logger.info(f"Successfully extracted {len(animals)} available dogs")
            return animals

        except requests.RequestException as e:
            self.logger.error(f"Network error fetching animal list: {e}")
            return []
        except Exception as e:
            self.logger.error(f"Error fetching animal list: {e}")
            return []

    def _extract_dog_name_from_url(self, url: str) -> str:
        """Extract and format dog name from adoption URL.

        Args:
            url: Adoption URL like /adoption/pepper/ or /adoption/summer-breeze/

        Returns:
            Formatted dog name in Title Case (e.g., "Pepper", "Summer Breeze")
        """
        try:
            # Extract the slug from URL
            # Remove trailing slash and get last segment
            slug = url.rstrip("/").split("/")[-1]

            # Convert slug to name: pepper -> Pepper, summer-breeze -> Summer Breeze
            name = slug.replace("-", " ").title()

            return name
        except Exception as e:
            self.logger.error(f"Error extracting name from URL {url}: {e}")
            return ""

    def _extract_external_id(self, url: str) -> str:
        """Extract external ID from adoption URL.

        Args:
            url: Full adoption URL

        Returns:
            External ID (the slug from the URL)
        """
        # Extract the last part of the URL path, removing trailing slash
        # This will be the slug: pepper, daisy, summer-breeze, etc.
        return url.rstrip("/").split("/")[-1]

    def _clean_dog_name(self, name: str) -> str:
        """Clean dog name by normalizing case and handling formatting.

        Args:
            name: Raw dog name from the website

        Returns:
            Clean dog name in Title Case
        """
        if not name:
            return name

        # Strip whitespace and convert to Title Case (handles ALL CAPS names)
        name = name.strip().title()

        # Fix common title case issues with abbreviations and roman numerals
        import re

        name = re.sub(r"\bIi\b", "II", name)
        name = re.sub(r"\bIii\b", "III", name)
        name = re.sub(r"\bIv\b", "IV", name)

        return name

    def _extract_properties(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """Extract properties from detail page Information section.

        Args:
            soup: BeautifulSoup object of the detail page

        Returns:
            Dictionary with extracted properties
        """
        properties: Dict[str, Any] = {}

        # Extract Information section structured data - use robust H2 text matching
        info_heading = None
        for h2 in soup.find_all("h2"):
            if h2.get_text(strip=True).lower() == "information":
                info_heading = h2
                break

        if info_heading:
            info_content = info_heading.find_next_sibling()
            if info_content and hasattr(info_content, "find_all"):
                # Parse information pairs - look for all text pairs
                text_elements = []
                for element in info_content.find_all(string=True):
                    text = element.strip()
                    if text and text not in ["\n", " "]:
                        text_elements.append(text)

                # FIX: Robust field-value pairing that handles missing values
                # Process text pairs as label: value with improved logic
                i = 0
                while i < len(text_elements):
                    if i >= len(text_elements):
                        break

                    label = text_elements[i].strip()

                    # Skip empty labels
                    if not label:
                        i += 1
                        continue

                    # Get value (next element if exists, otherwise empty string)
                    value = ""
                    if i + 1 < len(text_elements):
                        potential_value = text_elements[i + 1].strip()

                        # Check if next element looks like another label (contains colon or known field name)
                        known_labels = ["D.O.B", "Size", "Sex", "Breed", "Status"]
                        is_next_label = potential_value.endswith(":") or potential_value in known_labels or any(potential_value.startswith(known_label) for known_label in known_labels)

                        if not is_next_label:
                            value = potential_value
                            i += 2  # Skip both label and value
                        else:
                            # Next element is another label, current field has no value
                            value = ""
                            i += 1  # Skip only current label, next iteration will process the next label
                    else:
                        # No more elements, this field has no value
                        i += 1

                    # Process the label-value pair (allow empty values for some fields)
                    if label:
                        # Map labels to our field names with zero NULLs compliance
                        if label == "D.O.B":
                            raw_age_text = value or "Unknown"
                            properties["age_text"] = raw_age_text

                            # Use standardize_age() for age processing following galgosdelsol patterns
                            if raw_age_text and raw_age_text != "Unknown":
                                age_info = standardize_age(raw_age_text)
                                if age_info.get("age_min_months") is not None:
                                    properties["age_min_months"] = age_info["age_min_months"]
                                    properties["age_max_months"] = age_info["age_max_months"]
                                    properties["age_category"] = age_info.get("age_category", "Unknown")
                        elif label == "Size":
                            properties["size"] = value or "Medium"
                        elif label == "Sex":
                            properties["sex"] = value or "Unknown"
                        elif label == "Breed":
                            raw_breed = value or "Mixed Breed"
                            # Apply breed case normalization following galgosdelsol patterns
                            properties["breed"] = normalize_breed_case(raw_breed) if raw_breed != "Mixed Breed" else raw_breed
                        elif label == "Status":
                            # Map status values
                            if value and value.lower() in ["reserved", "on hold"]:
                                properties["status"] = "reserved"
                            else:
                                properties["status"] = "available"

        return properties

    def _extract_description(self, soup: BeautifulSoup) -> str:
        """Extract description text from About section.

        Args:
            soup: BeautifulSoup object of the detail page

        Returns:
            Description text or empty string if not found
        """
        # Extract About section description - use robust H2 text matching
        about_heading = None
        for h2 in soup.find_all("h2"):
            if h2.get_text(strip=True).lower() == "about":
                about_heading = h2
                break

        if about_heading:
            about_content = about_heading.find_next_sibling()
            if about_content and hasattr(about_content, "find_all"):
                # FIX: Handle both <p> and <div> tags for description content
                # Some dogs (Melody) use <p> tags, others (Mirrium) use <div> elements
                description_elements = about_content.find_all(["p", "div"])
                if description_elements:
                    description_parts = []
                    for element in description_elements:
                        text = element.get_text(strip=True)
                        if text:
                            description_parts.append(text)

                    if description_parts:
                        return " ".join(description_parts)

        return ""

    def _extract_hero_image(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract hero image URL from detail page.

        Args:
            soup: BeautifulSoup object of the detail page

        Returns:
            Hero image URL or None if not found
        """
        # Extract hero image (first image from carousel)
        hero_image = soup.find("figure")
        if hero_image and hasattr(hero_image, "find"):
            img = hero_image.find("img")
            if img and img.get("src"):
                return img["src"]

        return None

    def _scrape_animal_details(self, adoption_url: str) -> Dict[str, Any]:
        """Scrape detailed information from individual dog page.

        Extracts all available information from the dog detail page including
        name, breed, description, age, sex, and hero image. Follows galgosdelsol
        patterns for standardization and BaseScraper integration.

        Args:
            adoption_url: URL of the individual dog adoption page

        Returns:
            Dictionary with detailed dog information following BaseScraper format
        """
        try:
            self.logger.debug(f"Scraping details from: {adoption_url}")

            # Make request with timeout for slow site
            response = requests.get(
                adoption_url,
                headers={
                    "User-Agent": "Mozilla/5.0 (compatible; RescueDogAggregator/1.0)",
                },
                timeout=45,  # Longer timeout for slow site
            )
            response.raise_for_status()

            # Parse HTML
            soup = BeautifulSoup(response.text, "html.parser")

            # Extract name from URL for standardization
            name = self._extract_dog_name_from_url(adoption_url)
            if not name:
                self.logger.warning(f"Could not extract name from {adoption_url}")
                return {}

            # Extract external ID from URL
            external_id = self._extract_external_id(adoption_url)

            # Extract properties from the detail page
            properties = self._extract_properties(soup)

            # Extract description
            description = self._extract_description(soup)

            # Extract hero image
            hero_image_url = self._extract_hero_image(soup)

            # Session 4 compliance: Include description in properties for consistency
            if description:
                properties["description"] = description

            # Build result dictionary following galgosdelsol pattern
            result = {
                "name": self._clean_dog_name(name),
                "external_id": external_id,
                "adoption_url": adoption_url,
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
                if "size" in properties:
                    result["size"] = properties["size"] or "Medium"
                if "status" in properties:
                    result["status"] = properties["status"]  # Override default with extracted status

            # Zero NULLs compliance - only set defaults for fields that must not be NULL in production
            # Tests expect some fields to be None when not found, so be selective
            if "breed" not in result:
                result["breed"] = "Mixed Breed"
            if "size" not in result:
                result["size"] = "Medium"
            # Leave age_text and sex as None if not found to maintain test compatibility

            self.logger.debug(f"Successfully extracted data for {name}")
            return result

        except requests.RequestException as e:
            self.logger.error(f"Network error scraping details from {adoption_url}: {e}")
            return {}
        except Exception as e:
            self.logger.error(f"Error scraping details from {adoption_url}: {e}")
            return {}
