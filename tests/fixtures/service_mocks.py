"""
Service mocks for BaseScraper testing after refactoring.

Provides comprehensive mocking infrastructure for the four services:
- DatabaseService
- ImageProcessingService
- SessionManager
- MetricsCollector

Following CLAUDE.md principles:
- Pure functions, no mutations
- Early returns, no nested conditionals
- Immutable data patterns
- Clear error handling
"""

from datetime import datetime
from typing import Optional
from unittest.mock import Mock, patch

import pytest

from scrapers.base_scraper import BaseScraper


def create_mock_database_service(success_mode: bool = True) -> Mock:
    """Create a mock DatabaseService for testing.

    Args:
        success_mode: If True, methods return success values. If False, simulate errors.

    Returns:
        Mock DatabaseService instance
    """
    mock_service = Mock()

    if success_mode:
        # Configure successful operations
        mock_service.connect.return_value = True
        mock_service.close.return_value = None
        mock_service.get_existing_animal.return_value = None  # No existing animal
        mock_service.create_animal.return_value = (1, "added")
        mock_service.update_animal.return_value = (1, "updated")
        mock_service.create_scrape_log.return_value = 123
        mock_service.complete_scrape_log.return_value = True
        mock_service.get_existing_animal_urls.return_value = set()
    else:
        # Configure error scenarios
        mock_service.connect.return_value = False
        mock_service.close.return_value = None
        mock_service.get_existing_animal.return_value = None
        mock_service.create_animal.return_value = (None, "error")
        mock_service.update_animal.return_value = (None, "error")
        mock_service.create_scrape_log.return_value = None
        mock_service.complete_scrape_log.return_value = False
        mock_service.get_existing_animal_urls.return_value = set()

    return mock_service


def create_mock_image_processing_service(success_mode: bool = True) -> Mock:
    """Create a mock ImageProcessingService for testing.

    Args:
        success_mode: If True, methods return success values. If False, simulate errors.

    Returns:
        Mock ImageProcessingService instance
    """
    mock_service = Mock()

    if success_mode:
        # Configure successful operations
        mock_service.process_primary_image.return_value = {"primary_image_url": "https://cloudinary.com/processed.jpg", "original_image_url": "https://original.com/image.jpg"}
        mock_service.save_animal_images.return_value = (3, 0)  # 3 success, 0 failures
    else:
        # Configure error scenarios
        mock_service.process_primary_image.return_value = {"primary_image_url": "https://original.com/image.jpg", "original_image_url": "https://original.com/image.jpg"}
        mock_service.save_animal_images.return_value = (0, 3)  # 0 success, 3 failures

    return mock_service


def create_mock_session_manager(success_mode: bool = True) -> Mock:
    """Create a mock SessionManager for testing.

    Args:
        success_mode: If True, methods return success values. If False, simulate errors.

    Returns:
        Mock SessionManager instance
    """
    mock_service = Mock()

    if success_mode:
        # Configure successful operations
        mock_service.connect.return_value = True
        mock_service.close.return_value = None
        mock_service.start_scrape_session.return_value = True
        mock_service.get_current_session.return_value = datetime.now()
        mock_service.mark_animal_as_seen.return_value = True
        mock_service.update_stale_data_detection.return_value = True
        mock_service.mark_animals_unavailable.return_value = 2
        mock_service.restore_available_animal.return_value = True
        mock_service.mark_skipped_animals_as_seen.return_value = 5
        mock_service.get_stale_animals_summary.return_value = {("high", "available"): 25, ("medium", "available"): 10, ("low", "unavailable"): 5}
        mock_service.detect_partial_failure.return_value = False
    else:
        # Configure error scenarios
        mock_service.connect.return_value = False
        mock_service.close.return_value = None
        mock_service.start_scrape_session.return_value = False
        mock_service.get_current_session.return_value = None
        mock_service.mark_animal_as_seen.return_value = False
        mock_service.update_stale_data_detection.return_value = False
        mock_service.mark_animals_unavailable.return_value = 0
        mock_service.restore_available_animal.return_value = False
        mock_service.mark_skipped_animals_as_seen.return_value = 0
        mock_service.get_stale_animals_summary.return_value = {}
        mock_service.detect_partial_failure.return_value = True

    return mock_service


