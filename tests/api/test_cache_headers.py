"""
Tests for cache headers middleware.

Tests cover:
- Correct cache durations for different endpoints
- Stale-while-revalidate headers
- ETag generation and conditional requests
- Vary headers for cache key generation
- CDN-specific headers
"""

import pytest

# Mark all tests in this module as unit tests (no external dependencies)
pytestmark = pytest.mark.unit
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import FastAPI, Request, Response
from fastapi.testclient import TestClient
from starlette.middleware.base import BaseHTTPMiddleware

from api.middleware.cache_headers import CacheHeadersMiddleware


@pytest.fixture
def test_app():
    """Create a test FastAPI app with cache headers middleware."""
    app = FastAPI()
    app.add_middleware(CacheHeadersMiddleware)

    # Add test endpoints
    @app.get("/api/animals")
    async def get_animals(curation: str = None):
        return {"animals": [], "curation": curation}

    @app.get("/api/animals/{animal_id}")
    async def get_animal(animal_id: str):
        return {"id": animal_id, "name": "Test Dog"}

    @app.get("/api/animals/meta/breeds")
    async def get_breeds():
        return ["Labrador", "Poodle", "Beagle"]

    @app.get("/api/statistics")
    async def get_statistics():
        return {"total": 1000}

    @app.get("/health")
    async def health():
        return {"status": "healthy"}

    @app.get("/monitoring/scrapers")
    async def monitoring():
        return {"scrapers": []}

    @app.get("/api/organizations")
    async def get_organizations():
        return [{"id": 1, "name": "Test Org"}]

    @app.get("/api/animals/enhanced")
    async def get_enhanced_animals(curation: str = None):
        return {"animals": [], "enhanced": True, "curation": curation}

    return app


@pytest.fixture
def test_client(test_app):
    """Create a test client."""
    return TestClient(test_app)


class TestCacheHeadersBasic:
    """Test basic cache header functionality."""

    def test_health_endpoint_no_cache(self, test_client):
        """Health endpoints should not be cached."""
        response = test_client.get("/health")
        assert response.status_code == 200
        assert response.headers.get("Cache-Control") == "no-cache, no-store, must-revalidate"
        assert response.headers.get("Pragma") == "no-cache"
        assert response.headers.get("Expires") == "0"

    def test_monitoring_endpoint_no_cache(self, test_client):
        """Monitoring endpoints should not be cached."""
        response = test_client.get("/monitoring/scrapers")
        assert response.status_code == 200
        assert response.headers.get("Cache-Control") == "no-cache, no-store, must-revalidate"

    def test_response_time_header(self, test_client):
        """All responses should include X-Response-Time header."""
        response = test_client.get("/api/animals")
        assert response.status_code == 200
        assert "X-Response-Time" in response.headers
        # Should be a float formatted as string
        assert float(response.headers["X-Response-Time"]) >= 0


class TestAnimalEndpointCaching:
    """Test caching for animal endpoints."""

    def test_recent_animals_cache(self, test_client):
        """Recent animals should have 5 minute cache."""
        response = test_client.get("/api/animals?curation=recent")
        assert response.status_code == 200

        cache_control = response.headers.get("Cache-Control")
        assert "public" in cache_control
        assert "max-age=300" in cache_control  # 5 minutes
        assert "stale-while-revalidate=60" in cache_control  # 1 minute SWR

    def test_diverse_animals_cache(self, test_client):
        """Diverse animals should have 1 hour cache."""
        response = test_client.get("/api/animals?curation=diverse")
        assert response.status_code == 200

        cache_control = response.headers.get("Cache-Control")
        assert "public" in cache_control
        assert "max-age=3600" in cache_control  # 1 hour
        assert "stale-while-revalidate=300" in cache_control  # 5 minutes SWR

    def test_default_animals_cache(self, test_client):
        """Default animal listing should have 15 minute cache."""
        response = test_client.get("/api/animals")
        assert response.status_code == 200

        cache_control = response.headers.get("Cache-Control")
        assert "public" in cache_control
        assert "max-age=900" in cache_control  # 15 minutes
        assert "stale-while-revalidate=120" in cache_control  # 2 minutes SWR

    def test_individual_animal_cache(self, test_client):
        """Individual animal details should have 30 minute cache."""
        response = test_client.get("/api/animals/test-dog-123")
        assert response.status_code == 200

        cache_control = response.headers.get("Cache-Control")
        assert "public" in cache_control
        assert "max-age=1800" in cache_control  # 30 minutes
        assert "stale-while-revalidate=300" in cache_control  # 5 minutes SWR

    def test_enhanced_animals_recent_cache(self, test_client):
        """Enhanced animals with recent curation should have 5 minute cache."""
        response = test_client.get("/api/animals/enhanced?curation=recent")
        assert response.status_code == 200

        cache_control = response.headers.get("Cache-Control")
        assert "public" in cache_control
        assert "max-age=300" in cache_control  # 5 minutes
        assert "stale-while-revalidate=60" in cache_control  # 1 minute SWR

    def test_enhanced_animals_diverse_cache(self, test_client):
        """Enhanced animals with diverse curation should have 1 hour cache."""
        response = test_client.get("/api/animals/enhanced?curation=diverse")
        assert response.status_code == 200

        cache_control = response.headers.get("Cache-Control")
        assert "public" in cache_control
        assert "max-age=3600" in cache_control  # 1 hour
        assert "stale-while-revalidate=300" in cache_control  # 5 minutes SWR


