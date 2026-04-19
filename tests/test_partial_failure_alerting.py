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

    def test_swallows_sentry_transport_exception(self, scraper):
        """Sentry transport errors must not abort the scrape — `complete_scrape_log`
        runs right after this helper and we must reach it."""
        scraper.session_manager.get_historical_average_dogs_found.return_value = 50.0

        with patch("scrapers.base_scraper.alert_partial_failure", side_effect=Exception("Sentry down")):
            scraper._emit_partial_failure_alert(animals_found=5)

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

    def test_returns_average_via_direct_connection_when_no_pool(self):
        """Covers the `elif self.conn` branch — still supported for legacy call sites."""
        from services.session_manager import SessionManager

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = (18.5, 9)
        mock_conn.cursor.return_value = mock_cursor

        sm = SessionManager(db_config={}, organization_id=42, connection_pool=None)
        sm.conn = mock_conn

        assert sm.get_historical_average_dogs_found() == 18.5

    def test_returns_none_when_no_connection_configured(self):
        """Defensive path — caller should treat None as 'skip the alert'."""
        from services.session_manager import SessionManager

        sm = SessionManager(db_config={}, organization_id=42, connection_pool=None)

        assert sm.get_historical_average_dogs_found() is None

    def test_swallows_db_exception_and_returns_none(self):
        """DB errors here must not propagate — the caller is observability plumbing."""
        from services.session_manager import SessionManager

        pool = MagicMock()
        ctx = MagicMock()
        ctx.__enter__ = MagicMock(side_effect=Exception("connection dropped"))
        ctx.__exit__ = MagicMock(return_value=None)
        pool.get_connection_context.return_value = ctx

        sm = SessionManager(db_config={}, organization_id=42, connection_pool=pool)

        assert sm.get_historical_average_dogs_found() is None


@pytest.mark.unit
class TestFinalizeScrapeWiringToPartialFailureAlert:
    """Pin the wiring that the whole PR exists to install: if a refactor drops
    the `self._emit_partial_failure_alert(...)` line from `_finalize_scrape`,
    this test fails loudly."""

    def _make_scraper(self):
        scraper = Mock()  # unspecced so `metrics_collector` etc. can be set freely
        scraper.logger = Mock()
        scraper.skip_existing_animals = False
        scraper.session_manager = Mock()
        scraper.metrics_collector = Mock()
        scraper._get_correct_animals_found_count = Mock()
        scraper.detect_partial_failure = Mock()
        scraper.complete_scrape_log = Mock()
        scraper._emit_partial_failure_alert = Mock()
        scraper._check_adoptions_if_enabled = Mock()
        scraper._log_service_unavailable = Mock()
        scraper._finalize_scrape = BaseScraper._finalize_scrape.__get__(scraper)
        return scraper

    def test_finalize_scrape_invokes_partial_failure_alert_when_detected(self):
        scraper = self._make_scraper()
        scraper._get_correct_animals_found_count.return_value = 7
        scraper.detect_partial_failure.return_value = True

        scraper._finalize_scrape(animals_data=[{"name": "Dog"}], processing_stats={"animals_added": 0, "animals_updated": 0})

        scraper._emit_partial_failure_alert.assert_called_once_with(7)
        scraper.complete_scrape_log.assert_called_once()

    def test_finalize_scrape_does_not_alert_when_no_partial_failure(self):
        scraper = self._make_scraper()
        scraper._get_correct_animals_found_count.return_value = 50
        scraper.detect_partial_failure.return_value = False

        scraper._finalize_scrape(animals_data=[{"name": "Dog"}], processing_stats={"animals_added": 0, "animals_updated": 0})

        scraper._emit_partial_failure_alert.assert_not_called()
