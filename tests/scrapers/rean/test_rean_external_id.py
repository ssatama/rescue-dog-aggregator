"""REAN has no per-dog page or ID, so external_id is derived. Hashing the age
text gave the same dog a new row every time it got older (#421): 13 names in
production had 2-3 rows, e.g. Alexa "4.5 months" -> "5 months".
"""

from unittest.mock import patch

import pytest

from scrapers.rean.dogs_scraper import REANScraper, rean_external_id


@pytest.mark.unit
class TestReanExternalId:
    def test_depends_only_on_name_and_page(self):
        assert rean_external_id("Alexa", "romania") == "rean-romania-alexa"
        assert rean_external_id("Big Ben", "uk_foster") == "rean-uk_foster-big-ben"

    def test_the_id_survives_an_age_change_and_a_missing_photo(self):
        scraper = REANScraper.__new__(REANScraper)
        scraper.org_config = None
        scraper.organization_id = 5

        with patch.object(REANScraper, "process_animal", side_effect=lambda data: data):
            before = scraper.standardize_animal_data({"name": "Alexa", "age_text": "5 months", "primary_image_url": "https://img1.wsimg.com/a.jpg"}, "romania")
            after = scraper.standardize_animal_data({"name": "Alexa", "age_text": "6 months"}, "romania")

        assert before["external_id"] == after["external_id"] == "rean-romania-alexa"

    def test_two_dogs_listed_under_one_name_get_separate_ids(self):
        scraper = REANScraper.__new__(REANScraper)
        scraper.org_config = None
        scraper.organization_id = 5
        scraper.pages = {"romania": "/r"}
        scraper.base_url = "https://www.rean.org.uk"
        scraper.logger = __import__("logging").getLogger("rean-test")
        dogs = [{"name": "Bella", "age_text": "2 years"}, {"name": "Bella", "age_text": "4 months"}]

        with patch.object(REANScraper, "extract_dogs_with_images_unified", return_value=dogs), patch.object(REANScraper, "process_animal", side_effect=lambda data: data):
            animals = scraper.scrape_animals()

        assert [animal["external_id"] for animal in animals] == ["rean-romania-bella", "rean-romania-bella-2"]


@pytest.mark.unit
def test_age_comes_from_the_heading_not_a_trailing_neighbour_sentence():
    """The live George block ends with Owen's "around 7 months old"."""
    scraper = REANScraper.__new__(REANScraper)
    text = "George - 4.5 years old - Norfolk George has been stuck in kennels for over a year. He is a friendly boy, currently in Shipdam, Norfolk and around 7 months old."

    assert scraper.extract_dog_data(text, "uk_foster")["age_text"] == "4.5 years"
