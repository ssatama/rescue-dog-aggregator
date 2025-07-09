"""
Comprehensive test suite for management/config_commands.py critical gaps

Tests error handling, CLI interface, edge cases, and untested code paths.
"""

import argparse
import sys
from io import StringIO
from unittest.mock import MagicMock, Mock, patch

import pytest

from management.config_commands import ConfigManager, main


@pytest.mark.slow
@pytest.mark.integration
@pytest.mark.management
class TestConfigManagerErrorHandling:
    """Test error handling paths in ConfigManager."""

    def test_list_organizations_config_load_error(self):
        """Test list organizations when config loading fails."""
        with patch("management.config_commands.ConfigLoader") as mock_loader:
            mock_loader.return_value.load_all_configs.side_effect = Exception("Config load failed")

            manager = ConfigManager()

            captured_output = StringIO()
            with patch("sys.stdout", captured_output):
                manager.list_organizations()

            output = captured_output.getvalue()
            assert "❌ Error listing organizations: Config load failed" in output

    def test_show_organization_config_not_found(self):
        """Test show organization when config is not found."""
        with patch("management.config_commands.ConfigLoader") as mock_loader:
            mock_loader.return_value.load_config.side_effect = FileNotFoundError("Config not found")

            manager = ConfigManager()

            captured_output = StringIO()
            with patch("sys.stdout", captured_output):
                manager.show_organization("nonexistent-org")

            output = captured_output.getvalue()
            assert "❌ Error showing organization: Config not found" in output
            assert "Debug info:" in output

    def test_show_organization_with_validation_warnings(self):
        """Test show organization when config has validation warnings."""
        with patch("management.config_commands.ConfigLoader") as mock_loader, patch("management.config_commands.create_default_sync_service"), patch("management.config_commands.ConfigScraperRunner"):

            # Create mock config with validation warnings
            mock_config = Mock()
            mock_config.id = "test-org"
            mock_config.schema_version = "1.0"
            mock_config.enabled = True
            mock_config.get_display_name.return_value = "Test Organization"

            # Mock nested attributes
            mock_config.metadata.contact.email = "test@example.com"
            mock_config.metadata.contact.phone = "123-456-7890"
            mock_config.metadata.website_url = "https://example.com"
            mock_config.metadata.social_media.facebook = "https://facebook.com/test"
            mock_config.metadata.social_media.instagram = "https://instagram.com/test"
            mock_config.metadata.location.country = "US"
            mock_config.metadata.location.city = "Test City"
            mock_config.metadata.service_regions = ["North America"]
            mock_config.scraper.class_name = "TestScraper"
            mock_config.scraper.module = "scrapers.test"
            mock_config.scraper.config = None

            # Add validation warnings
            mock_config.validate_business_rules.return_value = ["Missing optional description", "Phone number format unclear"]

            mock_loader.return_value.load_config.return_value = mock_config

            manager = ConfigManager()

            captured_output = StringIO()
            with patch("sys.stdout", captured_output):
                manager.show_organization("test-org")

            output = captured_output.getvalue()
            assert "⚠️  Validation Warnings:" in output
            assert "Missing optional description" in output
            assert "Phone number format unclear" in output

    def test_show_organization_with_complex_service_regions(self):
        """Test show organization with complex service regions structure."""
        with patch("management.config_commands.ConfigLoader") as mock_loader, patch("management.config_commands.create_default_sync_service"), patch("management.config_commands.ConfigScraperRunner"):

            mock_config = Mock()
            mock_config.id = "test-org"
            mock_config.schema_version = "1.0"
            mock_config.enabled = True
            mock_config.get_display_name.return_value = "Test Organization"

            # Mock required attributes
            mock_config.metadata.contact.email = "test@example.com"
            mock_config.metadata.contact.phone = None
            mock_config.metadata.website_url = "https://example.com"
            mock_config.metadata.social_media.facebook = None
            mock_config.metadata.social_media.instagram = None
            mock_config.metadata.location.country = "US"
            mock_config.metadata.location.city = "Test City"
            mock_config.scraper.class_name = "TestScraper"
            mock_config.scraper.module = "scrapers.test"
            mock_config.scraper.config = None
            mock_config.validate_business_rules.return_value = []

            # Complex service regions with both strings and dict structures
            mock_config.metadata.service_regions = [
                "Simple region",
                {"country": "US", "regions": ["CA", "NV"]},
                {"country": "Canada", "regions": []},  # Empty regions list
                {"country": "Mexico"},  # No regions key
            ]

            mock_loader.return_value.load_config.return_value = mock_config

            manager = ConfigManager()

            captured_output = StringIO()
            with patch("sys.stdout", captured_output):
                manager.show_organization("test-org")

            output = captured_output.getvalue()
            assert "Simple region" in output
            assert "US: CA" in output
            assert "US: NV" in output
            assert "Canada (all regions)" in output
            assert "Mexico (all regions)" in output

    def test_show_organization_with_scraper_config_dict(self):
        """Test show organization with scraper config as dictionary."""
        with patch("management.config_commands.ConfigLoader") as mock_loader, patch("management.config_commands.create_default_sync_service"), patch("management.config_commands.ConfigScraperRunner"):

            mock_config = Mock()
            mock_config.id = "test-org"
            mock_config.schema_version = "1.0"
            mock_config.enabled = True
            mock_config.get_display_name.return_value = "Test Organization"

            # Mock required attributes
            mock_config.metadata.contact.email = "test@example.com"
            mock_config.metadata.contact.phone = None
            mock_config.metadata.website_url = "https://example.com"
            mock_config.metadata.social_media.facebook = None
            mock_config.metadata.social_media.instagram = None
            mock_config.metadata.location.country = "US"
            mock_config.metadata.location.city = "Test City"
            mock_config.metadata.service_regions = []
            mock_config.scraper.class_name = "TestScraper"
            mock_config.scraper.module = "scrapers.test"
            mock_config.validate_business_rules.return_value = []

            # Scraper config as dictionary
            mock_config.scraper.config = {"rate_limit": 1.0, "max_pages": 10, "timeout": 30}

            mock_loader.return_value.load_config.return_value = mock_config

            manager = ConfigManager()

            captured_output = StringIO()
            with patch("sys.stdout", captured_output):
                manager.show_organization("test-org")

            output = captured_output.getvalue()
            assert "rate_limit: 1.0" in output
            assert "max_pages: 10" in output
            assert "timeout: 30" in output

    def test_show_organization_with_scraper_config_object(self):
        """Test show organization with scraper config as object."""
        with patch("management.config_commands.ConfigLoader") as mock_loader, patch("management.config_commands.create_default_sync_service"), patch("management.config_commands.ConfigScraperRunner"):

            mock_config = Mock()
            mock_config.id = "test-org"
            mock_config.schema_version = "1.0"
            mock_config.enabled = True
            mock_config.get_display_name.return_value = "Test Organization"

            # Mock required attributes
            mock_config.metadata.contact.email = "test@example.com"
            mock_config.metadata.contact.phone = None
            mock_config.metadata.website_url = "https://example.com"
            mock_config.metadata.social_media.facebook = None
            mock_config.metadata.social_media.instagram = None
            mock_config.metadata.location.country = "US"
            mock_config.metadata.location.city = "Test City"
            mock_config.metadata.service_regions = []
            mock_config.scraper.class_name = "TestScraper"
            mock_config.scraper.module = "scrapers.test"
            mock_config.validate_business_rules.return_value = []

            # Scraper config as object with __dict__
            # Use a real object instead of Mock to avoid Mock attribute issues
            class ConfigObj:
                def __init__(self):
                    self.rate_limit = 2.0
                    self.retries = 3
                    self._private = "hidden"

            config_obj = ConfigObj()
            mock_config.scraper.config = config_obj

            mock_loader.return_value.load_config.return_value = mock_config

            manager = ConfigManager()

            captured_output = StringIO()
            with patch("sys.stdout", captured_output):
                manager.show_organization("test-org")

            output = captured_output.getvalue()
            assert "rate_limit: 2.0" in output
            assert "retries: 3" in output
            assert "_private" not in output  # Private attributes should be excluded

    def test_sync_organizations_with_service_regions_status(self):
        """Test sync dry run with service regions status."""
        with patch("management.config_commands.ConfigLoader"), patch("management.config_commands.create_default_sync_service") as mock_sync, patch("management.config_commands.ConfigScraperRunner"):

            # Mock sync status with service regions
            mock_sync.return_value.get_sync_status.return_value = {
                "total_configs": 5,
                "total_db_orgs": 3,
                "synced": 2,
                "missing_from_db": ["org1"],
                "needs_update": ["org2"],
                "orphaned_in_db": ["org3"],
                "service_regions": {"total_service_regions": 15, "organizations_with_regions": 4, "coverage_percentage": 80},
            }

            manager = ConfigManager()

            captured_output = StringIO()
            with patch("sys.stdout", captured_output):
                manager.sync_organizations(dry_run=True)

            output = captured_output.getvalue()
            assert "🗺️  Service Regions Status:" in output
            assert "Total service regions: 15" in output
            assert "Organizations with regions: 4" in output
            assert "Coverage: 80%" in output
            assert "➕ Would create:" in output
            assert "org1" in output
            assert "🔄 Would update:" in output
            assert "org2" in output
            assert "🗑️  Orphaned in database:" in output
            assert "org3" in output

    def test_sync_organizations_failure(self):
        """Test sync organizations when sync fails."""
        with patch("management.config_commands.ConfigLoader"), patch("management.config_commands.create_default_sync_service") as mock_sync, patch("management.config_commands.ConfigScraperRunner"):

            # Import SyncSummary to create proper mock object
            from utils.organization_sync_service import SyncSummary

            failed_summary = SyncSummary(total_configs=2, processed=1, created=0, updated=0, errors=["Database connection failed", "Validation error"], org_mappings={})
            mock_sync.return_value.sync_all_organizations.return_value = failed_summary

            manager = ConfigManager()

            captured_output = StringIO()
            with patch("sys.stdout", captured_output):
                manager.sync_organizations(dry_run=False)

            output = captured_output.getvalue()
            assert "❌ Sync failed!" in output
            assert "Database connection failed" in output
            assert "Validation error" in output

    def test_sync_organizations_error_exception(self):
        """Test sync organizations when exception occurs."""
        with patch("management.config_commands.ConfigLoader"), patch("management.config_commands.create_default_sync_service") as mock_sync, patch("management.config_commands.ConfigScraperRunner"):

            mock_sync.return_value.sync_all_organizations.side_effect = Exception("Sync exception")

            manager = ConfigManager()

            captured_output = StringIO()
            with patch("sys.stdout", captured_output):
                manager.sync_organizations(dry_run=False)

            output = captured_output.getvalue()
            assert "❌ Error syncing organizations: Sync exception" in output

    def test_run_scraper_with_sync_errors(self):
        """Test run scraper when sync has errors but continues."""
        with (
            patch("management.config_commands.ConfigLoader"),
            patch("management.config_commands.create_default_sync_service") as mock_sync,
            patch("management.config_commands.ConfigScraperRunner") as mock_runner,
        ):

            # Sync returns success=False but we continue
            from utils.organization_sync_service import SyncSummary

            sync_summary = SyncSummary(total_configs=1, processed=0, created=0, updated=0, errors=["Minor sync error"], org_mappings={})
            mock_sync.return_value.sync_all_organizations.return_value = sync_summary

            mock_runner.return_value.run_scraper.return_value = {"success": True, "organization": "Test Org", "animals_found": 10}

            manager = ConfigManager()

            captured_output = StringIO()
            with patch("sys.stdout", captured_output):
                manager.run_scraper("test-org", sync_first=True)

            output = captured_output.getvalue()
            assert "⚠️ Warning: organization sync reported errors, continuing to scraper" in output
            assert "✅ Scraper completed successfully!" in output
            assert "Animals found: 10" in output

    def test_run_scraper_failure(self):
        """Test run scraper when scraper fails."""
        with patch("management.config_commands.ConfigLoader"), patch("management.config_commands.create_default_sync_service"), patch("management.config_commands.ConfigScraperRunner") as mock_runner:

            mock_runner.return_value.run_scraper.return_value = {"success": False, "error": "Scraper crashed"}

            manager = ConfigManager()

            captured_output = StringIO()
            with patch("sys.stdout", captured_output):
                manager.run_scraper("test-org", sync_first=False)

            output = captured_output.getvalue()
            assert "❌ Scraper failed!" in output
            assert "Error: Scraper crashed" in output

    def test_run_scraper_exception(self):
        """Test run scraper when exception occurs."""
        with patch("management.config_commands.ConfigLoader"), patch("management.config_commands.create_default_sync_service"), patch("management.config_commands.ConfigScraperRunner") as mock_runner:

            mock_runner.return_value.run_scraper.side_effect = Exception("Runner exception")

            manager = ConfigManager()

            captured_output = StringIO()
            with patch("sys.stdout", captured_output):
                manager.run_scraper("test-org")

            output = captured_output.getvalue()
            assert "❌ Error running scraper: Runner exception" in output

    def test_run_all_scrapers_mixed_results(self):
        """Test run all scrapers with mixed success/failure results."""
        with (
            patch("management.config_commands.ConfigLoader"),
            patch("management.config_commands.create_default_sync_service") as mock_sync,
            patch("management.config_commands.ConfigScraperRunner") as mock_runner,
        ):

            from utils.organization_sync_service import SyncSummary

            sync_summary = SyncSummary(total_configs=3, processed=3, created=1, updated=2, errors=[], org_mappings={"org1": 1, "org2": 2, "org3": 3})
            mock_sync.return_value.sync_all_organizations.return_value = sync_summary

            mock_runner.return_value.run_all_enabled_scrapers.return_value = {
                "results": [
                    {"success": True, "organization": "Org A", "animals_found": 15},
                    {"success": False, "organization": "Org B", "error": "Network timeout"},
                    {"success": True, "organization": "Org C", "animals_found": 8},
                ],
                "successful": 2,
                "failed": 1,
                "total_orgs": 3,
            }

            manager = ConfigManager()

            captured_output = StringIO()
            with patch("sys.stdout", captured_output):
                manager.run_all_scrapers()

            output = captured_output.getvalue()
            assert "✅ Org A: 15 animals found" in output
            assert "❌ Error in Org B: Network timeout" in output
            assert "✅ Org C: 8 animals found" in output
            assert "🐾 Total animals found: 23" in output
            assert "📊 Overall: 2 succeeded, 1 failed out of 3 orgs" in output

    def test_run_all_scrapers_exception(self):
        """Test run all scrapers when exception occurs."""
        with patch("management.config_commands.ConfigLoader"), patch("management.config_commands.create_default_sync_service"), patch("management.config_commands.ConfigScraperRunner") as mock_runner:

            mock_runner.return_value.run_all_enabled_scrapers.side_effect = Exception("All scrapers failed")

            manager = ConfigManager()

            captured_output = StringIO()
            with patch("sys.stdout", captured_output):
                manager.run_all_scrapers()

            output = captured_output.getvalue()
            assert "❌ Error running all scrapers: All scrapers failed" in output

    def test_validate_configs_with_warnings(self):
        """Test validate configs when some configs have warnings."""
        with patch("management.config_commands.ConfigLoader") as mock_loader, patch("management.config_commands.create_default_sync_service"), patch("management.config_commands.ConfigScraperRunner"):

            # Create configs with different validation states
            mock_config1 = Mock()
            mock_config1.get_display_name.return_value = "Good Org"
            mock_config1.validate_business_rules.return_value = []

            mock_config2 = Mock()
            mock_config2.get_display_name.return_value = "Warning Org"
            mock_config2.validate_business_rules.return_value = ["Missing description", "Invalid URL"]

            configs = {"good-org": mock_config1, "warning-org": mock_config2}

            mock_loader.return_value.load_all_configs.return_value = configs

            manager = ConfigManager()

            captured_output = StringIO()
            with patch("sys.stdout", captured_output):
                manager.validate_configs()

            output = captured_output.getvalue()
            assert "✅ Good Org (good-org)" in output
            assert "⚠️  Warning Org (warning-org):" in output
            assert "Missing description" in output
            assert "Invalid URL" in output
            assert "Total configs: 2" in output
            assert "Configs with warnings: 1" in output
            assert "Valid configs: 1" in output

    def test_validate_configs_exception(self):
        """Test validate configs when exception occurs."""
        with patch("management.config_commands.ConfigLoader") as mock_loader, patch("management.config_commands.create_default_sync_service"), patch("management.config_commands.ConfigScraperRunner"):

            mock_loader.return_value.load_all_configs.side_effect = Exception("Validation failed")

            manager = ConfigManager()

            captured_output = StringIO()
            with patch("sys.stdout", captured_output):
                manager.validate_configs()

            output = captured_output.getvalue()
            assert "❌ Error validating configs: Validation failed" in output


