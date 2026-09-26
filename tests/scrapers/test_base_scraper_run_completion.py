"""A run completes exactly once, with its metrics, and never stays "running" (#557)."""

from unittest.mock import Mock, patch

import pytest

from scrapers.base_scraper import BaseScraper
from services.metrics_collector import MetricsCollector


def _dog(external_id):
    return {"name": f"Dog {external_id}", "external_id": external_id, "adoption_url": f"https://example.org/{external_id}", "primary_image_url": f"https://example.org/{external_id}.jpg"}


class _Scraper(BaseScraper):
    dogs: list = []

    def collect_data(self):
        return list(self.dogs)


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
    s.database_service = Mock()
    s.database_service.create_scrape_log.return_value = 77
    s.database_service.get_slugs_for_animals.return_value = []
    s.image_processing_service = None
    s.session_manager = Mock()
    s.session_manager.get_historical_average_dogs_found.return_value = None
    s.llm_handler = Mock()
    s._check_robots_permission = Mock(return_value=True)
    return s


def _completions(scraper):
    return [c.args for c in scraper.database_service.complete_scrape_log.call_args_list]


@pytest.mark.unit
class TestRunCompletion:
    def test_a_session_start_warning_no_longer_suppresses_the_success_write(self, scraper):
        scraper.session_manager.start_scrape_session.return_value = False
        scraper.dogs = [_dog("a")]

        with (
            patch.object(scraper, "save_animal", return_value=(1, "added")),
            patch.object(scraper, "detect_partial_failure", return_value=False),
            patch("services.revalidation_client.invalidate_sync"),
        ):
            assert scraper._run_with_connection() is True

        (completion,) = _completions(scraper)
        assert completion[1] == "success"
        assert "Failed to start scrape session" in completion[5], "the warning is a note in the final log"
        assert completion[7] is not None, "duration is recorded"

    def test_a_partial_failure_run_records_warning_with_metrics_and_purges_changed_dogs(self, scraper):
        scraper.dogs = [_dog("a"), _dog("b")]
        scraper.database_service.get_slugs_for_animals.return_value = ["dog-a-1", "dog-b-2"]
        ids = iter([1, 2])

        with (
            patch.object(scraper, "save_animal", side_effect=lambda d: (next(ids), "added")),
            patch.object(scraper, "detect_partial_failure", return_value=True),
            patch("services.revalidation_client.invalidate_sync") as invalidate,
        ):
            assert scraper._run_with_connection() is True

        (completion,) = _completions(scraper)
        assert completion[1] == "warning"
        assert completion[3] == 2, "animals_added"
        assert completion[6]["animals_added"] == 2, "detailed metrics are written for a warning run"
        assert completion[7] is not None, "duration is recorded for a warning run"
        assert {"dog-a-1", "dog-b-2"} <= set(invalidate.call_args.kwargs["tags"])
        scraper.session_manager.update_stale_data_detection.assert_not_called()

    def test_keyboard_interrupt_in_collect_data_leaves_the_log_error(self, scraper):
        with patch.object(scraper, "collect_data", side_effect=KeyboardInterrupt), pytest.raises(KeyboardInterrupt):
            scraper._run_with_connection()

        (completion,) = _completions(scraper)
        assert completion[1] == "error"
        assert "KeyboardInterrupt" in completion[5]

    def test_system_exit_leaves_the_log_error(self, scraper):
        with patch.object(scraper, "collect_data", side_effect=SystemExit(1)), pytest.raises(SystemExit):
            scraper._run_with_connection()

        assert _completions(scraper)[0][1] == "error"

    def test_an_ordinary_failure_is_completed_once_as_error(self, scraper):
        with patch.object(scraper, "collect_data", side_effect=RuntimeError("listing broke")):
            assert scraper._run_with_connection() is False

        (completion,) = _completions(scraper)
        assert completion[1] == "error"
        assert "listing broke" in completion[5]
