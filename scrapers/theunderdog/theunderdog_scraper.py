"""Scraper implementation for The Underdog organization."""

import re
from typing import Any
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

from scrapers.base_scraper import BaseScraper
from utils.shared_extraction_patterns import gallery_urls

from .normalizer import extract_qa_data, extract_size_and_weight_from_qa

GOOD_WITH_QUESTIONS = {"Living with dogs?": "good_with_dogs", "Living with cats?": "good_with_cats", "Living with kids?": "good_with_children"}


# Each pattern is checked against every distinct production answer in the tests
_UNTESTED = re.compile(r"\b(not|haven't|never)( been)?( properly)? tested\b|\buntested\b|\bunknown\b|not sure|don't know|not interested")
_NEGATION = re.compile(r"\b(not|never|cannot)\b|n't\b")
_YES = re.compile(r"^\W*yes\b|\blive with\b|\b(good|fine|friendly|happy) with\b|\bno problems? with\b|\bintroduced to\b|\bneed a home with\b|\bpreferred\b")
_NO = re.compile(r"^\W*no\W*$|\bwithout\b|\bno (other )?(dogs|cats|children|kids)\b|\bonly (resident )?dog\b")
_CLAUSES = re.compile(r"[,;()]|\bbut\b|\band\b")
_QUALIFIED = re.compile(r"\b(may|might|could|likely|probably|confident|savvy|older|teens?|teenagers|prefer|preferred|smaller|only|but|not|over)\b|introduc")
_SEX = re.compile(r"\b(fe)?males?\b")


def _clause(clause: str) -> bool | None:
    """One clause's answer: True, False, or None when it doesn't say.

    A yes phrase after a negation is a no: "can't live with", "could not live
    with", "would not be good with", "prefer not to live with".
    """
    if _UNTESTED.search(clause):
        return None
    if match := _YES.search(clause):
        return not _NEGATION.search(clause[: match.start()])
    if _NO.search(clause):
        return False
    return None


def _limit(text: str) -> str | None:
    """The limit a qualified yes names: "teens only", "older children", "female dogs"."""
    # A bracket that states a limit; "(I lived with one in foster)" doesn't
    for inner in re.findall(r"\(([^)]*)\)", text):
        if re.search(r"\bonly\b|\bpreferred\b|\b(fe)?males?\b", inner):
            return inner.strip()
    if match := re.search(r"\b(older children|teenagers|teens)\b", text):
        return match.group(1)
    # One sex named and not ruled out: "female dogs", not "male or female dogs" or "not males"
    if len({sex for sex in _SEX.findall(text)}) == 1:
        if match := re.search(r"(?<!\bnot )(?<!\bno )\b((?:smaller )?(?:fe)?males?(?: dogs)?(?: preferred)?)\b", text):
            return match.group(1)
    return None


def good_with(answer: str | None) -> bool | str | None:
    """True, False, "Selective" or "Yes (<limit>)" from a Q&A answer; None when it doesn't say.

    A limit is kept, like Dogs Trust's "Yes (5+)": "children (8+)" -> "Yes (8+)",
    "older children" -> "Yes (older children)", "female dogs" -> "Yes (female
    dogs)". A yes with a condition but no named limit ("confident, dog-savvy
    cats", "with the right introductions") is "Selective". Untested is not a no.
    """
    text = (answer or "").lower().replace("’", "'").replace("‍", "").strip()
    if not text:
        return None
    if "selective" in text:
        return "Selective"
    if age := re.search(r"(\d+)\s*\+", text):  # "(8+)", "(recommended 6+)", "adult only home (or 12+)"
        return f"Yes ({age.group(1)}+)"
    if re.search(r"\badult[- ]only\b", text):
        # "an adult-only home, or older children" still takes older children
        return "Yes (older children)" if "older children" in text else False
    # Clause by clause, so "can't live with cats, not tested with small pets" is a
    # no, and "friendly with other dogs, but would prefer to be the only dog" a
    # condition
    verdicts = {verdict for verdict in map(_clause, _CLAUSES.split(text)) if verdict is not None}
    if not verdicts:
        return None
    if verdicts == {False}:
        return False
    one_sex = len(set(_SEX.findall(text))) == 1
    if False in verdicts or one_sex or _QUALIFIED.search(text):
        return f"Yes ({limit})" if (limit := _limit(text)) else "Selective"
    return True


