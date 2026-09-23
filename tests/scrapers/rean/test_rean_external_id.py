"""REAN has no per-dog page or ID, so external_id is derived. Hashing the age
text gave the same dog a new row every time it got older (#421): 13 names in
production had 2-3 rows, e.g. Alexa "4.5 months" -> "5 months" with one photo.
"""

import hashlib

import pytest

from scrapers.rean.dogs_scraper import rean_external_id, rean_image_key

WSIMG = "//img1.wsimg.com/isteam/ip/a820747c-53ff-4d63-a4ae-ca1899d8137c/514282681_1190570573111265_9170780346239321032.jpg"


def _id(image_url, age="5 months", name="Alexa"):
    return rean_external_id(name=name, page_type="romania", image_url=image_url, breed=None, age=age, sex=None)


@pytest.mark.unit
class TestReanExternalId:
    def test_same_photo_keeps_the_id_as_the_age_text_changes(self):
        assert _id(WSIMG, age="4.5 months") == _id(WSIMG, age="6 months")

    def test_url_variants_of_one_photo_share_the_id(self):
        assert _id(WSIMG) == _id("https:" + WSIMG) == _id(WSIMG + "/:/cr=t:12.5%25,l:0%25/rs=w:600,h:600")

    def test_a_different_dog_with_the_same_name_gets_its_own_id(self):
        """George 4.5 years (George2.jpg) is not the 7-month George now listed."""
        old = _id("//img1.wsimg.com/isteam/ip/x/George2.jpg", age="4.5 years", name="George")
        new = _id("//img1.wsimg.com/isteam/ip/x/541234_puppy.jpg", age="7 months", name="George")

        assert old != new

    def test_without_a_photo_the_previous_id_is_unchanged(self):
        previous_hash = hashlib.md5(b"Alexa-None-5 months-None-romania").hexdigest()[:6]

        assert _id(None) == f"rean-romania-alexa-{previous_hash}"

    def test_keeps_the_readable_prefix(self):
        assert _id(WSIMG).startswith("rean-romania-alexa-")

    def test_image_key_is_the_file_name(self):
        assert rean_image_key("https://img1.wsimg.com/isteam/ip/x/Freddy1.jpg/:/rs=w:600") == "freddy1.jpg"
        assert rean_image_key(None) is None


@pytest.mark.unit
def test_age_comes_from_the_heading_not_a_trailing_neighbour_sentence():
    """The live George block ends with Owen's "around 7 months old"."""
    from scrapers.rean.dogs_scraper import REANScraper

    scraper = REANScraper.__new__(REANScraper)
    text = "George - 4.5 years old - Norfolk George has been stuck in kennels for over a year. He is a friendly boy, currently in Shipdam, Norfolk and around 7 months old."

    assert scraper.extract_dog_data(text, "uk_foster")["age_text"] == "4.5 years"
