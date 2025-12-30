"""Tests for breed statistics endpoint."""

from unittest.mock import MagicMock, patch

import pytest


@pytest.fixture
def mock_db_cursor():
    """Create mock database cursor for breed stats tests."""
    cursor = MagicMock()
    return cursor


class TestBreedStatsEndpoint:
    """Test breed statistics endpoint."""

    def test_get_breed_stats_endpoint_exists(self, client, mock_db_cursor):
        """Test that breed stats endpoint exists and responds."""
        # Mock minimal valid response that matches the actual data structure
        mock_stats = {
            "total_dogs": 2500,
            "unique_breeds": 150,
            "purebred_count": 800,
            "crossbreed_count": 238,
            "breed_groups": [],
            "qualifying_breeds": [],
        }

        with patch(
            "api.routes.animals.get_pooled_db_cursor", return_value=mock_db_cursor
        ):
            with patch(
                "api.services.animal_service.AnimalService.get_breed_stats",
                return_value=mock_stats,
            ):
                response = client.get("/api/animals/breeds/stats")

        assert response.status_code == 200
        data = response.json()
        assert "total_dogs" in data
        assert "unique_breeds" in data
        assert "breed_groups" in data
        assert "qualifying_breeds" in data

    def test_get_breed_stats_database_error(self, client, mock_db_cursor):
        """Test database error handling in breed stats."""
        import psycopg2

        with patch(
            "api.routes.animals.get_pooled_db_cursor", return_value=mock_db_cursor
        ):
            with patch(
                "api.services.animal_service.AnimalService.get_breed_stats",
                side_effect=psycopg2.Error("Database connection failed"),
            ):
                response = client.get("/api/animals/breeds/stats")

        assert response.status_code == 500
        assert (
            "Database error" in response.json()["detail"]
            or "Failed to fetch breed statistics" in response.json()["detail"]
        )

    def test_get_breed_stats_includes_average_age(self, client, mock_db_cursor):
        """Test that breed stats includes average age calculation for qualifying breeds."""
        # Mock response with qualifying breeds that includes average_age_months
        mock_stats = {
            "total_dogs": 2500,
            "unique_breeds": 150,
            "purebred_count": 800,
            "crossbreed_count": 238,
            "breed_groups": [{"name": "Sporting", "count": 450}],
            "qualifying_breeds": [
                {
                    "primary_breed": "Golden Retriever",
                    "breed_slug": "golden-retriever",
                    "count": 17,
                    "average_age_months": 42,  # This should be calculated from actual data
                    "breed_type": "purebred",
                    "breed_group": "Sporting",
                    "organization_count": 3,
                    "age_distribution": {
                        "puppy": 2,
                        "young": 5,
                        "adult": 8,
                        "senior": 2,
                    },
                    "size_distribution": {
                        "tiny": 0,
                        "small": 0,
                        "medium": 5,
                        "large": 12,
                        "xlarge": 0,
                    },
                    "experience_distribution": {
                        "first_time_ok": 8,
                        "some_experience": 6,
                        "experienced": 3,
                    },
                },
                {
                    "primary_breed": "Mixed Breed",
                    "breed_slug": "mixed-breed",
                    "count": 1517,
                    "average_age_months": 48,  # This should be calculated from actual data
                    "breed_type": "mixed",
                    "breed_group": None,
                    "organization_count": 10,
                    "age_distribution": {
                        "puppy": 200,
                        "young": 500,
                        "adult": 600,
                        "senior": 217,
                    },
                    "size_distribution": {
                        "tiny": 50,
                        "small": 300,
                        "medium": 600,
                        "large": 400,
                        "xlarge": 167,
                    },
                    "experience_distribution": {
                        "first_time_ok": 700,
                        "some_experience": 500,
                        "experienced": 317,
                    },
                },
            ],
        }

        with patch(
            "api.routes.animals.get_pooled_db_cursor", return_value=mock_db_cursor
        ):
            with patch(
                "api.services.animal_service.AnimalService.get_breed_stats",
                return_value=mock_stats,
            ):
                response = client.get("/api/animals/breeds/stats")

        assert response.status_code == 200
        data = response.json()

        # Check that qualifying breeds have average_age_months
        assert len(data["qualifying_breeds"]) > 0
        for breed in data["qualifying_breeds"]:
            assert "average_age_months" in breed
            if breed["count"] > 0:  # Only check if there are dogs
                assert isinstance(breed["average_age_months"], (int, float, type(None)))
                # If not None, should be a reasonable age in months (0-240 months = 0-20 years)
                if breed["average_age_months"] is not None:
                    assert 0 <= breed["average_age_months"] <= 240

    def test_get_breed_stats_includes_sex_distribution(self, client, mock_db_cursor):
        """Test that breed stats includes sex distribution for qualifying breeds."""
        # Mock response with qualifying breeds that includes sex_distribution
        mock_stats = {
            "total_dogs": 2500,
            "unique_breeds": 150,
            "purebred_count": 800,
            "crossbreed_count": 238,
            "breed_groups": [{"name": "Sporting", "count": 450}],
            "qualifying_breeds": [
                {
                    "primary_breed": "Golden Retriever",
                    "breed_slug": "golden-retriever",
                    "count": 17,
                    "average_age_months": 42,
                    "breed_type": "purebred",
                    "breed_group": "Sporting",
                    "organization_count": 3,
                    "sex_distribution": {"male": 10, "female": 7},
                    "age_distribution": {
                        "puppy": 2,
                        "young": 5,
                        "adult": 8,
                        "senior": 2,
                    },
                    "size_distribution": {
                        "tiny": 0,
                        "small": 0,
                        "medium": 5,
                        "large": 12,
                        "xlarge": 0,
                    },
                    "experience_distribution": {
                        "first_time_ok": 8,
                        "some_experience": 6,
                        "experienced": 3,
                    },
                },
                {
                    "primary_breed": "Mixed Breed",
                    "breed_slug": "mixed-breed",
                    "count": 1517,
                    "average_age_months": 48,
                    "breed_type": "mixed",
                    "breed_group": None,
                    "organization_count": 10,
                    "sex_distribution": {"male": 800, "female": 717},
                    "age_distribution": {
                        "puppy": 200,
                        "young": 500,
                        "adult": 600,
                        "senior": 217,
                    },
                    "size_distribution": {
                        "tiny": 50,
                        "small": 300,
                        "medium": 600,
                        "large": 400,
                        "xlarge": 167,
                    },
                    "experience_distribution": {
                        "first_time_ok": 700,
                        "some_experience": 500,
                        "experienced": 317,
                    },
                },
            ],
        }

        with patch(
            "api.routes.animals.get_pooled_db_cursor", return_value=mock_db_cursor
        ):
            with patch(
                "api.services.animal_service.AnimalService.get_breed_stats",
                return_value=mock_stats,
            ):
                response = client.get("/api/animals/breeds/stats")

        assert response.status_code == 200
        data = response.json()

        # Check that qualifying breeds have sex_distribution
        assert len(data["qualifying_breeds"]) > 0
        for breed in data["qualifying_breeds"]:
            assert "sex_distribution" in breed
            sex_dist = breed["sex_distribution"]
            assert "male" in sex_dist
            assert "female" in sex_dist
            assert isinstance(sex_dist["male"], int)
            assert isinstance(sex_dist["female"], int)
            assert sex_dist["male"] >= 0
            assert sex_dist["female"] >= 0
            # Total should match the breed count
            assert sex_dist["male"] + sex_dist["female"] == breed["count"]
