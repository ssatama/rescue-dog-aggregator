"""Test that BaseScraper uses batch uploads for ALL scrapers."""

from unittest.mock import MagicMock, Mock, patch

import pytest

from scrapers.base_scraper import BaseScraper
from utils.config_models import OrganizationMetadata


@pytest.mark.external
@pytest.mark.integration
@pytest.mark.unit
class TestBaseScraperBatchUploads:
    """Test batch upload functionality in BaseScraper."""

    @pytest.fixture
    def mock_services(self):
        """Create mock services for testing."""
        with (
            patch("scrapers.base_scraper.ConfigLoader") as mock_loader,
            patch("utils.r2_service.R2Service") as mock_r2,
            patch("services.image_processing_service.ImageProcessingService") as mock_image_service,
        ):
            # Mock config
            mock_config = Mock()
            mock_config.metadata = OrganizationMetadata()
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
            mock_image_service_instance.batch_process_galleries = Mock(return_value=(0, 0, 0))
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
                        "adoption_url": "https://example.com/dog",
                        "primary_image_url": "https://example.com/dog.jpg",
                    }
                ]

        scraper = TestScraper(config_id="test")
        scraper.image_processing_service = mock_services["image_service"]
        scraper.database_service = MagicMock()
        scraper.r2_service = mock_services["r2"]
        scraper.progress_tracker = mock_services["progress_tracker"]

        # Mock database connection
        with patch.object(scraper, "save_animal", return_value=(1, "created")):
            scraper._process_animals_data(scraper.collect_data())

        # Verify batch_process_images was called even for 1 animal
        mock_services["image_service"].batch_process_images.assert_called_once()
        call_args = mock_services["image_service"].batch_process_images.call_args
        assert len(call_args[0][0]) == 1  # First positional arg is animals_data
        assert call_args[1]["batch_size"] == 1  # batch_size should be 1 for single animal

    @pytest.mark.parametrize("paced", [True, False])
    def test_galleries_get_the_scrapers_request_clock_only_when_paced(self, mock_services, paced):
        """pace_photo_downloads hands wait_for_request_slot to the gallery step (#692)."""
        mock_services["config"].get_scraper_config_dict.return_value = {"rate_limit_delay": 0.1, "max_retries": 1, "timeout": 10, "pace_photo_downloads": paced}

        class TestScraper(BaseScraper):
            def collect_data(self):
                return [{"name": "Test Dog", "external_id": "test-1", "adoption_url": "https://example.com/dog", "primary_image_url": "https://example.com/dog.jpg"}]

        scraper = TestScraper(config_id="test")
        scraper.image_processing_service = mock_services["image_service"]
        scraper.database_service = MagicMock()
        scraper.r2_service = mock_services["r2"]
        scraper.progress_tracker = mock_services["progress_tracker"]

        with patch.object(scraper, "save_animal", return_value=(1, "created")):
            scraper._process_animals_data(scraper.collect_data())

        pace = mock_services["image_service"].batch_process_galleries.call_args.kwargs["pace"]
        assert pace == (scraper.wait_for_request_slot if paced else None)

    @pytest.mark.parametrize(
        ("paced", "counts", "line"),
        [
            (True, (150, 148, 262), "🖼️ Gallery photos: fetched 150, stored 148; 262 left for later runs"),
            (True, (2, 0, 0), "🖼️ Gallery photos: fetched 2, stored 0"),
            (False, (5, 5, 0), "🖼️ Gallery photos: fetched 5, stored 5"),
            (True, (0, 0, 0), None),
        ],
    )
    def test_the_run_log_says_how_many_gallery_photos_were_stored(self, mock_services, paced, counts, line):
        """The image service's INFO is muted in scraper runs, so the scraper logs its counts."""
        mock_services["config"].get_scraper_config_dict.return_value = {"rate_limit_delay": 0.1, "max_retries": 1, "timeout": 10, "pace_photo_downloads": paced}
        mock_services["image_service"].batch_process_galleries.return_value = counts

        class TestScraper(BaseScraper):
            def collect_data(self):
                return [{"name": "Test Dog", "external_id": "test-1", "adoption_url": "https://example.com/dog", "primary_image_url": "https://example.com/dog.jpg"}]

        scraper = TestScraper(config_id="test")
        scraper.image_processing_service = mock_services["image_service"]
        scraper.database_service = MagicMock()
        scraper.r2_service = mock_services["r2"]
        scraper.progress_tracker = mock_services["progress_tracker"]
        scraper.logger = Mock()

        with patch.object(scraper, "save_animal", return_value=(1, "created")):
            scraper._process_animals_data(scraper.collect_data())

        gallery_lines = [call.args[0] for call in scraper.logger.info.call_args_list if "Gallery photos" in call.args[0]]
        assert gallery_lines == ([line] if line else [])
        assert not [call for call in scraper.logger.warning.call_args_list if "Gallery" in call.args[0]]

    def test_batch_upload_for_small_dataset(self, mock_services):
        """Test that batch upload is used for small datasets (2-3 animals)."""

        class TestScraper(BaseScraper):
            def collect_data(self):
                return [
                    {
                        "name": "Dog 1",
                        "external_id": "test-1",
                        "adoption_url": "https://example.com/dog",
                        "primary_image_url": "https://example.com/dog1.jpg",
                    },
                    {
                        "name": "Dog 2",
                        "external_id": "test-2",
                        "adoption_url": "https://example.com/dog",
                        "primary_image_url": "https://example.com/dog2.jpg",
                    },
                    {
                        "name": "Dog 3",
                        "external_id": "test-3",
                        "adoption_url": "https://example.com/dog",
                        "primary_image_url": "https://example.com/dog3.jpg",
                    },
                ]

        scraper = TestScraper(config_id="test")
        scraper.image_processing_service = mock_services["image_service"]
        scraper.database_service = MagicMock()
        scraper.r2_service = mock_services["r2"]
        scraper.progress_tracker = mock_services["progress_tracker"]

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
                        "adoption_url": "https://example.com/dog",
                        "primary_image_url": f"https://example.com/dog{i}.jpg",
                    }
                    for i in range(15)
                ]

        scraper = TestScraper(config_id="test")
        scraper.image_processing_service = mock_services["image_service"]
        scraper.database_service = MagicMock()
        scraper.r2_service = mock_services["r2"]
        scraper.progress_tracker = mock_services["progress_tracker"]

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
                        "adoption_url": "https://example.com/dog",
                        "primary_image_url": "https://example.com/dog.jpg",
                    }
                ]

        scraper = TestScraper(config_id="test")
        scraper.image_processing_service = mock_services["image_service"]
        scraper.database_service = MagicMock()
        scraper.r2_service = mock_services["r2"]
        scraper.progress_tracker = mock_services["progress_tracker"]

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
                        "adoption_url": "https://example.com/dog",
                        "primary_image_url": "https://example.com/dog2.jpg",
                    },
                ]  # No image

        scraper = TestScraper(config_id="test")
        scraper.image_processing_service = mock_services["image_service"]
        scraper.database_service = MagicMock()
        scraper.r2_service = mock_services["r2"]
        scraper.progress_tracker = mock_services["progress_tracker"]

        with patch.object(scraper, "save_animal", return_value=(1, "created")):
            scraper._process_animals_data(scraper.collect_data())

        # Verify batch_process_images was still called
        mock_services["image_service"].batch_process_images.assert_called_once()
        call_args = mock_services["image_service"].batch_process_images.call_args
        # The dog with no image is rejected before any upload (#569)
        assert [dog["external_id"] for dog in call_args[0][0]] == ["test-2"]
