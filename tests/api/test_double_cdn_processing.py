"""Test for double CDN processing prevention.

These tests verify that our API returns raw R2 URLs without any
CDN transformations, preventing double CDN processing when the
frontend applies Cloudflare Images transformations.
"""

import pytest
from fastapi.testclient import TestClient

from api.main import app


class TestDoubleCDNProcessing:
    """Test preventing double CDN transformations."""

    # Use the client fixture from conftest.py instead of creating our own

    @pytest.mark.unit
    def test_api_returns_raw_r2_urls_without_cloudinary_processing(self, client):
        """API should return raw R2 URLs without any Cloudinary processing."""
        response = client.get("/api/animals?limit=5")
        assert response.status_code == 200

        animals = response.json()

        for animal in animals:
            if animal.get("primary_image_url"):
                url = animal["primary_image_url"]

                # URL should NOT contain Cloudinary processing
                assert "cloudinary.com" not in url, f"Found Cloudinary URL: {url}"
                assert "/image/upload/" not in url, f"Found Cloudinary upload path: {url}"

                # URL should NOT contain any CDN transformations
                assert "/cdn-cgi/image/" not in url, f"Found CDN transformation in API response: {url}"

                # For test environment, we expect test URLs or R2 URLs
                # Test data uses example.com URLs, production uses R2 URLs
                if "example.com" not in url:
                    # If not test data, should be a raw R2 URL
                    expected_pattern = "https://images.rescuedogs.me/rescue_dogs/"
                    assert url.startswith(expected_pattern), f"URL should start with {expected_pattern}, got: {url}"

    @pytest.mark.unit
    def test_animal_detail_returns_raw_r2_urls(self, client):
        """Animal detail endpoint should return raw R2 URLs."""
        # Get first animal
        response = client.get("/api/animals?limit=1")
        assert response.status_code == 200

        animals = response.json()
        if not animals:
            pytest.skip("No animals available for testing")

        animal_id = animals[0]["id"]

        # Get animal detail
        detail_response = client.get(f"/api/animals/{animal_id}")
        assert detail_response.status_code == 200

        animal = detail_response.json()

        # Check primary image
        if animal.get("primary_image_url"):
            url = animal["primary_image_url"]
            # URL should NOT contain Cloudinary processing
            assert "cloudinary.com" not in url
            assert "/cdn-cgi/image/" not in url

            # For test environment, we expect test URLs or R2 URLs
            if "example.com" not in url:
                # If not test data, should be R2 URL
                assert "images.rescuedogs.me" in url

        # Check additional images
        for img in animal.get("images", []):
            if img.get("cloudinary_url"):
                url = img["cloudinary_url"]
                # URL should NOT contain Cloudinary processing
                assert "cloudinary.com" not in url
                assert "/cdn-cgi/image/" not in url

                # For test environment, we expect test URLs or R2 URLs
                if "example.com" not in url:
                    # If not test data, should be R2 URL
                    assert "images.rescuedogs.me" in url

    @pytest.mark.unit
    def test_organizations_return_raw_r2_urls(self, client):
        """Organization endpoints should return raw R2 URLs."""
        response = client.get("/api/organizations")
        assert response.status_code == 200

        organizations = response.json()

        for org in organizations:
            # Check logo URL
            if org.get("logo_url"):
                url = org["logo_url"]
                if "images.rescuedogs.me" in url:  # Only check R2 URLs
                    assert "cloudinary.com" not in url
                    assert "/cdn-cgi/image/" not in url

            # Check featured animals
            for animal in org.get("featured_animals", []):
                if animal.get("thumbnail_url"):
                    url = animal["thumbnail_url"]
                    if "images.rescuedogs.me" in url:  # Only check R2 URLs
                        assert "cloudinary.com" not in url
                        assert "/cdn-cgi/image/" not in url

    @pytest.mark.unit
    def test_no_double_cdn_transformation_patterns(self, client):
        """Test that no URLs contain double CDN transformation patterns."""
        response = client.get("/api/animals?limit=10")
        assert response.status_code == 200

        animals = response.json()

        for animal in animals:
            # Check for double cdn-cgi patterns
            if animal.get("primary_image_url"):
                url = animal["primary_image_url"]

                # Count occurrences of cdn-cgi transformation pattern
                cdn_count = url.count("/cdn-cgi/image/")
                assert cdn_count == 0, f"Found CDN transformations in API response (should be raw): {url}"

                # Verify no malformed double transformation URLs
                assert "/cdn-cgi/image/w=" not in url, f"Found transformation parameters in API response: {url}"