@pytest.mark.slow
@pytest.mark.integration
@pytest.mark.management
class TestConfigCommandsCLI:
    """Test the CLI interface and main() function."""

    def test_main_no_command(self):
        """Test main with no command shows help."""
        with patch("sys.argv", ["config_commands.py"]), patch("argparse.ArgumentParser.print_help") as mock_help:

            main()
            mock_help.assert_called_once()

    def test_main_list_command(self):
        """Test main with list command."""
        with patch("sys.argv", ["config_commands.py", "list"]), patch("management.config_commands.ConfigManager") as mock_manager:

            main()
            mock_manager.return_value.list_organizations.assert_called_once_with(enabled_only=False)

    def test_main_list_enabled_only(self):
        """Test main with list --enabled-only command."""
        with patch("sys.argv", ["config_commands.py", "list", "--enabled-only"]), patch("management.config_commands.ConfigManager") as mock_manager:

            main()
            mock_manager.return_value.list_organizations.assert_called_once_with(enabled_only=True)

    def test_main_show_command(self):
        """Test main with show command."""
        with patch("sys.argv", ["config_commands.py", "show", "test-org"]), patch("management.config_commands.ConfigManager") as mock_manager:

            main()
            mock_manager.return_value.show_organization.assert_called_once_with("test-org")

    def test_main_sync_command(self):
        """Test main with sync command."""
        with patch("sys.argv", ["config_commands.py", "sync"]), patch("management.config_commands.ConfigManager") as mock_manager:

            main()
            mock_manager.return_value.sync_organizations.assert_called_once_with(dry_run=False)

    def test_main_sync_dry_run(self):
        """Test main with sync --dry-run command."""
        with patch("sys.argv", ["config_commands.py", "sync", "--dry-run"]), patch("management.config_commands.ConfigManager") as mock_manager:

            main()
            mock_manager.return_value.sync_organizations.assert_called_once_with(dry_run=True)

    def test_main_run_command(self):
        """Test main with run command."""
        with patch("sys.argv", ["config_commands.py", "run", "test-org"]), patch("management.config_commands.ConfigManager") as mock_manager:

            main()
            mock_manager.return_value.run_scraper.assert_called_once_with("test-org", sync_first=True)

    def test_main_run_no_sync(self):
        """Test main with run --no-sync command."""
        with patch("sys.argv", ["config_commands.py", "run", "test-org", "--no-sync"]), patch("management.config_commands.ConfigManager") as mock_manager:

            main()
            mock_manager.return_value.run_scraper.assert_called_once_with("test-org", sync_first=False)

    def test_main_run_all_command(self):
        """Test main with run-all command."""
        with patch("sys.argv", ["config_commands.py", "run-all"]), patch("management.config_commands.ConfigManager") as mock_manager:

            main()
            mock_manager.return_value.run_all_scrapers.assert_called_once_with(sync_first=True)

    def test_main_run_all_no_sync(self):
        """Test main with run-all --no-sync command."""
        with patch("sys.argv", ["config_commands.py", "run-all", "--no-sync"]), patch("management.config_commands.ConfigManager") as mock_manager:

            main()
            mock_manager.return_value.run_all_scrapers.assert_called_once_with(sync_first=False)

    def test_main_validate_command(self):
        """Test main with validate command."""
        with patch("sys.argv", ["config_commands.py", "validate"]), patch("management.config_commands.ConfigManager") as mock_manager:

            main()
            mock_manager.return_value.validate_configs.assert_called_once()


