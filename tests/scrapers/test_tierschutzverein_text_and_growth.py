"""Tierschutzverein Europa: words glued across tags, and puppies' sizes (#631)."""

from unittest.mock import Mock

import pytest
from bs4 import BeautifulSoup

from scrapers.tierschutzverein_europa.dogs_scraper import TierschutzvereinEuropaScraper


@pytest.fixture
def scraper():
    scraper = TierschutzvereinEuropaScraper.__new__(TierschutzvereinEuropaScraper)
    scraper.logger = Mock()
    return scraper


def _properties(scraper, body: str) -> dict:
    return scraper._extract_properties_from_soup(BeautifulSoup(f"<html><body><div class='content'>{body}</div></body></html>", "html.parser"))


@pytest.mark.unit
class TestTextAcrossTags:
    def test_a_line_break_separates_sentences(self, scraper):
        """97 stored stories read "befindet.Im August" (get_text(strip=True))."""
        story = _properties(scraper, "<p>Er ist in Spanien, wo er sich befindet.<br>Im August kam er zu uns.</p>")["description"]
        assert story == "Er ist in Spanien, wo er sich befindet. Im August kam er zu uns."

    def test_an_inline_tag_keeps_the_words_apart_without_a_space_before_punctuation(self, scraper):
        story = _properties(scraper, "<p><strong>Milo</strong>, ein junger Rüde.<em>Er</em> ist verspielt.</p>")["description"]
        assert story == "Milo, ein junger Rüde. Er ist verspielt."

    def test_quotes_brackets_and_smileys_keep_the_rescues_spacing(self, scraper):
        story = _properties(scraper, "<p>Sie heißt „<em>Luna</em>“ <em>(</em>Mischling) und wartet auf dich :-)</p>")["description"]
        assert story == "Sie heißt „Luna“ (Mischling) und wartet auf dich :-)"

    def test_table_values_too(self, scraper):
        props = _properties(scraper, "<table><tr><td>Ungefähre Größe:</td><td>ca. 40 cm,<br>im Wachstum</td></tr></table>")
        assert props["Ungefähre Größe"] == "ca. 40 cm, im Wachstum"


@pytest.mark.unit
class TestAPuppyIsReadAgainUntilItHasASize:
    """Skip-existing never re-read a growing puppy, so 47 active dogs had no size."""

    def _normalized(self, scraper, height, age):
        dog = {"name": "Luna", "age_text": age, "properties": {"Ungefähre Größe": height}}
        return scraper._translate_and_normalize_dogs([dog])[0]

    def test_a_growing_puppy_is_marked_size_pending(self, scraper):
        dog = self._normalized(scraper, "ca. 25 cm (im Wachstum)", "05.2026 (4 Monate alt)")
        assert dog["size"] is None
        assert dog["properties"]["size_pending"] is True

    def test_a_plain_puppy_height_is_not_read_again(self, scraper):
        """Review of #646: "ca. 35 cm" measured at 4 months would have become the adult size at 12."""
        dog = self._normalized(scraper, "ca. 35 cm", "05.2026 (4 Monate alt)")
        assert dog["size"] is None
        assert "size_pending" not in dog["properties"]

    @pytest.mark.parametrize(
        ("height", "age"),
        [
            ("keine Angaben", "05.2019 (7 Jahre alt)"),  # nothing to wait for
            ("ca. 46 cm, wächst noch minimal", "09.2024 (2 Jahre alt)"),  # grown, whatever the text says
        ],
    )
    def test_a_dog_that_will_not_get_a_size_is_not_read_forever(self, scraper, height, age):
        assert "size_pending" not in self._normalized(scraper, height, age)["properties"]

    def test_a_grown_dog_is_not(self, scraper):
        dog = self._normalized(scraper, "ca. 50 cm", "05.2023 (3 Jahre alt)")
        assert dog["size"] == "Medium"
        assert "size_pending" not in dog["properties"]

    def test_no_height_is_nothing_to_wait_for(self, scraper):
        dog = {"name": "Luna", "age_text": "05.2026 (4 Monate alt)", "properties": {}}
        assert "size_pending" not in scraper._translate_and_normalize_dogs([dog])[0]["properties"]
