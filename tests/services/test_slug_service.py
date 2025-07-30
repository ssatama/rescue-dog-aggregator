import pytest

from api.services.slug_service import generate_animal_slug, generate_organization_slug, sanitize_for_url


@pytest.mark.integration
@pytest.mark.slow
class TestSanitizeForUrl:
    """Test URL sanitization function."""

    def test_basic_sanitization(self):
        """Test basic text sanitization."""
        result = sanitize_for_url("Austin Pets Alive!")
        assert result == "austin-pets-alive"

    def test_multiple_spaces(self):
        """Test multiple spaces become single hyphen."""
        result = sanitize_for_url("Happy   Tails    Rescue")
        assert result == "happy-tails-rescue"

    def test_special_characters(self):
        """Test special characters are removed."""
        result = sanitize_for_url("Daisy Family Rescue e.V.")
        assert result == "daisy-family-rescue-ev"

    def test_unicode_characters(self):
        """Test unicode characters are normalized."""
        result = sanitize_for_url("Tierschutzverein Europa é")
        assert result == "tierschutzverein-europa-e"

    def test_leading_trailing_hyphens(self):
        """Test leading/trailing hyphens are removed."""
        result = sanitize_for_url("!@#Hello World$%^")
        assert result == "hello-world"

    def test_empty_string(self):
        """Test empty string returns empty."""
        result = sanitize_for_url("")
        assert result == ""

    def test_only_special_chars(self):
        """Test string with only special chars."""
        result = sanitize_for_url("!@#$%^&*()")
        assert result == ""


class TestGenerateOrganizationSlug:
    """Test organization slug generation."""

    def test_basic_organization_slug(self):
        """Test basic organization slug generation."""
        result = generate_organization_slug("Austin Pets Alive!", 12)
        assert result == "austin-pets-alive-12"

    def test_organization_with_special_chars(self):
        """Test organization with special characters."""
        result = generate_organization_slug("Daisy Family Rescue e.V.", 15)
        assert result == "daisy-family-rescue-ev-15"

    def test_organization_with_numbers(self):
        """Test organization with numbers in name."""
        result = generate_organization_slug("REAN (Rescuing European Animals in Need)", 5)
        assert result == "rean-rescuing-european-animals-in-need-5"


class TestGenerateAnimalSlug:
    """Test animal slug generation."""

    def test_animal_with_standardized_breed(self):
        """Test animal slug with standardized breed."""
        result = generate_animal_slug("Buddy", "Golden Retriever", "golden retriever", 1699)
        assert result == "buddy-golden-retriever-1699"

    def test_animal_with_breed_fallback(self):
        """Test animal slug falls back to breed when no standardized_breed."""
        result = generate_animal_slug("Max", None, "German Shepherd Mix", 2341)
        assert result == "max-german-shepherd-mix-2341"

    def test_animal_with_no_breed(self):
        """Test animal slug with no breed information."""
        result = generate_animal_slug("Luna", None, None, 1523)
        assert result == "luna-1523"

    def test_animal_with_special_chars_in_name(self):
        """Test animal with special characters in name."""
        result = generate_animal_slug("Mr. Whiskers!", "Domestic Shorthair", None, 999)
        assert result == "mr-whiskers-domestic-shorthair-999"

    def test_animal_with_complex_breed(self):
        """Test animal with complex breed name."""
        result = generate_animal_slug("Abel", "Podenco", None, 670)
        assert result == "abel-podenco-670"

    def test_animal_with_mixed_breed(self):
        """Test animal with mixed breed."""
        result = generate_animal_slug("Africa", "Podenco Mix", None, 672)
        assert result == "africa-podenco-mix-672"

    def test_empty_standardized_breed_uses_breed(self):
        """Test empty standardized_breed uses breed instead."""
        result = generate_animal_slug("Akira", "", "Mixed Breed", 675)
        assert result == "akira-mixed-breed-675"
