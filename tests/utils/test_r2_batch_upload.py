"""Test R2 Service batch upload functionality for improved performance."""

import unittest
from unittest.mock import MagicMock, patch

import pytest

from utils.r2_service import R2Service


@pytest.mark.database
@pytest.mark.external
@pytest.mark.slow
@pytest.mark.integration
class TestR2BatchUpload(unittest.TestCase):
    """Test batch upload functionality for R2 Service."""

    def setUp(self):
        """Reset R2Service state before each test."""
        R2Service._consecutive_failures = 0
        R2Service._last_upload_time = 0
        R2Service._reset_config_cache()

    def test_batch_upload_processes_in_groups(self):
        """Test that batch upload processes images in configured batch sizes."""
        # Create test data
        test_images = [
            ("http://test.com/dog1.jpg", "Dog 1", "test_org"),
            ("http://test.com/dog2.jpg", "Dog 2", "test_org"),
            ("http://test.com/dog3.jpg", "Dog 3", "test_org"),
            ("http://test.com/dog4.jpg", "Dog 4", "test_org"),
            ("http://test.com/dog5.jpg", "Dog 5", "test_org"),
        ]

        with patch.object(R2Service, "upload_image_from_url") as mock_upload:
            mock_upload.return_value = ("https://r2.com/image.jpg", True)

            # Call batch upload (to be implemented)
            results = R2Service.batch_upload_images(test_images, batch_size=2)

            # Verify all images were processed
            self.assertEqual(len(results), 5)
            self.assertEqual(mock_upload.call_count, 5)

    def test_batch_upload_pauses_between_batches(self):
        """Test that batch upload adds delays between batches."""
        test_images = [
            ("http://test.com/dog1.jpg", "Dog 1", "test_org"),
            ("http://test.com/dog2.jpg", "Dog 2", "test_org"),
            ("http://test.com/dog3.jpg", "Dog 3", "test_org"),
            ("http://test.com/dog4.jpg", "Dog 4", "test_org"),
        ]

        with patch.object(R2Service, "upload_image_from_url") as mock_upload:
            mock_upload.return_value = ("https://r2.com/image.jpg", True)

            with patch("time.sleep") as mock_sleep:
                _results = R2Service.batch_upload_images(test_images, batch_size=2, batch_delay=2.0)

                # Should pause after first batch (2 images), not after last
                # Expecting 1 pause for 4 images with batch_size=2
                pause_calls = [c for c in mock_sleep.call_args_list if c[0][0] >= 2.0]
                self.assertGreaterEqual(len(pause_calls), 1)

    def test_batch_upload_handles_mixed_results(self):
        """Test batch upload handles both successful and failed uploads."""
        test_images = [
            ("http://test.com/dog1.jpg", "Dog 1", "test_org"),
            ("http://test.com/dog2.jpg", "Dog 2", "test_org"),
            ("http://test.com/dog3.jpg", "Dog 3", "test_org"),
        ]

        with patch.object(R2Service, "upload_image_from_url") as mock_upload:
            # First succeeds, second fails, third succeeds
            mock_upload.side_effect = [
                ("https://r2.com/dog1.jpg", True),
                ("http://test.com/dog2.jpg", False),  # Failed, returns original
                ("https://r2.com/dog3.jpg", True),
            ]

            results = R2Service.batch_upload_images(test_images)

            self.assertEqual(len(results), 3)
            self.assertEqual(results[0], ("https://r2.com/dog1.jpg", True))
            self.assertEqual(results[1], ("http://test.com/dog2.jpg", False))
            self.assertEqual(results[2], ("https://r2.com/dog3.jpg", True))

    def test_batch_upload_respects_rate_limiting(self):
        """Test that batch upload respects existing rate limiting."""
        test_images = [
            ("http://test.com/dog1.jpg", "Dog 1", "test_org"),
            ("http://test.com/dog2.jpg", "Dog 2", "test_org"),
        ]

        # Set consecutive failures to trigger backoff
        R2Service._consecutive_failures = 2

        with patch.object(R2Service, "upload_image_from_url") as mock_upload:
            mock_upload.return_value = ("https://r2.com/image.jpg", True)

            with patch("time.sleep") as mock_sleep:
                R2Service.batch_upload_images(test_images, batch_size=1)

                # Should see delays due to rate limiting
                self.assertTrue(mock_sleep.called)

    def test_batch_upload_with_progress_callback(self):
        """Test batch upload with progress callback for monitoring."""
        test_images = [
            ("http://test.com/dog1.jpg", "Dog 1", "test_org"),
            ("http://test.com/dog2.jpg", "Dog 2", "test_org"),
            ("http://test.com/dog3.jpg", "Dog 3", "test_org"),
        ]

        progress_calls = []

        def progress_callback(current, total, url, success):
            progress_calls.append((current, total, url, success))

        with patch.object(R2Service, "upload_image_from_url") as mock_upload:
            mock_upload.return_value = ("https://r2.com/image.jpg", True)

            R2Service.batch_upload_images(test_images, batch_size=2, progress_callback=progress_callback)

            # Should have 3 progress calls
            self.assertEqual(len(progress_calls), 3)
            self.assertEqual(progress_calls[0][0], 1)  # First image
            self.assertEqual(progress_calls[0][1], 3)  # Total of 3
            self.assertEqual(progress_calls[2][0], 3)  # Last image

    def test_batch_upload_empty_list(self):
        """Test batch upload handles empty image list."""
        results = R2Service.batch_upload_images([])
        self.assertEqual(results, [])

    def test_batch_upload_single_image(self):
        """Test batch upload handles single image without batching."""
        test_images = [("http://test.com/dog1.jpg", "Dog 1", "test_org")]

        with patch.object(R2Service, "upload_image_from_url") as mock_upload:
            mock_upload.return_value = ("https://r2.com/dog1.jpg", True)

            with patch("time.sleep") as mock_sleep:
                results = R2Service.batch_upload_images(test_images, batch_size=5)

                # No batch delay should be applied for single image
                batch_delay_calls = [c for c in mock_sleep.call_args_list if c[0][0] >= 2.0]
                self.assertEqual(len(batch_delay_calls), 0)
                self.assertEqual(len(results), 1)

    def test_batch_upload_adaptive_delays(self):
        """Test batch upload uses adaptive delays based on failure rate."""
        test_images = [
            ("http://test.com/dog1.jpg", "Dog 1", "test_org"),
            ("http://test.com/dog2.jpg", "Dog 2", "test_org"),
            ("http://test.com/dog3.jpg", "Dog 3", "test_org"),
            ("http://test.com/dog4.jpg", "Dog 4", "test_org"),
        ]

        with patch.object(R2Service, "upload_image_from_url") as mock_upload:
            # Simulate increasing failures
            mock_upload.side_effect = [
                ("https://r2.com/dog1.jpg", True),
                ("http://test.com/dog2.jpg", False),  # Failure
                ("http://test.com/dog3.jpg", False),  # Failure
                ("https://r2.com/dog4.jpg", True),
            ]

            with patch("time.sleep") as mock_sleep:
                _results = R2Service.batch_upload_images(test_images, batch_size=2, adaptive_delay=True)

                # Should see increased delays after failures
                sleep_calls = mock_sleep.call_args_list
                if len(sleep_calls) >= 2:
                    # Second batch delay should be larger due to failures
                    first_batch_delays = [c[0][0] for c in sleep_calls[:1] if c[0][0] >= 1.0]
                    second_batch_delays = [c[0][0] for c in sleep_calls[1:] if c[0][0] >= 1.0]

                    if first_batch_delays and second_batch_delays:
                        # Adaptive delay should increase after failures
                        self.assertGreater(max(second_batch_delays), max(first_batch_delays))


