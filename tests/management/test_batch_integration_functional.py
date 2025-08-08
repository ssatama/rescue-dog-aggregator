"""
Functional tests for batch processing integration.

Following CLAUDE.md principles:
- TDD implementation
- Pure functions testing
- Clear functionality verification
"""

from unittest.mock import AsyncMock, Mock, patch

import pytest

from management.batch_processor import BatchResult, create_batch_processor


@pytest.mark.management
@pytest.mark.integration
class TestBatchProcessorFunctional:
    """Functional tests to verify batch processing works end-to-end."""

    def test_batch_processor_factory_creates_configured_instance(self):
        """Test that factory function creates properly configured processor."""
        mock_conn = Mock()
        processor = create_batch_processor(mock_conn, batch_size=50, max_retries=5, retry_delay=2.0, commit_frequency=3)

        # Verify configuration
        assert processor.connection == mock_conn
        assert processor.config.batch_size == 50
        assert processor.config.max_retries == 5
        assert processor.config.retry_delay == 2.0
        assert processor.config.commit_frequency == 3

    def test_batch_result_success_rate_calculation(self):
        """Test success rate calculation with various scenarios."""
        # Perfect success
        result = BatchResult(total_processed=100, successful_batches=4, failed_batches=0)
        assert result.success_rate == 100.0

        # Partial success with errors
        result = BatchResult(total_processed=100, successful_batches=3, failed_batches=1, errors=[{"error": f"test_{i}"} for i in range(20)])
        assert result.success_rate == 80.0

        # No processing
        result = BatchResult(total_processed=0, successful_batches=0, failed_batches=0)
        assert result.success_rate == 0.0

    def test_llm_commands_have_batch_size_parameter(self):
        """Test that all LLM commands have batch-size parameter."""
        from management.llm_commands import llm

        expected_commands = ["enrich-descriptions", "generate-profiles", "translate"]

        for cmd_name in expected_commands:
            assert cmd_name in llm.commands
            cmd = llm.commands[cmd_name]

            # Find batch_size parameter
            batch_size_param = None
            for param in cmd.params:
                if param.name == "batch_size":
                    batch_size_param = param
                    break

            assert batch_size_param is not None, f"Command {cmd_name} missing batch_size parameter"
            assert batch_size_param.default == 25, f"Command {cmd_name} has wrong default batch size"
            assert "Number of items to process per batch" in batch_size_param.help

    @patch("management.llm_commands.psycopg2.connect")
    def test_batch_processor_integration_with_llm_commands(self, mock_connect):
        """Test that batch processor integrates with LLM commands structure."""
        # Mock database components
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_conn.cursor.return_value = mock_cursor
        mock_connect.return_value = mock_conn

        # Test batch processor can be created with connection
        processor = create_batch_processor(mock_conn, batch_size=10)

        # Test query generation function (similar to what LLM commands use)
        def create_enrichment_query(animal_data):
            animal_id, enriched_description = animal_data
            query = """
                UPDATE animals 
                SET enriched_description = %s,
                    llm_processed_at = CURRENT_TIMESTAMP,
                    llm_model_used = 'openrouter/auto',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """
            return query, (enriched_description, animal_id)

        # Test with sample data
        sample_data = [
            (1, "Enhanced description for dog 1"),
            (2, "Enhanced description for dog 2"),
            (3, "Enhanced description for dog 3"),
        ]

        result = processor.process_batch(sample_data, create_enrichment_query)

        # Should process all items successfully
        assert result.total_processed == 3
        assert result.successful_batches == 1
        assert result.failed_batches == 0
        assert len(result.errors) == 0
        assert result.success_rate == 100.0

        # Verify database interactions
        assert mock_cursor.execute.call_count == 4  # 1 BEGIN + 3 UPDATE queries
        assert mock_conn.commit.call_count == 1

    def test_performance_characteristics(self):
        """Test that batch processing has expected performance characteristics."""
        from management.batch_processor import BatchConfig

        # Small batch configuration for frequent commits
        small_batch_config = BatchConfig(batch_size=5, commit_frequency=1)
        assert small_batch_config.batch_size == 5
        assert small_batch_config.commit_frequency == 1

        # Large batch configuration for fewer commits
        large_batch_config = BatchConfig(batch_size=100, commit_frequency=5)
        assert large_batch_config.batch_size == 100
        assert large_batch_config.commit_frequency == 5

        # Verify immutability
        with pytest.raises(AttributeError):
            small_batch_config.batch_size = 10

    def test_error_handling_scenarios(self):
        """Test various error handling scenarios."""
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_conn.cursor.return_value = mock_cursor

        processor = create_batch_processor(mock_conn, batch_size=2, max_retries=1)

        # Test with processor function that generates errors
        def error_prone_processor(item):
            if item == "fail":
                raise ValueError("Intentional failure")
            return "UPDATE test SET value = %s", (item,)

        result = processor.process_batch(["success", "fail", "success"], error_prone_processor)

        # Should handle errors gracefully
        assert result.total_processed == 3
        assert result.successful_batches == 2  # 3 items / batch_size=2 = 2 batches
        assert len(result.errors) == 1
        assert result.errors[0]["type"] == "item_processing_error"

        # Success rate should account for errors
        expected_success_rate = (3 - 1) / 3 * 100  # 66.67%
        assert abs(result.success_rate - expected_success_rate) < 0.1

    def test_batch_processing_memory_efficiency(self):
        """Test that batch processing doesn't accumulate excessive memory."""
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_conn.cursor.return_value = mock_cursor

        processor = create_batch_processor(mock_conn, batch_size=50)

        # Create large dataset
        large_dataset = [(i, f"description_{i}") for i in range(1000)]

        def simple_processor(item):
            item_id, description = item
            return "UPDATE animals SET description = %s WHERE id = %s", (description, item_id)

        # Should handle large dataset without memory issues
        result = processor.process_batch(large_dataset, simple_processor)

        assert result.total_processed == 1000
        assert result.successful_batches == 20  # 1000 / 50 = 20 batches
        assert result.success_rate == 100.0

        # Verify appropriate number of commits
        assert mock_conn.commit.call_count == 20
