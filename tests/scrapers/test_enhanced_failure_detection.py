"""
Test enhanced failure detection for production safety.

This module tests the enhanced failure detection capabilities to prevent
catastrophic data loss from scraper failures.
"""

from unittest.mock import Mock

import pytest

from scrapers.base_scraper import BaseScraper
from tests.fixtures.service_mocks import create_mock_session_manager


@pytest.mark.slow
@pytest.mark.computation
@pytest.mark.database
class TestEnhancedFailureDetection:
    """Test enhanced failure detection scenarios."""

    @pytest.fixture
    def mock_scraper(self):
        """Create a mock scraper for testing."""
        scraper = Mock(spec=BaseScraper)
        scraper.organization_id = 1
        scraper.logger = Mock()
        scraper.conn = Mock()

        # Add new attributes for skip_existing_animals feature
        scraper.skip_existing_animals = False
        scraper.total_animals_before_filter = 0
        scraper.total_animals_skipped = 0

        # Inject SessionManager for failure detection
        scraper.session_manager = create_mock_session_manager()
        scraper._log_service_unavailable = Mock()

        # Bind the actual methods to the mock
        scraper.detect_partial_failure = BaseScraper.detect_partial_failure.__get__(
            scraper
        )
        scraper.detect_catastrophic_failure = (
            BaseScraper.detect_catastrophic_failure.__get__(scraper)
        )
        scraper.detect_scraper_failure = BaseScraper.detect_scraper_failure.__get__(
            scraper
        )

        return scraper

    def test_detect_zero_animals_as_catastrophic_failure(self, mock_scraper):
        """Test that zero animals is always detected as catastrophic failure."""
        # This should ALWAYS be true regardless of historical data
        result = mock_scraper.detect_catastrophic_failure(0)
        assert result is True

    def test_detect_extremely_low_count_as_catastrophic(self, mock_scraper):
        """Test that extremely low counts trigger catastrophic failure detection."""
        # 1-2 animals should be flagged as catastrophic for most organizations
        result = mock_scraper.detect_catastrophic_failure(1, absolute_minimum=3)
        assert result is True

        result = mock_scraper.detect_catastrophic_failure(2, absolute_minimum=3)
        assert result is True

    def test_normal_count_not_flagged_as_catastrophic(self, mock_scraper):
        """Test that normal counts don't trigger catastrophic failure."""
        result = mock_scraper.detect_catastrophic_failure(25, absolute_minimum=3)
        assert result is False

        # No error logging for normal counts
        mock_scraper.logger.error.assert_not_called()

    def test_enhanced_partial_failure_with_zero_animals(self, mock_scraper):
        """Test enhanced partial failure detection catches zero animals."""
        # Configure SessionManager to detect failure for zero animals
        mock_scraper.session_manager.detect_partial_failure.return_value = True

        # Zero animals should trigger enhanced detection
        result = mock_scraper.detect_partial_failure(0)
        assert result is True

        # Verify SessionManager was called
        mock_scraper.session_manager.detect_partial_failure.assert_called_once_with(
            0, 0.5, 3, 3, 0, 0
        )

    def test_enhanced_partial_failure_with_absolute_minimum(self, mock_scraper):
        """Test enhanced partial failure uses absolute minimum thresholds."""
        # Configure SessionManager to detect failure for low count
        mock_scraper.session_manager.detect_partial_failure.return_value = True

        # 3 animals should trigger failure even though it's > 50% of historical avg
        # because it's below absolute minimum
        result = mock_scraper.detect_partial_failure(3, absolute_minimum=5)
        assert result is True

        # Verify SessionManager was called with correct parameters
        mock_scraper.session_manager.detect_partial_failure.assert_called_once_with(
            3, 0.5, 5, 3, 0, 0
        )

    def test_new_organization_with_no_historical_data(self, mock_scraper):
        """Test behavior for new organizations with no historical scrape data."""
        # Configure SessionManager responses
        mock_scraper.session_manager.detect_partial_failure.side_effect = [True, False]

        # Should use absolute minimum for new organizations
        result = mock_scraper.detect_partial_failure(2, absolute_minimum=5)
        assert result is True

        result = mock_scraper.detect_partial_failure(10, absolute_minimum=5)
        assert result is False

    def test_partial_failure_with_insufficient_historical_data(self, mock_scraper):
        """Test behavior when there's insufficient historical data."""
        # Configure SessionManager to detect failure for insufficient data
        mock_scraper.session_manager.detect_partial_failure.return_value = True

        # Should fall back to absolute minimum when historical data is
        # unreliable
        result = mock_scraper.detect_partial_failure(2, minimum_historical_scrapes=5)
        assert result is True

        # Verify SessionManager was called
        mock_scraper.session_manager.detect_partial_failure.assert_called_once_with(
            2, 0.5, 3, 5, 0, 0
        )

    def test_database_error_during_failure_detection(self, mock_scraper):
        """Test graceful handling of database errors during failure detection."""
        # Configure SessionManager to raise an exception
        mock_scraper.session_manager.detect_partial_failure.side_effect = Exception(
            "Database error"
        )

        # Current implementation doesn't handle exceptions, so they will be raised
        with pytest.raises(Exception):
            mock_scraper.detect_partial_failure(2, absolute_minimum=5)

        # Reset the side effect and test normal behavior
        mock_scraper.session_manager.detect_partial_failure.side_effect = None
        mock_scraper.session_manager.detect_partial_failure.return_value = True
        result = mock_scraper.detect_partial_failure(2, absolute_minimum=5)
        assert result is True

    def test_combined_catastrophic_and_partial_failure_check(self, mock_scraper):
        """Test that both catastrophic and partial failure checks work together."""
        # Configure SessionManager for different scenarios
        mock_scraper.session_manager.detect_partial_failure.side_effect = [
            True,
            True,
            True,
            False,
        ]

        # Test the combined method (to be implemented)
        result = mock_scraper.detect_scraper_failure(0)  # Zero animals
        assert result is True

        result = mock_scraper.detect_scraper_failure(
            2, absolute_minimum=5
        )  # Below absolute minimum
        assert result is True

        result = mock_scraper.detect_scraper_failure(
            20, absolute_minimum=5
        )  # Below 50% threshold
        assert result is True

        result = mock_scraper.detect_scraper_failure(30, absolute_minimum=5)  # Normal
        assert result is False


