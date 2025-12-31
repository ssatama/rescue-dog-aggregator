"""Tests for AnimalValidator - ported from test_base_scraper.py."""

import pytest

from scrapers.validation.animal_validator import AnimalValidator


@pytest.mark.unit
@pytest.mark.fast
class TestAnimalValidatorNameValidation:
    """Test name validation logic."""

    @pytest.fixture
    def validator(self):
        return AnimalValidator()

    def test_rejects_pure_numeric_names(self, validator):
        assert not validator.is_valid_name("251")
        assert not validator.is_valid_name("123")
        assert not validator.is_valid_name("  456  ")

    def test_accepts_names_with_numbers(self, validator):
        assert validator.is_valid_name("Max 2")
        assert validator.is_valid_name("K9 Rex")
        assert validator.is_valid_name("Lucky13")

    def test_rejects_names_with_too_many_digits(self, validator):
        assert not validator.is_valid_name("123dog456")
        assert not validator.is_valid_name("1234ab")
        assert validator.is_valid_name("251abc")
        assert validator.is_valid_name("Max 2")

    def test_rejects_too_short_names(self, validator):
        assert not validator.is_valid_name("A")
        assert not validator.is_valid_name(" ")
        assert not validator.is_valid_name("")

    def test_accepts_two_character_names(self, validator):
        assert validator.is_valid_name("Bo")
        assert validator.is_valid_name("Jo")
        assert validator.is_valid_name("BJ")
        assert validator.is_valid_name("DJ")
        assert validator.is_valid_name("Al")

    def test_accepts_names_with_trailing_numbers(self, validator):
        assert validator.is_valid_name("Max3")
        assert validator.is_valid_name("Rex2")
        assert validator.is_valid_name("Luna 2023")
        assert validator.is_valid_name("MAX3")
        assert validator.is_valid_name("REX2")

    def test_rejects_connection_error_patterns(self, validator):
        assert not validator.is_valid_name("This site can't be reached")
        assert not validator.is_valid_name("Connection failed")
        assert not validator.is_valid_name("DNS_PROBE_FINISHED_NXDOMAIN")
        assert not validator.is_valid_name("ERR_NAME_NOT_RESOLVED")
        assert not validator.is_valid_name("ERR_CONNECTION_REFUSED")

    def test_rejects_http_error_patterns(self, validator):
        assert not validator.is_valid_name("Page not found")
        assert not validator.is_valid_name("Error 404")
        assert not validator.is_valid_name("Error 500")
        assert not validator.is_valid_name("Access denied")

    def test_rejects_gift_card_patterns(self, validator):
        assert not validator.is_valid_name("Gift Card")
        assert not validator.is_valid_name("$50 Voucher")
        assert not validator.is_valid_name("Coupon Code")
        assert not validator.is_valid_name("Promo code discount")

    def test_rejects_url_patterns(self, validator):
        assert not validator.is_valid_name("https://example.com/dog")
        assert not validator.is_valid_name("http://rescue.org")
        assert not validator.is_valid_name("www.dogs.com")

    def test_rejects_price_patterns(self, validator):
        assert not validator.is_valid_name("$50")
        assert not validator.is_valid_name("€100")
        assert not validator.is_valid_name("£25")
        assert not validator.is_valid_name("50€")

    def test_rejects_actual_promo_codes(self, validator):
        assert not validator.is_valid_name("SAVE20")
        assert not validator.is_valid_name("GET50OFF")
        assert not validator.is_valid_name("FREE100")
        assert not validator.is_valid_name("CODE123")
        assert not validator.is_valid_name("DISCOUNT50")
        assert not validator.is_valid_name("SALE50")


@pytest.mark.unit
@pytest.mark.fast
class TestAnimalValidatorNameNormalization:
    """Test name normalization logic."""

    @pytest.fixture
    def validator(self):
        return AnimalValidator()

    def test_normalizes_utf8_double_encoding(self, validator):
        assert validator.normalize_name("BrontÃ«") == "Brontë"
        assert validator.normalize_name("RenÃ©e") == "Renée"

    def test_normalizes_html_entities(self, validator):
        assert validator.normalize_name("Max &amp; Ruby") == "Max & Ruby"
        assert validator.normalize_name("&quot;Buddy&quot;") == '"Buddy"'

    def test_normalizes_unicode_combining_characters(self, validator):
        assert validator.normalize_name("Rene\u0301e") == "Renée"

    def test_normalization_handles_invalid_input(self, validator):
        assert validator.normalize_name(None) is None
        assert validator.normalize_name("") == ""
        assert validator.normalize_name(123) == 123


