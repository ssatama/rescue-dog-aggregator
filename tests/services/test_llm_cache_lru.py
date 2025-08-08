"""
Tests for LRU cache implementation in LLM Data Service.

Following CLAUDE.md principles:
- TDD mandatory - write failing tests first
- Pure functions, no mutations
- Early returns, no nested conditionals
- Immutable data patterns
"""

from unittest.mock import AsyncMock, patch

import httpx
import pytest

from services.llm_data_service import OpenRouterLLMDataService


class TestLRUCacheImplementation:
    """Test LRU cache functionality and memory leak prevention."""

    @pytest.fixture
    def mock_httpx_client(self):
        """Create a mock httpx async client."""
        return AsyncMock(spec=httpx.AsyncClient)

    @pytest.fixture
    def service_with_small_cache(self, mock_httpx_client):
        """Create service with small cache size for testing eviction."""
        with patch("httpx.AsyncClient", return_value=mock_httpx_client):
            service = OpenRouterLLMDataService(api_key="test-key", cache_enabled=True, max_cache_size=3)  # Small size for testing eviction
            service.client = mock_httpx_client
            return service

    @pytest.fixture
    def service_with_default_cache(self, mock_httpx_client):
        """Create service with default cache size."""
        with patch("httpx.AsyncClient", return_value=mock_httpx_client):
            service = OpenRouterLLMDataService(api_key="test-key", cache_enabled=True)
            service.client = mock_httpx_client
            return service

    @pytest.mark.asyncio
    async def test_cache_has_size_limit(self, service_with_default_cache):
        """Test that cache has configurable size limit to prevent memory leaks."""
        # This test should fail initially because current implementation has unbounded cache
        assert hasattr(service_with_default_cache, "max_cache_size")
        assert service_with_default_cache.max_cache_size > 0
        assert service_with_default_cache.max_cache_size <= 10000  # Reasonable upper bound

    @pytest.mark.asyncio
    async def test_cache_evicts_oldest_entries_when_full(self, service_with_small_cache, mock_httpx_client):
        """Test that LRU cache evicts oldest entries when cache is full."""
        # Setup mock responses
        from unittest.mock import Mock

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {"id": "test-id", "model": "openrouter/auto", "choices": [{"message": {"content": "cleaned"}}]}
        mock_httpx_client.post.return_value = mock_response

        # Fill cache beyond capacity (cache size = 3)
        descriptions = ["Description 1", "Description 2", "Description 3", "Description 4"]  # This should evict "Description 1"

        # Process all descriptions
        for desc in descriptions:
            await service_with_small_cache.clean_description(desc)

        # Reset mock call count
        mock_httpx_client.post.reset_mock()

        # Request first description again - should trigger API call (cache miss due to eviction)
        await service_with_small_cache.clean_description("Description 1")
        assert mock_httpx_client.post.call_count == 1

        # Request last description - should be cache hit (no API call)
        mock_httpx_client.post.reset_mock()
        await service_with_small_cache.clean_description("Description 4")
        assert mock_httpx_client.post.call_count == 0

    @pytest.mark.asyncio
    async def test_cache_key_generation_is_consistent(self, service_with_default_cache):
        """Test that cache keys are generated consistently for same content."""
        key1 = service_with_default_cache._get_cache_key("test content", "clean_description")
        key2 = service_with_default_cache._get_cache_key("test content", "clean_description")

        assert key1 == key2
        assert isinstance(key1, str)
        assert len(key1) > 0

    @pytest.mark.asyncio
    async def test_cache_key_generation_is_safe(self, service_with_default_cache):
        """Test that cache keys handle special characters and unicode safely."""
        # Test with special characters
        key1 = service_with_default_cache._get_cache_key("content with émojis 🐕", "clean_description")
        key2 = service_with_default_cache._get_cache_key("content\nwith\nnewlines", "clean_description")
        key3 = service_with_default_cache._get_cache_key("content:with:colons", "clean_description")

        # Should not raise exceptions and produce valid keys
        assert isinstance(key1, str) and len(key1) > 0
        assert isinstance(key2, str) and len(key2) > 0
        assert isinstance(key3, str) and len(key3) > 0

        # Different content should produce different keys
        assert key1 != key2 != key3

    @pytest.mark.asyncio
    async def test_lru_semantics_recently_used_items_stay_cached(self, service_with_small_cache, mock_httpx_client):
        """Test that recently accessed items are kept in cache (LRU semantics)."""
        # Setup mock response
        from unittest.mock import Mock

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {"id": "test-id", "model": "openrouter/auto", "choices": [{"message": {"content": "result"}}]}
        mock_httpx_client.post.return_value = mock_response

        # Fill cache to capacity
        await service_with_small_cache.clean_description("Item 1")
        await service_with_small_cache.clean_description("Item 2")
        await service_with_small_cache.clean_description("Item 3")

        # Access Item 1 to make it recently used
        mock_httpx_client.post.reset_mock()
        await service_with_small_cache.clean_description("Item 1")  # Should be cache hit
        assert mock_httpx_client.post.call_count == 0

        # Add new item - should evict Item 2 (least recently used), not Item 1
        await service_with_small_cache.clean_description("Item 4")

        # Item 1 should still be cached (no API call)
        mock_httpx_client.post.reset_mock()
        await service_with_small_cache.clean_description("Item 1")
        assert mock_httpx_client.post.call_count == 0

        # Item 2 should be evicted (API call required)
        mock_httpx_client.post.reset_mock()
        await service_with_small_cache.clean_description("Item 2")
        assert mock_httpx_client.post.call_count == 1

    @pytest.mark.asyncio
    async def test_cache_disabled_mode_works_without_caching(self, mock_httpx_client):
        """Test that service works correctly when caching is disabled."""
        with patch("httpx.AsyncClient", return_value=mock_httpx_client):
            service = OpenRouterLLMDataService(api_key="test-key", cache_enabled=False)
            service.client = mock_httpx_client

        # Setup mock response - using regular Mock for json method
        from unittest.mock import Mock

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {"id": "test-id", "model": "openrouter/auto", "choices": [{"message": {"content": "result"}}]}
        mock_httpx_client.post.return_value = mock_response

        # Same request twice should trigger two API calls (no caching)
        await service.clean_description("test description")
        await service.clean_description("test description")

        assert mock_httpx_client.post.call_count == 2

    @pytest.mark.asyncio
    async def test_cache_stats_and_monitoring(self, service_with_default_cache):
        """Test that cache provides statistics for monitoring memory usage."""
        # This test ensures we can monitor cache effectiveness
        assert hasattr(service_with_default_cache, "get_cache_stats") or hasattr(service_with_default_cache, "cache_info")
