"""
Test to verify the memory leak fix in LLM Data Service.

This test demonstrates that the LRU cache prevents unbounded memory growth
that was previously caused by the unbounded dictionary cache.
"""

from unittest.mock import Mock, patch

import pytest

from services.llm_data_service import OpenRouterLLMDataService


class TestMemoryLeakFix:
    """Test that the memory leak in LLM service cache is fixed."""

    @pytest.fixture
    def service_with_tiny_cache(self):
        """Create service with very small cache for memory leak testing."""
        with patch("httpx.AsyncClient"):
            return OpenRouterLLMDataService(api_key="test-key", cache_enabled=True, max_cache_size=2)  # Very small cache to test eviction

    @pytest.mark.asyncio
    async def test_memory_leak_prevented_by_lru_cache(self, service_with_tiny_cache):
        """Test that cache doesn't grow unboundedly - memory leak is prevented."""
        # Setup mock response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {"id": "test-id", "model": "openrouter/auto", "choices": [{"message": {"content": "response"}}]}

        from unittest.mock import AsyncMock

        service_with_tiny_cache.client.post = AsyncMock(return_value=mock_response)

        # Fill cache beyond capacity
        await service_with_tiny_cache.clean_description("Item 1")
        await service_with_tiny_cache.clean_description("Item 2")

        # Verify cache is at capacity
        assert len(service_with_tiny_cache.cache) == 2

        # Add more items - should not exceed max_size
        await service_with_tiny_cache.clean_description("Item 3")
        await service_with_tiny_cache.clean_description("Item 4")
        await service_with_tiny_cache.clean_description("Item 5")

        # Cache size should remain bounded at max_size
        assert len(service_with_tiny_cache.cache) == 2
        assert len(service_with_tiny_cache.cache) <= service_with_tiny_cache.max_cache_size

    def test_lru_cache_has_configurable_size_limit(self):
        """Test that LRU cache has configurable size limit."""
        with patch("httpx.AsyncClient"):
            service = OpenRouterLLMDataService(api_key="test-key", cache_enabled=True, max_cache_size=500)

        assert service.max_cache_size == 500
        assert service.cache.max_size == 500

    def test_default_cache_size_is_reasonable(self):
        """Test that default cache size prevents memory issues."""
        with patch("httpx.AsyncClient"):
            service = OpenRouterLLMDataService(api_key="test-key", cache_enabled=True)

        # Default should be 500 in development environment (reasonable limit)
        assert service.max_cache_size == 500
        assert service.cache.max_size == 500

        # Should be less than problematic unlimited size
        assert service.max_cache_size < 100000

    @pytest.mark.asyncio
    async def test_cache_statistics_available_for_monitoring(self, service_with_tiny_cache):
        """Test that cache provides statistics for memory monitoring."""
        stats = service_with_tiny_cache.get_cache_stats()

        # Should have key metrics for monitoring
        assert "cache_enabled" in stats
        assert "size" in stats
        assert "max_size" in stats
        assert "hits" in stats
        assert "misses" in stats
        assert "hit_rate" in stats

        assert stats["cache_enabled"] is True
        assert stats["max_size"] == 2
        assert stats["size"] >= 0

    def test_cache_disabled_mode_prevents_memory_usage(self):
        """Test that disabled cache uses no memory."""
        with patch("httpx.AsyncClient"):
            service = OpenRouterLLMDataService(api_key="test-key", cache_enabled=False)

        assert service.cache is None
        stats = service.get_cache_stats()
        assert stats["cache_enabled"] is False
        assert "message" in stats
