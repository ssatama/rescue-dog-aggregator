"""
Integration tests for SessionManager and MetricsCollector with BaseScraper.

Tests dependency injection and backward compatibility.
"""

from unittest.mock import Mock, patch

import pytest

from scrapers.base_scraper import BaseScraper
from services.metrics_collector import MetricsCollector
from services.session_manager import SessionManager


@pytest.mark.slow
@pytest.mark.database
class TestBaseScraperSessionMetricsIntegration:
    """Test BaseScraper integration with SessionManager and MetricsCollector."""

    @pytest.fixture
    def mock_scraper_with_services(self):
        """Create a mock scraper with injected services."""

        class MockScraperWithServices(BaseScraper):
            def collect_data(self):
                return [{"name": "Test Dog", "external_id": "test1", "adoption_url": "https://example.com/adopt/1"}]

        return MockScraperWithServices

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_basescraper_uses_injected_session_manager(self, mock_scraper_with_services):
        """Test that BaseScraper uses injected SessionManager for session operations."""
        # Create mock session manager
        mock_session_manager = Mock(spec=SessionManager)
        mock_session_manager.start_scrape_session.return_value = True
        mock_session_manager.get_current_session.return_value = None
        mock_session_manager.update_stale_data_detection.return_value = True
        mock_session_manager.mark_skipped_animals_as_seen.return_value = 0

        # Create scraper with injected service
        scraper = mock_scraper_with_services(organization_id=1, session_manager=mock_session_manager)

        # Test start_scrape_session uses service
        result = scraper.start_scrape_session()

        # Verify service was called
        mock_session_manager.start_scrape_session.assert_called_once()
        assert result is True

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_basescraper_uses_injected_metrics_collector(self, mock_scraper_with_services):
        """Test that BaseScraper uses injected MetricsCollector for metrics operations."""
        # Create mock metrics collector
        mock_metrics_collector = Mock(spec=MetricsCollector)
        mock_metrics_collector.track_retry.return_value = None
        mock_metrics_collector.track_phase_timing.return_value = None
        mock_metrics_collector.calculate_scrape_duration.return_value = 10.5
        mock_metrics_collector.assess_data_quality.return_value = 0.95

        # Create scraper with injected service
        scraper = mock_scraper_with_services(organization_id=1, metrics_collector=mock_metrics_collector)

        # Test retry tracking (simulate a retry)
        scraper._scrape_with_retry(lambda: {"name": "Test", "external_id": "test"})

        # Verify service methods would be called (this is a basic test)
        # More detailed testing would require actual scrape execution

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_basescraper_falls_back_without_services(self, mock_scraper_with_services):
        """Test that BaseScraper falls back to legacy mode without service injection."""
        # Create scraper without service injection
        scraper = mock_scraper_with_services(organization_id=1)

        # Should still have the methods available
        assert hasattr(scraper, "start_scrape_session")
        assert hasattr(scraper, "update_stale_data_detection")
        assert hasattr(scraper, "mark_skipped_animals_as_seen")

        # Test that legacy session start works
        result = scraper.start_scrape_session()
        assert result is True
        assert scraper.current_scrape_session is not None

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_basescraper_service_integration_constructor(self, mock_scraper_with_services):
        """Test that BaseScraper constructor accepts all services."""
        from config import DB_CONFIG

        # Create real services
        session_manager = SessionManager(DB_CONFIG, organization_id=1)
        metrics_collector = MetricsCollector()

        # Create scraper with all services
        scraper = mock_scraper_with_services(organization_id=1, session_manager=session_manager, metrics_collector=metrics_collector)

        # Verify services are properly injected
        assert scraper.session_manager is session_manager
        assert scraper.metrics_collector is metrics_collector

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_dependency_injection_pattern_consistency(self, mock_scraper_with_services):
        """Test that dependency injection follows the correct pattern for each service type."""
        from services.null_objects import NullMetricsCollector

        scraper = mock_scraper_with_services(organization_id=1)

        # Services with null object pattern should have null object instances
        assert isinstance(scraper.metrics_collector, NullMetricsCollector)

        # Services without null object pattern should still be None
        assert scraper.session_manager is None
        assert scraper.database_service is None
        assert scraper.image_processing_service is None
