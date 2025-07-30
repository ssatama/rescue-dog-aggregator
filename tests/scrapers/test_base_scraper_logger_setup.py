"""
Test for logger setup issues in BaseScraper.

This test addresses the handler duplication bug where multiple scraper instances
create duplicate log handlers, causing log message multiplication.
"""

import logging
from io import StringIO
from unittest.mock import Mock, patch

import pytest

from scrapers.base_scraper import BaseScraper


@pytest.mark.integration
@pytest.mark.network
@pytest.mark.slow
class TestLoggerSetupScraper(BaseScraper):
    """Test implementation for logger setup testing."""

    def __init__(self, config_id="daisyfamilyrescue"):
        """Initialize with minimal setup for testing."""
        super().__init__(config_id=config_id)

    def collect_data(self):
        """Mock implementation for testing."""
        return [{"name": "Test Dog", "external_id": "test-123", "adoption_url": "https://example.com/test-123", "breed": "Mixed", "age_text": "2 years"}]


class TestLoggerSetup:
    """Test for logger setup and handler duplication issues."""

    def test_logger_should_not_create_duplicate_handlers(self):
        """Test that multiple scraper instances don't create duplicate handlers.

        CURRENT BUG:
        - Each scraper instance adds new handlers without checking existing ones
        - This causes log messages to appear multiple times
        - For N scrapers, messages appear N times

        EXPECTED BEHAVIOR:
        - Single log message per actual log call
        - Handlers should be reused across instances
        """
        # Get the logger name that will be used
        test_org_name = "Daisy Family Rescue e.V. (daisyfamilyrescue)"
        logger_name = f"scraper.{test_org_name}.dog"

        # Clear any existing handlers on this logger
        test_logger = logging.getLogger(logger_name)
        test_logger.handlers.clear()

        # Capture log output
        log_capture = StringIO()
        stream_handler = logging.StreamHandler(log_capture)

        # Create first scraper instance
        scraper1 = TestLoggerSetupScraper(config_id="daisyfamilyrescue")
        handlers_after_first = len(scraper1.logger.handlers)

        # Create second scraper instance
        scraper2 = TestLoggerSetupScraper(config_id="daisyfamilyrescue")
        handlers_after_second = len(scraper2.logger.handlers)

        # Create third scraper instance
        scraper3 = TestLoggerSetupScraper(config_id="daisyfamilyrescue")
        handlers_after_third = len(scraper3.logger.handlers)

        print(f"Handlers after first scraper: {handlers_after_first}")
        print(f"Handlers after second scraper: {handlers_after_second}")
        print(f"Handlers after third scraper: {handlers_after_third}")

        # Test the duplication issue
        # Add our test handler to capture messages
        test_logger.addHandler(stream_handler)
        test_logger.setLevel(logging.INFO)

        # All three scrapers should use the same logger
        assert scraper1.logger.name == scraper2.logger.name == scraper3.logger.name

        # Log a message and check for duplication
        test_message = "Test message for duplication check"
        scraper3.logger.info(test_message)

        # Get captured log output
        log_output = log_capture.getvalue()
        message_count = log_output.count(test_message)

        print(f"Log output: {repr(log_output)}")
        print(f"Message appeared {message_count} times")

        # CURRENT BUG: Message appears multiple times due to handler duplication
        # EXPECTED: Message should appear only once
        assert message_count == 1, (
            f"Log message appeared {message_count} times instead of 1. "
            f"This indicates handler duplication bug. "
            f"Handlers count progression: {handlers_after_first} → {handlers_after_second} → {handlers_after_third}"
        )

        # Clean up
        test_logger.removeHandler(stream_handler)

    def test_logger_setup_should_be_idempotent(self):
        """Test that calling _setup_logger multiple times is safe."""
        scraper = TestLoggerSetupScraper(config_id="daisyfamilyrescue")

        # Get initial handler count
        initial_count = len(scraper.logger.handlers)

        # Call setup again (this could happen in certain scenarios)
        logger2 = scraper._setup_logger()
        second_count = len(logger2.handlers)

        # Handler count should not increase
        assert second_count == initial_count, f"Handler count increased from {initial_count} to {second_count} " f"after second _setup_logger() call. This indicates setup is not idempotent."

    def test_logger_configuration_should_be_consistent(self):
        """Test that logger configuration is consistent across instances."""
        scraper1 = TestLoggerSetupScraper(config_id="daisyfamilyrescue")
        scraper2 = TestLoggerSetupScraper(config_id="daisyfamilyrescue")

        # Both should have same logger name and level
        assert scraper1.logger.name == scraper2.logger.name
        assert scraper1.logger.level == scraper2.logger.level

        # Both should reference the same logger object
        assert scraper1.logger is scraper2.logger, "Scrapers with same organization should share the same logger instance"
