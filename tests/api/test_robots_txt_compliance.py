"""Test robots.txt compliance for Google Rich Results.

These tests verify that robots.txt allows Google to access Next.js
image optimization routes while maintaining security.
"""

from pathlib import Path

import pytest
import requests


class TestRobotsTxtCompliance:
    """Test robots.txt configuration for SEO compliance."""

    @pytest.mark.unit
    def test_robots_txt_allows_next_js_image_routes(self):
        """robots.txt should allow /_next/image routes for Google Rich Results."""
        robots_txt_path = Path(__file__).parent.parent.parent / "frontend" / "public" / "robots.txt"

        assert robots_txt_path.exists(), "robots.txt file should exist"

        content = robots_txt_path.read_text()

        # Should allow /_next/image specifically for Googlebot
        lines = [line.strip() for line in content.split("\n") if line.strip()]

        # Find Googlebot section
        googlebot_section = False
        found_next_image_allow = False
        found_general_next_disallow = False

        for line in lines:
            if line.startswith("User-agent:"):
                googlebot_section = "Googlebot" in line or "*" in line
            elif googlebot_section:
                if line == "Allow: /_next/image":
                    found_next_image_allow = True
                elif line == "Disallow: /_next/":
                    found_general_next_disallow = True

        assert found_next_image_allow, "robots.txt should contain 'Allow: /_next/image' for Google Rich Results"
        assert found_general_next_disallow, "robots.txt should still disallow general /_next/ paths"

    @pytest.mark.unit
    def test_robots_txt_security_maintained(self):
        """robots.txt should maintain security by blocking sensitive paths."""
        robots_txt_path = Path(__file__).parent.parent.parent / "frontend" / "public" / "robots.txt"
        content = robots_txt_path.read_text()

        # Should still block sensitive paths
        assert "Disallow: /_next/" in content, "Should block general Next.js internal paths"
        assert "Disallow: /api" in content or "Disallow: /api/" in content, "Should block API paths from crawling"

    @pytest.mark.integration
    def test_google_can_access_image_optimization(self):
        """Integration test: Google should be able to access image optimization routes."""
        # This test would ideally check that Google can access /_next/image routes
        # For now, we verify the robots.txt syntax is correct
        robots_txt_path = Path(__file__).parent.parent.parent / "frontend" / "public" / "robots.txt"
        content = robots_txt_path.read_text()

        # Basic syntax validation
        lines = [line.strip() for line in content.split("\n") if line.strip() and not line.startswith("#")]

        for line in lines:
            # Each line should be valid robots.txt syntax
            assert (
                line.startswith("User-agent:") or line.startswith("Disallow:") or line.startswith("Allow:") or line.startswith("Sitemap:") or line.startswith("Crawl-delay:")
            ), f"Invalid robots.txt syntax: {line}"