@pytest.mark.unit
@pytest.mark.fast
class TestAnimalValidatorDataValidation:
    """Test full animal data validation."""

    @pytest.fixture
    def validator(self):
        return AnimalValidator()

    def test_validation_normalizes_and_updates_name(self, validator):
        animal_data = {
            "name": "BrontÃ«",
            "external_id": "test-1",
            "adoption_url": "https://example.com/adopt",
            "primary_image_url": "https://example.com/dog.jpg",
        }

        is_valid, result = validator.validate_animal_data(animal_data)
        assert is_valid
        assert result["name"] == "Brontë"

    def test_validation_rejects_numeric_names(self, validator):
        animal_data = {
            "name": "251",
            "external_id": "test-1",
            "adoption_url": "https://example.com/adopt",
            "primary_image_url": "https://example.com/dog.jpg",
        }

        is_valid, _ = validator.validate_animal_data(animal_data)
        assert not is_valid

    def test_validation_normalizes_html_entities_in_names(self, validator):
        animal_data = {
            "name": "Echo &amp; Pixel",
            "external_id": "test-1",
            "adoption_url": "https://example.com/adopt",
            "primary_image_url": "https://example.com/dog.jpg",
        }

        is_valid, result = validator.validate_animal_data(animal_data)
        assert is_valid
        assert result["name"] == "Echo & Pixel"

    def test_validation_rejects_empty_image_url(self, validator):
        animal_data = {
            "name": "Test Dog",
            "external_id": "test-1",
            "adoption_url": "https://example.com/adopt",
            "primary_image_url": "",
        }

        is_valid, _ = validator.validate_animal_data(animal_data)
        assert not is_valid

    def test_validation_rejects_none_image_url(self, validator):
        animal_data = {
            "name": "Test Dog",
            "external_id": "test-1",
            "adoption_url": "https://example.com/adopt",
            "primary_image_url": None,
        }

        is_valid, _ = validator.validate_animal_data(animal_data)
        assert not is_valid

    def test_validation_accepts_valid_data(self, validator):
        animal_data = {
            "name": "Test Dog",
            "external_id": "test-1",
            "adoption_url": "https://example.com/adopt",
            "primary_image_url": "https://example.com/dog.jpg",
        }

        is_valid, _ = validator.validate_animal_data(animal_data)
        assert is_valid

    def test_validation_rejects_missing_required_fields(self, validator):
        assert not validator.validate_animal_data({})[0]
        assert not validator.validate_animal_data({"name": "Dog"})[0]
        assert not validator.validate_animal_data({"name": "Dog", "external_id": "1"})[0]

    def test_validation_does_not_mutate_original(self, validator):
        animal_data = {
            "name": "BrontÃ«",
            "external_id": "test-1",
            "adoption_url": "https://example.com/adopt",
            "primary_image_url": "https://example.com/dog.jpg",
        }

        _, result = validator.validate_animal_data(animal_data)
        assert animal_data["name"] == "BrontÃ«"
        assert result["name"] == "Brontë"


@pytest.mark.unit
@pytest.mark.fast
class TestAnimalValidatorExternalId:
    """Test external ID validation."""

    @pytest.fixture
    def validator(self):
        return AnimalValidator()

    def test_accepts_known_prefixes(self, validator):
        assert validator.validate_external_id("arb-123")
        assert validator.validate_external_id("gds-456")
        assert validator.validate_external_id("dt-789")

    def test_accepts_numeric_ids(self, validator):
        assert validator.validate_external_id("12345")
        assert validator.validate_external_id("1")

    def test_accepts_tierschutzverein_pattern(self, validator):
        assert validator.validate_external_id(
            "yara-in-rumaenien-tierheim",
            org_config_id="tierschutzverein-europa"
        )

    def test_warns_on_unknown_pattern(self, validator):
        result = validator.validate_external_id("unknown-pattern-123")
        assert result
