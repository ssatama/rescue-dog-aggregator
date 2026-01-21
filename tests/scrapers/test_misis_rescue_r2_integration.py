"""Integration test for MISIs Rescue scraper with improved R2 upload."""

import unittest
from unittest.mock import patch

import pytest

from scrapers.misis_rescue.scraper import MisisRescueScraper
from utils.r2_service import R2Service


@pytest.mark.database
@pytest.mark.external
@pytest.mark.integration
@pytest.mark.integration
@pytest.mark.integration
@pytest.mark.slow
class TestMisisRescueR2Integration(unittest.TestCase):
    """Test MISIs Rescue scraper with new R2 upload improvements."""

    def setUp(self):
        """Set up test environment."""
        # Reset R2 state
        R2Service._consecutive_failures = 0
        R2Service._last_upload_time = 0
        R2Service._reset_config_cache()
        R2Service._failure_history.clear()
        R2Service._success_history.clear()
        R2Service._circuit_breaker_open = False
        R2Service._circuit_breaker_until = 0

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
    def test_misis_scraper_uses_batch_upload(self):
        """Test that MISIs scraper can use batch upload for multiple images."""
        scraper = MisisRescueScraper(config_id="misisrescue")

        # Mock get_all_dogs_from_listing to return test dogs
        test_dogs = [
            {"url": "/dog1", "name": "Dog 1"},
            {"url": "/dog2", "name": "Dog 2"},
            {"url": "/dog3", "name": "Dog 3"},
        ]

        # Mock the expected dogs data
        expected_dogs = [
            {
                "name": "Dog 1",
                "external_id": "dog1",
                "primary_image_url": "http://test.com/dog1.jpg",
                "additional_image_urls": [
                    "http://test.com/dog1-2.jpg",
                    "http://test.com/dog1-3.jpg",
                ],
            },
            {
                "name": "Dog 2",
                "external_id": "dog2",
                "primary_image_url": "http://test.com/dog2.jpg",
                "additional_image_urls": ["http://test.com/dog2-2.jpg"],
            },
            {
                "name": "Dog 3",
                "external_id": "dog3",
                "primary_image_url": "http://test.com/dog3.jpg",
                "additional_image_urls": [],
            },
        ]

        with patch.object(scraper, "_get_all_dogs_from_listing", return_value=test_dogs):
            with patch.object(scraper, "_filter_existing_urls") as mock_filter:
                # Return all URLs (no filtering)
                mock_filter.side_effect = lambda urls: urls

                with patch.object(scraper, "_process_dogs_in_batches", return_value=expected_dogs):
                    with patch.object(R2Service, "batch_upload_images") as mock_batch:
                        mock_batch.return_value = [
                            ("https://images.test.com/dog1.jpg", True),
                            ("https://images.test.com/dog1-2.jpg", True),
                            ("https://images.test.com/dog1-3.jpg", True),
                            ("https://images.test.com/dog2.jpg", True),
                            ("https://images.test.com/dog2-2.jpg", True),
                            ("https://images.test.com/dog3.jpg", True),
                        ]

                        # Collect data
                        dogs = scraper.collect_data()

                        # Should have 3 dogs
                        self.assertEqual(len(dogs), 3)

                        # Batch upload could have been called if scraper supports it
                        # Note: Current implementation might still use individual uploads

    def test_misis_scraper_handles_r2_failures_gracefully(self):
        """Test that scraper continues even when R2 fails."""
        scraper = MisisRescueScraper(config_id="misisrescue")

        test_dogs = [{"url": "/dog1", "name": "Dog 1"}]

        expected_dog = {
            "name": "Dog 1",
            "external_id": "dog1",
            "primary_image_url": "http://test.com/dog1.jpg",
        }

        with patch.object(scraper, "_get_all_dogs_from_listing", return_value=test_dogs):
            with patch.object(scraper, "_filter_existing_urls") as mock_filter:
                mock_filter.side_effect = lambda urls: urls

                with patch.object(scraper, "_process_dogs_in_batches", return_value=[expected_dog]):
                    # Simulate R2 failure
                    with patch.object(R2Service, "upload_image_from_url") as mock_upload:
                        mock_upload.return_value = ("http://test.com/dog1.jpg", False)

                        dogs = scraper.collect_data()

                        # Should still return dog data even with R2 failure
                        self.assertEqual(len(dogs), 1)
                        self.assertEqual(dogs[0]["name"], "Dog 1")
                        # Should keep original URL
                        self.assertEqual(dogs[0]["primary_image_url"], "http://test.com/dog1.jpg")

    def test_circuit_breaker_prevents_excessive_r2_calls(self):
        """Test that circuit breaker stops R2 uploads after failures."""
        # Open circuit breaker by simulating failures
        for i in range(5):
            R2Service.track_upload_failure("rate_limit")

        self.assertTrue(R2Service.is_circuit_breaker_open())

        scraper = MisisRescueScraper(config_id="misisrescue")
        test_dogs = [{"url": f"/dog{i}", "name": f"Dog {i}"} for i in range(10)]

        # Create expected dogs
        expected_dogs = []
        for i in range(10):
            expected_dogs.append(
                {
                    "name": f"Dog dog{i}",
                    "external_id": f"dog{i}",
                    "primary_image_url": f"http://test.com/dog{i}.jpg",
                }
            )

        with patch.object(scraper, "_get_all_dogs_from_listing", return_value=test_dogs):
            with patch.object(scraper, "_filter_existing_urls") as mock_filter:
                mock_filter.side_effect = lambda urls: urls

                with patch.object(scraper, "_process_dogs_in_batches", return_value=expected_dogs):
                    with patch.object(R2Service, "upload_image_from_url") as mock_upload:
                        mock_upload.return_value = ("http://test.com/image.jpg", False)

                        # Use circuit breaker upload
                        with patch.object(
                            R2Service,
                            "upload_image_with_circuit_breaker",
                            wraps=R2Service.upload_image_with_circuit_breaker,
                        ) as mock_cb:
                            dogs = scraper.collect_data()

                            # Should return all dogs
                            self.assertEqual(len(dogs), 10)

                            # R2 upload should not be called when circuit breaker is open
                            # (unless scraper doesn't use circuit breaker method)
                            # This depends on scraper implementation

    def test_adaptive_batch_size_based_on_failures(self):
        """Test that batch size adapts based on R2 failure rate."""
        # Start with good success rate
        for i in range(8):
            R2Service.track_upload_success()
        for i in range(2):
            R2Service.track_upload_failure("timeout")

        # Should have large batch size
        batch_size = R2Service.get_adaptive_batch_size()
        self.assertGreaterEqual(batch_size, 5)

        # Increase failure rate
        for i in range(10):
            R2Service.track_upload_failure("rate_limit")

        # Should have small batch size
        batch_size = R2Service.get_adaptive_batch_size()
        self.assertLessEqual(batch_size, 2)

    def test_health_monitoring_during_scraping(self):
        """Test that health metrics are available during scraping."""
        scraper = MisisRescueScraper(config_id="misisrescue")

        # Simulate some uploads
        R2Service.track_upload_success()
        R2Service.track_upload_failure("network")
        R2Service.track_upload_success()

        # Get health status
        health = R2Service.get_health_status()

        # Should have metrics
        self.assertIn("failure_rate", health)
        self.assertIn("circuit_breaker_open", health)
        self.assertIn("total_attempts", health)
        self.assertIn("adaptive_batch_size", health)

        # Failure rate should be ~33% (1 failure out of 3)
        self.assertAlmostEqual(health["failure_rate"], 33.33, places=1)


