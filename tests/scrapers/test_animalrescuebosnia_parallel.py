"""Tests for Animal Rescue Bosnia parallel processing and skip existing features."""

import unittest
from concurrent.futures import Future
from unittest.mock import Mock, call, patch

import pytest

from scrapers.animalrescuebosnia.animalrescuebosnia_scraper import AnimalRescueBosniaScraper


@pytest.mark.integration
@pytest.mark.slow
class TestAnimalRescueBosniaParallel(unittest.TestCase):
    """Test cases for parallel processing and skip existing animals."""

    def setUp(self):
        """Set up test fixtures."""
        self.scraper = AnimalRescueBosniaScraper(config_id="animalrescuebosnia")

    def test_collect_data_uses_filter_existing_urls(self):
        """Test that collect_data uses _filter_existing_urls when skip_existing_animals is True."""
        # Ensure skip_existing_animals is True
        self.scraper.skip_existing_animals = True

        mock_animal_list = [
            {"name": "Dog1", "url": "https://example.com/dog1/"},
            {"name": "Dog2", "url": "https://example.com/dog2/"},
        ]

        with (
            patch.object(self.scraper, "get_animal_list", return_value=mock_animal_list),
            patch.object(self.scraper, "_filter_existing_urls", return_value=["https://example.com/dog1/"]) as mock_filter,
            patch.object(self.scraper, "_process_dogs_in_batches", return_value=[]) as mock_process,
        ):

            self.scraper.collect_data()

            # Verify _filter_existing_urls was called with the URLs
            expected_urls = ["https://example.com/dog1/", "https://example.com/dog2/"]
            mock_filter.assert_called_once_with(expected_urls)

            # Verify _process_dogs_in_batches was called with filtered URLs
            mock_process.assert_called_once_with(["https://example.com/dog1/"])

    def test_collect_data_skips_filter_when_disabled(self):
        """Test that collect_data skips filtering when skip_existing_animals is False."""
        # Ensure skip_existing_animals is False
        self.scraper.skip_existing_animals = False

        mock_animal_list = [
            {"name": "Dog1", "url": "https://example.com/dog1/"},
        ]

        with (
            patch.object(self.scraper, "get_animal_list", return_value=mock_animal_list),
            patch.object(self.scraper, "_filter_existing_urls") as mock_filter,
            patch.object(self.scraper, "_process_dogs_in_batches", return_value=[]) as mock_process,
        ):

            self.scraper.collect_data()

            # Verify _filter_existing_urls was NOT called
            mock_filter.assert_not_called()

            # Verify _process_dogs_in_batches was called with all URLs
            mock_process.assert_called_once_with(["https://example.com/dog1/"])

    def test_process_dogs_in_batches_splits_urls(self):
        """Test that _process_dogs_in_batches splits URLs into correct batches."""
        # Set batch_size to 2 for testing
        self.scraper.batch_size = 2

        urls = [
            "https://example.com/dog1/",
            "https://example.com/dog2/",
            "https://example.com/dog3/",
            "https://example.com/dog4/",
            "https://example.com/dog5/",
        ]

        with patch.object(self.scraper, "_process_single_batch", return_value=[]) as mock_single_batch, patch("time.sleep"):  # Mock sleep for rate limiting

            self.scraper._process_dogs_in_batches(urls)

            # Should be called 3 times: [dog1,dog2], [dog3,dog4], [dog5]
            self.assertEqual(mock_single_batch.call_count, 3)

            # Check the batches
            call_args = [call.args[0] for call in mock_single_batch.call_args_list]
            expected_batches = [["https://example.com/dog1/", "https://example.com/dog2/"], ["https://example.com/dog3/", "https://example.com/dog4/"], ["https://example.com/dog5/"]]
            self.assertEqual(call_args, expected_batches)

    def test_process_single_batch_uses_thread_pool(self):
        """Test that _process_single_batch uses ThreadPoolExecutor correctly."""
        urls = ["https://example.com/dog1/", "https://example.com/dog2/"]

        # Mock the ThreadPoolExecutor and futures
        mock_executor = Mock()
        mock_future1 = Mock(spec=Future)
        mock_future2 = Mock(spec=Future)

        # Mock successful results
        mock_future1.result.return_value = {"name": "Dog1", "external_id": "dog1"}
        mock_future2.result.return_value = {"name": "Dog2", "external_id": "dog2"}

        mock_executor.submit.side_effect = [mock_future1, mock_future2]
        # Configure context manager methods
        mock_executor.__enter__ = Mock(return_value=mock_executor)
        mock_executor.__exit__ = Mock(return_value=None)

        with (
            patch("concurrent.futures.ThreadPoolExecutor") as mock_tpe_class,
            patch("concurrent.futures.as_completed", return_value=[mock_future1, mock_future2]),
            patch.object(self.scraper, "_scrape_with_retry") as mock_scrape_retry,
            patch.object(self.scraper, "_validate_dog_data", return_value=True) as mock_validate,
        ):

            mock_tpe_class.return_value = mock_executor

            results = self.scraper._process_single_batch(urls)

            # Verify ThreadPoolExecutor was created with correct max_workers
            mock_tpe_class.assert_called_with(max_workers=self.scraper.batch_size)

            # Verify submit was called for each URL
            self.assertEqual(mock_executor.submit.call_count, 2)

            # Verify results
            self.assertEqual(len(results), 2)

    def test_batch_processing_respects_rate_limiting(self):
        """Test that batch processing includes rate limiting between batches."""
        urls = ["https://example.com/dog1/", "https://example.com/dog2/", "https://example.com/dog3/"]
        self.scraper.batch_size = 1  # Force 3 batches
        self.scraper.rate_limit_delay = 1.5

        with patch.object(self.scraper, "_process_single_batch", return_value=[]), patch("time.sleep") as mock_sleep:

            self.scraper._process_dogs_in_batches(urls)

            # Should sleep between batch 1->2 and batch 2->3 (2 times)
            self.assertEqual(mock_sleep.call_count, 2)
            mock_sleep.assert_has_calls([call(1.5), call(1.5)])

    def test_batch_processing_handles_empty_urls(self):
        """Test that batch processing handles empty URL list gracefully."""
        result = self.scraper._process_dogs_in_batches([])
        self.assertEqual(result, [])

    def test_batch_processing_filters_invalid_results(self):
        """Test that batch processing filters out invalid results."""
        urls = ["https://example.com/dog1/"]

        mock_executor = Mock()
        mock_future = Mock(spec=Future)
        mock_future.result.return_value = {"name": "Invalid Dog"}  # Missing required fields

        mock_executor.submit.return_value = mock_future
        # Configure context manager methods
        mock_executor.__enter__ = Mock(return_value=mock_executor)
        mock_executor.__exit__ = Mock(return_value=None)

        with (
            patch("concurrent.futures.ThreadPoolExecutor", return_value=mock_executor),
            patch("concurrent.futures.as_completed", return_value=[mock_future]),
            patch.object(self.scraper, "_scrape_with_retry"),
            patch.object(self.scraper, "_validate_dog_data", return_value=False),
        ):  # Invalid data

            results = self.scraper._process_single_batch(urls)

            # Should filter out invalid result
            self.assertEqual(results, [])


if __name__ == "__main__":
    unittest.main()
