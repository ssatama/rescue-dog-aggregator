"""Main scraper implementation for MisisRescue.

This module provides the main scraper class that orchestrates the complete
scraping process for MisisRescue website, including pagination handling,
Reserved section detection, and data collection.
"""

import asyncio
import time
from typing import Any
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup, Tag

from scrapers.base_scraper import BaseScraper, ListingIncompleteError
from services.playwright_browser_service import PlaywrightOptions

from .detail_parser import POST_BODY, MisisRescueDetailParser


def _one_per_wix_media(urls: list[str]) -> list[str]:
    """Each photo once, compared by Wix media id: the raw hero URL and its cleaned
    gallery copy differ only in size and quality parameters."""
    seen: set[str] = set()
    unique = []
    for url in urls:
        media_id = url.split("/media/", 1)[-1].split("/", 1)[0]
        if media_id not in seen:
            seen.add(media_id)
            unique.append(url)
    return unique


class MisisRescueScraper(BaseScraper):
    """Scraper for MISI's Rescue organization.

    IMPORTANT: Only scrapes available dogs, skips Reserved section entirely.
    Inherits from BaseScraper which provides database operations, error handling,
    metrics logging, and image uploading functionality.
    """

    # Last-resort bounds, so a stall raises (listing) or skips one dog
    # (detail) instead of hanging (#580). They sit well above every retry
    # they wrap (browser connect ~190s plus navigation ~185s worst case) so a
    # slow run that would recover is never cut off; the cron's per-rescue
    # limit (#579) stays the backstop. Normal: listing ~60s, detail a few s.
    LISTING_TIMEOUT_SECONDS = 900
    DETAIL_TIMEOUT_SECONDS = 600

    def __init__(self, config_id: str = "misisrescue", organization_id=None):
        """Initialize with configuration."""
        if organization_id is not None:
            # Legacy mode - use organization_id
            super().__init__(organization_id=organization_id)
        else:
            # New mode - use config_id
            super().__init__(config_id=config_id)
        self.base_url = "https://www.misisrescue.com"
        self.listing_url = "https://www.misisrescue.com/available-for-adoption"
        self.detail_parser = MisisRescueDetailParser()

    def _is_wixstatic_url(self, url: str) -> bool:
        """Check if URL is from wixstatic.com using proper URL parsing.

        Args:
            url: URL string to check

        Returns:
            True if URL is from wixstatic.com domain
        """
        if not url:
            return False
        try:
            parsed = urlparse(url)
            hostname = parsed.hostname or ""
            return hostname == "wixstatic.com" or hostname.endswith(".wixstatic.com")
        except Exception:
            return False

    def collect_data(self) -> list[dict[str, Any]]:
        """Main entry point - collect all dog data.

        CRITICAL: Must skip Reserved section shown in screenshots!

        This method is called by BaseScraper which handles:
        - Database operations
        - Error handling
        - Metrics logging
        - Image uploading

        Returns:
            List of dog data dictionaries for BaseScraper processing
        """
        # Get all dog URLs from all pages (handles pagination).
        # Exceptions propagate to BaseScraper so real failures surface in
        # Sentry with a stack trace instead of a misleading zero-dogs alert.
        dogs_from_listing = self._get_all_dogs_from_listing()

        all_urls = [urljoin(self.base_url, dog_info["url"]) for dog_info in dogs_from_listing]

        animals = [{"adoption_url": url, "external_id": self._generate_external_id(url)} for url in all_urls]
        # Every listed dog is found, whether or not its page is then read: a
        # detail failure (a 429, say) must not count a listed dog as missing
        # (#558), and with skipping off nothing else records them
        self._record_all_found_external_ids(animals)

        if self.skip_existing_animals:
            filtered_animals = self.filtering_service.filter_existing_animals(animals)
            self._sync_filtering_stats()
            urls_to_process = [a["adoption_url"] for a in filtered_animals]
        else:
            self.total_animals_before_filter = len(all_urls)
            self.total_animals_skipped = 0
            urls_to_process = all_urls

        return self.fetch_details(urls_to_process, self._scrape_dog_detail_fast, url=lambda url: url, max_workers=self.batch_size, attempts=self.max_retries)

    def _get_all_dogs_from_listing(self) -> list[dict[str, str]]:
        """Get all dog data from listing page.

        IMPORTANT: The website uses JavaScript-based pagination. You must CLICK
        the pagination buttons to navigate between pages. URL parameters don't work.

        Returns:
            List of dog dictionaries with url and name
        """
        return asyncio.run(self._bounded_listing_playwright())

    async def _bounded_listing_playwright(self) -> list[dict[str, str]]:
        """The listing, or an error once it has run LISTING_TIMEOUT_SECONDS. Never a hang."""
        try:
            return await asyncio.wait_for(self._get_all_dogs_from_listing_playwright(), self.LISTING_TIMEOUT_SECONDS)
        except TimeoutError as e:
            raise RuntimeError(f"MISIs listing did not finish within {self.LISTING_TIMEOUT_SECONDS}s") from e

    async def _get_all_dogs_from_listing_playwright(self) -> list[dict[str, str]]:
        """Playwright implementation of _get_all_dogs_from_listing."""
        all_dogs = []
        options = PlaywrightOptions(
            headless=True,
            viewport_width=1920,
            viewport_height=1080,
        )

        # Use retry wrapper for resilient browser connection. Browser-level
        # exceptions propagate so collect_data → BaseScraper can surface them
        # in Sentry instead of being silently converted to a zero-dogs alert.
        async with self.browser_manager.with_browser_retry(options) as browser_result:
            page = browser_result.page

            # Retry transient stalls: a single un-retried goto loses the whole
            # organization to a one-off Browserless/network hiccup. Failure must
            # raise, never yield an empty listing (see #215).
            if not await self.browser_manager.navigate_with_retry(page, self.listing_url):
                raise RuntimeError(f"Navigation to {self.listing_url} failed after retries")

            await asyncio.sleep(5)  # Give Wix time to load dynamic content

            await self._scroll_to_load_all_content_playwright(page)

            content = await page.content()
            soup = BeautifulSoup(content, "html.parser")
            page_dogs = self._extract_dogs_before_reserved(soup)
            all_dogs.extend(page_dogs)
            previous_links = self._post_links(soup)

            # A page that fails to render raises: keeping pages 1-3 without
            # page 4 would mark page 4's dogs stale while they are still listed.
            # No button for the next page is the real last page; a clicked page
            # that shows no dogs, or still shows the last page's, didn't render.
            page_num = 2
            while await self._click_pagination_button_playwright(page, page_num):
                if page_num > 10:  # Safety limit
                    raise ListingIncompleteError("MISIs listing still has a next page after 10 pages")

                await asyncio.sleep(5)
                await self._scroll_to_load_all_content_playwright(page)

                content = await page.content()
                soup = BeautifulSoup(content, "html.parser")
                links = self._post_links(soup)
                if not links or links == previous_links:
                    raise ListingIncompleteError(f"MISIs listing page {page_num} was clicked but didn't render its dogs")
                previous_links = links

                page_dogs = self._extract_dogs_before_reserved(soup)
                all_dogs.extend(page_dogs)
                page_num += 1

        unique_dogs = []
        seen_urls = set()
        for dog in all_dogs:
            if dog["url"] not in seen_urls:
                unique_dogs.append(dog)
                seen_urls.add(dog["url"])

        return unique_dogs

    @staticmethod
    def _post_links(soup: BeautifulSoup) -> set[str]:
        """Every dog post link on a listing page, reserved dogs included."""
        return {a["href"] for a in soup.find_all("a", href=lambda href: href and "/post/" in href)}

    async def _scroll_to_load_all_content_playwright(self, page) -> None:
        """Scroll to bottom of page to trigger lazy loading (Playwright version)."""
        initial_dogs = await page.locator('a[href*="/post/"]').count()
        self.logger.debug(f"Initial dogs visible: {initial_dogs}")

        scroll_attempts = 0
        max_scrolls = 20

        while scroll_attempts < max_scrolls:
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await asyncio.sleep(2)

            current_dogs = await page.locator('a[href*="/post/"]').count()

            if current_dogs > initial_dogs:
                self.logger.debug(f"New dogs loaded: {current_dogs} (was {initial_dogs})")
                initial_dogs = current_dogs
                scroll_attempts = 0
            else:
                scroll_attempts += 1
                if scroll_attempts >= 3:
                    break

        self.logger.debug(f"Lazy loading complete. Total dogs visible: {initial_dogs}")

    async def _click_pagination_button_playwright(self, page, page_num: int) -> bool:
        """Click the button for page_num. False when there is none (the last page); a browser error raises."""
        selectors = [
            f'button:text-is("{page_num}")',
            f'a:text-is("{page_num}")',
            f'span:text-is("{page_num}")',
        ]

        for selector in selectors:
            element = page.locator(selector).first
            if await element.is_visible():
                await element.scroll_into_view_if_needed()
                await asyncio.sleep(1)
                await element.click()
                self.logger.debug(f"Clicked pagination button for page {page_num}")
                return True

        self.logger.debug(f"No pagination button found for page {page_num}")
        return False

    def _extract_dogs_before_reserved(self, soup: BeautifulSoup) -> list[dict[str, str]]:
        """Extract dog links only from available section, stop at Reserved.

        CRITICAL: This is the key method that enforces the Reserved section skip!

        Fixed logic: Reserved dogs are individual dog names with "(reserved)" in them,
        not section headers. We skip dogs that are themselves marked as reserved.

        Args:
            soup: BeautifulSoup object of the page

        Returns:
            List of dog dictionaries with URL and name
        """
        dogs = []

        # Find all potential dog links (based on DOM analysis)
        # Handle both relative and absolute URLs
        dog_links = soup.find_all("a", href=lambda href: href and "/post/" in href)

        # World-class logging: Total dog links handled by centralized system

        for link in dog_links:
            # Ensure we are dealing with a Tag object
            if not isinstance(link, Tag):
                continue

            # Extract dog info
            href = link.get("href")
            name = link.get_text(strip=True) or "Unknown"

            if href and isinstance(href, str) and "/post/" in href:
                # Check if this individual dog is marked as reserved
                if self._is_reserved_dog(name):
                    # World-class logging: Reserved dog filtering handled by centralized system
                    continue

                # Convert full URL to relative path for consistency
                if href.startswith("http"):
                    from urllib.parse import urlparse

                    parsed = urlparse(href)
                    relative_url = parsed.path
                else:
                    relative_url = href

                self.logger.debug(f"Processing available dog: {name} at {relative_url}")

                # Add available dog (image will be assigned later)
                dogs.append({"url": relative_url, "name": name})

        return dogs

    def _is_reserved_dog(self, name: str) -> bool:
        """Check if a dog name indicates it's reserved.

        Args:
            name: Dog name to check

        Returns:
            True if dog is marked as reserved
        """
        if not name:
            return False

        name_lower = name.lower()

        # Check for reserved indicators in dog name
        reserved_indicators = [
            "reserved",
            "reserviert",
            "bereits reserviert",
            "wir sind bereits reserviert",
            "(reserved)",
            "(reserviert)",
        ]

        for indicator in reserved_indicators:
            if indicator in name_lower:
                return True

        return False

    def _scrape_dog_detail(self, url: str) -> dict[str, Any] | None:
        """Scrape individual dog detail page.

        Args:
            url: Full URL to dog detail page

        Returns:
            Dog data dictionary or None if error
        """
        return asyncio.run(self._bounded_detail_playwright(url))

    def _dog_from_page(self, soup: BeautifulSoup, url: str) -> dict[str, Any] | None:
        """The dog on a post page, or None for a page with no post body: an error page, not a dog."""
        dog_data = self.detail_parser.parse_detail_page(soup)
        if dog_data is None:
            self.logger.warning(f"No post body on {url}; skipping it as an error page")
            return None

        dog_data["external_id"] = self._generate_external_id(url)
        dog_data["adoption_url"] = url
        dog_data["organization_id"] = self.organization_id
        # Size calculated from weight goes to the top level for the database
        if dog_data["properties"].get("standardized_size"):
            dog_data["standardized_size"] = dog_data["properties"]["standardized_size"]
        return dog_data

    async def _bounded_detail_playwright(self, url: str) -> dict[str, Any] | None:
        """One dog's page, or None (skip that dog) once it has run DETAIL_TIMEOUT_SECONDS."""
        try:
            return await asyncio.wait_for(self._scrape_dog_detail_playwright(url), self.DETAIL_TIMEOUT_SECONDS)
        except TimeoutError:
            self.logger.error(f"Detail page {url} did not finish within {self.DETAIL_TIMEOUT_SECONDS}s; skipping this dog")
            return None

    async def _scrape_dog_detail_playwright(self, url: str) -> dict[str, Any] | None:
        """Playwright implementation of _scrape_dog_detail."""
        try:
            options = PlaywrightOptions(
                headless=True,
                viewport_width=1920,
                viewport_height=1080,
            )

            self.logger.debug(f"Loading detail page with Playwright: {url}")

            # Use retry wrapper for resilient browser connection
            async with self.browser_manager.with_browser_retry(options) as browser_result:
                page = browser_result.page

                # Retry transient stalls. Exhaustion raises into the handler
                # below, which skips this one dog rather than the whole org.
                if not await self.browser_manager.navigate_with_retry(page, url):
                    raise RuntimeError(f"Navigation to {url} failed after retries")

                # The browser is the fallback for when the server HTML lacked the
                # post, so wait for Wix to render it; a page that never does is
                # skipped below as an error page
                try:
                    await page.wait_for_selector(POST_BODY, timeout=15000)
                except Exception:
                    self.logger.warning(f"No post body rendered on {url} within 15s")

                content = await page.content()

            soup = BeautifulSoup(content, "html.parser")
            dog_data = self._dog_from_page(soup, url)
            if dog_data is None:
                return None

            # Extract the main image using BeautifulSoup-only method
            main_image_url = self._extract_main_image_soup(soup)
            if main_image_url:
                dog_data["image_urls"] = _one_per_wix_media([main_image_url, *self._extract_static_image_urls(soup)])
                dog_data["primary_image_url"] = main_image_url
            else:
                self.logger.warning(f"No image found for dog at {url}")

            # Apply unified standardization
            return self.process_animal(dog_data)

        except Exception:
            # Per-dog tolerance: one bad detail page shouldn't kill the whole
            # scrape. Log with exc_info so the failure is debuggable instead of
            # being collapsed into a one-line message.
            self.logger.error(f"Error scraping dog detail with Playwright {url}", exc_info=True)
            return None

    def _extract_main_image_soup(self, soup: BeautifulSoup) -> str | None:
        """Extract main image using only BeautifulSoup (for Playwright)."""
        # First try hero image
        hero_url = self._extract_hero_image(soup)
        if hero_url and self._is_high_quality_image(hero_url):
            return hero_url

        # Try grid images from soup
        grid_url = self._extract_first_grid_image_soup(soup)
        if grid_url:
            return grid_url

        # Fallback to any hero image
        return hero_url

    def _extract_first_grid_image_soup(self, soup: BeautifulSoup) -> str | None:
        """Extract first grid image using BeautifulSoup only."""
        try:
            # Find all wixstatic images
            all_images = soup.find_all("img", src=lambda x: x and self._is_wixstatic_url(x))

            for img in all_images:
                src = img.get("src", "")
                # Skip small thumbnails
                if "w_50" in src or "w_100" in src or "h_50" in src or "h_100" in src:
                    continue
                # Skip if in related posts section
                parent = img.find_parent(text=lambda x: x and "related" in x.lower() if isinstance(x, str) else False)
                if parent:
                    continue
                return src

            return None
        except Exception as e:
            self.logger.debug(f"Error extracting grid image from soup: {e}")
            return None

    def _scrape_dog_detail_fast(self, url: str) -> dict[str, Any] | None:
        """Fetch a dog page over plain HTTP; the browser is the fallback.

        Wix renders posts server-side, so HTTP is enough for most dogs.

        Args:
            url: Full URL to dog detail page

        Returns:
            Dog data dictionary or None if error
        """
        try:
            # Use requests with a proper user agent
            headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}

            self.logger.debug(f"Fast-loading detail page: {url}")
            response = requests.get(url, headers=headers, timeout=10)

            if response.status_code == 429:
                # Rate limited: back off once, and never answer with a heavier browser load
                self.logger.warning(f"HTTP 429 for {url}; backing off before one retry")
                time.sleep(self.rate_limit_delay * 4)
                try:
                    response = requests.get(url, headers=headers, timeout=10)
                except requests.RequestException as e:
                    self.logger.error(f"Retry after HTTP 429 failed for {url}: {e}; skipping this dog")
                    return None
                if response.status_code == 429:
                    self.logger.error(f"HTTP 429 again for {url}; skipping this dog")
                    return None

            # A removed post is gone; anything else non-200 may be transient, so the browser tries
            if response.status_code in (404, 410):
                self.logger.warning(f"HTTP {response.status_code} for {url}: the post is gone")
                return None
            if response.status_code != 200:
                self.logger.warning(f"HTTP {response.status_code} for {url}, falling back to the browser")
                return self._scrape_dog_detail(url)

            soup = BeautifulSoup(response.text, "html.parser")
            # Wix renders the post server-side; if it didn't this time, the browser runs its JS
            if soup.select_one(POST_BODY) is None:
                self.logger.debug(f"No post body in the HTML of {url}, falling back to the browser")
                return self._scrape_dog_detail(url)
            dog_data = self._dog_from_page(soup, url)

            # For images, we'll need to extract them differently since JS won't run
            # Try to find image URLs in the static HTML
            image_urls = self._extract_static_image_urls(soup)
            if image_urls:
                dog_data["image_urls"] = image_urls
                dog_data["primary_image_url"] = image_urls[0]
            else:
                # If no images found, might need JS - fall back to the browser
                self.logger.debug(f"No images found with requests for {url}, falling back to the browser")
                return self._scrape_dog_detail(url)

            self.logger.debug(f"Successfully scraped {url} with fast method")
            return dog_data

        except requests.RequestException as e:
            self.logger.warning(f"Request failed for {url}: {e}, falling back to the browser")
            return self._scrape_dog_detail(url)
        except Exception as e:
            self.logger.error(f"Error in fast scraping {url}: {e}, falling back to the browser")
            return self._scrape_dog_detail(url)

    def _extract_static_image_urls(self, soup: BeautifulSoup) -> list[str]:
        """Extract image URLs from static HTML without JavaScript.

        CRITICAL: This method now properly cleans Wix image URLs to get high-quality versions.

        Args:
            soup: BeautifulSoup object of the page

        Returns:
            List of high-quality image URLs
        """
        image_urls = []

        # The post's own gallery (#487). Without this scope the site logo and
        # the footer's social icons were collected as dog photos. A post with no
        # gallery block falls back to its other images, never the site chrome.
        gallery = soup.select('[data-hook="gallery-media-image"] img')
        candidates = gallery or [img for img in soup.find_all("img") if not img.find_parent(id=["SITE_HEADER", "SITE_FOOTER"])]

        # Look for Wix static images
        for img in candidates:
            if not isinstance(img, Tag):
                continue

            src = img.get("src")
            if isinstance(src, str) and self._is_wixstatic_url(src):
                # Filter for actual dog photos
                if any(ext in src.lower() for ext in [".jpg", ".jpeg", ".png", ".webp"]):
                    if not any(skip in src.lower() for skip in ["logo", "icon", "button"]):
                        # CRITICAL FIX: Clean up Wix image URLs to get high quality versions
                        cleaned_url = self._clean_wix_image_url(src)

                        full_url = urljoin(self.base_url, cleaned_url)
                        if full_url not in image_urls:
                            image_urls.append(full_url)

        return image_urls

    def _clean_wix_image_url(self, url: str) -> str:
        """Clean Wix image URL to get high-quality version.

        Removes blur, low quality parameters and sets proper dimensions.

        Args:
            url: Original Wix image URL

        Returns:
            Cleaned high-quality image URL
        """
        # Remove blur parameters
        url = url.replace(",blur_2", "").replace(",blur_30", "").replace(",blur", "")

        # Replace low quality with high quality
        url = url.replace(",q_30", ",q_90").replace(",q_80", ",q_90")
        if ",q_" not in url and "/v1/fill/" in url:
            # Add quality parameter if missing
            url = url.replace("/v1/fill/", "/v1/fill/q_90,")

        # Ensure reasonable dimensions (at least 800px wide for primary images)
        if "w_" in url:
            # Extract and update width
            parts = url.split("/")
            for i, part in enumerate(parts):
                if "w_" in part:
                    # Parse current dimensions
                    params = part.split(",")
                    new_params = []
                    for param in params:
                        if param.startswith("w_"):
                            try:
                                width = int(param.split("_")[1])
                                # Ensure minimum width of 800px
                                if width < 800:
                                    new_params.append("w_800")
                                else:
                                    new_params.append(param)
                            except (IndexError, ValueError):
                                new_params.append("w_800")
                        elif param.startswith("h_"):
                            try:
                                height = int(param.split("_")[1])
                                # Ensure minimum height of 800px
                                if height < 800:
                                    new_params.append("h_800")
                                else:
                                    new_params.append(param)
                            except (IndexError, ValueError):
                                new_params.append("h_800")
                        elif not param.startswith("blur") and not param.startswith("q_"):
                            new_params.append(param)

                    # Add quality if not present
                    if not any(p.startswith("q_") for p in new_params):
                        new_params.append("q_90")

                    parts[i] = ",".join(new_params)
                    break
            url = "/".join(parts)

        # Handle different Wix URL formats
        if "/media/" in url and "~mv2" in url:
            # Format: .../media/hash~mv2.jpg/v1/fill/w_X,h_Y.../image.jpg
            # Ensure we have good quality parameters
            if "/v1/fill/" in url and "w_" not in url:
                # Add default high-quality dimensions
                url = url.replace("/v1/fill/", "/v1/fill/w_800,h_800,q_90/")

        return url

    def _generate_external_id(self, url: str) -> str:
        """Generate external ID from dog detail page URL with organization prefix.

        Args:
            url: Dog detail page URL

        Returns:
            External ID with 'mar-' prefix to prevent collisions
        """
        try:
            # Extract from URL pattern: /post/dog-name
            parsed = urlparse(url)
            path_parts = parsed.path.strip("/").split("/")

            if len(path_parts) >= 2 and path_parts[0] == "post":
                slug = path_parts[1]
                return f"mar-{slug}"

        except Exception:
            pass

        # Fallback: generate from URL hash
        import hashlib

        return hashlib.md5(url.encode()).hexdigest()[:8]

        # World-class logging: Scrolling completion handled by centralized system

    def _is_high_quality_image(self, image_url: str) -> bool:
        """Check if image is high quality (>= 600px width).

        Args:
            image_url: Image URL to check

        Returns:
            True if image is high quality
        """
        if not image_url:
            return False

        width = self._extract_image_width(image_url)
        return width is not None and width >= 600

    def _extract_hero_image(self, soup: BeautifulSoup) -> str | None:
        """Extract the main hero image from the detail page.

        The hero image is the main large image displayed at the top of the detail page.
        IMPORTANT: Avoid images from 'Related Posts' section at bottom of page.

        Args:
            soup: BeautifulSoup object of the detail page

        Returns:
            URL of the hero image or None if not found
        """
        # Look for the main hero image - usually the largest image near the top
        # In Wix sites, this is often the first substantial image
        # But we need to avoid the related posts section at the bottom

        # First try to find images in main content areas only
        main_content_images: list[Tag] = []

        # Try to find main content containers first
        main_selectors = [
            "main img",
            "article img",
            "[role='main'] img",
            ".main img",
        ]  # Images in main content  # Images in article  # Images in main role  # Images in main class

        for selector in main_selectors:
            try:
                content_imgs = soup.select(selector)
                if content_imgs:
                    main_content_images.extend(content_imgs)
                    self.logger.debug(f"Found {len(content_imgs)} images with selector: {selector}")
            except Exception as e:
                self.logger.debug(f"Selector {selector} failed: {e}")

        # If no main content images found, fall back to all images but filter out related posts
        if not main_content_images:
            all_images = soup.find_all("img")

            for img in all_images:
                if not isinstance(img, Tag):
                    continue

                # Check if image is in related posts section
                is_in_related_posts = False

                # Check if any parent element contains "related" text
                parent = img.parent
                while parent and parent.name != "html":
                    parent_text = parent.get_text().lower() if parent.get_text() else ""
                    if "related" in parent_text and "post" in parent_text:
                        is_in_related_posts = True
                        break
                    parent = parent.parent

                # Check for specific related posts classes/IDs that Wix might use
                parent_attrs = str(img.parent) if img.parent else ""
                if any(term in parent_attrs.lower() for term in ["related", "recommendation", "suggestion"]):
                    is_in_related_posts = True

                if not is_in_related_posts:
                    main_content_images.append(img)

        self.logger.debug(f"Filtered to {len(main_content_images)} main content images")

        # Now look for hero images in the filtered list
        for img in main_content_images:
            # Make sure img is a Tag that has the get method
            if not isinstance(img, Tag):
                continue

            # Get the src attribute safely
            src = img.get("src")
            if not isinstance(src, str):
                continue

            # Filter for substantial dog photos from Wix static content
            if (
                self._is_wixstatic_url(src)
                and any(ext in src.lower() for ext in [".jpg", ".jpeg", ".png", ".webp"])
                and not any(skip in src.lower() for skip in ["logo", "icon", "button", "header", "footer"])
            ):
                # CRITICAL: Exclude images with specific problematic hash that we know is wrong
                if "ef9e05_aac9fec0f9a64d0fba7e40a67965686b" in src:
                    self.logger.debug(f"Skipping known problematic hero image: {src[:100]}...")
                    continue

                # Look for larger images (hero images are typically bigger)
                if "w_" in src:
                    try:
                        width_param = [p for p in src.split(",") if "w_" in p][0]
                        width = int(width_param.split("w_")[1])

                        # CRITICAL: Exclude 289x162 images which are likely related posts
                        height_param = [p for p in src.split(",") if "h_" in p and "h_" in p][0] if any("h_" in p for p in src.split(",")) else None
                        if height_param:
                            try:
                                height = int(height_param.split("h_")[1])
                                if width == 289 and height == 162:
                                    self.logger.debug(f"Skipping 289x162 hero image (likely related posts): {src[:100]}...")
                                    continue
                            except (IndexError, ValueError):
                                pass

                        # Hero images are typically at least 400px wide
                        if width >= 400:
                            # CRITICAL FIX: Clean the hero image URL to get high quality
                            cleaned_url = self._clean_wix_image_url(src)
                            self.logger.debug(f"Found hero image: {cleaned_url}")
                            return cleaned_url
                    except (IndexError, ValueError):
                        # Continue if we can't parse the width
                        pass
                else:
                    # Return any image we found if we can't determine size
                    # CRITICAL FIX: Clean the hero image URL to get high quality
                    cleaned_url = self._clean_wix_image_url(src)
                    self.logger.debug(f"Found potential hero image: {cleaned_url}")
                    return cleaned_url

        self.logger.warning("No hero image found on detail page")
        return None

    def _extract_image_width(self, image_url: str) -> int | None:
        """Extract width from Wix image URL parameters.

        Args:
            image_url: Wix image URL containing width parameter

        Returns:
            Width in pixels or None if not found
        """
        if not image_url or "w_" not in image_url:
            return None

        try:
            width_param = [p for p in image_url.split(",") if "w_" in p][0]
            width = int(width_param.split("w_")[1])
            return width
        except (IndexError, ValueError):
            return None
