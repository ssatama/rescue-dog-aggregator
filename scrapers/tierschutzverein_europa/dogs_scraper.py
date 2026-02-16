import concurrent.futures
import re
import time
from threading import Lock
from typing import Any
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

from scrapers.base_scraper import BaseScraper
from scrapers.tierschutzverein_europa.translations import (
    normalize_name,
    translate_age,
    translate_breed,
    translate_gender,
)


class TierschutzvereinEuropaScraper(BaseScraper):
    """Tierschutzverein Europa e.V. scraper with two-phase parallel architecture."""

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

    def collect_data(self) -> list[dict[str, Any]]:
        """Main entry point - orchestrates two-phase scraping with parallel processing."""
        try:
            # Phase 1: Get list of animals from listing pages
            self.logger.info("Phase 1: Extracting animals from listing pages")
            animals = self.get_animal_list()

            if not animals:
                self.logger.info("No animals found on listing pages")
                return []

            self.logger.info(f"Found {len(animals)} animals on listing pages")

            # Filter based on skip_existing_animals if enabled
            # Uses self.filtering_service.filter_existing_animals() which records ALL external_ids
            # BEFORE filtering to ensure mark_skipped_animals_as_seen() works correctly
            if self.skip_existing_animals:
                animals = self.filtering_service.filter_existing_animals(animals)
                self._sync_filtering_stats()
            else:
                self.total_animals_before_filter = len(animals)
                self.total_animals_skipped = 0

            if not animals:
                self.logger.info("All animals already exist - skipping detail scraping")
                return []

            # Phase 2: Process animals in parallel to get detail data
            self.logger.info("Phase 2: Scraping detail pages in parallel")
            enriched_animals = self._process_animals_parallel(animals)

            # Phase 3: Translate German data to English
            self.logger.info("Phase 3: Translating German data to English")
            translated_animals = self._translate_and_normalize_dogs(enriched_animals)

            self.logger.info(f"Successfully collected {len(translated_animals)} dogs")
            return translated_animals

        except Exception as e:
            self.logger.error(f"Error in collect_data: {e}")
            return []

    def get_animal_list(self) -> list[dict[str, Any]]:
        """Phase 1: Extract dogs from all pagination pages."""
        all_animals = []
        page = 1
        max_pages = 50  # Safety limit to prevent infinite loops

        while page <= max_pages:
            try:
                page_url = self.get_page_url(page)
                self.logger.debug(f"Fetching page {page}: {page_url}")

                response = requests.get(
                    page_url,
                    headers={"User-Agent": "Mozilla/5.0 (compatible; rescue-dog-aggregator)"},
                    timeout=30,
                )
                response.raise_for_status()

                # Parse HTML and extract animals
                soup = BeautifulSoup(response.text, "html.parser")
                articles = soup.find_all("article", class_="tiervermittlung")

                # If no articles found, we've reached the end
                if not articles:
                    self.logger.debug(f"No more articles found on page {page}, stopping pagination")
                    break

                for article in articles:
                    animal_data = self._extract_animal_from_article(article)
                    if animal_data:
                        all_animals.append(animal_data)

                # Check if there's a next page link
                next_link = soup.find("a", {"class": "next", "href": True}) or soup.find("a", {"rel": "next", "href": True}) or soup.find("a", text="→")

                if not next_link:
                    self.logger.debug(f"No next page link found on page {page}, stopping pagination")
                    break

                # Rate limiting
                time.sleep(self.rate_limit_delay)
                page += 1

            except Exception as e:
                self.logger.error(f"Error processing page {page}: {e}")
                # Try to continue with next page
                page += 1
                if page > 3 and not all_animals:
                    # If we've tried 3 pages and found nothing, stop
                    self.logger.error("Failed to extract animals from first 3 pages, stopping")
                    break

        self.logger.info(f"Extracted {len(all_animals)} animals from {page - 1} listing pages")
        return all_animals

    def _extract_animal_from_article(self, article) -> dict[str, Any] | None:
        """Extract basic animal data from listing page article."""
        try:
            # Find the main link
            link = article.find("a", href=True)
            if not link:
                return None

            href = link.get("href", "")
            if not href or "/tiervermittlung/" not in href:
                return None

            # Build full URL
            adoption_url = urljoin(self.base_url, href)

            # Extract external_id from URL (CRITICAL: preserve exact format)
            external_id = self._extract_external_id_from_url(href)
            if not external_id:
                return None

            # Extract name from link text or heading
            name = None
            heading = article.find(["h2", "h3", "h4"])
            if heading:
                name = heading.get_text(strip=True)

            if not name:
                # Try to extract from external_id
                name = self._extract_name_from_external_id(external_id)

            if not name:
                return None

            return {
                "name": name,
                "external_id": external_id,
                "adoption_url": adoption_url,
                "animal_type": "dog",
                "status": "available",
            }

        except Exception as e:
            self.logger.warning(f"Error extracting animal from article: {e}")
            return None

    def _scrape_animal_details(self, adoption_url: str) -> dict[str, Any]:
        """Phase 2: Scrape detailed information from individual dog page."""
        try:
            self.logger.debug(f"Scraping details from: {adoption_url}")

            response = requests.get(
                adoption_url,
                headers={"User-Agent": "Mozilla/5.0 (compatible; rescue-dog-aggregator)"},
                timeout=45,
            )  # Longer timeout for slow site
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")

            # Extract German properties
            properties = self._extract_properties_from_soup(soup)

            # Extract hero/primary image
            hero_image_url = self._extract_hero_image(soup)

            # Build result
            result = {
                "properties": properties,
                "primary_image_url": hero_image_url,
                "original_image_url": hero_image_url,
                "image_urls": [hero_image_url] if hero_image_url else [],
            }

            # Extract key fields for BaseScraper standardization
            if "Rasse" in properties:
                result["breed"] = properties["Rasse"]
            if "Geschlecht" in properties:
                result["sex"] = properties["Geschlecht"]
            if "Geburtstag" in properties:
                result["age_text"] = properties["Geburtstag"]
                result["age"] = properties["Geburtstag"]  # Unified standardization expects 'age' field

            # Add description as separate field for BaseScraper
            if "Beschreibung" in properties:
                result["description"] = properties["Beschreibung"]

            return result

        except Exception as e:
            self.logger.error(f"Error scraping details from {adoption_url}: {e}")
            return {}

    def _extract_properties_from_soup(self, soup: BeautifulSoup) -> dict[str, str]:
        """Extract German properties from detail page."""
        properties = {}

        # Look for property table (common pattern)
        tables = soup.find_all("table")
        for table in tables:
            rows = table.find_all("tr")
            for row in rows:
                cells = row.find_all("td")
                if len(cells) >= 2:
                    key = cells[0].get_text(strip=True).rstrip(":")
                    value = cells[1].get_text(strip=True)
                    if key and value:
                        properties[key] = value

        # Alternative: Look for dl/dt/dd pattern
        dl_elements = soup.find_all("dl")
        for dl in dl_elements:
            dt_elements = dl.find_all("dt")
            dd_elements = dl.find_all("dd")
            for dt, dd in zip(dt_elements, dd_elements):
                key = dt.get_text(strip=True).rstrip(":")
                value = dd.get_text(strip=True)
                if key and value:
                    properties[key] = value

        # Extract description (Beschreibung)
        description_section = soup.find("h2", string=re.compile("Beschreibung", re.I))
        if description_section:
            description_parts = []
            current = description_section.find_next_sibling()
            while current and current.name not in ["h1", "h2", "h3"]:
                if current.name == "p":
                    text = current.get_text(strip=True)
                    if text:
                        description_parts.append(text)
                current = current.find_next_sibling()

            if description_parts:
                properties["Beschreibung"] = "\n".join(description_parts)

        return properties

    def _extract_hero_image(self, soup: BeautifulSoup) -> str | None:
        """Extract the main/hero image from detail page."""
        # Try multiple patterns for hero image
        patterns = [
            {"class": "wp-post-image"},
            {"class": "hero-image"},
            {"class": "main-image"},
            {"alt": re.compile("Titelbild|Profilbild|Hero", re.I)},
        ]

        for pattern in patterns:
            img = soup.find("img", pattern)
            if img and img.get("src"):
                src = img["src"]
                if not src.startswith("http"):
                    src = urljoin(self.base_url, src)
                return src

        # Fallback: Find first large image
        all_images = soup.find_all("img")
        for img in all_images:
            src = img.get("src", "")
            # Look for images that seem to be profile images
            if "300x300" in src or "600x" in src or "startbild" in src:
                if not src.startswith("http"):
                    src = urljoin(self.base_url, src)
                return src

        return None

    def _process_animals_parallel(self, animals: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Process animals in parallel batches for efficient detail scraping."""
        all_dogs_data = []
        seen_urls = set()

        # Single-threaded for small batches
        if len(animals) <= self.batch_size or self.batch_size == 1:
            self.logger.info(f"Using single-threaded processing for {len(animals)} animals")

            for animal in animals:
                adoption_url = animal["adoption_url"]

                if adoption_url in seen_urls:
                    continue
                seen_urls.add(adoption_url)

                time.sleep(self.rate_limit_delay)

                try:
                    detail_data = self._scrape_animal_details(adoption_url)
                    if detail_data:
                        animal.update(detail_data)
                except Exception as e:
                    self.logger.error(f"Error scraping details for {animal['name']}: {e}")

                all_dogs_data.append(animal)

            return all_dogs_data

        # Parallel processing for larger batches
        self.logger.info(f"Starting parallel detail scraping for {len(animals)} animals")

        results_lock = Lock()

        def process_animal_batch(animal_batch):
            """Process a batch of animals in parallel."""
            batch_results = []

            for animal in animal_batch:
                adoption_url = animal["adoption_url"]

                with results_lock:
                    if adoption_url in seen_urls:
                        continue
                    seen_urls.add(adoption_url)

                time.sleep(self.rate_limit_delay)

                try:
                    detail_data = self._scrape_animal_details(adoption_url)
                    if detail_data:
                        animal.update(detail_data)
                except Exception as e:
                    self.logger.error(f"Error scraping details for {animal.get('name', 'unknown')}: {e}")

                batch_results.append(animal)

            return batch_results

        # Split into batches
        batches = []
        for i in range(0, len(animals), self.batch_size):
            batch = animals[i : i + self.batch_size]
            batches.append(batch)

        self.logger.info(f"Split {len(animals)} animals into {len(batches)} batches")

        # Process with limited concurrency
        max_workers = min(3, len(batches))  # Max 3 concurrent workers

        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_batch = {executor.submit(process_animal_batch, batch): i for i, batch in enumerate(batches)}

            for future in concurrent.futures.as_completed(future_to_batch):
                batch_index = future_to_batch[future]
                try:
                    batch_results = future.result(timeout=300)
                    all_dogs_data.extend(batch_results)
                    self.logger.info(f"Completed batch {batch_index + 1}/{len(batches)}")
                except Exception as e:
                    self.logger.error(f"Batch {batch_index + 1} failed: {e}")

        return all_dogs_data

    def _translate_and_normalize_dogs(self, dogs: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Translate German data to English for BaseScraper processing."""
        translated_dogs = []

        for dog in dogs:
            try:
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

                if translated_dog.get("breed"):
                    translated_breed = translate_breed(translated_dog["breed"])
                    if translated_breed:
                        translated_dog["breed"] = translated_breed

                # Update language markers in properties
                if "properties" not in translated_dog:
                    translated_dog["properties"] = {}
                translated_dog["properties"]["language"] = "en"
                translated_dog["properties"]["original_language"] = "de"

                translated_dogs.append(translated_dog)

            except Exception as e:
                self.logger.error(f"Translation failed for {dog.get('name', 'unknown')}: {e}")
                # Return original with error flag
                dog_with_error = dog.copy()
                if "properties" not in dog_with_error:
                    dog_with_error["properties"] = {}
                dog_with_error["properties"]["translation_error"] = str(e)
                translated_dogs.append(dog_with_error)

        return translated_dogs

    def get_page_url(self, page: int) -> str:
        """Generate URL for specific page."""
        if page == 1:
            return self.listing_url
        return f"{self.listing_url}page/{page}/"

    def _extract_external_id_from_url(self, url: str) -> str:
        """Extract external ID from URL - CRITICAL: preserve exact format."""
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

    def _extract_name_from_external_id(self, external_id: str) -> str | None:
        """Extract dog name from external_id like 'bonsai-in-spanien-perros-con-alma'."""
        if not external_id:
            return None

        # Take first part before location indicators
        parts = external_id.split("-")
        if parts:
            name = parts[0]
            return name.capitalize()

        return None

    def _get_existing_animal_urls(self) -> set:
        """Get URLs of existing animals from database."""
        try:
            # This would normally query the database
            # For now, returning empty set to avoid database dependency in tests
            return set()
        except Exception as e:
            self.logger.error(f"Error getting existing animal URLs: {e}")
            return set()
