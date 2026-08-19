"""Test cache invalidation gating and scoping on scrape completion.

Two independent concerns are covered here:

1. **Gating** — failed and partial-failure scrapes must NOT invalidate the
   frontend cache. A Playwright timeout that produces a stale/empty result
   would otherwise trigger a refresh that replaces good data with bad. Only
   ``status="success"`` fires the invalidation hook.

2. **Scoping** — a scrape must only invalidate the detail pages it actually
   changed. The frontend tags every dog-detail fetch ``["animal", slug]``,
   so purging the bare ``"animal"`` tag invalidates all ~1,300 dog pages at
   once. With 13 orgs scraping 3x/week that produced ~150 full-site cache
   purges per month and blew the Vercel ISR write budget by 3.5x. Instead we
   purge the aggregate listing tags plus one per-slug tag per changed dog.
"""

from unittest.mock import Mock, patch

import pytest

from scrapers.base_scraper import BaseScraper
from services.database_service import DatabaseService

# Tags that must always fire — these back the listing/aggregate pages, which
# genuinely do change whenever any dog in any org is added, updated or removed.
AGGREGATE_TAGS = {
    "animals",
    "statistics",
    "country-stats",
    "age-stats",
    "filter-counts",
    "breed-stats",
    "breed-images",
    "organizations-enhanced",
}

# Tags that must NEVER fire — each of these fans out to every dog detail page.
FANOUT_TAGS = {"animal", "enhanced"}


class _StubScraper(BaseScraper):
    """Minimal concrete BaseScraper subclass for testing completion hooks."""

    def collect_data(self):
        return []


@pytest.fixture
def mock_db():
    """DB service whose completion logging is a no-op and slug lookup is empty."""
    mock_db = Mock(spec=DatabaseService)
    mock_db.complete_scrape_log.return_value = True
    mock_db.get_slugs_for_animals.return_value = []
    return mock_db


@pytest.fixture
def scraper(mock_db):
    return _StubScraper(organization_id=1, database_service=mock_db)


@pytest.fixture
def mock_invalidate_sync():
    """Patch invalidate_sync at the source so any import-form reaches the mock."""
    with patch("services.revalidation_client.invalidate_sync") as mock:
        yield mock


def _tags_from(mock_invalidate_sync) -> list[str]:
    return mock_invalidate_sync.call_args.kwargs["tags"]


@pytest.mark.unit
class TestCompleteScrapeLogCacheInvalidation:
    """``complete_scrape_log`` fires cache invalidation only on success."""

    def test_fires_on_success(self, scraper, mock_invalidate_sync):
        scraper.complete_scrape_log(status="success", animals_found=10)
        mock_invalidate_sync.assert_called_once()
        assert AGGREGATE_TAGS.issubset(set(_tags_from(mock_invalidate_sync)))

    def test_skips_on_warning(self, scraper, mock_invalidate_sync):
        scraper.complete_scrape_log(status="warning", animals_found=0)
        mock_invalidate_sync.assert_not_called()

    def test_skips_on_error(self, scraper, mock_invalidate_sync):
        scraper.complete_scrape_log(status="error", animals_found=0)
        mock_invalidate_sync.assert_not_called()

    def test_skips_on_unknown_status(self, scraper, mock_invalidate_sync):
        """Defensive default: any status that isn't exactly "success" skips."""
        scraper.complete_scrape_log(status="completed", animals_found=10)
        mock_invalidate_sync.assert_not_called()


@pytest.mark.unit
class TestCompleteScrapeLogWithMetricsCacheInvalidation:
    """Same gating applies to the metrics variant."""

    def test_fires_on_success(self, scraper, mock_invalidate_sync):
        scraper.complete_scrape_log_with_metrics(status="success", animals_found=5)
        mock_invalidate_sync.assert_called_once()

    def test_skips_on_warning(self, scraper, mock_invalidate_sync):
        scraper.complete_scrape_log_with_metrics(status="warning")
        mock_invalidate_sync.assert_not_called()

    def test_skips_on_error(self, scraper, mock_invalidate_sync):
        scraper.complete_scrape_log_with_metrics(status="error")
        mock_invalidate_sync.assert_not_called()


@pytest.mark.unit
class TestInvalidationIsScopedToChangedDogs:
    """Detail-page tags are per-slug; the fan-out tags must never be sent."""

    def test_never_sends_fanout_tags(self, scraper, mock_invalidate_sync):
        """The whole point of the change: "animal"/"enhanced" purge ~1,300 pages."""
        scraper.complete_scrape_log(status="success", animals_found=10)
        sent = set(_tags_from(mock_invalidate_sync))
        assert not (sent & FANOUT_TAGS), f"fan-out tags leaked into invalidation: {sent & FANOUT_TAGS}"

    def test_sends_slug_tag_for_each_changed_dog(self, scraper, mock_db, mock_invalidate_sync):
        scraper.mark_animal_changed(101)
        scraper.mark_animal_changed(102)
        mock_db.get_slugs_for_animals.return_value = ["rex-terrier-101", "bella-lab-102"]

        scraper.complete_scrape_log(status="success", animals_found=2)

        mock_db.get_slugs_for_animals.assert_called_once_with([101, 102])
        sent = set(_tags_from(mock_invalidate_sync))
        assert "rex-terrier-101" in sent
        assert "bella-lab-102" in sent
        assert AGGREGATE_TAGS.issubset(sent)

    def test_no_changed_dogs_sends_only_aggregate_tags(self, scraper, mock_db, mock_invalidate_sync):
        """A scrape where nothing changed must not purge any detail page."""
        scraper.complete_scrape_log(status="success", animals_found=50)

        mock_db.get_slugs_for_animals.assert_not_called()
        assert set(_tags_from(mock_invalidate_sync)) == AGGREGATE_TAGS

    def test_deduplicates_repeated_animal_ids(self, scraper, mock_db, mock_invalidate_sync):
        """An animal touched twice in one run must be requested once."""
        scraper.mark_animal_changed(101)
        scraper.mark_animal_changed(101)
        mock_db.get_slugs_for_animals.return_value = ["rex-terrier-101"]

        scraper.complete_scrape_log(status="success", animals_found=1)

        mock_db.get_slugs_for_animals.assert_called_once_with([101])

    def test_slug_lookup_failure_still_invalidates_listings(self, scraper, mock_db, mock_invalidate_sync):
        """A broken slug lookup must not cost us the listing refresh."""
        scraper.mark_animal_changed(101)
        mock_db.get_slugs_for_animals.side_effect = RuntimeError("connection lost")

        scraper.complete_scrape_log(status="success", animals_found=1)

        mock_invalidate_sync.assert_called_once()
        assert set(_tags_from(mock_invalidate_sync)) == AGGREGATE_TAGS

    def test_changed_ids_reset_between_runs(self, scraper, mock_db, mock_invalidate_sync):
        """Completion clears the buffer so a reused scraper can't re-purge."""
        scraper.mark_animal_changed(101)
        mock_db.get_slugs_for_animals.return_value = ["rex-terrier-101"]
        scraper.complete_scrape_log(status="success", animals_found=1)

        scraper._completion_logged = False
        mock_db.get_slugs_for_animals.reset_mock()
        scraper.complete_scrape_log(status="success", animals_found=1)

        mock_db.get_slugs_for_animals.assert_not_called()
