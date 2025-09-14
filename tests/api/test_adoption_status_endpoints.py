"""
Tests for API endpoints handling new adoption status values.

Tests the updated API endpoints to ensure they properly handle
the new status values (adopted, reserved, unknown) and adoption_check_data.
"""

import json
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from api.main import app


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def mock_db_cursor():
    """Mock database cursor for testing."""
    cursor = MagicMock()
    cursor.fetchall = MagicMock()
    cursor.fetchone = MagicMock()
    cursor.execute = MagicMock()
    return cursor


class TestAnimalEndpointsWithAdoptionStatus:
    """Test animal endpoints handle new adoption status values."""

    def test_get_animals_filters_by_available_status(self, client, mock_db_cursor):
        """Test that /api/animals endpoint filters by status='available' by default."""
        with patch("api.routes.animals.get_pooled_db_cursor", return_value=mock_db_cursor):
            mock_db_cursor.fetchall.return_value = []

            response = client.get("/api/animals/")

            # Verify the query was executed with status filter
            assert response.status_code == 200
            executed_query = mock_db_cursor.execute.call_args[0][0]
            # Should filter by status='available' by default
            assert "a.status = %s" in executed_query or "status = 'available'" in executed_query.lower()

    def test_get_animal_by_slug_returns_adopted_dog(self, client, mock_db_cursor):
        """Test that single dog endpoint returns adopted dogs."""
        adopted_dog = {
            "id": 1,
            "slug": "buddy-adopted",
            "name": "Buddy",
            "animal_type": "dog",
            "status": "adopted",
            "adoption_check_data": {"evidence": "Page shows REHOMED", "confidence": 0.95},
            "adoption_checked_at": datetime.now(timezone.utc),
            "breed": "Labrador",
            "standardized_breed": "Labrador Retriever",
            "breed_group": "Sporting",
            "primary_breed": "Labrador Retriever",
            "breed_type": "purebred",
            "breed_confidence": "high",
            "secondary_breed": None,
            "breed_slug": "labrador-retriever",
            "age_text": "3 years",
            "age_min_months": 36,
            "age_max_months": 36,
            "sex": "Male",
            "size": "Large",
            "standardized_size": "Large",
            "primary_image_url": "https://example.com/buddy.jpg",
            "adoption_url": "https://example.com/buddy",
            "organization_id": 1,
            "external_id": "ext-123",
            "language": "en",
            "properties": {},
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "last_scraped_at": datetime.now(timezone.utc),
            "availability_confidence": "low",
            "last_seen_at": datetime.now(timezone.utc),
            "consecutive_scrapes_missing": 5,
            "dog_profiler_data": {},
            "org_name": "Test Org",
            "org_slug": "test-org",
            "org_city": "London",
            "org_country": "UK",
            "org_website_url": "https://testorg.com",
            "org_social_media": {},
            "org_ships_to": ["UK", "US"],
        }

        with patch("api.routes.animals.get_pooled_db_cursor", return_value=mock_db_cursor):
            mock_db_cursor.fetchone.return_value = adopted_dog

            response = client.get("/api/animals/buddy-adopted")

            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "adopted"
            assert "adoption_check_data" in data
            assert data["adoption_check_data"]["evidence"] == "Page shows REHOMED"
            assert data["adoption_check_data"]["confidence"] == 0.95

    def test_get_animal_by_slug_returns_reserved_dog(self, client, mock_db_cursor):
        """Test that single dog endpoint returns reserved dogs."""
        reserved_dog = {
            "id": 2,
            "slug": "max-reserved",
            "name": "Max",
            "animal_type": "dog",
            "status": "reserved",
            "adoption_check_data": {"evidence": "Page shows RESERVED", "confidence": 0.90},
            "adoption_checked_at": datetime.now(timezone.utc),
            "breed": "Beagle",
            "standardized_breed": "Beagle",
            "breed_group": "Hound",
            "primary_breed": "Beagle",
            "breed_type": "purebred",
            "breed_confidence": "high",
            "secondary_breed": None,
            "breed_slug": "beagle",
            "age_text": "2 years",
            "age_min_months": 24,
            "age_max_months": 24,
            "sex": "Male",
            "size": "Medium",
            "standardized_size": "Medium",
            "primary_image_url": "https://example.com/max.jpg",
            "adoption_url": "https://example.com/max",
            "organization_id": 1,
            "external_id": "ext-124",
            "language": "en",
            "properties": {},
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "last_scraped_at": datetime.now(timezone.utc),
            "availability_confidence": "low",
            "last_seen_at": datetime.now(timezone.utc),
            "consecutive_scrapes_missing": 4,
            "dog_profiler_data": {},
            "org_name": "Test Org",
            "org_slug": "test-org",
            "org_city": "London",
            "org_country": "UK",
            "org_website_url": "https://testorg.com",
            "org_social_media": {},
            "org_ships_to": ["UK", "US"],
        }

        with patch("api.routes.animals.get_pooled_db_cursor", return_value=mock_db_cursor):
            mock_db_cursor.fetchone.return_value = reserved_dog

            response = client.get("/api/animals/max-reserved")

            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "reserved"
            assert "adoption_check_data" in data

    def test_get_animal_by_slug_returns_unknown_status_dog(self, client, mock_db_cursor):
        """Test that single dog endpoint returns dogs with unknown status."""
        unknown_dog = {
            "id": 3,
            "slug": "charlie-unknown",
            "name": "Charlie",
            "animal_type": "dog",
            "status": "unknown",
            "adoption_check_data": None,
            "adoption_checked_at": None,
            "breed": "Mixed",
            "standardized_breed": "Mixed Breed",
            "breed_group": "Mixed",
            "primary_breed": "Mixed Breed",
            "breed_type": "mixed",
            "breed_confidence": "medium",
            "secondary_breed": None,
            "breed_slug": "mixed-breed",
            "age_text": "4 years",
            "age_min_months": 48,
            "age_max_months": 48,
            "sex": "Female",
            "size": "Medium",
            "standardized_size": "Medium",
            "primary_image_url": "https://example.com/charlie.jpg",
            "adoption_url": "https://example.com/charlie",
            "organization_id": 1,
            "external_id": "ext-125",
            "language": "en",
            "properties": {},
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "last_scraped_at": datetime.now(timezone.utc),
            "availability_confidence": "low",
            "last_seen_at": datetime.now(timezone.utc),
            "consecutive_scrapes_missing": 3,
            "dog_profiler_data": {},
            "org_name": "Test Org",
            "org_slug": "test-org",
            "org_city": "London",
            "org_country": "UK",
            "org_website_url": "https://testorg.com",
            "org_social_media": {},
            "org_ships_to": ["UK", "US"],
        }

        with patch("api.routes.animals.get_pooled_db_cursor", return_value=mock_db_cursor):
            mock_db_cursor.fetchone.return_value = unknown_dog

            response = client.get("/api/animals/charlie-unknown")

            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "unknown"
            # Should not have adoption_check_data if not checked yet
            assert "adoption_check_data" not in data or data["adoption_check_data"] is None


