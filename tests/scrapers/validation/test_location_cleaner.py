"""Display locations and countries from the values rescues store today (#505, #702)."""

from unittest.mock import Mock, patch

import pytest

from scrapers.base_scraper import BaseScraper
from scrapers.validation.animal_validator import AnimalValidator
from scrapers.validation.location_cleaner import display_location, location_country
from utils.config_models import OrganizationMetadata


@pytest.mark.unit
class TestDisplayLocation:
    @pytest.mark.parametrize(
        ("stored", "expected"),
        [
            ("Snetterton (Norfolk) (Snetterton)", "Snetterton, Norfolk"),
            ("Basildon (Essex) (Wickford)", "Basildon, Essex"),
            ("Cardiff (Cardiff)", "Cardiff"),
            ("Loughborough (Wymeswold)", "Loughborough"),
            ("Harefield West London (Uxbridge)", "Harefield West London"),
            ("Cumbria (  )", "Cumbria"),
            ("West Calder (Edinburgh) (West Calder)", "West Calder, Edinburgh"),
            ("Cyprus", "Cyprus"),
            ("Cyprus in foster care", "Cyprus"),
            ("Belgium since September", "Belgium"),
        ],
    )
    def test_location(self, stored, expected):
        assert display_location({"location": stored}) == expected

    @pytest.mark.parametrize(
        ("stored", "expected"),
        [
            ("Pflegestelle in 10119 Berlin", "Berlin, Germany"),
            ("23560 Lübeck", "Lübeck, Germany"),
            ("Pflegestelle in 35633 Lahnau-Atzbach", "Lahnau-Atzbach, Germany"),
            ("83416 Saaldorf-Surheim (ab 12.9.26)", "Saaldorf-Surheim, Germany"),
            ("Tierpension Tannenhof  54597 Wallersheim", "Wallersheim, Germany"),
            ("auf PS ab 12.09.26 in 26919 Brake", "Brake, Germany"),
            ("Ch-5415 Rieden", "Rieden, Switzerland"),
            ("79312 Tierheim Emmendingen", "Emmendingen, Germany"),
            ("79312 Tierheim Emmendingen bei Freiburg", "Emmendingen, Germany"),
            ("78606 Seitingen- Oberflacht", "Seitingen-Oberflacht, Germany"),
            ("Tierheim Mi Fiel Amigo", "Andújar, Spain"),
            ("Tierheim Hogar de Asis/ La Carolina", "La Carolina, Spain"),
            ("Pflegestelle des Tierheims Al-Bayyasa, Baeza", "Baeza, Spain"),
            ("Tierheim ASPA Bukarest", "Bucharest, Romania"),
            ("Tierheim Perros con Alma", "Zaragoza, Spain"),
            ("Tierheim Albayyas", "Baeza, Spain"),
            ("Tierheim ADPCA 50012 Zaragoza", "Zaragoza, Spain"),  # a Spanish postcode
            ("23560 Lübeck, ab 1.10.", "Lübeck, Germany"),
            ("Tierheim Adoromimos in Mafra", "Mafra, Portugal"),
            ("Pflegestelle (Hunde-Reha-Zentrum) des Tierheim Odai, Rumänien", "Romania"),
        ],
    )
    def test_aufenthaltsort(self, stored, expected):
        assert display_location({"Aufenthaltsort": stored}) == expected

    @pytest.mark.parametrize("stored", ["auf Anfrage", "Tierheim Doggyland", "Tierheim Felican", "Tierheim Kaspar", "Tierheim Rhodaina"])
    def test_unknown_places_are_left_out(self, stored):
        assert display_location({"Aufenthaltsort": stored}) is None

    @pytest.mark.parametrize(
        ("stored", "expected"),
        [("North Macedonia", "North Macedonia"), ("bei Münster", "near Münster"), ("in Hessisch Lichtenau", "Hessisch Lichtenau"), ("Norfolk", "Norfolk")],
    )
    def test_current_location(self, stored, expected):
        assert display_location({"current_location": stored}) == expected

    def test_translated_wins_and_nothing_means_none(self):
        assert display_location({"current_location": "Hannover", "current_location_translated": "Hanover"}) == "Hanover"
        assert display_location({}) is None


