#!/usr/bin/env python3
"""
Demonstration script for cache headers middleware.

Shows how different endpoints get different cache configurations.
"""

from fastapi.testclient import TestClient

from api.main import app


def test_cache_headers():
    """Test and display cache headers for various endpoints."""
    client = TestClient(app)

    print("=" * 80)
    print("CACHE HEADERS MIDDLEWARE DEMONSTRATION")
    print("=" * 80)
    print()

    # Test configurations
    test_cases = [
        {
            "name": "Health Check (No Cache)",
            "url": "/health",
            "expected_cache": "no-cache, no-store, must-revalidate",
        },
        {
            "name": "Recent Animals (5 min cache)",
            "url": "/api/animals?curation=recent",
            "expected_cache": "public, max-age=300, stale-while-revalidate=60",
        },
        {
            "name": "Diverse Animals (1 hour cache)",
            "url": "/api/animals?curation=diverse",
            "expected_cache": "public, max-age=3600, stale-while-revalidate=300",
        },
        {
            "name": "Default Animals (15 min cache)",
            "url": "/api/animals",
            "expected_cache": "public, max-age=900, stale-while-revalidate=120",
        },
        {
            "name": "Meta Breeds (24 hour cache)",
            "url": "/api/animals/meta/breeds",
            "expected_cache": "public, max-age=86400, stale-while-revalidate=3600",
        },
        {
            "name": "Statistics (1 hour cache)",
            "url": "/api/statistics",
            "expected_cache": "public, max-age=3600, stale-while-revalidate=600",
        },
        {
            "name": "Organizations (1 hour cache)",
            "url": "/api/organizations",
            "expected_cache": "public, max-age=3600, stale-while-revalidate=600",
        },
        {
            "name": "Individual Animal (30 min cache)",
            "url": "/api/animals/test-dog-123",
            "expected_cache": "public, max-age=1800, stale-while-revalidate=300",
        },
    ]

    for test in test_cases:
        print(f"Testing: {test['name']}")
        print(f"URL: {test['url']}")
        print(f"Expected: {test['expected_cache']}")

        response = client.get(test["url"])

        # Get cache headers
        cache_control = response.headers.get("Cache-Control", "None")
        cdn_cache = response.headers.get("CDN-Cache-Control", "None")
        vary = response.headers.get("Vary", "None")
        etag = response.headers.get("ETag", "None")
        response_time = response.headers.get("X-Response-Time", "None")

        print(f"Status: {response.status_code}")
        print(f"Cache-Control: {cache_control}")

        # Check if it matches expected (for successful responses)
        if response.status_code == 200:
            if cache_control == test["expected_cache"]:
                print("✓ Cache header matches expected value")
            else:
                print("✗ Cache header doesn't match expected value")
        elif response.status_code >= 400:
            # Error responses get short cache
            if cache_control == "public, max-age=60":
                print("✓ Error response has short cache (60s)")

        print(f"CDN-Cache-Control: {cdn_cache}")
        print(f"Vary: {vary}")
        print(f"ETag: {etag if etag != 'None' else 'None (depends on response type)'}")
        print(f"Response Time: {response_time}s")
        print("-" * 40)
        print()

    print("=" * 80)
    print("CACHE STRATEGY SUMMARY")
    print("=" * 80)
    print()
    print("• Health/Monitoring: No cache")
    print("• Recent Animals: 5 minutes (fresh data)")
    print("• Diverse Animals: 1 hour (stable selection)")
    print("• Meta Data: 24 hours (rarely changes)")
    print("• Statistics: 1 hour (periodic updates)")
    print("• Individual Animals: 30 minutes (balance freshness)")
    print("• Organizations: 1 hour (stable data)")
    print()
    print("All cacheable responses include:")
    print("• Stale-while-revalidate for better UX")
    print("• CDN-Cache-Control for Cloudflare optimization")
    print("• Vary headers for proper cache key generation")
    print("• ETags for conditional requests (when possible)")
    print("• X-Response-Time for performance monitoring")


if __name__ == "__main__":
    test_cache_headers()
