"""Daisy Family Rescue detail pages put each Steckbrief line in its own
Elementor text widget ahead of the story. Taking the first five widgets meant
the "description" of every Daisy dog was five header lines (~115 chars) and
the owner's story - often 2,000+ chars - was never scraped (Sentry
PYTHON-FASTAPI-37, dog 8588 Roy).
"""

import pytest
from bs4 import BeautifulSoup

from scrapers.daisy_family_rescue.dog_detail_scraper import DaisyFamilyRescueDogDetailScraper

STECKBRIEF = [
    "Alter: 01/2026",
    "Geschlecht: männlich",
    "Rasse: HSH-Mischling",
    "Herkunft: Nordmazedonien",
    "Aufenthaltsort: Nordmazedonien",
    "Charakter: freundlich, offen, verspielt, neugierig, sozial, lernfreudig",
    "Schutzgebühr: 580 €",
]
STORY = [
    "Ich wurde Mitte Januar 2026 geboren und wachse derzeit zusammen mit meinen Geschwistern in einer wunderschönen, ruhigen Bergregion auf. Unsere Mama ist etwa 50 cm groß, unser Papa rund 60 cm.",
    "Ich wachse gemeinsam mit meinen Geschwistern und beiden Eltern auf – wir wurden also nie alleine gelassen, sondern hatten von Anfang an einen sicheren Familienverband.",
]
FOOTER = [
    "Folge uns für Updates und Geschichten unserer Hunde.",
    "Daisy Family Rescue e.V. Deutsche Skatbank DE42 8306 5408 0004 2433 31 BIC GENODEF1SLR Verwendungszweck: Spende",
]


def _page(widgets: list[str]) -> BeautifulSoup:
    body = "".join(f'<div class="elementor-widget-text-editor"><div class="elementor-widget-container"><p>{text}</p></div></div>' for text in widgets)
    return BeautifulSoup(f"<html><body>{body}</body></html>", "html.parser")


@pytest.mark.unit
class TestDaisyStoryExtraction:
    @pytest.fixture
    def scraper(self):
        return DaisyFamilyRescueDogDetailScraper()

    def test_returns_the_story_not_the_steckbrief_lines(self, scraper):
        description = scraper._extract_description_soup(_page(STECKBRIEF + STORY + FOOTER))

        assert description is not None
        assert description.startswith("Ich wurde Mitte Januar 2026 geboren"), description
        assert "beiden Eltern" in description
        assert "Alter:" not in description
        assert "Folge uns" not in description

    def test_page_with_only_a_steckbrief_has_no_description(self, scraper):
        assert scraper._extract_description_soup(_page(STECKBRIEF + FOOTER)) is None

    def test_keeps_a_story_paragraph_with_an_early_colon(self, scraper):
        """hund-pepe: the personality paragraph has a colon at char 40 and a
        generic "Label:" pattern dropped all 1,222 chars of it."""
        personality = "Ich bin durch und durch ein Menschenhund: offen, freundlich und immer dabei, wenn meine Menschen etwas unternehmen. Ich liebe lange Spaziergänge und Kuscheln."

        description = scraper._extract_description_soup(_page(STECKBRIEF + [personality] + FOOTER))

        assert description == personality
