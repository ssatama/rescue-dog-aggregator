"""Scraper implementation for Many Tears Rescue organization."""

import asyncio
import random
import re
from typing import Any

from bs4 import BeautifulSoup, Tag

from scrapers.base_scraper import BaseScraper, DetailPageError, ListingIncompleteError
from services.playwright_browser_service import (
    PlaywrightOptions,
    get_playwright_service,
)


class ManyTearsRescueScraper(BaseScraper):
    """Scraper for Many Tears Rescue organization.

    Many Tears Rescue uses Cloudflare Bot Management which blocks standard HTTP requests.
    This scraper uses Playwright (Browserless in production) to bypass the protection and extract dog data
    from listing pages with pagination support.
    """

    # Dogs on a full listing page (checked 2026-09-26)
    PAGE_SIZE = 12

    # User agents for rotation
    USER_AGENTS = [
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0",
    ]

    def __init__(
        self,
        config_id: str = "manytearsrescue",
        metrics_collector=None,
        session_manager=None,
        database_service=None,
    ):
        """Initialize Many Tears Rescue scraper.

        Args:
            config_id: Configuration ID for Many Tears Rescue
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

        # Use config-driven URLs instead of hardcoded values
        website_url = getattr(self.org_config.metadata, "website_url", "https://www.manytearsrescue.org")
        self.base_url = str(website_url).rstrip("/") if website_url else "https://www.manytearsrescue.org"
        self.listing_url = f"{self.base_url}/adopt/dogs/"
        self.organization_name = self.org_config.name

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
        return result

    def _process_animals_parallel(self, animals: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Process animals with reduced parallelism to avoid resource exhaustion.

        Args:
            animals: List of animals to process

        Returns:
            List of processed animals with detailed data
        """
        return asyncio.run(self._process_animals_parallel_playwright(animals))

    async def _process_animals_parallel_playwright(self, animals: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Each dog's detail page, one at a time, merged over its listing data (#567)."""

        async def fetch(animal: dict[str, Any]) -> dict[str, Any]:
            details = await self._scrape_animal_details_playwright(animal["adoption_url"])
            if not details:
                # The Playwright fetch logs its own error and returns {}
                raise DetailPageError(f"{animal['adoption_url']} yielded no details")
            animal.update(details)
            return animal

        # One retry: get_page_content already tries twice per attempt
        return await self.fetch_details_async(animals, fetch, attempts=2)

    def collect_data(self) -> list[dict[str, Any]]:
        """Collect all available dog data from listing pages.

        This method implements the BaseScraper template method pattern.
        It extracts dogs from all listing pages using pagination, then
        scrapes each dog's detail page, one at a time. Supports
        skip_existing_animals.

        A listing failure propagates, so the run ends as an error and stale
        detection doesn't run.

        Returns:
            List of dog data dictionaries for database storage
        """
        # Phase 1: Get and filter animals
        animals = self._get_filtered_animals()
        if not animals:
            return []

        # Phase 2: Fetch each dog's detail page
        all_dogs_data = self._process_animals_parallel(animals)

        self.logger.info(f"Total unique dogs collected: {len(all_dogs_data)}")
        return all_dogs_data

    def get_animal_list(self) -> list[dict[str, Any]]:
        """Fetch list of available dogs using browser automation with pagination.

        Handles Cloudflare Bot Management with a Playwright browser (Browserless in production).
        Iterates through all pages dynamically detecting the maximum page count.

        Returns:
            List of dictionaries containing basic dog information from all pages
        """
        return asyncio.run(self._get_animal_list_playwright())

    async def _get_animal_list_playwright(self) -> list[dict[str, Any]]:
        """Playwright implementation of get_animal_list.

        Every page the first page's pagination links to must load and list
        dogs, or this raises ListingIncompleteError: the dogs on a skipped page
        would go stale. An empty first page is left to the zero-dogs alert.
        """
        playwright_service = get_playwright_service()
        all_dogs = []
        page_num = 1
        max_pages = 1

        while page_num <= max_pages:
            url = self.listing_url if page_num == 1 else f"{self.listing_url}?page={page_num}"
            self.logger.info(f"Fetching page {page_num} with Playwright: {url}")

            options = PlaywrightOptions(
                headless=True,
                viewport_width=random.randint(1366, 1920),
                viewport_height=random.randint(768, 1080),
            )
            result = await playwright_service.get_page_content(url, options)
            if not result.success:
                raise ListingIncompleteError(f"Many Tears listing page {page_num} failed to load: {result.error}")

            soup = BeautifulSoup(result.content, "html.parser")
            page_dogs = self._extract_dogs_from_page(soup)

            if page_num == 1:
                max_pages = self._detect_max_pages(soup)
                self.logger.info(f"Detected maximum pages: {max_pages}")
                if max_pages == 1 and len(page_dogs) >= self.PAGE_SIZE:
                    raise ListingIncompleteError(f"Many Tears listing page 1 is full ({len(page_dogs)} dogs) but has no pagination links")
            elif not page_dogs:
                raise ListingIncompleteError(f"Many Tears listing page {page_num} of {max_pages} lists no dogs")

            all_dogs.extend(page_dogs)
            self.logger.info(f"Found {len(page_dogs)} dogs on page {page_num}")

            page_num += 1
            if page_num <= max_pages:
                await asyncio.sleep(random.uniform(self.rate_limit_delay + 0.5, self.rate_limit_delay + 3.5))

        self.logger.info(f"Total dogs collected across all pages: {len(all_dogs)}")
        return all_dogs

    def _detect_max_pages(self, soup: BeautifulSoup) -> int:
        """Detect maximum page count from pagination links.

        Args:
            soup: BeautifulSoup object of the listing page

        Returns:
            Maximum page number detected (defaults to 1 if no pagination found)
        """
        # Look for pagination links with pattern ?page=N
        page_links = soup.find_all("a", href=re.compile(r"\?page=\d+"))
        page_numbers = []

        for link in page_links:
            if isinstance(link, Tag):
                href = link.get("href", "")
                href_str = str(href) if href else ""
                match = re.search(r"page=(\d+)", href_str)
                if match:
                    page_numbers.append(int(match.group(1)))

        # Return highest page number found, default to 1
        return max(page_numbers) if page_numbers else 1

    def _extract_dogs_from_page(self, soup: BeautifulSoup) -> list[dict[str, Any]]:
        """Extract dog information from a single listing page.

        Uses CSS selectors identified in Session 1 analysis:
        - Dog cards: a[href*='/adopt/dogs/']
        - Dog names: h3 elements within cards

        Args:
            soup: BeautifulSoup object of the listing page

        Returns:
            List of dog data dictionaries with basic information
        """
        dogs = []

        # Find all dog card links using Session 1 selectors
        dog_links = soup.find_all("a", href=re.compile(r"/adopt/dogs/\d+/$"))

        for link in dog_links:
            try:
                dog_data = self._extract_card_data(link)
                if dog_data:
                    dogs.append(dog_data)
            except Exception as e:
                self.logger.warning(f"Failed to extract data from dog card: {e}")
                continue

        return dogs

    def _extract_card_data(self, link_element) -> dict[str, Any]:
        """Extract data from a single dog card element.

        Args:
            link_element: BeautifulSoup element representing a dog card link

        Returns:
            Dictionary containing dog data with required fields
        """
        # Extract URL and ensure it's absolute
        relative_url = link_element.get("href", "")
        if relative_url.startswith("http"):
            adoption_url = relative_url
        elif relative_url.startswith("/"):
            adoption_url = f"{self.base_url}{relative_url}"
        else:
            adoption_url = f"{self.base_url}/{relative_url}"

        # Extract dog name from h3 element
        name_elem = link_element.find("h3")
        name = name_elem.text.strip() if name_elem else None

        # Extract external ID from URL (e.g., /adopt/dogs/2604/ -> "2604")
        external_id = self._extract_external_id_from_url(adoption_url)

        # Basic dog data structure with required fields
        dog_data = {
            "name": name,
            "adoption_url": adoption_url,
            "external_id": external_id,
            "animal_type": "dog",
            "status": "available",
        }

        return dog_data

    def _extract_external_id_from_url(self, url: str) -> str:
        """Extract external ID from adoption URL.

        Args:
            url: Full adoption URL (e.g., https://www.manytearsrescue.org/adopt/dogs/2604/)

        Returns:
            External ID string (e.g., "2604")
        """
        # Extract ID from URL pattern /adopt/dogs/{id}/
        match = re.search(r"/adopt/dogs/(\d+)/?$", url)
        return match.group(1) if match else url.split("/")[-2] if url.split("/")[-2].isdigit() else "unknown"

    async def _scrape_animal_details_playwright(self, adoption_url: str) -> dict[str, Any]:
        """Scrape one dog's detail page with Playwright."""
        try:
            self.logger.debug(f"Scraping details from: {adoption_url}")

            playwright_service = get_playwright_service()
            options = PlaywrightOptions(
                headless=True,
                user_agent=random.choice(self.USER_AGENTS),
            )

            result = await playwright_service.get_page_content(adoption_url, options)
            if not result.success:
                # A timeout is retried by fetch_details_async (#571); anything else
                # (Browserless refusing, DNS) fails at once instead of piling up retries
                # "Timeout 60000ms exceeded" from Playwright, net::ERR_TIMED_OUT from Chromium
                if re.search(r"time[d_ ]*out", result.error or "", re.IGNORECASE):
                    raise TimeoutError(f"{adoption_url} did not load: {result.error}")
                self.logger.error(f"Failed to get page content from {adoption_url}: {result.error}")
                return {}

            soup = BeautifulSoup(result.content, "html.parser")

            # Extract core fields
            name = self._extract_name(soup)
            hero_image_url = self._extract_hero_image(soup)
            description = self._extract_description(soup)

            # Extract structured data (age, breed, sex) from DOM
            structured_data = self._extract_structured_data_from_detail_page(soup)

            # Extract properties using comprehensive extraction methods
            properties = {}

            # Add structured data to properties
            properties.update(structured_data)

            # Extract 6 requirements sections
            requirements = self._extract_requirements_sections(soup)
            properties.update(requirements)

            # Diary entry titles
            diary_entries = self._extract_diary_entries(soup)
            if diary_entries:
                properties["diary_entries"] = diary_entries

            # Extract compatibility sections (optional)
            compatibility = self._extract_compatibility_sections(soup)
            properties.update(compatibility)

            # Filter sponsor text from description
            description = self._filter_sponsor_text(description)

            # CRITICAL FIX: Store description in properties so it gets saved to database
            if description:
                properties["description"] = description

            # Build result following SanterPaws pattern with Zero NULLs compliance
            result = {
                "name": name,
                "primary_image_url": hero_image_url,
                "original_image_url": hero_image_url,
                "properties": properties,
                "animal_type": "dog",
                "status": "available",
            }

            # Extract individual fields from structured_data for compatibility with BaseScraper
            # Missing facts stay None (#568)
            result["breed"] = structured_data.get("breed")
            result["sex"] = structured_data.get("sex")
            result["age"] = structured_data.get("age")
            result["age_text"] = structured_data.get("age_text") or structured_data.get("age")

            # Size will be handled by unified standardization
            result["size"] = structured_data.get("size")

            # Add image_urls for R2 integration
            if hero_image_url:
                result["image_urls"] = [hero_image_url]
            else:
                result["image_urls"] = []

            # Apply unified standardization
            result = self.process_animal(result)

            self.logger.debug(f"Successfully extracted details for {name}")
            return result

        except TimeoutError:
            raise
        except Exception as e:
            self.logger.error(f"Error scraping details from {adoption_url}: {e}")
            return {}

    def _extract_name(self, soup: BeautifulSoup) -> str:
        """Extract dog name from h1 heading.

        Args:
            soup: BeautifulSoup object of the detail page

        Returns:
            Dog name or empty string if not found
        """
        name_element = soup.find("h1")
        if name_element:
            return name_element.get_text(strip=True)
        return ""

    def _extract_hero_image(self, soup: BeautifulSoup) -> str:
        """Extract hero image URL from main content area.

        Args:
            soup: BeautifulSoup object of the detail page

        Returns:
            Hero image URL or empty string if not found
        """
        # Look for images in main content, excluding icons and small images
        images = soup.find_all("img")
        for img in images:
            if isinstance(img, Tag):
                src = img.get("src", "")
                src_str = str(src) if src else ""
            else:
                continue
            if "animal_images" in src_str and not src_str.endswith(".svg"):
                # Make URL absolute if needed
                if src_str.startswith("/"):
                    return f"{self.base_url}{src_str}"
                return src_str
        return ""

    def _extract_description(self, soup: BeautifulSoup) -> str:
        """Extract main description text from paragraph elements.

        Args:
            soup: BeautifulSoup object of the detail page

        Returns:
            Description text or empty string if not found
        """
        description_parts = []

        for p in soup.find_all("p"):
            # Skip paragraphs inside ul elements (these are requirements)
            if p.find_parent("ul"):
                continue

            # Skip paragraphs that come immediately after compatibility H1 headings
            # (like "Can live with other dogs", "Cat friendly")
            prev_h1 = p.find_previous_sibling("h1")
            if prev_h1:
                h1_text = prev_h1.get_text(strip=True).lower()
                if "can live with" in h1_text or "cat friendly" in h1_text:
                    continue

            text = p.get_text(strip=True)
            if text and len(text) > 30:  # Filter out short snippets
                # Skip footer, metadata, and sponsor sections
                if not any(
                    skip_text in text.lower()
                    for skip_text in [
                        "many tears animal rescue, registered charity",
                        "privacy policy",
                        "cookie policy",
                        "terms & conditions",
                        "through the generosity of a gift of life sponsor",
                    ]
                ):
                    description_parts.append(text)

        # One paragraph per line, so the sponsor filter never merges two (#571)
        return "\n".join(description_parts)

    def _extract_structured_data_from_detail_page(self, soup: BeautifulSoup) -> dict[str, Any]:
        """Extract structured data (age, breed, sex) from detail page list items.

        Based on DOM analysis, structured data appears in a list format:
        - Available for Adoption (status)
        - 7 years (age)
        - Male (sex)
        - Shih Tzu (breed)
        - Location info
        - Compatibility info

        Args:
            soup: BeautifulSoup object of the detail page

        Returns:
            Dictionary with extracted structured data
        """
        structured_data = {}

        # Find the main info list - look for the list containing the basic info
        # Based on Playwright analysis, this appears after the donation amount
        info_lists = soup.find_all("ul")

        for ul in info_lists:
            if not isinstance(ul, Tag):
                continue
            items = ul.find_all("li")
            if len(items) >= 4:  # Should have at least status, age, sex, breed
                list_texts = [item.get_text(strip=True) for item in items]

                # Check if this looks like the main info list
                # Look for patterns like "X years", "Male/Female", breed names
                has_age_pattern = any("year" in text.lower() or "month" in text.lower() or "week" in text.lower() for text in list_texts)
                has_gender_pattern = any(text.lower() in ["male", "female"] for text in list_texts)

                if has_age_pattern and has_gender_pattern:
                    # Process each list item
                    for i, text in enumerate(list_texts):
                        text_lower = text.lower()

                        # Age extraction
                        if ("year" in text_lower or "month" in text_lower or "week" in text_lower) and text_lower not in ["male", "female"]:
                            # Store raw age text for unified standardization
                            structured_data["age"] = text

                        # Gender extraction
                        elif text_lower in ["male", "female"]:
                            structured_data["sex"] = text

                        # Breed extraction - typically appears after age and gender
                        elif (
                            i >= 2  # Should come after status, age, gender
                            # The first match: later items are location and compatibility, and
                            # "Can be the only dog" was being stored as the breed (#571)
                            and "breed" not in structured_data
                            and not text_lower.startswith(("can be", "must ", "needs ", "no ", "not ", "only ", "good with", "prefers "))
                            and text_lower not in ["available for adoption", "male", "female"]
                            and not text_lower.startswith("in foster")
                            and not text_lower.startswith("can live with")
                            and not text_lower.startswith("untested with")
                            and not text_lower.startswith("no cats")
                            and
                            # Exclude location patterns that were being extracted as breeds
                            not ("many tears" in text_lower and ("llanelli" in text_lower or "carmarthen" in text_lower))
                            and not (", " in text and len(text.split(", ")) >= 3)  # Location format: "City, County, Country"
                            and not text_lower.endswith(" uk")  # UK location indicators
                            and not text_lower.endswith(" wales")
                            and len(text) > 2
                            and len(text) < 50
                        ):  # Reasonable breed name length
                            # Store raw breed for unified standardization
                            structured_data["breed"] = text

                    break  # Found the main info list, stop looking

        return structured_data

    def _extract_requirements_sections(self, soup: BeautifulSoup) -> dict[str, str]:
        """Extract the 6 requirements sections from the structured list.

        They are a ul > li structure where each li holds an img, whose alt text
        names the category, and a p with the requirement.

        Args:
            soup: BeautifulSoup object of the detail page

        Returns:
            Dictionary mapping requirement categories to their descriptions
        """
        requirements = {}

        # Strategy 1: Original test-based structure (ul > li with img + p)
        requirement_lists = soup.find_all("ul")

        for ul in requirement_lists:
            if not isinstance(ul, Tag):
                continue
            items = ul.find_all("li")
            if items:  # Any length: a dog may have fewer categories (#571)
                for li in items:
                    if not isinstance(li, Tag):
                        continue
                    img = li.find("img")
                    p = li.find("p")

                    if img and p:
                        alt_text = img.get("alt", "") if hasattr(img, "get") else ""
                        requirement_text = p.get_text(strip=True)

                        # Map alt text to property keys
                        if "human family" in alt_text.lower():
                            requirements["human_family_requirements"] = requirement_text
                        elif "other pet" in alt_text.lower():
                            requirements["other_pet_requirements"] = requirement_text
                        elif "house and garden" in alt_text.lower():
                            requirements["house_garden_requirements"] = requirement_text
                        elif "out and about" in alt_text.lower():
                            requirements["out_about_requirements"] = requirement_text
                        elif "training" in alt_text.lower():
                            requirements["training_needs"] = requirement_text
                        elif "medical" in alt_text.lower():
                            requirements["medical_issues"] = requirement_text

                # If we found requirements using Strategy 1, return them
                if requirements:
                    break

        # Only the list's own items: the old word matching ("home", "walk",
        # "garden") put arbitrary paragraphs into the requirements (#571)
        return requirements

    def _extract_diary_entries(self, soup: BeautifulSoup) -> dict[str, str]:
        """Extract diary entry titles from the optional diary section.

        Diary entries are buttons with dates that expand to show the full text;
        only the button titles are in the page source.

        Args:
            soup: BeautifulSoup object of the detail page

        Returns:
            Dictionary mapping dates to diary entry titles
        """
        diary_entries: dict[str, str] = {}

        diary_heading = None
        for h2 in soup.find_all("h2"):
            if "diary" in h2.get_text(strip=True).lower():
                diary_heading = h2
                break

        if not diary_heading:
            return diary_entries

        ul = diary_heading.find_next("ul")
        if not ul:
            return diary_entries

        buttons = ul.find_all("button") if isinstance(ul, Tag) else []
        for button in buttons:
            button_text = button.get_text(strip=True)
            if button_text:
                date_match = re.match(r"^(\d{2}-\d{2}-\d{2})\s+(.+)$", button_text)
                if date_match:
                    date = date_match.group(1)
                    title = date_match.group(2)
                    # Only the title is in the page source; the text loads on click (#571)
                    diary_entries[date] = title
                else:
                    diary_entries[button_text] = button_text
        return diary_entries

    def _extract_compatibility_sections(self, soup: BeautifulSoup) -> dict[str, str]:
        """Extract compatibility sections from h1 headings.

        Based on Playwright analysis, compatibility sections are h1 elements
        with titles like "Can live with other dogs", "Cat friendly" followed
        by paragraph descriptions.

        Args:
            soup: BeautifulSoup object of the detail page

        Returns:
            Dictionary mapping compatibility types to descriptions
        """
        compatibility = {}

        # Find all h1 elements that might be compatibility sections
        h1_elements = soup.find_all("h1")

        for h1 in h1_elements:
            heading_text = h1.get_text(strip=True).lower()

            # Check for compatibility section patterns
            if "can live with" in heading_text and "dog" in heading_text:
                next_p = h1.find_next("p")
                if next_p:
                    compatibility["can_live_with_dogs"] = next_p.get_text(strip=True)

            elif "cat friendly" in heading_text:
                next_p = h1.find_next("p")
                if next_p:
                    compatibility["cat_friendly"] = next_p.get_text(strip=True)

        return compatibility

    def _filter_sponsor_text(self, description: str) -> str:
        """Filter out Gift of Life sponsor text from description.

        Removes patterns like "Gift of Life by [Name]" and standalone sponsor sections.

        Args:
            description: Raw description text

        Returns:
            Filtered description text
        """
        if not description:
            return description

        # Sentences end at a paragraph break or ". " before a capital, so
        # "2.5 years" and "e.g." survive (#571)
        sentences = re.split(r"\n+|(?<=[.!?])\s+(?=[A-Z])", description.strip())
        # Production: "Bloom has been given the Gift of Life Vicki Coldman." (#571)
        sponsor = ("given the gift of life", "gift of life by", "through the generosity of a gift of life sponsor")
        kept = [sentence for sentence in sentences if not any(phrase in sentence.lower() for phrase in sponsor)]
        return " ".join(" ".join(kept).split())
