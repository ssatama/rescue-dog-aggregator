"""breed_raw keeps the rescue's own text through a second standardization (#560).

Most scrapers call process_animal in collect_data, and save_animal called it
again, so the second pass stored the standardized name as breed_raw. Dogs
Trust's "Poodle (Toy)" became breed_raw "Toy Poodle" for every dog.
"""

from unittest.mock import Mock, patch

import pytest

from scrapers.base_scraper import BaseScraper
from services.animal_data_preparation import prepare_animal_data
from services.database_service import update_columns


class _Scraper(BaseScraper):
    def collect_data(self):
        return []


@pytest.fixture
def scraper():
    with (
        patch("scrapers.base_scraper.ConfigLoader") as loader,
    ):
        config = Mock()
        config.get_scraper_config_dict.return_value = {"rate_limit_delay": 0, "max_retries": 1, "timeout": 10}
        config.name = "Test Rescue"
        loader.return_value.load_config.return_value = config
        s = _Scraper(organization_id=1, config_id="test")
    s.database_service = Mock()
    s.image_processing_service = None
    return s


def _dog():
    return {"name": "Bella", "external_id": "dt-1", "breed": "Poodle (Toy)", "age_text": "2 years", "primary_image_url": "https://example.org/bella.jpg"}


@pytest.mark.unit
class TestBreedRawKept:
    def test_a_dog_processed_in_collect_data_is_saved_with_the_rescues_text(self, scraper):
        scraper.database_service.get_existing_animal.return_value = None
        scraper.database_service.create_animal.return_value = (1, "added")

        scraper.save_animal(scraper.process_animal(_dog()))

        (saved,), _ = scraper.database_service.create_animal.call_args
        assert saved["breed_raw"] == "Poodle (Toy)"
        assert saved["standardized_breed"] == "Toy Poodle"
        assert prepare_animal_data(saved).breed_raw == "Poodle (Toy)"

    def test_an_update_writes_the_rescues_text(self, scraper):
        scraper.database_service.get_existing_animal.return_value = (7,)
        scraper.database_service.update_animal.return_value = (7, "updated")

        scraper.save_animal(scraper.process_animal(_dog()))

        (_, saved), _ = scraper.database_service.update_animal.call_args
        assert update_columns(saved)["breed_raw"] == "Poodle (Toy)"

    def test_a_breed_changed_after_processing_is_standardized_again(self, scraper):
        """Santer and Pets in Turkey fill in a breed after process_animal; save re-derives from it."""
        dog = scraper.process_animal({**_dog(), "breed": None})
        dog["breed"] = "Poodle (Toy)"

        again = scraper.process_animal(dog)

        assert again["standardized_breed"] == "Toy Poodle"
        assert again["breed_raw"] is None, "the site gave no breed"

    def test_save_works_on_a_copy(self, scraper):
        scraper.database_service.get_existing_animal.return_value = None
        scraper.database_service.create_animal.return_value = (1, "added")
        dog = scraper.process_animal(_dog())

        scraper.save_animal(dog)

        assert "original_image_url" not in dog

    def test_a_scraper_that_does_not_process_is_standardized_on_save(self, scraper):
        scraper.database_service.get_existing_animal.return_value = None
        scraper.database_service.create_animal.return_value = (1, "added")

        scraper.save_animal(_dog())

        (saved,), _ = scraper.database_service.create_animal.call_args
        assert (saved["breed_raw"], saved["standardized_breed"]) == ("Poodle (Toy)", "Toy Poodle")
