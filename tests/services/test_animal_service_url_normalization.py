"""Unit tests for URL normalization in AnimalService."""

from api.services.animal_service import _normalize_url


class TestUrlNormalization:
    """Test URL normalization helper function."""

    def test_normalize_protocol_relative_url(self):
        """Protocol-relative URLs should be converted to HTTPS."""
        url = "//img1.wsimg.com/isteam/ip/test.jpg"
        result = _normalize_url(url)
        assert result == "https://img1.wsimg.com/isteam/ip/test.jpg"

    def test_normalize_https_url_unchanged(self):
        """HTTPS URLs should be returned unchanged."""
        url = "https://example.com/image.jpg"
        result = _normalize_url(url)
        assert result == "https://example.com/image.jpg"

    def test_normalize_http_url_unchanged(self):
        """HTTP URLs should be returned unchanged."""
        url = "http://example.com/image.jpg"
        result = _normalize_url(url)
        assert result == "http://example.com/image.jpg"

    def test_normalize_none_returns_none(self):
        """None input should return None."""
        result = _normalize_url(None)
        assert result is None

    def test_normalize_empty_string_returns_empty(self):
        """Empty string should return empty string."""
        result = _normalize_url("")
        assert result == ""

    def test_normalize_single_slash_unchanged(self):
        """Single slash path should be unchanged (relative path)."""
        url = "/images/dog.jpg"
        result = _normalize_url(url)
        assert result == "/images/dog.jpg"

    def test_normalize_non_string_returns_unchanged(self):
        """Non-string inputs should be returned unchanged."""
        assert _normalize_url(123) == 123
        assert _normalize_url({"url": "test"}) == {"url": "test"}
        assert _normalize_url(["//test"]) == ["//test"]
