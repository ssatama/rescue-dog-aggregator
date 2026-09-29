import re
from typing import Any
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup, NavigableString, Tag

from scrapers.base_scraper import BaseScraper, DetailPageError, ListingIncompleteError
from scrapers.tierschutzverein_europa.translations import (
    awaits_grown_size,
    normalize_name,
    stated_age_months,
    translate_age,
    translate_breed,
    translate_gender,
    translate_size,
)
from utils.shared_extraction_patterns import gallery_urls

# A post's story is its paragraphs and subtitles, up to the "Videos" line
STORY_BLOCKS = ["p", "h1", "h2", "h3", "h4"]
STORY_END = re.compile(r"^Videos?$", re.IGNORECASE)


def _text(element: Tag) -> str:
    """An element's text as the page shows it: its own spacing, a line break as a space.

    get_text(strip=True) stripped each piece of text, so the space beside a tag
    went ("hat <em>Bitte</em>" read "hatBitte") and "befindet.<br>Im" read
    "befindet.Im" (#631). A separator at every tag split words instead
    ("H<span>ü</span>ndin" read "H ü ndin", #654), so only <br> adds a space.
    """
    parts = [" " if isinstance(node, Tag) else str(node) for node in element.descendants if (isinstance(node, Tag) and node.name == "br") or type(node) is NavigableString]
    return " ".join("".join(parts).split())


