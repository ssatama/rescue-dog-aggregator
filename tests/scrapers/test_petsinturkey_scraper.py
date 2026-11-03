"""Tests for the Pets in Turkey scraper (the site as rebuilt off Wix, 2026-10, #747)."""

import re
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
import requests
from bs4 import BeautifulSoup

from scrapers.base_scraper import ListingIncompleteError
from scrapers.pets_in_turkey.petsinturkey_scraper import PetsInTurkeyScraper

LISTING = Path(__file__).parent.parent / "fixtures" / "pets_in_turkey" / "dogs.html"


def _card(facts="Female · 1 year · 32 kg · Labrador", href="/dogs/aliza", name="Aliza", species="dog", photo="/photos/1/thumb.webp"):
    img = f'<img src="{photo}" alt="{name}">' if photo else ""
    facts_span = f'<span class="animal-facts">{facts}</span>' if facts is not None else ""
    href_attr = f' href="{href}"' if href else ""
    return f"""
    <a class="animal-card"{href_attr} data-species="{species}" data-size="large" data-sex="female" data-ready="now">
      <span class="animal-photo">{img}<span class="photo-count">3 photos</span></span>
      <span class="animal-body">
        <span class="animal-ready now">Ready to fly!</span>
        <span class="animal-name">{name}</span>
        {facts_span}
      </span>
    </a>"""


def _page(*cards):
    return f'<html><body><div class="cards" id="cards">{"".join(cards)}</div></body></html>'


@pytest.mark.unit
class TestPetsInTurkeyScraper:
    @pytest.fixture
    def scraper(self):
        scraper = PetsInTurkeyScraper()
        scraper.session_manager = None
        scraper.logger = MagicMock()
        return scraper

    def _extract(self, scraper, html):
        return scraper._extract_dog_data(BeautifulSoup(html, "html.parser").select_one("a.animal-card"))

    def test_scraper_initialization(self, scraper):
        assert scraper.base_url == "https://www.petsinturkey.org"
        assert scraper.listing_url == "https://www.petsinturkey.org/dogs"
        assert scraper.organization_name == "Pets in Turkey"

    def test_a_card(self, scraper):
        dog = self._extract(scraper, _card())

        assert dog["name"] == "Aliza"
        assert dog["external_id"] == "pit-aliza"
        assert dog["adoption_url"] == "https://www.petsinturkey.org/dogs/aliza"
        assert dog["primary_image_url"] == "https://www.petsinturkey.org/photos/1/large.webp"
        assert dog["sex"] == "Female"
        assert dog["age"] == "1 years"
        assert dog["breed"] == "Labrador"
        assert dog["properties"]["weight"] == "32 kg"
        assert dog["size"] == "Large"
        assert "description" not in dog["properties"]

    def test_the_id_is_the_page_slug_not_the_name(self, scraper):
        """A second Mona gets /dogs/mona-2; the slug keeps the two apart."""
        dog = self._extract(scraper, _card(href="/dogs/mona-2", name="Mona", photo="/photos/75/thumb.webp"))

        assert dog["external_id"] == "pit-mona-2"
        assert dog["adoption_url"] == "https://www.petsinturkey.org/dogs/mona-2"
        assert dog["name"] == "Mona"

    @pytest.mark.parametrize(
        ("age", "expected"),
        [("1 year", "1 years"), ("1.5 years", "1.5 years"), ("1,5", "1.5 years"), ("9 months", "9 months"), ("11 months", "11 months")],
    )
    def test_ages(self, scraper, age, expected):
        dog = self._extract(scraper, _card(facts=f"Male · {age} · 12 kg · Mix"))

        assert dog["age"] == expected

    def test_a_card_without_facts_gets_no_placeholders(self, scraper):
        dog = self._extract(scraper, _card(facts=None))

        assert dog["breed"] is None
        assert dog["sex"] is None
        assert dog["size"] is None
        assert dog["age"] is None

    def test_partial_facts_are_read_by_what_they_are_not_where_they_are(self, scraper):
        dog = self._extract(scraper, _card(facts="Male · 8 kg"))

        assert dog["sex"] == "Male"
        assert dog["properties"]["weight"] == "8 kg"
        assert dog["size"] == "Small"
        assert dog["age"] is None
        assert dog["breed"] is None

    @pytest.mark.parametrize("facts", ["Male · 10 weeks · 4 kg", "Male · 10-12 kg", "Male · 2 yo"])
    def test_a_number_that_isnt_read_is_never_the_breed(self, scraper, facts):
        dog = self._extract(scraper, _card(facts=facts))

        assert dog["breed"] is None

    @pytest.mark.parametrize(("age", "expected"), [("10 weeks", "10 weeks"), ("2 yo", "2 years"), ("3 y", "3 years")])
    def test_short_and_weekly_ages(self, scraper, age, expected):
        dog = self._extract(scraper, _card(facts=f"Male · {age} · 4 kg · Mix"))

        assert dog["age"] == expected

    def test_a_comma_weight_is_stored_with_a_dot(self, scraper):
        dog = self._extract(scraper, _card(facts="Male · 7,5 kg"))

        assert dog["properties"]["weight"] == "7.5 kg"

    @pytest.mark.parametrize("href", ["/dogs", "/dogs/", "/cats/tom", "https://elsewhere.org/dogs/aliza"])
    def test_only_a_dogs_own_page_gives_an_id(self, scraper, href):
        dog = self._extract(scraper, _card(href=href))

        assert dog["external_id"] is None

    @pytest.mark.parametrize("href", ["/dogs/aliza/", "/dogs/aliza?ref=home", "/dogs/aliza#photos", "https://www.petsinturkey.org/dogs/aliza"])
    def test_the_slug_ignores_query_fragment_and_host(self, scraper, href):
        dog = self._extract(scraper, _card(href=href))

        assert dog["external_id"] == "pit-aliza"
        assert dog["adoption_url"] == "https://www.petsinturkey.org/dogs/aliza"

    def test_one_card_that_fails_does_not_sink_the_rest(self, scraper):
        page = _page(_card(href="/dogs/odd", name="Odd"), _card())
        real = scraper._apply_standardization

        def flaky(dog):
            if dog["name"] == "Odd":
                raise ValueError("bad breed text")
            return real(dog)

        with patch.object(scraper, "get_listing_page", return_value=MagicMock(text=page)), patch.object(scraper, "_apply_standardization", side_effect=flaky):
            dogs = scraper.collect_data()

        assert [dog["name"] for dog in dogs] == ["Aliza"]
        scraper.logger.error.assert_called_once()

    def test_calculate_size_from_weight(self, scraper):
        assert scraper._calculate_size_from_weight(3) == "Tiny"
        assert scraper._calculate_size_from_weight(8) == "Small"
        assert scraper._calculate_size_from_weight(20) == "Medium"
        assert scraper._calculate_size_from_weight(35) == "Large"
        assert scraper._calculate_size_from_weight(45) == "XLarge"

    def test_apply_standardization_leaves_missing_data_out(self, scraper):
        """No "Unknown" name or age, no "Medium" or "Mixed Breed" standing in (#564)."""
        standardized = scraper._apply_standardization({"name": "Mona", "breed": None, "sex": None, "size": None})

        assert standardized["name"] == "Mona"
        assert standardized.get("breed") != "Mixed Breed"
        assert standardized.get("standardized_size") != "Medium"
        assert "gender" not in standardized
        assert standardized.get("age_text") is None
        assert standardized["status"] == "available"
        assert standardized["animal_type"] == "dog"

    def test_cards_without_a_page_or_that_are_not_dogs_are_skipped(self, scraper):
        page = _page(_card(), _card(href=None, name="Ghost"), _card(href="/dogs/tom", name="Tom", species="cat"))

        with patch.object(scraper, "get_listing_page", return_value=MagicMock(text=page)):
            dogs = scraper.collect_data()

        assert [dog["name"] for dog in dogs] == ["Aliza"]
        scraper.logger.warning.assert_called_once()

    def test_found_dogs_are_recorded_for_stale_detection(self, scraper):
        scraper.session_manager = MagicMock()

        with patch.object(scraper, "get_listing_page", return_value=MagicMock(text=_page(_card()))):
            scraper.collect_data()

        scraper.session_manager.record_found_animal.assert_called_once_with("pit-aliza")

    @patch("scrapers.request_pacing.requests.get")
    def test_a_listing_that_fails_to_load_raises_after_retries(self, mock_get, scraper):
        """A listing failure ends the run as an error, never as zero dogs (#559)."""
        mock_get.side_effect = requests.ConnectionError("Network error")
        scraper.max_retries = 2

        with pytest.raises(ListingIncompleteError, match="after 3 attempt"):
            scraper.collect_data()

        assert mock_get.call_count == 3


