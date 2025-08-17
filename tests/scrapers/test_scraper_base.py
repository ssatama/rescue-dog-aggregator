# tests/scrapers/test_scraper_base.py
"""
Shared base test class for all scraper tests.
Eliminates duplication across 46 individual scraper test files.
"""

from unittest.mock import Mock, patch

import pytest


class ScraperTestBase:
    """
    Base test class for all scrapers.
    Individual scraper tests should inherit from this and only add scraper-specific tests.
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

    def test_initialization_with_config(self, scraper):
        """Test scraper initializes correctly with config."""
        assert scraper.organization_name == self.expected_org_name
        assert scraper.base_url == self.expected_base_url

    def test_config_driven_architecture(self, scraper):
        """Test scraper follows config-driven architecture."""
        # Modern scrapers may have org_config instead of config
        has_config = hasattr(scraper, "config") and scraper.config is not None
        has_org_config = hasattr(scraper, "org_config") and scraper.org_config is not None
        assert has_config or has_org_config, "Scraper should have either config or org_config"

    def test_rate_limiting_configured(self, scraper):
        """Test rate limiting is configured from config."""
        assert hasattr(scraper, "rate_limit_delay")
        assert scraper.rate_limit_delay >= 0

    def test_has_required_methods(self, scraper):
        """Test scraper implements required abstract methods."""
        assert hasattr(scraper, "collect_data")
        assert callable(scraper.collect_data)

    def test_database_connection_handling(self, scraper):
        """Test scraper handles database connections properly."""
        # Modern scrapers use dependency injection, legacy ones have direct methods
        has_database_service = hasattr(scraper, "database_service")
        has_legacy_methods = hasattr(scraper, "connect_to_database")
        assert has_database_service or has_legacy_methods, "Scraper should have database access"

    def test_error_handling_exists(self, scraper):
        """Test scraper has error handling mechanisms."""
        assert hasattr(scraper, "handle_scraper_failure")

    def test_skip_existing_animals_configurable(self, scraper):
        """Test skip_existing_animals is configurable."""
        assert hasattr(scraper, "skip_existing_animals")
        assert isinstance(scraper.skip_existing_animals, bool)

    def test_batch_processing_configured(self, scraper):
        """Test batch processing is properly configured."""
        if hasattr(scraper, "batch_size"):
            assert scraper.batch_size > 0
            assert scraper.batch_size <= 100  # Reasonable limit

    def test_logging_configured(self, scraper):
        """Test logging is properly configured."""
        assert hasattr(scraper, "logger")
        assert scraper.logger is not None
