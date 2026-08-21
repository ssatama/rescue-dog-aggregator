# tests/scrapers/test_scraper_base.py
"""Shared setup for scraper tests.

This used to carry nine tests asserting that attributes exist on BaseScraper.
They could not fail: several were structurally unfalsifiable
(`has_config or has_org_config`), one asserted nothing at all when the
attribute was absent, and the rest re-checked what the fixture already proves
by constructing the scraper. Across five subclasses they collected 48 cases
and covered nothing.

What remains is the one assertion that can fail - that a scraper reads the
identity its config declares - and the fixture the subclasses build on.
"""

from unittest.mock import Mock, patch

import pytest


class ScraperTestBase:
    """Base for per-organisation scraper tests.

    Subclasses set the four class attributes and add tests for whatever their
    scraper actually does.
    """

    # Override in subclasses
    scraper_class = None
    config_id = None
    expected_org_name = None
    expected_base_url = None

    @pytest.fixture
    def scraper(self):
        """Create scraper instance for testing."""
        if not self.scraper_class or not self.config_id:
            pytest.skip("Scraper class and config_id must be set in subclass")

        with patch("scrapers.base_scraper.psycopg2"):
            scraper = self.scraper_class(config_id=self.config_id)
            scraper.conn = Mock()
            scraper.cursor = Mock()
            return scraper

    @pytest.mark.unit
    def test_reads_its_identity_from_config(self, scraper):
        """A scraper pointed at the wrong config would serve the wrong dogs."""
        assert scraper.organization_name == self.expected_org_name
        assert scraper.base_url == self.expected_base_url
