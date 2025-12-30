"""
Tests for enhanced animals API improvements.

Specifically tests:
- Cache invalidation methods
- Retry logic for database operations
- Monitoring metrics endpoint
- SHA256 cache key optimization
- Error handling with custom exceptions
- Observability logging
"""

from unittest.mock import MagicMock, call, patch

import pytest
from psycopg2 import OperationalError
from psycopg2.extras import RealDictCursor

from api.exceptions import DatabaseRetryExhaustedError
from api.services.enhanced_animal_service import EnhancedAnimalService


@pytest.mark.unit
class TestCacheInvalidation:
    """Test cache invalidation functionality."""

    @pytest.fixture
    def service(self):
        """Create service with mock cursor."""
        cursor = MagicMock(spec=RealDictCursor)
        return EnhancedAnimalService(cursor)

    @pytest.mark.fast
    def test_invalidate_specific_animal(self, service):
        """Test invalidating cache for specific animal."""
        # Add some data to caches
        service._detail_cache[123] = {"test": "data"}
        service._content_cache["content_123"] = {"content": "data"}
        service._bulk_cache["hash123"] = [{"bulk": "data"}]

        # Invalidate specific animal
        service.invalidate_cache(animal_id=123)

        # Verify detail and content caches cleared for this animal
        assert 123 not in service._detail_cache
        assert "content_123" not in service._content_cache
        # Bulk cache should be cleared (we can't efficiently check specific IDs)
        assert len(service._bulk_cache) == 0

    @pytest.mark.fast
    def test_invalidate_all_caches(self, service):
        """Test invalidating all caches."""
        # Add data to all caches
        service._detail_cache[123] = {"test": "data"}
        service._detail_cache[124] = {"test": "data2"}
        service._content_cache["content_123"] = {"content": "data"}
        service._bulk_cache["hash123"] = [{"bulk": "data"}]

        # Invalidate all
        service.invalidate_cache()

        # Verify all caches are empty
        assert len(service._detail_cache) == 0
        assert len(service._content_cache) == 0
        assert len(service._bulk_cache) == 0

    @pytest.mark.fast
    def test_invalidate_bulk_cache_only(self, service):
        """Test invalidating only bulk cache."""
        # Add data to caches
        service._detail_cache[123] = {"test": "data"}
        service._bulk_cache["hash123"] = [{"bulk": "data"}]

        # Invalidate only bulk cache
        service.invalidate_bulk_cache()

        # Verify only bulk cache is cleared
        assert len(service._bulk_cache) == 0
        assert len(service._detail_cache) == 1


@pytest.mark.unit
class TestRetryLogic:
    """Test database retry logic with exponential backoff."""

    @pytest.fixture
    def service(self):
        """Create service with mock cursor."""
        cursor = MagicMock(spec=RealDictCursor)
        return EnhancedAnimalService(cursor, max_retries=3)

    @pytest.mark.fast
    def test_retry_on_operational_error(self, service):
        """Test retry logic for operational errors."""
        # Make execute fail twice, then succeed
        service.cursor.execute.side_effect = [
            OperationalError("Connection lost"),
            OperationalError("Connection lost"),
            None,
        ]  # Success on third try

        with patch("time.sleep") as mock_sleep:
            service._execute_with_retry("SELECT 1")

        # Verify retries happened with exponential backoff
        assert service.cursor.execute.call_count == 3
        assert mock_sleep.call_count == 2
        # Check exponential backoff: 0.1s, 0.2s
        mock_sleep.assert_has_calls([call(0.1), call(0.2)])

    @pytest.mark.fast
    def test_retry_exhausted_raises_exception(self, service):
        """Test that exhausted retries raise DatabaseRetryExhaustedError."""
        # Make all attempts fail
        service.cursor.execute.side_effect = OperationalError("Connection lost")

        with patch("time.sleep"):
            with pytest.raises(DatabaseRetryExhaustedError) as exc_info:
                service._execute_with_retry("SELECT 1")

        assert "after 3 retries" in str(exc_info.value)
        assert service.cursor.execute.call_count == 3

    @pytest.mark.fast
    def test_non_transient_error_no_retry(self, service):
        """Test that non-transient errors don't trigger retries."""
        # Make execute fail with non-transient error
        service.cursor.execute.side_effect = ValueError("Invalid query")

        with pytest.raises(ValueError):
            service._execute_with_retry("SELECT 1")

        # Should not retry for non-transient errors
        assert service.cursor.execute.call_count == 1


