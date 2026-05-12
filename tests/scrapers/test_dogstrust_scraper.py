"""Tests for DogsTrustScraper class.

Focus on behavior-based testing for the Dogs Trust scraper implementation.
Tests cover the hybrid approach (Selenium for listings, HTTP for details)
and reserved dog filtering requirements.
"""

from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock, Mock, patch

import pytest

from scrapers.base_scraper import BaseScraper
from scrapers.dogstrust.dogstrust_scraper import DogsTrustScraper
from tests.scrapers.test_scraper_base import ScraperTestBase
from utils.unified_standardization import UnifiedStandardizer


@pytest.mark.slow
@pytest.mark.browser
class TestDogsTrustScraper(ScraperTestBase):
    """Test cases for DogsTrustScraper - only scraper-specific tests."""

    # Configuration for base class
    scraper_class = DogsTrustScraper
    config_id = "dogstrust"
    expected_org_name = "Dogs Trust"
    expected_base_url = "https://www.dogstrust.org.uk"

    @patch("scrapers.dogstrust.dogstrust_scraper.get_browser_service")
    def test_selenium_driver_cleanup_on_exception(self, mock_browser_service, scraper):
        """Test WebDriver is properly cleaned up even when exceptions occur."""
        mock_service = Mock()
        mock_browser_service.return_value = mock_service
        mock_driver = Mock()
        mock_browser_result = Mock()
        mock_browser_result.driver = mock_driver
        mock_service.create_driver.return_value = mock_browser_result
        mock_driver.get.side_effect = Exception("Network error")

        # Should handle exception gracefully and clean up driver
        result = scraper.get_animal_list()

        assert isinstance(result, list)  # Should return empty list on error
        mock_driver.quit.assert_called_once()

    @patch("scrapers.dogstrust.dogstrust_scraper.get_browser_service")
    def test_get_animal_list_applies_reserved_dog_filter(self, mock_browser_service, scraper):
        """Test that get_animal_list applies filter to hide reserved dogs through UI."""
        mock_service = Mock()
        mock_browser_service.return_value = mock_service
        mock_driver = Mock()
        mock_browser_result = Mock()
        mock_browser_result.driver = mock_driver
        mock_service.create_driver.return_value = mock_browser_result
        mock_driver.page_source = """
        <html>
            <body>
                <div>1 of 5</div>
            </body>
        </html>
        """

        # Mock find_element to simulate filter elements not found
        mock_driver.find_element.side_effect = Exception("Element not found")

        result = scraper.get_animal_list()

        # Verify the initial page load call
        expected_first_url = "https://www.dogstrust.org.uk/rehoming/dogs"
        mock_driver.get.assert_any_call(expected_first_url)
        # Verify attempts to find filter elements were made
        assert mock_driver.find_element.called
        assert isinstance(result, list)


class TestDogsTrustUnifiedStandardization:
    """Test DogsTrust scraper unified standardization integration."""

    def test_dogstrust_inherits_from_base_scraper(self):
        """Test that DogsTrust scraper inherits from BaseScraper."""
        scraper = DogsTrustScraper()
        assert isinstance(scraper, BaseScraper)
        assert hasattr(scraper, "standardizer")
        assert isinstance(scraper.standardizer, UnifiedStandardizer)

    def test_dogstrust_uses_unified_standardization_when_enabled(self):
        """Test that DogsTrust uses unified standardization when feature flag is enabled."""
        scraper = DogsTrustScraper()

        # Mock feature flag enabled
        with patch("utils.feature_flags.is_scraper_standardization_enabled", return_value=True):
            raw_animal_data = {
                "name": "Buddy",
                "breed": "german shepherd",
                "age": "3 years old",
                "size": "large",
                "gender": "Male",
            }

            processed = scraper.process_animal(raw_animal_data)

            # Verify unified standardization was applied
            assert processed["breed"] == "German Shepherd Dog"  # Standardized breed
            assert processed["breed_category"] == "Herding"  # Group assignment
            assert processed["standardized_size"] == "Large"  # Size standardization
            assert processed["primary_breed"] == "German Shepherd Dog"  # Primary breed
            assert processed["standardization_confidence"] > 0.8  # Confidence score

    def test_dogstrust_bypasses_unified_when_disabled(self):
        """Test that DogsTrust bypasses unified standardization when feature flag is disabled."""
        scraper = DogsTrustScraper()

        # Disable unified standardization
        scraper.use_unified_standardization = False

        raw_animal_data = {
            "name": "Buddy",
            "breed": "german shepherd",
            "age": "3 years old",
            "size": "large",
        }

        processed = scraper.process_animal(raw_animal_data)

        # Should return original data when flag disabled
        assert processed == raw_animal_data

    def test_dogstrust_removes_optimized_standardization_imports(self):
        """Test that DogsTrust no longer imports from optimized_standardization after migration."""
        import inspect

        import scrapers.dogstrust.dogstrust_scraper as dogstrust_module

        # Get the source code
        source = inspect.getsource(dogstrust_module)

        # Should NOT contain optimized_standardization imports after migration
        assert "from utils.optimized_standardization" not in source
        assert "parse_age_text" not in source or "import" not in source
        assert "standardize_breed" not in source or "import" not in source
        assert "standardize_size_value" not in source or "import" not in source

    def test_dogstrust_handles_missing_breed_gracefully(self):
        """Test that DogsTrust handles missing breed data gracefully."""
        scraper = DogsTrustScraper()

        with patch("utils.feature_flags.is_scraper_standardization_enabled", return_value=True):
            raw_animal_data = {
                "name": "Buddy",
                # Missing breed field
                "age": "2 years",
                "size": "medium",
            }

            processed = scraper.process_animal(raw_animal_data)

            # Should handle missing breed gracefully
            assert "breed" in processed
            assert processed["breed_category"] == "Unknown"


