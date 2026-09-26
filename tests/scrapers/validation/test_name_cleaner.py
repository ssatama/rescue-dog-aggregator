"""Name cleaning with names seen in production (#505)."""

import pytest

from scrapers.validation.animal_validator import AnimalValidator
from scrapers.validation.name_cleaner import clean_name


@pytest.mark.unit
class TestCleanName:
    @pytest.mark.parametrize(
        ("name", "breed", "expected"),
        [
            ("Ally OVERLOOKED", "Mixed Breed", "Ally"),
            ("Vinnie HOME NEEDED", "Mixed Breed", "Vinnie"),
            ("Max - EXPERIENCED HOME NEEDED", "Mixed Breed", "Max"),
            ("URGENT - Rocco", "Mixed Breed", "Rocco"),
            ("Rex, Husky", "Siberian Husky", "Rex"),
            ("Lola Lab", "Labrador Retriever Cross", "Lola"),
            ("Penny Lab", "Labrador Retriever", "Penny"),
            ("Rocky Husky", "Siberian Husky", "Rocky"),
            ("Charlie Cocker", "Cocker Spaniel", "Charlie"),
            ("Diesel Shepherd", "German Shepherd", "Diesel"),
            ("Rex GSD", "German Shepherd Dog", "Rex"),
        ],
    )
    def test_strips_labels_and_appended_breed_words(self, name, breed, expected):
        assert clean_name(name, breed)[0] == expected

    @pytest.mark.parametrize(
        ("name", "breed"),
        [
            ("German Shepherd", "Mixed Breed"),  # the breed isn't his, so it's his name
            ("Criss Cross", "Chow Chow"),
            ("Max Cross", "Labrador Retriever Cross"),  # generic breed words stay
            ("Long John Silver", "Greyhound"),
            ("Lady Ruby Waggington", "Dutch Shepherd Cross"),
            ("Mr Pepper Pot", "Mixed Breed"),
            ("Husky", "Siberian Husky"),  # never strip a name to nothing
            ("Benji & Dali", "Mixed Breed"),
            ("RAE", "Doberman Pinscher"),
            ("Rex", None),
            ("Snow White", "West Highland White Terrier"),  # colours and names in a breed stay
            ("King Charles", "Cavalier King Charles Spaniel"),
            ("Jack Russell", "Jack Russell Terrier"),
            ("Lady Golden", "Golden Retriever"),
            ("Mr Black", "Black Labrador Retriever"),
            ("Mr Beagle", "Beagle"),  # a title and the breed is the whole name
            ("Big Lab", "Labrador Retriever"),
            ("Mr. Beagle", "Beagle"),
            ("Siberian Husky", "Siberian Husky"),  # listed under the breed name
            ("Golden Retriever", "Golden Retriever"),
            ("Springer Spaniel", "English Springer Spaniel"),
            ("Benji & Lab", "Labrador Retriever"),  # a pair, not an appended breed
            ("Bella *RESERVED*", "Beagle"),  # availability labels stay visible
            ("Max ON HOLD", "Mixed Breed"),
            ("Luna (applications closed)", "Mixed Breed"),
        ],
    )
    def test_leaves_real_names_alone(self, name, breed):
        assert clean_name(name, breed)[0] == name

    def test_a_name_that_is_only_a_label_is_kept(self):
        assert clean_name("URGENT", "Mixed Breed")[0] == "URGENT"

    def test_flags_overlooked_dogs(self):
        assert clean_name("Ally OVERLOOKED", "Mixed Breed")[1] is True
        assert clean_name("Vinnie HOME NEEDED", "Mixed Breed")[1] is False


@pytest.mark.unit
class TestValidatorKeepsTheOriginal:
    def _animal(self, **overrides):
        return {"name": "Ally OVERLOOKED", "breed": "Mixed Breed", "external_id": "mt-1", "adoption_url": "https://x", "primary_image_url": "https://x/1.jpg", **overrides}

    def test_raw_name_and_overlooked_go_into_properties(self):
        ok, data = AnimalValidator().validate_animal_data(self._animal(properties={"location": "Wales"}))

        assert ok
        assert data["name"] == "Ally"
        assert data["properties"] == {"location": "Wales", "raw_name": "Ally OVERLOOKED", "overlooked": True}

    def test_existing_raw_name_from_the_scraper_wins(self):
        _, data = AnimalValidator().validate_animal_data(self._animal(properties={"raw_name": "Ally OVERLOOKED (Wales)"}))

        assert data["properties"]["raw_name"] == "Ally OVERLOOKED (Wales)"

    def test_clean_names_leave_properties_untouched(self):
        animal = self._animal(name="Ally", properties={"location": "Wales"})
        _, data = AnimalValidator().validate_animal_data(animal)

        assert data["properties"] is animal["properties"]
