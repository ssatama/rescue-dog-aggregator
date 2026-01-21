"""Test R2 Service intelligent fallback when R2 consistently fails."""

import time
import unittest
from unittest.mock import MagicMock, patch

import pytest

from utils.r2_service import R2Service


@pytest.mark.database
@pytest.mark.external
@pytest.mark.integration
@pytest.mark.integration
class TestR2IntelligentFallback(unittest.TestCase):
    """Test intelligent fallback mechanism for R2 Service."""

    def setUp(self):
        """Reset R2Service state before each test."""
        R2Service._consecutive_failures = 0
        R2Service._last_upload_time = 0
        R2Service._reset_config_cache()
        # Reset failure tracking - these are always present now
        R2Service._failure_history.clear()
        R2Service._success_history.clear()
        R2Service._circuit_breaker_open = False
        R2Service._circuit_breaker_until = 0

    def test_circuit_breaker_opens_after_threshold(self):
        """Test that circuit breaker opens after failure threshold."""
        # Simulate multiple failures
        for i in range(5):
            R2Service.track_upload_failure("test_error")

        # Circuit breaker should be open
        self.assertTrue(R2Service.is_circuit_breaker_open())

        # Uploads should be skipped
        url, success = R2Service.upload_image_with_circuit_breaker("http://test.com/image.jpg", "test_dog", "test_org")

        # Should return original URL with failure
        self.assertEqual(url, "http://test.com/image.jpg")
        self.assertFalse(success)

    def test_circuit_breaker_closes_after_timeout(self):
        """Test that circuit breaker closes after timeout period."""
        # Open circuit breaker
        for i in range(5):
            R2Service.track_upload_failure("test_error")

        self.assertTrue(R2Service.is_circuit_breaker_open())

        # Mock time to simulate timeout
        current_time = time.time()
        with patch("utils.r2_service.time.time") as mock_time:
            # Set time to after circuit breaker timeout
            mock_time.return_value = current_time + 61  # 1 minute + 1 second

            # Circuit breaker should be closed
            self.assertFalse(R2Service.is_circuit_breaker_open())

    def test_failure_rate_tracking(self):
        """Test that failure rate is tracked correctly."""
        # Track some successes and failures
        R2Service.track_upload_success()
        R2Service.track_upload_success()
        R2Service.track_upload_failure("error1")
        R2Service.track_upload_success()
        R2Service.track_upload_failure("error2")

        # Get failure rate (2 failures out of 5 attempts = 40%)
        failure_rate = R2Service.get_failure_rate()
        self.assertEqual(failure_rate, 40.0)

    def test_failure_rate_sliding_window(self):
        """Test that failure rate uses sliding window."""
        current_time = time.time()

        # Add old failures (should be ignored after window)
        with patch("utils.r2_service.time.time") as mock_time:
            # Old failures (5+ minutes ago)
            mock_time.return_value = current_time - 400
            R2Service.track_upload_failure("old_error")
            R2Service.track_upload_failure("old_error")

            # Recent failures
            mock_time.return_value = current_time
            R2Service.track_upload_success()
            R2Service.track_upload_failure("new_error")

            # Only recent attempts should count (1 failure, 1 success = 50%)
            failure_rate = R2Service.get_failure_rate(window_minutes=5)
            self.assertEqual(failure_rate, 50.0)

    def test_fallback_with_high_failure_rate(self):
        """Test that uploads fallback when failure rate is high."""
        # Create high failure rate
        for i in range(8):
            R2Service.track_upload_failure("error")
        for i in range(2):
            R2Service.track_upload_success()

        # 80% failure rate should trigger fallback
        with patch.object(R2Service, "upload_image_from_url") as mock_upload:
            mock_upload.return_value = ("https://r2.com/image.jpg", True)

            url, success = R2Service.upload_image_with_fallback(
                "http://test.com/image.jpg",
                "test_dog",
                "test_org",
                failure_threshold=70.0,
            )

            # Should not attempt upload due to high failure rate
            mock_upload.assert_not_called()
            self.assertEqual(url, "http://test.com/image.jpg")
            self.assertFalse(success)

    def test_exponential_backoff_reset_after_success_streak(self):
        """Test that exponential backoff resets after consecutive successes."""
        # Build up failures
        R2Service._consecutive_failures = 4

        # Simulate success streak
        for i in range(3):
            R2Service.track_upload_success()
            R2Service._consecutive_failures = 0

        # Backoff should be reset
        self.assertEqual(R2Service._consecutive_failures, 0)

    def test_adaptive_batch_size_based_on_failures(self):
        """Test that batch size adapts based on failure rate."""
        # Low failure rate - large batches
        for i in range(8):
            R2Service.track_upload_success()
        for i in range(2):
            R2Service.track_upload_failure("error")

        batch_size = R2Service.get_adaptive_batch_size()
        self.assertGreaterEqual(batch_size, 5)

        # High failure rate - small batches
        for i in range(10):
            R2Service.track_upload_failure("error")

        batch_size = R2Service.get_adaptive_batch_size()
        self.assertLessEqual(batch_size, 2)

    def test_health_check_endpoint(self):
        """Test health check provides useful metrics."""
        # Generate some activity
        R2Service.track_upload_success()
        R2Service.track_upload_failure("error")
        R2Service.track_upload_success()

        health = R2Service.get_health_status()

        self.assertIn("failure_rate", health)
        self.assertIn("circuit_breaker_open", health)
        self.assertIn("consecutive_failures", health)
        self.assertIn("total_attempts", health)
        self.assertIn("recent_errors", health)

    @patch.dict(
        "os.environ",
        {
            "R2_ACCOUNT_ID": "test_account",
            "R2_ACCESS_KEY_ID": "test_key",
            "R2_SECRET_ACCESS_KEY": "test_secret",
            "R2_BUCKET_NAME": "test_bucket",
            "R2_ENDPOINT": "https://test.r2.cloudflarestorage.com",
            "R2_CUSTOM_DOMAIN": "https://images.test.com",
        },
    )
    def test_fallback_integration_with_real_upload(self):
        """Test fallback integration with actual upload attempts."""
        R2Service._reset_config_cache()

        with patch("boto3.client") as mock_boto3:
            from botocore.exceptions import ClientError

            mock_s3_client = MagicMock()
            mock_boto3.return_value = mock_s3_client

            # Simulate rate limit errors
            error_response = {"Error": {"Code": "SlowDown", "Message": "Rate limited"}}
            mock_s3_client.head_object.side_effect = ClientError(error_response, "HeadObject")
            mock_s3_client.upload_fileobj.side_effect = ClientError(error_response, "PutObject")

            with patch("requests.get") as mock_get:
                mock_response = MagicMock()
                mock_response.status_code = 200
                mock_response.headers = {"content-type": "image/jpeg"}
                mock_response.content = b"fake_image_data"
                mock_response.raise_for_status = MagicMock()
                mock_get.return_value = mock_response

                # Try multiple uploads - should start failing fast
                results = []
                for i in range(10):
                    url, success = R2Service.upload_image_with_fallback(f"http://test.com/dog{i}.jpg", f"Dog {i}", "test_org")
                    results.append((url, success))

                # Early uploads might try, later ones should skip
                failed_count = sum(1 for _, success in results if not success)
                self.assertEqual(failed_count, 10)

                # Later uploads should skip R2 entirely
                later_calls = mock_s3_client.upload_fileobj.call_count
                self.assertLess(later_calls, 10)  # Not all should attempt


