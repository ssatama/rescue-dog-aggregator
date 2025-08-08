"""
Tests for database batch processing utilities.

Following CLAUDE.md principles:
- TDD implementation with comprehensive coverage
- Pure functions, no mutations
- Clear error handling verification
- Immutable data patterns
"""

import time
from typing import Tuple
from unittest.mock import Mock, call, patch

import psycopg2
import pytest

from management.batch_processor import BatchConfig, BatchResult, DatabaseBatchProcessor, create_batch_processor


@pytest.mark.management
@pytest.mark.unit
class TestBatchConfig:
    """Test BatchConfig immutable configuration."""

    def test_batch_config_defaults(self):
        config = BatchConfig()
        assert config.batch_size == 25
        assert config.max_retries == 3
        assert config.retry_delay == 1.0
        assert config.enable_progress is True
        assert config.commit_frequency == 1

    def test_batch_config_custom_values(self):
        config = BatchConfig(batch_size=50, max_retries=5, retry_delay=2.0, enable_progress=False, commit_frequency=3)
        assert config.batch_size == 50
        assert config.max_retries == 5
        assert config.retry_delay == 2.0
        assert config.enable_progress is False
        assert config.commit_frequency == 3

    def test_batch_config_immutable(self):
        config = BatchConfig()
        # Attempting to modify should raise AttributeError due to frozen=True
        with pytest.raises(AttributeError):
            config.batch_size = 100


@pytest.mark.management
@pytest.mark.unit
class TestBatchResult:
    """Test BatchResult immutable result class."""

    def test_batch_result_creation(self):
        result = BatchResult(total_processed=100, successful_batches=4, failed_batches=1, errors=[{"error": "test"}], processing_time=5.5)

        assert result.total_processed == 100
        assert result.successful_batches == 4
        assert result.failed_batches == 1
        assert len(result.errors) == 1
        assert result.processing_time == 5.5

    def test_success_rate_calculation(self):
        # 100% success rate
        result = BatchResult(total_processed=100, successful_batches=4, failed_batches=0)
        assert result.success_rate == 100.0

        # 80% success rate (20 errors out of 100)
        result = BatchResult(total_processed=100, successful_batches=4, failed_batches=1, errors=[{"error": f"test_{i}"} for i in range(20)])
        assert result.success_rate == 80.0

        # 0% when no items processed
        result = BatchResult(total_processed=0, successful_batches=0, failed_batches=0)
        assert result.success_rate == 0.0

    def test_batch_result_immutable(self):
        result = BatchResult(total_processed=100, successful_batches=4, failed_batches=1)
        # Attempting to modify should raise AttributeError due to frozen=True
        with pytest.raises(AttributeError):
            result.total_processed = 200