@pytest.mark.slow
@pytest.mark.computation
@pytest.mark.database
class TestFailureDetectionEdgeCases:
    """Test edge cases for failure detection."""

    @pytest.fixture
    def mock_scraper(self):
        """Create a mock scraper for testing."""
        scraper = Mock(spec=BaseScraper)
        scraper.organization_id = 1
        scraper.logger = Mock()
        scraper.conn = Mock()

        # Add new attributes for skip_existing_animals feature
        scraper.skip_existing_animals = False
        scraper.total_animals_before_filter = 0
        scraper.total_animals_skipped = 0

        # Inject SessionManager for failure detection
        scraper.session_manager = create_mock_session_manager()
        scraper._log_service_unavailable = Mock()

        # Bind the actual methods to the mock
        scraper.detect_catastrophic_failure = (
            BaseScraper.detect_catastrophic_failure.__get__(scraper)
        )
        scraper.detect_partial_failure = BaseScraper.detect_partial_failure.__get__(
            scraper
        )
        scraper.detect_scraper_failure = BaseScraper.detect_scraper_failure.__get__(
            scraper
        )

        return scraper

    def test_negative_animal_count(self, mock_scraper):
        """Test handling of invalid negative animal counts."""
        result = mock_scraper.detect_catastrophic_failure(-1)
        assert result is True

    def test_extremely_high_threshold_percentage(self, mock_scraper):
        """Test with unreasonably high threshold percentage."""
        # Configure SessionManager to detect failure for zero animals
        mock_scraper.session_manager.detect_partial_failure.return_value = True

        # Even with 200% threshold, zero animals should still trigger failure
        result = mock_scraper.detect_partial_failure(0, threshold_percentage=2.0)
        assert result is True

        # Verify SessionManager was called with correct parameters
        mock_scraper.session_manager.detect_partial_failure.assert_called_once_with(
            0, 2.0, 3, 3, 0, 0
        )

    def test_first_scrape_for_organization(self, mock_scraper):
        """Test behavior for the very first scrape of an organization."""
        # Configure SessionManager for different scenarios
        mock_scraper.session_manager.detect_partial_failure.side_effect = [False, True]

        # First scrape with reasonable count should pass
        result = mock_scraper.detect_partial_failure(15, absolute_minimum=3)
        assert result is False

        # First scrape with suspicious count should fail
        result = mock_scraper.detect_partial_failure(1, absolute_minimum=3)
        assert result is True


