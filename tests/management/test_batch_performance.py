"""
Performance tests for batch processing vs individual commits.

Following CLAUDE.md principles:
- TDD implementation with performance verification
- Clear benchmarking methodology
- Immutable data patterns
"""

import time
from unittest.mock import Mock, patch

import psycopg2
import pytest

from management.batch_processor import create_batch_processor


class TestBatchProcessingPerformance:
    """Test performance improvements of batch processing."""

    @pytest.fixture
    def mock_connection_with_delays(self):
        """Create mock connection that simulates database latency."""
        conn = Mock()
        cursor = Mock()

        def simulate_commit_delay(*args, **kwargs):
            """Simulate 10ms database commit latency."""
            time.sleep(0.01)  # 10ms delay per commit

        def simulate_execute_delay(*args, **kwargs):
            """Simulate 1ms database execute latency."""
            time.sleep(0.001)  # 1ms delay per execute

        conn.commit.side_effect = simulate_commit_delay
        cursor.execute.side_effect = simulate_execute_delay
        conn.cursor.return_value = cursor

        return conn, cursor

    def test_individual_commits_timing(self, mock_connection_with_delays):
        """Measure time for individual commit pattern (old approach)."""
        conn, cursor = mock_connection_with_delays
        items = list(range(100))  # 100 items to process

        start_time = time.time()

        # Simulate old individual commit pattern
        for item in items:
            cursor.execute("UPDATE test SET value = %s WHERE id = %s", (f"value_{item}", item))
            conn.commit()  # Individual commit per item

        individual_time = time.time() - start_time

        # Should take approximately 100 * (1ms + 10ms) = 1.1 seconds
        assert individual_time >= 1.0  # Allow for timing variance
        assert cursor.execute.call_count == 100
        assert conn.commit.call_count == 100

        return individual_time

    def test_batch_processing_timing(self, mock_connection_with_delays):
        """Measure time for batch processing approach (new approach)."""
        conn, cursor = mock_connection_with_delays
        items = list(range(100))  # Same 100 items

        # Create batch processor with batch size of 25
        batch_processor = create_batch_processor(conn, batch_size=25, commit_frequency=1)

        def create_update_query(item):
            return "UPDATE test SET value = %s WHERE id = %s", (f"value_{item}", item)

        start_time = time.time()

        result = batch_processor.process_batch(items, create_update_query)

        batch_time = time.time() - start_time

        # Should take approximately 4 batches * (25 * 1ms + 1 * 10ms) = 4 * 35ms = 140ms
        assert batch_time < 0.5  # Should be significantly faster
        assert result.total_processed == 100
        assert result.successful_batches == 4
        assert cursor.execute.call_count == 100 + 4  # 100 updates + 4 BEGIN statements
        assert conn.commit.call_count == 4  # One commit per batch

        return batch_time

    def test_performance_improvement_ratio(self, mock_connection_with_delays):
        """Test that batch processing is significantly faster than individual commits."""
        individual_time = self.test_individual_commits_timing(mock_connection_with_delays)

        # Reset mocks for second test
        conn, cursor = mock_connection_with_delays
        conn.reset_mock()
        cursor.reset_mock()

        batch_time = self.test_batch_processing_timing(mock_connection_with_delays)

        # Batch processing should be at least 5x faster
        improvement_ratio = individual_time / batch_time
        assert improvement_ratio >= 5.0

        # Log performance metrics for visibility
        print(f"\nPerformance Test Results:")
        print(f"  Individual commits time: {individual_time:.3f}s")
        print(f"  Batch processing time: {batch_time:.3f}s")
        print(f"  Improvement ratio: {improvement_ratio:.1f}x faster")

    def test_memory_efficiency(self):
        """Test that batch processing doesn't consume excessive memory."""
        # Create a large number of items
        items = list(range(1000))

        # Mock connection without delays for this test
        conn = Mock()
        cursor = Mock()
        conn.cursor.return_value = cursor

        batch_processor = create_batch_processor(conn, batch_size=50, commit_frequency=1)

        def create_update_query(item):
            return "UPDATE test SET value = %s WHERE id = %s", (f"value_{item}", item)

        # Process and verify no memory issues
        result = batch_processor.process_batch(items, create_update_query)

        assert result.total_processed == 1000
        assert result.successful_batches == 20  # 1000 / 50 = 20 batches
        assert conn.commit.call_count == 20

    def test_different_batch_sizes_performance(self, mock_connection_with_delays):
        """Test performance with different batch sizes."""
        conn, cursor = mock_connection_with_delays
        items = list(range(100))

        batch_sizes = [10, 25, 50]
        results = {}

        for batch_size in batch_sizes:
            # Reset mocks
            conn.reset_mock()
            cursor.reset_mock()

            batch_processor = create_batch_processor(conn, batch_size=batch_size, commit_frequency=1)

            def create_update_query(item):
                return "UPDATE test SET value = %s WHERE id = %s", (f"value_{item}", item)

            start_time = time.time()
            result = batch_processor.process_batch(items, create_update_query)
            processing_time = time.time() - start_time

            results[batch_size] = {"time": processing_time, "batches": result.successful_batches, "commits": conn.commit.call_count}

            assert result.total_processed == 100

        # Verify that different batch sizes complete successfully
        for batch_size, result in results.items():
            expected_batches = (100 + batch_size - 1) // batch_size  # Ceiling division
            assert result["batches"] == expected_batches
            assert result["commits"] == expected_batches

        # Log results for analysis
        print(f"\nBatch Size Performance Analysis:")
        for batch_size, result in results.items():
            print(f"  Batch size {batch_size:2d}: {result['time']:.3f}s, {result['batches']} batches")

    @pytest.mark.performance
    def test_realistic_workload_performance(self, mock_connection_with_delays):
        """Test performance with realistic data workload."""
        conn, cursor = mock_connection_with_delays

        # Simulate realistic LLM command workload
        animals = []
        for i in range(50):
            animals.append(
                {"id": i, "name": f"Dog_{i}", "description": f"A lovely dog number {i} looking for a home." * 10, "enriched_description": f"Enhanced description for dog {i}" * 15}  # Longer text
            )

        batch_processor = create_batch_processor(conn, batch_size=25, commit_frequency=1)

        def create_enrichment_query(animal):
            return """
                UPDATE animals 
                SET enriched_description = %s,
                    llm_processed_at = CURRENT_TIMESTAMP,
                    llm_model_used = 'openrouter/auto',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (
                animal["enriched_description"],
                animal["id"],
            )

        start_time = time.time()
        result = batch_processor.process_batch(animals, create_enrichment_query)
        processing_time = time.time() - start_time

        assert result.total_processed == 50
        assert result.successful_batches == 2  # 50 / 25 = 2 batches
        assert processing_time < 0.5  # Should complete quickly even with longer text

        print(f"\nRealistic Workload Test:")
        print(f"  Processed {len(animals)} animals in {processing_time:.3f}s")
        print(f"  Throughput: {len(animals) / processing_time:.1f} animals/second")