class TierschutzvereinEuropaScraper(BaseScraper):
    """Tierschutzverein Europa e.V. scraper with two-phase parallel architecture."""

    def __init__(self, config_id="tierschutzverein-europa"):
        """Initialize Tierschutzverein Europa scraper with configuration."""
        super().__init__(config_id=config_id)

        self.base_url: str = "https://tierschutzverein-europa.de"
        self.listing_url: str = "https://tierschutzverein-europa.de/tiervermittlung/"

    def collect_data(self) -> list[dict[str, Any]]:
        """Main entry point - orchestrates two-phase scraping with parallel processing.

        A listing failure propagates, so the run ends as an error and stale
        detection doesn't run; a detail page that fails skips one dog.
        """
        # Phase 1: Get list of animals from listing pages
        self.logger.info("Phase 1: Extracting animals from listing pages")
        animals = self.get_animal_list()

        if not animals:
            self.logger.info("No animals found on listing pages")
            return []

        self.logger.info(f"Found {len(animals)} animals on listing pages")

        # Filter based on skip_existing_animals if enabled
        # Uses self.filtering_service.filter_existing_animals() which records ALL external_ids
        # BEFORE filtering to ensure mark_found_animals_as_seen() works correctly
        if self.skip_existing_animals:
            animals = self.filtering_service.filter_existing_animals(animals)
        else:
            # Every listed dog is found, even one whose page then fails (#558)
            self._record_all_found_external_ids(animals)

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

    def get_animal_list(self) -> list[dict[str, Any]]:
        """Phase 1: Extract dogs from all pagination pages.

        Every page a "next" link promised must load and list dogs, or this
        raises ListingIncompleteError: the dogs on a skipped page would go stale.
        """
        all_animals = []
        page = 1
        max_pages = 50  # Safety limit to prevent infinite loops

        while True:
            page_url = self.get_page_url(page)
            self.logger.debug(f"Fetching page {page}: {page_url}")

            response = self.get_listing_page(page_url, headers={"User-Agent": "Mozilla/5.0 (compatible; rescue-dog-aggregator)"}, timeout=30)

            # Parse HTML and extract animals
            soup = BeautifulSoup(response.text, "html.parser")
            articles = soup.find_all("article", class_="tiervermittlung")

            if not articles:
                if page > 1:
                    raise ListingIncompleteError(f"Listing page {page} was linked from page {page - 1} but lists no dogs")
                self.logger.warning("No dogs on the first listing page")
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

            if page == max_pages:
                raise ListingIncompleteError(f"Listing still has a next page after {max_pages} pages")

            # get_listing_page keeps the org's rate between pages (#567)
            page += 1

        self.logger.info(f"Extracted {len(all_animals)} animals from {page} listing pages")
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
                "image_urls": self._extract_image_urls(soup, hero_image_url),
            }

            # Extract key fields for BaseScraper standardization
            if "Rasse" in properties:
                result["breed"] = properties["Rasse"]
            if "Geschlecht" in properties:
                result["sex"] = properties["Geschlecht"]
            if "Geburtstag" in properties:
                # Translated in phase 3. No "age": process_animal prefers it
                # over age_text, and it would store the German text (#563).
                result["age_text"] = properties["Geburtstag"]
                result["date_of_birth"] = properties["Geburtstag"]  # "03.2025 (1 Jahr alt)" (#561)

            return result

        except Exception as e:
            # A timeout, dropped connection, 429 or 5xx is retried by fetch_details (#571)
            if self._is_transient(e):
                raise
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
                    key = _text(cells[0]).rstrip(":")
                    value = _text(cells[1])
                    if key and value:
                        properties[key] = value

        # Alternative: Look for dl/dt/dd pattern
        dl_elements = soup.find_all("dl")
        for dl in dl_elements:
            dt_elements = dl.find_all("dt")
            dd_elements = dl.find_all("dd")
            for dt, dd in zip(dt_elements, dd_elements):
                key = _text(dt).rstrip(":")
                value = _text(dd)
                if key and value:
                    properties[key] = value

        # The story, stored where every reader looks (#563)
        description_parts = [text for el in self._story_blocks(soup) if (text := _text(el))]
        if description_parts:
            properties["description"] = "\n".join(description_parts)

        return properties

    @staticmethod
    def _story_blocks(soup: BeautifulSoup) -> list[Tag]:
        """The story's paragraphs and subtitles: the post from the top up to "Videos".

        Headings in the post are the story's own ("Milo – ein junger Rüde…",
        "Update im Mai 2026", "Zur Geschichte"), and updates can sit above
        "Beschreibung", so only "Videos" ends it (an h2 or, on some posts, a p).
        The "Beschreibung" heading itself is left out; older posts have none.
        """
        heading = soup.find("h2", string=re.compile("Beschreibung", re.I))
        post = soup.select_one("div.content") or (heading.parent if heading else None)
        if post is None:
            return []

        blocks = []
        for block in post.find_all(STORY_BLOCKS, recursive=False):
            text = block.get_text(strip=True)
            if STORY_END.match(text):
                break
            if block is not heading:
                blocks.append(block)
        return blocks

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

    def _extract_image_urls(self, soup: BeautifulSoup, hero_image_url: str | None) -> list[str]:
        """The dog's gallery in the page's order, hero first (#487).

        Full-size photos are the Envira gallery's link targets. The hero is a
        WordPress resize of the first of them ("-600x600"), so photos are
        compared without the size suffix. Files named "<Name>-<Shelter>-vom-
        <date>-NNNN" are the shelter's photo updates, not documents: they stay.
        HEIC files are skipped because browsers can't show them.
        """
        links = [urljoin(self.base_url, a["href"]) for a in soup.select("a.envira-gallery-link") if a.get("href")]
        return gallery_urls(hero_image_url, links)

    def _process_animals_parallel(self, animals: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Each dog's detail page, merged over its listing data (#567)."""

        def fetch(animal: dict[str, Any]) -> dict[str, Any]:
            details = self._scrape_animal_details(animal["adoption_url"])
            if not details:
                # _scrape_animal_details logs its own error and returns {}
                raise DetailPageError(f"{animal['adoption_url']} yielded no details")
            animal.update(details)
            return animal

        return self.fetch_details(animals, fetch, max_workers=3, attempts=self.max_retries + 1)

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

                german_age = translated_dog.get("age_text")
                height_text = (translated_dog.get("properties") or {}).get("Ungefähre Größe")
                age_months = stated_age_months(german_age)
                translated_dog["size"] = translate_size(height_text, age_months)
                if translated_dog["size"] is None and awaits_grown_size(height_text, age_months):
                    # Skip-existing reads the dog again until its page gives a grown size (#631).
                    # A plain puppy height isn't waited on: it would become the adult size.
                    translated_dog.setdefault("properties", {})["size_pending"] = True

                if german_age:
                    # No German text stands in for an age
                    translated_dog["age_text"] = translate_age(german_age)
                    if translated_dog["age_text"] is None and german_age.strip().lower() != "unbekannt":
                        self.logger.warning(f"Untranslated age for {translated_dog.get('name')}: {german_age!r}")

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
                dog_with_error["age_text"] = None  # never the German text (#563)
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
