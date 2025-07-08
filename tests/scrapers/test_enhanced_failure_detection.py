"""
Test enhanced failure detection for production safety.

This module tests the enhanced failure detection capabilities to prevent
catastrophic data loss from scraper failures.
"""

from unittest.mock import Mock

import pytest

from scrapers.base_scraper import BaseScraper


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

        # Bind the actual methods to the mock
        scraper.detect_partial_failure = BaseScraper.detect_partial_failure.__get__(scraper)
        scraper.detect_catastrophic_failure = BaseScraper.detect_catastrophic_failure.__get__(scraper)
        scraper.detect_scraper_failure = BaseScraper.detect_scraper_failure.__get__(scraper)

        return scraper

    def test_detect_zero_animals_as_catastrophic_failure(self, mock_scraper):
        """Test that zero animals is always detected as catastrophic failure."""
        # This should ALWAYS be true regardless of historical data
        result = mock_scraper.detect_catastrophic_failure(0)
        assert result is True

        # Verify logging
        mock_scraper.logger.error.assert_called_once()
        assert "catastrophic failure" in mock_scraper.logger.error.call_args[0][0].lower()

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
        # Mock database response for historical data
        cursor_mock = Mock()
        cursor_mock.fetchone.return_value = (20.0,)  # Historical average of 20
        mock_scraper.conn.cursor.return_value = cursor_mock

        # Zero animals should trigger enhanced detection
        result = mock_scraper.detect_partial_failure(0)
        assert result is True

    def test_enhanced_partial_failure_with_absolute_minimum(self, mock_scraper):
        """Test enhanced partial failure uses absolute minimum thresholds."""
        # Mock database response for historical data
        cursor_mock = Mock()
        cursor_mock.fetchone.return_value = (100.0,)  # Historical average of 100
        mock_scraper.conn.cursor.return_value = cursor_mock

        # 3 animals should trigger failure even though it's > 50% of historical avg
        # because it's below absolute minimum
        result = mock_scraper.detect_partial_failure(3, absolute_minimum=5)
        assert result is True

    def test_new_organization_with_no_historical_data(self, mock_scraper):
        """Test behavior for new organizations with no historical scrape data."""
        # Mock database response for no historical data
        cursor_mock = Mock()
        cursor_mock.fetchone.return_value = None
        mock_scraper.conn.cursor.return_value = cursor_mock

        # Should use absolute minimum for new organizations
        result = mock_scraper.detect_partial_failure(2, absolute_minimum=5)
        assert result is True

        result = mock_scraper.detect_partial_failure(10, absolute_minimum=5)
        assert result is False

    def test_partial_failure_with_insufficient_historical_data(self, mock_scraper):
        """Test behavior when there's insufficient historical data."""
        # Mock database response for very small historical dataset
        cursor_mock = Mock()
        cursor_mock.fetchone.return_value = (3.0,)  # Very low historical average
        mock_scraper.conn.cursor.return_value = cursor_mock

        # Should fall back to absolute minimum when historical data is
        # unreliable
        result = mock_scraper.detect_partial_failure(2, minimum_historical_scrapes=5)
        assert result is True

    def test_database_error_during_failure_detection(self, mock_scraper):
        """Test graceful handling of database errors during failure detection."""
        # Mock database error
        mock_scraper.conn.cursor.side_effect = Exception("Database connection failed")

        # Should default to safe mode (assume potential failure)
        result = mock_scraper.detect_partial_failure(10)
        assert result is True

        # Should log the error
        mock_scraper.logger.error.assert_called_once()

    def test_combined_catastrophic_and_partial_failure_check(self, mock_scraper):
        """Test that both catastrophic and partial failure checks work together."""
        # Mock database response - enhanced query returns (AVG, COUNT)
        cursor_mock = Mock()
        cursor_mock.fetchone.return_value = (50.0, 5)  # 50.0 average, 5 historical scrapes
        mock_scraper.conn.cursor.return_value = cursor_mock

        # Test the combined method (to be implemented)
        result = mock_scraper.detect_scraper_failure(0)  # Zero animals
        assert result is True

        result = mock_scraper.detect_scraper_failure(2, absolute_minimum=5)  # Below absolute minimum
        assert result is True

        result = mock_scraper.detect_scraper_failure(20, absolute_minimum=5)  # Below 50% threshold
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

        # Bind the actual methods to the mock
        scraper.detect_catastrophic_failure = BaseScraper.detect_catastrophic_failure.__get__(scraper)
        scraper.detect_partial_failure = BaseScraper.detect_partial_failure.__get__(scraper)
        scraper.detect_scraper_failure = BaseScraper.detect_scraper_failure.__get__(scraper)

        return scraper

    def test_negative_animal_count(self, mock_scraper):
        """Test handling of invalid negative animal counts."""
        result = mock_scraper.detect_catastrophic_failure(-1)
        assert result is True

    def test_extremely_high_threshold_percentage(self, mock_scraper):
        """Test with unreasonably high threshold percentage."""
        cursor_mock = Mock()
        cursor_mock.fetchone.return_value = (10.0,)
        mock_scraper.conn.cursor.return_value = cursor_mock

        # Even with 200% threshold, zero animals should still trigger failure
        result = mock_scraper.detect_partial_failure(0, threshold_percentage=2.0)
        assert result is True

    def test_first_scrape_for_organization(self, mock_scraper):
        """Test behavior for the very first scrape of an organization."""
        cursor_mock = Mock()
        cursor_mock.fetchone.return_value = None  # No historical data
        mock_scraper.conn.cursor.return_value = cursor_mock

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

        # Bind the actual methods to the mock
        scraper.detect_catastrophic_failure = BaseScraper.detect_catastrophic_failure.__get__(scraper)
        scraper.detect_partial_failure = BaseScraper.detect_partial_failure.__get__(scraper)
        scraper.detect_scraper_failure = BaseScraper.detect_scraper_failure.__get__(scraper)

        return scraper

    def test_configurable_absolute_minimum(self, mock_scraper):
        """Test that absolute minimum threshold is configurable."""
        cursor_mock = Mock()
        # 100.0 average, 10 historical scrapes
        cursor_mock.fetchone.return_value = (100.0, 10)
        mock_scraper.conn.cursor.return_value = cursor_mock

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
        cursor_mock = Mock()
        mock_scraper.conn.cursor.return_value = cursor_mock

        # Test that different minimum_historical_scrapes values are respected
        mock_scraper.detect_partial_failure(10, minimum_historical_scrapes=15)

        # Verify SQL query uses the correct LIMIT
        call_args = cursor_mock.execute.call_args[0][0]
        assert "LIMIT" in call_args


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

        # Bind the actual methods to the mock
        scraper.detect_catastrophic_failure = BaseScraper.detect_catastrophic_failure.__get__(scraper)
        scraper.detect_partial_failure = BaseScraper.detect_partial_failure.__get__(scraper)
        scraper.detect_scraper_failure = BaseScraper.detect_scraper_failure.__get__(scraper)

        return scraper

    def test_catastrophic_failure_logging_includes_context(self, mock_scraper):
        """Test that catastrophic failure logging includes helpful context."""
        mock_scraper.detect_catastrophic_failure(0)

        # Should log with ERROR level and include organization context
        mock_scraper.logger.error.assert_called_once()
        log_message = mock_scraper.logger.error.call_args[0][0]
        assert "organization_id" in log_message.lower() or str(mock_scraper.organization_id) in log_message

    def test_partial_failure_logging_includes_thresholds(self, mock_scraper):
        """Test that partial failure logging includes threshold information."""
        cursor_mock = Mock()
        cursor_mock.fetchone.return_value = (20.0, 5)  # 20.0 average, 5 historical scrapes
        mock_scraper.conn.cursor.return_value = cursor_mock

        # This should trigger warning (5 < 10 threshold)
        mock_scraper.detect_partial_failure(5)

        # Should log threshold information for debugging
        mock_scraper.logger.warning.assert_called_once()
        log_message = mock_scraper.logger.warning.call_args[0][0]
        assert "threshold" in log_message.lower()
        assert "historical" in log_message.lower()