def create_mock_metrics_collector(success_mode: bool = True) -> Mock:
    """Create a mock MetricsCollector for testing.

    Args:
        success_mode: If True, methods return success values. If False, simulate errors.

    Returns:
        Mock MetricsCollector instance
    """
    mock_service = Mock()

    if success_mode:
        # Configure successful operations
        mock_service.track_phase_timing.return_value = None
        mock_service.track_retry.return_value = None
        mock_service.calculate_scrape_duration.return_value = 45.2
        mock_service.assess_data_quality.return_value = 0.85
        mock_service.generate_comprehensive_metrics.return_value = {"animals_found": 25, "animals_added": 5, "animals_updated": 3, "duration_seconds": 45.2, "quality_score": 0.85}
        mock_service.log_detailed_metrics.return_value = None
    else:
        # Configure error scenarios (metrics collection shouldn't fail catastrophically)
        mock_service.track_phase_timing.return_value = None
        mock_service.track_retry.return_value = None
        mock_service.calculate_scrape_duration.return_value = 0.0
        mock_service.assess_data_quality.return_value = 0.0
        mock_service.generate_comprehensive_metrics.return_value = {}
        mock_service.log_detailed_metrics.return_value = None

    return mock_service


def create_test_scraper_with_services(
    organization_id: int = 1,
    config_id: Optional[str] = None,
    database_service: Optional[Mock] = None,
    image_processing_service: Optional[Mock] = None,
    session_manager: Optional[Mock] = None,
    metrics_collector: Optional[Mock] = None,
) -> BaseScraper:
    """Create a BaseScraper instance with mock services injected.

    Args:
        organization_id: Organization ID for the scraper
        config_id: Optional config ID for config-based initialization
        database_service: Optional mock database service
        image_processing_service: Optional mock image processing service
        session_manager: Optional mock session manager
        metrics_collector: Optional mock metrics collector

    Returns:
        BaseScraper instance with services injected
    """

    class TestScraper(BaseScraper):
        def collect_data(self):
            return [
                {"name": "Test Dog 1", "external_id": "test1", "organization_id": organization_id, "adoption_url": "https://example.com/adopt/test1"},
                {"name": "Test Dog 2", "external_id": "test2", "organization_id": organization_id, "adoption_url": "https://example.com/adopt/test2"},
            ]

    # Create default services if not provided
    if database_service is None:
        database_service = create_mock_database_service()
    if image_processing_service is None:
        image_processing_service = create_mock_image_processing_service()
    if session_manager is None:
        session_manager = create_mock_session_manager()
    if metrics_collector is None:
        metrics_collector = create_mock_metrics_collector()

    # Create scraper with services
    if config_id:
        # Mock config-based initialization
        with patch("scrapers.base_scraper.ConfigLoader") as mock_loader_class:
            with patch("scrapers.base_scraper.create_default_sync_service") as mock_sync_class:
                # Mock config
                mock_config = Mock()
                mock_config.name = "Mock Test Org"
                mock_config.get_scraper_config_dict.return_value = {"rate_limit_delay": 1.0, "max_retries": 3, "timeout": 30}

                # Mock loader
                mock_loader = Mock()
                mock_loader.load_config.return_value = mock_config
                mock_loader_class.return_value = mock_loader

                # Mock sync manager
                mock_sync = Mock()
                mock_sync.sync_organization.return_value = (organization_id, True)
                mock_sync_class.return_value = mock_sync

                scraper = TestScraper(
                    config_id=config_id, database_service=database_service, image_processing_service=image_processing_service, session_manager=session_manager, metrics_collector=metrics_collector
                )
    else:
        scraper = TestScraper(
            organization_id=organization_id, database_service=database_service, image_processing_service=image_processing_service, session_manager=session_manager, metrics_collector=metrics_collector
        )

    return scraper


