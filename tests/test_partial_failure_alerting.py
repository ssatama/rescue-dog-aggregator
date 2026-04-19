"""Tests for wiring partial-failure detection to Sentry alerts.

The `alert_partial_failure` helper in `scrapers.sentry_integration` existed
already but was never invoked — `_finalize_scrape` only logged a warning when
`detect_partial_failure` returned True. These tests pin the wiring so a silent
regression (e.g. Daisy's degraded section filter eating all incoming dogs)
produces a Sentry event.
"""

from unittest.mock import MagicMock, Mock, patch

import pytest

from scrapers.base_scraper import BaseScraper


@pytest.mark.unit
class TestPartialFailureAlertWiring:
    """Covers `BaseScraper._emit_partial_failure_alert` behavior."""

    @pytest.fixture
    def scraper(self):
        s = Mock(spec=BaseScraper)
        s.organization_id = 42
        s.scrape_log_id = 725
        s.logger = Mock()
        s.session_manager = Mock()
        s.get_organization_name = Mock(return_value="Test Org")
        s._emit_partial_failure_alert = BaseScraper._emit_partial_failure_alert.__get__(s)
        return s

    def test_emits_alert_when_partial_drop_against_healthy_baseline(self, scraper):
        scraper.session_manager.get_historical_average_dogs_found.return_value = 50.0

        with patch("scrapers.base_scraper.alert_partial_failure") as mock_alert:
            scraper._emit_partial_failure_alert(animals_found=10)

        mock_alert.assert_called_once()
        kwargs = mock_alert.call_args.kwargs
        assert kwargs["org_name"] == "Test Org"
        assert kwargs["dogs_found"] == 10
        assert kwargs["historical_average"] == 50.0
        assert kwargs["org_id"] == 42
        assert kwargs["scrape_log_id"] == 725

    def test_skips_alert_when_animals_found_is_zero(self, scraper):
        """Zero dogs is handled upstream by alert_zero_dogs_found; avoid duplicate."""
        scraper.session_manager.get_historical_average_dogs_found.return_value = 50.0

        with patch("scrapers.base_scraper.alert_partial_failure") as mock_alert:
            scraper._emit_partial_failure_alert(animals_found=0)

        mock_alert.assert_not_called()

    def test_skips_alert_when_no_historical_baseline(self, scraper):
        """Without a baseline we cannot call it a drop — skip the alert."""
        scraper.session_manager.get_historical_average_dogs_found.return_value = None

        with patch("scrapers.base_scraper.alert_partial_failure") as mock_alert:
            scraper._emit_partial_failure_alert(animals_found=5)

        mock_alert.assert_not_called()

    def test_skips_alert_when_historical_baseline_is_zero(self, scraper):
        """Defensive: an average of 0 means no real history — skip."""
        scraper.session_manager.get_historical_average_dogs_found.return_value = 0.0

        with patch("scrapers.base_scraper.alert_partial_failure") as mock_alert:
            scraper._emit_partial_failure_alert(animals_found=5)

        mock_alert.assert_not_called()

    def test_skips_alert_without_session_manager(self, scraper):
        """Cold-path safety: if session_manager isn't injected, no-op."""
        scraper.session_manager = None

        with patch("scrapers.base_scraper.alert_partial_failure") as mock_alert:
            scraper._emit_partial_failure_alert(animals_found=5)

        mock_alert.assert_not_called()

    def test_swallows_session_manager_exception(self, scraper):
        """A DB error fetching the historical average must not abort the scrape;
        alert is skipped, error logged."""
        scraper.session_manager.get_historical_average_dogs_found.side_effect = Exception("DB down")

        with patch("scrapers.base_scraper.alert_partial_failure") as mock_alert:
            scraper._emit_partial_failure_alert(animals_found=5)

        mock_alert.assert_not_called()
        scraper.logger.error.assert_called_once()


@pytest.mark.unit
class TestSessionManagerHistoricalAverage:
    """SessionManager.get_historical_average_dogs_found returns AVG across last N successful scrapes."""

    def _session_manager_with_pool_result(self, result):
        from services.session_manager import SessionManager

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = result
        mock_conn.cursor.return_value = mock_cursor

        pool = MagicMock()
        ctx = MagicMock()
        ctx.__enter__ = MagicMock(return_value=mock_conn)
        ctx.__exit__ = MagicMock(return_value=None)
        pool.get_connection_context.return_value = ctx

        return SessionManager(db_config={}, organization_id=42, connection_pool=pool)

    def test_returns_average_when_enough_history(self):
        sm = self._session_manager_with_pool_result((30.0, 9))

        assert sm.get_historical_average_dogs_found() == 30.0

    def test_returns_none_when_no_history(self):
        sm = self._session_manager_with_pool_result((None, 0))

        assert sm.get_historical_average_dogs_found() is None

    def test_returns_none_when_below_minimum_history(self):
        """Fewer than `minimum_historical_scrapes` rows isn't a reliable baseline."""
        sm = self._session_manager_with_pool_result((20.0, 2))

        assert sm.get_historical_average_dogs_found(minimum_historical_scrapes=3) is None
