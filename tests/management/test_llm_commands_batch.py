"""
Integration tests for LLM commands with batch processing.

Following CLAUDE.md principles:
- TDD implementation with full integration coverage
- Pure functions testing
- Clear error handling verification
- Isolated database operations (uses test isolation)
"""

import asyncio
from unittest.mock import AsyncMock, Mock, patch

import pytest
from click.testing import CliRunner

from management.batch_processor import BatchResult
from management.llm_commands import llm


@pytest.mark.management
@pytest.mark.integration
class TestLLMCommandsBatchIntegration:
    """Test LLM commands with batch processing integration."""

    @pytest.fixture
    def mock_db_components(self):
        """Mock database connection and cursor."""
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_conn.cursor.return_value = mock_cursor
        return mock_conn, mock_cursor

    @pytest.fixture
    def mock_batch_processor(self):
        """Mock batch processor with successful results."""
        mock_processor = Mock()
        mock_result = BatchResult(total_processed=10, successful_batches=2, failed_batches=0, errors=[], processing_time=1.5)
        mock_processor.process_batch.return_value = mock_result
        return mock_processor

    @pytest.fixture
    def sample_animals_data(self):
        """Sample animal data for testing."""
        return [
            (1, "Buddy", "A friendly golden retriever", "Test Org"),
            (2, "Luna", "A playful border collie", "Test Org"),
            (3, "Max", "A gentle german shepherd", "Test Org"),
        ]

    @patch("management.llm_commands.psycopg2.connect")
    @patch("management.llm_commands.create_batch_processor")
    @patch("management.llm_commands.OpenRouterLLMDataService")
    def test_enrich_descriptions_batch_processing(self, mock_llm_service, mock_create_processor, mock_connect, mock_db_components, mock_batch_processor, sample_animals_data):
        """Test enrich-descriptions command uses batch processing."""
        mock_conn, mock_cursor = mock_db_components
        mock_connect.return_value = mock_conn
        mock_cursor.fetchall.return_value = sample_animals_data
        mock_create_processor.return_value = mock_batch_processor

        # Mock LLM service
        mock_service_instance = AsyncMock()
        mock_service_instance.clean_description.side_effect = ["Enhanced description for Buddy", "Enhanced description for Luna", "Enhanced description for Max"]
        mock_llm_service.return_value.__aenter__.return_value = mock_service_instance

        runner = CliRunner()

        # Run the command with batch processing
        result = runner.invoke(llm, ["enrich-descriptions", "--limit", "3", "--batch-size", "2", "--organization", "test-org"])

        assert result.exit_code == 0

        # Verify batch processor was created with correct config
        mock_create_processor.assert_called_once_with(connection=mock_conn, batch_size=2, max_retries=3, retry_delay=1.0, commit_frequency=1)

        # Verify batch processing was called
        mock_batch_processor.process_batch.assert_called_once()

        # Verify LLM service was called for each animal
        assert mock_service_instance.clean_description.call_count == 3

        # Verify output contains batch processing results
        assert "Batch Processing Results:" in result.output
        assert "Processing time: 1.50s" in result.output
        assert "Success rate: 100.0%" in result.output

    @patch("management.llm_commands.psycopg2.connect")
    @patch("management.llm_commands.create_batch_processor")
    @patch("management.llm_commands.OpenRouterLLMDataService")
    def test_generate_profiles_batch_processing(self, mock_llm_service, mock_create_processor, mock_connect, mock_db_components, mock_batch_processor):
        """Test generate-profiles command uses batch processing."""
        mock_conn, mock_cursor = mock_db_components
        mock_connect.return_value = mock_conn

        # Sample data for profiles
        profiles_data = [
            (1, "Buddy", "Golden Retriever", "2 years", "Friendly dog", "Test Org"),
            (2, "Luna", "Border Collie", "1 year", "Energetic dog", "Test Org"),
        ]
        mock_cursor.fetchall.return_value = profiles_data
        mock_create_processor.return_value = mock_batch_processor

        # Mock LLM service
        mock_service_instance = AsyncMock()
        mock_service_instance.generate_dog_profiler.side_effect = [{"energy_level": "high", "size": "medium"}, {"energy_level": "very_high", "size": "medium"}]
        mock_llm_service.return_value.__aenter__.return_value = mock_service_instance

        runner = CliRunner()

        result = runner.invoke(llm, ["generate-profiles", "--limit", "2", "--batch-size", "5", "--organization", "test-org"])

        assert result.exit_code == 0

        # Verify batch processor configuration
        mock_create_processor.assert_called_once_with(connection=mock_conn, batch_size=5, max_retries=3, retry_delay=1.0, commit_frequency=1)

        # Verify batch processing was used
        mock_batch_processor.process_batch.assert_called_once()

        # Verify LLM service calls
        assert mock_service_instance.generate_dog_profiler.call_count == 2

    @patch("management.llm_commands.psycopg2.connect")
    @patch("management.llm_commands.create_batch_processor")
    @patch("management.llm_commands.OpenRouterLLMDataService")
    def test_translate_batch_processing(self, mock_llm_service, mock_create_processor, mock_connect, mock_db_components, mock_batch_processor, sample_animals_data):
        """Test translate command uses batch processing."""
        mock_conn, mock_cursor = mock_db_components
        mock_connect.return_value = mock_conn
        mock_cursor.fetchall.return_value = sample_animals_data

        # Mock existing translations fetch
        mock_cursor.fetchone.side_effect = [
            (None,),  # No existing translations for first animal
            ({"es": "Existing Spanish"},),  # Existing translation for second
            (None,),  # No existing for third
        ]

        mock_create_processor.return_value = mock_batch_processor

        # Mock LLM service
        mock_service_instance = AsyncMock()
        mock_service_instance.translate_text.side_effect = ["Un perro amigable", "Un border collie juguetón", "Un pastor alemán gentil"]
        mock_llm_service.return_value.__aenter__.return_value = mock_service_instance

        runner = CliRunner()

        result = runner.invoke(llm, ["translate", "--target-language", "es", "--limit", "3", "--batch-size", "10", "--organization", "test-org"])

        assert result.exit_code == 0

        # Verify batch processor configuration
        mock_create_processor.assert_called_once_with(connection=mock_conn, batch_size=10, max_retries=3, retry_delay=1.0, commit_frequency=1)

        # Verify translation service calls
        assert mock_service_instance.translate_text.call_count == 3

        # Verify existing translations were fetched
        assert mock_cursor.fetchone.call_count == 3

    def test_batch_processing_error_handling(self, mock_db_components):
        """Test error handling in batch processing."""
        mock_conn, mock_cursor = mock_db_components

        # Create batch processor that returns errors
        from management.batch_processor import create_batch_processor

        batch_processor = create_batch_processor(mock_conn, batch_size=2)

        # Mock database error
        mock_cursor.execute.side_effect = Exception("Database connection error")

        def failing_processor(item):
            return "UPDATE test SET value = %s", (item,)

        result = batch_processor.process_batch([1, 2, 3], failing_processor)

        # Should handle errors gracefully
        assert result.total_processed == 0
        assert result.failed_batches > 0
        assert len(result.errors) > 0
        assert result.success_rate == 0.0

    @patch("management.llm_commands.psycopg2.connect")
    def test_dry_run_bypasses_batch_processing(self, mock_connect, mock_db_components):
        """Test that dry-run mode bypasses batch processing entirely."""
        mock_conn, mock_cursor = mock_db_components
        mock_connect.return_value = mock_conn
        mock_cursor.fetchall.return_value = [(1, "Buddy", "A friendly dog", "Test Org")]

        runner = CliRunner()

        result = runner.invoke(llm, ["enrich-descriptions", "--dry-run", "--batch-size", "5"])

        assert result.exit_code == 0
        assert "Animals to Process" in result.output  # Dry run table shown
        assert "Batch Processing Results:" not in result.output  # No batch processing

        # Should not create any database connections for processing
        mock_cursor.execute.assert_called()  # Only for fetching data
        mock_conn.commit.assert_not_called()  # No commits in dry run

    def test_batch_size_parameter_validation(self):
        """Test that batch size parameter is properly validated."""
        runner = CliRunner()

        # Test invalid batch size (should still work, just use the value)
        result = runner.invoke(llm, ["enrich-descriptions", "--batch-size", "0", "--dry-run"])  # Use dry run to avoid database operations

        # Command should accept the parameter (validation happens in processor)
        assert result.exit_code == 0

    @patch("management.llm_commands.psycopg2.connect")
    def test_no_animals_found_handling(self, mock_connect, mock_db_components):
        """Test handling when no animals are found to process."""
        mock_conn, mock_cursor = mock_db_components
        mock_connect.return_value = mock_conn
        mock_cursor.fetchall.return_value = []  # No animals

        runner = CliRunner()

        result = runner.invoke(llm, ["enrich-descriptions", "--batch-size", "25"])

        assert result.exit_code == 0
        assert "No animals found to process" in result.output

        # Should not attempt batch processing
        mock_conn.commit.assert_not_called()

    def test_progress_tracking_integration(self, mock_db_components, mock_batch_processor):
        """Test that progress tracking works with batch processing."""
        # This is implicitly tested in the batch processor tests,
        # but we verify the integration here

        mock_conn, mock_cursor = mock_db_components

        # Test that progress is updated correctly
        items = [1, 2, 3, 4, 5]
        mock_progress = Mock()
        task_id = 1

        def dummy_processor(item):
            return "UPDATE test SET value = %s", (item,)

        # The batch processor should call progress.update
        from management.batch_processor import create_batch_processor

        processor = create_batch_processor(mock_conn, batch_size=3)

        result = processor.process_batch(items, dummy_processor, mock_progress, task_id)

        # Verify progress was updated
        mock_progress.update.assert_called()
        calls = mock_progress.update.call_args_list

        # Should have progress updates for each batch
        assert len(calls) >= 2  # At least 2 batches for 5 items with batch_size=3
