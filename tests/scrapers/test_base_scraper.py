# tests/scrapers/test_base_scraper_behavioral.py
"""
Behavioral tests for BaseScraper - testing outcomes, not implementation details.
Replaces the overly granular test_base_scraper.py with focused behavioral tests.
"""

from unittest.mock import Mock, patch

import pytest

from scrapers.base_scraper import BaseScraper


class ConcreteTestScraper(BaseScraper):
    """Concrete implementation for testing."""

    def collect_data(self):
        return [
            {
                "name": "Test Dog",
                "external_id": "test-1",
                "primary_image_url": "https://example.com/dog.jpg",
            },
        ]


@pytest.mark.unit
@pytest.mark.fast
class TestBaseScraperBehavior:
    """Test BaseScraper behavior - what it does, not how it does it."""

    @pytest.fixture
    def scraper(self):
        """Create a test scraper instance."""
        with patch("scrapers.base_scraper.psycopg2"):
            scraper = ConcreteTestScraper(organization_id=1)
            # Mock database service for proper functionality
            scraper.database_service = Mock()
            scraper.conn = Mock()
            scraper.cursor = Mock()
            return scraper

    def test_scraper_saves_new_animals(self, scraper):
        """Test that scraper successfully saves new animals to database."""
        # Setup
        scraper.database_service.get_existing_animal.return_value = (
            None  # No existing animal
        )
        scraper.database_service.create_animal.return_value = (123, "create")

        animal_data = {
            "name": "New Dog",
            "external_id": "new-1",
            "organization_id": 1,
            "adoption_url": "https://example.com/adopt/new-1",
        }

        # Act
        result = scraper.save_animal(animal_data)

        # Assert
        assert result == (123, "create")

    def test_scraper_handles_database_errors_gracefully(self, scraper):
        """Test that scraper handles database errors without crashing."""
        # Setup
        scraper.database_service.create_animal.side_effect = Exception("Database error")

        animal_data = {
            "name": "Error Dog",
            "external_id": "error-1",
            "organization_id": 1,
            "adoption_url": "https://example.com/adopt/error-1",
        }

        # Act & Assert
        result = scraper.save_animal(animal_data)
        assert result == (None, "error")  # Should return error tuple, not crash

    def test_scraper_rejects_animal_with_invalid_image_url(self, scraper):
        """Test that animals with empty or None image URLs are rejected during validation."""
        # Animal data with empty string for primary_image_url (invalid - crashes downstream)
        animal_data_empty_url = {
            "name": "Test Dog",
            "external_id": "test-empty-url",
            "organization_id": 1,
            "adoption_url": "https://example.com/adopt",
            "primary_image_url": "",  # Empty string should be rejected
        }

        # Validate should return False for empty image URL
        assert not scraper._validate_animal_data(animal_data_empty_url)

        # Animal data with None for primary_image_url (invalid - crashes downstream)
        animal_data_none_url = {
            "name": "Test Dog",
            "external_id": "test-none-url",
            "organization_id": 1,
            "adoption_url": "https://example.com/adopt",
            "primary_image_url": None,  # None should be rejected (crashes downstream)
        }

        # Validate should return False for None image URL
        assert not scraper._validate_animal_data(animal_data_none_url)

        # Animal data with valid URL (valid)
        animal_data_valid_url = {
            "name": "Test Dog",
            "external_id": "test-valid-url",
            "organization_id": 1,
            "adoption_url": "https://example.com/adopt",
            "primary_image_url": "https://example.com/dog.jpg",  # Valid URL
        }

        # Validate should return True for valid image URL
        assert scraper._validate_animal_data(animal_data_valid_url)


