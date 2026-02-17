from unittest.mock import Mock, patch

import pytest

from scrapers.manytearsrescue.manytearsrescue_scraper import ManyTearsRescueScraper


@pytest.mark.slow
@pytest.mark.browser
class TestManyTearsRescueScraper:
    def test_scraper_initialization_with_config(self):
        with (
            patch("scrapers.base_scraper.ConfigLoader"),
            patch("scrapers.base_scraper.create_default_sync_service"),
        ):
            scraper = ManyTearsRescueScraper(config_id="manytearsrescue")
            assert scraper is not None
            assert hasattr(scraper, "collect_data")
            assert hasattr(scraper, "get_animal_list")

    def test_scraper_inherits_from_base_scraper(self):
        from scrapers.base_scraper import BaseScraper

        with (
            patch("scrapers.base_scraper.ConfigLoader"),
            patch("scrapers.base_scraper.create_default_sync_service"),
        ):
            scraper = ManyTearsRescueScraper(config_id="manytearsrescue")
            assert isinstance(scraper, BaseScraper)

    @patch("scrapers.manytearsrescue.manytearsrescue_scraper.get_browser_service")
    def test_selenium_driver_cleanup_on_exception(self, mock_browser_service):
        mock_service = Mock()
        mock_browser_service.return_value = mock_service
        mock_driver = Mock()
        mock_browser_result = Mock()
        mock_browser_result.driver = mock_driver
        mock_service.create_driver.return_value = mock_browser_result
        mock_driver.get.side_effect = Exception("Network error")

        with (
            patch("scrapers.base_scraper.ConfigLoader"),
            patch("scrapers.base_scraper.create_default_sync_service"),
        ):
            scraper = ManyTearsRescueScraper(config_id="manytearsrescue")

            result = scraper.get_animal_list()

            assert isinstance(result, list)
            mock_driver.quit.assert_called_once()

    @patch("scrapers.manytearsrescue.manytearsrescue_scraper.get_browser_service")
    def test_collect_data_follows_template_method_pattern(self, mock_browser_service):
        mock_service = Mock()
        mock_browser_service.return_value = mock_service
        mock_driver = Mock()
        mock_browser_result = Mock()
        mock_browser_result.driver = mock_driver
        mock_service.create_driver.return_value = mock_browser_result
        mock_driver.page_source = "<html><body></body></html>"

        with (
            patch("scrapers.base_scraper.ConfigLoader"),
            patch("scrapers.base_scraper.create_default_sync_service"),
        ):
            scraper = ManyTearsRescueScraper(config_id="manytearsrescue")

            with patch.object(scraper, "get_animal_list", return_value=[]) as mock_get_animals:
                result = scraper.collect_data()

                mock_get_animals.assert_called_once()
                assert isinstance(result, list)

    def test_service_injection_constructor_accepts_optional_services(self):
        from services.null_objects import NullMetricsCollector

        mock_metrics = NullMetricsCollector()

        with (
            patch("scrapers.base_scraper.ConfigLoader"),
            patch("scrapers.base_scraper.create_default_sync_service"),
        ):
            scraper = ManyTearsRescueScraper(config_id="manytearsrescue", metrics_collector=mock_metrics)

            assert scraper is not None
            assert scraper.metrics_collector is not None
