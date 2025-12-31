"""Test that BaseScraper uses batch uploads for ALL scrapers."""

from unittest.mock import Mock, patch

import pytest

from scrapers.base_scraper import BaseScraper


@pytest.mark.external
@pytest.mark.scrapers
@pytest.mark.slow
@pytest.mark.unit
class TestBaseScraperBatchUploads:
    """Test batch upload functionality in BaseScraper."""

    @pytest.fixture
    def mock_services(self):
        """Create mock services for testing."""
        with (
            patch("scrapers.base_scraper.create_default_sync_service") as mock_sync,
            patch("scrapers.base_scraper.ConfigLoader") as mock_loader,
            patch("utils.r2_service.R2Service") as mock_r2,
            patch("services.image_processing_service.ImageProcessingService") as mock_image_service,
        ):
            # Mock sync service
            mock_sync_instance = Mock()
            mock_sync_instance.sync_single_organization.return_value = Mock(organization_id=1, was_created=False)
            mock_sync.return_value = mock_sync_instance

            # Mock config
            mock_config = Mock()
            mock_config.get_scraper_config_dict.return_value = {
                "rate_limit_delay": 0.1,
                "max_retries": 1,
                "timeout": 10,
            }
            mock_config.name = "TestOrg"
            mock_loader.return_value.load_config.return_value = mock_config

            # Mock R2 service
            mock_r2_instance = Mock()
            mock_r2_instance.get_health_status.return_value = {"failure_rate": 10}
            mock_r2_instance.get_adaptive_batch_size.return_value = 5
            mock_r2.return_value = mock_r2_instance

            # Mock image processing service
            mock_image_service_instance = Mock()
            mock_image_service_instance.batch_process_images = Mock(side_effect=lambda animals, *args, **kwargs: animals)
            mock_image_service.return_value = mock_image_service_instance

            # Mock progress tracker
            mock_progress_tracker = Mock()
            mock_progress_tracker.update = Mock()
            mock_progress_tracker.should_log_progress = Mock(return_value=False)
            mock_progress_tracker.get_progress_message = Mock(return_value="")
            mock_progress_tracker.log_batch_progress = Mock()
            mock_progress_tracker.track_processing_stats = Mock()
            mock_progress_tracker.track_image_stats = Mock()
            mock_progress_tracker.track_quality_stats = Mock()
            mock_progress_tracker.track_performance_stats = Mock()
            mock_progress_tracker.log_completion_summary = Mock()

            yield {
                "sync": mock_sync_instance,
                "r2": mock_r2_instance,
                "image_service": mock_image_service_instance,
                "config": mock_config,
                "progress_tracker": mock_progress_tracker,
            }

    def test_batch_upload_for_single_animal(self, mock_services):
        """Test that batch upload is used even for a single animal."""

        class TestScraper(BaseScraper):
            def collect_data(self):
                return [
                    {
                        "name": "Test Dog",
                        "external_id": "test-1",
                        "primary_image_url": "https://example.com/dog.jpg",
                    }
                ]

        scraper = TestScraper(config_id="test")
        scraper.image_processing_service = mock_services["image_service"]
        scraper.r2_service = mock_services["r2"]
        scraper.progress_tracker = mock_services["progress_tracker"]

        # Mock database connection
        with patch.object(scraper, "connect_to_database"):
            with patch.object(scraper, "save_animal", return_value=(1, "created")):
                scraper._process_animals_data(scraper.collect_data())

        # Verify batch_process_images was called even for 1 animal
        mock_services["image_service"].batch_process_images.assert_called_once()
        call_args = mock_services["image_service"].batch_process_images.call_args
        assert len(call_args[0][0]) == 1  # First positional arg is animals_data
        assert call_args[1]["batch_size"] == 1  # batch_size should be 1 for single animal

    def test_batch_upload_for_small_dataset(self, mock_services):
        """Test that batch upload is used for small datasets (2-3 animals)."""

        class TestScraper(BaseScraper):
            def collect_data(self):
                return [
                    {
                        "name": "Dog 1",
                        "external_id": "test-1",
                        "primary_image_url": "https://example.com/dog1.jpg",
                    },
                    {
                        "name": "Dog 2",
                        "external_id": "test-2",
                        "primary_image_url": "https://example.com/dog2.jpg",
                    },
                    {
                        "name": "Dog 3",
                        "external_id": "test-3",
                        "primary_image_url": "https://example.com/dog3.jpg",
                    },
                ]

        scraper = TestScraper(config_id="test")
        scraper.image_processing_service = mock_services["image_service"]
        scraper.r2_service = mock_services["r2"]
        scraper.progress_tracker = mock_services["progress_tracker"]

        with patch.object(scraper, "connect_to_database"):
            with patch.object(scraper, "save_animal", return_value=(1, "created")):
                scraper._process_animals_data(scraper.collect_data())

        # Verify batch_process_images was called for 3 animals
        mock_services["image_service"].batch_process_images.assert_called_once()
        call_args = mock_services["image_service"].batch_process_images.call_args
        assert len(call_args[0][0]) == 3
        assert call_args[1]["batch_size"] == 3  # Should use size 3 for 3 animals
        assert call_args[1]["use_concurrent"] is False  # No concurrent for small dataset

    def test_batch_upload_for_large_dataset(self, mock_services):
        """Test that batch upload uses adaptive batch size and concurrency for large datasets."""

        class TestScraper(BaseScraper):
            def collect_data(self):
                return [
                    {
                        "name": f"Dog {i}",
                        "external_id": f"test-{i}",
                        "primary_image_url": f"https://example.com/dog{i}.jpg",
                    }
                    for i in range(15)
                ]

        scraper = TestScraper(config_id="test")
        scraper.image_processing_service = mock_services["image_service"]
        scraper.r2_service = mock_services["r2"]
        scraper.progress_tracker = mock_services["progress_tracker"]

        with patch.object(scraper, "connect_to_database"):
            with patch.object(scraper, "save_animal", return_value=(1, "created")):
                scraper._process_animals_data(scraper.collect_data())

        # Verify batch_process_images was called for 15 animals
        mock_services["image_service"].batch_process_images.assert_called_once()
        call_args = mock_services["image_service"].batch_process_images.call_args
        assert len(call_args[0][0]) == 15
        assert call_args[1]["batch_size"] == 5  # Should use adaptive batch size
        assert call_args[1]["use_concurrent"] is True  # Should use concurrent for > 10 animals

    def test_batch_upload_skipped_on_high_failure_rate(self, mock_services):
        """Test that batch upload is skipped when R2 failure rate is high."""

        # Set high failure rate
        mock_services["r2"].get_health_status.return_value = {"failure_rate": 60}

        class TestScraper(BaseScraper):
            def collect_data(self):
                return [
                    {
                        "name": "Test Dog",
                        "external_id": "test-1",
                        "primary_image_url": "https://example.com/dog.jpg",
                    }
                ]

        scraper = TestScraper(config_id="test")
        scraper.image_processing_service = mock_services["image_service"]
        scraper.r2_service = mock_services["r2"]
        scraper.progress_tracker = mock_services["progress_tracker"]

        with patch.object(scraper, "connect_to_database"):
            with patch.object(scraper, "save_animal", return_value=(1, "created")):
                scraper._process_animals_data(scraper.collect_data())

        # Verify batch_process_images was NOT called due to high failure rate
        mock_services["image_service"].batch_process_images.assert_not_called()

    def test_batch_upload_with_no_images(self, mock_services):
        """Test that batch upload handles animals with no images gracefully."""

        class TestScraper(BaseScraper):
            def collect_data(self):
                return [
                    {"name": "Dog 1", "external_id": "test-1"},
                    {
                        "name": "Dog 2",
                        "external_id": "test-2",
                        "primary_image_url": "https://example.com/dog2.jpg",
                    },
                ]  # No image

        scraper = TestScraper(config_id="test")
        scraper.image_processing_service = mock_services["image_service"]
        scraper.r2_service = mock_services["r2"]
        scraper.progress_tracker = mock_services["progress_tracker"]

        with patch.object(scraper, "connect_to_database"):
            with patch.object(scraper, "save_animal", return_value=(1, "created")):
                scraper._process_animals_data(scraper.collect_data())

        # Verify batch_process_images was still called
        mock_services["image_service"].batch_process_images.assert_called_once()
        call_args = mock_services["image_service"].batch_process_images.call_args
        assert len(call_args[0][0]) == 2  # Both animals passed to batch processing
