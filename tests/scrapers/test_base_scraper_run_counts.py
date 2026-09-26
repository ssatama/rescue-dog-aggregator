"""A run counts the dogs it collected but did not save (#555)."""

from datetime import datetime
from unittest.mock import Mock, patch

import pytest

from scrapers.base_scraper import BaseScraper
from scrapers.validation.animal_validator import AnimalValidator
from services.image_processing_service import ImageProcessingService
from services.metrics_collector import MetricsCollector


def _dog(external_id, **overrides):
    dog = {
        "name": f"Dog {external_id}",
        "external_id": external_id,
        "adoption_url": f"https://example.org/dogs/{external_id}",
        "primary_image_url": f"https://example.org/{external_id}.jpg",
    }
    dog.update(overrides)
    return dog


class _Scraper(BaseScraper):
    def collect_data(self):
        return []


@pytest.fixture
def scraper():
    with (
        patch("scrapers.base_scraper.create_default_sync_service") as sync,
        patch("scrapers.base_scraper.ConfigLoader") as loader,
    ):
        sync.return_value.sync_single_organization.return_value = Mock(organization_id=1, was_created=False)
        config = Mock()
        config.get_scraper_config_dict.return_value = {"rate_limit_delay": 0, "max_retries": 1, "timeout": 10}
        config.name = "Test Rescue"
        loader.return_value.load_config.return_value = config
        s = _Scraper(config_id="test", metrics_collector=MetricsCollector())
    s.image_processing_service = None
    s.session_manager = None
    s.progress_tracker = Mock(should_log_progress=Mock(return_value=False), get_progress_message=Mock(return_value=""))
    return s


def _save_fails_for(failing_id):
    def save(animal_data):
        if animal_data["external_id"] == failing_id:
            return None, "error"
        return 1, "added"

    return save


@pytest.mark.unit
class TestProcessingCounts:
    def test_rejected_dog_and_failed_save_are_counted(self, scraper):
        dogs = [_dog("a"), _dog("b", primary_image_url=None), _dog("c"), _dog("d", name="123")]

        with patch.object(scraper, "save_animal", side_effect=_save_fails_for("c")), patch("scrapers.base_scraper.alert_dogs_not_saved"):
            stats = scraper._process_animals_data(dogs)

        assert stats["animals_added"] == 1
        assert stats["animals_rejected"] == 2
        assert stats["rejected"] == {"no_image": 1, "invalid_name": 1}
        assert stats["rejected_ids"] == ["b", "d"]
        assert stats["save_errors"] == 1
        assert stats["save_error_ids"] == ["c"]
        assert BaseScraper._completion_rate(dogs, stats) == 25.0

    def test_losses_reach_detailed_metrics_and_progress_summary(self, scraper):
        dogs = [_dog("a"), _dog("b", primary_image_url=None)]
        scraper.scrape_start_time = datetime.now()

        with (
            patch.object(scraper, "save_animal", return_value=(1, "added")),
            patch.object(scraper, "complete_scrape_log_with_metrics") as complete,
            patch("scrapers.base_scraper.alert_dogs_not_saved"),
        ):
            stats = scraper._process_animals_data(dogs)
            stats["potential_failure_detected"] = False
            scraper._log_completion_metrics(dogs, stats)

        metrics = complete.call_args.kwargs["detailed_metrics"]
        assert metrics["animals_rejected"] == 1
        assert metrics["rejected"] == {"no_image": 1}
        assert metrics["save_errors"] == 0
        assert "database_operations" in metrics["phase_timings"]
        scraper.progress_tracker.track_processing_stats.assert_called_once()
        assert scraper.progress_tracker.track_processing_stats.call_args.kwargs["processing_failures"] == 1
        assert scraper.progress_tracker.track_quality_stats.call_args.kwargs["completion_rate"] == 50.0

    def test_sentry_warned_when_losses_exceed_ten_percent(self, scraper):
        dogs = [_dog(str(i)) for i in range(9)] + [_dog("x", primary_image_url=None)]
        dogs.append(_dog("y", primary_image_url=None))

        with patch.object(scraper, "save_animal", return_value=(1, "added")), patch("scrapers.base_scraper.alert_dogs_not_saved") as alert:
            scraper._process_animals_data(dogs)

        alert.assert_called_once()
        assert alert.call_args.kwargs["dogs_collected"] == 11
        assert alert.call_args.kwargs["rejected"] == {"no_image": 2}

    def test_no_sentry_warning_at_ten_percent_or_less(self, scraper):
        dogs = [_dog(str(i)) for i in range(9)] + [_dog("x", primary_image_url=None)]

        with patch.object(scraper, "save_animal", return_value=(1, "added")), patch("scrapers.base_scraper.alert_dogs_not_saved") as alert:
            stats = scraper._process_animals_data(dogs)

        alert.assert_not_called()
        assert stats["animals_rejected"] == 1

    def test_sentry_failure_does_not_abort_the_run(self, scraper):
        dogs = [_dog("a", primary_image_url=None)]

        with patch("scrapers.base_scraper.alert_dogs_not_saved", side_effect=RuntimeError("sentry down")):
            stats = scraper._process_animals_data(dogs)

        assert stats["animals_rejected"] == 1

    def test_llm_phase_is_timed(self, scraper):
        scraper.llm_handler = Mock()
        with (
            patch.object(scraper, "_setup_scrape", return_value=True),
            patch.object(scraper, "_collect_and_time_data", return_value=[]),
            patch.object(scraper, "_finalize_scrape"),
            patch.object(scraper, "_log_completion_metrics"),
            patch("scrapers.base_scraper.alert_zero_dogs_found"),
        ):
            assert scraper._run_with_connection() is True

        assert "llm_enrichment" in scraper.metrics_collector.get_phase_timings()


