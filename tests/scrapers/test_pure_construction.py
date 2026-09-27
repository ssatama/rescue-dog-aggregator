"""Building a scraper does no I/O; the loader binds it to its organization (#569).

The constructor used to sync the organization row, except under pytest, where
it pinned organization_id to 1. The loader then patched services into the
scraper and, by hand, into its filtering service.
"""

from unittest.mock import Mock, patch

import pytest

from scrapers.base_scraper import BaseScraper
from utils.secure_scraper_loader import SecureScraperLoader


class _Scraper(BaseScraper):
    def collect_data(self):
        return []


def _build():
    with patch("scrapers.base_scraper.ConfigLoader") as loader:
        config = Mock()
        config.get_scraper_config_dict.return_value = {"rate_limit_delay": 0, "max_retries": 1, "timeout": 10}
        config.name = "Test Rescue"
        loader.return_value.load_config.return_value = config
        return _Scraper(config_id="test")


@pytest.mark.unit
class TestPureConstruction:
    def test_building_a_scraper_syncs_nothing(self):
        with patch("utils.organization_sync_service.create_default_sync_service") as sync:
            scraper = _build()

        sync.assert_not_called()
        assert scraper.organization_id is None

    def test_attach_binds_the_organization_and_services_everywhere(self):
        scraper = _build()
        database_service, session_manager, images, metrics = Mock(), Mock(), Mock(), Mock()

        scraper.attach(7, database_service=database_service, session_manager=session_manager, image_processing_service=images, metrics_collector=metrics)

        assert scraper.organization_id == 7
        assert (scraper.database_service, scraper.session_manager, scraper.image_processing_service, scraper.metrics_collector) == (database_service, session_manager, images, metrics)
        assert (scraper.filtering_service.organization_id, scraper.filtering_service.database_service, scraper.filtering_service.session_manager) == (7, database_service, session_manager)
        assert scraper.llm_handler.organization_id == 7

    def test_the_logger_takes_the_runners_level_and_handlers(self):
        scraper = _build()

        assert scraper.logger.level == 0
        assert scraper.logger.handlers == []


@pytest.mark.unit
class TestLoaderSync:
    def test_a_failed_sync_stops_the_run(self):
        config = Mock(id="test")
        with patch("utils.organization_sync_service.create_default_sync_service") as sync:
            sync.return_value.sync_single_organization.return_value = Mock(success=False)

            with pytest.raises(RuntimeError, match="Organization sync failed for test"):
                SecureScraperLoader._sync_organization(config)

    def test_a_synced_organization_gives_its_id(self):
        with patch("utils.organization_sync_service.create_default_sync_service") as sync:
            sync.return_value.sync_single_organization.return_value = Mock(success=True, organization_id=5)

            assert SecureScraperLoader._sync_organization(Mock(id="rean")) == 5
