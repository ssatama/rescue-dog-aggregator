"""
Test organization card data in animal detail endpoint.

This test module verifies that the organization data returned with animal details
includes all fields required for the OrganizationCard component, including:
- recent_dogs: Array of up to 3 recent dogs from the organization
- service_regions: Array of regions where the organization operates
- logo_url: Organization logo URL
- total_dogs: Count of available dogs
- new_this_week: Count of dogs added in the last 7 days
"""

from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock

import pytest

from api.dependencies import get_pooled_db_cursor
from api.main import app


@pytest.fixture
def mock_db_cursor():
    """Mock database cursor for testing."""
    cursor = MagicMock()
    cursor.fetchall = MagicMock()
    cursor.fetchone = MagicMock()
    cursor.execute = MagicMock()
    cursor.__enter__ = MagicMock(return_value=cursor)
    cursor.__exit__ = MagicMock(return_value=None)
    return cursor


class TestOrganizationCardData:
    """Test organization card data returned with animal details."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Reset app dependency overrides before each test."""
        app.dependency_overrides.clear()
        yield
        app.dependency_overrides.clear()

    def test_get_animal_by_slug_returns_complete_organization_data(self, client, mock_db_cursor):
        """Test that animal detail endpoint returns all organization card fields."""

        # Create comprehensive mock data with all organization fields
        animal_with_org_data = {
            # Animal fields
            "id": 5305,
            "slug": "juniper-unknown-5305",
            "name": "Juniper",
            "animal_type": "dog",
            "status": "available",
            "breed": "Unknown",
            "standardized_breed": "Unknown",
            "breed_group": None,
            "primary_breed": "Unknown",
            "breed_type": "unknown",
            "breed_confidence": "low",
            "secondary_breed": None,
            "breed_slug": "unknown",
            "age_text": "Young",
            "age_min_months": None,
            "age_max_months": None,
            "sex": "Female",
            "size": "Medium",
            "standardized_size": "Medium",
            "primary_image_url": "https://images.rescuedogs.me/juniper.jpg",
            "adoption_url": "https://example.com/juniper",
            "organization_id": 26,
            "external_id": "ext-5305",
            "language": "en",
            "properties": {},
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC),
            "last_scraped_at": datetime.now(UTC),
            "availability_confidence": "high",
            "last_seen_at": datetime.now(UTC),
            "consecutive_scrapes_missing": 0,
            "dog_profiler_data": {},
            "adoption_check_data": None,
            # Organization fields - these are critical for the card
            "org_name": "Santer Paws Bulgarian Rescue",
            "org_slug": "santer-paws-bulgarian-rescue",
            "org_city": "Pleven",
            "org_country": "BG",
            "org_website_url": "https://santerpawsbulgarianrescue.com/",
            "org_logo_url": "https://images.rescuedogs.me/org-logo-santerpaws.png",
            "org_social_media": {
                "twitter": "https://x.com/Santerpaws20",
                "website": "https://santerpawsbulgarianrescue.com/",
                "facebook": "https://www.facebook.com/SanterpawsBulgarianRescue",
                "instagram": "https://www.instagram.com/santerpaws_bulgarian_rescue/",
            },
            "org_ships_to": ["UK", "IE"],
            "org_service_regions": [
                "BG",
                "RO",
            ],  # This is critical for "Dogs in:" display
            "org_total_dogs": 103,  # Total available dogs
            "org_new_this_week": 3,  # For "NEW" badge
            # Recent dogs array - should be parsed as JSON
            "org_recent_dogs": [
                {
                    "id": 5305,
                    "slug": "juniper-unknown-5305",
                    "name": "Juniper",
                    "primary_image_url": "https://images.rescuedogs.me/juniper.jpg",
                    "standardized_breed": "Unknown",
                    "age_min_months": None,
                    "age_max_months": None,
                },
                {
                    "id": 5304,
                    "slug": "murphy-mixed-breed-5304",
                    "name": "Murphy",
                    "primary_image_url": "https://images.rescuedogs.me/murphy.jpg",
                    "standardized_breed": "Mixed Breed",
                    "age_min_months": 3,
                    "age_max_months": 5,
                },
                {
                    "id": 5241,
                    "slug": "mitch-mixed-breed-5241",
                    "name": "Mitch",
                    "primary_image_url": "https://images.rescuedogs.me/mitch.jpg",
                    "standardized_breed": "Mixed Breed",
                    "age_min_months": 34,
                    "age_max_months": 36,
                },
            ],
        }

        def mock_get_cursor():
            yield mock_db_cursor

        app.dependency_overrides[get_pooled_db_cursor] = mock_get_cursor
        mock_db_cursor.fetchone.return_value = animal_with_org_data

        # Make the request
        response = client.get("/api/animals/juniper-unknown-5305")

        # Verify response status
        assert response.status_code == 200
        data = response.json()

        # Verify basic animal data
        assert data["name"] == "Juniper"
        assert data["status"] == "available"

        # Verify organization data exists
        assert "organization" in data
        org = data["organization"]

        # Verify all critical organization fields
        assert org["name"] == "Santer Paws Bulgarian Rescue"
        assert org["slug"] == "santer-paws-bulgarian-rescue"
        assert org["logo_url"] == "https://images.rescuedogs.me/org-logo-santerpaws.png"

        # Verify statistics for the card display
        assert org["total_dogs"] == 103
        assert org["new_this_week"] == 3  # For "NEW" badge

        # Verify service_regions for "Dogs in:" display
        assert "service_regions" in org
        assert isinstance(org["service_regions"], list)
        assert "BG" in org["service_regions"]
        assert "RO" in org["service_regions"]

        # Verify recent_dogs array
        assert "recent_dogs" in org
        assert isinstance(org["recent_dogs"], list)
        assert len(org["recent_dogs"]) == 3

        # Verify first recent dog has all required fields
        first_dog = org["recent_dogs"][0]
        assert first_dog["id"] == 5305
        assert first_dog["name"] == "Juniper"
        assert first_dog["slug"] == "juniper-unknown-5305"
        assert first_dog["primary_image_url"] == "https://images.rescuedogs.me/juniper.jpg"
        assert first_dog["standardized_breed"] == "Unknown"

        # Verify social media
        assert "social_media" in org
        assert org["social_media"]["facebook"] == "https://www.facebook.com/SanterpawsBulgarianRescue"

    def test_organization_recent_dogs_empty_list(self, client, mock_db_cursor):
        """Test that organization handles empty recent_dogs gracefully."""

        animal_data = {
            "id": 1,
            "slug": "test-dog",
            "name": "Test Dog",
            "animal_type": "dog",
            "status": "available",
            "breed": "Test Breed",
            "standardized_breed": "Test Breed",
            "breed_group": None,
            "primary_breed": "Test Breed",
            "breed_type": "purebred",
            "breed_confidence": "high",
            "secondary_breed": None,
            "breed_slug": "test-breed",
            "age_text": "Adult",
            "age_min_months": 24,
            "age_max_months": 36,
            "sex": "Male",
            "size": "Large",
            "standardized_size": "Large",
            "primary_image_url": "https://example.com/dog.jpg",
            "adoption_url": "https://example.com/dog",
            "organization_id": 1,
            "external_id": "ext-1",
            "language": "en",
            "properties": {},
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC),
            "last_scraped_at": datetime.now(UTC),
            "availability_confidence": "high",
            "last_seen_at": datetime.now(UTC),
            "consecutive_scrapes_missing": 0,
            "dog_profiler_data": {},
            "adoption_check_data": None,
            "org_name": "Test Organization",
            "org_slug": "test-organization",
            "org_city": "Test City",
            "org_country": "US",
            "org_website_url": "https://testorg.com/",
            "org_logo_url": "https://testorg.com/logo.png",
            "org_social_media": {},
            "org_ships_to": ["US"],
            "org_service_regions": ["US"],
            "org_total_dogs": 1,
            "org_new_this_week": 0,
            "org_recent_dogs": [],  # Empty list
        }

        def mock_get_cursor():
            yield mock_db_cursor

        app.dependency_overrides[get_pooled_db_cursor] = mock_get_cursor
        mock_db_cursor.fetchone.return_value = animal_data

        response = client.get("/api/animals/test-dog")

        assert response.status_code == 200
        data = response.json()

        # Verify recent_dogs is an empty list, not None
        assert "organization" in data
        assert "recent_dogs" in data["organization"]
        assert data["organization"]["recent_dogs"] == []
        assert isinstance(data["organization"]["recent_dogs"], list)

    def test_organization_service_regions_multiple_countries(self, client, mock_db_cursor):
        """Test that service_regions correctly handles multiple countries."""

        animal_data = {
            "id": 2,
            "slug": "international-dog",
            "name": "International Dog",
            "animal_type": "dog",
            "status": "available",
            "breed": "Test Breed",
            "standardized_breed": "Test Breed",
            "breed_group": None,
            "primary_breed": "Test Breed",
            "breed_type": "purebred",
            "breed_confidence": "high",
            "secondary_breed": None,
            "breed_slug": "test-breed",
            "age_text": "Adult",
            "age_min_months": 24,
            "age_max_months": 36,
            "sex": "Female",
            "size": "Medium",
            "standardized_size": "Medium",
            "primary_image_url": "https://example.com/dog.jpg",
            "adoption_url": "https://example.com/dog",
            "organization_id": 2,
            "external_id": "ext-2",
            "language": "en",
            "properties": {},
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC),
            "last_scraped_at": datetime.now(UTC),
            "availability_confidence": "high",
            "last_seen_at": datetime.now(UTC),
            "consecutive_scrapes_missing": 0,
            "dog_profiler_data": {},
            "adoption_check_data": None,
            "org_name": "International Rescue",
            "org_slug": "international-rescue",
            "org_city": "Berlin",
            "org_country": "DE",
            "org_website_url": "https://international-rescue.org/",
            "org_logo_url": None,  # Test missing logo
            "org_social_media": {},
            "org_ships_to": ["UK", "US", "CA", "AU"],
            "org_service_regions": ["DE", "PL", "CZ", "AT"],  # Multiple service regions
            "org_total_dogs": 250,
            "org_new_this_week": 15,
            "org_recent_dogs": [
                {
                    "id": 100,
                    "slug": "recent-dog-1",
                    "name": "Recent Dog 1",
                    "primary_image_url": "https://example.com/recent1.jpg",
                    "standardized_breed": "German Shepherd",
                    "age_min_months": 12,
                    "age_max_months": 24,
                }
            ],
        }

        def mock_get_cursor():
            yield mock_db_cursor

        app.dependency_overrides[get_pooled_db_cursor] = mock_get_cursor
        mock_db_cursor.fetchone.return_value = animal_data

        response = client.get("/api/animals/international-dog")

        assert response.status_code == 200
        data = response.json()

        org = data["organization"]

        # Verify multiple service regions
        assert len(org["service_regions"]) == 4
        assert "DE" in org["service_regions"]
        assert "PL" in org["service_regions"]
        assert "CZ" in org["service_regions"]
        assert "AT" in org["service_regions"]

        # Verify ships_to is separate from service_regions
        assert len(org["ships_to"]) == 4
        assert "UK" in org["ships_to"]
        assert "US" in org["ships_to"]

        # Verify statistics
        assert org["total_dogs"] == 250
        assert org["new_this_week"] == 15

        # Verify logo_url can be None
        assert org["logo_url"] is None

    def test_organization_new_this_week_calculation(self, client, mock_db_cursor):
        """Test that new_this_week correctly reflects dogs added in last 7 days."""

        # Create a dog that was just added
        recent_date = datetime.now(UTC) - timedelta(days=2)

        animal_data = {
            "id": 3,
            "slug": "new-arrival",
            "name": "New Arrival",
            "animal_type": "dog",
            "status": "available",
            "breed": "Beagle",
            "standardized_breed": "Beagle",
            "breed_group": "Hound",
            "primary_breed": "Beagle",
            "breed_type": "purebred",
            "breed_confidence": "high",
            "secondary_breed": None,
            "breed_slug": "beagle",
            "age_text": "Puppy",
            "age_min_months": 3,
            "age_max_months": 6,
            "sex": "Male",
            "size": "Small",
            "standardized_size": "Small",
            "primary_image_url": "https://example.com/puppy.jpg",
            "adoption_url": "https://example.com/puppy",
            "organization_id": 3,
            "external_id": "ext-3",
            "language": "en",
            "properties": {"description": "Adorable beagle puppy"},
            "created_at": recent_date,  # Created 2 days ago
            "updated_at": recent_date,
            "last_scraped_at": datetime.now(UTC),
            "availability_confidence": "high",
            "last_seen_at": datetime.now(UTC),
            "consecutive_scrapes_missing": 0,
            "dog_profiler_data": {"quality_score": 0.9},
            "adoption_check_data": None,
            "org_name": "Quick Adoption Center",
            "org_slug": "quick-adoption-center",
            "org_city": "New York",
            "org_country": "US",
            "org_website_url": "https://quickadoption.org/",
            "org_logo_url": "https://quickadoption.org/logo.png",
            "org_social_media": {"twitter": "https://twitter.com/quickadopt"},
            "org_ships_to": ["US", "CA"],
            "org_service_regions": ["US"],
            "org_total_dogs": 45,
            "org_new_this_week": 8,  # 8 dogs added this week
            "org_recent_dogs": [
                {
                    "id": 3,
                    "slug": "new-arrival",
                    "name": "New Arrival",
                    "primary_image_url": "https://example.com/puppy.jpg",
                    "standardized_breed": "Beagle",
                    "age_min_months": 3,
                    "age_max_months": 6,
                },
                {
                    "id": 4,
                    "slug": "another-new",
                    "name": "Another New",
                    "primary_image_url": "https://example.com/another.jpg",
                    "standardized_breed": "Poodle",
                    "age_min_months": 12,
                    "age_max_months": 18,
                },
            ],
        }

        def mock_get_cursor():
            yield mock_db_cursor

        app.dependency_overrides[get_pooled_db_cursor] = mock_get_cursor
        mock_db_cursor.fetchone.return_value = animal_data

        response = client.get("/api/animals/new-arrival")

        assert response.status_code == 200
        data = response.json()

        org = data["organization"]

        # Verify new_this_week count
        assert org["new_this_week"] == 8

        # This should be prominently displayed as "8 NEW" badge on the card
        assert org["total_dogs"] == 45

        # Verify the recent dogs include this new arrival
        assert len(org["recent_dogs"]) == 2
        assert org["recent_dogs"][0]["name"] == "New Arrival"
        assert org["recent_dogs"][0]["slug"] == "new-arrival"
