#!/usr/bin/env python3
"""Tests for MisisRescue batch processing."""

from unittest.mock import patch

import pytest

from scrapers.misis_rescue.scraper import MisisRescueScraper


@pytest.mark.slow
class TestMisisRescueBatchProcessing:
    """Test batch processing functionality for MisisRescue scraper."""

    def setup_method(self):
        """Set up test fixtures."""
        # Create scraper in legacy mode to avoid config dependency
        self.scraper = MisisRescueScraper(organization_id=13)

    def test_batch_processing_method_exists(self):
        """Test that batch processing method exists in MisisRescue."""
        assert hasattr(self.scraper, "_process_dogs_in_batches")
        assert hasattr(self.scraper, "_process_single_batch")

    def test_batch_size_configuration(self):
        """Test batch size is configurable via config."""
        # Should have configurable batch size
        assert hasattr(self.scraper, "batch_size")
        assert self.scraper.batch_size == 6  # Default

    def test_process_batch_of_urls(self):
        """Test processing a batch of URLs concurrently."""
        test_urls = ["http://example.com/dog1", "http://example.com/dog2", "http://example.com/dog3", "http://example.com/dog4", "http://example.com/dog5", "http://example.com/dog6"]

        with patch.object(self.scraper, "_scrape_with_retry") as mock_scrape:
            # Mock successful scraping for all URLs
            mock_scrape.side_effect = [{"name": f"Dog{i}", "external_id": f"test{i}", "adoption_url": url, "primary_image_url": f"http://example.com/image{i}.jpg"} for i, url in enumerate(test_urls, 1)]

            results = self.scraper._process_dogs_in_batches(test_urls)

            # Should process all URLs
            assert len(results) == 6
            assert mock_scrape.call_count == 6

            # Should return valid results (order may vary due to concurrency)
            result_names = {result["name"] for result in results}
            expected_names = {f"Dog{i}" for i in range(1, 7)}
            assert result_names == expected_names

    def test_batch_error_isolation(self):
        """Test that one failure doesn't affect other dogs in batch."""
        test_urls = [
            "http://example.com/dog1",  # Success
            "http://example.com/dog2",  # Failure
            "http://example.com/dog3",  # Success
        ]

        with patch.object(self.scraper, "_scrape_with_retry") as mock_scrape:
            # Mock mixed success/failure
            mock_scrape.side_effect = [
                {"name": "Dog1", "external_id": "test1", "adoption_url": test_urls[0], "primary_image_url": "http://example.com/image1.jpg"},
                None,  # Failure
                {"name": "Dog3", "external_id": "test3", "adoption_url": test_urls[2], "primary_image_url": "http://example.com/image3.jpg"},
            ]

            results = self.scraper._process_dogs_in_batches(test_urls)

            # Should return successful results, filter out failures
            assert len(results) == 2
            result_names = {result["name"] for result in results}
            expected_names = {"Dog1", "Dog3"}
            assert result_names == expected_names

    def test_batch_processing_large_list(self):
        """Test processing large list gets split into correct batches."""
        # Create 13 URLs (should create 3 batches: 6, 6, 1)
        test_urls = [f"http://example.com/dog{i}" for i in range(1, 14)]

        with patch.object(self.scraper, "_process_single_batch") as mock_batch:
            mock_batch.return_value = []  # Return empty for simplicity

            self.scraper._process_dogs_in_batches(test_urls)

            # Should call _process_single_batch 3 times
            assert mock_batch.call_count == 3

            # Check batch sizes
            call_args = [call[0][0] for call in mock_batch.call_args_list]
            assert len(call_args[0]) == 6  # First batch
            assert len(call_args[1]) == 6  # Second batch
            assert len(call_args[2]) == 1  # Third batch

    def test_rate_limiting_between_batches(self):
        """Test rate limiting is applied between batches."""
        test_urls = [f"http://example.com/dog{i}" for i in range(1, 8)]  # 2 batches

        with patch.object(self.scraper, "_process_single_batch") as mock_batch:
            with patch("time.sleep") as mock_sleep:
                mock_batch.return_value = []

                self.scraper._process_dogs_in_batches(test_urls)

                # Should sleep between batches (called once between 2 batches)
                mock_sleep.assert_called_once()

    def test_empty_batch_handling(self):
        """Test handling of empty batches."""
        empty_urls = []

        results = self.scraper._process_dogs_in_batches(empty_urls)

        # Should return empty list
        assert results == []

    def test_timeout_handling_in_batch(self):
        """Test timeout handling doesn't block entire batch."""
        test_urls = ["http://example.com/dog1", "http://example.com/dog2"]  # This will timeout

        with patch.object(self.scraper, "_scrape_with_retry") as mock_scrape:
            # First succeeds, second times out (returns None)
            mock_scrape.side_effect = [{"name": "Dog1", "external_id": "test1", "adoption_url": test_urls[0], "primary_image_url": "http://example.com/image1.jpg"}, None]  # Timeout result

            results = self.scraper._process_dogs_in_batches(test_urls)

            # Should only return successful result
            assert len(results) == 1
            assert results[0]["name"] == "Dog1"

    def test_integration_with_collect_data(self):
        """Test batch processing integration with collect_data method."""
        with patch.object(self.scraper, "_get_all_dogs_from_listing") as mock_listing:
            with patch.object(self.scraper, "_process_dogs_in_batches") as mock_batch:
                # Mock listing to return multiple dogs
                mock_listing.return_value = [{"name": "Dog1", "url": "/dog1"}, {"name": "Dog2", "url": "/dog2"}, {"name": "Dog3", "url": "/dog3"}]

                # Mock batch processing to return results
                mock_batch.return_value = [
                    {"name": "Dog1", "external_id": "test1", "adoption_url": "http://example.com/dog1"},
                    {"name": "Dog2", "external_id": "test2", "adoption_url": "http://example.com/dog2"},
                    {"name": "Dog3", "external_id": "test3", "adoption_url": "http://example.com/dog3"},
                ]

                result = self.scraper.collect_data()

                # Should use batch processing
                mock_batch.assert_called_once()
                assert len(result) == 3

                # Verify URLs were converted to full URLs
                call_args = mock_batch.call_args[0][0]
                expected_urls = ["https://www.misisrescue.com/dog1", "https://www.misisrescue.com/dog2", "https://www.misisrescue.com/dog3"]
                assert call_args == expected_urls