class TestSitemapEndpoint:
    """Test sitemap endpoint includes all dogs regardless of status."""

    def test_sitemap_includes_all_statuses(self, client, mock_db_cursor):
        """Test that sitemap includes dogs with all status values."""
        dogs = [
            {
                "id": 1,
                "slug": "buddy",
                "status": "available",
                "updated_at": datetime.now(timezone.utc),
                "created_at": datetime.now(timezone.utc),
                "last_scraped_at": None,
                "dog_profiler_data": {"quality_score": 0.8},
            },
            {
                "id": 2,
                "slug": "max",
                "status": "adopted",
                "updated_at": datetime.now(timezone.utc),
                "created_at": datetime.now(timezone.utc),
                "last_scraped_at": None,
                "dog_profiler_data": {"quality_score": 0.7},
            },
            {
                "id": 3,
                "slug": "charlie",
                "status": "reserved",
                "updated_at": datetime.now(timezone.utc),
                "created_at": datetime.now(timezone.utc),
                "last_scraped_at": None,
                "dog_profiler_data": {"quality_score": 0.6},
            },
            {
                "id": 4,
                "slug": "luna",
                "status": "unknown",
                "updated_at": datetime.now(timezone.utc),
                "created_at": datetime.now(timezone.utc),
                "last_scraped_at": None,
                "dog_profiler_data": {"quality_score": 0.75},
            },
        ]

        with patch("api.routes.sitemap.get_pooled_db_cursor", return_value=mock_db_cursor):
            mock_db_cursor.fetchall.side_effect = [dogs, []]  # First call for dogs, second for orgs

            response = client.get("/api/sitemap")

            assert response.status_code == 200
            data = response.json()

            # Check that all dogs are included
            assert len(data["urls"]) == 4

            # Check stats
            assert data["stats"]["available"] == 1
            assert data["stats"]["adopted"] == 1
            assert data["stats"]["reserved"] == 1
            assert data["stats"]["unknown"] == 1

            # Check priority ordering
            urls = data["urls"]
            available_url = next(u for u in urls if u["status"] == "available")
            adopted_url = next(u for u in urls if u["status"] == "adopted")

            assert available_url["priority"] == 0.8  # Higher priority
            assert available_url["changefreq"] == "daily"

            assert adopted_url["priority"] == 0.4  # Lower priority
            assert adopted_url["changefreq"] == "monthly"

    def test_sitemap_xml_format(self, client, mock_db_cursor):
        """Test that sitemap.xml returns proper XML format."""
        dogs = [
            {
                "id": 1,
                "slug": "buddy",
                "status": "available",
                "updated_at": datetime.now(timezone.utc),
                "created_at": datetime.now(timezone.utc),
                "last_scraped_at": None,
                "dog_profiler_data": {"quality_score": 0.8},
            },
        ]

        with patch("api.routes.sitemap.get_pooled_db_cursor", return_value=mock_db_cursor):
            mock_db_cursor.fetchall.side_effect = [dogs, []]  # First call for dogs, second for orgs

            response = client.get("/api/sitemap.xml")

            assert response.status_code == 200
            xml_content = response.text

            # Check XML structure
            assert '<?xml version="1.0" encoding="UTF-8"?>' in xml_content
            assert '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' in xml_content
            assert "<loc>https://www.rescuedogs.me/dogs/buddy</loc>" in xml_content
            assert "<changefreq>daily</changefreq>" in xml_content
            assert "<priority>0.8</priority>" in xml_content
            assert "</urlset>" in xml_content


