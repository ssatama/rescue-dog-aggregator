"""A dog whose profile failed is profiled by a later run, not never."""

from unittest.mock import Mock, patch

import pytest

from scrapers.base_scraper import BaseScraper
from scrapers.constants import MAX_PROFILE_FAILED_RUNS
from services.metrics_collector import MetricsCollector

STORY = "Lipton is a gentle lurcher who loves long walks and a warm sofa afterwards. " * 3


class _Scraper(BaseScraper):
    def collect_data(self):
        return []


@pytest.fixture
def scraper():
    with patch("scrapers.base_scraper.ConfigLoader") as loader:
        config = Mock()
        config.get_scraper_config_dict.return_value = {"rate_limit_delay": 0, "max_retries": 1, "timeout": 10}
        config.name = "Test Rescue"
        loader.return_value.load_config.return_value = config
        s = _Scraper(organization_id=28, config_id="test", metrics_collector=MetricsCollector())
    s.database_service = Mock()
    s.llm_handler = Mock()
    s.llm_handler.is_enrichment_enabled.return_value = True
    return s


def _stored(dog_id, story=STORY, failed_runs=0):
    return {"id": dog_id, "name": f"Dog {dog_id}", "breed": "Lurcher", "age_text": "3 years", "properties": {"description": story}, "profile_failed_runs": failed_runs}


@pytest.mark.unit
class TestProfilingBacklog:
    def test_a_stored_dog_without_a_profile_is_queued(self, scraper):
        scraper.database_service.get_unprofiled_animals.return_value = [_stored(11149)]

        (item,) = scraper._profiling_backlog()

        assert item["id"] == 11149
        assert item["data"]["properties"]["description"] == STORY
        scraper.database_service.get_unprofiled_animals.assert_called_once_with(28)

    def test_a_dog_this_run_already_queued_is_not_queued_twice(self, scraper):
        scraper.animals_for_llm_enrichment = [{"id": 7, "data": {}, "action": "create"}]
        scraper.database_service.get_unprofiled_animals.return_value = [_stored(7), _stored(8)]

        assert [item["id"] for item in scraper._profiling_backlog()] == [8]

    def test_a_dog_without_enough_story_is_left_out(self, scraper):
        # The profiler would skip it and alert on every run (Pets in Turkey has no stories)
        scraper.database_service.get_unprofiled_animals.return_value = [_stored(1, story=""), _stored(2)]

        assert [item["id"] for item in scraper._profiling_backlog()] == [2]

    def test_one_run_takes_at_most_the_cap(self, scraper):
        scraper.database_service.get_unprofiled_animals.return_value = [_stored(i) for i in range(1, 100)]

        assert len(scraper._profiling_backlog()) == scraper.PROFILING_BACKLOG_CAP

    def test_nothing_is_looked_up_when_enrichment_is_off(self, scraper):
        scraper.llm_handler.is_enrichment_enabled.return_value = False

        assert scraper._profiling_backlog() == []
        scraper.database_service.get_unprofiled_animals.assert_not_called()

    def test_a_dog_that_failed_in_every_allowed_run_is_skipped_and_logged(self, scraper, caplog):
        """#633: an always-failing dog cost a retry budget and a Sentry event every run, and held a cap slot."""
        scraper.database_service.get_unprofiled_animals.return_value = [_stored(1, failed_runs=MAX_PROFILE_FAILED_RUNS), _stored(2, failed_runs=MAX_PROFILE_FAILED_RUNS - 1)]

        with caplog.at_level("WARNING"):
            assert [item["id"] for item in scraper._profiling_backlog()] == [2]

        assert any("[1]" in r.getMessage() and "failed profiling" in r.getMessage() for r in caplog.records)