@pytest.mark.unit
class TestPetsInTurkeySavedListing:
    """The /dogs page as saved on 2026-11-03: 33 dogs, each with its own page."""

    @pytest.fixture
    def dogs(self, stub_clock):
        scraper = PetsInTurkeyScraper()
        scraper.session_manager = None
        with patch.object(scraper, "get_listing_page", return_value=MagicMock(text=LISTING.read_text())):
            dogs = scraper.collect_data()
        assert stub_clock.calls == []  # one page, no per-dog sleep (#564)
        return {dog["external_id"]: dog for dog in dogs}

    def test_every_dog_once_with_its_page_slug_as_id(self, dogs):
        assert len(dogs) == 33
        assert all(re.fullmatch(r"pit-[a-z0-9-]+", external_id) for external_id in dogs)
        assert "pit-mona-2" in dogs

    def test_every_dog_has_a_photo_and_its_own_page(self, dogs):
        for external_id, dog in dogs.items():
            assert dog["primary_image_url"].startswith("https://www.petsinturkey.org/photos/")
            assert dog["adoption_url"] == f"https://www.petsinturkey.org/dogs/{external_id.removeprefix('pit-')}"

    def test_a_dog(self, dogs):
        aliza = dogs["pit-aliza"]

        assert aliza["name"] == "Aliza"
        assert aliza["primary_image_url"] == "https://www.petsinturkey.org/photos/1/large.webp"
        assert aliza["breed_raw"] == "Labrador"
        assert aliza["sex"] == "Female"
        assert aliza["size"] == "Large"  # 32 kg
        assert aliza["age_text"] == "1 years"
        assert aliza["properties"]["weight"] == "32 kg"
        assert "description" not in aliza["properties"]

    def test_a_bare_age_is_years(self, dogs):
        assert dogs["pit-mona-2"]["age_text"] == "1.5 years"  # "Female · 1,5 · 17 kg · Beagle mix"
