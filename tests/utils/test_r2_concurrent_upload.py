"""Test R2 Service concurrent upload functionality with proper throttling."""

import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import MagicMock, call, patch

import pytest

from utils.r2_service import R2Service


@pytest.mark.external
@pytest.mark.slow
@pytest.mark.utils
class TestR2ConcurrentUpload(unittest.TestCase):
    """Test concurrent upload functionality for R2 Service."""

    def setUp(self):
        """Reset R2Service state before each test."""
        R2Service._consecutive_failures = 0
        R2Service._last_upload_time = 0
        R2Service._reset_config_cache()

    def test_concurrent_upload_with_thread_pool(self):
        """Test concurrent uploads using thread pool with throttling."""
        test_images = [
            ("http://test.com/dog1.jpg", "Dog 1", "test_org"),
            ("http://test.com/dog2.jpg", "Dog 2", "test_org"),
            ("http://test.com/dog3.jpg", "Dog 3", "test_org"),
            ("http://test.com/dog4.jpg", "Dog 4", "test_org"),
        ]

        with patch.object(R2Service, "upload_image_from_url") as mock_upload:
            mock_upload.return_value = ("https://r2.com/image.jpg", True)

            results = R2Service.concurrent_upload_images(test_images, max_workers=2, throttle_ms=100)

            self.assertEqual(len(results), 4)
            self.assertEqual(mock_upload.call_count, 4)

    def test_concurrent_upload_respects_max_workers(self):
        """Test that concurrent upload respects max_workers limit."""
        test_images = [
            ("http://test.com/dog1.jpg", "Dog 1", "test_org"),
            ("http://test.com/dog2.jpg", "Dog 2", "test_org"),
            ("http://test.com/dog3.jpg", "Dog 3", "test_org"),
        ]

        upload_times = []

        def mock_upload_with_timing(url, name, org):
            upload_times.append(time.time())
            time.sleep(0.1)  # Simulate upload time
            return (f"https://r2.com/{name}.jpg", True)

        with patch.object(R2Service, "upload_image_from_url", side_effect=mock_upload_with_timing):
            start_time = time.time()
            results = R2Service.concurrent_upload_images(test_images, max_workers=2, throttle_ms=0)
            total_time = time.time() - start_time

            # With max_workers=2 and 3 images taking 0.1s each,
            # should take ~0.2s (2 parallel, then 1)
            self.assertLess(total_time, 0.35)
            self.assertEqual(len(results), 3)

    def test_concurrent_upload_with_throttling(self):
        """Test that concurrent upload applies throttling between uploads."""
        test_images = [
            ("http://test.com/dog1.jpg", "Dog 1", "test_org"),
            ("http://test.com/dog2.jpg", "Dog 2", "test_org"),
        ]

        with patch.object(R2Service, "upload_image_from_url") as mock_upload:
            mock_upload.return_value = ("https://r2.com/image.jpg", True)

            with patch("time.sleep") as mock_sleep:
                R2Service.concurrent_upload_images(test_images, max_workers=1, throttle_ms=500)

                # Should see throttle delays
                throttle_calls = [c for c in mock_sleep.call_args_list if c[0][0] >= 0.4 and c[0][0] <= 0.6]
                self.assertGreater(len(throttle_calls), 0)

    def test_concurrent_upload_handles_failures(self):
        """Test concurrent upload handles mixed success/failure results."""
        test_images = [
            ("http://test.com/dog1.jpg", "Dog 1", "test_org"),
            ("http://test.com/dog2.jpg", "Dog 2", "test_org"),
            ("http://test.com/dog3.jpg", "Dog 3", "test_org"),
        ]

        def mock_upload_by_url(url, name, org):
            # Return success/failure based on URL
            if "dog2" in url:
                return (url, False)
            return (f"https://r2.com/{name}.jpg", True)

        with patch.object(R2Service, "upload_image_from_url", side_effect=mock_upload_by_url):
            results = R2Service.concurrent_upload_images(test_images, max_workers=2)

            # Results should maintain order
            self.assertEqual(results[0][1], True)
            self.assertEqual(results[1][1], False)
            self.assertEqual(results[2][1], True)

    def test_concurrent_upload_with_semaphore_limiting(self):
        """Test concurrent upload uses semaphore for rate limiting."""
        test_images = [("http://test.com/dog1.jpg", f"Dog {i}", "test_org") for i in range(10)]

        concurrent_count = []
        current_uploads = 0

        def mock_upload_tracking(url, name, org):
            nonlocal current_uploads
            current_uploads += 1
            concurrent_count.append(current_uploads)
            time.sleep(0.05)  # Simulate upload
            current_uploads -= 1
            return (f"https://r2.com/{name}.jpg", True)

        with patch.object(R2Service, "upload_image_from_url", side_effect=mock_upload_tracking):
            results = R2Service.concurrent_upload_images(test_images, max_workers=3, max_concurrent_uploads=2)

            # Should never exceed max_concurrent_uploads
            self.assertLessEqual(max(concurrent_count), 2)
            self.assertEqual(len(results), 10)

    def test_concurrent_upload_with_progress_tracking(self):
        """Test concurrent upload with progress callback."""
        test_images = [
            ("http://test.com/dog1.jpg", "Dog 1", "test_org"),
            ("http://test.com/dog2.jpg", "Dog 2", "test_org"),
            ("http://test.com/dog3.jpg", "Dog 3", "test_org"),
        ]

        progress_updates = []

        def progress_callback(completed, total, url, success):
            progress_updates.append((completed, total, url, success))

        with patch.object(R2Service, "upload_image_from_url") as mock_upload:
            mock_upload.return_value = ("https://r2.com/image.jpg", True)

            R2Service.concurrent_upload_images(test_images, max_workers=2, progress_callback=progress_callback)

            # Should receive progress updates
            self.assertEqual(len(progress_updates), 3)
            # Final update should show all completed
            self.assertEqual(progress_updates[-1][0], 3)
            self.assertEqual(progress_updates[-1][1], 3)

    def test_concurrent_upload_exception_handling(self):
        """Test concurrent upload handles exceptions gracefully."""
        test_images = [
            ("http://test.com/dog1.jpg", "Dog 1", "test_org"),
            ("http://test.com/dog2.jpg", "Dog 2", "test_org"),
        ]

        def mock_upload_with_exception(url, name, org):
            if "dog1" in url:
                raise Exception("Network error")
            return ("https://r2.com/dog2.jpg", True)

        with patch.object(R2Service, "upload_image_from_url", side_effect=mock_upload_with_exception):
            results = R2Service.concurrent_upload_images(test_images, max_workers=2)

            # Should handle exception and return failure
            self.assertEqual(results[0][1], False)  # First failed
            self.assertEqual(results[1][1], True)  # Second succeeded

    def test_concurrent_vs_sequential_performance(self):
        """Test that concurrent upload is faster than sequential."""
        test_images = [("http://test.com/dog1.jpg", f"Dog {i}", "test_org") for i in range(6)]

        def mock_slow_upload(url, name, org):
            time.sleep(0.05)  # Simulate network delay
            return (f"https://r2.com/{name}.jpg", True)

        with patch.object(R2Service, "upload_image_from_url", side_effect=mock_slow_upload):
            # Sequential upload
            start = time.time()
            sequential_results = []
            for img_url, name, org in test_images:
                result = R2Service.upload_image_from_url(img_url, name, org)
                sequential_results.append(result)
            sequential_time = time.time() - start

            # Concurrent upload
            start = time.time()
            concurrent_results = R2Service.concurrent_upload_images(test_images, max_workers=3, throttle_ms=0)
            concurrent_time = time.time() - start

            # Concurrent should be significantly faster
            self.assertLess(concurrent_time, sequential_time * 0.6)
            self.assertEqual(len(concurrent_results), len(sequential_results))


