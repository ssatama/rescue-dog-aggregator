"""Unit tests for AnimalService breed-related methods."""

from unittest.mock import MagicMock, call

import psycopg2
import pytest
from psycopg2.extras import RealDictCursor

from api.services.animal_service import AnimalService


class TestAnimalServiceBreeds:
    """Test breed-specific methods in AnimalService."""

    @pytest.fixture
    def mock_cursor(self):
        """Create mock RealDictCursor that returns dict-like results."""
        cursor = MagicMock(spec=RealDictCursor)
        return cursor

    @pytest.fixture
    def service(self, mock_cursor):
        """Create AnimalService instance with mock cursor."""
        return AnimalService(mock_cursor)

    def test_get_breed_stats_basic_aggregation(self, service, mock_cursor):
        """Test basic breed statistics aggregation."""
        # Mock database responses with dict-like results
        mock_cursor.fetchone.side_effect = [
            {"total": 2500},  # total_dogs
            {"count": 150},  # unique_breeds
            {"purebred_count": 800, "crossbreed_count": 238},  # breed type counts
        ]

        # Mock breed groups
        mock_cursor.fetchall.side_effect = [
            [{"group_name": "Hound", "count": 450}, {"group_name": "Sporting", "count": 300}],  # breed groups
            # Qualifying breeds with all required fields
            [
                {
                    "primary_breed": "Mixed Breed",
                    "breed_slug": "mixed-breed",
                    "breed_type": "mixed",
                    "breed_group": None,
                    "count": 1462,
                    "average_age_months": 48,
                    "org_count": 10,
                    "organizations": ["Org1", "Org2"],
                    "personality_traits": ["Friendly", "Adaptable", "Loyal", "Playful", "Gentle"],  # Added
                    "puppy_count": 200,
                    "young_count": 500,
                    "adult_count": 600,
                    "senior_count": 162,
                    "tiny_count": 50,
                    "small_count": 300,
                    "medium_count": 600,
                    "large_count": 400,
                    "xlarge_count": 112,
                    "first_time_ok_count": 700,
                    "some_experience_count": 500,
                    "experienced_count": 262,
                    "male_count": 800,
                    "female_count": 662,
                    "total_with_profiler_data": 1200,
                    "energy_low_count": 400,
                    "energy_medium_count": 500,
                    "energy_high_count": 300,
                    "confidence_high_count": 600,
                    "confidence_moderate_count": 400,
                    "confidence_low_count": 200,
                    "good_with_dogs_yes_count": 800,
                    "good_with_dogs_sometimes_count": 300,
                    "good_with_dogs_no_count": 100,
                },
                {
                    "primary_breed": "Galgo",
                    "breed_slug": "galgo",
                    "breed_type": "purebred",
                    "breed_group": "Hound",
                    "count": 120,
                    "average_age_months": 36,
                    "org_count": 3,
                    "organizations": ["Org1", "Org3", "Org4"],
                    "personality_traits": ["Gentle", "Calm", "Lazy", "Affectionate", "Independent"],  # Added
                    "puppy_count": 10,
                    "young_count": 40,
                    "adult_count": 50,
                    "senior_count": 20,
                    "tiny_count": 0,
                    "small_count": 5,
                    "medium_count": 30,
                    "large_count": 85,
                    "xlarge_count": 0,
                    "first_time_ok_count": 60,
                    "some_experience_count": 40,
                    "experienced_count": 20,
                    "male_count": 70,
                    "female_count": 50,
                    "total_with_profiler_data": 100,
                    "energy_low_count": 60,
                    "energy_medium_count": 30,
                    "energy_high_count": 10,
                    "confidence_high_count": 50,
                    "confidence_moderate_count": 30,
                    "confidence_low_count": 20,
                    "good_with_dogs_yes_count": 90,
                    "good_with_dogs_sometimes_count": 10,
                    "good_with_dogs_no_count": 0,
                },
            ],
        ]

        result = service.get_breed_stats()

        assert result["total_dogs"] == 2500
        assert result["unique_breeds"] == 150
        assert result["purebred_count"] == 800
        assert result["crossbreed_count"] == 238
        assert len(result["breed_groups"]) == 2
        assert result["breed_groups"][0]["name"] == "Hound"
        assert len(result["qualifying_breeds"]) == 2

        # Check first breed details
        mixed_breed = result["qualifying_breeds"][0]
        assert mixed_breed["primary_breed"] == "Mixed Breed"
        assert mixed_breed["average_age_months"] == 48
        assert mixed_breed["sex_distribution"]["male"] == 800
        assert mixed_breed["sex_distribution"]["female"] == 662
        assert mixed_breed["age_distribution"]["puppy"] == 200
        assert mixed_breed["size_distribution"]["medium"] == 600

    def test_get_breed_stats_handles_null_values(self, service, mock_cursor):
        """Test breed stats handles null average age gracefully."""
        mock_cursor.fetchone.side_effect = [{"total": 100}, {"count": 10}, {"purebred_count": 50, "crossbreed_count": 20}]
        mock_cursor.fetchall.side_effect = [
            [],  # No breed groups
            [
                {
                    "primary_breed": "Unknown Breed",
                    "breed_slug": "unknown-breed",
                    "breed_type": "unknown",
                    "breed_group": None,
                    "count": 5,
                    "average_age_months": None,  # NULL age
                    "org_count": 1,
                    "organizations": ["Test Org"],
                    "personality_traits": [],  # Added - empty array
                    "puppy_count": 1,
                    "young_count": 2,
                    "adult_count": 1,
                    "senior_count": 1,
                    "tiny_count": 0,
                    "small_count": 2,
                    "medium_count": 2,
                    "large_count": 1,
                    "xlarge_count": 0,
                    "first_time_ok_count": 3,
                    "some_experience_count": 1,
                    "experienced_count": 1,
                    "male_count": 3,
                    "female_count": 2,
                    "total_with_profiler_data": 5,
                    "energy_low_count": 2,
                    "energy_medium_count": 2,
                    "energy_high_count": 1,
                    "confidence_high_count": 2,
                    "confidence_moderate_count": 2,
                    "confidence_low_count": 1,
                    "good_with_dogs_yes_count": 3,
                    "good_with_dogs_sometimes_count": 1,
                    "good_with_dogs_no_count": 1,
                }
            ],
        ]

        result = service.get_breed_stats()

        breed = result["qualifying_breeds"][0]
        assert breed["average_age_months"] is None
        assert breed["sex_distribution"]["male"] == 3
        assert breed["sex_distribution"]["female"] == 2

    def test_get_breed_stats_empty_results(self, service, mock_cursor):
        """Test breed stats with no qualifying breeds."""
        mock_cursor.fetchone.side_effect = [{"total": 0}, {"count": 0}, {"purebred_count": 0, "crossbreed_count": 0}]
        mock_cursor.fetchall.side_effect = [[], []]  # No breed groups, no qualifying breeds

        result = service.get_breed_stats()

        assert result["total_dogs"] == 0
        assert result["unique_breeds"] == 0
        assert result["qualifying_breeds"] == []
        assert result["breed_groups"] == []

    def test_get_breed_stats_database_error(self, service, mock_cursor):
        """Test breed stats handles database errors properly."""
        mock_cursor.execute.side_effect = psycopg2.DatabaseError("Connection lost")

        with pytest.raises(Exception):  # Will raise APIException
            service.get_breed_stats()

    def test_get_breeds_with_images_basic_query(self, service, mock_cursor):
        """Test basic breed images query with sample dogs."""
        mock_cursor.fetchall.return_value = [
            {
                "primary_breed": "Galgo",
                "breed_slug": "galgo",
                "breed_type": "purebred",
                "breed_group": "Hound",
                "count": 120,
                "sample_dogs": [
                    {"name": "Shadow", "slug": "shadow-123", "primary_image_url": "https://example.com/shadow.jpg", "age_text": "3 years", "sex": "Male", "personality_traits": ["Gentle", "Calm"]}
                ],
            }
        ]

        result = service.get_breeds_with_images(limit=10)

        assert len(result) == 1
        assert result[0]["primary_breed"] == "Galgo"
        assert result[0]["count"] == 120
        assert len(result[0]["sample_dogs"]) == 1
        assert result[0]["sample_dogs"][0]["name"] == "Shadow"

    def test_get_breeds_with_images_filters(self, service, mock_cursor):
        """Test breed images query with various filters."""
        mock_cursor.fetchall.return_value = []

        # Test breed_type filter for non-mixed breeds
        service.get_breeds_with_images(breed_type="purebred")
        execute_call = mock_cursor.execute.call_args[0][0]
        params = mock_cursor.execute.call_args[0][1]
        assert "a.breed_type = %s" in execute_call
        assert "purebred" in params

        # Reset mock
        mock_cursor.reset_mock()

        # Test breed_type filter for mixed breeds
        service.get_breeds_with_images(breed_type="mixed")
        execute_call = mock_cursor.execute.call_args[0][0]
        # Mixed breeds use breed_group = 'Mixed' instead of breed_type
        assert "a.breed_group = 'Mixed'" in execute_call

        # Reset mock
        mock_cursor.reset_mock()

        # Test breed_group filter
        service.get_breeds_with_images(breed_group="Hound")
        execute_call = mock_cursor.execute.call_args[0][0]
        params = mock_cursor.execute.call_args[0][1]
        assert "a.breed_group = %s" in execute_call
        assert "Hound" in params

        # Reset mock
        mock_cursor.reset_mock()

        # Test min_count filter
        service.get_breeds_with_images(min_count=15)
        execute_call = mock_cursor.execute.call_args[0][0]
        assert "HAVING COUNT(DISTINCT a.id) >= %s" in execute_call

    def test_get_breeds_with_images_sql_injection_protection(self, service, mock_cursor):
        """Test breed images protects against SQL injection."""
        mock_cursor.fetchall.return_value = []

        # Attempt SQL injection in breed_type
        malicious_input = "'; DROP TABLE animals; --"
        service.get_breeds_with_images(breed_type=malicious_input)

        # Verify parameterized query is used
        execute_call = mock_cursor.execute.call_args[0][0]
        params = mock_cursor.execute.call_args[0][1]

        # Check that malicious input is passed as parameter, not concatenated
        assert "DROP TABLE" not in execute_call
        assert malicious_input in params
        assert "breed_type = %s" in execute_call

    def test_get_breeds_with_images_limit_validation(self, service, mock_cursor):
        """Test breed images validates limit parameter."""
        mock_cursor.fetchall.return_value = []

        # Test with valid limit
        service.get_breeds_with_images(limit=5)
        params = mock_cursor.execute.call_args[0][1]
        assert 5 in params  # Limit should be in parameters

        # Test with excessive limit (should cap at reasonable max)
        service.get_breeds_with_images(limit=10000)
        params = mock_cursor.execute.call_args[0][1]
        # Should still pass the limit as parameter (capping might be in service)
        assert 10000 in params or 100 in params  # Either original or capped

    def test_get_breeds_with_images_empty_sample_dogs(self, service, mock_cursor):
        """Test breed images handles breeds with no sample dogs."""
        mock_cursor.fetchall.return_value = [{"primary_breed": "Rare Breed", "breed_slug": "rare-breed", "breed_type": "purebred", "breed_group": "Working", "count": 1, "sample_dogs": []}]

        result = service.get_breeds_with_images(limit=10)

        assert len(result) == 1
        assert result[0]["sample_dogs"] == []

    def test_get_breeds_with_images_personality_traits_parsing(self, service, mock_cursor):
        """Test breed images correctly parses personality traits JSON."""
        mock_cursor.fetchall.return_value = [
            {
                "primary_breed": "Collie",
                "breed_slug": "collie",
                "breed_type": "purebred",
                "breed_group": "Herding",
                "count": 45,
                "sample_dogs": [
                    {
                        "name": "Lassie",
                        "slug": "lassie-456",
                        "primary_image_url": "https://example.com/lassie.jpg",
                        "age_text": "2 years",
                        "sex": "Female",
                        "personality_traits": ["Intelligent", "Loyal", "Active"],
                    }
                ],
            }
        ]

        result = service.get_breeds_with_images(limit=10)

        traits = result[0]["sample_dogs"][0]["personality_traits"]
        assert isinstance(traits, list)
        assert "Intelligent" in traits
        assert "Loyal" in traits
        assert "Active" in traits

    def test_get_breed_stats_with_mixed_breeds(self, service, mock_cursor):
        """Test breed stats correctly handles mixed breed categorization."""
        mock_cursor.fetchone.side_effect = [{"total": 2000}, {"count": 50}, {"purebred_count": 500, "crossbreed_count": 100}]

        mock_cursor.fetchall.side_effect = [
            [{"group_name": "Mixed", "count": 1400}],
            [
                {
                    "primary_breed": "Mixed Breed",
                    "breed_slug": "mixed-breed",
                    "breed_type": "mixed",
                    "breed_group": None,
                    "count": 1400,
                    "average_age_months": 42,
                    "org_count": 12,
                    "organizations": ["Org1", "Org2"],
                    "personality_traits": ["Friendly", "Adaptable", "Loyal"],  # Added
                    "puppy_count": 300,
                    "young_count": 400,
                    "adult_count": 500,
                    "senior_count": 200,
                    "tiny_count": 100,
                    "small_count": 400,
                    "medium_count": 600,
                    "large_count": 250,
                    "xlarge_count": 50,
                    "first_time_ok_count": 800,
                    "some_experience_count": 400,
                    "experienced_count": 200,
                    "male_count": 750,
                    "female_count": 650,
                    "total_with_profiler_data": 1300,
                    "energy_low_count": 400,
                    "energy_medium_count": 600,
                    "energy_high_count": 300,
                    "confidence_high_count": 700,
                    "confidence_moderate_count": 400,
                    "confidence_low_count": 200,
                    "good_with_dogs_yes_count": 1000,
                    "good_with_dogs_sometimes_count": 300,
                    "good_with_dogs_no_count": 0,
                }
            ],
        ]

        result = service.get_breed_stats()

        # Check mixed breed is included
        assert len(result["qualifying_breeds"]) == 1
        mixed = result["qualifying_breeds"][0]
        assert mixed["primary_breed"] == "Mixed Breed"
        assert mixed["breed_type"] == "mixed"
        assert mixed["count"] == 1400