class TheUnderdogScraper(BaseScraper):
    """Scraper for The Underdog rescue organization.

    The Underdog uses a Squarespace-based website that displays all dogs
    on a single page without pagination. Dogs are shown as "products" and
    only available dogs (those without ADOPTED/RESERVED badges) are scraped.
    """

    def __init__(self, config_id: str = "theunderdog", organization_id=None):
        """Initialize The Underdog scraper.

        Args:
            config_id: Configuration ID for The Underdog
            organization_id: Legacy organization ID (optional)
        """
        if organization_id is not None:
            super().__init__(organization_id=organization_id)
        else:
            super().__init__(config_id=config_id)

        self.base_url = "https://www.theunderdog.org"
        self.listing_url = "https://www.theunderdog.org/adopt"

        # Country flag mapping with ISO codes
        self.flag_country_map = {
            "🇬🇧": {"name": "United Kingdom", "iso_code": "GB"},
            "🇨🇾": {"name": "Cyprus", "iso_code": "CY"},
            "🇧🇦": {"name": "Bosnia and Herzegovina", "iso_code": "BA"},
            "🇫🇷": {"name": "France", "iso_code": "FR"},
            "🇷🇴": {"name": "Romania", "iso_code": "RO"},
        }

    def collect_data(self) -> list[dict[str, Any]]:
        """Collect all available dog data.

        This method is called by BaseScraper.run() and must return
        a list of dictionaries containing dog data for database storage.

        Returns:
            List of dog data dictionaries
        """
        # World-class logging: Data collection initiation handled by centralized system

        # Get list of available dogs from listing page
        available_dogs = self.get_animal_list()
        # World-class logging: Available dogs count handled by centralized system

        # Pre-generate external_ids for stale detection
        # Uses self.filtering_service.filter_existing_animals() which records ALL external_ids
        # BEFORE filtering to ensure mark_found_animals_as_seen() works correctly
        for dog in available_dogs:
            if dog.get("url") and "external_id" not in dog:
                dog["external_id"] = self._generate_external_id(dog["url"])
                dog["adoption_url"] = dog["url"]

        # Apply skip_existing_animals filtering
        if self.skip_existing_animals and available_dogs:
            dogs_to_process = self.filtering_service.filter_existing_animals(available_dogs)
        else:
            dogs_to_process = available_dogs

        # Collect detailed data for each dog
        all_dogs_data = []

        for dog_info in dogs_to_process:
            try:
                # Respect rate limiting
                self.respect_rate_limit()

                # Scrape detail page
                dog_data = self.scrape_animal_details(dog_info["url"])

                if dog_data:
                    all_dogs_data.append(dog_data)
                    self.logger.debug(f"Collected data for {dog_data['name']}")

            except Exception as e:
                self.logger.error(f"Error collecting data for {dog_info.get('url', 'unknown')}: {e}")
                continue

        # World-class logging: Collection results handled by centralized system
        return all_dogs_data

    def get_animal_list(self) -> list[dict[str, str]]:
        """Get list of available dogs from listing page.

        Fetches the listing page and extracts information about all
        available dogs. Dogs marked as ADOPTED or RESERVED are excluded.

        Returns:
            List of dictionaries containing:
            - name: Dog name with flag emoji
            - url: Full URL to dog detail page
            - thumbnail_url: URL of thumbnail image
        """
        # Fetch listing page; a failure raises rather than listing no dogs
        soup = self._fetch_listing_page()

        # Find all dog cards
        dog_cards = soup.select(".ProductList-item")
        # World-class logging: Dog cards count handled by centralized system

        available_dogs = []

        for card in dog_cards:
            # Extract basic info
            dog_info = self._extract_dog_info(card)
            if not dog_info:
                continue

            # Check if dog is available (no ADOPTED/RESERVED status) using original name with flag
            if self._is_available_dog(dog_info["original_name"]):
                available_dogs.append(dog_info)
                self.logger.debug(f"Found available dog: {dog_info['name']}")
            else:
                self.logger.debug(f"Skipping unavailable dog: {dog_info['name']}")

        # World-class logging: Available dogs filtering handled by centralized system
        return available_dogs

    def _fetch_listing_page(self) -> BeautifulSoup:
        """Fetch and parse the listing page; ListingIncompleteError if it fails."""
        response = self.get_listing_page(self.listing_url, headers={"User-Agent": "Mozilla/5.0 (compatible; RescueDogAggregator/1.0)"})
        return BeautifulSoup(response.text, "html.parser")

    def _extract_dog_info(self, card) -> dict[str, str] | None:
        """Extract dog information from a card element.

        Args:
            card: BeautifulSoup element for a dog card

        Returns:
            Dictionary with dog info or None if extraction fails
        """
        try:
            # Get title/name
            title_elem = card.select_one(".ProductList-title")
            if not title_elem:
                return None

            name = title_elem.get_text(strip=True)
            # Keep the original name with flag for availability checking
            original_name = name
            # But clean the name for the final result
            clean_name = self._clean_name(name)

            # Get link
            link_elem = card.select_one('a[href^="/adopt/"]')
            if not link_elem:
                return None

            relative_url = link_elem.get("href")
            full_url = urljoin(self.base_url, relative_url)

            # Get thumbnail image
            img_elem = card.select_one(".ProductList-image img")
            thumbnail_url = img_elem.get("src") if img_elem else None

            # Fix protocol-relative URLs
            if thumbnail_url and thumbnail_url.startswith("//"):
                thumbnail_url = "https:" + thumbnail_url

            return {
                "name": clean_name,
                "original_name": original_name,
                "url": full_url,
                "thumbnail_url": thumbnail_url,
            }  # Keep original for availability checking

        except Exception as e:
            self.logger.error(f"Error extracting dog info: {e}")
            return None

    def _is_available_dog(self, name: str) -> bool:
        """Check if a dog is available based on its name/title.

        Available dogs have no status badge. Dogs with ADOPTED or
        RESERVED in their title are not available.

        Args:
            name: Dog name/title from listing

        Returns:
            True if dog is available, False otherwise
        """
        if not name:
            return True

        # Check for status keywords (case-insensitive)
        name_upper = name.upper()
        return "ADOPTED" not in name_upper and "RESERVED" not in name_upper

    def scrape_animal_details(self, url: str) -> dict[str, Any] | None:
        """Scrape detailed information for a single dog.

        Args:
            url: Full URL to dog detail page

        Returns:
            Dictionary with dog data or None if dog should be skipped
        """
        try:
            self.logger.debug(f"Scraping detail page: {url}")

            # Fetch detail page
            soup = self._fetch_detail_page(url)
            if not soup:
                return None

            # Extract basic info - get raw name first for country extraction
            raw_name = self._extract_raw_name(soup)
            if not raw_name:
                self.logger.warning(f"Could not extract name from {url}")
                return None

            # Check if dog is adopted/reserved on detail page (use raw name before cleaning)
            if not self._is_available_dog(raw_name):
                # World-class logging: Status filtering handled by centralized system
                return None

            # Extract country from raw name (with flag emoji)
            country = self._extract_country_from_name(raw_name)

            # Clean the name for final result
            name = self._clean_name(raw_name)

            # Extract all data
            external_id = self._generate_external_id(url)
            hero_image_url = self._extract_hero_image(soup)
            properties, description = self._extract_properties_and_description_from_soup(soup)

            # Ensure properties is never None or completely empty
            if not properties:
                properties = {}

            # Build result dictionary with enhanced properties
            result = {
                "name": name,
                "external_id": external_id,
                "adoption_url": url,
                "primary_image_url": hero_image_url,
                "image_urls": self._extract_image_urls(soup, hero_image_url),
                "properties": {
                    "raw_qa_data": properties,  # Store Q&A pairs
                    "raw_name": name,
                    "page_url": url,
                    # No story on the page: no description key (#568)
                    **({"description": description} if description else {}),
                },
                "animal_type": "dog",
                "status": "available",  # All scraped dogs are available
            }

            # Extract Q&A data for size/weight information
            qa_data = extract_qa_data(result.get("properties", {}))

            # Extract age from Q&A data if available
            if qa_data.get("How old?"):
                # Keep the original text for age_text field
                result["age"] = qa_data["How old?"]

            # Extract sex from Q&A data if available
            if qa_data.get("Male or female?"):
                sex_value = qa_data["Male or female?"].strip().lower()
                if sex_value in ["male", "m"]:
                    result["sex"] = "Male"
                elif sex_value in ["female", "f"]:
                    result["sex"] = "Female"

            # Compatibility and origin from the Q&A (#571). The raw answers stay
            # in raw_qa_data; an answer these words don't settle is left out.
            for question, key in GOOD_WITH_QUESTIONS.items():
                answer = good_with(qa_data.get(question))
                if answer is not None:
                    result["properties"][key] = answer
            # Where the dog comes from, not where it is: never display_location (#574)
            if qa_data.get("Where am I from?"):
                result["properties"]["origin"] = qa_data["Where am I from?"].strip()

            # Ensure ALL critical fields are present for BaseScraper
            # BaseScraper will handle standardization automatically

            # Required fields - these MUST have values
            if not result.get("age"):
                # Try to extract from description as fallback
                result["age"] = self._extract_age_fallback(description)

            if not result.get("sex"):
                # Try to extract from description as fallback
                result["sex"] = self._extract_sex_fallback(description)

            if not result.get("size"):
                # Extract size and weight from Q&A data
                size, weight_kg = extract_size_and_weight_from_qa(qa_data)
                if size:
                    result["size"] = size
                if weight_kg:
                    result["properties"]["weight_kg"] = weight_kg

                # If still no size, try to estimate from weight if available
                if not result.get("size") and weight_kg:
                    try:
                        result["size"] = self._estimate_size_from_weight(float(weight_kg))
                    except (ValueError, TypeError):
                        pass

            # The country is where the dog is
            if country:
                result["properties"]["location"] = country["name"]

            # Apply unified standardization
            return self.process_animal(result)

        except Exception as e:
            self.logger.error(f"Error scraping detail page {url}: {e}")
            return None

    def _fetch_detail_page(self, url: str) -> BeautifulSoup | None:
        """Fetch and parse a detail page.

        Args:
            url: URL to fetch

        Returns:
            BeautifulSoup object or None if error
        """
        try:
            response = requests.get(
                url,
                timeout=self.timeout,
                headers={"User-Agent": "Mozilla/5.0 (compatible; RescueDogAggregator/1.0)"},
            )
            response.raise_for_status()

            return BeautifulSoup(response.text, "html.parser")

        except requests.RequestException as e:
            self.logger.error(f"Error fetching detail page {url}: {e}")
            return None

    def _extract_raw_name(self, soup: BeautifulSoup) -> str | None:
        """Extract raw dog name from detail page (includes flag emoji).

        Args:
            soup: BeautifulSoup object of detail page

        Returns:
            Raw dog name with flag emoji or None if not found
        """
        title_elem = soup.select_one("h1.ProductItem-details-title")
        if title_elem:
            return title_elem.get_text(strip=True)

        # Fallback to any h1
        h1_elem = soup.find("h1")
        if h1_elem:
            return h1_elem.get_text(strip=True)

        return None

    def _extract_name(self, soup: BeautifulSoup) -> str | None:
        """Extract dog name from detail page.

        Args:
            soup: BeautifulSoup object of detail page

        Returns:
            Clean dog name without flag emoji or None if not found
        """
        raw_name = self._extract_raw_name(soup)
        if raw_name:
            return self._clean_name(raw_name)
        return None

    def _clean_name(self, name: str) -> str:
        """Remove country flag emojis and status messages from dog name.

        Args:
            name: Raw name with potential flag emoji and status messages

        Returns:
            Clean name without flag emoji or status messages
        """
        if not name:
            return name

        # Remove all flag emojis from the name
        for flag in self.flag_country_map.keys():
            name = name.replace(flag, "").strip()

        # Remove status messages like "ADOPT ME!", "FOSTER ME!", etc.
        status_patterns = [
            r"\s+ADOPT\s+ME\!*",
            r"\s+FOSTER\s+ME\!*",
            r"\s+RESERVED\!*",
            r"\s+ADOPTED\!*",
            r"\s+URGENT\!*",
            r"\s+AVAILABLE\!*",
        ]

        for pattern in status_patterns:
            name = re.sub(pattern, "", name, flags=re.IGNORECASE).strip()

        # Clean up extra whitespace
        name = re.sub(r"\s+", " ", name).strip()

        return name

    def _extract_image_urls(self, soup: BeautifulSoup, hero_image_url: str | None) -> list[str]:
        """The dog's photos in the Squarespace gallery's order, hero first (#487).

        The slides hold every photo; the thumbnail strip repeats them and the
        header's label is not in the gallery. Photos are requested at the same
        1500w size as the hero so the hero is recognised in the list.
        """
        slides = []
        for img in soup.select(".ProductItem-gallery-slides img[data-src]"):
            src = img["data-src"]
            if not src.startswith("http") or "primary_ud_label" in src.lower():
                continue
            if "?format=" not in src and src.lower().endswith((".jpg", ".jpeg", ".png")):
                src += "?format=1500w"
            slides.append(src)
        return gallery_urls(hero_image_url, slides)

    def _extract_hero_image(self, soup: BeautifulSoup) -> str | None:
        """Extract main hero image URL from detail page.

        Args:
            soup: BeautifulSoup object of detail page

        Returns:
            Hero image URL or None if not found
        """
        # PRIORITY 1: Extract from data-src attributes (working Squarespace URLs)
        gallery_imgs = soup.select(".ProductItem-gallery img[data-src]")
        for img in gallery_imgs:
            data_src_attr = img.get("data-src", "")
            data_src = "".join(data_src_attr) if isinstance(data_src_attr, list) else data_src_attr
            alt_attr = img.get("alt", "")
            alt = "".join(alt_attr) if isinstance(alt_attr, list) else str(alt_attr or "")

            if data_src and alt:
                # Skip organization logo
                if "underdog" in alt.lower() and "international" in alt.lower():
                    continue
                if "primary_ud_label" in data_src.lower():
                    continue

                # Found a valid dog image with full Squarespace URL
                if data_src.startswith("http"):
                    # Add format parameter for optimized loading if not present
                    if "?format=" not in data_src and data_src.endswith((".jpg", ".jpeg", ".png")):
                        data_src += "?format=1500w"
                    return data_src

        # PRIORITY 2: Handle Squarespace lazy loading by extracting from alt attributes (fallback)
        gallery_imgs = soup.select(".ProductItem-gallery-slides img")
        for img in gallery_imgs:
            alt_attr = img.get("alt", "")
            alt = "".join(alt_attr) if isinstance(alt_attr, list) else str(alt_attr or "")
            if alt and alt != "Underdog International" and alt.lower() != "no src":
                # Skip organization logo
                if "underdog" in alt.lower() and "international" in alt.lower():
                    continue
                # Construct URL from alt filename
                constructed_url = self._construct_squarespace_url(alt)
                if constructed_url:
                    return constructed_url

        # PRIORITY 3: Try traditional src-based extraction (final fallback)
        selectors = [
            ".ProductItem-gallery img",
            ".gallery-slides img",
            ".product-gallery img",
            'img[src*="static1.squarespace.com"]',
            'img[src*="images.squarespace"]',
        ]

        for selector in selectors:
            img = soup.select_one(selector)
            if img and img.get("src"):
                src_attr = img.get("src")
                src = "".join(src_attr) if isinstance(src_attr, list) else src_attr
                # Skip small thumbnails, icons, or org logos
                if any(skip in src.lower() for skip in ["thumb", "icon", "logo", "primary_ud_label"]):
                    continue
                # Fix protocol-relative URLs
                if src.startswith("//"):
                    src = "https:" + src
                return src

        return None

    def _construct_squarespace_url(self, alt_filename: str) -> str | None:
        """Construct Squarespace CDN URL from alt attribute filename.

        Args:
            alt_filename: Filename from img alt attribute

        Returns:
            Full CDN URL or None if construction fails
        """
        if not alt_filename or alt_filename == "No src":
            return None

        # Base Squarespace CDN pattern observed from the site
        base_cdn = "https://images.squarespace-cdn.com/content/v1/5c40fa0e1aef1d1aa24274ea"

        # Clean the filename - remove URL encoding artifacts
        clean_filename = alt_filename.replace("+", " ").replace("%28", "(").replace("%29", ")")

        # Try common Squarespace patterns
        possible_paths = [
            f"{base_cdn}/{clean_filename}",
            f"{base_cdn}/images/{clean_filename}",
            f"{base_cdn}/content/{clean_filename}",
        ]

        # Return the first valid-looking URL
        for url in possible_paths:
            if clean_filename.lower().endswith((".jpg", ".jpeg", ".png", ".gif")):
                return url

        return None

    def _extract_properties_and_description_from_soup(self, soup: BeautifulSoup) -> tuple[dict[str, str], str]:
        """Extract properties and description from detail page.

        Args:
            soup: BeautifulSoup object of detail page

        Returns:
            Tuple of (properties dict, description text)
        """
        # Find the excerpt section containing all information
        excerpt_elem = soup.select_one(".ProductItem-details-excerpt")
        if not excerpt_elem:
            return {}, ""

        # Get the text content
        excerpt_text = str(excerpt_elem)

        return self._extract_properties_and_description(excerpt_text)

    def _extract_properties_and_description(self, text: str) -> tuple[dict[str, str], str]:
        """Extract properties and description from text content.

        Args:
            text: HTML text containing properties and description

        Returns:
            Tuple of (properties dict, description text)
        """
        properties: dict[str, str] = {}

        # Parse HTML and convert <br> tags to newlines
        soup = BeautifulSoup(text, "html.parser")

        # Get text content, using a separator to handle <br> tags
        text_content = soup.get_text(separator="\n")

        # Split into lines and process
        lines = text_content.split("\n")

        in_description = False
        current_description = []

        i = 0
        while i < len(lines):
            line = lines[i].strip()
            if not line:
                i += 1
                continue

            # Look for property patterns - handle Q&A on separate lines
            if line.endswith("?") and not in_description:
                # Check if this looks like a property we want
                if any(
                    keyword in line
                    for keyword in [
                        "How big",
                        "How old",
                        "Male or female",
                        "Living with",
                        "Where can",
                        "Resident dog",
                        "Where am",
                    ]
                ):
                    # Look for the answer on the next line
                    if i + 1 < len(lines):
                        next_line = lines[i + 1].strip()
                        if next_line and not next_line.endswith("?"):
                            # Check if answer contains "About" - if so, split it
                            if "About " in next_line:
                                about_index = next_line.find("About ")
                                actual_value = next_line[:about_index].strip()
                                about_text = next_line[about_index:]

                                properties[line] = actual_value

                                # Start collecting description after "About [Name]"
                                about_match = re.match(r"About\s+\w+(.*)$", about_text, re.DOTALL)
                                if about_match:
                                    desc_start = about_match.group(1).strip()
                                    if desc_start:
                                        current_description.append(desc_start)
                                    in_description = True
                            else:
                                properties[line] = next_line
                            i += 2  # Skip both question and answer lines
                            continue

            # Look for combined property patterns (question and answer on same line)
            property_match = re.match(r"^(.+?)\?\s*(.+)$", line)
            if property_match and not in_description:
                key_part = property_match.group(1).strip()
                value_part = property_match.group(2).strip()

                # Check if this looks like a property we want
                if any(
                    keyword in key_part
                    for keyword in [
                        "How big",
                        "How old",
                        "Male or female",
                        "Living with",
                        "Where can",
                        "Resident dog",
                        "Where am",
                    ]
                ):
                    key = key_part + "?"

                    # Check if value contains "About" - if so, split it
                    if "About " in value_part:
                        about_index = value_part.find("About ")
                        actual_value = value_part[:about_index].strip()
                        about_text = value_part[about_index:]

                        properties[key] = actual_value

                        # Start collecting description after "About [Name]"
                        about_match = re.match(r"About\s+\w+(.*)$", about_text, re.DOTALL)
                        if about_match:
                            desc_start = about_match.group(1).strip()
                            if desc_start:
                                current_description.append(desc_start)
                            in_description = True
                    else:
                        properties[key] = value_part
                    i += 1
                    continue

            # Check if we're starting the "About" section
            if re.match(r"^About\s+\w+", line) and not in_description:
                in_description = True
                # Extract text after "About [Name]"
                about_match = re.match(r"About\s+\w+(.*)$", line, re.DOTALL)
                if about_match:
                    desc_start = about_match.group(1).strip()
                    if desc_start:
                        current_description.append(desc_start)
                i += 1
                continue

            # If we're in description mode, collect text
            if in_description:
                current_description.append(line)

            i += 1

        description = " ".join(current_description).strip()

        return properties, description

    def _extract_country_from_name(self, name: str) -> dict[str, str] | None:
        """Extract country from flag emoji in name.

        Args:
            name: Dog name containing flag emoji

        Returns:
            Country dict with name and iso_code or None if no flag found
        """
        for flag, country_info in self.flag_country_map.items():
            if flag in name:
                return country_info
        return None

    def _generate_external_id(self, url: str) -> str:
        """Generate external ID from URL with organization prefix.

        Args:
            url: Dog detail page URL

        Returns:
            External ID with 'tud-' prefix to prevent collisions
        """
        # Extract the last part of the URL path and add org prefix
        slug = url.rstrip("/").split("/")[-1]
        return f"tud-{slug}"

    def _extract_age_fallback(self, description: str) -> str | None:
        """Extract age from description as fallback.

        Args:
            description: Dog description text

        Returns:
            Age text or None if not found
        """
        if not description:
            return None

        # Look for age patterns in description
        age_patterns = [
            (r"(\d+)\s+years?\s+old", "years"),
            (r"(\d+)\s+months?\s+old", "months"),
            (r"around\s+(\d+)\s+years?", "years"),
            (r"approximately\s+(\d+)\s+years?", "years"),
            (r"believed\s+to\s+be\s+around\s+(\d+)\s+years?", "years"),
            (r"believed\s+to\s+be\s+around\s+(\w+)\s+years?", "years_word"),
            (r"(\d+)\s*-\s*(\d+)\s+years?", "years"),
            (r"(puppy|young|adult|senior)", "category"),
        ]

        for pattern, unit in age_patterns:
            match = re.search(pattern, description.lower())
            if match:
                if unit == "years":
                    if "-" in match.group(0):
                        return match.group(0)
                    else:
                        return f"{match.group(1)} years"
                elif unit == "years_word":
                    # Convert word numbers to digits
                    word_to_num = {
                        "one": "1",
                        "two": "2",
                        "three": "3",
                        "four": "4",
                        "five": "5",
                        "six": "6",
                        "seven": "7",
                        "eight": "8",
                        "nine": "9",
                        "ten": "10",
                    }
                    word = match.group(1).lower()
                    if word in word_to_num:
                        return f"{word_to_num[word]} years"
                elif unit == "months":
                    return f"{match.group(1)} months"
                elif unit == "category":
                    return match.group(1)

        return None

    def _extract_sex_fallback(self, description: str) -> str | None:
        """Extract sex from description as fallback.

        Args:
            description: Dog description text

        Returns:
            Sex ("Male"/"Female") or None if not found
        """
        if not description:
            return None

        desc_lower = description.lower()

        # Look for gender indicators with word boundaries to avoid false positives
        import re

        # Female indicators
        female_patterns = [r"\bshe\b", r"\bher\b", r"\bfemale\b", r"\bgirl\b"]

        # Male indicators
        male_patterns = [r"\bhe\b", r"\bhis\b", r"\bhim\b", r"\bmale\b", r"\bboy\b"]

        # Check for female patterns
        for pattern in female_patterns:
            if re.search(pattern, desc_lower):
                return "Female"

        # Check for male patterns
        for pattern in male_patterns:
            if re.search(pattern, desc_lower):
                return "Male"

        return None

    def _estimate_size_from_weight(self, weight_kg: float) -> str:
        """Estimate size category from weight.

        Args:
            weight_kg: Weight in kilograms

        Returns:
            Size category
        """
        if weight_kg < 5:
            return "Tiny"
        elif weight_kg < 12:
            return "Small"
        elif weight_kg < 25:
            return "Medium"
        elif weight_kg < 40:
            return "Large"
        else:
            return "XLarge"
