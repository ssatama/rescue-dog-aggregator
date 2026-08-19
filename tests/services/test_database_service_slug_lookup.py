"""Tests for DatabaseService.get_slugs_for_animals.

Backs scoped frontend cache invalidation: a scrape knows which animal *ids*
it changed, but the Next.js detail pages are cache-tagged by *slug*. This
resolves ids to slugs in one round trip so the scraper can purge exactly the
pages it touched instead of the bare "animal" tag, which fans out to every
dog detail page on the site.
"""

from unittest.mock import Mock

import pytest

from services.database_service import DatabaseService


@pytest.fixture
def db_config():
    return {
        "host": "localhost",
        "user": "test_user",
        "database": "test_db",
        "password": "test_pass",
    }


@pytest.fixture
def service_with_cursor(db_config):
    """DatabaseService with a mocked live connection; yields (service, cursor)."""
    service = DatabaseService(db_config, logger=Mock())
    mock_conn = Mock()
    mock_cursor = Mock()
    mock_conn.cursor.return_value = mock_cursor
    service.conn = mock_conn
    return service, mock_cursor


@pytest.mark.unit
class TestGetSlugsForAnimals:
    def test_returns_slugs_for_given_ids(self, service_with_cursor):
        service, cursor = service_with_cursor
        cursor.fetchall.return_value = [("rex-terrier-101",), ("bella-lab-102",)]

        result = service.get_slugs_for_animals([101, 102])

        assert result == ["rex-terrier-101", "bella-lab-102"]

    def test_queries_with_a_single_round_trip(self, service_with_cursor):
        """One ANY(%s) query, not one SELECT per animal."""
        service, cursor = service_with_cursor
        cursor.fetchall.return_value = [("rex-terrier-101",)]

        service.get_slugs_for_animals([101, 102, 103])

        cursor.execute.assert_called_once()
        sql, params = cursor.execute.call_args[0]
        assert "ANY" in sql.upper()
        assert params == ([101, 102, 103],)

    def test_empty_input_skips_the_query(self, service_with_cursor):
        service, cursor = service_with_cursor

        result = service.get_slugs_for_animals([])

        assert result == []
        cursor.execute.assert_not_called()

    def test_drops_null_slugs(self, service_with_cursor):
        """An animal mid-way through two-phase slug assignment has no slug yet."""
        service, cursor = service_with_cursor
        cursor.fetchall.return_value = [("rex-terrier-101",), (None,)]

        assert service.get_slugs_for_animals([101, 102]) == ["rex-terrier-101"]

    def test_closes_the_cursor(self, service_with_cursor):
        service, cursor = service_with_cursor
        cursor.fetchall.return_value = []

        service.get_slugs_for_animals([101])

        cursor.close.assert_called_once()

    def test_returns_empty_on_query_error(self, service_with_cursor):
        """Cache invalidation is best-effort; a failed lookup must not raise."""
        service, cursor = service_with_cursor
        cursor.execute.side_effect = Exception("connection lost")

        assert service.get_slugs_for_animals([101]) == []

    def test_returns_empty_when_no_connection_available(self, db_config):
        service = DatabaseService(db_config, logger=Mock())
        service.conn = None
        service.connect = Mock(return_value=False)

        assert service.get_slugs_for_animals([101]) == []
