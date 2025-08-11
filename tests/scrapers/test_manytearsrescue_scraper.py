"""Tests for ManyTearsRescueScraper class.

Note: This file focuses on behavior-based testing rather than implementation details.
The comprehensive functional test in test_manytearsrescue_detail_extraction.py
validates real data extraction from 5 dogs with complete descriptions.
"""

from unittest.mock import Mock, patch

import pytest

from scrapers.manytearsrescue.manytearsrescue_scraper import ManyTearsRescueScraper


class TestManyTearsRescueScraper:
    """Test cases for ManyTearsRescueScraper basic functionality."""

    def test_scraper_initialization_with_config(self):
        """Test scraper can be initialized with config_id."""
        with patch("scrapers.base_scraper.ConfigLoader"), patch("scrapers.base_scraper.create_default_sync_service"):
            scraper = ManyTearsRescueScraper(config_id="manytearsrescue")
            assert scraper is not None
            assert hasattr(scraper, "collect_data")
            assert hasattr(scraper, "get_animal_list")

    def test_scraper_inherits_from_base_scraper(self):
        """Test that ManyTearsRescueScraper properly inherits from BaseScraper."""
        from scrapers.base_scraper import BaseScraper

        with patch("scrapers.base_scraper.ConfigLoader"), patch("scrapers.base_scraper.create_default_sync_service"):
            scraper = ManyTearsRescueScraper(config_id="manytearsrescue")
            assert isinstance(scraper, BaseScraper)

    @patch("scrapers.manytearsrescue.manytearsrescue_scraper.webdriver.Chrome")
    def test_selenium_driver_cleanup_on_exception(self, mock_webdriver):
        """Test WebDriver is properly cleaned up even when exceptions occur."""
        mock_driver = Mock()
        mock_webdriver.return_value = mock_driver
        mock_driver.get.side_effect = Exception("Network error")

        with patch("scrapers.base_scraper.ConfigLoader"), patch("scrapers.base_scraper.create_default_sync_service"):
            scraper = ManyTearsRescueScraper(config_id="manytearsrescue")

            # Should handle exception gracefully and clean up driver
            result = scraper.get_animal_list()

            assert isinstance(result, list)  # Should return empty list on error
            mock_driver.quit.assert_called_once()

    @patch("scrapers.manytearsrescue.manytearsrescue_scraper.webdriver.Chrome")
    def test_collect_data_follows_template_method_pattern(self, mock_webdriver):
        """Test collect_data follows template method pattern by calling get_animal_list."""
        mock_driver = Mock()
        mock_webdriver.return_value = mock_driver
        mock_driver.page_source = "<html><body></body></html>"

        with patch("scrapers.base_scraper.ConfigLoader"), patch("scrapers.base_scraper.create_default_sync_service"):
            scraper = ManyTearsRescueScraper(config_id="manytearsrescue")

            # Mock get_animal_list to verify it's called
            with patch.object(scraper, "get_animal_list", return_value=[]) as mock_get_animals:
                result = scraper.collect_data()

                mock_get_animals.assert_called_once()
                assert isinstance(result, list)

    def test_service_injection_constructor_accepts_optional_services(self):
        """Test constructor accepts optional service dependencies."""
        from services.null_objects import NullMetricsCollector

        mock_metrics = NullMetricsCollector()

        with patch("scrapers.base_scraper.ConfigLoader"), patch("scrapers.base_scraper.create_default_sync_service"):
            scraper = ManyTearsRescueScraper(config_id="manytearsrescue", metrics_collector=mock_metrics)

            assert scraper is not None
            # Verify dependency injection works
            assert scraper.metrics_collector is not None