@pytest.mark.unit
@pytest.mark.fast
class TestNameValidationAndNormalization:
    """Test comprehensive name validation and normalization."""

    @pytest.fixture
    def scraper(self):
        """Create a test scraper instance."""
        with patch("scrapers.base_scraper.psycopg2"):
            scraper = ConcreteTestScraper(organization_id=1)
            scraper.database_service = Mock()
            return scraper

    def test_rejects_pure_numeric_names(self, scraper):
        """Test that pure numeric names like '251' are rejected."""
        assert scraper._is_invalid_name("251")
        assert scraper._is_invalid_name("123")
        assert scraper._is_invalid_name("  456  ")

    def test_accepts_names_with_numbers(self, scraper):
        """Test that names with numbers but also letters are accepted."""
        assert not scraper._is_invalid_name("Max 2")
        assert not scraper._is_invalid_name("K9 Rex")
        assert not scraper._is_invalid_name("Lucky13")

    def test_rejects_names_with_too_many_digits(self, scraper):
        """Test that names with >60% digits are rejected."""
        assert scraper._is_invalid_name("123dog456")  # 66% digits (6/9)
        assert scraper._is_invalid_name("1234ab")  # 66% digits (4/6)

        # These should be accepted (<=60% digits)
        assert not scraper._is_invalid_name("251abc")  # 50% digits (3/6)
        assert not scraper._is_invalid_name("Max 2")  # 20% digits (1/5)

    def test_rejects_too_short_names(self, scraper):
        """Test that names < 2 characters are rejected."""
        assert scraper._is_invalid_name("A")
        assert scraper._is_invalid_name(" ")
        assert scraper._is_invalid_name("")

    def test_normalizes_utf8_double_encoding(self, scraper):
        """Test that UTF-8 double-encoding is fixed (Ã« → ë)."""
        result = scraper._normalize_animal_name("BrontÃ«")
        assert result == "Brontë"

        result = scraper._normalize_animal_name("RenÃ©e")
        assert result == "Renée"

    def test_normalizes_html_entities(self, scraper):
        """Test that HTML entities are decoded."""
        result = scraper._normalize_animal_name("Max &amp; Ruby")
        assert result == "Max & Ruby"

        result = scraper._normalize_animal_name("&quot;Buddy&quot;")
        assert result == '"Buddy"'

    def test_normalizes_unicode_combining_characters(self, scraper):
        """Test that Unicode combining characters are normalized."""
        # e + combining acute → é (NFC normalization)
        result = scraper._normalize_animal_name("Rene\u0301e")  # e + combining acute
        assert result == "Renée"

    def test_normalization_handles_invalid_input(self, scraper):
        """Test that normalization handles edge cases gracefully."""
        # None should return None
        assert scraper._normalize_animal_name(None) is None

        # Empty string should return empty string (will be caught by validation)
        assert scraper._normalize_animal_name("") == ""

        # Non-string input should return unchanged
        assert scraper._normalize_animal_name(123) == 123

    def test_validation_normalizes_and_updates_name(self, scraper):
        """Test that validation normalizes and updates the name in animal_data."""
        animal_data = {
            "name": "BrontÃ«",
            "external_id": "test-1",
            "adoption_url": "https://example.com/adopt",
            "primary_image_url": "https://example.com/dog.jpg",
        }

        is_valid = scraper._validate_animal_data(animal_data)
        assert is_valid
        assert animal_data["name"] == "Brontë"

    def test_validation_rejects_numeric_names(self, scraper):
        """Test that validation rejects pure numeric names."""
        animal_data = {
            "name": "251",
            "external_id": "test-1",
            "adoption_url": "https://example.com/adopt",
            "primary_image_url": "https://example.com/dog.jpg",
        }

        assert not scraper._validate_animal_data(animal_data)

    def test_validation_normalizes_html_entities_in_names(self, scraper):
        """Test that validation normalizes HTML entities in names."""
        animal_data = {
            "name": "Echo &amp; Pixel",
            "external_id": "test-1",
            "adoption_url": "https://example.com/adopt",
            "primary_image_url": "https://example.com/dog.jpg",
        }

        is_valid = scraper._validate_animal_data(animal_data)
        assert is_valid
        assert animal_data["name"] == "Echo & Pixel"

    def test_rejects_connection_error_patterns(self, scraper):
        """Test that connection error messages are rejected."""
        assert scraper._is_invalid_name("This site can't be reached")
        assert scraper._is_invalid_name("Connection failed")
        assert scraper._is_invalid_name("DNS_PROBE_FINISHED_NXDOMAIN")
        assert scraper._is_invalid_name("ERR_NAME_NOT_RESOLVED")
        assert scraper._is_invalid_name("ERR_CONNECTION_REFUSED")

    def test_rejects_http_error_patterns(self, scraper):
        """Test that HTTP error messages are rejected."""
        assert scraper._is_invalid_name("Page not found")
        assert scraper._is_invalid_name("Error 404")
        assert scraper._is_invalid_name("Error 500")
        assert scraper._is_invalid_name("Access denied")

    def test_rejects_gift_card_patterns(self, scraper):
        """Test that gift card/promotional content is rejected."""
        assert scraper._is_invalid_name("Gift Card")
        assert scraper._is_invalid_name("$50 Voucher")
        assert scraper._is_invalid_name("Coupon Code")
        assert scraper._is_invalid_name("Promo code discount")

    def test_rejects_url_patterns(self, scraper):
        """Test that URLs embedded as names are rejected."""
        assert scraper._is_invalid_name("https://example.com/dog")
        assert scraper._is_invalid_name("http://rescue.org")
        assert scraper._is_invalid_name("www.dogs.com")

    def test_rejects_price_patterns(self, scraper):
        """Test that price values are rejected."""
        assert scraper._is_invalid_name("$50")
        assert scraper._is_invalid_name("€100")
        assert scraper._is_invalid_name("£25")
        assert scraper._is_invalid_name("50€")

    def test_accepts_two_character_names(self, scraper):
        """Test that legitimate 2-character dog names are accepted."""
        assert not scraper._is_invalid_name("Bo")
        assert not scraper._is_invalid_name("Jo")
        assert not scraper._is_invalid_name("BJ")
        assert not scraper._is_invalid_name("DJ")
        assert not scraper._is_invalid_name("Al")

    def test_accepts_names_with_trailing_numbers(self, scraper):
        """Test that legitimate dog names with numbers are accepted."""
        assert not scraper._is_invalid_name("Max3")
        assert not scraper._is_invalid_name("Rex2")
        assert not scraper._is_invalid_name("Luna 2023")
        assert not scraper._is_invalid_name("MAX3")
        assert not scraper._is_invalid_name("REX2")

    def test_rejects_actual_promo_codes(self, scraper):
        """Test that real promo codes are still rejected."""
        assert scraper._is_invalid_name("SAVE20")
        assert scraper._is_invalid_name("GET50OFF")
        assert scraper._is_invalid_name("FREE100")
        assert scraper._is_invalid_name("CODE123")
        assert scraper._is_invalid_name("DISCOUNT50")
        assert scraper._is_invalid_name("SALE50")
