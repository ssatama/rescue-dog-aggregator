"""Test cache invalidation gating on scrape completion status.

Failed and partial-failure scrapes must NOT invalidate the frontend cache —
otherwise a Playwright timeout that produces a stale/empty result would
trigger a refresh that replaces good data with bad. Only ``status="success"``
should fire the invalidation hook.
"""

from unittest.mock import Mock, patch

import pytest

from scrapers.base_scraper import BaseScraper
from services.database_service import DatabaseService


class _StubScraper(BaseScraper):
    """Minimal concrete BaseScraper subclass for testing completion hooks."""

    def collect_data(self):
        return []


@pytest.fixture
def scraper():
    """Build a scraper with a mocked DB service so completion logging is a no-op."""
    mock_db = Mock(spec=DatabaseService)
    mock_db.complete_scrape_log.return_value = True
    return _StubScraper(organization_id=1, database_service=mock_db)


@pytest.fixture
def mock_invalidate_sync():
    """Patch invalidate_sync at the source so any import-form reaches the mock."""
    with patch("services.revalidation_client.invalidate_sync") as mock:
        yield mock


@pytest.mark.unit
class TestCompleteScrapeLogCacheInvalidation:
    """``complete_scrape_log`` fires cache invalidation only on success."""

    def test_fires_on_success(self, scraper, mock_invalidate_sync):
        scraper.complete_scrape_log(status="success", animals_found=10)
        mock_invalidate_sync.assert_called_once()
        # Expect the bulk tag set so all consumer pages refresh
        kwargs = mock_invalidate_sync.call_args.kwargs
        assert "animals" in kwargs["tags"]
        assert "animal" in kwargs["tags"]
        assert "statistics" in kwargs["tags"]

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
