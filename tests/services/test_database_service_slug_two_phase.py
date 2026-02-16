"""
Test suite for two-phase slug generation in DatabaseService.

Following TDD principles:
1. Write failing test first
2. See it fail
3. Write minimal code to pass
4. Refactor if needed

This test specifies that animals should get slugs with ID suffix (name-breed-id format).
"""

from unittest.mock import Mock, patch

import pytest

from services.database_service import DatabaseService


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.integration
@pytest.mark.slow
class TestDatabaseServiceTwoPhaseSlugGeneration:
    """Test two-phase slug generation: INSERT with temp slug, UPDATE with final slug containing ID."""

    def test_create_animal_generates_slug_with_id_suffix(self):
        """Test that created animals get slugs with ID suffix in format name-breed-id."""
        # Setup
        db_config = {"host": "localhost", "user": "test", "database": "test_db"}
        db_service = DatabaseService(db_config)

        # Mock database connection and cursor
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_conn.cursor.return_value = mock_cursor

        # Mock cursor responses for two-phase operation:
        # 1. First call: slug uniqueness check for temp slug (0 = unique)
        # 2. Second call: INSERT RETURNING id (returns 1234)
        # 3. Third call: slug uniqueness check for final slug (0 = unique)
        # 4. Fourth call: UPDATE slug with ID suffix
        mock_cursor.fetchone.side_effect = [
            (0,),  # temp slug uniqueness check
            (1234,),  # INSERT RETURNING id
            (0,),  # final slug uniqueness check
        ]

        db_service.conn = mock_conn

        # Test data
        animal_data = {
            "name": "Bella",
            "breed": "Labrador Mix",
            "external_id": "test-123",
            "organization_id": 1,
            "animal_type": "dog",
            "age_text": "2 years",
            "sex": "Female",
            "adoption_url": "http://example.com/adopt/test-123",
            "primary_image_url": "http://example.com/image.jpg",
            "status": "available",
        }

        # Execute
        animal_id, action = db_service.create_animal(animal_data)

        # Verify - Check that the method was called correctly
        assert animal_id == 1234
        assert action == "added"

        # Verify two-phase database operations:
        # 1. Temp slug uniqueness check
        # 2. INSERT with temp slug
        # 3. Final slug uniqueness check
        # 4. UPDATE with final slug containing ID
        assert mock_cursor.execute.call_count == 4

        # Verify INSERT was called with temp slug
        insert_call = mock_cursor.execute.call_args_list[1]
        insert_sql = insert_call[0][0]
        insert_params = insert_call[0][1]

        assert "INSERT INTO animals" in insert_sql
        # The temp slug should be in the INSERT (position 19 based on current schema)
        temp_slug = insert_params[19]  # slug parameter position
        # "Labrador Mix" standardizes to "Labrador Mix" (capitalized input)
        assert temp_slug == "bella-labrador-mix-temp"

        # Verify UPDATE was called with final slug containing ID
        update_call = mock_cursor.execute.call_args_list[3]
        update_sql = update_call[0][0]
        update_params = update_call[0][1]

        assert "UPDATE animals SET slug" in update_sql
        assert update_params[0] == "bella-labrador-mix-1234"  # final slug with ID
        assert update_params[1] == 1234  # WHERE id = animal_id

        # Verify transaction was committed
        mock_conn.commit.assert_called_once()
        # cursor.close() is called multiple times due to slug generation creating additional cursors
        assert mock_cursor.close.call_count >= 1

    def test_create_animal_handles_slug_collision_in_final_phase(self):
        """Test that final slug generation handles collisions properly."""
        # Setup
        db_config = {"host": "localhost", "user": "test", "database": "test_db"}
        db_service = DatabaseService(db_config)

        mock_conn = Mock()
        mock_cursor = Mock()
        mock_conn.cursor.return_value = mock_cursor

        # Mock cursor responses:
        # 1. Temp slug uniqueness (unique)
        # 2. INSERT returns ID 1234
        # 3. Final slug uniqueness check (collision - count=1)
        # 4. Final slug with suffix uniqueness check (unique - count=0)
        mock_cursor.fetchone.side_effect = [
            (0,),  # temp slug unique
            (1234,),  # INSERT returns ID
            (1,),  # final slug collision detected
            (0,),  # final slug with suffix is unique
        ]

        db_service.conn = mock_conn

        animal_data = {
            "name": "Max",
            "breed": "Golden Retriever",
            "external_id": "test-456",
            "organization_id": 1,
        }

        # Execute
        animal_id, action = db_service.create_animal(animal_data)

        # Verify collision was handled
        assert animal_id == 1234
        assert action == "added"

        # Should have 5 execute calls:
        # 1. temp slug check, 2. INSERT, 3. final slug check, 4. collision suffix check, 5. UPDATE
        assert mock_cursor.execute.call_count == 5

        # Final UPDATE should use slug with collision suffix
        update_call = mock_cursor.execute.call_args_list[4]
        update_params = update_call[0][1]
        final_slug = update_params[0]

        # Should be max-golden-retriever-1234-1 (with collision suffix)
        assert final_slug == "max-golden-retriever-1234-1"

    def test_create_animal_graceful_degradation_on_update_failure(self):
        """Test that animal is created with temp slug if UPDATE fails (graceful degradation)."""
        # Setup
        db_config = {"host": "localhost", "user": "test", "database": "test_db"}
        db_service = DatabaseService(db_config)

        mock_conn = Mock()
        mock_cursor = Mock()
        mock_conn.cursor.return_value = mock_cursor

        # Mock successful INSERT but failed UPDATE
        mock_cursor.fetchone.side_effect = [
            (0,),  # temp slug unique
            (1234,),  # INSERT succeeds
            (0,),  # final slug unique
        ]

        # Make UPDATE fail
        def execute_side_effect(sql, params=None):
            if params and "UPDATE animals SET slug" in sql:
                raise Exception("UPDATE failed")

        mock_cursor.execute.side_effect = execute_side_effect
        db_service.conn = mock_conn

        animal_data = {
            "name": "Buddy",
            "breed": "Beagle",
            "external_id": "test-789",
            "organization_id": 1,
        }

        # Execute - should handle UPDATE failure gracefully
        animal_id, action = db_service.create_animal(animal_data)

        # Should still succeed with temp slug (graceful degradation)
        assert animal_id == 1234
        assert action == "added"

        # Should commit transaction (animal created with temp slug)
        mock_conn.commit.assert_called_once()
        # Should not rollback since we accept temp slug as fallback
        assert mock_conn.rollback.call_count == 0

    def test_create_animal_uses_existing_temp_slug_on_update_failure(self):
        """Test that animal is created with temp slug if UPDATE fails, rather than failing completely."""
        # This is a design decision - we want the animal to be created even if final slug update fails
        # The temp slug ensures the NOT NULL constraint is satisfied
        pass  # TODO: Implement after clarifying requirements

    @patch("services.animal_data_preparation.generate_unique_animal_slug")
    def test_create_animal_slug_generation_parameters(self, mock_slug_generator):
        """Test that slug generation is called with correct parameters in both phases."""
        # Setup
        db_config = {"host": "localhost", "user": "test", "database": "test_db"}
        db_service = DatabaseService(db_config)

        mock_conn = Mock()
        mock_cursor = Mock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchone.side_effect = [(1234,)]  # INSERT returns ID

        db_service.conn = mock_conn

        # Mock slug generator to return different values for temp vs final
        mock_slug_generator.side_effect = [
            "temp-slug-placeholder",
            "final-slug-with-id-1234",
        ]  # temp slug generation  # final slug generation

        animal_data = {
            "name": "Rover",
            "breed": "Mixed Breed",
            "external_id": "test-999",
            "organization_id": 1,
        }

        # Execute
        db_service.create_animal(animal_data)

        # Verify slug generator was called twice with correct parameters
        assert mock_slug_generator.call_count == 2

        # First call should be for temp slug (no animal_id)
        temp_call = mock_slug_generator.call_args_list[0]
        assert temp_call[1]["animal_id"] is None
        assert temp_call[1]["name"] == "Rover"
        assert temp_call[1]["breed"] == "Mixed Breed"

        # Second call should be for final slug (with animal_id)
        final_call = mock_slug_generator.call_args_list[1]
        assert final_call[1]["animal_id"] == 1234
        assert final_call[1]["name"] == "Rover"
        assert final_call[1]["breed"] == "Mixed Breed"