@pytest.mark.unit
class TestRejectionReason:
    @pytest.mark.parametrize(
        ("overrides", "reason"),
        [
            ({}, None),
            ({"adoption_url": ""}, "missing_field"),
            ({"external_id": None}, "missing_field"),
            ({"name": "12345"}, "invalid_name"),
            ({"primary_image_url": ""}, "no_image"),
            ({"primary_image_url": None}, "no_image"),
        ],
    )
    def test_reason_matches_validation(self, overrides, reason):
        validator = AnimalValidator()
        dog = {**_dog("a"), **overrides}

        assert validator.rejection_reason(dog) == reason
        assert validator.validate_animal_data(dog)[0] is (reason is None)

    def test_not_a_dict(self):
        assert AnimalValidator().rejection_reason(None) == "missing_field"


@pytest.mark.unit
class TestImageCounts:
    def test_uploaded_reused_and_failed_are_counted_per_dog(self):
        def upload(images, **kwargs):
            results = [("https://images.rescuedogs.me/org/new.jpg", True) if url.endswith("new.jpg") else (None, False) for url, _, _ in images]
            return results, {"successful": 1, "total": len(images), "success_rate": 50.0, "total_time": 0.1}

        r2 = Mock()
        r2.batch_upload_images_with_stats.side_effect = upload
        service = ImageProcessingService(r2_service=r2)
        conn = Mock()
        conn.cursor.return_value.fetchall.return_value = [("https://example.org/old.jpg", "https://images.rescuedogs.me/org/old.jpg")]
        dogs = [
            {"name": "Old", "primary_image_url": "https://example.org/old.jpg"},
            {"name": "New", "primary_image_url": "https://example.org/new.jpg"},
            {"name": "Broken", "primary_image_url": "https://example.org/broken.jpg"},
        ]
        counts = {}

        with patch.object(service, "_validate_image_url", return_value=True):
            service.batch_process_images(dogs, "org", use_concurrent=False, database_connection=conn, counts=counts)

        assert counts == {"images_uploaded": 1, "images_reused": 1, "images_failed": 1}