@pytest.mark.management
@pytest.mark.unit
class TestDatabaseBatchProcessor:
    """Test DatabaseBatchProcessor functionality."""

    @pytest.fixture
    def mock_connection(self):
        """Create mock database connection."""
        conn = Mock()
        cursor = Mock()
        conn.cursor.return_value = cursor
        return conn, cursor

    @pytest.fixture
    def processor(self, mock_connection):
        """Create batch processor with mock connection."""
        conn, cursor = mock_connection
        config = BatchConfig(batch_size=3, max_retries=2, commit_frequency=1)
        return DatabaseBatchProcessor(conn, config), conn, cursor

    def test_empty_items_list(self, processor):
        """Test processing empty list returns empty result."""
        batch_processor, conn, cursor = processor

        def dummy_processor(item):
            return "UPDATE test SET value = %s", (item,)

        result = batch_processor.process_batch([], dummy_processor)

        assert result.total_processed == 0
        assert result.successful_batches == 0
        assert result.failed_batches == 0
        assert len(result.errors) == 0
        assert result.processing_time >= 0

    def test_successful_batch_processing(self, processor):
        """Test successful processing of multiple batches."""
        batch_processor, conn, cursor = processor
        items = [1, 2, 3, 4, 5]  # Will create 2 batches (3 + 2)

        def dummy_processor(item):
            return "UPDATE test SET value = %s WHERE id = %s", (f"value_{item}", item)

        result = batch_processor.process_batch(items, dummy_processor)

        assert result.total_processed == 5
        assert result.successful_batches == 2
        assert result.failed_batches == 0
        assert len(result.errors) == 0

        # Verify database operations
        assert cursor.execute.call_count == 5 + 2  # 5 updates + 2 BEGIN statements
        assert conn.commit.call_count == 2  # One commit per batch

    def test_database_error_retry_logic(self, processor):
        """Test retry logic for database errors."""
        batch_processor, conn, cursor = processor
        items = [1, 2, 3]

        # Mock database error at cursor level (after BEGIN) on first two attempts, success on third
        cursor_execute_calls = [
            None,  # First BEGIN
            psycopg2.Error("Connection lost"),  # Error during first attempt
            None,  # Second BEGIN (retry)
            psycopg2.Error("Connection lost"),  # Error during second attempt
            None,  # Third BEGIN (final attempt)
            None,  # Successful execute for item 1
            None,  # Successful execute for item 2
            None,  # Successful execute for item 3
        ]
        cursor.execute.side_effect = cursor_execute_calls

        def dummy_processor(item):
            return "UPDATE test SET value = %s", (item,)

        result = batch_processor.process_batch(items, dummy_processor)

        assert result.total_processed == 3
        assert result.successful_batches == 1
        assert result.failed_batches == 0

        # Should have executed: 3 BEGIN + 3 successful item queries = 6 total
        assert cursor.execute.call_count == len(cursor_execute_calls)
        assert conn.rollback.call_count == 2  # Rollback on each failed attempt

    def test_max_retries_exceeded(self, processor):
        """Test behavior when max retries are exceeded."""
        batch_processor, conn, cursor = processor
        items = [1, 2, 3]

        # Mock persistent database error for all attempts
        cursor_execute_calls = [
            None,  # BEGIN (attempt 1)
            psycopg2.Error("Persistent error"),  # Error in attempt 1
            None,  # BEGIN (retry 1)
            psycopg2.Error("Persistent error"),  # Error in retry 1
            None,  # BEGIN (retry 2)
            psycopg2.Error("Persistent error"),  # Error in retry 2
        ]
        cursor.execute.side_effect = cursor_execute_calls

        def dummy_processor(item):
            return "UPDATE test SET value = %s", (item,)

        result = batch_processor.process_batch(items, dummy_processor)

        assert result.total_processed == 0
        assert result.successful_batches == 0
        assert result.failed_batches == 1
        assert len(result.errors) == 1
        assert result.errors[0]["type"] == "batch_database_error"
        assert result.errors[0]["retries"] == 2  # Max retries attempted

    def test_item_processing_error_continues_batch(self, processor):
        """Test that item processing errors don't fail entire batch."""
        batch_processor, conn, cursor = processor
        items = [1, 2, 3]

        def failing_processor(item):
            if item == 2:
                raise ValueError("Processing error for item 2")
            return "UPDATE test SET value = %s", (item,)

        result = batch_processor.process_batch(items, failing_processor)

        # Should still process the batch successfully despite individual item failure
        assert result.total_processed == 3
        assert result.successful_batches == 1
        assert result.failed_batches == 0
        assert len(result.errors) == 1
        assert result.errors[0]["type"] == "item_processing_error"
        assert result.errors[0]["position"] == 1  # Item 2 at position 1

    def test_commit_frequency(self, mock_connection):
        """Test commit frequency configuration."""
        conn, cursor = mock_connection
        config = BatchConfig(batch_size=2, commit_frequency=2)  # Commit every 2 batches
        batch_processor = DatabaseBatchProcessor(conn, config)

        items = [1, 2, 3, 4, 5, 6]  # Will create 3 batches

        def dummy_processor(item):
            return "UPDATE test SET value = %s", (item,)

        result = batch_processor.process_batch(items, dummy_processor)

        assert result.total_processed == 6
        assert result.successful_batches == 3

        # Should commit twice: after batch 2 and final commit after batch 3
        assert conn.commit.call_count == 2

    def test_unexpected_error_handling(self, processor):
        """Test handling of unexpected (non-database) errors at cursor level."""
        batch_processor, conn, cursor = processor
        items = [1, 2, 3]

        # Mock unexpected error at cursor execute level (after BEGIN)
        # This should cause a rollback and batch failure
        cursor.execute.side_effect = [
            None,  # BEGIN
            RuntimeError("Unexpected cursor error"),  # Error during cursor.execute
        ]

        def dummy_processor(item):
            return "UPDATE test SET value = %s", (item,)

        result = batch_processor.process_batch(items, dummy_processor)

        assert result.total_processed == 0
        assert result.successful_batches == 0
        assert result.failed_batches == 1
        assert len(result.errors) == 1
        assert result.errors[0]["type"] == "unexpected_error"

        # Should not retry on unexpected errors
        assert conn.rollback.call_count == 1
        assert cursor.execute.call_count == 2  # BEGIN + failed execute

    def test_item_processor_function_error_handling(self, processor):
        """Test handling of errors from the processor function itself."""
        batch_processor, conn, cursor = processor
        items = [1, 2, 3]

        def failing_processor(item):
            if item == 2:
                raise ValueError("Processing error for item 2")
            return "UPDATE test SET value = %s", (item,)

        result = batch_processor.process_batch(items, failing_processor)

        # Should still process the batch successfully despite individual item failure
        assert result.total_processed == 3
        assert result.successful_batches == 1
        assert result.failed_batches == 0
        assert len(result.errors) == 1
        assert result.errors[0]["type"] == "item_processing_error"
        assert result.errors[0]["position"] == 1  # Item 2 at position 1

    def test_progress_tracking(self, processor):
        """Test progress tracking integration."""
        batch_processor, conn, cursor = processor
        items = [1, 2, 3, 4, 5]

        mock_progress = Mock()
        task_id = 1

        def dummy_processor(item):
            return "UPDATE test SET value = %s", (item,)

        result = batch_processor.process_batch(items, dummy_processor, mock_progress, task_id)

        assert result.total_processed == 5

        # Should update progress for each batch
        expected_calls = [
            call(task_id, completed=3, description="Processed 3/5 items"),
            call(task_id, completed=5, description="Processed 5/5 items"),
        ]
        mock_progress.update.assert_has_calls(expected_calls)


@pytest.mark.management
@pytest.mark.unit
class TestCreateBatchProcessor:
    """Test factory function for creating batch processor."""

    def test_create_with_defaults(self):
        """Test creating batch processor with default configuration."""
        mock_conn = Mock()
        processor = create_batch_processor(mock_conn)

        assert isinstance(processor, DatabaseBatchProcessor)
        assert processor.connection == mock_conn
        assert processor.config.batch_size == 25
        assert processor.config.max_retries == 3
        assert processor.config.retry_delay == 1.0
        assert processor.config.commit_frequency == 1

    def test_create_with_custom_config(self):
        """Test creating batch processor with custom configuration."""
        mock_conn = Mock()
        processor = create_batch_processor(mock_conn, batch_size=50, max_retries=5, retry_delay=2.0, commit_frequency=3)

        assert isinstance(processor, DatabaseBatchProcessor)
        assert processor.connection == mock_conn
        assert processor.config.batch_size == 50
        assert processor.config.max_retries == 5
        assert processor.config.retry_delay == 2.0
        assert processor.config.commit_frequency == 3