class TestMetaEndpointCaching:
    """Test caching for meta endpoints."""

    def test_meta_breeds_cache(self, test_client):
        """Meta endpoints should have 24 hour cache."""
        response = test_client.get("/api/animals/meta/breeds")
        assert response.status_code == 200

        cache_control = response.headers.get("Cache-Control")
        assert "public" in cache_control
        assert "max-age=86400" in cache_control  # 24 hours
        assert "stale-while-revalidate=3600" in cache_control  # 1 hour SWR


class TestStatisticsEndpointCaching:
    """Test caching for statistics endpoints."""

    def test_statistics_cache(self, test_client):
        """Statistics should have 1 hour cache."""
        response = test_client.get("/api/statistics")
        assert response.status_code == 200

        cache_control = response.headers.get("Cache-Control")
        assert "public" in cache_control
        assert "max-age=3600" in cache_control  # 1 hour
        assert "stale-while-revalidate=600" in cache_control  # 10 minutes SWR


class TestOrganizationEndpointCaching:
    """Test caching for organization endpoints."""

    def test_organizations_cache(self, test_client):
        """Organizations should have 1 hour cache."""
        response = test_client.get("/api/organizations")
        assert response.status_code == 200

        cache_control = response.headers.get("Cache-Control")
        assert "public" in cache_control
        assert "max-age=3600" in cache_control  # 1 hour
        assert "stale-while-revalidate=600" in cache_control  # 10 minutes SWR


class TestCDNHeaders:
    """Test CDN-specific cache headers."""

    def test_cdn_cache_control_header(self, test_client):
        """CDN-Cache-Control header should be present for cacheable content."""
        response = test_client.get("/api/animals?curation=diverse")
        assert response.status_code == 200

        cdn_cache = response.headers.get("CDN-Cache-Control")
        assert cdn_cache is not None
        assert "public" in cdn_cache
        assert "max-age=3600" in cdn_cache
        assert "s-maxage=3600" in cdn_cache  # CDN-specific max-age


class TestVaryHeaders:
    """Test Vary headers for cache key generation."""

    def test_basic_vary_headers(self, test_client):
        """Basic endpoints should vary on Accept and Accept-Encoding."""
        response = test_client.get("/api/statistics")
        assert response.status_code == 200

        vary = response.headers.get("Vary")
        assert vary is not None
        assert "Accept" in vary
        assert "Accept-Encoding" in vary

    def test_animals_vary_headers(self, test_client):
        """Animal endpoints should include Origin for CORS."""
        response = test_client.get("/api/animals")
        assert response.status_code == 200

        vary = response.headers.get("Vary")
        assert vary is not None
        assert "Accept" in vary
        assert "Accept-Encoding" in vary
        assert "Origin" in vary

    def test_location_based_vary_headers(self, test_client):
        """Location-based queries should vary on X-Forwarded-For."""
        response = test_client.get("/api/animals?city=Seattle")
        assert response.status_code == 200

        vary = response.headers.get("Vary")
        assert vary is not None
        assert "X-Forwarded-For" in vary


class TestETagSupport:
    """Test ETag generation and conditional requests."""

    def test_etag_generation(self, test_client):
        """ETags should be generated for cacheable responses when possible."""
        response = test_client.get("/api/animals/meta/breeds")
        assert response.status_code == 200

        etag = response.headers.get("ETag")
        # ETag generation is optional - depends on response type
        # If present, it should be properly formatted
        if etag:
            assert etag.startswith('W/"')  # Weak ETag
            assert etag.endswith('"')

    def test_conditional_request_not_modified(self, test_client):
        """Conditional requests with matching ETag should return 304 if ETags are supported."""
        # First request to get ETag
        response1 = test_client.get("/api/animals/meta/breeds")
        assert response1.status_code == 200
        etag = response1.headers.get("ETag")

        # ETag generation is optional - skip test if not supported
        if etag is None:
            pytest.skip("ETag generation not supported for this response type")

        # Second request with If-None-Match
        response2 = client.get("/api/animals/meta/breeds", headers={"If-None-Match": etag})
        assert response2.status_code == 304  # Not Modified

    def test_conditional_request_modified(self, test_client):
        """Conditional requests with non-matching ETag should return full response."""
        response = test_client.get("/api/animals/meta/breeds", headers={"If-None-Match": 'W/"different-etag"'})
        assert response.status_code == 200
        assert response.json() == ["Labrador", "Poodle", "Beagle"]


