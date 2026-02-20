"""
Tests for async detail page extraction in Daisy Family Rescue scraper.

Validates that the async event loop conflict (asyncio.run() from within
an already-running async context) is resolved by using direct async calls.

Fixes PYTHON-FASTAPI-1Y.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from scrapers.daisy_family_rescue.dog_detail_scraper import (
    DaisyFamilyRescueDogDetailScraper,
)


@pytest.mark.unit
class TestDaisyAsyncDetailScraper:
    """Test async_extract_dog_details avoids asyncio.run() in async contexts."""

    @pytest.fixture
    def detail_scraper(self):
        return DaisyFamilyRescueDogDetailScraper()

    @pytest.mark.asyncio
    @patch("scrapers.daisy_family_rescue.dog_detail_scraper.USE_PLAYWRIGHT", True)
    async def test_async_extract_dog_details_returns_data(self, detail_scraper):
        """async_extract_dog_details returns data without asyncio.run()."""
        expected = {"name": "Buddy", "adoption_url": "https://example.com/buddy"}
        detail_scraper._extract_dog_details_playwright = AsyncMock(return_value=expected)

        result = await detail_scraper.async_extract_dog_details("https://example.com/buddy")

        assert result == expected
        detail_scraper._extract_dog_details_playwright.assert_awaited_once_with("https://example.com/buddy", None)

    @pytest.mark.asyncio
    @patch("scrapers.daisy_family_rescue.dog_detail_scraper.USE_PLAYWRIGHT", True)
    async def test_async_extract_returns_none_on_failure(self, detail_scraper):
        """async_extract_dog_details returns None when extraction fails."""
        detail_scraper._extract_dog_details_playwright = AsyncMock(return_value=None)

        result = await detail_scraper.async_extract_dog_details("https://example.com/missing")

        assert result is None

    @pytest.mark.asyncio
    @patch("scrapers.daisy_family_rescue.dog_detail_scraper.USE_PLAYWRIGHT", False)
    async def test_async_extract_falls_back_to_selenium(self, detail_scraper):
        """async_extract_dog_details uses Selenium when Playwright is disabled."""
        expected = {"name": "Rex"}
        detail_scraper._extract_dog_details_selenium = MagicMock(return_value=expected)

        result = await detail_scraper.async_extract_dog_details("https://example.com/rex")

        assert result == expected


@pytest.mark.unit
class TestDaisyEnhanceWithDetailPageAsync:
    """Test that _enhance_with_detail_page works correctly as async."""

    @pytest.fixture
    def scraper(self):
        with patch("scrapers.base_scraper.psycopg2"):
            from scrapers.daisy_family_rescue.dogs_scraper import (
                DaisyFamilyRescueScraper,
            )

            s = DaisyFamilyRescueScraper(config_id="daisyfamilyrescue")
            s.conn = MagicMock()
            s.cursor = MagicMock()
            return s

    @pytest.mark.asyncio
    async def test_enhance_merges_basic_and_detail_data(self, scraper):
        """_enhance_with_detail_page merges basic + detail data correctly."""
        basic_data = {
            "name": "Luna",
            "adoption_url": "https://daisyfamilyrescue.de/luna",
            "properties": {"source": "listing"},
        }
        detail_data = {
            "name": "Luna",
            "properties": {"german_description": "Ein toller Hund"},
            "primary_image_url": "https://example.com/luna.jpg",
        }

        mock_detail_scraper = MagicMock()
        mock_detail_scraper.async_extract_dog_details = AsyncMock(return_value=detail_data)
        scraper.detail_scraper = mock_detail_scraper

        result = await scraper._enhance_with_detail_page(basic_data)

        assert result is not None
        assert result["name"] == "Luna"
        assert result["primary_image_url"] == "https://example.com/luna.jpg"
        assert result["properties"]["source"] == "listing"
        assert result["properties"]["german_description"] == "Ein toller Hund"

    @pytest.mark.asyncio
    async def test_enhance_returns_basic_on_detail_failure(self, scraper):
        """_enhance_with_detail_page returns basic data when detail extraction fails."""
        basic_data = {
            "name": "Max",
            "adoption_url": "https://daisyfamilyrescue.de/max",
        }

        mock_detail_scraper = MagicMock()
        mock_detail_scraper.async_extract_dog_details = AsyncMock(return_value=None)
        scraper.detail_scraper = mock_detail_scraper

        result = await scraper._enhance_with_detail_page(basic_data)

        assert result == basic_data

    @pytest.mark.asyncio
    async def test_enhance_returns_basic_on_no_adoption_url(self, scraper):
        """_enhance_with_detail_page returns basic data when no adoption URL."""
        basic_data = {"name": "Spot"}

        result = await scraper._enhance_with_detail_page(basic_data)

        assert result == basic_data
