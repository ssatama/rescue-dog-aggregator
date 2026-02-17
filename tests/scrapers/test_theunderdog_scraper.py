from unittest.mock import MagicMock, Mock, patch

import pytest
from bs4 import BeautifulSoup

from scrapers.theunderdog.theunderdog_scraper import TheUnderdogScraper


@pytest.mark.database
@pytest.mark.slow
@pytest.mark.integration
@pytest.mark.external
class TestTheUnderdogScraper:
    @pytest.fixture
    def scraper(self):
        with patch("scrapers.base_scraper.BaseScraper.connect_to_database"):
            scraper = TheUnderdogScraper(config_id="theunderdog")
            scraper.conn = MagicMock()
            scraper.logger = MagicMock()
            return scraper

    @pytest.fixture
    def listing_html(self):
        return """
        <html>
        <body>
            <div class="ProductList">
                <article class="ProductList-item hentry">
                    <a href="/adopt/bella" class="ProductList-item-link">
                        <div class="ProductList-image">
                            <img src="bella.jpg" alt="BELLA 🇬🇧">
                        </div>
                        <h2 class="ProductList-title">BELLA 🇬🇧</h2>
                    </a>
                </article>

                <article class="ProductList-item hentry">
                    <a href="/adopt/max" class="ProductList-item-link">
                        <div class="ProductList-image">
                            <img src="max.jpg" alt="MAX 🇨🇾 RESERVED">
                        </div>
                        <h2 class="ProductList-title">MAX 🇨🇾 RESERVED</h2>
                    </a>
                </article>

                <article class="ProductList-item hentry">
                    <a href="/adopt/luna" class="ProductList-item-link">
                        <div class="ProductList-image">
                            <img src="luna.jpg" alt="LUNA 🇧🇦 ADOPTED">
                        </div>
                        <h2 class="ProductList-title">LUNA 🇧🇦 ADOPTED</h2>
                    </a>
                </article>

                <article class="ProductList-item hentry">
                    <a href="/adopt/buddy" class="ProductList-item-link">
                        <div class="ProductList-image">
                            <img src="buddy.jpg" alt="BUDDY 🇫🇷">
                        </div>
                        <h2 class="ProductList-title">BUDDY 🇫🇷</h2>
                    </a>
                </article>

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
        soup = BeautifulSoup(listing_html, "html.parser")
        scraper._fetch_listing_page = MagicMock(return_value=soup)

        animals = scraper.get_animal_list()

        assert len(animals) == 2

        names = [animal["name"] for animal in animals]
        assert "BELLA" in names
        assert "BUDDY" in names
        assert "MAX 🇨🇾 RESERVED" not in names
        assert "LUNA 🇧🇦 ADOPTED" not in names
        assert "CHARLIE 🇷🇴 reserved" not in names

    def test_get_animal_list_extracts_correct_urls(self, scraper, listing_html):
        soup = BeautifulSoup(listing_html, "html.parser")
        scraper._fetch_listing_page = MagicMock(return_value=soup)

        animals = scraper.get_animal_list()

        urls = [animal["url"] for animal in animals]
        assert "https://www.theunderdog.org/adopt/bella" in urls
        assert "https://www.theunderdog.org/adopt/buddy" in urls

    def test_get_animal_list_handles_empty_page(self, scraper):
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
        assert scraper._is_available_dog("BELLA 🇬🇧") is True
        assert scraper._is_available_dog("BUDDY 🇫🇷") is True

        assert scraper._is_available_dog("MAX 🇨🇾 RESERVED") is False
        assert scraper._is_available_dog("LUNA 🇧🇦 ADOPTED") is False
        assert scraper._is_available_dog("CHARLIE 🇷🇴 reserved") is False
        assert scraper._is_available_dog("Dog Name adopted") is False

        assert scraper._is_available_dog("RESERVED") is False
        assert scraper._is_available_dog("ADOPTED") is False
        assert scraper._is_available_dog("") is True

    def test_extract_dog_info_from_card(self, scraper):
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
        scraper._fetch_listing_page = MagicMock(side_effect=Exception("Network error"))

        animals = scraper.get_animal_list()

        assert animals == []
        scraper.logger.error.assert_called()

    def test_single_page_no_pagination(self, scraper, listing_html):
        soup = BeautifulSoup(listing_html, "html.parser")
        scraper._fetch_listing_page = MagicMock(return_value=soup)

        animals = scraper.get_animal_list()

        scraper._fetch_listing_page.assert_called_once()
        assert len(animals) == 2


class TestTheUnderdogDetailScraping:
    @pytest.fixture
    def scraper(self):
        with patch("scrapers.base_scraper.BaseScraper.connect_to_database"):
            scraper = TheUnderdogScraper(config_id="theunderdog")
            scraper.conn = MagicMock()
            scraper.logger = MagicMock()
            return scraper

    @pytest.fixture
    def detail_html_available(self):
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
        soup = BeautifulSoup(detail_html_available, "html.parser")
        scraper._fetch_detail_page = MagicMock(return_value=soup)

        result = scraper.scrape_animal_details("https://theunderdog.org/adopt/vicky")

        assert result is not None
        assert result["name"] == "Vicky"
        assert result["primary_image_url"] == "https://example.com/vicky-hero.jpg"

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

        assert properties["raw_name"] == "Vicky"
        assert properties["page_url"] == "https://theunderdog.org/adopt/vicky"

        expected_desc = "Vicky is currently in a foster home in North Devon after being rescued from a difficult start in life and spending a good few months in the shelter in Cyprus. She's believed to be around two years old and is a large mixed breed with a calm, sweet and endearing personality."
        assert expected_desc in result["description"]

        assert result["external_id"] == "tud-vicky"

    def test_scrape_animal_details_reserved_dog(self, scraper, detail_html_reserved):
        soup = BeautifulSoup(detail_html_reserved, "html.parser")
        scraper._fetch_detail_page = MagicMock(return_value=soup)

        result = scraper.scrape_animal_details("https://theunderdog.org/adopt/max")

        assert result is None

    def test_scrape_animal_details_minimal_data(self, scraper, detail_html_minimal):
        soup = BeautifulSoup(detail_html_minimal, "html.parser")
        scraper._fetch_detail_page = MagicMock(return_value=soup)

        result = scraper.scrape_animal_details("https://theunderdog.org/adopt/buddy")

        assert result is not None
        assert result["name"] == "Buddy"
        assert result["primary_image_url"] is None

        properties = result["properties"]
        qa_data = properties["raw_qa_data"]
        assert qa_data["How big?"] == "Medium"
        assert "How old?" not in qa_data

        assert "A lovely dog looking for a home." in result["description"]

    def test_extract_country_from_flag(self, scraper):
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
        scraper._fetch_detail_page = MagicMock(side_effect=Exception("Network error"))

        result = scraper.scrape_animal_details("https://theunderdog.org/adopt/error")

        assert result is None
        scraper.logger.error.assert_called()

    def test_generate_external_id_from_url(self, scraper):
        assert scraper._generate_external_id("https://theunderdog.org/adopt/vicky") == "tud-vicky"
        assert scraper._generate_external_id("https://theunderdog.org/adopt/buddy-the-dog") == "tud-buddy-the-dog"
        assert scraper._generate_external_id("/adopt/max") == "tud-max"


@pytest.mark.integration
@pytest.mark.slow
@pytest.mark.external
class TestTheUnderdogIntegration:
    @pytest.fixture
    def scraper(self):
        scraper = TheUnderdogScraper()
        scraper.organization_id = 14
        return scraper

    @pytest.fixture
    def mock_listing_response(self):
        return """
        <html>
        <body>
            <div class="ProductList-item">
                <h3 class="ProductList-title">Vicky 🇬🇧</h3>
                <a href="/adopt/vicky" class="ProductList-link">
                    <img class="ProductList-image" src="/thumb-vicky.jpg" alt="Vicky">
                </a>
            </div>
            <div class="ProductList-item">
                <h3 class="ProductList-title">Max ADOPTED</h3>
                <a href="/adopt/max" class="ProductList-link">
                    <img class="ProductList-image" src="/thumb-max.jpg" alt="Max">
                </a>
            </div>
            <div class="ProductList-item">
                <h3 class="ProductList-title">Luna 🇫🇷</h3>
                <a href="/adopt/luna" class="ProductList-link">
                    <img class="ProductList-image" src="/thumb-luna.jpg" alt="Luna">
                </a>
            </div>
        </body>
        </html>
        """

    @pytest.fixture
    def mock_detail_response_vicky(self):
        return """
        <html>
        <body>
            <h1 class="ProductItem-details-title">Vicky 🇬🇧</h1>
            <div class="ProductItem-gallery">
                <img src="https://images.squarespace-cdn.com/vicky-hero.jpg" alt="Vicky">
            </div>
            <div class="ProductItem-details-excerpt">
                How big?<br>Large (around 30kg)<br><br>
                How old?<br>Young adult (around two years)<br><br>
                Male or female?<br>Female<br><br>
                Living with kids?<br>I can live with children (8+)<br><br>
                Living with dogs?<br>I can live with other dogs<br><br>
                Resident dog required?<br>No, but would be beneficial<br><br>
                Living with cats?<br>I've not been tested with cats<br><br>
                Where can I live?<br>I'd like a calm, semi-rural home<br><br>
                Where am I from?<br>Cyprus, now in Devon (Cyprus adoption fee applies)<br><br>
                About Vicky<br><br>
                Vicky is currently in a foster home in North Devon after being rescued from a difficult start in life and spending a good few months in the shelter in Cyprus. She's believed to be around two years old and is a large mixed breed with a calm, sweet and endearing personality.
            </div>
        </body>
        </html>
        """

    @pytest.fixture
    def mock_detail_response_luna(self):
        return """
        <html>
        <body>
            <h1 class="ProductItem-details-title">Luna 🇫🇷</h1>
            <div class="ProductItem-gallery">
                <img src="https://images.squarespace-cdn.com/luna-hero.jpg" alt="Luna">
            </div>
            <div class="ProductItem-details-excerpt">
                How big?<br>Medium<br><br>
                Male or female?<br>Female<br><br>
                About Luna<br><br>
                Luna is a beautiful young shepherd mix looking for her forever home. She loves walks and playing with other dogs.
            </div>
        </body>
        </html>
        """

    @patch("scrapers.theunderdog.theunderdog_scraper.requests.get")
    def test_complete_data_pipeline(
        self,
        mock_get,
        scraper,
        mock_listing_response,
        mock_detail_response_vicky,
        mock_detail_response_luna,
    ):
        mock_responses = [
            Mock(text=mock_listing_response, status_code=200),
            Mock(text=mock_detail_response_vicky, status_code=200),
            Mock(text=mock_detail_response_luna, status_code=200),
        ]
        mock_get.side_effect = mock_responses

        scraper.respect_rate_limit = Mock()

        results = scraper.collect_data()

        assert len(results) == 2

        vicky = next(r for r in results if r["name"] == "Vicky")
        assert vicky["external_id"] == "tud-vicky"
        assert vicky["adoption_url"] == "https://www.theunderdog.org/adopt/vicky"
        assert vicky["primary_image_url"] == "https://images.squarespace-cdn.com/vicky-hero.jpg"
        assert vicky["animal_type"] == "dog"
        assert vicky["status"] == "available"

        assert vicky["age_text"] == "Young adult (around two years)"
        assert vicky["breed"] == "Mixed Breed"
        assert vicky["sex"] == "Female"
        assert vicky["size"] == "Large"
        assert vicky["weight_kg"] == 30.0
        assert vicky["country"] == "United Kingdom"
        assert vicky["country_code"] == "GB"
        assert vicky["location"] == "United Kingdom"

        luna = next(r for r in results if r["name"] == "Luna")
        assert luna["external_id"] == "tud-luna"
        assert luna["adoption_url"] == "https://www.theunderdog.org/adopt/luna"
        assert luna["primary_image_url"] == "https://images.squarespace-cdn.com/luna-hero.jpg"

        assert luna["breed"] == "Shepherd Mix" or luna["breed"] == "Mixed Breed"
        assert luna["sex"] == "Female"
        assert luna["size"] == "Medium"
        assert luna["country"] == "France"
        assert luna["country_code"] == "FR"
        assert luna["location"] == "France"

        required_fields = [
            "name",
            "external_id",
            "adoption_url",
            "primary_image_url",
            "description",
            "breed",
            "sex",
            "size",
            "animal_type",
            "status",
        ]
        for dog in results:
            for field in required_fields:
                assert field in dog, f"Missing required field '{field}' in {dog['name']}"
                assert dog[field] is not None, f"Field '{field}' is None in {dog['name']}"
                assert dog[field] != "", f"Field '{field}' is empty in {dog['name']}"

    @patch("scrapers.theunderdog.theunderdog_scraper.requests.get")
    def test_collect_data_returns_empty_list_on_network_error(self, mock_get, scraper):
        mock_get.side_effect = Exception("Network error")

        results = scraper.collect_data()
        assert results == []

    @patch("scrapers.theunderdog.theunderdog_scraper.requests.get")
    def test_fallback_extraction_from_description(self, mock_get, scraper):
        minimal_response = """
        <html>
        <body>
            <h1 class="ProductItem-details-title">Buddy 🇷🇴</h1>
            <div class="ProductItem-gallery">
                <img src="https://images.squarespace-cdn.com/buddy-hero.jpg" alt="Buddy">
            </div>
            <div class="ProductItem-details-excerpt">
                <p>About Buddy</p>
                <p>Buddy is a lovely 3 year old male dog who loves children. He is looking for his forever home.</p>
            </div>
        </body>
        </html>
        """

        mock_get.side_effect = [
            Mock(
                text='<div class="ProductList-item"><h3 class="ProductList-title">Buddy 🇷🇴</h3><a href="/adopt/buddy"></a></div>',
                status_code=200,
            ),
            Mock(text=minimal_response, status_code=200),
        ]

        scraper.respect_rate_limit = Mock()

        results = scraper.collect_data()
        assert len(results) == 1

        buddy = results[0]

        assert buddy["age_text"] == "3 years"
        assert buddy["sex"] == "Male"
        assert buddy["breed"] == "Mixed Breed"
        assert buddy["country"] == "Romania"
        assert buddy["country_code"] == "RO"

    def test_field_population_completeness(self, scraper):
        mock_data = {
            "name": "Test Dog 🇬🇧",
            "external_id": "test-dog",
            "adoption_url": "https://example.com/test-dog",
            "primary_image_url": "https://example.com/test-dog.jpg",
            "description": "A lovely 2 year old female labrador mix.",
            "properties": {
                "raw_qa_data": {
                    "How big?": "Large (25kg)",
                    "How old?": "Young adult (2 years)",
                    "Male or female?": "Female",
                }
            },
            "animal_type": "dog",
            "status": "available",
            "country": {"name": "United Kingdom", "iso_code": "GB"},
        }

        result = mock_data

        from scrapers.theunderdog.normalizer import (
            extract_qa_data,
            extract_size_and_weight_from_qa,
        )

        qa_data = extract_qa_data(result.get("properties", {}))

        size, weight_kg = extract_size_and_weight_from_qa(qa_data)
        if size:
            result["size"] = size
        if weight_kg:
            result["weight_kg"] = weight_kg

        if not result.get("breed"):
            from utils.shared_extraction_patterns import extract_breed_from_text

            result["breed"] = extract_breed_from_text(result["description"])
        if not result.get("age_text"):
            result["age_text"] = scraper._extract_age_fallback(result["description"])
        if not result.get("sex"):
            result["sex"] = scraper._extract_sex_fallback(result["description"])
        if not result.get("size"):
            if result.get("weight_kg"):
                result["size"] = scraper._estimate_size_from_weight(result["weight_kg"])
            else:
                result["size"] = "Medium"
        if not result.get("description"):
            result["description"] = f"Rescue dog from {result.get('country', 'unknown location')}"
        if not result.get("location"):
            result["location"] = result.get("country", "Unknown")

        critical_fields = [
            "name",
            "external_id",
            "adoption_url",
            "primary_image_url",
            "description",
            "breed",
            "age_text",
            "sex",
            "size",
            "animal_type",
            "status",
        ]

        for field in critical_fields:
            assert field in result, f"Missing critical field: {field}"
            assert result[field] is not None, f"Critical field '{field}' is None"
            assert result[field] != "", f"Critical field '{field}' is empty"

        assert isinstance(result["name"], str)
        assert isinstance(result["external_id"], str)
        assert isinstance(result["adoption_url"], str)
        assert isinstance(result["primary_image_url"], str)
        assert isinstance(result["description"], str)
        assert isinstance(result["breed"], str)
        assert isinstance(result["sex"], str)
        assert isinstance(result["size"], str)
        assert isinstance(result["animal_type"], str)
        assert isinstance(result["status"], str)

        assert result["breed"] == "Labrador Mix"
        assert result["age_text"] == "2 years"
        assert result["sex"] == "Female"
        assert result["size"] == "Large"
        assert result["weight_kg"] == 25.0

    def test_data_accuracy_validation(self, scraper):
        age_tests = [
            ("A 2 year old dog", "2 years"),
            ("This 6 month old puppy", "6 months"),
            ("Around 3 years old", "3 years"),
            ("No age mentioned", None),
        ]

        for description, expected_age in age_tests:
            result = scraper._extract_age_fallback(description)
            assert result == expected_age, f"Age extraction failed for '{description}'"

        sex_tests = [
            ("She is a lovely dog", "Female"),
            ("He loves to play", "Male"),
            ("This dog is friendly", None),
        ]

        for description, expected_sex in sex_tests:
            result = scraper._extract_sex_fallback(description)
            assert result == expected_sex, f"Sex extraction failed for '{description}'"

        size_tests = [
            (5.0, "Small"),
            (15.0, "Medium"),
            (30.0, "Large"),
            (50.0, "XLarge"),
        ]

        for weight, expected_size in size_tests:
            result = scraper._estimate_size_from_weight(weight)
            assert result == expected_size, f"Size estimation failed for {weight}kg"