@pytest.mark.unit
class TestCacheKeyOptimization:
    """Test SHA256 cache key generation for memory efficiency."""

    @pytest.fixture
    def service(self):
        """Create service with mock cursor."""
        cursor = MagicMock(spec=RealDictCursor)
        return EnhancedAnimalService(cursor)

    @pytest.mark.fast
    def test_bulk_cache_key_generation(self, service):
        """Test SHA256 hash generation for bulk cache keys."""
        # Test with unsorted IDs
        animal_ids = [456, 123, 789]
        key = service._generate_bulk_cache_key(animal_ids)

        # Verify key is a 16-character hex string
        assert len(key) == 16
        assert all(c in "0123456789abcdef" for c in key)

        # Verify same IDs in different order produce same key
        key2 = service._generate_bulk_cache_key([789, 123, 456])
        assert key == key2

    @pytest.mark.fast
    def test_bulk_cache_key_uniqueness(self, service):
        """Test that different ID sets produce different keys."""
        key1 = service._generate_bulk_cache_key([1, 2, 3])
        key2 = service._generate_bulk_cache_key([1, 2, 4])
        key3 = service._generate_bulk_cache_key([1, 2, 3, 4])

        # All keys should be different
        assert key1 != key2
        assert key1 != key3
        assert key2 != key3


@pytest.mark.unit
class TestMetricsCollection:
    """Test metrics collection and reporting."""

    @pytest.fixture
    def service(self):
        """Create service with mock cursor."""
        cursor = MagicMock(spec=RealDictCursor)
        cursor.fetchone.return_value = {
            "id": 123,
            "name": "Test Dog",
            "slug": "test-dog",
            "dog_profiler_data": {"description": "Test"},
            "has_data": True,
        }
        cursor.fetchall.return_value = []
        return EnhancedAnimalService(cursor)

    @pytest.mark.fast
    def test_cache_hit_metrics(self, service):
        """Test cache hit metrics are tracked."""
        # Populate cache
        service.get_enhanced_detail(123)

        # Access again (cache hit)
        service.get_enhanced_detail(123)

        # Check metrics
        assert service._metrics["cache_hits"]["detail"] == 1
        assert service._metrics["cache_misses"]["detail"] == 1

    @pytest.mark.fast
    def test_db_query_metrics(self, service):
        """Test database query metrics are tracked."""
        # Make some queries
        service.get_enhanced_detail(123)
        service.get_detail_content([456, 789])

        # Check metrics
        assert service._metrics["db_queries"].get("content", 0) == 1
        assert service._metrics["cache_misses"]["detail"] == 1

    @pytest.mark.fast
    def test_response_time_tracking(self, service):
        """Test response time tracking."""
        # Make a query
        service.get_enhanced_detail(123)

        # Check response times are tracked
        assert len(service._metrics["response_times"]) > 0
        assert all(t >= 0 for t in service._metrics["response_times"])

    @pytest.mark.fast
    def test_get_metrics_output(self, service):
        """Test comprehensive metrics output."""
        # Generate some activity
        service.get_enhanced_detail(123)
        service.get_enhanced_detail(123)  # Cache hit

        metrics = service.get_metrics()

        # Verify structure
        assert "cache_stats" in metrics
        assert "cache_hits" in metrics
        assert "cache_misses" in metrics
        assert "db_queries" in metrics
        assert "response_times" in metrics

        # Verify cache stats
        cache_stats = metrics["cache_stats"]
        assert cache_stats["detail_hit_rate"] > 0

        # Verify response time stats
        rt_stats = metrics["response_times"]
        assert rt_stats["count"] > 0
        assert rt_stats["avg_ms"] >= 0


