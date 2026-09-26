"""Display locations from the values rescues store today (#505)."""

import pytest

from scrapers.validation.animal_validator import AnimalValidator
from scrapers.validation.location_cleaner import display_location


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
            ("Tierheim Mi Fiel Amigo", "Andújar, Spain"),
            ("Tierheim Hogar de Asis/ La Carolina", "La Carolina, Spain"),
            ("Pflegestelle des Tierheims Al-Bayyasa, Baeza", "Baeza, Spain"),
            ("Tierheim ASPA Bukarest", "Bucharest, Romania"),
            ("Tierheim Adoromimos in Mafra", "Mafra, Portugal"),
            ("Pflegestelle (Hunde-Reha-Zentrum) des Tierheim Odai, Rumänien", "Romania"),
        ],
    )
    def test_aufenthaltsort(self, stored, expected):
        assert display_location({"Aufenthaltsort": stored}) == expected

    @pytest.mark.parametrize("stored", ["auf Anfrage", "Tierheim Doggyland", "Tierheim Felican"])
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
