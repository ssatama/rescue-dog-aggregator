"""
Isolated tests for Tierschutzverein Europa two-phase scraping architecture.

These tests focus ONLY on the specific extraction logic unique to this scraper,
without invoking BaseScraper or database operations.
"""

from unittest.mock import Mock, patch

import pytest
from bs4 import BeautifulSoup

from scrapers.tierschutzverein_europa.dogs_scraper import TierschutzvereinEuropaScraper


class TestTierschutzvereinTwoPhase:
    """Test two-phase scraping architecture specific to Tierschutzverein."""

    @pytest.fixture
    def scraper(self):
        """Create a minimal scraper instance without database/pool initialization."""
        with patch("scrapers.base_scraper.BaseScraper.__init__", return_value=None):
            scraper = TierschutzvereinEuropaScraper.__new__(
                TierschutzvereinEuropaScraper
            )
            scraper.base_url = "https://tierschutzverein-europa.de"
            scraper.listing_url = "https://tierschutzverein-europa.de/tiervermittlung/"
            scraper.logger = Mock()
            scraper.rate_limit_delay = 0
            scraper.batch_size = 2
            scraper.skip_existing_animals = False
            return scraper

    @pytest.fixture
    def listing_html(self):
        """HTML fixture for listing page with dog articles."""
        return """
        <html>
        <body>
            <article class="tiervermittlung type-tiervermittlung">
                <a href="/tiervermittlung/bonsai-in-spanien-perros-con-alma-zaragoza/">
                    <img src="https://tierschutzverein-europa.de/wp-content/uploads/2025/08/startbild-bonsai-300x300.jpg" alt="Bonsai">
                    <h2>Bonsai</h2>
                </a>
            </article>
            <article class="tiervermittlung type-tiervermittlung">
                <a href="/tiervermittlung/nano-in-spanien-protectora-villena/">
                    <img src="https://tierschutzverein-europa.de/wp-content/uploads/2025/08/nano-profile-300x300.jpg" alt="Nano">
                    <h2>Nano</h2>
                </a>
            </article>
            <article class="tiervermittlung type-tiervermittlung">
                <a href="/tiervermittlung/bacon-in-deutschland-vermittlungshilfe/">
                    <img src="https://tierschutzverein-europa.de/wp-content/uploads/2025/08/bacon-main-300x300.jpg" alt="Bacon">
                    <h2>Bacon</h2>
                </a>
            </article>
        </body>
        </html>
        """

    @pytest.fixture
    def detail_html(self):
        """HTML fixture for detail page with German properties."""
        return """
        <html>
        <body>
            <img class="hero-image" src="https://tierschutzverein-europa.de/wp-content/uploads/2025/08/bonsai-hero-600x400.jpg" alt="Bonsai Hero">
            <table class="dog-info">
                <tr><td>Name:</td><td>Bonsai</td></tr>
                <tr><td>Rasse:</td><td>Mischling</td></tr>
                <tr><td>Geschlecht:</td><td>männlich</td></tr>
                <tr><td>Geburtstag:</td><td>05.2025 (3 Monate alt)</td></tr>
                <tr><td>Ungefähre Größe:</td><td>17 cm, im Wachstum, klein bleibend</td></tr>
                <tr><td>Kastriert:</td><td>zu jung</td></tr>
                <tr><td>Katzentest:</td><td>auf Anfrage</td></tr>
                <tr><td>Besonderheiten:</td><td>keine bekannt</td></tr>
                <tr><td>Mittelmeertest:</td><td>zu jung</td></tr>
                <tr><td>Aufenthaltsort:</td><td>Hundepension von Perros con Alma</td></tr>
            </table>
            <h2>Beschreibung</h2>
            <p>Bonsai – Klein, aber voller Lebensfreude</p>
            <p>Auch Bonsai ist einer von 15 Welpen, die ohne ihre Mütter im Tierheim abgegeben wurden. 
            Sein Start ins Leben war nicht leicht, aber Bonsai schlägt sich tapfer.</p>
        </body>
        </html>
        """

    @pytest.mark.unit
    @pytest.mark.fast
    def test_get_animal_list_extracts_dogs_from_listing(self, scraper, listing_html):
        """Test Phase 1: Extract dogs from listing page HTML."""
        # Mock the requests.get call to return HTML only for first page, empty for others
        call_count = [0]

        def mock_get(*args, **kwargs):
            call_count[0] += 1
            mock_response = Mock()
            # Return dogs only on first call (page 1)
            if call_count[0] == 1:
                mock_response.text = listing_html
            else:
                # Return empty HTML for subsequent pages
                mock_response.text = "<html><body></body></html>"
            mock_response.raise_for_status = Mock()
            return mock_response

        with patch("requests.get", side_effect=mock_get):
            animals = scraper.get_animal_list()

        # Should get exactly 3 dogs from the first page only
        assert len(animals) == 3

        # Check first dog
        assert animals[0]["name"] == "Bonsai"
        assert animals[0]["external_id"] == "bonsai-in-spanien-perros-con-alma-zaragoza"
        assert (
            animals[0]["adoption_url"]
            == "https://tierschutzverein-europa.de/tiervermittlung/bonsai-in-spanien-perros-con-alma-zaragoza/"
        )

        # Check second dog
        assert animals[1]["name"] == "Nano"
        assert animals[1]["external_id"] == "nano-in-spanien-protectora-villena"

        # Check third dog
        assert animals[2]["name"] == "Bacon"
        assert animals[2]["external_id"] == "bacon-in-deutschland-vermittlungshilfe"

    @pytest.mark.unit
    @pytest.mark.fast
    def test_scrape_animal_details_extracts_german_properties(
        self, scraper, detail_html
    ):
        """Test Phase 2: Extract German properties and hero image from detail page."""
        mock_response = Mock()
        mock_response.text = detail_html
        mock_response.raise_for_status = Mock()

        with patch("requests.get", return_value=mock_response):
            details = scraper._scrape_animal_details(
                "https://tierschutzverein-europa.de/tiervermittlung/bonsai/"
            )

        # Check hero image extraction
        assert (
            details["primary_image_url"]
            == "https://tierschutzverein-europa.de/wp-content/uploads/2025/08/bonsai-hero-600x400.jpg"
        )
        assert details["image_urls"] == [
            "https://tierschutzverein-europa.de/wp-content/uploads/2025/08/bonsai-hero-600x400.jpg"
        ]

        # Check German properties extraction
        properties = details["properties"]
        assert properties["Name"] == "Bonsai"
        assert properties["Rasse"] == "Mischling"
        assert properties["Geschlecht"] == "männlich"
        assert properties["Geburtstag"] == "05.2025 (3 Monate alt)"
        assert properties["Ungefähre Größe"] == "17 cm, im Wachstum, klein bleibend"
        assert properties["Kastriert"] == "zu jung"
        assert properties["Katzentest"] == "auf Anfrage"
        assert properties["Besonderheiten"] == "keine bekannt"
        assert properties["Mittelmeertest"] == "zu jung"
        assert properties["Aufenthaltsort"] == "Hundepension von Perros con Alma"

        # Check description extraction
        assert "Beschreibung" in properties
        assert "Klein, aber voller Lebensfreude" in properties["Beschreibung"]
        assert "ohne ihre Mütter im Tierheim" in properties["Beschreibung"]

    @pytest.mark.unit
    @pytest.mark.fast
    def test_external_id_preservation(self, scraper):
        """Test that external_id format is preserved exactly as before."""
        # Test various URL patterns to ensure external_id extraction remains unchanged
        test_cases = [
            (
                "/tiervermittlung/bonsai-in-spanien-perros-con-alma-zaragoza/",
                "bonsai-in-spanien-perros-con-alma-zaragoza",
            ),
            (
                "/tiervermittlung/nano-in-spanien-protectora-villena/",
                "nano-in-spanien-protectora-villena",
            ),
            (
                "/tiervermittlung/bacon-in-deutschland-vermittlungshilfe/",
                "bacon-in-deutschland-vermittlungshilfe",
            ),
            ("/tiervermittlung/luna-rumaenien/", "luna-rumaenien"),
        ]

        for url, expected_id in test_cases:
            external_id = scraper._extract_external_id_from_url(url)
            assert external_id == expected_id, f"External ID mismatch for {url}"

    @pytest.mark.unit
    @pytest.mark.fast
    def test_process_animals_parallel_batching(self, scraper):
        """Test parallel processing respects batch_size and rate limits."""
        animals = [
            {"name": "Dog1", "adoption_url": "url1", "external_id": "dog1"},
            {"name": "Dog2", "adoption_url": "url2", "external_id": "dog2"},
            {"name": "Dog3", "adoption_url": "url3", "external_id": "dog3"},
            {"name": "Dog4", "adoption_url": "url4", "external_id": "dog4"},
        ]

        # Mock detail scraping to track calls
        call_count = 0

        def mock_scrape_details(url):
            nonlocal call_count
            call_count += 1
            return {"properties": {"test": f"data_{call_count}"}}

        scraper._scrape_animal_details = mock_scrape_details
        scraper.batch_size = 2  # Process in batches of 2

        result = scraper._process_animals_parallel(animals)

        assert len(result) == 4
        assert call_count == 4
        # Each animal should have been enriched with detail data
        for i, animal in enumerate(result):
            assert "properties" in animal
            assert "test" in animal["properties"]

    @pytest.mark.unit
    @pytest.mark.fast
    def test_pagination_url_generation(self, scraper):
        """Test that pagination URLs are generated correctly."""
        assert (
            scraper.get_page_url(1)
            == "https://tierschutzverein-europa.de/tiervermittlung/"
        )
        assert (
            scraper.get_page_url(2)
            == "https://tierschutzverein-europa.de/tiervermittlung/page/2/"
        )
        assert (
            scraper.get_page_url(12)
            == "https://tierschutzverein-europa.de/tiervermittlung/page/12/"
        )

    @pytest.mark.unit
    @pytest.mark.fast
    def test_hero_image_extraction_from_detail_page(self, scraper):
        """Test extraction of hero/primary image from detail page."""
        html_with_images = """
        <html>
        <body>
            <!-- Profile/Hero image -->
            <img class="wp-post-image" src="https://tierschutzverein-europa.de/wp-content/uploads/2025/08/bonsai-hero.jpg" alt="Bonsai">
            
            <!-- Gallery images -->
            <div class="gallery">
                <img src="https://tierschutzverein-europa.de/wp-content/uploads/2025/08/bonsai-1.jpg" alt="Bonsai 1">
                <img src="https://tierschutzverein-europa.de/wp-content/uploads/2025/08/bonsai-2.jpg" alt="Bonsai 2">
            </div>
        </body>
        </html>
        """

        soup = BeautifulSoup(html_with_images, "html.parser")
        hero_image = scraper._extract_hero_image(soup)

        assert (
            hero_image
            == "https://tierschutzverein-europa.de/wp-content/uploads/2025/08/bonsai-hero.jpg"
        )

    @pytest.mark.unit
    @pytest.mark.fast
    def test_german_properties_extraction_with_missing_fields(self, scraper):
        """Test graceful handling of missing property fields."""
        html_partial = """
        <html>
        <body>
            <table class="dog-info">
                <tr><td>Name:</td><td>Luna</td></tr>
                <tr><td>Rasse:</td><td>Labrador Mix</td></tr>
                <tr><td>Geschlecht:</td><td>weiblich</td></tr>
            </table>
            <h2>Beschreibung</h2>
            <p>Luna ist eine liebevolle Hündin.</p>
        </body>
        </html>
        """

        soup = BeautifulSoup(html_partial, "html.parser")
        properties = scraper._extract_properties_from_soup(soup)

        # Should extract what's available
        assert properties["Name"] == "Luna"
        assert properties["Rasse"] == "Labrador Mix"
        assert properties["Geschlecht"] == "weiblich"

        # Should have description
        assert "Beschreibung" in properties
        assert "liebevolle Hündin" in properties["Beschreibung"]

        # Missing fields should not cause errors
        assert "Geburtstag" not in properties or properties["Geburtstag"] is None
