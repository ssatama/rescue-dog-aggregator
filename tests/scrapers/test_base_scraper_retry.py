#!/usr/bin/env python3
"""Tests for BaseScraper retry mechanism - applies to ALL scrapers."""

from unittest.mock import Mock, patch

import pytest
from selenium.common.exceptions import TimeoutException, WebDriverException

from scrapers.base_scraper import BaseScraper


class MockBaseScraper(BaseScraper):
    """Test implementation of BaseScraper."""

    def __init__(self, organization_id=1):
        super().__init__(organization_id=organization_id)

    def collect_data(self):
        return []

    def _scrape_detail_page(self, url):
        """Mock detail page scraping for testing."""
        return {"name": "Test Animal", "external_id": "test123", "adoption_url": url}


@pytest.mark.slow
class TestBaseScrapeRetryMechanism:
    """Test retry functionality for ALL scrapers."""

    def setup_method(self):
        """Set up test fixtures."""
        self.scraper = MockBaseScraper(organization_id=1)

    def test_retry_mechanism_exists_in_base_scraper(self):
        """Test that retry mechanism exists in BaseScraper."""
        # Should have retry method in base class
        assert hasattr(self.scraper, "_scrape_with_retry")

    def test_retry_config_from_yaml(self):
        """Test retry config is loaded from YAML config."""
        # Should have default retry settings
        assert hasattr(self.scraper, "max_retries")
        assert hasattr(self.scraper, "retry_backoff_factor")
        assert self.scraper.max_retries >= 1

    def test_retry_on_timeout_exception(self):
        """Test retry logic on TimeoutException."""
        mock_method = Mock()
        mock_method.side_effect = [
            TimeoutException("Timeout"),
            TimeoutException("Timeout"),
            {"name": "Test Animal", "external_id": "test123", "adoption_url": "http://test.com"},
        ]

        result = self.scraper._scrape_with_retry(mock_method, "http://test.com")

        # Should succeed after retries
        assert result is not None
        assert result["name"] == "Test Animal"
        assert mock_method.call_count == 3

    def test_retry_on_webdriver_exception(self):
        """Test retry logic on WebDriverException."""
        mock_method = Mock()
        mock_method.side_effect = [
            WebDriverException("Connection failed"),
            WebDriverException("Connection failed"),
            {"name": "Test Animal", "external_id": "test123", "adoption_url": "http://test.com"},
        ]

        result = self.scraper._scrape_with_retry(mock_method, "http://test.com")

        # Should succeed after retries
        assert result is not None
        assert result["name"] == "Test Animal"
        assert mock_method.call_count == 3

    def test_retry_exhausted_returns_none(self):
        """Test that exhausted retries return None."""
        mock_method = Mock()
        mock_method.side_effect = TimeoutException("Always timeout")

        result = self.scraper._scrape_with_retry(mock_method, "http://test.com")

        # Should return None after max retries
        assert result is None
        assert mock_method.call_count == self.scraper.max_retries

    def test_invalid_name_detection(self):
        """Test detection of invalid names from connection errors."""
        # Should detect common error patterns
        assert self.scraper._is_invalid_name("This Site Cant Be Reached")
        assert self.scraper._is_invalid_name("Error 404")
        assert self.scraper._is_invalid_name("Connection Failed")
        assert self.scraper._is_invalid_name("Page Not Found")
        assert self.scraper._is_invalid_name("Site can't be reached")
        assert self.scraper._is_invalid_name("DNS_PROBE_FINISHED_NXDOMAIN")

        # Should accept valid names
        assert not self.scraper._is_invalid_name("Lilly")
        assert not self.scraper._is_invalid_name("Max")
        assert not self.scraper._is_invalid_name("Bella Rosa")

    def test_enhanced_data_validation(self):
        """Test enhanced _validate_animal_data rejects invalid names."""
        # Valid animal data
        valid_data = {"name": "Lilly", "external_id": "test123", "adoption_url": "http://test.com"}
        assert self.scraper._validate_animal_data(valid_data)

        # Invalid name should be rejected
        invalid_data = {
            "name": "This Site Cant Be Reached",
            "external_id": "test123",
            "adoption_url": "http://test.com",
        }
        assert not self.scraper._validate_animal_data(invalid_data)

    @patch("time.sleep")  # Mock sleep to speed up tests
    def test_exponential_backoff(self, mock_sleep):
        """Test exponential backoff between retries."""
        mock_method = Mock()
        mock_method.side_effect = TimeoutException("Always timeout")

        # Set backoff factor for testing
        self.scraper.retry_backoff_factor = 2.0

        self.scraper._scrape_with_retry(mock_method, "http://test.com")

        # Should have called sleep with increasing delays
        expected_calls = [
            ((1.0,),),  # First retry: 1s
            ((2.0,),),  # Second retry: 2s
        ]
        mock_sleep.assert_has_calls(expected_calls)

    def test_skip_existing_animals_exists(self):
        """Test that skip existing animals method exists in BaseScraper."""
        assert hasattr(self.scraper, "_get_existing_animal_urls")
        assert hasattr(self.scraper, "_filter_existing_urls")

    def test_config_backward_compatibility(self):
        """Test that new config parameters don't break existing scrapers."""
        # Should work with missing config parameters (use defaults)
        assert self.scraper.max_retries == 3  # Default

        # Should have new optional parameters with defaults
        batch_size = getattr(self.scraper, "batch_size", 6)  # Default 6
        assert batch_size >= 1

        skip_existing = getattr(self.scraper, "skip_existing_animals", False)  # Default False
        assert isinstance(skip_existing, bool)
