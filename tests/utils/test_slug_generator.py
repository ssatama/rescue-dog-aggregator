"""
Tests for slug generation utility.
Following TDD principles - tests written before implementation.
"""

from unittest.mock import MagicMock

import pytest

from utils.slug_generator import ensure_unique_slug, generate_animal_slug, generate_unique_animal_slug, sanitize_for_slug, validate_slug


@pytest.mark.unit
class TestSanitizeForSlug:
    """Test slug sanitization function."""

    def test_basic_sanitization(self):
        """Test basic text sanitization."""
        assert sanitize_for_slug("Hello World") == "hello-world"
        assert sanitize_for_slug("Test Animal") == "test-animal"

    def test_special_characters_removed(self):
        """Test removal of special characters."""
        assert sanitize_for_slug("Café & Dogs!") == "caf-dogs"
        assert sanitize_for_slug("Max (2 years)") == "max-2-years"
        assert sanitize_for_slug("German Shepherd-Mix") == "german-shepherd-mix"

    def test_multiple_spaces_handled(self):
        """Test multiple spaces converted to single hyphen."""
        assert sanitize_for_slug("Multiple    Spaces   Here") == "multiple-spaces-here"
        assert sanitize_for_slug("  Leading and trailing  ") == "leading-and-trailing"

    def test_edge_cases(self):
        """Test edge cases."""
        assert sanitize_for_slug("") == ""
        assert sanitize_for_slug(None) == ""
        assert sanitize_for_slug("123") == "123"
        assert sanitize_for_slug("---") == ""
        assert sanitize_for_slug("!@#$%") == ""

    def test_non_string_input(self):
        """Test non-string input handling."""
        assert sanitize_for_slug(123) == ""
        assert sanitize_for_slug([]) == ""


class TestGenerateAnimalSlug:
    """Test animal slug generation."""

    def test_basic_slug_generation(self):
        """Test basic slug generation with name only."""
        slug = generate_animal_slug("Fluffy")
        assert slug == "fluffy"

    def test_slug_with_breed(self):
        """Test slug generation with breed."""
        slug = generate_animal_slug("Max", breed="German Shepherd")
        assert slug == "max-german-shepherd"

    def test_slug_with_standardized_breed_preferred(self):
        """Test that standardized breed is preferred over breed."""
        slug = generate_animal_slug("Bella", breed="Mixed", standardized_breed="Labrador Retriever")
        assert slug == "bella-labrador-retriever"

    def test_slug_with_id(self):
        """Test slug generation with ID for uniqueness."""
        slug = generate_animal_slug("Charlie", breed="Golden Retriever", animal_id=123)
        assert slug == "charlie-golden-retriever-123"

    def test_empty_name_fallback(self):
        """Test fallback for empty or invalid names."""
        slug = generate_animal_slug("")
        assert slug == "animal"

        slug = generate_animal_slug("!!!")
        assert slug == "animal"

    def test_long_slug_truncation(self):
        """Test slug truncation for very long inputs."""
        long_name = "A" * 100
        long_breed = "B" * 100
        slug = generate_animal_slug(long_name, breed=long_breed, animal_id=999)
        assert len(slug) <= 250
        assert not slug.endswith("-")  # Should not end with hyphen after truncation

    def test_special_characters_in_inputs(self):
        """Test handling of special characters in all inputs."""
        slug = generate_animal_slug("Max & Friends", breed="German Shepherd-Mix", animal_id=456)
        assert slug == "max-friends-german-shepherd-mix-456"


