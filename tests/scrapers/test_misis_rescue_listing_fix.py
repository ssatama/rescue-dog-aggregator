from unittest.mock import Mock, patch

import pytest
from bs4 import BeautifulSoup

from scrapers.misis_rescue.scraper import MisisRescueScraper


@pytest.mark.computation
@pytest.mark.integration
@pytest.mark.network
@pytest.mark.slow
class TestMisisRescueListingFix:
    """Test fixes for MisisRescue listing page extraction."""

    @pytest.fixture
    def scraper(self):
        """Create scraper with mocked dependencies."""
        with patch("scrapers.base_scraper.create_default_sync_service") as mock_sync, patch("scrapers.base_scraper.ConfigLoader") as mock_loader, patch("scrapers.base_scraper.R2Service"):

            mock_sync_instance = Mock()
            mock_sync_instance.sync_single_organization.return_value = Mock(organization_id=13, was_created=True)
            mock_sync.return_value = mock_sync_instance

            mock_config = Mock()
            mock_config.get_scraper_config_dict.return_value = {"rate_limit_delay": 0.1, "max_retries": 1, "timeout": 10}
            mock_config.name = "MisisRescue"
            mock_loader.return_value.load_config.return_value = mock_config

            return MisisRescueScraper(config_id="misisrescue")

    def test_extract_dogs_with_images_from_listing(self, scraper):
        """Test that dogs are extracted WITH images from listing page."""
        # Real HTML structure from listing page
        listing_html = """
        <html>
        <body>
            <div class="dog-grid">
                <a href="/post/leila" class="dog-card">
                    <img src="https://static.wixstatic.com/media/dog1.jpg" alt="Leila">
                    <span>Leila</span>
                </a>
                <a href="/post/__leo-2" class="dog-card">
                    <img src="https://static.wixstatic.com/media/dog2.jpg" alt="LEO">
                    <span>LEO</span>
                </a>
                <a href="/post/aisha" class="dog-card">
                    <img src="https://static.wixstatic.com/media/dog3.jpg" alt="Aisha">
                    <span>Aisha❣️🌷</span>
                </a>
            </div>
        </body>
        </html>
        """

        soup = BeautifulSoup(listing_html, "html.parser")

        # Extract dogs first (without images)
        dogs = scraper._extract_dogs_before_reserved(soup)

        # Then assign images
        scraper._assign_images_to_dogs(dogs, soup)

        assert len(dogs) == 3
        assert dogs[0]["name"] == "Leila"
        assert dogs[0]["url"] == "/post/leila"
        # Images are assigned deterministically based on sorted order
        assert dogs[0]["image_url"] is not None

        assert dogs[1]["name"] == "LEO"
        assert dogs[1]["url"] == "/post/__leo-2"
        assert dogs[1]["image_url"] is not None

    def test_no_pagination_loop(self, scraper):
        """Test that pagination doesn't create duplicates."""
        with patch.object(scraper, "_extract_dog_urls_from_page") as mock_extract:
            # Return 7 dogs only on page 1, empty on page 2
            mock_extract.side_effect = [["/post/dog1", "/post/dog2", "/post/dog3", "/post/dog4", "/post/dog5", "/post/dog6", "/post/dog7"], []]  # Empty on page 2 - should stop

            all_urls = scraper._get_all_dog_urls()

            # Should only have 7 unique dogs, not 28 duplicates
            assert len(all_urls) == 7
            assert len(set(all_urls)) == 7  # All unique

            # Should only call extract twice (page 1 finds dogs, page 2 empty)
            assert mock_extract.call_count == 2

    def test_collect_data_with_images(self, scraper):
        """Test that collect_data returns dogs with all fields including images."""
        # Mock the listing page extraction with images
        mock_dogs_with_images = [
            {"name": "Leila", "url": "/post/leila", "image_url": "https://example.com/leila.jpg"},
            {"name": "LEO", "url": "/post/__leo-2", "image_url": "https://example.com/leo.jpg"},
        ]

        # Mock detail page data
        mock_detail_data = {
            "name": "Test Dog",
            "breed": "Mixed Breed",
            "sex": "Female",
            "size": "Medium",
            "age_text": "3 years",
            "properties": {"weight": "15.0kg"},
            "external_id": "test-dog",
            "adoption_url": "https://www.misisrescue.com/post/test-dog",
            "organization_id": 13,
            "image_urls": ["https://example.com/image.jpg"],
            "primary_image_url": "https://example.com/image.jpg",
        }

        with (
            patch.object(scraper, "_get_all_dogs_from_listing") as mock_listing,
            patch.object(scraper, "_scrape_dog_detail_fast") as mock_detail_fast,
            patch.object(scraper, "_scrape_dog_detail") as mock_detail,
        ):

            mock_listing.return_value = mock_dogs_with_images
            mock_detail_fast.return_value = mock_detail_data
            mock_detail.return_value = mock_detail_data

            dogs = scraper.collect_data()

            # Should have complete data including images
            assert len(dogs) == 2
            for dog in dogs:
                assert dog["breed"] == "Mixed Breed"
                assert dog["sex"] == "Female"
                assert dog["primary_image_url"] is not None
