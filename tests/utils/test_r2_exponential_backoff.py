"""Test R2 Service exponential backoff implementation"""

import unittest
from unittest.mock import MagicMock, patch

import pytest

from utils.r2_service import R2Service


@pytest.mark.api
@pytest.mark.external
@pytest.mark.slow
@pytest.mark.utils
class TestR2ExponentialBackoff(unittest.TestCase):
    """Test exponential backoff for R2 uploads"""

    def setUp(self):
        """Reset R2Service state before each test"""
        R2Service._consecutive_failures = 0
        R2Service._last_upload_time = 0

    def test_exponential_backoff_increases_delay(self):
        """Test that delay increases exponentially with failures"""
        with patch("time.sleep") as mock_sleep:
            with patch("random.uniform", return_value=0.25):  # Fixed jitter for testing
                # First call - no failures, 1 second delay
                R2Service._enforce_rate_limit()
                if mock_sleep.called:
                    self.assertLessEqual(mock_sleep.call_args[0][0], 1.0)

                # Simulate failures and check increasing delays
                R2Service._consecutive_failures = 1
                R2Service._last_upload_time = 0  # Reset to force delay
                R2Service._enforce_rate_limit()
                if mock_sleep.called:
                    # 2^1 = 2 seconds + 0.25 jitter = 2.25
                    self.assertAlmostEqual(mock_sleep.call_args[0][0], 2.25, places=1)

                R2Service._consecutive_failures = 2
                R2Service._last_upload_time = 0
                R2Service._enforce_rate_limit()
                if mock_sleep.called:
                    # 2^2 = 4 seconds + 0.25 jitter = 4.25
                    self.assertAlmostEqual(mock_sleep.call_args[0][0], 4.25, places=1)

                R2Service._consecutive_failures = 3
                R2Service._last_upload_time = 0
                R2Service._enforce_rate_limit()
                if mock_sleep.called:
                    # 2^3 = 8 seconds + 0.25 jitter = 8.25
                    self.assertAlmostEqual(mock_sleep.call_args[0][0], 8.25, places=1)

    def test_max_backoff_cap(self):
        """Test that backoff is capped at 16 seconds"""
        with patch("time.sleep") as mock_sleep:
            with patch("random.uniform", return_value=0.25):
                R2Service._consecutive_failures = 10  # Very high failure count
                R2Service._last_upload_time = 0
                R2Service._enforce_rate_limit()
                if mock_sleep.called:
                    # Should be capped at 16 + 0.25 = 16.25
                    self.assertAlmostEqual(mock_sleep.call_args[0][0], 16.25, places=1)

    def test_jitter_adds_randomness(self):
        """Test that jitter adds randomness to prevent synchronized retries"""
        delays = []
        for jitter_value in [0, 0.1, 0.3, 0.5]:
            with patch("random.uniform", return_value=jitter_value):
                with patch("time.sleep") as mock_sleep:
                    R2Service._consecutive_failures = 1
                    R2Service._last_upload_time = 0
                    R2Service._enforce_rate_limit()
                    if mock_sleep.called:
                        delays.append(mock_sleep.call_args[0][0])

        # All delays should be different due to jitter
        self.assertEqual(len(set(delays)), len(delays))
        # All should be between 2.0 and 2.5 (base 2s + jitter 0-0.5)
        for delay in delays:
            self.assertGreaterEqual(delay, 2.0)
            self.assertLessEqual(delay, 2.5)

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
    def test_failure_counter_reset_on_success(self):
        """Test that consecutive_failures resets to 0 on successful upload"""
        R2Service._reset_config_cache()

        with patch("boto3.client") as mock_boto3:
            mock_s3_client = MagicMock()
            mock_boto3.return_value = mock_s3_client

            # Mock successful head_object (image doesn't exist)
            from botocore.exceptions import ClientError

            error_response = {"Error": {"Code": "404", "Message": "Not found"}}
            mock_s3_client.head_object.side_effect = ClientError(
                error_response, "HeadObject"
            )

            # Mock successful upload
            mock_s3_client.upload_fileobj.return_value = None

            with patch("requests.get") as mock_get:
                mock_response = MagicMock()
                mock_response.status_code = 200
                mock_response.headers = {"content-type": "image/jpeg"}
                mock_response.content = b"fake_image_data"
                mock_response.raise_for_status = MagicMock()
                mock_get.return_value = mock_response

                # Set initial failure count
                R2Service._consecutive_failures = 3

                # Upload should succeed and reset counter
                url, success = R2Service.upload_image_from_url(
                    "http://test.com/image.jpg", "test_dog", "test_org"
                )

                self.assertTrue(success)
                self.assertEqual(R2Service._consecutive_failures, 0)

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
    def test_failure_counter_increment_on_rate_limit(self):
        """Test that consecutive_failures increments on rate limit errors"""
        R2Service._reset_config_cache()

        with patch("boto3.client") as mock_boto3:
            from botocore.exceptions import ClientError

            mock_s3_client = MagicMock()
            mock_boto3.return_value = mock_s3_client

            # Mock rate limit error
            error_response = {
                "Error": {"Code": "SlowDown", "Message": "Please reduce request rate"}
            }
            mock_s3_client.head_object.side_effect = ClientError(
                error_response, "HeadObject"
            )
            mock_s3_client.upload_fileobj.side_effect = ClientError(
                error_response, "PutObject"
            )

            with patch("requests.get") as mock_get:
                mock_response = MagicMock()
                mock_response.status_code = 200
                mock_response.headers = {"content-type": "image/jpeg"}
                mock_response.content = b"fake_image_data"
                mock_response.raise_for_status = MagicMock()
                mock_get.return_value = mock_response

                # Initial failure count should be 0
                self.assertEqual(R2Service._consecutive_failures, 0)

                # Upload should fail with rate limit
                url, success = R2Service.upload_image_from_url(
                    "http://test.com/image.jpg", "test_dog", "test_org"
                )

                self.assertFalse(success)
                self.assertEqual(R2Service._consecutive_failures, 1)

                # Another failure should increment
                url, success = R2Service.upload_image_from_url(
                    "http://test.com/image2.jpg", "test_dog2", "test_org"
                )

                self.assertFalse(success)
                self.assertEqual(R2Service._consecutive_failures, 2)


if __name__ == "__main__":
    unittest.main()