class TestEnsureUniqueSlug:
    """Test slug uniqueness checking."""

    def test_unique_slug_returned_unchanged(self):
        """Test that unique slug is returned unchanged."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = (0,)  # No existing slugs
        mock_conn.cursor.return_value = mock_cursor

        result = ensure_unique_slug("test-slug", mock_conn)
        assert result == "test-slug"

    def test_duplicate_slug_gets_suffix(self):
        """Test that duplicate slug gets numeric suffix."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        # First call returns 1 (exists), second call returns 0 (unique with -1 suffix)
        mock_cursor.fetchone.side_effect = [(1,), (0,)]
        mock_conn.cursor.return_value = mock_cursor

        result = ensure_unique_slug("test-slug", mock_conn)
        assert result == "test-slug-1"

    def test_multiple_duplicates_handled(self):
        """Test handling of multiple duplicate slugs."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        # First 3 calls return 1 (exists), 4th call returns 0 (unique with -3 suffix)
        mock_cursor.fetchone.side_effect = [(1,), (1,), (1,), (0,)]
        mock_conn.cursor.return_value = mock_cursor

        result = ensure_unique_slug("test-slug", mock_conn)
        assert result == "test-slug-3"

    def test_exclude_id_parameter(self):
        """Test exclude_id parameter for updates."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = (0,)
        mock_conn.cursor.return_value = mock_cursor

        ensure_unique_slug("test-slug", mock_conn, exclude_id=123)

        # Verify exclude_id was used in query
        calls = mock_cursor.execute.call_args_list
        assert any("id != %s" in str(call) for call in calls)

    def test_no_connection_fallback(self):
        """Test fallback when no connection provided."""
        result = ensure_unique_slug("test-slug", None)
        assert result == "test-slug"

    def test_database_error_fallback(self):
        """Test fallback on database error."""
        mock_conn = MagicMock()
        mock_conn.cursor.side_effect = Exception("Database error")

        result = ensure_unique_slug("test-slug", mock_conn)
        assert result == "test-slug"


class TestGenerateUniqueAnimalSlug:
    """Test combined slug generation and uniqueness checking."""

    def test_generates_unique_slug(self):
        """Test full slug generation with uniqueness check."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = (0,)  # Unique
        mock_conn.cursor.return_value = mock_cursor

        result = generate_unique_animal_slug("Fluffy", breed="Mixed", animal_id=123, connection=mock_conn)
        assert result == "fluffy-mixed-123"

    def test_handles_collision(self):
        """Test handling of slug collisions."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchone.side_effect = [(1,), (0,)]  # First exists, second unique
        mock_conn.cursor.return_value = mock_cursor

        result = generate_unique_animal_slug("Fluffy", breed="Mixed", animal_id=123, connection=mock_conn)
        assert result == "fluffy-mixed-123-1"

    def test_no_connection_no_uniqueness_check(self):
        """Test that no uniqueness check is performed without connection."""
        result = generate_unique_animal_slug("Fluffy", breed="Mixed", animal_id=123)
        assert result == "fluffy-mixed-123"


class TestValidateSlug:
    """Test slug validation."""

    def test_valid_slugs(self):
        """Test validation of valid slugs."""
        valid_slugs = ["fluffy", "max-german-shepherd", "bella-123", "charlie-golden-retriever-456", "a", "test-animal-1"]

        for slug in valid_slugs:
            is_valid, error = validate_slug(slug)
            assert is_valid, f"Slug '{slug}' should be valid but got error: {error}"
            assert error == ""

    def test_invalid_slugs(self):
        """Test validation of invalid slugs."""
        invalid_cases = [
            ("", "Slug cannot be empty"),
            ("-test", "Slug cannot start or end with hyphen"),
            ("test-", "Slug cannot start or end with hyphen"),
            ("test--animal", "Slug cannot contain consecutive hyphens"),
            ("Test-Animal", "Slug contains invalid characters"),
            ("test animal", "Slug contains invalid characters"),
            ("test@animal", "Slug contains invalid characters"),
            ("a" * 256, "Slug too long"),
        ]

        for slug, expected_error in invalid_cases:
            is_valid, error = validate_slug(slug)
            assert not is_valid, f"Slug '{slug}' should be invalid"
            assert expected_error in error, f"Expected error containing '{expected_error}', got '{error}'"
