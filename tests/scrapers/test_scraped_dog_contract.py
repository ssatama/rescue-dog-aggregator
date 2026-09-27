"""Every scraper's output keeps the ScrapedDog contract (#568).

Each case runs a scraper's own parsing over a saved real page: the gallery
fixtures (2026-09-24), Pets in Turkey's saved listing and REAN's text
entries. Galgos del Sol and Furry Rescue Italy are disabled and have none.
"""

import asyncio
from pathlib import Path
from unittest.mock import AsyncMock, Mock, patch

import pytest

from scrapers.animalrescuebosnia.animalrescuebosnia_scraper import AnimalRescueBosniaScraper
from scrapers.contract import missing_required, unknown_keys
from scrapers.daisy_family_rescue.dog_detail_scraper import DaisyFamilyRescueDogDetailScraper
from scrapers.dogstrust.dogstrust_scraper import DogsTrustScraper
from scrapers.manytearsrescue.manytearsrescue_scraper import ManyTearsRescueScraper
from scrapers.misis_rescue.scraper import MisisRescueScraper
from scrapers.pets_in_turkey.petsinturkey_scraper import PetsInTurkeyScraper
from scrapers.rean.dogs_scraper import REANScraper
from scrapers.santerpawsbulgarianrescue.santerpawsbulgarianrescue_scraper import SanterPawsBulgarianRescueScraper
from scrapers.theunderdog.theunderdog_scraper import TheUnderdogScraper
from scrapers.tierschutzverein_europa.dogs_scraper import TierschutzvereinEuropaScraper
from scrapers.woof_project.dogs_scraper import WoofProjectScraper
from tests.fixtures.playwright_fakes import fake_page, fake_playwright_service

FIXTURES = Path(__file__).parent.parent / "fixtures"
PLACEHOLDERS = {"Unknown", "unknown", "No description available"}


def _page(name: str) -> str:
    return (FIXTURES / "galleries" / f"{name}.html").read_text()


def _over_http(scraper, module: str, fixture: str, method: str, url: str) -> dict:
    html = _page(fixture)
    response = Mock(text=html, content=html.encode(), status_code=200, raise_for_status=lambda: None)
    with patch(f"{module}.requests.get", return_value=response):
        return getattr(scraper, method)(url)


def _listed(url: str, external_id: str, name: str, details: dict) -> dict:
    """A detail-only fetcher's output merged over its listing card, as collect_data does."""
    return {"name": name, "external_id": external_id, "adoption_url": url, "animal_type": "dog", "status": "available"} | details


def bosnia():
    return _over_http(
        AnimalRescueBosniaScraper(config_id="animalrescuebosnia"),
        "scrapers.animalrescuebosnia.animalrescuebosnia_scraper",
        "arb_johny",
        "scrape_animal_details",
        "https://www.animal-rescue-bosnia.org/johny/",
    )


def santer():
    url = "https://santerpawsbulgarianrescue.com/dog/dexter/"
    details = _over_http(SanterPawsBulgarianRescueScraper(), "scrapers.santerpawsbulgarianrescue.santerpawsbulgarianrescue_scraper", "santer_dexter", "_scrape_animal_details", url)
    return _listed(url, "spbr-dexter", "Dexter", details)


def underdog():
    return _over_http(TheUnderdogScraper(), "scrapers.theunderdog.theunderdog_scraper", "underdog_teddy", "scrape_animal_details", "https://www.theunderdog.org/adopt/teddy")


def woof():
    return _over_http(WoofProjectScraper(), "scrapers.woof_project.dogs_scraper", "woof_sora", "scrape_animal_details", "https://woofproject.eu/adoption/sora/")


def tierschutzverein():
    url = "https://tierschutzverein-europa.de/tiervermittlung/pontos/"
    details = _over_http(TierschutzvereinEuropaScraper(), "scrapers.tierschutzverein_europa.dogs_scraper", "tsv_pontos", "_scrape_animal_details", url)
    return _listed(url, "tsv-pontos", "Pontos", details)


