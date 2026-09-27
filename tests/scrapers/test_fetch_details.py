"""BaseScraper.fetch_details: one detail loop, one meaning for rate_limit_delay (#567)."""

import asyncio
import threading
from unittest.mock import Mock, patch

import pytest

from scrapers.base_scraper import BaseScraper


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
        config.get_scraper_config_dict.return_value = {"rate_limit_delay": 2.0, "max_retries": 1, "timeout": 10}
        config.name = "Test Rescue"
        loader.return_value.load_config.return_value = config
        return _Scraper(config_id="test")


def _dogs(*slugs):
    return [{"adoption_url": f"https://rescue.example/{slug}"} for slug in slugs]


@pytest.mark.unit
class TestFetchDetails:
    def test_the_interval_holds_across_five_workers(self, scraper, stub_clock):
        started = threading.Barrier(5, timeout=5)

        def fetch(dog):
            try:
                started.wait()  # the first five run at once, so all five really overlap
            except threading.BrokenBarrierError:
                pass
            return dog

        results = scraper.fetch_details(_dogs(*"abcdefghij"), fetch, max_workers=5)

        assert len(results) == 10
        # Ten request starts, 2 s apart: the first goes at once, the rest wait 2, 4 ... 18 s
        assert sorted(round(wait) for wait in stub_clock.calls) == [2, 4, 6, 8, 10, 12, 14, 16, 18]

    def test_results_keep_the_input_order(self, scraper):
        assert scraper.fetch_details(_dogs("a", "b", "c"), lambda dog: dog["adoption_url"][-1], max_workers=3) == ["a", "b", "c"]

    def test_duplicates_run_once(self, scraper):
        fetch = Mock(side_effect=lambda dog: dog)

        results = scraper.fetch_details(_dogs("a", "b", "a"), fetch, max_workers=2)

        assert fetch.call_count == 2
        assert [dog["adoption_url"] for dog in results] == ["https://rescue.example/a", "https://rescue.example/b"]

    def test_one_failure_does_not_stop_the_batch(self, scraper):
        def fetch(dog):
            if dog["adoption_url"].endswith("b"):
                raise ConnectionError("reset")
            return dog

        results = scraper.fetch_details(_dogs("a", "b", "c"), fetch, max_workers=3)

        assert [dog["adoption_url"][-1] for dog in results] == ["a", "c"]
        assert scraper.detail_failures == ["https://rescue.example/b"]

    def test_a_none_result_is_left_out_but_is_no_failure(self, scraper):
        assert scraper.fetch_details(_dogs("a"), lambda dog: None) == []
        assert scraper.detail_failures == []

    def test_every_attempt_takes_a_request_slot(self, scraper, stub_clock):
        fetch = Mock(side_effect=[ConnectionError("reset"), {"ok": True}])

        assert scraper.fetch_details(_dogs("a"), fetch, attempts=2) == [{"ok": True}]
        assert [round(wait) for wait in stub_clock.calls] == [2]  # the retry waited its turn

    def test_a_fetch_past_the_timeout_counts_as_failed(self, scraper):
        release = threading.Event()
        scraper.DETAIL_TIMEOUT_SECONDS = 0.05

        results = scraper.fetch_details(_dogs("a"), lambda dog: release.wait(5))
        release.set()

        assert results == []
        assert scraper.detail_failures == ["https://rescue.example/a"]

    def test_the_slot_clock_follows_a_raised_delay(self, scraper, stub_clock):
        """A robots.txt Crawl-delay raises rate_limit_delay after construction; the clock reads it live."""
        scraper._apply_crawl_delay("https://rescue.example/robots.txt", 10.0)

        scraper.fetch_details(_dogs("a", "b"), lambda dog: dog)

        assert [round(wait) for wait in stub_clock.calls] == [10]


@pytest.mark.unit
class TestFetchDetailsAsync:
    def test_one_at_a_time_with_the_interval_and_failures_counted(self, scraper, stub_clock):
        async def fetch(dog):
            if dog["adoption_url"].endswith("b"):
                raise ConnectionError("reset")
            return dog

        results = asyncio.run(scraper.fetch_details_async(_dogs("a", "b", "c", "a"), fetch))

        assert [dog["adoption_url"][-1] for dog in results] == ["a", "c"]
        assert scraper.detail_failures == ["https://rescue.example/b"]
        assert [round(wait) for wait in stub_clock.calls] == [2, 4]


@pytest.mark.unit
def test_a_new_run_starts_with_no_failures(scraper):
    scraper.detail_failures = ["https://rescue.example/old"]
    scraper._check_robots_permission = Mock(return_value=False)
    scraper.start_scrape_log = Mock(return_value=False)

    scraper._setup_scrape()

    assert scraper.detail_failures == []