@pytest.mark.slow
@pytest.mark.integration
@pytest.mark.management
class TestConfigManagerEdgeCases:
    """Test edge cases and special scenarios."""

    def test_show_organization_no_service_regions(self):
        """Test show organization when service_regions is None."""
        with patch("management.config_commands.ConfigLoader") as mock_loader, patch("management.config_commands.create_default_sync_service"), patch("management.config_commands.ConfigScraperRunner"):

            mock_config = Mock()
            mock_config.id = "test-org"
            mock_config.schema_version = "1.0"
            mock_config.enabled = True
            mock_config.get_display_name.return_value = "Test Organization"

            # Mock required attributes
            mock_config.metadata.contact.email = "test@example.com"
            mock_config.metadata.contact.phone = None
            mock_config.metadata.website_url = "https://example.com"
            mock_config.metadata.social_media.facebook = None
            mock_config.metadata.social_media.instagram = None
            mock_config.metadata.location.country = "US"
            mock_config.metadata.location.city = "Test City"
            mock_config.scraper.class_name = "TestScraper"
            mock_config.scraper.module = "scrapers.test"
            mock_config.scraper.config = None
            mock_config.validate_business_rules.return_value = []

            # No service regions
            mock_config.metadata.service_regions = None

            mock_loader.return_value.load_config.return_value = mock_config

            manager = ConfigManager()

            captured_output = StringIO()
            with patch("sys.stdout", captured_output):
                manager.show_organization("test-org")

            output = captured_output.getvalue()
            assert "No service regions defined" in output

    def test_show_organization_unknown_scraper_config_type(self):
        """Test show organization with unknown scraper config type."""
        with patch("management.config_commands.ConfigLoader") as mock_loader, patch("management.config_commands.create_default_sync_service"), patch("management.config_commands.ConfigScraperRunner"):

            mock_config = Mock()
            mock_config.id = "test-org"
            mock_config.schema_version = "1.0"
            mock_config.enabled = True
            mock_config.get_display_name.return_value = "Test Organization"

            # Mock required attributes
            mock_config.metadata.contact.email = "test@example.com"
            mock_config.metadata.contact.phone = None
            mock_config.metadata.website_url = "https://example.com"
            mock_config.metadata.social_media.facebook = None
            mock_config.metadata.social_media.instagram = None
            mock_config.metadata.location.country = "US"
            mock_config.metadata.location.city = "Test City"
            mock_config.metadata.service_regions = []
            mock_config.scraper.class_name = "TestScraper"
            mock_config.scraper.module = "scrapers.test"
            mock_config.validate_business_rules.return_value = []

            # Unknown config type (not dict, not object with __dict__)
            mock_config.scraper.config = "unknown_config_type"

            mock_loader.return_value.load_config.return_value = mock_config

            manager = ConfigManager()

            captured_output = StringIO()
            with patch("sys.stdout", captured_output):
                manager.show_organization("test-org")

            output = captured_output.getvalue()
            assert "Config: unknown_config_type" in output

    def test_run_all_scrapers_no_results(self):
        """Test run all scrapers when no results are returned."""
        with (
            patch("management.config_commands.ConfigLoader"),
            patch("management.config_commands.create_default_sync_service") as mock_sync,
            patch("management.config_commands.ConfigScraperRunner") as mock_runner,
        ):

            from utils.organization_sync_service import SyncSummary

            sync_summary = SyncSummary(total_configs=0, processed=0, created=0, updated=0, errors=[], org_mappings={})
            mock_sync.return_value.sync_all_organizations.return_value = sync_summary

            # Empty results
            mock_runner.return_value.run_all_enabled_scrapers.return_value = {"results": [], "successful": 0, "failed": 0, "total_orgs": 0}

            manager = ConfigManager()

            captured_output = StringIO()
            with patch("sys.stdout", captured_output):
                manager.run_all_scrapers()

            output = captured_output.getvalue()
            assert "🐾 Total animals found: 0" in output
            assert "📊 Overall: 0 succeeded, 0 failed out of 0 orgs" in output