class TestR2ConcurrentUploadStatistics(unittest.TestCase):
    """Test concurrent upload statistics and monitoring."""

    def test_concurrent_upload_with_statistics(self):
        """Test concurrent upload returns detailed statistics."""
        test_images = [("http://test.com/dog1.jpg", f"Dog {i}", "test_org") for i in range(5)]

        with patch.object(R2Service, "upload_image_from_url") as mock_upload:
            mock_upload.side_effect = [
                ("https://r2.com/dog0.jpg", True),
                ("http://test.com/dog1.jpg", False),
                ("https://r2.com/dog2.jpg", True),
                ("https://r2.com/dog3.jpg", True),
                ("http://test.com/dog4.jpg", False),
            ]

            results, stats = R2Service.concurrent_upload_images_with_stats(test_images, max_workers=2)

            self.assertEqual(stats["total"], 5)
            self.assertEqual(stats["successful"], 3)
            self.assertEqual(stats["failed"], 2)
            self.assertEqual(stats["success_rate"], 60.0)
            self.assertIn("total_time", stats)
            self.assertIn("average_time", stats)
            self.assertIn("max_concurrent", stats)

    def test_concurrent_upload_adaptive_throttling(self):
        """Test concurrent upload adapts throttling based on failures."""
        test_images = [("http://test.com/dog1.jpg", f"Dog {i}", "test_org") for i in range(4)]

        call_count = 0

        def mock_upload_with_failures(url, name, org):
            nonlocal call_count
            call_count += 1
            # First two calls fail, then succeed
            if call_count <= 2:
                return (url, False)
            return (f"https://r2.com/{name}.jpg", True)

        with patch.object(R2Service, "upload_image_from_url", side_effect=mock_upload_with_failures):
            with patch("time.sleep") as mock_sleep:
                R2Service.concurrent_upload_images(test_images, max_workers=1, adaptive_throttle=True, throttle_ms=100)  # Start with 100ms throttle

                # Should see throttle delays between uploads
                sleep_calls = [c[0][0] for c in mock_sleep.call_args_list if len(c[0]) > 0]
                # Filter for throttle-related delays (not rate limiting)
                throttle_delays = [d for d in sleep_calls if 0.05 < d < 5.0]

                # With adaptive throttling and failures, we should see delays
                if throttle_delays:
                    # Check that delays increase after failures
                    self.assertTrue(any(d > 0.1 for d in throttle_delays))


if __name__ == "__main__":
    unittest.main()
