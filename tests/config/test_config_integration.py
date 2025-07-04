import shutil
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch

import pytest
import yaml

from utils.config_loader import ConfigLoader, ConfigValidationError
from utils.org_sync import OrganizationSyncManager


@pytest.mark.slow
@pytest.mark.file_io
@pytest.mark.integration
class TestConfigIntegration:
    """Test the complete config-driven workflow integration."""

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

    def test_end_to_end_config_workflow(self, temp_config_dir):
        """Test complete workflow from config file to scraper execution."""
        with patch("utils.config_loader.CONFIG_DIR", Path(temp_config_dir) / "configs"):
            # Step 1: Load config
            loader = ConfigLoader()
            config = loader.load_config("test-org")

            assert config.name == "Test Organization"
            assert config.enabled is True
            assert config.scraper.class_name == "TestScraper"

            # Step 2: Validate config
            warnings = config.validate_business_rules()
            assert len(warnings) == 0  # Should have no warnings

            # Step 3: Test sync manager (mock database operations)
            with patch("utils.org_sync.get_db_cursor") as mock_cursor:
                mock_cursor.return_value.fetchall.return_value = []  # No existing orgs
                mock_cursor.return_value.fetchone.return_value = None

                sync_manager = OrganizationSyncManager(loader)
                status = sync_manager.get_sync_status()

                assert status["total_configs"] == 1
                assert status["missing_from_db"] == ["test-org"]

    def test_config_validation_errors(self, temp_config_dir):
        """Test config validation catches errors."""
        # Create invalid config
        invalid_config_dir = Path(temp_config_dir) / "configs" / "organizations"
        invalid_config = {
            "schema_version": "1.0",
            "id": "invalid-org",
            "name": "",  # Invalid: empty name
            "enabled": True,
            "scraper": {
                "class_name": "",  # Invalid: empty class name
                "module": "test_module",
            },
        }

        config_file = invalid_config_dir / "invalid-org.yaml"
        with open(config_file, "w") as f:
            yaml.dump(invalid_config, f)

        with patch("utils.config_loader.CONFIG_DIR", Path(temp_config_dir) / "configs"):
            loader = ConfigLoader()

            # Should raise ConfigValidationError (not ValueError)
            with pytest.raises(ConfigValidationError):
                loader.load_config("invalid-org")

    def test_disabled_organization_handling(self, temp_config_dir):
        """Test that disabled organizations are handled correctly."""
        # Create disabled config
        config_dir = Path(temp_config_dir) / "configs" / "organizations"
        disabled_config = {
            "schema_version": "1.0",
            "id": "disabled-org",
            "name": "Disabled Organization",
            "enabled": False,  # Disabled
            "scraper": {"class_name": "TestScraper", "module": "test_module"},
        }

        config_file = config_dir / "disabled-org.yaml"
        with open(config_file, "w") as f:
            yaml.dump(disabled_config, f)

        with patch("utils.config_loader.CONFIG_DIR", Path(temp_config_dir) / "configs"):
            loader = ConfigLoader()

            # Should load but not be in enabled list
            all_configs = loader.load_all_configs()
            enabled_configs = loader.get_enabled_orgs()

            assert "disabled-org" in all_configs
            assert not any(org.id == "disabled-org" for org in enabled_configs)

    def test_scraper_config_inheritance(self, temp_config_dir):
        """Test that scraper inherits config correctly."""
        with patch("utils.config_loader.CONFIG_DIR", Path(temp_config_dir) / "configs"):
            from scrapers.base_scraper import BaseScraper

            class TestScraper(BaseScraper):
                def collect_data(self):
                    return []

                def get_existing_animal(self, external_id, organization_id):
                    return None

                def create_animal(self, animal_data):
                    return 1, "added"

                def update_animal(self, animal_id, animal_data):
                    return 1, "updated"

            # Mock database operations
            with patch("utils.org_sync.get_db_cursor") as mock_cursor:
                mock_cursor.return_value.fetchone.return_value = {"id": 1}  # Return org ID as dict for RealDictCursor

                # Create scraper with config
                scraper = TestScraper(config_id="test-org")

                # Verify config values are applied
                assert scraper.rate_limit_delay == 2.0
                assert scraper.max_retries == 5
                assert scraper.timeout == 45
                assert scraper.organization_name == "Test Organization"

    def test_scraper_module_import_integration(self):
        """Test that scrapers can actually be imported and instantiated from real configs."""
        from utils.config_loader import ConfigLoader
        from utils.config_scraper_runner import ConfigScraperRunner

        # Use the real config loader (not mocked)
        loader = ConfigLoader()
        runner = ConfigScraperRunner(loader)

        try:
            # Load all real configs
            configs = loader.load_all_configs()

            # Test each enabled config can import and instantiate its scraper
            for config_id, config in configs.items():
                if config.enabled:
                    print(f"Testing scraper import for: {config_id}")

                    # This should not raise ImportError
                    scraper_class = runner._import_scraper_class(config)

                    # Verify we got a class
                    assert callable(scraper_class), f"Scraper class for {config_id} is not callable"

                    # Verify it has the expected name
                    assert scraper_class.__name__ == config.scraper.class_name, f"Class name mismatch for {config_id}: got {scraper_class.__name__}, expected {config.scraper.class_name}"

                    # Try to instantiate it (with mocked org lookup to avoid DB
                    # dependency)
                    with patch("utils.org_sync.get_db_connection") as mock_conn:
                        mock_cursor = Mock()
                        mock_cursor.fetchone.return_value = [1]  # Mock org ID
                        mock_conn.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value = mock_cursor

                        try:
                            # This tests the actual instantiation path
                            result = runner.run_scraper(config_id, sync_first=False)

                            # Should not fail due to import errors
                            if not result["success"] and "No module named" in result.get("error", ""):
                                pytest.fail(f"Module import failed for {config_id}: {result['error']}")

                        except ImportError as e:
                            pytest.fail(f"Failed to import scraper for {config_id}: {e}")
                        except Exception as e:
                            # Other errors are OK (missing DB, etc.) - we just
                            # want to test imports
                            if "No module named" in str(e):
                                pytest.fail(f"Module import failed for {config_id}: {e}")
                            # Else: expected errors like DB connection issues
                            # are fine

        except Exception as e:
            if "No module named" in str(e):
                pytest.fail(f"Config integration test failed with import error: {e}")
            raise
