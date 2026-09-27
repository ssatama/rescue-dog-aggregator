from unittest.mock import patch

import pytest

from scrapers.manytearsrescue.manytearsrescue_scraper import ManyTearsRescueScraper


@pytest.mark.browser
class TestManyTearsRescueScraper:
    def test_scraper_initialization_with_config(self):
        with (
            patch("scrapers.base_scraper.ConfigLoader"),
        ):
            scraper = ManyTearsRescueScraper(config_id="manytearsrescue")
            assert scraper is not None
            assert hasattr(scraper, "collect_data")
            assert hasattr(scraper, "get_animal_list")

    def test_scraper_inherits_from_base_scraper(self):
        from scrapers.base_scraper import BaseScraper

        with (
            patch("scrapers.base_scraper.ConfigLoader"),
        ):
            scraper = ManyTearsRescueScraper(config_id="manytearsrescue")
            assert isinstance(scraper, BaseScraper)

    def test_collect_data_follows_template_method_pattern(self):
        with (
            patch("scrapers.base_scraper.ConfigLoader"),
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
        ):
            scraper = ManyTearsRescueScraper(config_id="manytearsrescue", metrics_collector=mock_metrics)

            assert scraper is not None
            assert scraper.metrics_collector is not None


@pytest.mark.unit
class TestSweep571:
    """#571: fixes from the audit."""

    @pytest.fixture
    def scraper(self):
        from pathlib import Path

        from bs4 import BeautifulSoup

        page = (Path(__file__).parent.parent / "fixtures" / "galleries" / "manytears_6199.html").read_text()
        return ManyTearsRescueScraper(), BeautifulSoup(page, "html.parser")

    def test_the_breed_is_not_the_compatibility_line(self, scraper):
        many_tears, soup = scraper

        assert many_tears._extract_structured_data_from_detail_page(soup)["breed"] == "Giant Schnauzer Cross"

    def test_the_sponsor_filter_keeps_decimals_and_abbreviations(self, scraper):
        many_tears, _ = scraper
        text = "Bella is 2.5 years old, e.g. she loves walks. Gift of Life by Jane Doe. She is kind."

        assert many_tears._filter_sponsor_text(text) == "Bella is 2.5 years old, e.g. she loves walks. She is kind."

    def test_a_diary_entry_is_its_title_without_a_placeholder(self, scraper):
        from bs4 import BeautifulSoup

        many_tears, _ = scraper
        soup = BeautifulSoup("<h2>My Diary</h2><ul><li><button>01-09-26 Settling in</button></li></ul>", "html.parser")

        assert many_tears._extract_diary_entries(soup) == {"01-09-26": "Settling in"}

    def test_a_loose_paragraph_is_not_a_requirement(self):
        from bs4 import BeautifulSoup

        soup = BeautifulSoup("<p>I would love a home with a big garden and long walks every day.</p>", "html.parser")

        assert ManyTearsRescueScraper()._extract_requirements_sections(soup) == {}
