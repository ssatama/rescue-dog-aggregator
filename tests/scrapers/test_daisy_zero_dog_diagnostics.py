"""A zero-dog run on Daisy Family Rescue must say why.

The scraper returned zero dogs on three runs in the last 60 days and 28 over
the last eight months, each recorded as a `warning` with no cause (Sentry
PYTHON-FASTAPI-Y). collect_data flattened every exception into an empty list,
so a Browserless session drop, a navigation timeout and a selector change all
produced the same signal: dogs_found = 0, and nothing else.
"""

import inspect
from unittest.mock import MagicMock, patch

import pytest
from bs4 import BeautifulSoup

from scrapers.daisy_family_rescue.dogs_scraper import DaisyFamilyRescueScraper


@pytest.fixture
def scraper():
    with patch("scrapers.base_scraper.ConfigLoader") as mock_loader:
        config = MagicMock()
        config.name = "Daisy Family Rescue e.V."
        config.get_scraper_config_dict.return_value = {"rate_limit_delay": 0, "headless": True}
        config.metadata.website_url = "https://daisyfamilyrescue.de"
        mock_loader.return_value.load_config.return_value = config
        instance = DaisyFamilyRescueScraper(config_id="daisyfamilyrescue")
        instance.logger = MagicMock()
        return instance


@pytest.mark.unit
class TestCollectDataPropagatesFailures:
    """BaseScraper can only mark a run `error` if the exception reaches it."""

    def test_browser_failure_propagates_instead_of_returning_empty(self, scraper):
        with patch.object(scraper, "_extract_with_selenium") as mock_extract:
            mock_extract.side_effect = RuntimeError("Browserless session closed")

            with pytest.raises(RuntimeError, match="Browserless session closed"):
                scraper.collect_data()

    def test_translation_failure_propagates(self, scraper):
        with (
            patch.object(scraper, "_extract_with_selenium") as mock_extract,
            patch.object(scraper, "_translate_and_normalize_dogs") as mock_translate,
        ):
            mock_extract.return_value = [{"name": "BRUNO", "external_id": "hund-bruno"}]
            mock_translate.side_effect = RuntimeError("translation service down")

            with pytest.raises(RuntimeError, match="translation service down"):
                scraper.collect_data()

    def test_source_carries_no_blanket_swallow(self, scraper):
        source = inspect.getsource(scraper.collect_data)

        assert "except Exception" not in source, "collect_data must not catch and return [] - that is the silent failure this test exists to prevent"

    def test_a_genuinely_empty_listing_is_still_an_empty_list(self, scraper):
        with patch.object(scraper, "_extract_with_selenium") as mock_extract:
            mock_extract.return_value = []

            assert scraper.collect_data() == []


@pytest.mark.unit
class TestEmptyFilterResultIsDiagnosable:
    """No exception, no dogs: the log must distinguish the possible causes.

    Logged at WARNING so it lands as a breadcrumb on the alert_zero_dogs_found
    event rather than raising a second, competing Sentry issue.
    """

    def test_a_page_that_did_not_render_says_so(self, scraper):
        soup = BeautifulSoup("<html><body></body></html>", "html.parser")

        assert scraper._filter_dogs_by_section_soup(soup) == []

        message = scraper.logger.warning.call_args[0][0]
        assert "0 section headers" in message
        assert "0 dog containers" in message

    def test_a_changed_dog_link_pattern_is_distinguishable_from_an_empty_page(self, scraper):
        """The grid rendered, but no container holds a /hund- link any more."""
        html = """
        <html><body>
          <h2 class="elementor-heading-title elementor-size-default">Unsere Hündinnen</h2>
          <article class="elementor-post elementor-grid-item ecs-post-loop">
            <a href="/tiere/bruno/">BRUNO</a>
          </article>
        </body></html>
        """
        soup = BeautifulSoup(html, "html.parser")

        assert scraper._filter_dogs_by_section_soup(soup) == []

        message = scraper.logger.warning.call_args[0][0]
        assert "1 section headers" in message
        assert "1 dog containers" in message
        assert "1 matched a known section" in message

    def test_a_healthy_page_logs_no_diagnostic(self, scraper):
        html = """
        <html><body>
          <h2 class="elementor-heading-title elementor-size-default">Unsere Hündinnen</h2>
          <article class="elementor-post elementor-grid-item ecs-post-loop">
            <a href="/hund-bruno/">BRUNO</a>
          </article>
        </body></html>
        """
        soup = BeautifulSoup(html, "html.parser")

        assert len(scraper._filter_dogs_by_section_soup(soup)) == 1
        scraper.logger.warning.assert_not_called()
