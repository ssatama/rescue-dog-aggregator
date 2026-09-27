from unittest.mock import patch

import pytest

from scrapers.manytearsrescue.manytearsrescue_scraper import ManyTearsRescueScraper


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

    def test_collect_data_follows_template_method_pattern(self):
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