class TestR2BatchUploadIntegration(unittest.TestCase):
    """Integration tests for batch upload with R2 configuration."""

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
    def test_batch_upload_with_real_configuration(self):
        """Test batch upload with mocked R2 configuration."""
        R2Service._reset_config_cache()

        test_images = [
            ("http://test.com/dog1.jpg", "Dog 1", "test_org"),
            ("http://test.com/dog2.jpg", "Dog 2", "test_org"),
        ]

        with patch("boto3.client") as mock_boto3:
            mock_s3_client = MagicMock()
            mock_boto3.return_value = mock_s3_client

            # Mock head_object to return 404 (not found)
            from botocore.exceptions import ClientError

            error_response = {"Error": {"Code": "404", "Message": "Not found"}}
            mock_s3_client.head_object.side_effect = ClientError(error_response, "HeadObject")

            # Mock successful upload
            mock_s3_client.upload_fileobj.return_value = None

            with patch("requests.get") as mock_get:
                mock_response = MagicMock()
                mock_response.status_code = 200
                mock_response.headers = {"content-type": "image/jpeg"}
                mock_response.content = b"fake_image_data"
                mock_response.raise_for_status = MagicMock()
                mock_get.return_value = mock_response

                results = R2Service.batch_upload_images(test_images, batch_size=2)

                self.assertEqual(len(results), 2)
                for url, success in results:
                    self.assertTrue(success)
                    self.assertIn("images.test.com", url)

    def test_batch_upload_statistics(self):
        """Test that batch upload returns useful statistics."""
        test_images = [
            ("http://test.com/dog1.jpg", "Dog 1", "test_org"),
            ("http://test.com/dog2.jpg", "Dog 2", "test_org"),
            ("http://test.com/dog3.jpg", "Dog 3", "test_org"),
            ("http://test.com/dog4.jpg", "Dog 4", "test_org"),
            ("http://test.com/dog5.jpg", "Dog 5", "test_org"),
        ]

        with patch.object(R2Service, "upload_image_from_url") as mock_upload:
            # Mix of successes and failures
            mock_upload.side_effect = [
                ("https://r2.com/dog1.jpg", True),
                ("http://test.com/dog2.jpg", False),
                ("https://r2.com/dog3.jpg", True),
                ("https://r2.com/dog4.jpg", True),
                ("http://test.com/dog5.jpg", False),
            ]

            results, stats = R2Service.batch_upload_images_with_stats(test_images)

            self.assertEqual(stats["total"], 5)
            self.assertEqual(stats["successful"], 3)
            self.assertEqual(stats["failed"], 2)
            self.assertEqual(stats["success_rate"], 60.0)
            self.assertIn("total_time", stats)
            self.assertIn("average_time", stats)


if __name__ == "__main__":
    unittest.main()
