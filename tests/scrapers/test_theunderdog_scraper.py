"""Tests for The Underdog scraper."""

from unittest.mock import MagicMock, patch

import pytest
from bs4 import BeautifulSoup

from scrapers.theunderdog.theunderdog_scraper import TheUnderdogScraper


@pytest.mark.api
@pytest.mark.computation
@pytest.mark.database
@pytest.mark.integration
@pytest.mark.network
@pytest.mark.slow
class TestTheUnderdogScraper:
    """Test suite for The Underdog scraper."""

    @pytest.fixture
    def scraper(self):
        """Create scraper instance with mocked database connection."""
        with patch("scrapers.base_scraper.BaseScraper.connect_to_database"):
            scraper = TheUnderdogScraper(config_id="theunderdog")
            scraper.conn = MagicMock()
            scraper.logger = MagicMock()
            return scraper

    @pytest.fixture
    def listing_html(self):
        """Mock HTML for listing page with various dog statuses."""
        return """
        <html>
        <body>
            <div class="ProductList">
                <!-- Available dog - no status badge -->
                <article class="ProductList-item hentry">
                    <a href="/adopt/bella" class="ProductList-item-link">
                        <div class="ProductList-image">
                            <img src="bella.jpg" alt="BELLA 🇬🇧">
                        </div>
                        <h2 class="ProductList-title">BELLA 🇬🇧</h2>
                    </a>
                </article>
                
                <!-- Reserved dog - has RESERVED in title -->
                <article class="ProductList-item hentry">
                    <a href="/adopt/max" class="ProductList-item-link">
                        <div class="ProductList-image">
                            <img src="max.jpg" alt="MAX 🇨🇾 RESERVED">
                        </div>
                        <h2 class="ProductList-title">MAX 🇨🇾 RESERVED</h2>
                    </a>
                </article>
                
                <!-- Adopted dog - has ADOPTED in title -->
                <article class="ProductList-item hentry">
                    <a href="/adopt/luna" class="ProductList-item-link">
                        <div class="ProductList-image">
                            <img src="luna.jpg" alt="LUNA 🇧🇦 ADOPTED">
                        </div>
                        <h2 class="ProductList-title">LUNA 🇧🇦 ADOPTED</h2>
                    </a>
                </article>
                
                <!-- Another available dog -->
                <article class="ProductList-item hentry">
                    <a href="/adopt/buddy" class="ProductList-item-link">
                        <div class="ProductList-image">
                            <img src="buddy.jpg" alt="BUDDY 🇫🇷">
                        </div>
                        <h2 class="ProductList-title">BUDDY 🇫🇷</h2>
                    </a>
                </article>
                
                <!-- Edge case: lowercase reserved -->
                <article class="ProductList-item hentry">
                    <a href="/adopt/charlie" class="ProductList-item-link">
                        <div class="ProductList-image">
                            <img src="charlie.jpg" alt="CHARLIE 🇷🇴 reserved">
                        </div>
                        <h2 class="ProductList-title">CHARLIE 🇷🇴 reserved</h2>
                    </a>
                </article>
            </div>
        </body>
        </html>
        """

    def test_get_animal_list_filters_correctly(self, scraper, listing_html):
        """Test that get_animal_list returns only available dogs."""
        soup = BeautifulSoup(listing_html, "html.parser")

        # Mock the _fetch_listing_page method
        scraper._fetch_listing_page = MagicMock(return_value=soup)

        # Get animal list
        animals = scraper.get_animal_list()

        # Should only return available dogs (no ADOPTED/RESERVED in title)
        assert len(animals) == 2

        # Check the available dogs (names should be cleaned of flag emojis)
        names = [animal["name"] for animal in animals]
        assert "BELLA" in names
        assert "BUDDY" in names

        # Verify reserved/adopted dogs are excluded
        assert "MAX 🇨🇾 RESERVED" not in names
        assert "LUNA 🇧🇦 ADOPTED" not in names
        assert "CHARLIE 🇷🇴 reserved" not in names

    def test_get_animal_list_extracts_correct_urls(self, scraper, listing_html):
        """Test that correct URLs are extracted for available dogs."""
        soup = BeautifulSoup(listing_html, "html.parser")
        scraper._fetch_listing_page = MagicMock(return_value=soup)

        animals = scraper.get_animal_list()

        # Check URLs
        urls = [animal["url"] for animal in animals]
        assert "https://www.theunderdog.org/adopt/bella" in urls
        assert "https://www.theunderdog.org/adopt/buddy" in urls

    def test_get_animal_list_handles_empty_page(self, scraper):
        """Test handling of empty listing page."""
        empty_html = """
        <html>
        <body>
            <div class="ProductList">
            </div>
        </body>
        </html>
        """
        soup = BeautifulSoup(empty_html, "html.parser")
        scraper._fetch_listing_page = MagicMock(return_value=soup)

        animals = scraper.get_animal_list()
        assert animals == []

    def test_is_available_dog_logic(self, scraper):
        """Test the logic for determining if a dog is available."""
        # Available dogs - no status badge
        assert scraper._is_available_dog("BELLA 🇬🇧") is True
        assert scraper._is_available_dog("BUDDY 🇫🇷") is True

        # Unavailable dogs - have status badges
        assert scraper._is_available_dog("MAX 🇨🇾 RESERVED") is False
        assert scraper._is_available_dog("LUNA 🇧🇦 ADOPTED") is False
        assert scraper._is_available_dog("CHARLIE 🇷🇴 reserved") is False
        assert scraper._is_available_dog("Dog Name adopted") is False

        # Edge cases
        assert scraper._is_available_dog("RESERVED") is False
        assert scraper._is_available_dog("ADOPTED") is False
        assert scraper._is_available_dog("") is True  # Empty should be available

    def test_extract_dog_info_from_card(self, scraper):
        """Test extracting dog info from a single card."""
        card_html = """
        <article class="ProductList-item hentry">
            <a href="/adopt/bella" class="ProductList-item-link">
                <div class="ProductList-image">
                    <img src="bella.jpg" alt="BELLA 🇬🇧">
                </div>
                <h2 class="ProductList-title">BELLA 🇬🇧</h2>
            </a>
        </article>
        """
        soup = BeautifulSoup(card_html, "html.parser")
        card = soup.find("article")

        info = scraper._extract_dog_info(card)

        assert info["name"] == "BELLA"
        assert info["url"] == "https://www.theunderdog.org/adopt/bella"
        assert info["thumbnail_url"] == "bella.jpg"

    def test_get_animal_list_with_network_error(self, scraper):
        """Test handling of network errors during fetch."""
        scraper._fetch_listing_page = MagicMock(side_effect=Exception("Network error"))

        animals = scraper.get_animal_list()

        # Should return empty list and log error
        assert animals == []
        scraper.logger.error.assert_called()

    def test_single_page_no_pagination(self, scraper, listing_html):
        """Test that scraper correctly handles single-page listing without pagination."""
        soup = BeautifulSoup(listing_html, "html.parser")
        scraper._fetch_listing_page = MagicMock(return_value=soup)

        # Should only call fetch once (no pagination)
        animals = scraper.get_animal_list()

        scraper._fetch_listing_page.assert_called_once()
        assert len(animals) == 2  # Only available dogs