def dogstrust():
    url = "https://www.dogstrust.org.uk/rehoming/dogs/crossbreed/3473958"
    scraper = DogsTrustScraper()
    details = _over_http(scraper, "scrapers.dogstrust.dogstrust_scraper", "dogstrust_3473958", "_scrape_animal_details_http", url)
    return _listed(url, "3473958", details.get("name") or "Dog", details)


def misis():
    return _over_http(MisisRescueScraper(), "scrapers.misis_rescue.scraper", "misis_freya", "_fetch_dog", "https://www.misisrescue.com/post/freya")


def daisy():
    url = "https://daisyfamilyrescue.de/hund-massimo/"
    service = fake_playwright_service(fake_page(_page("daisy_massimo")))
    with patch("scrapers.daisy_family_rescue.dog_detail_scraper.get_playwright_service", return_value=service):
        details = asyncio.run(DaisyFamilyRescueDogDetailScraper().async_extract_dog_details(url))
    return _listed(url, "hund-massimo", "Massimo", details)


def pets_in_turkey():
    scraper = PetsInTurkeyScraper()
    scraper.session_manager = None
    listing = (FIXTURES / "pets_in_turkey" / "dogs.html").read_text()
    with patch.object(scraper, "get_listing_page", return_value=Mock(text=listing)):
        return scraper.collect_data()[0]


def rean():
    entry = "Bobbie is around 5 months old, rescued from the local kill shelter. He is vaccinated and chipped. This little boy desperately needs a home."
    scraper = REANScraper()
    dog = scraper.standardize_animal_data(scraper.extract_dog_data(entry, "romania"), "romania")
    return dog | {"primary_image_url": "https://img1.wsimg.com/isteam/ip/abc/bobbie.jpg"}


def manytears():
    url = "https://www.manytearsrescue.org/adopt/dogs/6199/"
    service = Mock(get_page_content=AsyncMock(return_value=Mock(success=True, content=_page("manytears_6199"))))
    with patch("scrapers.manytearsrescue.manytearsrescue_scraper.get_playwright_service", return_value=service):
        details = asyncio.run(ManyTearsRescueScraper()._scrape_animal_details_playwright(url))
    return _listed(url, "6199", "Helga", details)


SCRAPERS = [bosnia, santer, underdog, woof, tierschutzverein, dogstrust, misis, daisy, pets_in_turkey, rean, manytears]


@pytest.mark.unit
@pytest.mark.parametrize("scrape", SCRAPERS, ids=lambda scrape: scrape.__name__)
class TestScrapedDogContract:
    def test_required_keys_are_present(self, scrape, stub_clock):
        assert missing_required(scrape()) == []

    def test_no_key_is_lost_on_save(self, scrape, stub_clock):
        assert unknown_keys(scrape()) == set()

    def test_no_placeholder_stands_in_for_missing_data(self, scrape, stub_clock):
        dog = scrape()
        values = [dog.get(key) for key in ("breed", "breed_raw", "sex", "size", "age_text")] + [(dog.get("properties") or {}).get("description")]

        assert not PLACEHOLDERS & {value for value in values if isinstance(value, str)}
        # "Mixed Breed" is a real standardised breed ("Mix", "Mischling"), but never the rescue's own text
        assert dog.get("breed_raw") != "Mixed Breed"

    def test_the_story_is_properties_description(self, scrape, stub_clock):
        dog = scrape()
        properties = dog.get("properties") or {}

        assert "description" not in dog
        assert not {"raw_description", "Beschreibung"} & set(properties)


@pytest.mark.unit
def test_age_stated_at_is_a_key_the_save_reads():
    """utils/birth_dates anchors the age at it (#561); it is not lost."""
    assert unknown_keys({"name": "Freya", "age_stated_at": "2026-05-01"}) == set()
