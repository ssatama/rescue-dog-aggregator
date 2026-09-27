"""Optimized tests for Woof Project scraper - essential functionality only."""

from pathlib import Path
from unittest.mock import Mock, patch

import pytest
from bs4 import BeautifulSoup

from scrapers.woof_project.dogs_scraper import WoofProjectScraper


class TestWoofProjectScraperOptimized:
    """Optimized test cases focusing on essential behaviors only."""

    @pytest.fixture
    def scraper(self):
        """Create scraper instance for testing."""
        return WoofProjectScraper(config_id="woof-project")

    # Core Business Logic Tests

    def test_data_extraction_pipeline(self, scraper):
        """Test complete data extraction pipeline with essential functionality."""
        detail_html = """
        <html>
        <head><title>SPECIAL-NAME - Woof Project</title></head>
        <body>
        <h1>SPECIAL-NAME</h1>
        <div class="post-content">
            <p><strong>Breed:</strong> German Shepherd Mix</p>
            <p><strong>Age:</strong> 3 years</p>
            <p><strong>Size:</strong> Large</p>
            <p>This beautiful dog is approximately 3 years old.</p>
            <img src="https://woofproject.eu/wp-content/uploads/2025/01/special.jpg"
                 alt="rescue dog" width="800" height="600" />
        </div>
        </body>
        </html>
        """

        with patch.object(scraper, "_fetch_detail_page") as mock_fetch:
            mock_fetch.return_value = BeautifulSoup(detail_html, "html.parser")

            result = scraper.scrape_animal_details("https://woofproject.eu/adoption/special-name/")

            # Test essential data extraction
            assert result is not None
            assert result["name"] == "Special-Name"
            assert result["external_id"] == "wp-special-name"
            assert "German Shepherd" in result["breed"]
            assert "3 years" in result["age_text"]
            assert result["size"] == "Large"
            assert "wp-content/uploads" in result["primary_image_url"]

    @pytest.mark.parametrize(
        "name,expected",
        [
            ("LISBON", "Lisbon"),
            ("MAX-ZEUS", "Max-Zeus"),
            ("Buddy", "Buddy"),
            ("", "Unknown"),
            (None, "Unknown"),
            ("  BUDDY  ", "Buddy"),
        ],
    )
    def test_name_standardization_consolidated(self, scraper, name, expected):
        """Test name standardization with essential cases."""
        assert scraper._standardize_name(name) == expected

    def test_image_prioritization_logic(self, scraper):
        """Test image selection and prioritization."""
        detail_html = """
        <html>
        <body>
            <div class="post-content">
                <img src="/images/generic-dog.jpg" alt="Generic dog photo" />
                <img src="https://woofproject.eu/wp-content/uploads/2025/07/actual-dog-photo.jpeg" alt="Buddy" />
                <img src="/thumbnails/small-thumb.jpg" alt="Thumbnail" />
            </div>
        </body>
        </html>
        """

        soup = BeautifulSoup(detail_html, "html.parser")
        image_url = scraper._extract_primary_image_from_detail(soup)

        # Should prioritize the wp-content/uploads image
        assert image_url == "https://woofproject.eu/wp-content/uploads/2025/07/actual-dog-photo.jpeg"

    def test_external_id_generation(self, scraper):
        """Test external ID generation from various URL formats."""
        test_cases = [
            ("https://woofproject.eu/adoption/buddy/", "wp-buddy"),
            ("https://woofproject.eu/adoption/luna", "wp-luna"),
            ("/adoption/max-zeus/", "wp-max-zeus"),
            ("https://woofproject.eu/adoption/special-name/", "wp-special-name"),
        ]

        for url, expected_id in test_cases:
            assert scraper._generate_external_id(url) == expected_id

    def test_edge_case_handling(self, scraper):
        """Test handling of edge cases and malformed data."""
        edge_cases = [
            # Empty/minimal content
            ("<html><body></body></html>", "empty_page"),
            # Malformed HTML
            ("<html><h1>DOG</h1><p>No closing tags", "malformed_html"),
            # Unicode/special characters
            ("<html><h1>CAFÉ-MÜNCHEN</h1></html>", "unicode_name"),
        ]

        for html_content, case_name in edge_cases:
            with patch.object(scraper, "_fetch_detail_page") as mock_fetch:
                mock_fetch.return_value = BeautifulSoup(html_content, "html.parser")

                result = scraper.scrape_animal_details(f"https://woofproject.eu/adoption/{case_name}/")

                # Should handle gracefully without exceptions
                if result is not None:
                    assert isinstance(result["name"], str)
                    assert len(result["name"]) > 0
                    assert result["external_id"] == f"wp-{case_name}"
                    assert result["animal_type"] == "dog"
                    assert result["status"] == "available"

    def test_data_standardization_integration(self, scraper):
        """Test that complete data standardization works end-to-end."""
        detail_html = """
        <html>
        <head><title>LISBON - Woof Project</title></head>
        <body>
        <h1>LISBON</h1>
        <div class="post-content">
            <p><strong>Breed:</strong> Hound Pointer Cross</p>
            <p><strong>Age:</strong> 2 years</p>
            <p><strong>Size:</strong> Medium</p>
            <p>LISBON is a friendly dog looking for a loving home.</p>
            <img src="https://woofproject.eu/wp-content/uploads/2025/07/lisbon.jpg" alt="LISBON" />
        </div>
        </body>
        </html>
        """

        with patch.object(scraper, "_fetch_detail_page") as mock_fetch:
            mock_fetch.return_value = BeautifulSoup(detail_html, "html.parser")

            result = scraper.scrape_animal_details("https://woofproject.eu/adoption/lisbon/")

            # Verify standardization is applied
            assert result is not None
            assert result["name"] == "Lisbon"  # Standardized from "LISBON"
            assert result["external_id"] == "wp-lisbon"
            assert result["breed"] == "Hound x Pointer"
            assert result["standardized_breed"] is not None
            assert result["size"] == "Medium"
            assert result["standardized_size"] is not None

            # Verify wp-content image is prioritized
            assert "wp-content/uploads" in result["primary_image_url"]


