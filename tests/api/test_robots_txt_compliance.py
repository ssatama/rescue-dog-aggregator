"""Test robots.txt compliance for Google Rich Results.

These tests verify that robots.txt allows Google to access Next.js
image optimization routes while maintaining security.
"""

from pathlib import Path

import pytest


class TestRobotsTxtCompliance:
    """Test robots.txt configuration for SEO compliance."""

    @pytest.mark.unit
    def test_robots_txt_allows_next_js_image_routes(self):
        """robots.txt should allow /_next/image routes for Google Rich Results."""
        robots_txt_path = (
            Path(__file__).parent.parent.parent / "frontend" / "public" / "robots.txt"
        )

        assert robots_txt_path.exists(), "robots.txt file should exist"

        content = robots_txt_path.read_text()

        # Should allow /_next/image and /_next/static/ for all crawlers
        # This can be achieved either through explicit Allow directives or a general Allow: /
        lines = [line.strip() for line in content.split("\n") if line.strip()]

        found_general_allow = False
        found_next_image_allow = False
        found_next_static_allow = False
        found_blocking_next = False

        for line in lines:
            if line == "Allow: /":
                found_general_allow = True
            elif line == "Allow: /_next/image":
                found_next_image_allow = True
            elif line == "Allow: /_next/static/":
                found_next_static_allow = True
            elif line == "Disallow: /_next/image" or line == "Disallow: /_next/static":
                # These specific paths should NOT be blocked
                found_blocking_next = True

        # Either general allow or specific allows are acceptable
        has_image_access = found_general_allow or found_next_image_allow
        has_static_access = found_general_allow or found_next_static_allow

        assert not found_blocking_next, (
            "robots.txt should NOT block /_next/image or /_next/static paths"
        )
        assert has_image_access, (
            "robots.txt should allow access to /_next/image (via Allow: / or explicit Allow)"
        )
        assert has_static_access, (
            "robots.txt should allow access to /_next/static/ (via Allow: / or explicit Allow)"
        )

    @pytest.mark.unit
    def test_robots_txt_security_maintained(self):
        """robots.txt should maintain security by blocking sensitive paths."""
        robots_txt_path = (
            Path(__file__).parent.parent.parent / "frontend" / "public" / "robots.txt"
        )
        content = robots_txt_path.read_text()

        # Should block only truly sensitive paths (admin, api)
        # We DON'T block /_next/ because we need /_next/image and /_next/static/ for proper SEO
        assert "Disallow: /admin/" in content, "Should block admin paths"
        assert "Disallow: /api" in content or "Disallow: /api/" in content, (
            "Should block API paths from crawling"
        )

    @pytest.mark.integration
    def test_google_can_access_image_optimization(self):
        """Integration test: Google should be able to access image optimization routes."""
        # This test would ideally check that Google can access /_next/image routes
        # For now, we verify the robots.txt syntax is correct
        robots_txt_path = (
            Path(__file__).parent.parent.parent / "frontend" / "public" / "robots.txt"
        )
        content = robots_txt_path.read_text()

        # Basic syntax validation
        lines = [
            line.strip()
            for line in content.split("\n")
            if line.strip() and not line.startswith("#")
        ]

        for line in lines:
            # Each line should be valid robots.txt syntax
            assert (
                line.startswith("User-agent:")
                or line.startswith("Disallow:")
                or line.startswith("Allow:")
                or line.startswith("Sitemap:")
                or line.startswith("Crawl-delay:")
            ), f"Invalid robots.txt syntax: {line}"