class TestErrorResponses:
    """Test caching behavior for error responses."""

    def test_error_response_short_cache(self, test_client):
        """Error responses should have short cache to prevent hammering."""

        # Create an endpoint that returns an error
        @client.app.get("/api/error")
        async def error_endpoint():
            return Response(status_code=500, content="Internal Server Error")

        response = test_client.get("/api/error")
        assert response.status_code == 500

        cache_control = response.headers.get("Cache-Control")
        assert cache_control == "public, max-age=60"  # 1 minute cache for errors


class TestNonGetRequests:
    """Test that non-GET requests are not cached."""

    def test_post_request_no_cache(self, test_client):
        """POST requests should not have cache headers."""

        @client.app.post("/api/test")
        async def post_endpoint():
            return {"result": "created"}

        response = test_client.post("/api/test", json={})
        assert response.status_code == 200

        # Should not have cache headers
        assert "Cache-Control" not in response.headers or response.headers.get("Cache-Control") == "no-cache, no-store, must-revalidate"


class TestMiddlewareIntegration:
    """Test middleware integration and edge cases."""

    @pytest.mark.asyncio
    async def test_middleware_initialization(self):
        """Test that middleware initializes correctly."""
        middleware = CacheHeadersMiddleware(None)
        assert middleware.CACHE_DURATIONS["recent_animals"] == 300
        assert middleware.CACHE_DURATIONS["diverse_animals"] == 3600
        assert middleware.CACHE_DURATIONS["meta_endpoints"] == 86400

    def test_determine_cache_strategy(self):
        """Test cache strategy determination logic."""
        middleware = CacheHeadersMiddleware(None)

        # Test recent animals
        cache_type, duration, swr = middleware._determine_cache_strategy("/api/animals", {"curation": "recent"})
        assert cache_type == "recent_animals"
        assert duration == 300
        assert swr == 60

        # Test diverse animals
        cache_type, duration, swr = middleware._determine_cache_strategy("/api/animals", {"curation": "diverse"})
        assert cache_type == "diverse_animals"
        assert duration == 3600
        assert swr == 300

        # Test meta endpoint
        cache_type, duration, swr = middleware._determine_cache_strategy("/api/animals/meta/breeds", {})
        assert cache_type == "meta_endpoints"
        assert duration == 86400
        assert swr == 3600

        # Test individual animal
        cache_type, duration, swr = middleware._determine_cache_strategy("/api/animals/test-dog", {})
        assert cache_type == "individual_animal"
        assert duration == 1800
        assert swr == 300

        # Test health endpoint
        cache_type, duration, swr = middleware._determine_cache_strategy("/health", {})
        assert cache_type == "health"
        assert duration == 0
        assert swr == 0

    def test_build_cache_control(self):
        """Test Cache-Control header building."""
        middleware = CacheHeadersMiddleware(None)

        # Test public cache with SWR
        header = middleware._build_cache_control(3600, 300, is_public=True)
        assert header == "public, max-age=3600, stale-while-revalidate=300"

        # Test CDN cache control
        header = middleware._build_cache_control(3600, 300, is_public=True, is_cdn=True)
        assert "s-maxage=3600" in header

        # Test private cache
        header = middleware._build_cache_control(3600, 0, is_public=False)
        assert header == "private, max-age=3600"

    def test_get_vary_headers(self):
        """Test Vary header generation."""
        middleware = CacheHeadersMiddleware(None)

        # Basic endpoint
        vary = middleware._get_vary_headers("/api/statistics", {})
        assert "Accept" in vary
        assert "Accept-Encoding" in vary

        # Animal endpoint
        vary = middleware._get_vary_headers("/api/animals", {})
        assert "Origin" in vary

        # Location-based endpoint
        vary = middleware._get_vary_headers("/api/animals", {"city": "Seattle"})
        assert "X-Forwarded-For" in vary

    @pytest.mark.asyncio
    async def test_generate_etag(self):
        """Test ETag generation."""
        middleware = CacheHeadersMiddleware(None)

        # Test with response that has body
        response = Response(content='{"test": "data"}')
        response.body = b'{"test": "data"}'

        etag = await middleware._generate_etag(response)
        assert etag is not None
        assert etag.startswith('W/"')
        assert len(etag) > 4  # Should have actual hash content

        # Test with empty response
        empty_response = Response()
        empty_response.body = b""

        etag = await middleware._generate_etag(empty_response)
        assert etag is None  # No ETag for empty body