@pytest.mark.unit
def test_validator_stores_the_display_location():
    animal = {"name": "Rex", "external_id": "dt-1", "adoption_url": "https://x", "primary_image_url": "https://x/1.jpg", "properties": {"location": "Snetterton (Norfolk) (Snetterton)"}}

    _, data = AnimalValidator().validate_animal_data(animal)

    assert data["properties"]["display_location"] == "Snetterton, Norfolk"
    assert "display_location" not in animal["properties"]


@pytest.mark.unit
class TestLocationCountry:
    @pytest.mark.parametrize(
        ("place", "expected"),
        [
            ("Baeza, Spain", "ES"),
            ("Bucharest, Romania", "RO"),
            ("Romania", "RO"),
            ("Viersen, Germany", "DE"),
            ("Mafra, Portugal", "PT"),
            ("Rieden, Switzerland", "CH"),
            ("North Macedonia", "MK"),
            ("Cyprus", "CY"),
            ("Belgium", "BE"),
            ("United Kingdom", "UK"),
            ("UK", "UK"),
            ("Wales, UK", "UK"),
            ("Greece", "GR"),
        ],
    )
    def test_a_named_country_wins(self, place, expected):
        assert location_country(place, ["DE", "MK"], "DE") == expected

    def test_a_named_country_beats_a_single_region(self):
        # Woof Project serves Cyprus only, but its dogs already in Belgium are in Belgium
        assert location_country("Belgium", ["CY"], "CY") == "BE"

    def test_a_single_service_region(self):
        assert location_country("Snetterton, Norfolk", ["UK"], "UK") == "UK"
        assert location_country(None, ["BG"], "BG") == "BG"

    def test_a_place_without_its_country_is_in_the_rescues_country(self):
        assert location_country("Berlin", ["DE", "MK"], "DE") == "DE"
        assert location_country("near Münster", ["DE", "MK"], "DE") == "DE"
        assert location_country("Norfolk", ["UK", "RO"], "UK") == "UK"

    def test_no_place_and_several_regions_is_unknown(self):
        # MISIs: Serbia and North Macedonia, and no dog says which (#702)
        assert location_country(None, ["RS", "MK"], "RS") is None
        assert location_country(None, [], None) is None

    def test_without_the_rescue_only_a_named_country_counts(self):
        assert location_country("Baeza, Spain") == "ES"
        assert location_country("Berlin") is None


@pytest.mark.unit
def test_validator_stores_the_dogs_country():
    animal = {"name": "Pepsi", "external_id": "hr-1", "adoption_url": "https://x", "primary_image_url": "https://x/1.jpg", "properties": {"location": "Romania"}}

    _, data = AnimalValidator(service_regions=["DE", "RO"], base_country="DE").validate_animal_data(animal)

    assert data["properties"]["location_country"] == "RO"


@pytest.mark.unit
def test_validator_stores_a_single_regions_country_without_a_place():
    animal = {"name": "Rex", "external_id": "mt-1", "adoption_url": "https://x", "primary_image_url": "https://x/1.jpg"}

    _, data = AnimalValidator(service_regions=["UK"], base_country="UK").validate_animal_data(animal)

    assert data["properties"] == {"location_country": "UK"}


@pytest.mark.unit
def test_validator_leaves_an_unknown_country_out():
    animal = {"name": "Rex", "external_id": "mi-1", "adoption_url": "https://x", "primary_image_url": "https://x/1.jpg", "properties": {"location_country": "RS"}}

    _, data = AnimalValidator(service_regions=["RS", "MK"], base_country="RS").validate_animal_data(animal)

    assert "location_country" not in data["properties"]


@pytest.mark.unit
def test_a_scraper_gives_the_validator_its_rescues_regions():
    class Scraper(BaseScraper):
        def collect_data(self):
            return []

    config = Mock()
    config.get_scraper_config_dict.return_value = {}
    config.metadata = OrganizationMetadata(location={"country": "DE"}, service_regions=["DE", "RO"])
    with patch("scrapers.base_scraper.ConfigLoader") as loader:
        loader.return_value.load_config.return_value = config
        validator = Scraper(config_id="hunderettung-europa").animal_validator

    assert (validator.service_regions, validator.base_country) == (["DE", "RO"], "DE")
