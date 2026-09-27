"""Detail fetchers let a transient failure reach the retry, not swallow it (#571)."""

import asyncio
from unittest.mock import AsyncMock, Mock, patch

import pytest
import requests

from scrapers.manytearsrescue.manytearsrescue_scraper import ManyTearsRescueScraper
from scrapers.santerpawsbulgarianrescue.santerpawsbulgarianrescue_scraper import SanterPawsBulgarianRescueScraper
from scrapers.tierschutzverein_europa.dogs_scraper import TierschutzvereinEuropaScraper


@pytest.mark.unit
@pytest.mark.parametrize(
    ("scraper_class", "module"),
    [
        (SanterPawsBulgarianRescueScraper, "scrapers.santerpawsbulgarianrescue.santerpawsbulgarianrescue_scraper"),
        (TierschutzvereinEuropaScraper, "scrapers.tierschutzverein_europa.dogs_scraper"),
    ],
)
def test_a_timeout_propagates_and_a_404_does_not(scraper_class, module):
    scraper = scraper_class()

    with patch(f"{module}.requests.get", side_effect=requests.Timeout("slow")), pytest.raises(requests.Timeout):
        scraper._scrape_animal_details("https://rescue.example/dog/a/")

    not_found = requests.HTTPError(response=Mock(status_code=404))
    with patch(f"{module}.requests.get", return_value=Mock(raise_for_status=Mock(side_effect=not_found))):
        assert scraper._scrape_animal_details("https://rescue.example/dog/a/") == {}


@pytest.mark.unit
def test_many_tears_page_that_did_not_load_is_a_timeout():
    service = Mock(get_page_content=AsyncMock(return_value=Mock(success=False, error="net::ERR_TIMED_OUT")))

    with patch("scrapers.manytearsrescue.manytearsrescue_scraper.get_playwright_service", return_value=service), pytest.raises(TimeoutError):
        asyncio.run(ManyTearsRescueScraper()._scrape_animal_details_playwright("https://www.manytearsrescue.org/adopt/dogs/1/"))
