import re
from typing import Any
from urllib.parse import urlparse

from bs4 import BeautifulSoup
from playwright.async_api import TimeoutError as PlaywrightTimeoutError

from services.playwright_browser_service import (
    PlaywrightOptions,
    get_playwright_service,
)
from utils.dog_size import size_from_height_cm
from utils.shared_extraction_patterns import gallery_urls

# The footer is excluded by position, so this floor only has to keep out short
# Steckbrief lines and the name widget; story paragraphs run from ~119 chars.
MIN_STORY_WIDGET_CHARS = 80

# Steckbrief lines that are never parsed into fields but must not read as story.
UNPARSED_STECKBRIEF_LABELS = ("Verträglich mit", "Als Zweithund")


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

    async def async_extract_dog_details(self, dog_url: str, logger=None) -> dict[str, Any] | None:
        """Extract detailed information (async caller — avoids nested asyncio.run())."""
        return await self._extract_dog_details_playwright(dog_url, logger)

    async def _extract_dog_details_playwright(self, dog_url: str, logger=None) -> dict[str, Any] | None:
        """Extract detailed information using Playwright."""
        playwright_service = get_playwright_service()
        options = PlaywrightOptions(
            headless=True,
            viewport_width=1920,
            viewport_height=1080,
            timeout=30000,
        )

        async with playwright_service.get_browser(options) as browser_result:
            page = browser_result.page

            try:
                if logger:
                    logger.debug(f"Loading dog detail page (Playwright): {dog_url}")

                await page.goto(dog_url, wait_until="domcontentloaded")
                await page.wait_for_selector("body", timeout=30000)

                html_content = await page.content()
                soup = BeautifulSoup(html_content, "html.parser")

                dog_data = {
                    "adoption_url": dog_url,
                    "external_id": self._extract_external_id_from_url(dog_url),
                    "properties": {
                        "source": "daisyfamilyrescue.de",
                        "extraction_method": "playwright_detail_page",
                        "language": "de",
                    },
                }

                # Extract Steckbrief data using BeautifulSoup
                steckbrief_data = self._extract_steckbrief_data_soup(soup, logger)
                if steckbrief_data:
                    processed_data = self._process_steckbrief_data(steckbrief_data, logger)
                    # Merge properties: a plain update would drop source, extraction_method and language
                    properties = {**dog_data["properties"], **processed_data.pop("properties", {})}
                    dog_data.update(processed_data)
                    dog_data["properties"] = properties

                # Extract main dog image
                image_url = self._extract_main_image_soup(soup, logger)
                if image_url:
                    dog_data["primary_image_url"] = image_url
                    dog_data["image_urls"] = self._extract_image_urls_soup(soup, image_url)

                # Extract description
                description = self._extract_description_soup(soup, logger)
                if description:
                    if "properties" not in dog_data:
                        dog_data["properties"] = {}
                    if isinstance(dog_data["properties"], dict):
                        dog_data["properties"]["german_description"] = description

                # Extract dog name
                name = self._extract_dog_name_soup(soup, logger)
                if name:
                    dog_data["name"] = name

                if logger:
                    logger.debug(f"Extracted details for dog: {dog_data.get('name', 'Unknown')}")

                return dog_data

            except PlaywrightTimeoutError as e:
                # Retried by fetch_details_async, which knows TimeoutError (#571)
                raise TimeoutError(f"{dog_url} did not load: {e}") from e
            except Exception as e:
                # Chromium's net::ERR_TIMED_OUT arrives as a plain Playwright Error, as on Many Tears
                if "ERR_TIMED_OUT" in str(e):
                    raise TimeoutError(f"{dog_url} did not load: {e}") from e
                if logger:
                    logger.error(f"Error extracting details from {dog_url}: {e}")
                return None

    def _extract_steckbrief_data_soup(self, soup: BeautifulSoup, logger=None) -> dict[str, str]:
        """Extract structured data from the Steckbrief section using BeautifulSoup."""
        steckbrief_data = {}

        try:
            steckbrief_header = soup.find("h4", string=lambda t: t and "Steckbrief" in t)

            if not steckbrief_header:
                if logger:
                    logger.warning("Steckbrief section not found")
                return steckbrief_data

            if logger:
                logger.debug("Found Steckbrief section")

            # Get the parent container
            steckbrief_container = steckbrief_header.find_parent("section")
            if not steckbrief_container:
                steckbrief_container = steckbrief_header.find_parent("div", class_=lambda x: x and "elementor" in x)
            if not steckbrief_container:
                steckbrief_container = steckbrief_header.parent.parent.parent

            if steckbrief_container:
                container_text = steckbrief_container.get_text(separator="\n", strip=True)

                for pattern in self.steckbrief_patterns:
                    value = self._extract_field_value(container_text, pattern)
                    if value:
                        steckbrief_data[pattern] = value
                        if logger:
                            logger.debug(f"Extracted {pattern} {value}")

        except Exception as e:
            if logger:
                logger.error(f"Error extracting Steckbrief data: {e}")

        return steckbrief_data

    def _extract_main_image_soup(self, soup: BeautifulSoup, logger=None) -> str | None:
        """Extract main dog image using BeautifulSoup."""
        try:
            image_selectors = [
                "figure.elementor-widget-image img",
                ".elementor-widget-image img",
                "img.attachment-full",
                "article img",
                ".post-thumbnail img",
            ]

            for selector in image_selectors:
                img_elements = soup.select(selector)
                for img in img_elements:
                    src = img.get("src", "")
                    alt = img.get("alt", "").lower()

                    if src and not any(skip in alt for skip in ["logo", "icon", "banner"]):
                        if any(ext in src.lower() for ext in [".jpg", ".jpeg", ".png", ".gif", ".webp"]):
                            if logger:
                                logger.debug(f"Found main image: {src}")
                            return src

        except Exception as e:
            if logger:
                logger.error(f"Error extracting main image: {e}")
        return None

    def _extract_image_urls_soup(self, soup: BeautifulSoup, hero_image_url: str | None) -> list[str]:
        """The dog's photos: the hero, then the Elementor gallery and slider (#487).

        Both link to full-size uploads. The site logo lives in the header
        template and is left out, as are links that aren't images.
        """
        links = [
            a["href"]
            for a in soup.select(".elementor-gallery__container a[href], .swiper-slide a[href]")
            if not a.find_parent(attrs={"data-elementor-type": ["header", "footer"]}) and a["href"].lower().split("?", 1)[0].endswith((".jpg", ".jpeg", ".png", ".webp"))
        ]
        return gallery_urls(hero_image_url, links)

    def _extract_description_soup(self, soup: BeautifulSoup, logger=None) -> str | None:
        """Extract the dog's story from the page's Elementor text widgets.

        Each Steckbrief line ("Alter: 01/2026") is its own widget ahead of the
        story, so the story is the widgets long enough to be prose that do not
        open with a known Steckbrief label. A generic "Label:" pattern is not
        enough: story paragraphs open with "Ich bin ... ein Menschenhund: ..."
        too. The contact and bank-detail widgets live in the site's footer
        template and are skipped by position, not by length.
        """
        labels = tuple(self.steckbrief_patterns) + UNPARSED_STECKBRIEF_LABELS
        widgets = [" ".join(el.get_text().split()) for el in soup.select(".elementor-widget-text-editor") if not el.find_parent(attrs={"data-elementor-type": ["header", "footer"]})]
        story = [text for text in widgets if len(text) >= MIN_STORY_WIDGET_CHARS and not text.startswith(labels)]

        if logger and story:
            logger.debug(f"Found description ({sum(len(text) for text in story)} chars)")

        return "\n\n".join(story) or None

    def _extract_dog_name_soup(self, soup: BeautifulSoup, logger=None) -> str | None:
        """Extract dog name using BeautifulSoup."""
        try:
            heading_selectors = [
                "h1.elementor-heading-title",
                "h1.entry-title",
                "article h1",
                ".post-title",
            ]

            for selector in heading_selectors:
                heading = soup.select_one(selector)
                if heading:
                    name = heading.get_text(strip=True)
                    if name and len(name) < 100:
                        clean_name = re.sub(r"^(hund[-\s]*)", "", name, flags=re.IGNORECASE).strip()
                        if clean_name:
                            if logger:
                                logger.debug(f"Found dog name: {clean_name}")
                            return clean_name

        except Exception as e:
            if logger:
                logger.error(f"Error extracting dog name: {e}")
        return None

    def _extract_field_value(self, text: str, field_pattern: str) -> str | None:
        """Extract the value for a specific field from text."""
        # Create regex pattern to match field and its value
        # Pattern: "Alter: 03/2020" or "Geschlecht: weiblich, kastriert"
        pattern = rf"{re.escape(field_pattern)}\s*([^\n]+)"
        match = re.search(pattern, text, re.IGNORECASE)

        if match:
            value = match.group(1).strip()
            # Remove the field name if it's repeated
            value = re.sub(rf"^{re.escape(field_pattern)}\s*", "", value).strip()
            # A blank field lets the match run onto the next line; that is the
            # next field ("Alter:" -> "Geschlecht: weiblich"), not a value.
            if value.startswith(tuple(self.steckbrief_patterns) + UNPARSED_STECKBRIEF_LABELS):
                return None
            return value if value else None

        return None

    def _process_steckbrief_data(self, steckbrief_data: dict[str, str], logger=None) -> dict[str, Any]:
        """Process and standardize the raw Steckbrief data."""
        processed_data = {}

        # Process age/birth date - just extract the age text for unified parsing
        if "Alter:" in steckbrief_data:
            processed_data["age_text"] = steckbrief_data["Alter:"]
            processed_data["age"] = steckbrief_data["Alter:"]  # Unified standardization expects 'age' field
            processed_data["date_of_birth"] = steckbrief_data["Alter:"]  # "01/2026" (#561)

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
                processed_data.setdefault("properties", {})["weight_kg"] = weight

        # Process height and determine size
        if "Schulterhöhe:" in steckbrief_data:
            height = self._parse_height(steckbrief_data["Schulterhöhe:"])
            if height:
                processed_data.setdefault("properties", {})["height_cm"] = height
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

    def _parse_sex(self, sex_text: str) -> dict[str, Any] | None:
        """Parse sex from German text like 'weiblich, kastriert'."""
        if not sex_text:
            return None

        sex_data: dict[str, Any] = {}
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

    def _parse_breed(self, breed_text: str) -> str | None:
        """Parse breed from German text."""
        if not breed_text:
            return None

        breed_lower = breed_text.lower()

        # A named breed first, longest name first: "Deutscher Schäferhund-Mischling"
        # is a German Shepherd cross, not just "mixed breed" (#571). Plain
        # "Schäferhund" isn't a key: Belgian, White Swiss and Caucasian are too.
        named = [(german, english) for german, english in self.breed_translations.items() if german != "mischling" and german in breed_lower]
        if named:
            english = max(named, key=lambda pair: len(pair[0]))[1]
            return f"{english} mix" if "mischling" in breed_lower else english
        if "mischling" in breed_lower:
            return self.breed_translations["mischling"]

        # Return original if no translation found
        return breed_text

    def _parse_weight(self, weight_text: str) -> float | None:
        """Parse weight from text like '19 kg'."""
        if not weight_text:
            return None

        # Extract number followed by kg
        weight_match = re.search(r"(\d+(?:\.\d+)?)\s*kg", weight_text.lower())
        if weight_match:
            return float(weight_match.group(1))

        return None

    def _parse_height(self, height_text: str) -> int | None:
        """Parse height from text like '53 cm'."""
        if not height_text:
            return None

        # Extract number followed by cm
        height_match = re.search(r"(\d+)\s*cm", height_text.lower())
        if height_match:
            return int(height_match.group(1))

        return None

    def _determine_size(self, height_cm: int) -> str | None:
        """Size by shoulder height, on the scale shared with Tierschutzverein (#631)."""
        return size_from_height_cm(height_cm)

    def _parse_location(self, location_text: str) -> str | None:
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

    def _parse_adoption_fee(self, fee_text: str) -> float | None:
        """Parse adoption fee from text like '615 €'."""
        if not fee_text:
            return None

        # Extract number before € symbol
        fee_match = re.search(r"(\d+(?:\.\d+)?)\s*€", fee_text)
        if fee_match:
            return float(fee_match.group(1))

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
