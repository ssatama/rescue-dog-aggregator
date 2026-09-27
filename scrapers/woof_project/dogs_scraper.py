"""Scraper implementation for Woof Project organization."""

import re
from typing import Any
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup, Tag

from scrapers.base_scraper import BaseScraper
from utils.shared_extraction_patterns import gallery_urls

USER_AGENT = "Mozilla/5.0 (compatible; RescueDogAggregator/1.0)"

# A dog's own page: /adoption/<slug>/, not /adoption/page/2/
DOG_PAGE = re.compile(r"/adoption/(?!page/)[^/]+/?$")

# Headings above an unavailable dog's name; pages 4 and 5 write them in title
# case, and one card says it in Dutch
STATUS_BADGES = {"adopted", "reserved", "geadopteerd", "gereserveerd"}


class WoofProjectScraper(BaseScraper):
    """Scraper for Woof Project rescue organization.

    Woof Project is a WordPress site. The listing is plain HTML, one
    <article class="type-adoption"> card per dog; an adopted or reserved
    dog has a status heading above its name and is skipped.
    """

    def __init__(self, config_id: str = "woof-project", organization_id=None):
        """Initialize Woof Project scraper.

        Args:
            config_id: Configuration ID for Woof Project
            organization_id: Legacy organization ID (optional)
        """
        if organization_id is not None:
            super().__init__(organization_id=organization_id)
        else:
            super().__init__(config_id=config_id)

        self.base_url = "https://woofproject.eu"
        self.listing_url = "https://woofproject.eu/adoption/"

    def collect_data(self) -> list[dict[str, Any]]:
        """Collect all available dog data.

        This method is called by BaseScraper.run() and must return
        a list of dictionaries containing dog data for database storage.

        Returns:
            List of dog data dictionaries
        """
        # World-class logging: Data collection initiation handled by centralized system

        # Get all available dogs from all pages
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
            self._sync_filtering_stats()
        else:
            self.total_animals_before_filter = len(available_dogs)
            self.total_animals_skipped = 0
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

    def _standardize_name(self, name: str) -> str:
        """Standardize dog name to proper title case.

        Converts names like "LISBON" to "Lisbon" following other scraper patterns.

        Args:
            name: Raw dog name

        Returns:
            Standardized name in title case
        """
        if not name:
            return "Unknown"

        # Clean up the name
        cleaned = name.strip()

        # Convert to title case
        # Handle hyphenated names properly (e.g., "MAX-ZEUS" -> "Max-Zeus")
        if "-" in cleaned:
            parts = cleaned.split("-")
            standardized_parts = [part.title() for part in parts]
            return "-".join(standardized_parts)
        else:
            return cleaned.title()

    def get_animal_list(self) -> list[dict[str, str]]:
        """Available dogs from the listing, read as plain HTML (#565).

        The listing puts the available dogs first and the adoption archive
        after them, so the next page is read only while a page lists an
        available dog: page 2 today, which has none. The archive holds old
        dogs without a status (Billy, page 3), so reading every page would
        bring them back. A page that fails to load raises
        ListingIncompleteError: the dogs on it would go stale.
        """
        dogs: list[dict[str, str]] = []
        seen: set[str] = set()
        url: str | None = self.listing_url
        while url and url not in seen:
            seen.add(url)  # get_listing_page keeps the org's rate between pages
            soup = BeautifulSoup(self.get_listing_page(url, headers={"User-Agent": USER_AGENT}).text, "html.parser")
            page = [dog for dog in map(self._available_dog, soup.select("article.type-adoption")) if dog]
            dogs.extend(page)
            url = self._next_page_url(soup, url) if page else None
        return dogs

    def _available_dog(self, card: Tag) -> dict[str, str] | None:
        """The dog on a listing card, or None if it is adopted or reserved."""
        headings = [h2.get_text(" ", strip=True) for h2 in card.find_all("h2")]
        link = card.find("a", href=DOG_PAGE)
        if not headings or link is None:
            self.logger.warning(f"Listing card without a name or dog link: {card.get('id')}")
            return None

        *above, name = headings
        if any(heading.lower() in STATUS_BADGES for heading in above):
            return None
        if above:
            # A heading the site hasn't used before: keep the dog rather than hide it
            self.logger.warning(f"Unknown heading {above!r} above {name}: listed as available")
        return {"name": name, "url": urljoin(self.base_url, str(link["href"]))}

    def _next_page_url(self, soup: BeautifulSoup, page_url: str) -> str | None:
        """The link after the current page in the listing's pagination, if any."""
        current = soup.select_one("nav.elementor-pagination .current")
        next_link = current.find_next_sibling("a", class_="page-numbers") if current else None
        return urljoin(page_url, str(next_link["href"])) if next_link else None

    def scrape_animal_details(self, url: str) -> dict[str, Any] | None:
        """Scrape detailed information for a single dog with NULL prevention.

        Args:
            url: Full URL to dog detail page

        Returns:
            Dictionary with dog data or None if error
        """
        try:
            self.logger.debug(f"Scraping detail page: {url}")

            # Fetch detail page
            soup = self._fetch_detail_page(url)
            if not soup:
                return None

            # Extract all data from detail page. The labelled "Looks like / Sex / Estimated age /
            # Size" block is authoritative; the free-text extractors are only fallbacks.
            external_id = self._generate_external_id(url)
            name = self._extract_name_from_detail(soup)
            fields = self._extract_labelled_fields(soup)
            breed = fields.get("looks like") or self._extract_breed_from_detail(soup)
            # A present label is authoritative even when unrecognised: don't guess from page text
            age = self._normalize_age(fields["estimated age"]) if "estimated age" in fields else self._extract_age_from_detail(soup)
            size = self._normalize_size(fields["size"]) if "size" in fields else self._extract_size_from_detail(soup)
            description = self._extract_description_from_detail(soup)
            primary_image_url = self._extract_primary_image_from_detail(soup)
            sex = self._normalize_sex(fields.get("sex")) or self._extract_sex_from_description(description or "")

            # Apply standardization to name only (breed/size/age handled by unified standardizer)
            standardized_name = self._standardize_name(name or "Unknown")

            # Missing values stay None: never store a breed, size, age or sex the rescue didn't state
            result = {
                "name": standardized_name,
                "external_id": external_id,
                "adoption_url": url,
                "primary_image_url": primary_image_url,
                "image_urls": self._extract_image_urls_from_detail(soup, primary_image_url),
                "description": description or "Rescue dog from Woof Project available for adoption",
                "breed": breed,
                "age": age,
                "size": size,
                "sex": sex,
                "animal_type": "dog",
                "status": "available",
            }

            properties = {
                "description": description or "No description available",
                "raw_name": name or "Unknown",
                "raw_description": description or "No description available",
                "breed": breed,
                "age_text": age,
                "size": size,
                "sex": sex,
                "location": fields.get("location"),
                "page_url": url,
                "source_page": url,
                "extracted_fields": {
                    "name_source": "title" if name else "default",
                    "breed_source": "label" if fields.get("looks like") else ("pattern" if breed else "default"),
                    "age_source": "label" if fields.get("estimated age") else ("pattern" if age else "default"),
                    "size_source": "label" if fields.get("size") else ("pattern" if size else "default"),
                },
            }

            result["properties"] = properties

            self.logger.debug(f"Extracted data for {result['name']}: breed={result['breed']}, age={result.get('age', 'Unknown')}, size={result['size']}")

            # Apply unified standardization
            return self.process_animal(result)

        except Exception as e:
            self.logger.error(f"Error scraping detail page {url}: {e}")
            return None

    def _extract_labelled_fields(self, soup: BeautifulSoup) -> dict[str, str]:
        """Read the "Looks like: / Sex: / Location: / Estimated age: / Size:" block.

        The page renders all labels as consecutive headings, then the values in the same order.
        Returns lower-cased label -> value, or {} if the block is absent.
        """
        headings = [h.get_text(" ", strip=True) for h in soup.find_all(class_="elementor-heading-title")]
        labels: list[str] = []
        for i, text in enumerate(headings):
            if text.endswith(":"):
                labels.append(text[:-1].strip().lower())
            elif labels:
                values = headings[i : i + len(labels)]
                return {label: value for label, value in zip(labels, values) if value}
        return {}

    def _normalize_sex(self, value: str | None) -> str | None:
        text = (value or "").strip().lower()
        if text in ("male", "reu"):
            return "Male"
        if text in ("female", "teef"):
            return "Female"
        return None

    def _normalize_age(self, value: str | None) -> str | None:
        """Pass the stated age through, translating the Dutch units some pages use ("2 jaar")."""
        if not value:
            return None
        text = re.sub(r"\bjaar\b", "years", value, flags=re.IGNORECASE)
        return re.sub(r"\bmaand(en)?\b", "months", text, flags=re.IGNORECASE)

    # Checked in this order so "extra small" isn't read as small and "middelgroot" isn't read as groot
    _SIZE_PATTERNS = (
        ("Tiny", r"\b(tiny|x[- ]?small|xtra small|extra small)\b"),
        ("Medium", r"medium|middel\w*"),
        ("Small", r"small|klein"),
        ("Large", r"large|groot|giant"),
    )
    _SIZE_ORDER = ("Tiny", "Small", "Medium", "Large")

    def _normalize_size(self, value: str | None) -> str | None:
        """Map "Medium size dog", "Middelgroot", "Xtra Small" etc. to a size category.

        A range ("Small to Medium", "Medium to large") takes its upper end, the size the dog grows to.
        """
        text = (value or "").lower()
        found = set()
        for category, pattern in self._SIZE_PATTERNS:
            if re.search(pattern, text):
                found.add(category)
                text = re.sub(pattern, " ", text)
        return max(found, key=self._SIZE_ORDER.index) if found else None

    def _extract_sex_from_description(self, description: str) -> str | None:
        """Extract sex from description text using pronoun analysis.

        Args:
            description: Description text

        Returns:
            Sex (Male/Female) or None if not found
        """
        if not description:
            return None

        desc_lower = description.lower()

        # Look for gender indicators with word boundaries
        import re

        # Female indicators
        female_patterns = [r"\bshe\b", r"\bher\b", r"\bfemale\b", r"\bgirl\b"]
        # Male indicators
        male_patterns = [r"\bhe\b", r"\bhis\b", r"\bhim\b", r"\bmale\b", r"\bboy\b"]

        female_count = sum(1 for pattern in female_patterns if re.search(pattern, desc_lower))
        male_count = sum(1 for pattern in male_patterns if re.search(pattern, desc_lower))

        if female_count > male_count:
            return "Female"
        elif male_count > female_count:
            return "Male"

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
                headers={"User-Agent": USER_AGENT},
            )
            response.raise_for_status()

            return BeautifulSoup(response.text, "html.parser")

        except Exception as e:
            self.logger.error(f"Error fetching detail page {url}: {e}")
            return None

    def _generate_external_id(self, url: str) -> str:
        """Generate external ID from URL with organization prefix.

        Args:
            url: Dog detail page URL

        Returns:
            External ID with 'wp-' prefix to prevent collisions
        """
        # Extract the last part of the URL path and add org prefix
        slug = url.rstrip("/").split("/")[-1]
        return f"wp-{slug}"

    def _extract_name_from_detail(self, soup: BeautifulSoup) -> str | None:
        """Extract dog name from detail page.

        Args:
            soup: BeautifulSoup object of detail page

        Returns:
            Dog name or None if not found
        """
        # Try h1 tag first
        h1_tag = soup.find("h1")
        if h1_tag:
            name = h1_tag.get_text(strip=True)
            if name and name != "Woof Project":  # Skip site title
                return name

        # For Elementor-based pages, look for H2 with elementor-heading-title class
        h2_headings = soup.find_all("h2", class_="elementor-heading-title")
        for h2 in h2_headings:
            h2_text = h2.get_text(strip=True)
            # Look for patterns like "Meet DOGNAME" or just "DOGNAME"
            if h2_text.startswith("Meet "):
                # Extract name after "Meet "
                name = h2_text[5:].strip()
                if name and self._looks_like_dog_name(name):
                    return name
            elif h2_text.startswith("About "):
                # Extract name after "About "
                name = h2_text[6:].strip()
                if name and self._looks_like_dog_name(name):
                    return name
            elif self._looks_like_dog_name(h2_text):
                # Direct dog name
                return h2_text

        # Try title tag as fallback
        title_tag = soup.find("title")
        if title_tag:
            title_text = title_tag.get_text(strip=True)
            # Extract name before " - Woof Project"
            if " - " in title_text:
                name = title_text.split(" - ")[0].strip()
                if name:
                    return name

        return None

    def _extract_breed_from_detail(self, soup: BeautifulSoup) -> str | None:
        """Extract breed from detail page with comprehensive fallback.

        Args:
            soup: BeautifulSoup object of detail page

        Returns:
            Breed or None if not found
        """
        # Look for breed in content
        content_area = soup.find("div", class_="post-content") or soup

        # Primary: Look for paragraphs with "Breed:" pattern
        for p in content_area.find_all("p"):
            p_text = p.get_text().strip()
            if "breed:" in p_text.lower():
                # Extract text after "Breed:"
                parts = p_text.split(":")
                if len(parts) > 1:
                    breed = parts[1].strip()
                    if breed:
                        return breed

        # Fallback: Look for common breed names in any text
        text_content = content_area.get_text().lower()

        # Common dog breeds to look for
        common_breeds = [
            "labrador",
            "golden retriever",
            "german shepherd",
            "bulldog",
            "poodle",
            "beagle",
            "rottweiler",
            "yorkshire terrier",
            "dachshund",
            "siberian husky",
            "boxer",
            "border collie",
            "cocker spaniel",
            "australian shepherd",
            "chihuahua",
            "shih tzu",
            "boston terrier",
            "pomeranian",
            "mastiff",
            "pointer",
            "hound",
            "terrier",
            "spaniel",
            "retriever",
            "shepherd",
            "mixed breed",
            "cross",
            "mix",
        ]

        for breed in common_breeds:
            if breed in text_content:
                # Capitalize properly
                return " ".join(word.capitalize() for word in breed.split())

        return None

    def _extract_age_from_detail(self, soup: BeautifulSoup) -> str | None:
        """Extract age from detail page with comprehensive fallback.

        Args:
            soup: BeautifulSoup object of detail page

        Returns:
            Age text or None if not found
        """
        # Look for age in content
        content_area = soup.find("div", class_="post-content") or soup

        # Primary: Look for paragraphs with "Age:" pattern
        for p in content_area.find_all("p"):
            p_text = p.get_text().strip()
            if "age:" in p_text.lower():
                # Extract text after "Age:"
                parts = p_text.split(":")
                if len(parts) > 1:
                    age = parts[1].strip()
                    if age:
                        return age

        # Fallback: Look for age patterns in text
        text_content = content_area.get_text()

        import re

        age_patterns = [
            (r"(\d+)\s+years?\s+old", lambda m: f"{m.group(1)} years"),
            (r"(\d+)\s+months?\s+old", lambda m: f"{m.group(1)} months"),
            (r"around\s+(\d+)\s+years?", lambda m: f"around {m.group(1)} years"),
            (
                r"approximately\s+(\d+)\s+years?",
                lambda m: f"approximately {m.group(1)} years",
            ),
            (
                r"(\d+)\s*-\s*(\d+)\s+years?",
                lambda m: f"{m.group(1)}-{m.group(2)} years",
            ),
            # Pattern for "♡ DOGNAME, 2 years (Estimated DOB...)"
            (r"♡\s+[A-Z]+,\s+(\d+)\s+years?", lambda m: f"{m.group(1)} years"),
            # Pattern for just "2 years" after commas
            (r",\s+(\d+)\s+years?", lambda m: f"{m.group(1)} years"),
            (r"\b(puppy|young|adult|senior)\b", lambda m: m.group(1)),
        ]

        for pattern, formatter in age_patterns:
            match = re.search(pattern, text_content, re.IGNORECASE)
            if match:
                return formatter(match)

        return None

    def _extract_size_from_detail(self, soup: BeautifulSoup) -> str | None:
        """Extract size from detail page with comprehensive fallback.

        Args:
            soup: BeautifulSoup object of detail page

        Returns:
            Size or None if not found
        """
        # Look for size in content
        content_area = soup.find("div", class_="post-content") or soup

        # Primary: Look for paragraphs with "Size:" pattern
        for p in content_area.find_all("p"):
            p_text = p.get_text().strip()
            if "size:" in p_text.lower():
                # Extract text after "Size:"
                parts = p_text.split(":")
                if len(parts) > 1:
                    size = parts[1].strip()
                    if size:
                        return size

        # Fallback: Look for size indicators in text
        text_content = content_area.get_text().lower()

        # Size patterns to look for
        size_patterns = [
            ("small", ["small", "tiny", "little"]),
            ("medium", ["medium", "mid-size", "mid size"]),
            ("large", ["large", "big"]),
            ("extra large", ["extra large", "xlarge", "x-large", "huge", "giant"]),
        ]

        for size_category, keywords in size_patterns:
            for keyword in keywords:
                if keyword in text_content:
                    return size_category.capitalize()

        # Fallback: Look for weight mentions and estimate size
        import re

        weight_patterns = [
            r"(\d+)\s*(?:kg|kilos?|pounds?|lbs?)",
            r"weighs?\s+(\d+)",
        ]

        for pattern in weight_patterns:
            match = re.search(pattern, text_content)
            if match:
                try:
                    weight = float(match.group(1))
                    # Assume kg if not specified, convert rough estimates
                    if weight > 50:  # Likely pounds
                        weight_kg = weight * 0.453592
                    else:
                        weight_kg = weight

                    return self._estimate_size_from_weight(weight_kg)
                except (ValueError, TypeError):
                    continue

        return None

    def _estimate_size_from_weight(self, weight_kg: float) -> str:
        """Estimate size category from weight.

        Args:
            weight_kg: Weight in kilograms

        Returns:
            Size category
        """
        if weight_kg < 5:
            return "Small"
        elif weight_kg < 12:
            return "Small"
        elif weight_kg < 25:
            return "Medium"
        elif weight_kg < 40:
            return "Large"
        else:
            return "Extra Large"

    def _extract_description_from_detail(self, soup: BeautifulSoup) -> str | None:
        """Extract clean description using multi-stage filtering pipeline.

        Args:
            soup: BeautifulSoup object of detail page

        Returns:
            Clean description text or None if not found
        """
        # Use optimized pattern-based extraction (no complex DOM traversal needed)
        return self._extract_filtered_description(soup)

    def _extract_filtered_description(self, soup: BeautifulSoup) -> str | None:
        """Multi-stage filtering pipeline for clean description extraction.

        Based on comprehensive analysis, uses a 3-stage approach:
        1. Find story start patterns
        2. Truncate at end markers
        3. Sanitize remaining metadata

        Args:
            soup: BeautifulSoup object of detail page

        Returns:
            Clean description text or None if not found
        """
        import re

        # Get all text content
        content_area = soup.find("div", class_="post-content") or soup
        full_text = content_area.get_text(separator=" ", strip=True) if content_area else ""

        if not full_text:
            return None

        # STAGE 1: Find story start patterns (most reliable)
        story_start_patterns = [
            r"are you looking for",
            r"hi,?\s+i\s+am",
            r"hello,?\s+(my\s+name\s+is|i\s+am)",
            r"let\s+me\s+tell\s+you",
            r"my\s+name\s+is",
            r"hoi,?\s+ik\s+ben",
        ]

        description = None
        for pattern in story_start_patterns:
            match = re.search(pattern, full_text, re.IGNORECASE)
            if match:
                description = full_text[match.start() :]
                self.logger.debug(f"Found story start with pattern: {pattern}")
                break

        # If no story start found, try removing navigation blocks from beginning
        if not description:
            # Remove everything before the actual content
            navigation_removal_patterns = [
                r"^.*?adopt\s+me\s+\w+\s+looks\s+like:.*?(?=are\s+you|hi,?\s+i|hello|let\s+me|my\s+name)",
                r"^.*?skip\s+to\s+content.*?(?=are\s+you|hi,?\s+i|hello|let\s+me|my\s+name)",
                r"^.*?home\s+adopt\s+volunteer.*?(?=are\s+you|hi,?\s+i|hello|let\s+me|my\s+name)",
                r"^.*?woof\s+project.*?(?=are\s+you|hi,?\s+i|hello|let\s+me|my\s+name)",
            ]

            description = full_text
            for nav_pattern in navigation_removal_patterns:
                description = re.sub(nav_pattern, "", description, flags=re.IGNORECASE)
                if len(description) < len(full_text):  # If pattern matched and removed content
                    self.logger.debug(f"Removed navigation with pattern: {nav_pattern[:50]}...")
                    break

        # STAGE 2: Truncate at end markers
        end_markers = [
            "share this:",
            "sharing is caring",
            "adoption application",
            "previous post",
            "next post",
            "– woof project",
            "woof project",
            "let's home them all",
            "site map",
            "legal",
            "welcome to our family",  # newsletter sign-up form
        ]

        earliest_end_index = len(description)
        for marker in end_markers:
            index = description.lower().find(marker.lower())
            if index != -1:
                earliest_end_index = min(earliest_end_index, index)
                self.logger.debug(f"Found end marker: {marker}")

        description = description[:earliest_end_index]

        # STAGE 3: Sanitize metadata patterns
        unwanted_patterns = [
            r"adopt\s+me\s+\w+",  # "Adopt Me LISBON"
            r"looks\s+like:.*?(?=\.|$|[A-Z])",  # "Looks like: Breed info"
            r"sex:.*?(?=\.|$|[A-Z])",  # "Sex: Male"
            r"location:.*?(?=\.|$|[A-Z])",  # "Location: Cyprus"
            r"estimated\s+age:.*?(?=\.|$|[A-Z])",  # "Estimated age: 2 years"
            r"size:.*?(?=\.|$|[A-Z])",  # "Size: Medium"
            r"ask\s+about\s+\w+",  # "Ask About LISBON"
            r"house\s+trained.*?(?=\.|$|[A-Z])",  # Metadata fields
            r"health.*?(?=\.|$|[A-Z])",  # Health info
            r"prefers\s+home\s+with.*?(?=\.|$|[A-Z])",  # Home preferences
        ]

        for pattern in unwanted_patterns:
            before_length = len(description)
            description = re.sub(pattern, "", description, flags=re.IGNORECASE)
            if len(description) < before_length:
                self.logger.debug(f"Removed metadata with pattern: {pattern[:30]}...")

        # Final cleanup
        description = re.sub(r"\s+", " ", description).strip()

        # Quality check - must have substantial content
        if len(description) < 50:
            self.logger.debug(f"Description too short ({len(description)} chars), using fallback")
            fallback_text = re.sub(r"\s+", " ", full_text).strip()
            return fallback_text if fallback_text else None

        self.logger.debug(f"Extracted {len(description)} chars using multi-stage pipeline")
        return description

    def _extract_image_urls_from_detail(self, soup: BeautifulSoup, primary_image_url: str | None) -> list[str]:
        """The dog's photos: the chosen hero, then each linked upload in page order (#487).

        Every photo on the page is an image linking to its full-size upload.
        The site's icons and logo are plain images, not links, and video
        thumbnails link elsewhere.
        """
        links = []
        for link in soup.find_all("a", href=True):
            href = urljoin(self.base_url, link["href"])
            if "/wp-content/uploads/" in href and link.find("img") and href.lower().split("?", 1)[0].endswith((".jpg", ".jpeg", ".png", ".webp")):
                links.append(href)
        return gallery_urls(primary_image_url, links)

    def _extract_primary_image_from_detail(self, soup: BeautifulSoup) -> str | None:
        """Extract primary image URL from detail page.

        Prioritizes wp-content/uploads images (actual dog photos) over other images.

        Args:
            soup: BeautifulSoup object of detail page

        Returns:
            Primary image URL or None if not found
        """
        # Find all img tags in the entire document
        img_tags = soup.find_all("img")

        # Collect all potential image URLs
        candidate_images = []

        for img in img_tags:
            src = img.get("src")
            if not src:
                continue

            # Ensure absolute URL
            if src.startswith("//"):
                src = "https:" + src
            elif src.startswith("/"):
                src = self.base_url + src
            elif not src.startswith("http"):
                src = urljoin(self.base_url, src)

            # Skip obvious non-dog images
            src_lower = src.lower()
            if any(skip in src_lower for skip in ["icon", "logo", "favicon", "button", "header", "footer"]):
                continue

            # Add to candidates with priority scoring
            priority = self._score_image_priority(src, img)
            if priority > 0:
                candidate_images.append((priority, src))

        # Sort by priority (highest first) and return best match
        if candidate_images:
            candidate_images.sort(key=lambda x: x[0], reverse=True)
            return candidate_images[0][1]

        return None

    def _score_image_priority(self, src: str, img_tag) -> int:
        """Score image priority for selection as primary dog photo.

        Args:
            src: Image source URL
            img_tag: BeautifulSoup img element

        Returns:
            Priority score (higher = better, 0 = skip)
        """
        src_lower = src.lower()

        # Skip obvious site/UI images first
        if any(skip in src_lower for skip in ["icon", "logo", "login", "video_icon", "thumb"]):
            return 0

        # HIGHEST PRIORITY: wp-content/uploads images from current year (actual dog photos)
        if "wp-content/uploads" in src_lower:
            # Prioritize current/recent year images (likely fresh dog photos)
            if "/2025/" in src_lower or "/2024/" in src_lower:
                score = 120
            else:
                score = 80

            # Bonus for high resolution images (likely main dog photos)
            width = img_tag.get("width")
            height = img_tag.get("height")
            if width and height:
                try:
                    w, h = int(width), int(height)
                    if w >= 1000 and h >= 1000:  # High res photos
                        score += 20
                    elif w >= 500 and h >= 400:  # Medium res photos
                        score += 10
                except (ValueError, TypeError):
                    pass

            # Bonus for JPEG format (photos vs icons)
            if src_lower.endswith((".jpg", ".jpeg")):
                score += 10

            return score

        # HIGH PRIORITY: Images with dog-related alt text
        alt_text = (img_tag.get("alt", "") or "").lower()
        if any(word in alt_text for word in ["dog", "puppy", "pet", "rescue", "adopt"]):
            return 80

        # MEDIUM PRIORITY: Large images likely to be main photos
        # Check for size attributes or class names suggesting large images
        width = img_tag.get("width")
        height = img_tag.get("height")
        img_class = img_tag.get("class", []) or []
        img_class_str = " ".join(img_class).lower() if img_class else ""

        if any(size_class in img_class_str for size_class in ["large", "full", "hero", "main", "featured"]):
            return 60

        if width and height:
            try:
                w, h = int(width), int(height)
                if w >= 300 and h >= 200:  # Reasonable size for dog photo
                    return 50
            except (ValueError, TypeError):
                pass

        # LOW PRIORITY: Images in content area
        if "post-content" in str(img_tag.parent) or "content" in str(img_tag.parent):
            return 30

        # BASIC PRIORITY: Any other reasonable image
        # Skip very small images or thumbnails
        if any(small in src_lower for small in ["thumb", "small", "mini", "tiny"]):
            return 0

        return 20

    def _looks_like_dog_name(self, text: str) -> bool:
        """Check if H2 text looks like a dog name.

        Args:
            text: H2 text content

        Returns:
            True if it looks like a dog name
        """
        if not text:
            return False

        # Skip common non-dog headings (convert all to uppercase for comparison)
        non_dog_headings = [
            "ADOPTED",
            "RESERVED",
            "IT'S SIMPLE",
            "FALL IN",
            "WE",
            "SIGN THE",
            "YOU",
            "READ MORE",
            "ON ADOPTION PROCESS",
            "TOGETHER WE CAN",
            "OUR RESCUE PARTNERS",
            "LET'S HOME THEM ALL",
            "SITE MAP",
            "LEGAL",
            "01",
            "02",
            "03",
            "04",
            "IT'S SIMPLE. FALL IN LOVE. APPLY.",
            "FALL INLOVE ANDAPPLY",
            "WEHOMECHECK",
            "SIGN THEADOPTIONCONTRACTAND PAY THEADOPTIONDONATION",
            "YOUCOLLECTYOURNEW BESTFRIEND",
        ]

        text_upper = text.upper()
        for heading in non_dog_headings:
            if heading == text_upper:  # Exact match instead of substring
                return False

        # Dog names are typically single words or short phrases, all caps
        if len(text) > 50:  # Too long to be a dog name
            return False

        # Should be mostly alphabetic (allowing some special chars)
        if not re.match(r"^[A-Z\s\-\(\)]+$", text.upper()):
            return False

        return True