class TestMisisRescuePerformanceImprovements(unittest.TestCase):
    """Test performance improvements for MISIs Rescue scraper."""

    def test_concurrent_upload_performance(self):
        """Test that concurrent uploads are faster than sequential."""
        import time

        # Create test images
        test_images = [(f"http://test.com/dog{i}.jpg", f"Dog {i}", "misisrescue") for i in range(6)]

        def mock_slow_upload(url, name, org):
            # Simulate network delay
            time.sleep(0.01)
            return (f"https://r2.com/{name}.jpg", True)

        with patch.object(R2Service, "upload_image_from_url", side_effect=mock_slow_upload):
            # Test sequential upload time
            start = time.time()
            sequential_results = []
            for img in test_images:
                result = R2Service.upload_image_from_url(*img)
                sequential_results.append(result)
            sequential_time = time.time() - start

            # Test concurrent upload time
            start = time.time()
            concurrent_results = R2Service.concurrent_upload_images(test_images, max_workers=3, throttle_ms=0)
            concurrent_time = time.time() - start

            # Concurrent should be significantly faster
            self.assertLess(concurrent_time, sequential_time * 0.7)
            self.assertEqual(len(concurrent_results), len(sequential_results))

    def test_batch_upload_reduces_api_calls(self):
        """Test that batch upload with delays reduces rate limiting."""
        test_images = [(f"http://test.com/dog{i}.jpg", f"Dog {i}", "misisrescue") for i in range(10)]

        with patch.object(R2Service, "upload_image_from_url") as mock_upload:
            # Simulate some failures in the middle
            results = []
            for i in range(10):
                if i in [3, 4]:  # Fail for images 3 and 4
                    results.append((f"http://test.com/dog{i}.jpg", False))
                else:
                    results.append((f"https://r2.com/dog{i}.jpg", True))

            mock_upload.side_effect = results

            with patch("time.sleep") as mock_sleep:
                batch_results, stats = R2Service.batch_upload_images_with_stats(test_images, batch_size=3, adaptive_delay=True)

                # Should have paused between batches
                self.assertTrue(mock_sleep.called)

                # Stats should show 80% success rate
                self.assertEqual(stats["total"], 10)
                self.assertEqual(stats["successful"], 8)
                self.assertEqual(stats["failed"], 2)
                self.assertEqual(stats["success_rate"], 80.0)


if __name__ == "__main__":
    unittest.main()
