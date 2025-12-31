"""
Tests for DatabaseService slug generation integration.
Following TDD principles - tests written before implementation.
"""

from unittest.mock import MagicMock, patch

import pytest

from services.database_service import DatabaseService


@pytest.mark.computation
@pytest.mark.database
@pytest.mark.integration
@pytest.mark.slow
class TestDatabaseServiceSlugIntegration:
    """Test slug generation integration in DatabaseService."""

    def test_create_animal_generates_slug_with_name_only(self):
        """Test that create_animal generates slug with just name (two-phase)."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        # Mock for INSERT returning ID (only fetchone that matters since slug generation is mocked)
        mock_cursor.fetchone.return_value = (123,)
        mock_conn.cursor.return_value = mock_cursor

        db_service = DatabaseService({"host": "test", "user": "test", "database": "test"})

        animal_data = {
            "name": "Fluffy",
            "organization_id": 1,
            "external_id": "test-123",
        }

        # Mock standardize_breed to return known defaults
        with patch("services.database_service.standardize_breed") as mock_standardize:
            mock_standardize.return_value = ("Unknown", "Unknown", None)

            with patch("services.database_service.generate_unique_animal_slug") as mock_slug_gen:
                # Return different values for temp vs final slug
                mock_slug_gen.side_effect = ["fluffy", "fluffy-123"]

                animal_id, action = db_service._create_animal_with_connection(mock_conn, animal_data)

                # Verify two-phase slug generation: temp slug (no ID) then final slug (with ID)
                assert mock_slug_gen.call_count == 2

                # First call - temp slug generation
                temp_call = mock_slug_gen.call_args_list[0]
                assert temp_call[1]["name"] == "Fluffy"
                assert temp_call[1]["breed"] is None
                assert temp_call[1]["standardized_breed"] == "Unknown"
                assert temp_call[1]["animal_id"] is None
                assert temp_call[1]["connection"] == mock_conn

                # Second call - final slug generation
                final_call = mock_slug_gen.call_args_list[1]
                assert final_call[1]["name"] == "Fluffy"
                assert final_call[1]["breed"] is None
                assert final_call[1]["standardized_breed"] == "Unknown"
                assert final_call[1]["animal_id"] == 123
                assert final_call[1]["connection"] == mock_conn

                # Verify INSERT was called with temp slug and UPDATE with final slug
                assert mock_cursor.execute.call_count == 2  # INSERT + UPDATE (slug gen is mocked)

                # Check INSERT uses temp slug
                insert_call = mock_cursor.execute.call_args_list[0]
                insert_values = insert_call[0][1]
                assert "fluffy-temp" == insert_values[19]  # slug parameter position

                # Check UPDATE uses final slug
                update_call = mock_cursor.execute.call_args_list[1]
                update_values = update_call[0][1]
                assert "fluffy-123" == update_values[0]  # final slug
                assert 123 == update_values[1]  # animal_id

    def test_create_animal_generates_slug_with_breed(self):
        """Test slug generation with breed information (two-phase)."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        # Mock for INSERT returning ID (only fetchone that matters since slug generation is mocked)
        mock_cursor.fetchone.return_value = (123,)
        mock_conn.cursor.return_value = mock_cursor

        db_service = DatabaseService({"host": "test", "user": "test", "database": "test"})

        animal_data = {
            "name": "Max",
            "breed": "German Shepherd",
            "organization_id": 1,
            "external_id": "test-456",
        }

        # Mock standardize_breed to return specific standardized breed
        with patch("services.database_service.standardize_breed") as mock_standardize:
            mock_standardize.return_value = ("German Shepherd Dog", "Herding", "Large")

            with patch("services.database_service.generate_unique_animal_slug") as mock_slug_gen:
                mock_slug_gen.side_effect = [
                    "max-german-shepherd-dog",
                    "max-german-shepherd-dog-123",
                ]

                animal_id, action = db_service._create_animal_with_connection(mock_conn, animal_data)

                # Verify two-phase slug generation
                assert mock_slug_gen.call_count == 2

                # First call - temp slug generation
                temp_call = mock_slug_gen.call_args_list[0]
                assert temp_call[1]["name"] == "Max"
                assert temp_call[1]["breed"] == "German Shepherd"
                assert temp_call[1]["standardized_breed"] == "German Shepherd Dog"
                assert temp_call[1]["animal_id"] is None
                assert temp_call[1]["connection"] == mock_conn

                # Second call - final slug generation
                final_call = mock_slug_gen.call_args_list[1]
                assert final_call[1]["name"] == "Max"
                assert final_call[1]["breed"] == "German Shepherd"
                assert final_call[1]["standardized_breed"] == "German Shepherd Dog"
                assert final_call[1]["animal_id"] == 123
                assert final_call[1]["connection"] == mock_conn

    def test_create_animal_uses_standardized_breed_for_slug(self):
        """Test that standardized breed is preferred over original breed for slug (two-phase)."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        # Mock for INSERT returning ID (only fetchone that matters since slug generation is mocked)
        mock_cursor.fetchone.return_value = (123,)
        mock_conn.cursor.return_value = mock_cursor

        db_service = DatabaseService({"host": "test", "user": "test", "database": "test"})

        # Mock standardize_breed to return standardized info
        with patch("services.database_service.standardize_breed") as mock_standardize:
            mock_standardize.return_value = ("Labrador Retriever", "Sporting", "Large")

            animal_data = {
                "name": "Bella",
                "breed": "Lab Mix",
                "organization_id": 1,
                "external_id": "test-789",
            }

            with patch("services.database_service.generate_unique_animal_slug") as mock_slug_gen:
                mock_slug_gen.side_effect = [
                    "bella-labrador-retriever",
                    "bella-labrador-retriever-123",
                ]

                animal_id, action = db_service._create_animal_with_connection(mock_conn, animal_data)

                # Verify two-phase slug generation uses standardized breed
                assert mock_slug_gen.call_count == 2

                # Both calls should use standardized breed
                for call_args in mock_slug_gen.call_args_list:
                    assert call_args[1]["name"] == "Bella"
                    assert call_args[1]["breed"] == "Lab Mix"
                    assert call_args[1]["standardized_breed"] == "Labrador Retriever"
                    assert call_args[1]["connection"] == mock_conn

                # First call should have no animal_id, second should have ID
                assert mock_slug_gen.call_args_list[0][1]["animal_id"] is None
                assert mock_slug_gen.call_args_list[1][1]["animal_id"] == 123

    def test_create_animal_handles_slug_generation_failure(self):
        """Test graceful handling when temp slug generation fails."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = [123]
        mock_conn.cursor.return_value = mock_cursor

        db_service = DatabaseService({"host": "test", "user": "test", "database": "test"})

        animal_data = {
            "name": "Charlie",
            "organization_id": 1,
            "external_id": "test-999",
        }

        with patch("services.database_service.generate_unique_animal_slug") as mock_slug_gen:
            # Simulate temp and final slug generation failure
            mock_slug_gen.side_effect = Exception("Database connection failed")

            # Should use fallback slug and still create animal
            animal_id, action = db_service._create_animal_with_connection(mock_conn, animal_data)

            # Verify animal was created with fallback slug
            assert animal_id == 123
            assert action == "added"

            # Verify slug generation was attempted for temp slug (failed) and there should be an UPDATE attempt
            assert mock_slug_gen.call_count >= 1

            # Verify INSERT was called with fallback slug pattern
            insert_call = mock_cursor.execute.call_args_list[0]
            insert_values = insert_call[0][1]
            fallback_slug = insert_values[19]  # slug parameter position
            assert "animal-test-999-temp" == fallback_slug

    def test_create_animal_with_connection_pool(self):
        """Test slug generation works with connection pool (two-phase)."""
        # Create a mock connection pool
        mock_pool = MagicMock()
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        # Mock for INSERT returning ID (only fetchone that matters since slug generation is mocked)
        mock_cursor.fetchone.return_value = (123,)
        mock_conn.cursor.return_value = mock_cursor
        mock_pool.get_connection_context.return_value.__enter__.return_value = mock_conn
        mock_pool.get_connection_context.return_value.__exit__.return_value = None

        db_service = DatabaseService(
            {"host": "test", "user": "test", "database": "test"},
            connection_pool=mock_pool,
        )

        animal_data = {
            "name": "Luna",
            "breed": "Golden Retriever",
            "organization_id": 1,
            "external_id": "test-pool-123",
        }

        # Mock standardize_breed for connection pool test
        with patch("services.database_service.standardize_breed") as mock_standardize:
            mock_standardize.return_value = ("Golden Retriever", "Sporting", "Large")

            with patch("services.database_service.generate_unique_animal_slug") as mock_slug_gen:
                mock_slug_gen.side_effect = [
                    "luna-golden-retriever",
                    "luna-golden-retriever-123",
                ]

                animal_id, action = db_service.create_animal(animal_data)

                # Verify connection pool was used
                mock_pool.get_connection_context.assert_called_once()

                # Verify two-phase slug generation with pool connection
                assert mock_slug_gen.call_count == 2
                # Both calls should use pool connection
                for call_args in mock_slug_gen.call_args_list:
                    assert call_args[1]["name"] == "Luna"
                    assert call_args[1]["breed"] == "Golden Retriever"
                    assert call_args[1]["standardized_breed"] == "Golden Retriever"
                    assert call_args[1]["connection"] == mock_conn

                # First call should have no animal_id, second should have ID
                assert mock_slug_gen.call_args_list[0][1]["animal_id"] is None
                assert mock_slug_gen.call_args_list[1][1]["animal_id"] == 123

    def test_update_animal_preserves_existing_slug(self):
        """Test that update_animal does not modify existing slug."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()

        # Mock existing animal data (slug should be preserved)
        # Updated to include all 16 columns that the SELECT query expects
        mock_cursor.fetchone.side_effect = [
            # First call - get current animal data (16 columns)
            (
                "Old Name",  # name
                "Old Breed",  # breed
                "Old Age",  # age_text
                "Male",  # sex
                "http://old-image.jpg",  # primary_image_url
                "available",  # status
                "Old Standardized Breed",  # standardized_breed
                24,  # age_min_months
                36,  # age_max_months
                "Medium",  # standardized_size
                '{"key": "value"}',  # properties
                "purebred",  # breed_type
                "Old Primary Breed",  # primary_breed
                None,  # secondary_breed
                "old-breed-slug",  # breed_slug
                0.95,  # breed_confidence
            ),
            # No second call needed for updates
        ]
        mock_conn.cursor.return_value = mock_cursor

        db_service = DatabaseService({"host": "test", "user": "test", "database": "test"})
        db_service.conn = mock_conn

        animal_data = {
            "name": "New Name",
            "breed": "New Breed",
            "organization_id": 1,
            "external_id": "test-update-123",
        }

        # Mock standardize_breed for update
        with patch("services.database_service.standardize_breed") as mock_standardize:
            mock_standardize.return_value = (
                "New Standardized Breed",
                "Working",
                "Large",
            )

            with patch("services.database_service.parse_age_text") as mock_parse_age:
                # Create a mock object with min_months and max_months attributes
                mock_age_info = MagicMock()
                mock_age_info.min_months = 12
                mock_age_info.max_months = 24
                mock_parse_age.return_value = mock_age_info

                animal_id, action = db_service.update_animal(123, animal_data)

                # Verify UPDATE query was called
                update_calls = [call for call in mock_cursor.execute.call_args_list if call[0][0].strip().upper().startswith("UPDATE")]

                assert len(update_calls) > 0
                update_sql = update_calls[0][0][0]

                # Verify the main slug field is NOT in the UPDATE statement (should be preserved)
                # Note: breed_slug is OK to update, we're checking the main slug field isn't modified
                # Split by commas and check that 'slug =' is not present (but 'breed_slug =' is OK)
                update_fields = update_sql.lower().split(",")
                slug_updates = [field for field in update_fields if "slug =" in field and "breed_slug =" not in field]
                assert len(slug_updates) == 0, "Main slug field should not be updated"

    def test_create_animal_slug_with_empty_name_fallback(self):
        """Test slug generation with empty name uses fallback (two-phase)."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        # Mock for INSERT returning ID (only fetchone that matters since slug generation is mocked)
        mock_cursor.fetchone.return_value = (123,)
        mock_conn.cursor.return_value = mock_cursor

        db_service = DatabaseService({"host": "test", "user": "test", "database": "test"})

        animal_data = {
            "name": "",
            "breed": "Mixed Breed",
            "organization_id": 1,
            "external_id": "test-empty-name",
        }  # Empty name

        # Mock standardize_breed for empty name test
        with patch("services.database_service.standardize_breed") as mock_standardize:
            mock_standardize.return_value = ("Mixed Breed", "Unknown", None)

            with patch("services.database_service.generate_unique_animal_slug") as mock_slug_gen:
                mock_slug_gen.side_effect = [
                    "animal-mixed-breed",
                    "animal-mixed-breed-123",
                ]

                animal_id, action = db_service._create_animal_with_connection(mock_conn, animal_data)

                # Verify two-phase slug generation with empty name
                assert mock_slug_gen.call_count == 2

                # Both calls should have empty name and use fallback
                for call_args in mock_slug_gen.call_args_list:
                    assert call_args[1]["name"] == ""
                    assert call_args[1]["breed"] == "Mixed Breed"
                    assert call_args[1]["standardized_breed"] == "Mixed Breed"
                    assert call_args[1]["connection"] == mock_conn

                # First call should have no animal_id, second should have ID
                assert mock_slug_gen.call_args_list[0][1]["animal_id"] is None
                assert mock_slug_gen.call_args_list[1][1]["animal_id"] == 123