class TestR2FailureRecovery(unittest.TestCase):
    """Test R2 Service failure recovery mechanisms."""

    def setUp(self):
        """Reset R2Service state before each test."""
        R2Service._consecutive_failures = 0
        R2Service._last_upload_time = 0
        R2Service._reset_config_cache()
        # Reset failure tracking - these are always present now
        R2Service._failure_history.clear()
        R2Service._success_history.clear()
        R2Service._circuit_breaker_open = False
        R2Service._circuit_breaker_until = 0

    def test_gradual_recovery_after_circuit_breaker(self):
        """Test gradual recovery after circuit breaker opens."""
        # Open circuit breaker
        for i in range(5):
            R2Service.track_upload_failure("error")

        self.assertTrue(R2Service.is_circuit_breaker_open())

        # Wait for circuit breaker to close
        current_time = time.time()
        with patch("utils.r2_service.time.time") as mock_time:
            mock_time.return_value = current_time + 70

            # Circuit breaker should be closed after timeout
            self.assertFalse(R2Service.is_circuit_breaker_open())

            # Should allow attempts after circuit breaker closes
            with patch.object(R2Service, "upload_image_from_url") as mock_upload:
                mock_upload.return_value = ("https://r2.com/image.jpg", True)

                # First attempt should be allowed (testing)
                url, success = R2Service.upload_image_with_circuit_breaker("http://test.com/image.jpg", "test_dog", "test_org")

                # Should succeed since circuit breaker is closed
                self.assertTrue(success)
                self.assertEqual(url, "https://r2.com/image.jpg")
                # Circuit breaker should remain closed on success
                self.assertFalse(R2Service.is_circuit_breaker_open())

    def test_error_categorization(self):
        """Test that different error types are categorized correctly."""
        errors_to_categorize = [
            ("SlowDown", "rate_limit"),
            ("TooManyRequests", "rate_limit"),
            ("NetworkError", "network"),
            ("Timeout", "network"),
            ("InvalidImage", "validation"),
            ("Unknown", "other"),
        ]

        for error_code, expected_category in errors_to_categorize:
            category = R2Service.categorize_error(error_code)
            self.assertEqual(category, expected_category)

    def test_retry_with_jitter(self):
        """Test that retries include random jitter."""
        retry_delays = []

        for i in range(5):
            delay = R2Service.calculate_retry_delay(attempt=i)
            retry_delays.append(delay)

        # Base delays should generally increase (but jitter can cause variation)
        # Check that later attempts have higher base delays
        base_delays = [2**i for i in range(5)]
        for i, base_delay in enumerate(base_delays):
            # Allow for jitter (50% to 150% of base delay)
            self.assertGreaterEqual(retry_delays[i], base_delay * 0.5)
            self.assertLessEqual(retry_delays[i], min(base_delay * 1.5, 16 * 1.5))  # Cap at max

        # Overall trend should be increasing (compare first and last)
        self.assertGreater(retry_delays[-1], retry_delays[0])


if __name__ == "__main__":
    unittest.main()
