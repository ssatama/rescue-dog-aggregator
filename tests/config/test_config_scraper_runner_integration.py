import shutil
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch

import pytest
import yaml

from utils.config_loader import ConfigLoader
from utils.config_scraper_runner import ConfigScraperRunner


class TestConfigScraperRunnerIntegration:
    """Integration tests for ConfigScraperRunner using real config files."""

    @pytest.fixture
    def temp_config_dir(self):
        """Create a temporary config directory for testing."""
        temp_dir = tempfile.mkdtemp()
        config_dir = Path(temp_dir) / "configs" / "organizations"
        config_dir.mkdir(parents=True)

        # Create a test config file
        test_config = {
            "schema_version": "1.0",
            "id": "test-org",
            "name": "Test Organization",
            "enabled": True,
            "scraper": {
                "class_name": "TestScraper",
                "module": "test_module",
                "config": {"rate_limit_delay": 2.0, "max_retries": 5, "timeout": 45},
            },
            "metadata": {
                "website_url": "https://test.org",
                "description": "Test organization for integration testing",
                "location": {"country": "US", "city": "Test City"},
                "contact": {"email": "test@test.org"},
            },
        }

        config_file = config_dir / "test-org.yaml"
        with open(config_file, "w") as f:
            yaml.dump(test_config, f)

        yield str(temp_dir)

        # Cleanup
        shutil.rmtree(temp_dir)

    def test_list_available_scrapers_integration(self, temp_config_dir):
        """Test listing available scrapers with real config files."""
        with patch("utils.config_loader.CONFIG_DIR", Path(temp_config_dir) / "configs"):
            loader = ConfigLoader()
            runner = ConfigScraperRunner(loader)

            scrapers = runner.list_available_scrapers()

            assert len(scrapers) == 1
            assert scrapers[0]["config_id"] == "test-org"
            assert scrapers[0]["name"] == "Test Organization"
            assert scrapers[0]["enabled"] is True
            assert scrapers[0]["scraper_class"] == "TestScraper"

    def test_scraper_instantiation_error_handling(self, temp_config_dir):
        """Test error handling when scraper class cannot be imported."""
        with patch("utils.config_loader.CONFIG_DIR", Path(temp_config_dir) / "configs"):
            loader = ConfigLoader()
            runner = ConfigScraperRunner(loader)

            # This should fail gracefully when trying to import non-existent module
            result = runner.run_scraper("test-org", sync_first=False)

            assert result["success"] is False
            assert "error" in result
            assert "test-org" in result["config_id"]
