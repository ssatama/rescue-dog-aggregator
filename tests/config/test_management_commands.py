import pytest
from unittest.mock import patch, Mock
from io import StringIO
import sys

from management.config_commands import ConfigManager


class TestManagementCommands:
    """Test the management command interface."""

    @pytest.fixture
    def mock_config_manager_deps(self):
        """Mock all dependencies of ConfigManager."""
        with patch("management.config_commands.ConfigLoader") as mock_loader, patch(
            "management.config_commands.OrganizationSyncManager"
        ) as mock_sync, patch(
            "management.config_commands.ConfigScraperRunner"
        ) as mock_runner:

            # Setup mock config with proper attributes
            mock_config = Mock()
            mock_config.id = "test-org"
            mock_config.name = "Test Organization"
            mock_config.enabled = True
            mock_config.get_display_name.return_value = "Test Organization (test-org)"
            mock_config.get_full_module_path.return_value = "scrapers.test_module"
            mock_config.scraper.class_name = "TestScraper"
            mock_config.metadata.website_url = "https://test.org"
            mock_config.schema_version = "1.0"

            # Fix: Create proper nested mock structure
            contact_mock = Mock()
            contact_mock.email = "test@test.org"
            contact_mock.phone = None
            mock_config.metadata.contact = contact_mock

            social_mock = Mock()
            social_mock.facebook = None
            social_mock.instagram = None
            social_mock.twitter = None
            mock_config.metadata.social_media = social_mock

            location_mock = Mock()
            location_mock.city = None
            location_mock.country = None
            mock_config.metadata.location = location_mock

            # Fix: Make service_regions return empty list instead of Mock
            mock_config.metadata.service_regions = []
            mock_config.metadata.description = "Test description"
            mock_config.validate_business_rules.return_value = []
            mock_config.get_scraper_config_dict.return_value = {}

            mock_loader.return_value.load_all_configs.return_value = {
                "test-org": mock_config
            }
            mock_loader.return_value.load_config.return_value = mock_config

            yield {
                "loader": mock_loader,
                "sync": mock_sync,
                "runner": mock_runner,
                "config": mock_config,
            }

    def test_list_organizations(self, mock_config_manager_deps):
        """Test listing organizations command."""
        manager = ConfigManager()

        # Capture stdout
        captured_output = StringIO()
        with patch("sys.stdout", captured_output):
            manager.list_organizations()

        output = captured_output.getvalue()
        assert "Test Organization (test-org)" in output
        assert "✅ ENABLED" in output
        assert "TestScraper" in output

    def test_list_organizations_enabled_only(self, mock_config_manager_deps):
        """Test listing only enabled organizations."""
        # Setup one enabled and one disabled org
        mock_deps = mock_config_manager_deps
        mock_config_disabled = Mock()
        mock_config_disabled.enabled = False
        mock_config_disabled.get_display_name.return_value = "Disabled Org"

        configs = {
            "test-org": mock_deps["config"],
            "disabled-org": mock_config_disabled,
        }
        mock_deps["loader"].return_value.load_all_configs.return_value = configs

        manager = ConfigManager()

        captured_output = StringIO()
        with patch("sys.stdout", captured_output):
            manager.list_organizations(enabled_only=True)

        output = captured_output.getvalue()
        assert "Test Organization (test-org)" in output
        assert "Disabled Org" not in output

    def test_show_organization(self, mock_config_manager_deps):
        """Test showing detailed organization information."""
        mock_deps = mock_config_manager_deps

        # Add more detailed mock data
        mock_config = mock_deps["config"]
        mock_config.schema_version = "1.0"
        mock_config.metadata.contact.email = "test@test.org"
        mock_config.metadata.description = "Test description"
        mock_config.validate_business_rules.return_value = []

        manager = ConfigManager()

        captured_output = StringIO()
        with patch("sys.stdout", captured_output):
            manager.show_organization("test-org")

        output = captured_output.getvalue()
        assert "Test Organization (test-org)" in output
        assert "test@test.org" in output
        assert "Test description" in output
        assert "✅ No validation warnings" in output

    def test_sync_organizations_dry_run(self, mock_config_manager_deps):
        """Test sync dry run command."""
        mock_deps = mock_config_manager_deps
        # Fix: Include all required status fields
        mock_deps["sync"].return_value.get_sync_status.return_value = {
            "total_configs": 1,
            "total_db_orgs": 0,
            "synced": 0,
            "up_to_date": 0,  # Add this missing field
            "missing_from_db": ["test-org"],
            "needs_update": [],
            "orphaned_in_db": [],
        }

        manager = ConfigManager()

        captured_output = StringIO()
        with patch("sys.stdout", captured_output):
            manager.sync_organizations(dry_run=True)

        output = captured_output.getvalue()
        assert "Dry run" in output
        # Fix the assertion to match actual output format
        assert "- test-org" in output  # Look for the actual format used

    def test_sync_organizations_actual(self, mock_config_manager_deps):
        """Test actual sync command."""
        mock_deps = mock_config_manager_deps
        mock_deps["sync"].return_value.sync_all_organizations.return_value = {
            "success": True,
            "total_configs": 1,
            "processed": 1,
            "created": 1,
            "updated": 0,
            "errors": [],
        }

        manager = ConfigManager()

        captured_output = StringIO()
        with patch("sys.stdout", captured_output):
            manager.sync_organizations(dry_run=False)

        output = captured_output.getvalue()
        assert "✅ Sync completed successfully!" in output
        assert "➕ Created: 1" in output

    def test_run_scraper(self, mock_config_manager_deps):
        """Test running individual scraper."""
        mock_deps = mock_config_manager_deps
        mock_deps["runner"].return_value.run_scraper.return_value = {
            "success": True,
            "organization": "Test Organization",
            "animals_found": 5,
        }

        manager = ConfigManager()

        captured_output = StringIO()
        with patch("sys.stdout", captured_output):
            manager.run_scraper("test-org")

        output = captured_output.getvalue()
        assert "✅ Scraper completed successfully!" in output
        assert "Animals found: 5" in output

    def test_validate_configs(self, mock_config_manager_deps):
        """Test config validation command."""
        mock_deps = mock_config_manager_deps
        mock_deps["config"].validate_business_rules.return_value = [
            "Warning: Missing optional field"
        ]

        manager = ConfigManager()

        captured_output = StringIO()
        with patch("sys.stdout", captured_output):
            manager.validate_configs()

        output = captured_output.getvalue()
        assert "Warning: Missing optional field" in output
        assert "Configs with warnings: 1" in output
