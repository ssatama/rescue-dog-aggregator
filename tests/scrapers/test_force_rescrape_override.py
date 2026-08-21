"""One-off override for skip_existing_animals.

Dogs Trust runs with skip_existing_animals: true, so after the description
extractor was fixed the 512 dogs already in the database would never have been
re-fetched and would have kept their breed-guide descriptions forever. Forcing a
full re-scrape needed a runtime switch rather than a config edit that someone has
to remember to revert.
"""

import pytest

from scrapers.base_scraper import force_rescrape_enabled


@pytest.mark.unit
class TestForceRescrapeEnabled:
    def test_off_by_default(self, monkeypatch):
        monkeypatch.delenv("FORCE_RESCRAPE", raising=False)

        assert force_rescrape_enabled() is False

    @pytest.mark.parametrize("value", ["true", "TRUE", "True", "1", "yes"])
    def test_recognises_affirmative_values(self, monkeypatch, value):
        monkeypatch.setenv("FORCE_RESCRAPE", value)

        assert force_rescrape_enabled() is True

    @pytest.mark.parametrize("value", ["false", "0", "no", "", "maybe"])
    def test_anything_else_is_off(self, monkeypatch, value):
        monkeypatch.setenv("FORCE_RESCRAPE", value)

        assert force_rescrape_enabled() is False
