"""A reactivated dog must not keep serving its retirement banner.

`mark_animal_as_seen` sets `active = true` unconditionally, but the scraper
only records an animal for cache invalidation on the "added" and "updated"
branches. A dog that goes missing, is marked inactive, then reappears with
byte-identical data takes the "no_change" branch - so its detail page keeps
serving the cached `noindex` plus "no longer listed" banner for the whole
48h revalidate window while the dog is in fact live again.
"""

from datetime import datetime
from unittest.mock import Mock

import pytest

from scrapers.base_scraper import BaseScraper
from services.session_manager import SessionManager

DB_CONFIG = {"host": "localhost", "user": "test", "database": "test", "password": ""}


class _ConcreteScraper(BaseScraper):
    """BaseScraper is abstract; the purge helper needs no scraping behaviour."""

    def collect_data(self):
        return []


def _bare_scraper():
    scraper = _ConcreteScraper.__new__(_ConcreteScraper)
    scraper._changed_animal_ids = []
    return scraper


def _session_manager_with_cursor(previous_active):
    session_manager = SessionManager(DB_CONFIG, organization_id=1)
    mock_conn = Mock()
    mock_cursor = Mock()
    mock_cursor.fetchone.return_value = {"was_active": previous_active}
    mock_conn.cursor.return_value = mock_cursor
    session_manager.conn = mock_conn
    session_manager.current_scrape_session = datetime.now()
    return session_manager, mock_cursor


@pytest.mark.unit
def test_reactivated_animal_is_recorded():
    """An animal that was inactive and is seen again is flagged for purge."""
    session_manager, _ = _session_manager_with_cursor(previous_active=False)

    session_manager.mark_animal_as_seen(123)

    assert 123 in session_manager.reactivated_animal_ids


@pytest.mark.unit
def test_still_active_animal_is_not_recorded():
    """A dog seen on every scrape must not trigger a purge each run.

    Purging every unchanged animal would fan out to the whole catalogue on
    every scrape, which is exactly what the scoped invalidation avoids.
    """
    session_manager, _ = _session_manager_with_cursor(previous_active=True)

    session_manager.mark_animal_as_seen(123)

    assert session_manager.reactivated_animal_ids == []


@pytest.mark.unit
def test_reactivation_list_starts_empty():
    session_manager = SessionManager(DB_CONFIG, organization_id=1)

    assert session_manager.reactivated_animal_ids == []


@pytest.mark.unit
def test_scraper_purges_reactivated_animal_on_no_change():
    """A reactivated dog is purged even when its scraped data is identical.

    This is the branch that was missing: `save_animal` returns "no_change",
    so neither the "added" nor "updated" purge fires, yet `active` has just
    flipped back to true and the cached page still says otherwise.
    """
    scraper = _bare_scraper()

    session_manager = Mock()
    session_manager.reactivated_animal_ids = [123]
    scraper.session_manager = session_manager

    scraper._purge_if_reactivated(123)

    assert 123 in scraper._changed_animal_ids


@pytest.mark.unit
def test_scraper_does_not_purge_a_continuously_active_animal():
    scraper = _bare_scraper()

    session_manager = Mock()
    session_manager.reactivated_animal_ids = []
    scraper.session_manager = session_manager

    scraper._purge_if_reactivated(123)

    assert scraper._changed_animal_ids == []