# --- Playwright listing-page resilience tests ---
#
# Production data (organization_id=28) shows ~50% of cron runs since 2026-04-20
# finish in ~22s with zero dogs, every failure preceded by:
#   "Timeout waiting for initial page load: Page.wait_for_selector: Timeout 15000ms exceeded"
# Successful runs of the same scraper return 393-442 dogs. The site itself is
# fine; the issue is intermittent remote-Browserless page load slowness.
#
# These tests lock in:
#   1. Canonical parameterized listing URL (avoids the /rehoming/dogs redirect).
#   2. One retry on initial wait_for_selector timeout.
#   3. Hard-fail (raise) if both attempts time out, so Sentry/Railway logs show
#      a real error instead of swallowing it into a misleading zero-dogs alert.


def _build_listing_page_mock(wait_for_selector_side_effect, content_html=""):
    """Build a mock Playwright Page that satisfies the listing flow.

    All locator-based interactions (cookie banner, filter button, etc.) default
    to "not visible" so the test only exercises wait_for_selector + content().
    """
    page = MagicMock()
    page.goto = AsyncMock()
    page.evaluate = AsyncMock(return_value=0)
    page.wait_for_selector = AsyncMock(side_effect=wait_for_selector_side_effect)
    page.content = AsyncMock(return_value=content_html)
    page.reload = AsyncMock()

    locator_first = MagicMock()
    locator_first.is_visible = AsyncMock(return_value=False)
    locator_first.is_enabled = AsyncMock(return_value=False)
    locator_first.click = AsyncMock()
    locator_first.scroll_into_view_if_needed = AsyncMock()
    locator = MagicMock()
    locator.first = locator_first
    page.locator = MagicMock(return_value=locator)

    return page


def _patch_browser_retry(scraper, page):
    """Replace scraper._with_browser_retry with one yielding the given page."""

    @asynccontextmanager
    async def _retry(*_args, **_kwargs):
        result = MagicMock()
        result.page = page
        result.is_remote = True
        yield result

    scraper._with_browser_retry = _retry


_VALID_LISTING_HTML = """
<html><body>
    <a href="/rehoming/dogs/lurcher/3641644">Lulu Lurcher</a>
    <a href="/rehoming/dogs/french-bulldog/3625780">Nelly French Bulldog</a>
    <div>1 of 41</div>
</body></html>
"""


@pytest.mark.unit
class TestDogsTrustListingUrl:
    def test_listing_url_uses_canonical_parameterized_path(self):
        scraper = DogsTrustScraper()
        # Skipping the bare /rehoming/dogs redirect removes one anti-bot
        # interception point during the page load.
        assert "page=0" in scraper.listing_url
        assert "currentDistance=1000" in scraper.listing_url


@pytest.mark.unit
class TestDogsTrustPlaywrightResilience:
    @pytest.mark.asyncio
    async def test_retries_initial_wait_on_timeout(self):
        """First wait_for_selector times out, reload + second wait succeeds."""
        scraper = DogsTrustScraper()
        page = _build_listing_page_mock(
            wait_for_selector_side_effect=[TimeoutError("initial timeout"), None],
            content_html=_VALID_LISTING_HTML,
        )
        _patch_browser_retry(scraper, page)

        result = await scraper._get_animal_list_playwright(max_pages_to_scrape=1)

        page.reload.assert_awaited_once()
        assert page.wait_for_selector.await_count == 2
        assert len(result) == 2  # both dogs from the listing HTML

    @pytest.mark.asyncio
    async def test_raises_when_both_wait_attempts_timeout(self):
        """Both wait attempts fail → raise instead of silently returning []."""
        scraper = DogsTrustScraper()
        page = _build_listing_page_mock(
            wait_for_selector_side_effect=[
                TimeoutError("first timeout"),
                TimeoutError("retry timeout"),
            ],
            content_html="",
        )
        _patch_browser_retry(scraper, page)

        with pytest.raises(Exception):  # noqa: B017 — any exception type counts
            await scraper._get_animal_list_playwright(max_pages_to_scrape=1)

        page.reload.assert_awaited_once()
        assert page.wait_for_selector.await_count == 2

    @pytest.mark.asyncio
    async def test_no_retry_when_first_wait_succeeds(self):
        """Happy path: first wait succeeds, page.reload is never called."""
        scraper = DogsTrustScraper()
        page = _build_listing_page_mock(
            wait_for_selector_side_effect=[None],
            content_html=_VALID_LISTING_HTML,
        )
        _patch_browser_retry(scraper, page)

        result = await scraper._get_animal_list_playwright(max_pages_to_scrape=1)

        page.reload.assert_not_called()
        assert page.wait_for_selector.await_count == 1
        assert len(result) == 2
