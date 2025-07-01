"""
Comprehensive error handling tests for REAN scraper.

This test suite validates robust error handling across all REAN scraper operations,
including network failures, parsing errors, database issues, and recovery scenarios.
"""
from unittest.mock import Mock, patch

import pytest
import requests
from selenium.common.exceptions import TimeoutException, WebDriverException

from scrapers.rean.dogs_scraper import REANScraper


class TestREANErrorHandling:
    """Comprehensive error handling tests for REAN scraper."""

    @pytest.mark.slow
    @pytest.mark.network
    @patch('time.sleep')  # Speed up retry delays
    def test_network_request_timeout_handling(self, mock_sleep):
        """Test handling of network request timeouts."""
        scraper = REANScraper()
        scraper.logger = Mock()

        # Mock requests.get to raise timeout
        with patch('requests.get') as mock_get:
            mock_get.side_effect = requests.exceptions.Timeout(
                "Request timed out")

            # Should handle timeout gracefully
            result = scraper.scrape_page("https://rean.org.uk/test-page")

            assert result is None
            # Should retry according to max_retries setting
            assert mock_get.call_count <= scraper.max_retries + 1

    @pytest.mark.slow
    @pytest.mark.network
    @patch('time.sleep')  # Speed up retry delays
    def test_network_connection_error_handling(self, mock_sleep):
        """Test handling of network connection errors."""
        scraper = REANScraper()
        scraper.logger = Mock()

        # Mock requests.get to raise connection error
        with patch('requests.get') as mock_get:
            mock_get.side_effect = requests.exceptions.ConnectionError(
                "Connection failed")

            result = scraper.scrape_page("https://rean.org.uk/test-page")

            assert result is None
            assert mock_get.call_count <= scraper.max_retries + 1

    @pytest.mark.slow
    @pytest.mark.network
    @patch('time.sleep')  # Speed up retry delays
    def test_http_error_handling(self, mock_sleep):
        """Test handling of HTTP errors (404, 500, etc.)."""
        scraper = REANScraper()
        scraper.logger = Mock()

        # Mock requests.get to raise HTTP error
        with patch('requests.get') as mock_get:
            mock_response = Mock()
            mock_response.raise_for_status.side_effect = requests.exceptions.HTTPError(
                "404 Not Found")
            mock_get.return_value = mock_response

            result = scraper.scrape_page("https://rean.org.uk/missing-page")

            assert result is None

    def test_webdriver_initialization_failure(self):
        """Test handling of WebDriver initialization failures."""
        scraper = REANScraper()
        scraper.logger = Mock()

        # Mock webdriver.Chrome to raise exception
        with patch('selenium.webdriver.Chrome') as mock_chrome:
            mock_chrome.side_effect = WebDriverException(
                "ChromeDriver not found")

            result = scraper.extract_images_with_browser(
                "https://rean.org.uk/test")

            assert result == []
            scraper.logger.error.assert_called()

    def test_webdriver_timeout_handling(self):
        """Test handling of WebDriver timeouts during page loading."""
        scraper = REANScraper()
        scraper.logger = Mock()

        # Mock webdriver with timeout on get()
        with patch('selenium.webdriver.Chrome') as mock_chrome:
            mock_driver = Mock()
            mock_driver.get.side_effect = TimeoutException("Page load timeout")
            mock_chrome.return_value = mock_driver

            result = scraper.extract_images_with_browser(
                "https://rean.org.uk/slow-page")

            assert result == []
            mock_driver.quit.assert_called()  # Should clean up driver

    @pytest.mark.slow
    @pytest.mark.selenium
    @patch('time.sleep')  # Speed up WebDriver delays
    def test_webdriver_element_not_found_handling(self, mock_sleep):
        """Test handling when WebDriver can't find expected elements."""
        scraper = REANScraper()
        scraper.logger = Mock()

        with patch('selenium.webdriver.Chrome') as mock_chrome:
            mock_driver = Mock()
            mock_driver.find_elements.return_value = []  # No img elements found
            mock_chrome.return_value = mock_driver

            result = scraper.extract_images_with_browser(
                "https://rean.org.uk/no-images")

            assert result == []  # Should handle gracefully

    def test_html_parsing_error_handling(self):
        """Test handling of malformed HTML during parsing."""
        scraper = REANScraper()
        scraper.logger = Mock()

        # Test with severely malformed HTML
        malformed_html = "<html><body><p>Incomplete tag<div>No closing"

        result = scraper.extract_dog_content_from_html(malformed_html)

        # Should handle gracefully and return empty list or partial results
        assert isinstance(result, list)
        # BeautifulSoup is generally resilient, but we test the method doesn't
        # crash

    def test_empty_page_content_handling(self):
        """Test handling of empty or minimal page content."""
        scraper = REANScraper()
        scraper.logger = Mock()

        # Test with empty content
        empty_content = ""
        result = scraper.extract_dog_content_from_html(empty_content)
        assert result == []

        # Test with minimal content
        minimal_content = "<html><body></body></html>"
        result = scraper.extract_dog_content_from_html(minimal_content)
        assert result == []

    def test_invalid_image_url_handling(self):
        """Test handling of invalid or malformed image URLs."""
        scraper = REANScraper()
        scraper.logger = Mock()

        # Test invalid URLs
        invalid_urls = [
            "not-a-url",
            "://malformed",
            "",
            None,
            "javascript:void(0)",
            "data:invalid-base64"
        ]

        # Should filter out all invalid URLs
        for url in invalid_urls:
            assert not scraper._is_valid_rean_image(url)

    def test_cloudinary_upload_failure_graceful_handling(self):
        """Test graceful handling when Cloudinary image upload fails."""
        scraper = REANScraper()
        scraper.logger = Mock()
        scraper.cloudinary_service = Mock()

        # Mock Cloudinary service to fail
        scraper.cloudinary_service.upload_image_from_url.return_value = (
            None, False)

        animal_data = {
            "name": "Test Dog",
            "primary_image_url": "https://example.com/test.jpg",
            "organization_id": 1,
            "external_id": "test-123"
        }

        # Mock database operations
        scraper.get_existing_animal = Mock(return_value=None)
        scraper.create_animal = Mock(return_value=(1, "added"))

        # Should handle Cloudinary failure gracefully
        result = scraper.save_animal(animal_data)

        assert result == (1, "added")
        # Should keep original URL when Cloudinary fails
        assert "original_image_url" in animal_data

    def test_database_connection_failure_handling(self):
        """Test handling of database connection failures."""
        scraper = REANScraper()
        scraper.logger = Mock()

        # Mock database connection to fail
        with patch.object(scraper, 'connect_to_database', return_value=False):
            result = scraper.run()

            assert result is False

    def test_database_transaction_rollback_on_error(self):
        """Test that database transactions are properly rolled back on errors."""
        scraper = REANScraper()
        scraper.logger = Mock()
        scraper.conn = Mock()

        # Mock cursor to raise exception during execution
        mock_cursor = Mock()
        mock_cursor.execute.side_effect = Exception("Database error")
        scraper.conn.cursor.return_value = mock_cursor

        result = scraper.create_animal({"name": "Test", "organization_id": 1})

        assert result == (None, "error")
        scraper.conn.rollback.assert_called()

    def test_corrupted_dog_data_handling(self):
        """Test handling of corrupted or incomplete dog data."""
        scraper = REANScraper()
        scraper.logger = Mock()

        # Test various corrupted data scenarios
        corrupted_data_cases = [
            {"name": ""},  # Empty name
            {"name": None},  # None name
            {},  # Empty dict
            {"name": "Valid", "age_text": None},  # None age
            {"name": "Valid", "properties": "not-a-dict"},  # Invalid properties
        ]

        for corrupted_data in corrupted_data_cases:
            # Should handle gracefully without crashing
            try:
                result = scraper.standardize_animal_data(
                    corrupted_data, "test_page")
                # Should either return valid data or handle the error
                assert isinstance(result, dict) or result is None
            except Exception as e:
                # If an exception is raised, it should be logged
                pytest.fail(f"Unexpected exception for {corrupted_data}: {e}")

    def test_regex_pattern_failure_handling(self):
        """Test handling when regex patterns fail to match expected content."""
        scraper = REANScraper()
        scraper.logger = Mock()

        # Test with text that doesn't match expected patterns
        invalid_text_cases = [
            "Random text with no dog information",
            "123456789",  # Numbers only
            "Special !@#$%^&*() characters",
            "Foreign language: 这不是英文",  # Non-English text
            "   ",  # Whitespace only
        ]

        for text in invalid_text_cases:
            # Should handle gracefully
            name = scraper.extract_name(text)
            age = scraper.extract_age(text)
            weight = scraper.extract_weight(text)

            # Should return None or empty string, not crash
            assert name is None or isinstance(name, str)
            assert age is None or isinstance(age, str)
            assert weight is None or isinstance(weight, (int, float))

    @pytest.mark.slow
    @pytest.mark.selenium
    @patch('time.sleep')  # Speed up WebDriver delays
    def test_selenium_script_execution_failure(self, mock_sleep):
        """Test handling of JavaScript execution failures in browser automation."""
        scraper = REANScraper()
        scraper.logger = Mock()

        with patch('selenium.webdriver.Chrome') as mock_chrome:
            mock_driver = Mock()
            # Mock JavaScript execution to fail
            mock_driver.execute_script.side_effect = WebDriverException(
                "Script execution failed")
            mock_chrome.return_value = mock_driver

            result = scraper.extract_images_with_browser(
                "https://rean.org.uk/test")

            # Should handle script failure gracefully
            assert result == []
            mock_driver.quit.assert_called()

    def test_memory_exhaustion_simulation(self):
        """Test handling of memory constraints during large data processing."""
        scraper = REANScraper()
        scraper.logger = Mock()

        # Simulate very large dataset
        large_dog_list = [{"name": f"Dog{i}", "age_text": "2 years"}
                          for i in range(1000)]
        large_image_list = [
            f"https://img1.wsimg.com/isteam/ip/abc/dog{i}.jpg" for i in range(1000)]

        # Should handle large datasets without crashing
        result = scraper.associate_images_with_dogs(
            large_dog_list, large_image_list)

        assert len(result) == 1000
        assert all("name" in dog for dog in result)

    def test_concurrent_access_error_handling(self):
        """Test handling of database concurrent access errors."""
        scraper = REANScraper()
        scraper.logger = Mock()
        scraper.conn = Mock()

        # Set up scrape session (required for mark_animal_as_seen)
        scraper.current_scrape_session = "2024-01-01 10:00:00"

        # Mock cursor to simulate concurrent access conflict
        mock_cursor = Mock()
        # Create a generic database error instead of specific psycopg2 error
        mock_cursor.execute.side_effect = Exception("deadlock detected")
        scraper.conn.cursor.return_value = mock_cursor

        result = scraper.mark_animal_as_seen(123)

        assert result is False
        scraper.conn.rollback.assert_called()

    def test_partial_failure_detection_edge_cases(self):
        """Test edge cases in partial failure detection."""
        scraper = REANScraper()
        scraper.logger = Mock()
        scraper.conn = Mock()
        scraper.organization_id = 1

        # Mock database cursor
        mock_cursor = Mock()
        scraper.conn.cursor.return_value = mock_cursor

        # Test case 1: Database query returns None
        mock_cursor.fetchone.return_value = None
        result = scraper.detect_partial_failure(5)
        assert isinstance(result, bool)

        # Test case 2: Database query returns invalid data
        mock_cursor.fetchone.return_value = ("invalid", "data")
        result = scraper.detect_partial_failure(5)
        assert isinstance(result, bool)

        # Test case 3: Database query raises exception
        mock_cursor.execute.side_effect = Exception("Database connection lost")
        result = scraper.detect_partial_failure(5)
        assert result is True  # Should default to safe mode (assume failure)

    def test_image_association_error_recovery(self):
        """Test error recovery in image association process."""
        scraper = REANScraper()
        scraper.logger = Mock()

        # Test with valid data but simulated processing errors
        dog_data_list = [
            {"name": "Valid Dog", "age_text": "2 years"},
            {"name": "Another Valid Dog", "age_text": "3 years"},
        ]

        image_urls = [
            "https://img1.wsimg.com/isteam/ip/abc/dog1.jpg",
            "https://img1.wsimg.com/isteam/ip/abc/dog2.jpg",
        ]

        # Should handle processing gracefully even if there are internal issues
        try:
            result = scraper.associate_images_with_dogs(
                dog_data_list, image_urls)
            # Should return results for valid entries
            assert isinstance(result, list)
            assert len(result) == 2
        except Exception as e:
            pytest.fail(f"Should handle data processing gracefully: {e}")

    def test_cleanup_on_critical_failure(self):
        """Test that resources are properly cleaned up on critical failures."""
        scraper = REANScraper()
        scraper.logger = Mock()

        # Mock the connect_to_database to return True and set up a mock
        # connection
        with patch.object(scraper, 'connect_to_database', return_value=True):
            scraper.conn = Mock()
            scraper.start_scrape_log = Mock(return_value=True)
            scraper.start_scrape_session = Mock(return_value=True)
            scraper.scrape_log_id = 123

            # Mock critical failure during collect_data
            with patch.object(scraper, 'collect_data', side_effect=Exception("Critical error")):
                result = scraper.run()

                assert result is False
                # Should close connection on failure
                scraper.conn.close.assert_called()
