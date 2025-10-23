#!/usr/bin/env python3
"""Tests for MisisRescue retry mechanism."""

from unittest.mock import Mock, patch

import pytest
from selenium.common.exceptions import TimeoutException, WebDriverException

from scrapers.misis_rescue.scraper import MisisRescueScraper


@pytest.mark.slow
class TestMisisRescueRetryMechanism:
    """Test retry functionality for connection errors."""

    def setup_method(self):
        """Set up test fixtures."""
        # Create scraper in legacy mode to avoid config dependency
        self.scraper = MisisRescueScraper(organization_id=13)

    def test_retry_mechanism_exists(self):
        """Test that retry mechanism method exists."""
        # Should have retry method from BaseScraper
        assert hasattr(self.scraper, "_scrape_with_retry")

    def test_retry_on_timeout_exception(self):
        """Test retry logic on TimeoutException."""
        with patch.object(self.scraper, "_scrape_dog_detail") as mock_scrape:
            # Mock to fail twice, then succeed
            mock_scrape.side_effect = [TimeoutException("Timeout"), TimeoutException("Timeout"), {"name": "Test Dog", "external_id": "test123", "adoption_url": "http://test.com"}]

            result = self.scraper._scrape_with_retry(self.scraper._scrape_dog_detail, "http://test.com")

            # Should succeed after retries
            assert result is not None
            assert result["name"] == "Test Dog"
            assert mock_scrape.call_count == 3

    def test_retry_on_webdriver_exception(self):
        """Test retry logic on WebDriverException."""
        with patch.object(self.scraper, "_scrape_dog_detail") as mock_scrape:
            # Mock to fail twice, then succeed
            mock_scrape.side_effect = [
                WebDriverException("Connection failed"),
                WebDriverException("Connection failed"),
                {"name": "Test Dog", "external_id": "test123", "adoption_url": "http://test.com"},
            ]

            result = self.scraper._scrape_with_retry(self.scraper._scrape_dog_detail, "http://test.com")

            # Should succeed after retries
            assert result is not None
            assert result["name"] == "Test Dog"
            assert mock_scrape.call_count == 3

    def test_retry_exhausted_returns_none(self):
        """Test that exhausted retries return None."""
        with patch.object(self.scraper, "_scrape_dog_detail") as mock_scrape:
            # Mock to always fail
            mock_scrape.side_effect = TimeoutException("Always timeout")

            result = self.scraper._scrape_with_retry(self.scraper._scrape_dog_detail, "http://test.com")

            # Should return None after max retries
            assert result is None
            assert mock_scrape.call_count == self.scraper.max_retries

    def test_invalid_name_detection(self):
        """Test detection of invalid names from connection errors."""
        # Should detect "This Site Cant Be Reached" as invalid
        assert self.scraper._is_invalid_name("This Site Cant Be Reached")

        # Should detect other error patterns
        assert self.scraper._is_invalid_name("Error 404")
        assert self.scraper._is_invalid_name("Connection Failed")
        assert self.scraper._is_invalid_name("Page Not Found")

        # Should accept valid names
        assert not self.scraper._is_invalid_name("Lilly")
        assert not self.scraper._is_invalid_name("Max")
        assert not self.scraper._is_invalid_name("Stella")

    def test_data_validation_rejects_invalid_names(self):
        """Test that _validate_dog_data rejects invalid names."""
        # Valid dog data
        valid_data = {"name": "Lilly", "external_id": "test123", "adoption_url": "http://test.com", "primary_image_url": "http://test.com/image.jpg"}
        assert self.scraper._validate_dog_data(valid_data)

        # Invalid name should be rejected
        invalid_data = {"name": "This Site Cant Be Reached", "external_id": "test123", "adoption_url": "http://test.com", "primary_image_url": "http://test.com/image.jpg"}
        assert not self.scraper._validate_dog_data(invalid_data)

    @patch("time.sleep")  # Mock sleep to speed up tests
    def test_exponential_backoff(self, mock_sleep):
        """Test exponential backoff between retries."""
        with patch.object(self.scraper, "_scrape_dog_detail") as mock_scrape:
            # Mock to always fail
            mock_scrape.side_effect = TimeoutException("Always timeout")

            self.scraper._scrape_with_retry(self.scraper._scrape_dog_detail, "http://test.com")

            # Should have called sleep with increasing delays
            expected_calls = [
                ((1.0,),),  # First retry: 1s
                ((2.0,),),  # Second retry: 2s
            ]
            mock_sleep.assert_has_calls(expected_calls)

    def test_retry_mechanism_in_collect_data(self):
        """Test that collect_data uses retry mechanism."""
        with patch.object(self.scraper, "_get_all_dogs_from_listing") as mock_listing:
            with patch.object(self.scraper, "_scrape_with_retry") as mock_retry:
                # Mock listing to return one dog
                mock_listing.return_value = [{"name": "Test Dog", "url": "/test"}]

                # Mock retry to succeed
                mock_retry.return_value = {"name": "Test Dog", "external_id": "test123", "adoption_url": "http://test.com", "primary_image_url": "http://test.com/image.jpg"}

                result = self.scraper.collect_data()

                # Should use retry method
                mock_retry.assert_called_once()
                assert len(result) == 1
                assert result[0]["name"] == "Test Dog"
