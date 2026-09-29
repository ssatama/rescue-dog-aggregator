"""The share of a run metric over recent successful runs, for drop alerts (#628)."""

import json

import psycopg2
import pytest

from config import get_database_config
from services.session_manager import SessionManager


def _log(cursor, status, metrics):
    cursor.execute(
        "INSERT INTO scrape_logs (organization_id, started_at, status, dogs_found, detailed_metrics) VALUES (901, NOW(), %s, 10, %s)",
        (status, json.dumps(metrics)),
    )


@pytest.mark.database
@pytest.mark.integration
class TestHistoricalShare:
    def _manager(self):
        manager = SessionManager(get_database_config(), organization_id=901)
        manager.connect()
        return manager

    def test_the_pooled_share_of_recent_successful_runs(self):
        with psycopg2.connect(**get_database_config()) as conn, conn.cursor() as cursor:
            _log(cursor, "success", {"detail_pages": 10, "may_live_with_cards": 9})
            _log(cursor, "success", {"detail_pages": 20, "may_live_with_cards": 18})
            _log(cursor, "success", {"detail_pages": 10, "may_live_with_cards": 9})
            _log(cursor, "error", {"detail_pages": 10, "may_live_with_cards": 0})

        assert self._manager().get_historical_share("may_live_with_cards", "detail_pages") == pytest.approx(0.9)

    def test_too_little_history_is_none(self):
        with psycopg2.connect(**get_database_config()) as conn, conn.cursor() as cursor:
            _log(cursor, "success", {"detail_pages": 10, "may_live_with_cards": 9})
            _log(cursor, "success", {"animals_found": 10})

        assert self._manager().get_historical_share("may_live_with_cards", "detail_pages") is None
