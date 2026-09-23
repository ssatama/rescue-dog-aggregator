"""Daisy Family Rescue detail pages put each Steckbrief line in its own
Elementor text widget ahead of the story. Taking the first five widgets meant
the "description" of every Daisy dog was five header lines (~115 chars) and
the owner's story - often 2,000+ chars - was never scraped (Sentry
PYTHON-FASTAPI-37, dog 8588 Roy).
"""

import pytest
from bs4 import BeautifulSoup

from scrapers.daisy_family_rescue.dog_detail_scraper import MIN_STORY_WIDGET_CHARS, DaisyFamilyRescueDogDetailScraper

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


def _widgets(texts: list[str]) -> str:
    return "".join(f'<div class="elementor-widget-text-editor"><div class="elementor-widget-container"><p>{text}</p></div></div>' for text in texts)


def _page(widgets: list[str], footer: list[str] = FOOTER) -> BeautifulSoup:
    """Mirror the live page: the post and the site footer are separate Elementor templates."""
    post = f'<div data-elementor-type="single-post">{_widgets(widgets)}</div>'
    site_footer = f'<footer data-elementor-type="footer">{_widgets(footer)}</footer>'
    return BeautifulSoup(f"<html><body>{post}{site_footer}</body></html>", "html.parser")


@pytest.mark.unit
class TestDaisyStoryExtraction:
    @pytest.fixture
    def scraper(self):
        return DaisyFamilyRescueDogDetailScraper()

    def test_returns_the_story_not_the_steckbrief_lines(self, scraper):
        description = scraper._extract_description_soup(_page(STECKBRIEF + STORY))

        assert description is not None
        assert description.startswith("Ich wurde Mitte Januar 2026 geboren"), description
        assert "beiden Eltern" in description
        assert "Alter:" not in description
        assert "Folge uns" not in description

    def test_page_with_only_a_steckbrief_has_no_description(self, scraper):
        assert scraper._extract_description_soup(_page(STECKBRIEF)) is None

    def test_keeps_a_story_paragraph_with_an_early_colon(self, scraper):
        """hund-pepe: the personality paragraph has a colon at char 40 and a
        generic "Label:" pattern dropped all 1,222 chars of it."""
        personality = "Ich bin durch und durch ein Menschenhund: offen, freundlich und immer dabei, wenn meine Menschen etwas unternehmen. Ich liebe lange Spaziergänge und Kuscheln."

        description = scraper._extract_description_soup(_page(STECKBRIEF + [personality]))

        assert description == personality

    def test_drops_a_steckbrief_line_long_enough_to_pass_the_length_floor(self, scraper):
        """hund-bjanka: her Charakter: widget is 150 chars, so only the label check keeps it out."""
        long_charakter = "Charakter: verschmust, verspielt, aufgeschlossen, menschenbezogen, anhänglich, verträglich, lernfreudig, neugierig, aktiv, sensibel, sanft und fröhlich"
        assert len(long_charakter) >= MIN_STORY_WIDGET_CHARS

        description = scraper._extract_description_soup(_page([long_charakter] + STORY))

        assert "Charakter:" not in description
        assert description.startswith("Ich wurde Mitte Januar 2026 geboren")

    def test_keeps_a_short_story_paragraph(self, scraper):
        """hund-didi: a 119-char origin paragraph fell under the old 150-char floor."""
        origin = "Ich stamme aus Skopje, der Hauptstadt Nordmazedoniens. Dort wurde ich von der Straße gerettet und lebe seitdem sicher."

        description = scraper._extract_description_soup(_page(STECKBRIEF + [origin] + STORY))

        assert description.startswith(origin)

    def test_skips_footer_widgets_of_any_length(self, scraper):
        long_bank_details = FOOTER[1] + " Paypal: @daisyfamilyrescue - jede Spende hilft unseren Hunden auf dem Weg in ihr neues Zuhause."

        description = scraper._extract_description_soup(_page(STORY, footer=[long_bank_details]))

        assert "Skatbank" not in description

    def test_skips_unparsed_steckbrief_lines(self, scraper):
        lines = [
            "Verträglich mit Katzen: kann getestet werden, bisher keine Erfahrungen mit Katzen im Haushalt gemacht",
            "Als Zweithund geeignet: ja, am liebsten zu einem ruhigen, souveränen Rüden oder einer Hündin",
        ]

        description = scraper._extract_description_soup(_page(lines + STORY))

        assert description.startswith("Ich wurde Mitte Januar 2026 geboren")

    def test_selenium_path_uses_the_same_rules(self, scraper):
        class FakeDriver:
            page_source = str(_page(STECKBRIEF + STORY))

        assert scraper._extract_description(FakeDriver()) == scraper._extract_description_soup(_page(STECKBRIEF + STORY))


@pytest.mark.unit
class TestDaisySteckbriefFields:
    def test_blank_field_does_not_take_the_next_line(self):
        """hund-josie: a blank Alter: stored "Geschlecht: weiblich" as her age."""
        scraper = DaisyFamilyRescueDogDetailScraper()
        text = "Steckbrief\nAlter:\nGeschlecht: weiblich\nRasse: Mischling"

        assert scraper._extract_field_value(text, "Alter:") is None
        assert scraper._extract_field_value(text, "Geschlecht:") == "weiblich"

    def test_value_on_the_next_text_node_is_kept(self):
        scraper = DaisyFamilyRescueDogDetailScraper()

        assert scraper._extract_field_value("Alter:\n10/2020\nGeschlecht: weiblich", "Alter:") == "10/2020"

    def test_blank_field_does_not_take_an_unparsed_label_line(self):
        scraper = DaisyFamilyRescueDogDetailScraper()

        assert scraper._extract_field_value("Halter:\nAls Zweithund geeignet: ja", "Halter:") is None
