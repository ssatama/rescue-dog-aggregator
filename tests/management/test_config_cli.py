import argparse
from unittest.mock import Mock, patch

import pytest

from management.cli.config_cli import ConfigCLI


class TestConfigCLI:
    """Test suite for ConfigCLI following TDD methodology."""

    def test_cli_creation(self):
        """Test ConfigCLI can be created with dependencies."""
        config_service = Mock()
        formatter = Mock()

        cli = ConfigCLI(config_service, formatter)

        assert cli.config_service == config_service
        assert cli.formatter == formatter

    def test_list_organizations_all(self):
        """Test listing all organizations."""
        config_service = Mock()
        formatter = Mock()

        mock_organizations = [{"config_id": "org1", "display_name": "Org 1", "enabled": True}, {"config_id": "org2", "display_name": "Org 2", "enabled": False}]
        config_service.get_organizations_list.return_value = mock_organizations

        cli = ConfigCLI(config_service, formatter)

        result = cli.list_organizations(enabled_only=False)

        assert result is True
        config_service.get_organizations_list.assert_called_once_with(enabled_only=False)
        formatter.format_organizations_list.assert_called_once_with(mock_organizations)

    def test_list_organizations_enabled_only(self):
        """Test listing only enabled organizations."""
        config_service = Mock()
        formatter = Mock()

        mock_organizations = [{"config_id": "org1", "display_name": "Org 1", "enabled": True}]
        config_service.get_organizations_list.return_value = mock_organizations

        cli = ConfigCLI(config_service, formatter)

        result = cli.list_organizations(enabled_only=True)

        assert result is True
        config_service.get_organizations_list.assert_called_once_with(enabled_only=True)
        formatter.format_organizations_list.assert_called_once_with(mock_organizations)

    def test_show_organization_success(self):
        """Test showing organization details successfully."""
        config_service = Mock()
        formatter = Mock()

        mock_details = {"config_id": "test-org", "display_name": "Test Organization", "enabled": True}
        config_service.get_organization_details.return_value = mock_details

        cli = ConfigCLI(config_service, formatter)

        result = cli.show_organization("test-org")

        assert result is True
        config_service.get_organization_details.assert_called_once_with("test-org")
        formatter.format_organization_details.assert_called_once_with(mock_details)

    def test_show_organization_failure(self):
        """Test showing organization details with error."""
        config_service = Mock()
        formatter = Mock()

        config_service.get_organization_details.side_effect = Exception("Config not found")

        cli = ConfigCLI(config_service, formatter)

        with patch("builtins.print") as mock_print:
            result = cli.show_organization("nonexistent-org")

        assert result is False
        config_service.get_organization_details.assert_called_once_with("nonexistent-org")
        mock_print.assert_called()
        formatter.format_organization_details.assert_not_called()

    def test_sync_organizations_dry_run(self):
        """Test dry run sync operation."""
        config_service = Mock()
        formatter = Mock()

        mock_sync_result = {"dry_run": True, "status": {"total_configs": 5, "synced": 3}}
        config_service.sync_organizations.return_value = mock_sync_result

        cli = ConfigCLI(config_service, formatter)

        result = cli.sync_organizations(dry_run=True)

        assert result is True
        config_service.sync_organizations.assert_called_once_with(dry_run=True)
        formatter.format_sync_status.assert_called_once_with(mock_sync_result)

    def test_sync_organizations_execute(self):
        """Test actual sync execution."""
        config_service = Mock()
        formatter = Mock()

        mock_sync_result = {"dry_run": False, "success": True, "created": 2, "updated": 1}
        config_service.sync_organizations.return_value = mock_sync_result

        cli = ConfigCLI(config_service, formatter)

        result = cli.sync_organizations(dry_run=False)

        assert result is True
        config_service.sync_organizations.assert_called_once_with(dry_run=False)
        formatter.format_sync_status.assert_called_once_with(mock_sync_result)

    def test_run_scraper_success(self):
        """Test running scraper successfully."""
        config_service = Mock()
        formatter = Mock()

        mock_result = {"success": True, "organization": "Test Org", "animals_found": 15}
        config_service.run_scraper.return_value = mock_result

        cli = ConfigCLI(config_service, formatter)

        result = cli.run_scraper("test-org", sync_first=True)

        assert result is True
        config_service.run_scraper.assert_called_once_with("test-org", sync_first=True)
        formatter.format_scraper_results.assert_called_once_with("test-org", mock_result)

    def test_validate_configs(self):
        """Test configuration validation."""
        config_service = Mock()
        formatter = Mock()

        mock_validation_result = {"total_configs": 3, "configs_with_warnings": 1, "valid_configs": 2, "validation_details": {}}
        config_service.validate_configs.return_value = mock_validation_result

        cli = ConfigCLI(config_service, formatter)

        result = cli.validate_configs()

        assert result is True
        config_service.validate_configs.assert_called_once()
        formatter.format_validation_results.assert_called_once_with(mock_validation_result)