class TestTheUnderdogDetailScraping:
    """Test suite for The Underdog detail page scraping."""

    @pytest.fixture
    def scraper(self):
        """Create scraper instance with mocked database connection."""
        with patch("scrapers.base_scraper.BaseScraper.connect_to_database"):
            scraper = TheUnderdogScraper(config_id="theunderdog")
            scraper.conn = MagicMock()
            scraper.logger = MagicMock()
            return scraper

    @pytest.fixture
    def detail_html_available(self):
        """Mock HTML for available dog detail page."""
        return """
        <html>
        <body>
            <div class="ProductItem">
                <div class="ProductItem-gallery">
                    <div class="ProductItem-gallery-slides">
                        <img src="https://example.com/vicky-hero.jpg" alt="Vicky">
                    </div>
                    <div class="ProductItem-gallery-thumbnails">
                        <img src="https://example.com/vicky-thumb1.jpg" alt="Vicky thumb 1">
                        <img src="https://example.com/vicky-thumb2.jpg" alt="Vicky thumb 2">
                    </div>
                </div>
                
                <div class="ProductItem-details">
                    <h1 class="ProductItem-details-title">Vicky 🇬🇧</h1>
                    
                    <div class="ProductItem-details-excerpt">
                        <p>
                            <strong>How big?</strong> Large (around 30kg)<br>
                            <strong>How old?</strong> Young adult (around two years)<br>
                            <strong>Male or female?</strong> Female<br>
                            <strong>Living with kids?</strong> I can live with children (8+)<br>
                            <strong>Living with dogs?</strong> I can live with other dogs<br>
                            <strong>Resident dog required?</strong> No, but would be beneficial<br>
                            <strong>Living with cats?</strong> I've not been tested with cats<br>
                            <strong>Where can I live?</strong> I need a home that appreciates the quieter life options<br><br>
                            
                            <strong>About Vicky</strong><br>
                            Vicky is currently in a foster home in North Devon after being rescued from a difficult start in life and spending a good few months in the shelter in Cyprus. She's believed to be around two years old and is a large mixed breed with a calm, sweet and endearing personality.
                        </p>
                    </div>
                    
                    <button class="sqs-add-to-cart-button">Add To Cart</button>
                </div>
            </div>
        </body>
        </html>
        """

    @pytest.fixture
    def detail_html_reserved(self):
        """Mock HTML for reserved dog detail page."""
        return """
        <html>
        <body>
            <div class="ProductItem">
                <div class="ProductItem-details">
                    <h1 class="ProductItem-details-title">Max 🇨🇾 RESERVED</h1>
                    
                    <div class="ProductItem-details-excerpt">
                        <p>This dog has been reserved.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

    @pytest.fixture
    def detail_html_minimal(self):
        """Mock HTML for dog with minimal information."""
        return """
        <html>
        <body>
            <div class="ProductItem">
                <div class="ProductItem-details">
                    <h1 class="ProductItem-details-title">Buddy 🇫🇷</h1>
                    
                    <div class="ProductItem-details-excerpt">
                        <p>
                            <strong>How big?</strong> Medium<br>
                            <strong>About Buddy</strong><br>
                            A lovely dog looking for a home.
                        </p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

    def test_scrape_animal_details_available_dog(self, scraper, detail_html_available):
        """Test scraping details of an available dog."""
        soup = BeautifulSoup(detail_html_available, "html.parser")

        # Mock the _fetch_detail_page method
        scraper._fetch_detail_page = MagicMock(return_value=soup)

        # Test scraping
        result = scraper.scrape_animal_details("https://theunderdog.org/adopt/vicky")

        # Verify result structure
        assert result is not None
        assert result["name"] == "Vicky"
        assert result["primary_image_url"] == "https://example.com/vicky-hero.jpg"

        # Check extracted properties (stored in enhanced structure)
        properties = result["properties"]
        qa_data = properties["raw_qa_data"]
        assert qa_data["How big?"] == "Large (around 30kg)"
        assert qa_data["How old?"] == "Young adult (around two years)"
        assert qa_data["Male or female?"] == "Female"
        assert qa_data["Living with kids?"] == "I can live with children (8+)"
        assert qa_data["Living with dogs?"] == "I can live with other dogs"
        assert qa_data["Resident dog required?"] == "No, but would be beneficial"
        assert qa_data["Living with cats?"] == "I've not been tested with cats"
        assert qa_data["Where can I live?"] == "I need a home that appreciates the quieter life options"

        # Check enhanced properties structure
        assert properties["raw_name"] == "Vicky"
        assert properties["page_url"] == "https://theunderdog.org/adopt/vicky"

        # Check description
        expected_desc = "Vicky is currently in a foster home in North Devon after being rescued from a difficult start in life and spending a good few months in the shelter in Cyprus. She's believed to be around two years old and is a large mixed breed with a calm, sweet and endearing personality."
        assert expected_desc in result["description"]

        # Check external ID is generated
        assert result["external_id"] == "vicky"

    def test_scrape_animal_details_reserved_dog(self, scraper, detail_html_reserved):
        """Test that reserved dogs are skipped."""
        soup = BeautifulSoup(detail_html_reserved, "html.parser")
        scraper._fetch_detail_page = MagicMock(return_value=soup)

        # Should return None for reserved dogs
        result = scraper.scrape_animal_details("https://theunderdog.org/adopt/max")

        assert result is None
        scraper.logger.info.assert_called_with("Skipping reserved/adopted dog: Max 🇨🇾 RESERVED")

    def test_scrape_animal_details_minimal_data(self, scraper, detail_html_minimal):
        """Test scraping dog with minimal information."""
        soup = BeautifulSoup(detail_html_minimal, "html.parser")
        scraper._fetch_detail_page = MagicMock(return_value=soup)

        result = scraper.scrape_animal_details("https://theunderdog.org/adopt/buddy")

        assert result is not None
        assert result["name"] == "Buddy"
        assert result["primary_image_url"] is None  # No image

        # Should have minimal properties (stored in enhanced structure)
        properties = result["properties"]
        qa_data = properties["raw_qa_data"]
        assert qa_data["How big?"] == "Medium"
        assert "How old?" not in qa_data  # Missing field

        # Should have description
        assert "A lovely dog looking for a home." in result["description"]

    def test_extract_country_from_flag(self, scraper):
        """Test country extraction from flag emojis."""
        result = scraper._extract_country_from_name("Vicky 🇬🇧")
        assert result == {"name": "United Kingdom", "iso_code": "GB"}

        result = scraper._extract_country_from_name("Max 🇨🇾")
        assert result == {"name": "Cyprus", "iso_code": "CY"}

        result = scraper._extract_country_from_name("Luna 🇧🇦")
        assert result == {"name": "Bosnia and Herzegovina", "iso_code": "BA"}

        result = scraper._extract_country_from_name("Pierre 🇫🇷")
        assert result == {"name": "France", "iso_code": "FR"}

        result = scraper._extract_country_from_name("Radu 🇷🇴")
        assert result == {"name": "Romania", "iso_code": "RO"}

        assert scraper._extract_country_from_name("No Flag Dog") is None

    def test_extract_properties_from_description(self, scraper):
        """Test property extraction from description text."""
        text = """
        <strong>How big?</strong> Large (around 30kg)<br>
        <strong>How old?</strong> Young adult (around two years)<br>
        <strong>Male or female?</strong> Female<br>
        <strong>About Vicky</strong><br>
        Vicky is a lovely dog.
        """

        properties, description = scraper._extract_properties_and_description(text)

        assert properties["How big?"] == "Large (around 30kg)"
        assert properties["How old?"] == "Young adult (around two years)"
        assert properties["Male or female?"] == "Female"
        assert "Vicky is a lovely dog." in description

    def test_scrape_animal_details_network_error(self, scraper):
        """Test handling of network errors during detail page fetch."""
        scraper._fetch_detail_page = MagicMock(side_effect=Exception("Network error"))

        result = scraper.scrape_animal_details("https://theunderdog.org/adopt/error")

        assert result is None
        scraper.logger.error.assert_called()

    def test_generate_external_id_from_url(self, scraper):
        """Test external ID generation from URL."""
        assert scraper._generate_external_id("https://theunderdog.org/adopt/vicky") == "vicky"
        assert scraper._generate_external_id("https://theunderdog.org/adopt/buddy-the-dog") == "buddy-the-dog"
        assert scraper._generate_external_id("/adopt/max") == "max"