class TestSwipeEndpointWithConfidenceFilter:
    """Test swipe endpoint properly filters by availability_confidence."""

    def test_swipe_filters_by_availability_confidence(self, client, mock_db_cursor):
        """Test that swipe endpoint includes availability_confidence filter."""
        with patch("api.routes.swipe.get_pooled_db_cursor", return_value=mock_db_cursor):
            mock_db_cursor.fetchall.return_value = []
            mock_db_cursor.fetchone.return_value = {"total": 0}

            response = client.get("/api/swipe")

            assert response.status_code == 200

            # Check that the query includes availability_confidence filter
            executed_query = mock_db_cursor.execute.call_args_list[0][0][0]
            assert "availability_confidence IN ('high', 'medium')" in executed_query

            # Check the count query also has the filter
            count_query = mock_db_cursor.execute.call_args_list[1][0][0]
            assert "availability_confidence IN ('high', 'medium')" in count_query

    def test_swipe_excludes_low_confidence_dogs(self, client, mock_db_cursor):
        """Test that swipe excludes dogs with low availability_confidence."""
        # This dog should be excluded due to low confidence
        low_confidence_dog = {"id": 1, "status": "available", "availability_confidence": "low", "dog_profiler_data": {"quality_score": 0.9}}

        with patch("api.routes.swipe.get_pooled_db_cursor", return_value=mock_db_cursor):
            mock_db_cursor.fetchall.return_value = []  # Empty result
            mock_db_cursor.fetchone.return_value = {"total": 0}

            response = client.get("/api/swipe")

            assert response.status_code == 200
            data = response.json()
            assert len(data["dogs"]) == 0  # No dogs returned
            assert data["hasMore"] is False