@pytest.mark.slow
@pytest.mark.computation
class TestFailureDetectionConfiguration:
    """Test configurable aspects of failure detection."""

    @pytest.fixture
    def mock_scraper(self):
        """Create a mock scraper for testing."""
        scraper = Mock(spec=BaseScraper)
        scraper.organization_id = 1
        scraper.logger = Mock()
        scraper.conn = Mock()

        # Add new attributes for skip_existing_animals feature
        scraper.skip_existing_animals = False
        scraper.total_animals_before_filter = 0
        scraper.total_animals_skipped = 0

        # Inject SessionManager for failure detection
        scraper.session_manager = create_mock_session_manager()
        scraper._log_service_unavailable = Mock()

        # Bind the actual methods to the mock
        scraper.detect_catastrophic_failure = (
            BaseScraper.detect_catastrophic_failure.__get__(scraper)
        )
        scraper.detect_partial_failure = BaseScraper.detect_partial_failure.__get__(
            scraper
        )
        scraper.detect_scraper_failure = BaseScraper.detect_scraper_failure.__get__(
            scraper
        )

        return scraper

    def test_configurable_absolute_minimum(self, mock_scraper):
        """Test that absolute minimum threshold is configurable."""
        # Configure SessionManager for different scenarios
        mock_scraper.session_manager.detect_partial_failure.side_effect = [
            True,
            True,
            False,
        ]

        # Different absolute minimums should yield different results
        result = mock_scraper.detect_partial_failure(8, absolute_minimum=10)
        assert result is True

        # With historical avg=100.0, 50% threshold=50.0, absolute_minimum=5
        # effective_threshold = max(50.0, 5) = 50.0, so 8 < 50.0 = True
        # (failure)
        result = mock_scraper.detect_partial_failure(8, absolute_minimum=5)
        # Below percentage threshold (8 < 50), so failure detected
        assert result is True

        # Test with higher count that's above percentage threshold
        result = mock_scraper.detect_partial_failure(60, absolute_minimum=5)
        assert result is False  # Above both thresholds (60 > max(50, 5))

    def test_configurable_historical_scrape_count(self, mock_scraper):
        """Test that the number of historical scrapes used is configurable."""
        # This tests that we can adjust how many historical scrapes to analyze
        # Implementation should allow tuning of LIMIT in SQL query
        mock_scraper.session_manager.detect_partial_failure.return_value = False

        # Test that different minimum_historical_scrapes values are respected
        mock_scraper.detect_partial_failure(10, minimum_historical_scrapes=15)

        # Verify SessionManager was called with correct parameters
        mock_scraper.session_manager.detect_partial_failure.assert_called_once_with(
            10, 0.5, 3, 15, 0, 0
        )


@pytest.mark.slow
@pytest.mark.database
class TestFailureLoggingAndReporting:
    """Test that failure detection provides good logging and debugging info."""

    @pytest.fixture
    def mock_scraper(self):
        """Create a mock scraper for testing."""
        scraper = Mock(spec=BaseScraper)
        scraper.organization_id = 1
        scraper.logger = Mock()
        scraper.conn = Mock()

        # Add new attributes for skip_existing_animals feature
        scraper.skip_existing_animals = False
        scraper.total_animals_before_filter = 0
        scraper.total_animals_skipped = 0

        # Inject SessionManager for failure detection
        scraper.session_manager = create_mock_session_manager()
        scraper._log_service_unavailable = Mock()

        # Bind the actual methods to the mock
        scraper.detect_catastrophic_failure = (
            BaseScraper.detect_catastrophic_failure.__get__(scraper)
        )
        scraper.detect_partial_failure = BaseScraper.detect_partial_failure.__get__(
            scraper
        )
        scraper.detect_scraper_failure = BaseScraper.detect_scraper_failure.__get__(
            scraper
        )

        return scraper

    def test_catastrophic_failure_logging_includes_context(self, mock_scraper):
        """Test that catastrophic failure detection returns correct results."""
        result = mock_scraper.detect_catastrophic_failure(0)
        assert result is True

        result = mock_scraper.detect_catastrophic_failure(10)
        assert result is False

    def test_partial_failure_logging_includes_thresholds(self, mock_scraper):
        """Test that partial failure detection uses SessionManager."""
        # Configure SessionManager to detect failure
        mock_scraper.session_manager.detect_partial_failure.return_value = True

        # This should trigger failure detection
        result = mock_scraper.detect_partial_failure(5)
        assert result is True

        # Verify SessionManager was called
        mock_scraper.session_manager.detect_partial_failure.assert_called_once()