@pytest.mark.unit
class TestErrorHandling:
    """Test custom exception handling."""

    @pytest.fixture
    def service(self):
        """Create service with mock cursor."""
        cursor = MagicMock(spec=RealDictCursor)
        return EnhancedAnimalService(cursor)

    @pytest.mark.fast
    def test_database_retry_exhausted_error(self, service):
        """Test DatabaseRetryExhaustedError contains proper context."""
        service.cursor.execute.side_effect = OperationalError("Connection lost")

        with patch("time.sleep"):
            with pytest.raises(DatabaseRetryExhaustedError) as exc_info:
                service._execute_with_retry(
                    "SELECT * FROM animals WHERE id = %s", (123,)
                )

        error = exc_info.value
        assert error.operation == "execute_query"
        assert "SELECT * FROM animals" in error.details["query"]
        assert error.to_dict()["error"] == "DatabaseRetryExhaustedError"

    @pytest.mark.fast
    def test_boolean_normalization(self, service):
        """Test boolean normalization handles various formats."""
        # Test various true values
        assert service._normalize_boolean("yes") is True
        assert service._normalize_boolean("true") is True
        assert service._normalize_boolean("1") is True
        assert service._normalize_boolean(True) is True

        # Test various false values
        assert service._normalize_boolean("no") is False
        assert service._normalize_boolean("false") is False
        assert service._normalize_boolean("0") is False
        assert service._normalize_boolean(False) is False

        # Test uncertain values
        assert service._normalize_boolean("unknown") is None
        assert service._normalize_boolean("selective") is None
        assert service._normalize_boolean("maybe") is None
        assert service._normalize_boolean(None) is None


@pytest.mark.integration
@pytest.mark.database
class TestMetricsEndpoint:
    """Test the metrics endpoint integration."""

    @pytest.fixture
    def client(self):
        """Create test client with mocked dependencies."""
        from unittest.mock import MagicMock

        from fastapi.testclient import TestClient
        from psycopg2.extras import RealDictCursor

        from api.dependencies import get_pooled_db_cursor
        from api.main import app

        # Create mock cursor
        mock_cursor = MagicMock(spec=RealDictCursor)
        mock_cursor.fetchone = MagicMock(return_value={"total_animals": 1000})

        app.dependency_overrides[get_pooled_db_cursor] = lambda: mock_cursor
        client = TestClient(app)

        yield client

        # Clean up
        app.dependency_overrides.clear()

    def test_metrics_endpoint_structure(self, client):
        """Test metrics endpoint returns correct structure."""
        response = client.get("/api/animals/enhanced/metrics")

        assert response.status_code == 200
        data = response.json()

        # Verify all expected keys are present
        assert "cache_stats" in data
        assert "cache_hits" in data
        assert "cache_misses" in data
        assert "db_queries" in data
        assert "db_retries" in data
        assert "errors" in data
        assert "response_times" in data

        # Verify cache stats structure
        cache_stats = data["cache_stats"]
        assert "detail_cache_size" in cache_stats
        assert "bulk_cache_size" in cache_stats
        assert "content_cache_size" in cache_stats
        assert "detail_hit_rate" in cache_stats
        assert "content_hit_rate" in cache_stats
        assert "bulk_hit_rate" in cache_stats

        # Verify response times structure
        rt = data["response_times"]
        assert "count" in rt
        assert "avg_ms" in rt
        assert "p50_ms" in rt
        assert "p95_ms" in rt
        assert "p99_ms" in rt