def _labelled_page(name, looks_like, sex, location, age, size, story):
    """Detail page in the site's current Elementor layout: all labels, then all values (#454)."""
    heading = '<h2 class="elementor-heading-title">{}</h2>'
    value = '<h4 class="elementor-heading-title">{}</h4>'
    labels = "".join(heading.format(t) for t in ["Looks like:", "Sex:", "Location:", "Estimated age:", "Size:"])
    values = "".join(value.format(t) for t in [looks_like, sex, location, age, size])
    return f"""
    <html><body>
    <h2 class="elementor-heading-title">{name}</h2>
    {labels}{values}
    <p>{story}</p>
    <h2>LET'S HOME THEM ALL</h2>
    <h2>Hello! Welcome to our family. We love sharing our good news with you, WOOF WOOF!</h2>
    <p>First Name Last Name Please wait... Subscribe</p>
    </body></html>
    """


@pytest.mark.unit
class TestWoofProjectLabelledFields:
    @pytest.fixture
    def scraper(self):
        return WoofProjectScraper(config_id="woof-project")

    def _scrape(self, scraper, html, slug):
        with patch.object(scraper, "_fetch_detail_page", return_value=BeautifulSoup(html, "html.parser")):
            return scraper.scrape_animal_details(f"https://woofproject.eu/adoption/{slug}/")

    def test_sex_and_age_come_from_labels_not_pronouns(self, scraper):
        html = _labelled_page(
            "MIRAN",
            "Small Pointer Hound/Beagle Mix",
            "Male",
            "Cyprus",
            "2 years old",
            "Medium size dog",
            "Hi, I am Miran, a playful rescue dog for adoption who loves to run and play with other dogs.",
        )

        result = self._scrape(scraper, html, "miran")

        assert result["sex"] == "Male"
        assert result["age_text"] == "2 years old"
        assert result["age_min_months"] == 24
        assert result["size"] == "Medium"
        assert result["properties"]["location"] == "Cyprus"

    def test_dutch_page_values_and_story(self, scraper):
        html = _labelled_page(
            "AREAN",
            "Pointer GSP Kruising",
            "Male",
            "Cyprus",
            "2 jaar",
            "Middelgroot",
            "Hoi, ik ben Arean. Ik ben een vriendelijke en speelse adoptiehond die van het leven geniet.",
        )

        result = self._scrape(scraper, html, "arean")

        assert result["sex"] == "Male"
        assert result["age_text"] == "2 years"
        assert result["age_min_months"] == 24
        assert result["size"] == "Medium"
        assert result["description"].startswith("Hoi, ik ben Arean")
        assert "Subscribe" not in result["description"]
        assert "Welcome to our family" not in result["description"]

    def test_missing_values_stay_none(self, scraper):
        html = """
        <html><body><h1>GHOST</h1>
        <p>Hi, I am Ghost. I am a quiet rescue dog waiting for a loving family to call my own.</p>
        </body></html>
        """

        result = self._scrape(scraper, html, "ghost")

        assert result["sex"] is None
        assert result["age_text"] is None
        assert result["size"] is None
        assert result["properties"]["breed"] is None

    @pytest.mark.parametrize(
        ("value", "expected"),
        [
            ("Small size dog", "Small"),
            ("Small to Medium size dog", "Medium"),
            ("Medium size dog", "Medium"),
            ("Middelgroot", "Medium"),
            ("Large dog", "Large"),
            ("Medium to large when fully grown", "Large"),
            ("Medium-Large size dog", "Large"),
            ("Xtra Small size dog", "Tiny"),
            ("XSmall", "Tiny"),
            ("X Small", "Tiny"),
            ("", None),
        ],
    )
    def test_size_normalization(self, scraper, value, expected):
        assert scraper._normalize_size(value) == expected

    def test_unrecognised_size_label_is_not_guessed_from_page_text(self, scraper):
        html = _labelled_page(
            "BIG",
            "Mastiff mix",
            "Male",
            "Cyprus",
            "3 years",
            "Enormous",
            "Hi, I am Big. I was a small little puppy once but now I love long walks with my family.",
        )

        result = self._scrape(scraper, html, "big")

        assert result["size"] is None


