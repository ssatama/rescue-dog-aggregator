"""A scraper with no DatabaseService must fail, not run and persist nothing.

BaseScraper degrades to a warning and a None return at nine sites when an
injected service is missing. Production always injects via
utils/secure_scraper_loader.py, so none is live - but the degradation means a
misconfigured scraper completes a full run, saves nothing, and reports success.
Nothing about the run says the dogs never reached the database.

start_scrape_log() returned True with the comment "Continue scraping without
logging", so setup passed. save_animal() then returned ("error", None) for
every animal, and the counts simply stayed at zero.
"""

from unittest.mock import Mock, patch

import pytest

from scrapers.base_scraper import BaseScraper


class _Scraper(BaseScraper):
    def collect_data(self):
        return [{"name": "Bella", "external_id": "b1", "adoption_url": "http://x/1"}]


@pytest.fixture
def scraper():
    with (
        patch("scrapers.base_scraper.create_default_sync_service") as sync,
        patch("scrapers.base_scraper.ConfigLoader") as loader,
    ):
        sync.return_value.sync_single_organization.return_value = Mock(organization_id=1, was_created=False)
        config = Mock(name="TestOrg")
        config.get_scraper_config_dict.return_value = {"rate_limit_delay": 0, "max_retries": 1, "timeout": 10}
        loader.return_value.load_config.return_value = config

        s = _Scraper(config_id="test-org")
        s.organization_name = "Test Org"
        s.organization_id = 1
        s.logger = Mock()
        return s


@pytest.mark.unit
class TestPersistenceIsNotOptional:
    def test_setup_refuses_to_start_without_a_database_service(self, scraper):
        scraper.database_service = None

        assert scraper.start_scrape_log() is False

    def test_setup_still_starts_when_the_service_is_present(self, scraper):
        scraper.database_service = Mock(create_scrape_log=Mock(return_value=42))

        assert scraper.start_scrape_log() is True
        assert scraper.scrape_log_id == 42

    def test_a_service_that_cannot_open_a_log_is_still_a_failure(self, scraper):
        scraper.database_service = Mock(create_scrape_log=Mock(return_value=None))

        assert scraper.start_scrape_log() is False

    def test_the_refusal_says_what_is_missing(self, scraper):
        scraper.database_service = None

        scraper.start_scrape_log()

        logged = " ".join(str(c) for c in scraper.logger.error.call_args_list)
        assert "DatabaseService" in logged

    def test_save_animal_without_a_service_reports_an_error(self, scraper):
        """The per-animal guard stays; setup is what must stop the run."""
        scraper.database_service = None

        assert scraper.save_animal({"name": "Bella"}) == (None, "error")
