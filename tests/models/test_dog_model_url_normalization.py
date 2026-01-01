"""Unit tests for URL normalization in Animal Pydantic model."""

import pytest

from api.models.dog import Animal, AnimalBase


class TestAnimalModelUrlNormalization:
    """Test URL normalization field validator in Animal model."""

    def test_protocol_relative_primary_image_url_normalized(self):
        """Protocol-relative primary_image_url should be normalized to HTTPS."""
        animal = AnimalBase(
            name="Test Dog",
            adoption_url="https://example.com/adopt",
            primary_image_url="//img1.wsimg.com/isteam/ip/test.jpg",
        )
        assert str(animal.primary_image_url) == "https://img1.wsimg.com/isteam/ip/test.jpg"

    def test_protocol_relative_adoption_url_normalized(self):
        """Protocol-relative adoption_url should be normalized to HTTPS."""
        animal = AnimalBase(
            name="Test Dog",
            adoption_url="//example.com/adopt",
        )
        assert str(animal.adoption_url) == "https://example.com/adopt"

    def test_https_url_unchanged(self):
        """HTTPS URLs should remain unchanged."""
        animal = AnimalBase(
            name="Test Dog",
            adoption_url="https://example.com/adopt",
            primary_image_url="https://images.rescuedogs.me/test.jpg",
        )
        assert str(animal.adoption_url) == "https://example.com/adopt"
        assert str(animal.primary_image_url) == "https://images.rescuedogs.me/test.jpg"

    def test_http_url_unchanged(self):
        """HTTP URLs should remain unchanged (Pydantic accepts them)."""
        animal = AnimalBase(
            name="Test Dog",
            adoption_url="http://example.com/adopt",
        )
        assert str(animal.adoption_url) == "http://example.com/adopt"

    def test_none_primary_image_url_allowed(self):
        """None primary_image_url should be allowed."""
        animal = AnimalBase(
            name="Test Dog",
            adoption_url="https://example.com/adopt",
            primary_image_url=None,
        )
        assert animal.primary_image_url is None

    def test_wsimg_protocol_relative_url_normalized(self):
        """Real REAN wsimg.com protocol-relative URLs should be normalized."""
        url = "//img1.wsimg.com/isteam/ip/a820747c-53ff-4d63-a4ae-ca1899d8137c/489929993_1105238274977829_1453731426906221429.jpg"
        animal = AnimalBase(
            name="Paloma",
            adoption_url="https://rean.org.uk",
            primary_image_url=url,
        )
        expected = "https://img1.wsimg.com/isteam/ip/a820747c-53ff-4d63-a4ae-ca1899d8137c/489929993_1105238274977829_1453731426906221429.jpg"
        assert str(animal.primary_image_url) == expected

    def test_empty_string_adoption_url_rejected(self):
        """Empty string adoption_url should be rejected by Pydantic."""
        with pytest.raises(ValueError):
            AnimalBase(
                name="Test Dog",
                adoption_url="",
            )

    def test_single_slash_path_rejected(self):
        """Single-slash paths are not valid URLs and should be rejected."""
        with pytest.raises(ValueError):
            AnimalBase(
                name="Test Dog",
                adoption_url="/images/dog.jpg",
            )

    def test_whitespace_prefixed_url_rejected(self):
        """URLs with leading whitespace should be rejected."""
        with pytest.raises(ValueError):
            AnimalBase(
                name="Test Dog",
                adoption_url="  //example.com/adopt",
            )

    def test_single_slash_not_normalized_to_invalid_url(self):
        """Ensure single-slash paths don't become malformed https:/path URLs."""
        with pytest.raises(ValueError):
            AnimalBase(
                name="Test Dog",
                adoption_url="https://example.com",
                primary_image_url="/images/dog.jpg",
            )