def create_minimal_test_scraper(organization_id: int = 1) -> BaseScraper:
    """Create a minimal BaseScraper instance for testing without services.

    This simulates the fallback behavior when services are not injected.

    Args:
        organization_id: Organization ID for the scraper

    Returns:
        BaseScraper instance without services (None for all service dependencies)
    """

    class TestScraper(BaseScraper):
        def collect_data(self):
            return [{"name": "Test Dog", "external_id": "test1", "organization_id": organization_id, "adoption_url": "https://example.com/adopt/test1"}]

    return TestScraper(organization_id=organization_id, database_service=None, image_processing_service=None, session_manager=None, metrics_collector=None)


@pytest.fixture
def mock_database_service():
    """Pytest fixture for mock DatabaseService."""
    return create_mock_database_service()


@pytest.fixture
def mock_image_processing_service():
    """Pytest fixture for mock ImageProcessingService."""
    return create_mock_image_processing_service()


@pytest.fixture
def mock_session_manager():
    """Pytest fixture for mock SessionManager."""
    return create_mock_session_manager()


@pytest.fixture
def mock_metrics_collector():
    """Pytest fixture for mock MetricsCollector."""
    return create_mock_metrics_collector()


@pytest.fixture
def test_scraper_with_services(mock_database_service, mock_image_processing_service, mock_session_manager, mock_metrics_collector):
    """Pytest fixture for BaseScraper with all services injected."""
    return create_test_scraper_with_services(
        organization_id=1,
        database_service=mock_database_service,
        image_processing_service=mock_image_processing_service,
        session_manager=mock_session_manager,
        metrics_collector=mock_metrics_collector,
    )


@pytest.fixture
def minimal_test_scraper():
    """Pytest fixture for BaseScraper without services."""
    return create_minimal_test_scraper()


# Configuration helpers for common test scenarios
def configure_database_service_for_existing_animal(mock_service: Mock, animal_id: int = 1, animal_name: str = "Existing Dog", updated_at: datetime = None) -> None:
    """Configure mock DatabaseService to return an existing animal.

    Args:
        mock_service: Mock DatabaseService instance
        animal_id: ID of the existing animal
        animal_name: Name of the existing animal
        updated_at: Last updated timestamp
    """
    if updated_at is None:
        updated_at = datetime.now()

    mock_service.get_existing_animal.return_value = (animal_id, animal_name, updated_at)
    mock_service.update_animal.return_value = (animal_id, "updated")


def configure_database_service_for_new_animal(mock_service: Mock) -> None:
    """Configure mock DatabaseService for new animal creation.

    Args:
        mock_service: Mock DatabaseService instance
    """
    mock_service.get_existing_animal.return_value = None
    mock_service.create_animal.return_value = (1, "added")


def configure_session_manager_for_partial_failure(mock_service: Mock, should_detect_failure: bool = True) -> None:
    """Configure mock SessionManager for partial failure detection.

    Args:
        mock_service: Mock SessionManager instance
        should_detect_failure: Whether detect_partial_failure should return True
    """
    mock_service.detect_partial_failure.return_value = should_detect_failure


def configure_image_processing_service_for_success(mock_service: Mock, image_count: int = 3) -> None:
    """Configure mock ImageProcessingService for successful operations.

    Args:
        mock_service: Mock ImageProcessingService instance
        image_count: Number of images to simulate as successfully processed
    """
    mock_service.save_animal_images.return_value = (image_count, 0)
    mock_service.process_primary_image.return_value = {"primary_image_url": "https://cloudinary.com/processed.jpg", "original_image_url": "https://original.com/image.jpg"}


def configure_image_processing_service_for_failure(mock_service: Mock, image_count: int = 3) -> None:
    """Configure mock ImageProcessingService for failed operations.

    Args:
        mock_service: Mock ImageProcessingService instance
        image_count: Number of images to simulate as failed
    """
    mock_service.save_animal_images.return_value = (0, image_count)
    mock_service.process_primary_image.return_value = {"primary_image_url": "https://original.com/image.jpg", "original_image_url": "https://original.com/image.jpg"}