LISTINGS = Path(__file__).parent.parent / "fixtures" / "listings"
ADOPTION = "https://woofproject.eu/adoption/"


def _card(slug, name, badge=None):
    status = f"<h2>{badge}</h2>" if badge else ""
    return f'<article class="type-adoption" id="post-{slug}"><a href="{ADOPTION}{slug}/"><img src="x.jpg"/></a>{status}<h2>{name}</h2></article>'


def _page(cards, current, last):
    links = "".join(f'<span class="page-numbers current">{n}</span>' if n == current else f'<a class="page-numbers" href="{ADOPTION}page/{n}/">{n}</a>' for n in range(1, last + 1))
    return f'<html><body>{"".join(cards)}<nav class="elementor-pagination">{links}</nav></body></html>'


@pytest.mark.unit
class TestWoofProjectListing:
    """The listing is plain HTML: one card per dog, available dogs first (#565)."""

    @pytest.fixture
    def scraper(self):
        return WoofProjectScraper(config_id="woof-project")

    @staticmethod
    def _serve(pages):
        return patch("scrapers.base_scraper.requests.get", side_effect=lambda url, **kwargs: Mock(text=pages[url]))

    def test_the_saved_listing(self, scraper, stub_clock):
        pages = {ADOPTION: (LISTINGS / "woof_project_page1.html").read_text(), f"{ADOPTION}page/2/": (LISTINGS / "woof_project_page2.html").read_text()}
        with self._serve(pages) as get:
            dogs = scraper.get_animal_list()

        # Arean is "GEADOPTEERD"; Amlet's page is /adoption/9270/, a bare post id
        assert sorted(scraper._generate_external_id(dog["url"]) for dog in dogs) == [
            "wp-9270",
            "wp-banjo",
            "wp-bunney",
            "wp-camelito",
            "wp-chicago",
            "wp-darren",
            "wp-jharna",
            "wp-miran",
            "wp-rou",
            "wp-rusty-2",
            "wp-sarita",
            "wp-scotch",
            "wp-sora",
            "wp-willow-2",
        ]
        assert {"name": "AMLET", "url": f"{ADOPTION}9270/"} in dogs
        # Page 2 is all archive, so page 3 (with badge-less Billy) isn't read
        assert [call.args[0] for call in get.call_args_list] == [ADOPTION, f"{ADOPTION}page/2/"]
        assert stub_clock.calls == [scraper.rate_limit_delay]

    def test_title_case_badges_mark_the_archive_on_page_4(self, scraper):
        soup = BeautifulSoup((LISTINGS / "woof_project_page4.html").read_text(), "html.parser")

        assert [scraper._available_dog(card) for card in soup.select("article.type-adoption")] == [None] * 99

    def test_reads_on_while_a_page_lists_an_available_dog(self, scraper, stub_clock):
        pages = {
            ADOPTION: _page([_card("tara", "TARA"), _card("suvi", "SUVI", badge="Reserved")], current=1, last=3),
            f"{ADOPTION}page/2/": _page([_card("siri", "SIRI"), _card("mia", "MIA", badge="ADOPTED")], current=2, last=3),
            f"{ADOPTION}page/3/": _page([_card("mia", "MIA", badge="ADOPTED")], current=3, last=3),
        }
        with self._serve(pages) as get:
            dogs = scraper.get_animal_list()

        assert [dog["name"] for dog in dogs] == ["TARA", "SIRI"]
        assert get.call_count == 3

    def test_the_last_page_ends_the_listing(self, scraper):
        with self._serve({ADOPTION: _page([_card("tara", "TARA")], current=1, last=1)}):
            assert [dog["name"] for dog in scraper.get_animal_list()] == ["TARA"]

    def test_a_page_linking_to_itself_is_read_once(self, scraper, stub_clock):
        # A cached page 2 that serves page 1 again
        page_1 = _page([_card("tara", "TARA")], current=1, last=2)
        with self._serve({ADOPTION: page_1, f"{ADOPTION}page/2/": page_1}) as get:
            scraper.get_animal_list()

        assert get.call_count == 2

    def test_a_relative_pagination_link(self, scraper, stub_clock):
        pages = {ADOPTION: _page([_card("tara", "TARA")], current=1, last=2).replace(f"{ADOPTION}page/2/", "/adoption/page/2/"), f"{ADOPTION}page/2/": _page([], current=2, last=2)}
        with self._serve(pages) as get:
            scraper.get_animal_list()

        assert get.call_args_list[1].args[0] == f"{ADOPTION}page/2/"

    def test_an_unknown_heading_is_logged_and_the_dog_kept(self, scraper):
        card = BeautifulSoup(_card("nala", "NALA", badge="URGENT"), "html.parser").article

        with patch.object(scraper, "logger") as logger:
            assert scraper._available_dog(card) == {"name": "NALA", "url": f"{ADOPTION}nala/"}

        assert "URGENT" in logger.warning.call_args.args[0]

    def test_a_status_with_another_heading_still_marks_the_dog(self, scraper):
        card = BeautifulSoup(_card("nala", "NALA", badge="ADOPTED</h2><h2>URGENT"), "html.parser").article

        assert scraper._available_dog(card) is None

    @pytest.mark.parametrize("badge", ["ADOPTED", "Adopted", "RESERVED", "Reserved", "GEADOPTEERD", "Gereserveerd"])
    def test_each_status_marks_the_dog_unavailable(self, scraper, badge):
        card = BeautifulSoup(_card("nala", "NALA", badge=badge), "html.parser").article

        assert scraper._available_dog(card) is None

    def test_a_card_without_a_dog_link_is_logged_and_skipped(self, scraper):
        card = BeautifulSoup('<article class="type-adoption" id="post-1"><h2>NALA</h2></article>', "html.parser").article

        with patch.object(scraper, "logger") as logger:
            assert scraper._available_dog(card) is None

        logger.warning.assert_called_once()
