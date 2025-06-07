import pytest
import tempfile
import yaml
from pathlib import Path
from unittest.mock import patch, Mock

from utils.config_loader import ConfigLoader, ConfigLoadError


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
        from utils.org_sync import OrganizationSyncManager

        with patch("utils.org_sync.get_db_cursor") as mock_cursor:
            mock_cursor.side_effect = Exception("Database connection failed")

            loader = Mock()
            sync_manager = OrganizationSyncManager(loader)

            # The sync manager returns error status instead of None
            status = sync_manager.get_sync_status()
            assert (
                status["error"] == "Database connection failed"
            )  # Updated expectation

    def test_scraper_import_failure_handling(self):
        """Test handling of scraper import failures."""
        from utils.config_scraper_runner import ConfigScraperRunner

        mock_loader = Mock()
        mock_config = Mock()
        # FIX: Set string values instead of Mock objects
        mock_config.scraper.module = "nonexistent.module"
        mock_config.scraper.class_name = "NonexistentClass"
        mock_loader.load_config.return_value = mock_config

        runner = ConfigScraperRunner(mock_loader)

        with pytest.raises(ImportError):
            runner._import_scraper_class(mock_config)

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

            with pytest.raises(
                ValueError, match="Config ID 'different-id' does not match filename"
            ):
                loader.load_config("test-org")
