"""A scrape must not proceed against a site whose robots.txt forbids it.

Before this gate existed nothing in the codebase read robots.txt, so a rescue
that added a Disallow line would have been scraped anyway. That is also why the
robots.txt sentence had to be removed from frontend/public/llms.txt during
review - it described an intention, not a behaviour.

The check runs once per scrape at setup rather than per request. There is no
shared HTTP helper across the eighteen scraper modules, and site-level
permission is the decision that actually matters.
"""

from unittest.mock import Mock, patch

import pytest

from scrapers.base_scraper import BaseScraper
from services.database_service import DatabaseService
from utils.robots_checker import RobotsDecision

pytestmark = pytest.mark.unit


class _StubScraper(BaseScraper):
    def collect_data(self):
        return []


@pytest.fixture
def mock_db():
    db = Mock(spec=DatabaseService)
    db.complete_scrape_log.return_value = True
    db.get_slugs_for_animals.return_value = []
    return db


@pytest.fixture
def scraper(mock_db):
    s = _StubScraper(organization_id=1, database_service=mock_db)
    s.org_config = Mock()
    s.org_config.metadata.website_url = "https://example.org/"
    return s


def _decision(**kwargs):
    base = {"allowed": True, "reason": "ok"}
    base.update(kwargs)
    return RobotsDecision(**base)


class TestRobotsGate:
    def test_allows_a_scrape_the_site_permits(self, scraper):
        with patch.object(scraper, "_robots_checker") as checker:
            checker.check.return_value = _decision(allowed=True)
            assert scraper._check_robots_permission() is True

    def test_blocks_a_scrape_the_site_forbids(self, scraper):
        with patch.object(scraper, "_robots_checker") as checker:
            checker.check.return_value = _decision(allowed=False, reason="Disallowed by robots.txt")
            assert scraper._check_robots_permission() is False

    def test_checks_the_organization_website(self, scraper):
        with patch.object(scraper, "_robots_checker") as checker:
            checker.check.return_value = _decision()
            scraper._check_robots_permission()
            checker.check.assert_called_once_with("https://example.org/")

    def test_proceeds_when_the_organization_has_no_website_configured(self, scraper):
        # Nothing to check against; do not invent a blocker.
        scraper.org_config.metadata.website_url = None
        assert scraper._check_robots_permission() is True

    def test_proceeds_when_there_is_no_org_config(self, mock_db):
        s = _StubScraper(organization_id=1, database_service=mock_db)
        s.org_config = None
        assert s._check_robots_permission() is True

    def test_proceeds_when_robots_txt_could_not_be_read(self, scraper):
        with patch.object(scraper, "_robots_checker") as checker:
            checker.check.return_value = _decision(uncertain=True, reason="unreachable")
            assert scraper._check_robots_permission() is True

    def test_a_checker_failure_does_not_abort_the_scrape(self, scraper):
        # A bug in the gate must not take the pipeline down.
        with patch.object(scraper, "_robots_checker") as checker:
            checker.check.side_effect = RuntimeError("boom")
            assert scraper._check_robots_permission() is True


class TestCrawlDelay:
    def test_raises_the_rate_limit_to_match_a_slower_site(self, scraper):
        scraper.rate_limit_delay = 1.0
        scraper._apply_crawl_delay("https://example.org", 30.0)
        assert scraper.rate_limit_delay == 30.0

    def test_never_speeds_us_up(self, scraper):
        scraper.rate_limit_delay = 5.0
        scraper._apply_crawl_delay("https://example.org", 1.0)
        assert scraper.rate_limit_delay == 5.0

    def test_no_delay_directive_changes_nothing(self, scraper):
        scraper.rate_limit_delay = 2.0
        scraper._apply_crawl_delay("https://example.org", None)
        assert scraper.rate_limit_delay == 2.0


class TestCheckedUrls:
    def test_checks_listing_paths_not_just_the_homepage(self, scraper):
        # A site can allow / and still disallow /rehoming/, which is exactly
        # where the scraper then goes.
        scraper.base_url = "https://example.org/rehoming/dogs"
        assert "https://example.org/rehoming/dogs" in scraper.get_robots_check_urls()

    def test_blocks_when_any_checked_path_is_disallowed(self, scraper):
        scraper.base_url = "https://example.org/rehoming/dogs"
        with patch.object(scraper, "_robots_checker") as checker:
            checker.check.side_effect = [
                _decision(allowed=True),
                _decision(allowed=False, reason="Disallowed by robots.txt: /rehoming/"),
            ]
            assert scraper._check_robots_permission() is False

    def test_does_not_check_the_same_url_twice(self, scraper):
        scraper.base_url = "https://example.org/"
        scraper.org_config.metadata.website_url = "https://example.org/"
        assert scraper.get_robots_check_urls() == ["https://example.org/"]


class TestSetupIntegration:
    def test_setup_aborts_when_robots_forbids(self, scraper):
        with patch.object(scraper, "_check_robots_permission", return_value=False):
            assert scraper._setup_scrape() is False

    def test_setup_records_why_it_stopped(self, scraper):
        # A skipped org must be visible in the scrape log, not just in stderr.
        with patch.object(scraper, "_check_robots_permission", return_value=False):
            with patch.object(scraper, "complete_scrape_log") as complete:
                scraper._setup_scrape()
        complete.assert_called_once()
        # "skipped", not "error": an opt-out is not a broken scraper, and the
        # monitoring endpoints count error/warning logs as unhealthy.
        assert complete.call_args.kwargs["status"] == "skipped"
        assert "robots.txt" in complete.call_args.kwargs["error_message"]

    def test_robots_is_checked_before_any_data_collection(self, scraper):
        # The point of the gate is that nothing is fetched from a site that
        # said no, so it has to run before collect_data.
        with patch.object(scraper, "_check_robots_permission", return_value=False):
            with patch.object(scraper, "collect_data") as collect:
                scraper._setup_scrape()
                collect.assert_not_called()
