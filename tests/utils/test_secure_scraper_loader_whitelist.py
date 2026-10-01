"""Every configured scraper can be loaded by the cron (#689).

The cron loads scrapers through SecureScraperLoader, which refuses a module
that isn't on its whitelist. A new rescue's config passed every test and would
never have scraped once enabled.
"""

import pytest

from utils.config_loader import ConfigLoader
from utils.secure_scraper_loader import SecureScraperLoader

CONFIGS = ConfigLoader().load_all_configs()


@pytest.mark.unit
@pytest.mark.parametrize("config_id", sorted(CONFIGS))
def test_the_configured_scraper_module_is_allowed(config_id):
    module = CONFIGS[config_id].scraper.module

    assert SecureScraperLoader().validate_module_path(module), f"{module} isn't in SecureScraperLoader.ALLOWED_MODULES"
