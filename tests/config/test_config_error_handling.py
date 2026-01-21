import tempfile
from pathlib import Path
from unittest.mock import Mock, patch

import pytest
import yaml

from utils.config_loader import ConfigLoader, ConfigLoadError


@pytest.mark.integration
@pytest.mark.unit
class TestConfigErrorHandling:
    """Test error handling in config system."""

    def test_missing_config_file(self):
        """Test handling of missing config files."""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create a config loader with the temp directory
            config_dir = Path(temp_dir) / "configs"
            loader = ConfigLoader(config_dir=config_dir)

            with pytest.raises(ConfigLoadError):  # Changed to ConfigLoadError
                loader.load_config("nonexistent-org")

    def test_malformed_yaml(self):
        """Test handling of malformed YAML files."""
        with tempfile.TemporaryDirectory() as temp_dir:
            config_dir = Path(temp_dir) / "configs"
            org_config_dir = config_dir / "organizations"
            org_config_dir.mkdir(parents=True)

            # Create malformed YAML
            malformed_file = org_config_dir / "malformed.yaml"
            with open(malformed_file, "w") as f:
                f.write("invalid: yaml: content: [unclosed")

            loader = ConfigLoader(config_dir=config_dir)

            with pytest.raises(ConfigLoadError):  # Changed to ConfigLoadError
                loader.load_config("malformed")

    def test_invalid_schema_version(self):
        """Test handling of unsupported schema versions."""
        with tempfile.TemporaryDirectory() as temp_dir:
            config_dir = Path(temp_dir) / "configs"
            org_config_dir = config_dir / "organizations"
            org_config_dir.mkdir(parents=True)

            invalid_config = {
                "schema_version": "999.0",  # Unsupported version
                "id": "test-org",
                "name": "Test",
                "enabled": True,
                "scraper": {"class_name": "Test", "module": "test"},
            }

            config_file = org_config_dir / "test-org.yaml"
            with open(config_file, "w") as f:
                yaml.dump(invalid_config, f)

            loader = ConfigLoader(config_dir=config_dir)

            with pytest.raises(ValueError, match="Unsupported schema version"):
                loader.load_config("test-org")

    def test_database_connection_failure_in_sync(self):
        """Test sync handling when database is unavailable."""
        # Import the real function before mocking
        from utils.organization_sync_service import OrganizationSyncService

        # Create a real sync service instance bypassing the global mock
        # Mock the global execute_query function used by organization_sync_service
        with patch("utils.organization_sync_service.execute_query") as mock_execute:
            mock_execute.side_effect = Exception("Database connection failed")

            # Directly instantiate the real service
            sync_manager = OrganizationSyncService()

            # The sync manager returns error status instead of None
            status = sync_manager.get_sync_status({})
            assert "error" in status
            assert "Database connection failed" in status["error"]

    def test_scraper_import_failure_handling(self):
        """Test handling of scraper import failures through run_scraper."""
        from utils.config_scraper_runner import ConfigScraperRunner

        mock_loader = Mock()
        mock_config = Mock()
        # FIX: Set string values instead of Mock objects
        mock_config.scraper.module = "nonexistent.module"
        mock_config.scraper.class_name = "NonexistentClass"
        mock_config.id = "test-config"
        mock_config.is_enabled_for_scraping.return_value = True
        mock_loader.load_config.return_value = mock_config

        runner = ConfigScraperRunner(mock_loader)

        # Test through public API - run_scraper should handle the import error
        result = runner.run_scraper("test-config")
        assert result["success"] is False
        assert "error" in result

    def test_config_id_mismatch(self):
        """Test validation of config ID vs filename mismatch."""
        with tempfile.TemporaryDirectory() as temp_dir:
            config_dir = Path(temp_dir) / "configs"
            org_config_dir = config_dir / "organizations"
            org_config_dir.mkdir(parents=True)

            # Config with mismatched ID
            mismatched_config = {
                "schema_version": "1.0",
                "id": "different-id",  # Doesn't match filename
                "name": "Test",
                "enabled": True,
                "scraper": {"class_name": "Test", "module": "test"},
            }

            config_file = org_config_dir / "test-org.yaml"  # Filename doesn't match ID
            with open(config_file, "w") as f:
                yaml.dump(mismatched_config, f)

            loader = ConfigLoader(config_dir=config_dir)

            with pytest.raises(ValueError, match="Config ID 'different-id' does not match filename"):
                loader.load_config("test-org")
