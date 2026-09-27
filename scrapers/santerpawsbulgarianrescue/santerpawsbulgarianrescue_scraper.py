"""Scraper implementation for Santer Paws Bulgarian Rescue organization."""

import time
from typing import Any
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup, Comment, Tag

from scrapers.base_scraper import BaseScraper, DetailPageError, ListingIncompleteError

# Migrated to unified standardization - using BaseScraper.process_animal()
# Legacy standardize_age kept for date-of-birth calculations
from utils.shared_extraction_patterns import gallery_urls
from utils.standardization import standardize_age

STORY_BLOCK_TAGS = ["p", "div", "li", "blockquote"]


def _story_paragraphs(element: Tag) -> list[str]:
    """Split an element into paragraphs: its innermost blocks, and the inline runs between them."""
    paragraphs: list[str] = []
    inline: list[str] = []

    def flush() -> None:
        text = " ".join(" ".join(inline).split())
        if text:
            paragraphs.append(text)
        inline.clear()

    for child in element.children:
        if isinstance(child, Tag) and (child.name in STORY_BLOCK_TAGS or child.find(STORY_BLOCK_TAGS)):
            flush()
            if child.find(STORY_BLOCK_TAGS):
                paragraphs.extend(_story_paragraphs(child))
            else:
                inline.append(child.get_text())
                flush()
        elif isinstance(child, Comment) or (isinstance(child, Tag) and child.name in ("script", "style")):
            continue
        else:
            inline.append(child.get_text() if isinstance(child, Tag) else str(child))
    flush()

    return paragraphs


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

    def _get_filtered_animals(self) -> list[dict[str, Any]]:
        """Get list of animals and apply skip_existing_animals filtering.

        Uses self.filtering_service.filter_existing_animals() which records ALL external_ids
        BEFORE filtering to ensure mark_found_animals_as_seen() works correctly.

        Returns:
            List of filtered animals ready for detail scraping
        """
        # Get list of available dogs from all listing pages
        animals = self.get_animal_list()

        if not animals:
            self.logger.warning("No animals found to process")
            return []

        # Use filtering_service method that records external_ids BEFORE filtering
        # This is critical for mark_found_animals_as_seen() to work correctly
        result = self.filtering_service.filter_existing_animals(animals)
        self._sync_filtering_stats()
        return result

    def _process_animals_parallel(self, animals: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Each dog's detail page, merged over its listing data (#567)."""

        def fetch(animal: dict[str, Any]) -> dict[str, Any]:
            details = self._scrape_animal_details(animal["adoption_url"])
            if not details:
                # _scrape_animal_details logs its own error and returns {}
                raise DetailPageError(f"{animal['adoption_url']} yielded no details")
            animal.update(details)
            return animal

        return self.fetch_details(animals, fetch, max_workers=3)

    def collect_data(self) -> list[dict[str, Any]]:
        """Collect all available dog data from the listing page.

        This method implements the BaseScraper template method pattern.
        It extracts dogs from the listing page, applies filtering based on
        skip_existing_animals, and then processes them in parallel batches
        for efficient detail scraping.

        A listing failure propagates, so the run ends as an error and stale
        detection doesn't run.

        Returns:
            List of dog data dictionaries for database storage
        """
        # Phase 1: Get and filter animals
        animals = self._get_filtered_animals()
        if not animals:
            return []

        # Phase 2: Process animals in parallel batches for detail scraping
        all_dogs_data = self._process_animals_parallel(animals)

        self.logger.info(f"Total unique dogs collected: {len(all_dogs_data)}")
        return all_dogs_data

    def get_animal_list(self) -> list[dict[str, Any]]:
        """Fetch list of available dogs by paginating through all listing pages.

        Loops through paginated listing pages (/adopt/page/1/, /adopt/page/2/, etc.)
        until a page lists no dogs; a page past the end is an empty 200. That
        empty page must come after the last page the pagination numbers, and
        every page must load, or this raises ListingIncompleteError: the dogs
        on a skipped page would go stale. An empty first page is left to the
        zero-dogs alert.

        Returns:
            List of dictionaries containing basic dog information from all pages
        """
        all_animals = []
        page_num = 1
        last_numbered_page = 1
        max_pages = 20  # Safety limit to prevent infinite loops
        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; RescueDogAggregator/1.0)",
        }

        while True:
            page_url = self.listing_url if page_num == 1 else f"{self.listing_url}page/{page_num}/"
            self.logger.debug(f"Fetching page {page_num}: {page_url}")

            response = self.get_listing_page(page_url, headers=headers, timeout=30)
            soup = BeautifulSoup(response.text, "html.parser")

            if page_num == 1:
                numbers = [el["data-page"] for el in soup.select(".phox-facet-pagination [data-page]")]
                last_numbered_page = max((int(n) for n in numbers if n.isdigit()), default=1)

            # Find all dog cards
            dog_cards = soup.find_all("article", class_="bde-loop-item")
            self.logger.debug(f"Found {len(dog_cards)} dog cards on page {page_num}")

            if not dog_cards:
                if 1 < page_num <= last_numbered_page:
                    raise ListingIncompleteError(f"Santer Paws listing page {page_num} of {last_numbered_page} lists no dogs")
                self.logger.info(f"No dogs found on page {page_num}, stopping pagination")
                break

            if page_num > max_pages:
                raise ListingIncompleteError(f"Santer Paws listing still lists dogs after {max_pages} pages")

            # Process dogs from this page
            page_animals = []
            for card in dog_cards:
                try:
                    # Skip if not a Tag element
                    if not hasattr(card, "find"):
                        continue

                    # Skip reserved/on-hold dogs (check for status badge text)
                    card_text = card.get_text().lower()
                    if "reserved" in card_text or "on hold" in card_text:
                        self.logger.debug("Skipping reserved/on-hold dog from listing page")
                        continue

                    # Find the link to the adoption page
                    link = card.find("a", href=lambda x: x and "/dog/" in x)
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
                        "status": "available",
                        "primary_image_url": None,
                        "original_image_url": None,
                    }

                    page_animals.append(animal_data)
                    self.logger.debug(f"Added dog: {name} ({external_id})")

                except Exception as e:
                    self.logger.error(f"Error processing dog card: {e}")
                    continue

            # Add this page's animals to the total
            all_animals.extend(page_animals)
            self.logger.info(f"Page {page_num}: extracted {len(page_animals)} dogs (total so far: {len(all_animals)})")

            page_num += 1
            # Small delay between pages to be respectful
            time.sleep(0.5)

        self.logger.info(f"Successfully extracted {len(all_animals)} available dogs from {page_num - 1} pages")
        return all_animals

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
        """Extract external ID from adoption URL with organization prefix.

        Args:
            url: Full adoption URL

        Returns:
            External ID with 'spbr-' prefix to prevent collisions
        """
        # Extract the last part of the URL path, removing trailing slash
        # This will be the slug: pepper, daisy, summer-breeze, etc.
        slug = url.rstrip("/").split("/")[-1]
        return f"spbr-{slug}"

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

    def _dog_column(self, soup: BeautifulSoup) -> Tag | None:
        """The page column holding this dog's name, story and field grid.

        Anchoring on the <h1> keeps the "Meet more of our dogs" cards, which
        repeat the same field markup for other dogs, out of this dog's data.
        """
        heading = soup.find("h1")
        return heading.find_parent(class_="bde-column") if heading else None

    def _extract_properties(self, soup: BeautifulSoup) -> dict[str, Any]:
        """Extract properties from the label/value grid in the dog's column.

        Args:
            soup: BeautifulSoup object of the detail page

        Returns:
            Dictionary with extracted properties
        """
        properties: dict[str, Any] = {}

        column = self._dog_column(soup)
        if not column:
            return properties

        for field in column.select(".bde-grid > .bde-div"):
            cells = field.find_all(class_="bde-text", recursive=False)
            if len(cells) != 2:
                continue

            label = cells[0].get_text(strip=True).rstrip(":")
            value = cells[1].get_text(strip=True)

            # Process the label-value pair (allow empty values for some fields)
            if label:
                # Map labels to our field names with zero NULLs compliance
                if label == "D.O.B":
                    # A blank cell stays absent: "Unknown" would reach the page
                    # as though it were a scraped age (#349)
                    if value:
                        properties["age_text"] = value
                        age_info = standardize_age(value)
                        if age_info.get("age_min_months") is not None:
                            properties["age_min_months"] = age_info["age_min_months"]
                            properties["age_max_months"] = age_info["age_max_months"]
                            properties["age_category"] = age_info.get("age_category", "Unknown")
                elif label == "Size":
                    if value:
                        properties["size"] = value
                elif label == "Sex":
                    # Blank stays absent, like D.O.B: "Unknown" would read as scraped (#349)
                    if value:
                        properties["sex"] = value
                elif label == "Breed":
                    # Store raw breed for unified standardization
                    if value:
                        properties["breed"] = value
                elif label == "Status":
                    # Map status values
                    if value and value.lower() in ["reserved", "on hold"]:
                        properties["status"] = "reserved"
                    else:
                        properties["status"] = "available"

        return properties

    def _extract_description(self, soup: BeautifulSoup) -> str:
        """Extract the story from the dog's column.

        Stories arrive as <p>s, as Facebook-pasted <div>s, and with <ul> lists,
        so every innermost block element is a paragraph. Text beside those
        blocks - an <h2> or bare <strong> title - is a paragraph of its own.

        Args:
            soup: BeautifulSoup object of the detail page

        Returns:
            Description text or empty string if not found
        """
        column = self._dog_column(soup)
        if not column:
            return ""

        paragraphs = [text for block in column.find_all(class_="bde-text", recursive=False) for text in _story_paragraphs(block)]

        return " ".join(paragraphs)

    def _extract_hero_image(self, soup: BeautifulSoup) -> str | None:
        """Extract hero image URL from detail page.

        Args:
            soup: BeautifulSoup object of the detail page

        Returns:
            Hero image URL or None if not found or invalid
        """
        # Extract hero image (first image from carousel)
        hero_image = soup.find("figure")
        if hero_image and hasattr(hero_image, "find"):
            img = hero_image.find("img")
            if img and img.get("src"):
                src = img["src"]

                # Filter out data URI placeholders (lazy loading)
                if src.startswith("data:"):
                    self.logger.debug(f"Skipping data URI placeholder: {src[:100]}...")
                    return None

                return src

        return None

    def _scrape_animal_details(self, adoption_url: str) -> dict[str, Any]:
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
            }

            # The dog's photos: the hero, then the gallery's full-size originals (#487)
            gallery_links = [urljoin(self.base_url, a["href"]) for a in soup.select("a.ee-gallery-item[href]")]
            result["image_urls"] = gallery_urls(hero_image_url, gallery_links)

            # Extract individual fields from properties for compatibility with zero NULLs compliance
            if properties:
                if "breed" in properties:
                    result["breed"] = properties["breed"]
                if "sex" in properties:
                    result["sex"] = properties["sex"]
                # Rename age_text to age for unified standardization API
                if "age_text" in properties:
                    result["age"] = properties["age_text"]
                    # The D.O.B cell, day-first: "03/10/2025" (#561)
                    result["date_of_birth"] = properties["age_text"]
                if "size" in properties:
                    result["size"] = properties["size"]
                if "status" in properties:
                    result["status"] = properties["status"]  # Override default with extracted status

            # Apply unified standardization via process_animal from BaseScraper
            # This handles breed standardization, age parsing, size normalization, etc.
            result = self.process_animal(result)

            self.logger.debug(f"Successfully extracted data for {name}")
            return result

        except requests.RequestException as e:
            self.logger.error(f"Network error scraping details from {adoption_url}: {e}")
            return {}
        except Exception as e:
            self.logger.error(f"Error scraping details from {adoption_url}: {e}")
            return {}
