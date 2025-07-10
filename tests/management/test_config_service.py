from typing import Any, Dict
from unittest.mock import Mock, patch

import pytest

from management.services.config_service import ConfigService
from utils.config_models import OrganizationConfig


class TestConfigService:
    """Test suite for ConfigService following TDD methodology."""

    def test_config_service_creation(self):
        """Test ConfigService can be created with dependencies."""
        config_loader = Mock()
        sync_manager = Mock()
        scraper_runner = Mock()

        service = ConfigService(config_loader, sync_manager, scraper_runner)

        assert service.config_loader == config_loader
        assert service.sync_manager == sync_manager
        assert service.scraper_runner == scraper_runner

    def test_get_organizations_list(self):
        """Test getting list of organizations with enabled filter."""
        config_loader = Mock()
        sync_manager = Mock()
        scraper_runner = Mock()

        # Mock organization configs
        mock_config_enabled = Mock()
        mock_config_enabled.enabled = True
        mock_config_enabled.get_display_name.return_value = "Test Org 1"
        mock_config_enabled.scraper.class_name = "TestScraper1"
        mock_config_enabled.scraper.module = "test.module1"

        mock_config_disabled = Mock()
        mock_config_disabled.enabled = False
        mock_config_disabled.get_display_name.return_value = "Test Org 2"
        mock_config_disabled.scraper.class_name = "TestScraper2"
        mock_config_disabled.scraper.module = "test.module2"

        mock_configs = {"org1": mock_config_enabled, "org2": mock_config_disabled}
        config_loader.load_all_configs.return_value = mock_configs

        service = ConfigService(config_loader, sync_manager, scraper_runner)

        # Test getting all organizations
        result = service.get_organizations_list(enabled_only=False)

        assert len(result) == 2
        assert result[0]["config_id"] == "org1"
        assert result[0]["enabled"] == True
        assert result[1]["config_id"] == "org2"
        assert result[1]["enabled"] == False

    def test_get_organizations_list_enabled_only(self):
        """Test getting list of only enabled organizations."""
        config_loader = Mock()
        sync_manager = Mock()
        scraper_runner = Mock()

        # Mock organization configs
        mock_config_enabled = Mock()
        mock_config_enabled.enabled = True
        mock_config_enabled.get_display_name.return_value = "Test Org 1"
        mock_config_enabled.scraper.class_name = "TestScraper1"
        mock_config_enabled.scraper.module = "test.module1"

        mock_config_disabled = Mock()
        mock_config_disabled.enabled = False

        mock_configs = {"org1": mock_config_enabled, "org2": mock_config_disabled}
        config_loader.load_all_configs.return_value = mock_configs

        service = ConfigService(config_loader, sync_manager, scraper_runner)

        # Test getting enabled organizations only
        result = service.get_organizations_list(enabled_only=True)

        assert len(result) == 1
        assert result[0]["config_id"] == "org1"
        assert result[0]["enabled"] == True

    def test_get_organization_details(self):
        """Test getting detailed information about specific organization."""
        config_loader = Mock()
        sync_manager = Mock()
        scraper_runner = Mock()

        # Mock organization config
        mock_config = Mock()
        mock_config.id = "test-org"
        mock_config.schema_version = "1.0"
        mock_config.enabled = True
        mock_config.get_display_name.return_value = "Test Organization"
        mock_config.metadata.contact.email = "test@example.com"
        mock_config.metadata.contact.phone = "+1-555-0123"
        mock_config.metadata.website_url = "https://test.org"
        mock_config.metadata.social_media.facebook = "https://facebook.com/test"
        mock_config.metadata.social_media.instagram = "https://instagram.com/test"
        mock_config.metadata.location.country = "US"
        mock_config.metadata.location.city = "Test City"
        mock_config.metadata.service_regions = ["US: California", "US: Nevada"]
        mock_config.scraper.class_name = "TestScraper"
        mock_config.scraper.module = "test.module"
        mock_config.scraper.config = Mock()
        mock_config.scraper.config.__dict__ = {"rate_limit_delay": 2.0, "max_retries": 3}
        mock_config.validate_business_rules.return_value = []

        config_loader.load_config.return_value = mock_config

        service = ConfigService(config_loader, sync_manager, scraper_runner)

        result = service.get_organization_details("test-org")

        assert result["config_id"] == "test-org"
        assert result["schema_version"] == "1.0"
        assert result["enabled"] == True
        assert result["display_name"] == "Test Organization"
        assert result["contact"]["email"] == "test@example.com"
        assert result["contact"]["phone"] == "+1-555-0123"
        assert result["online"]["website"] == "https://test.org"
        assert result["location"]["country"] == "US"
        assert result["location"]["city"] == "Test City"
        assert result["service_regions"] == ["US: California", "US: Nevada"]
        assert result["scraper"]["class_name"] == "TestScraper"
        assert result["scraper"]["module"] == "test.module"
        assert result["scraper"]["config"] == {"rate_limit_delay": 2.0, "max_retries": 3}
        assert result["validation_warnings"] == []

    def test_sync_organizations_dry_run(self):
        """Test dry run synchronization of organizations."""
        config_loader = Mock()
        sync_manager = Mock()
        scraper_runner = Mock()

        mock_configs = {"org1": Mock(), "org2": Mock()}
        config_loader.load_all_configs.return_value = mock_configs

        mock_status = {
            "total_configs": 2,
            "total_db_orgs": 1,
            "synced": 1,
            "missing_from_db": ["org2"],
            "needs_update": [],
            "orphaned_in_db": [],
            "service_regions": {"total_service_regions": 5, "organizations_with_regions": 2, "coverage_percentage": 100},
        }
        sync_manager.get_sync_status.return_value = mock_status

        service = ConfigService(config_loader, sync_manager, scraper_runner)

        result = service.sync_organizations(dry_run=True)

        assert result["dry_run"] == True
        assert result["status"]["total_configs"] == 2
        assert result["status"]["missing_from_db"] == ["org2"]

    def test_sync_organizations_execute(self):
        """Test actual synchronization of organizations."""
        config_loader = Mock()
        sync_manager = Mock()
        scraper_runner = Mock()

        mock_configs = {"org1": Mock(), "org2": Mock()}
        config_loader.load_all_configs.return_value = mock_configs

        mock_results = Mock()
        mock_results.success = True
        mock_results.created = 1
        mock_results.updated = 0
        mock_results.processed = 2
        mock_results.errors = []
        sync_manager.sync_all_organizations.return_value = mock_results

        service = ConfigService(config_loader, sync_manager, scraper_runner)

        result = service.sync_organizations(dry_run=False)

        assert result["dry_run"] == False
        assert result["success"] == True
        assert result["created"] == 1
        assert result["updated"] == 0
        assert result["processed"] == 2

    def test_run_scraper(self):
        """Test running specific scraper."""
        config_loader = Mock()
        sync_manager = Mock()
        scraper_runner = Mock()

        mock_sync_result = Mock()
        mock_sync_result.success = True
        sync_manager.sync_all_organizations.return_value = mock_sync_result

        mock_scraper_result = {"success": True, "organization": "Test Org", "animals_found": 25, "error": None}
        scraper_runner.run_scraper.return_value = mock_scraper_result

        service = ConfigService(config_loader, sync_manager, scraper_runner)

        result = service.run_scraper("test-org", sync_first=True)

        assert result["success"] == True
        assert result["organization"] == "Test Org"
        assert result["animals_found"] == 25
        scraper_runner.run_scraper.assert_called_once_with("test-org")

    def test_validate_configs(self):
        """Test configuration validation."""
        config_loader = Mock()
        sync_manager = Mock()
        scraper_runner = Mock()

        # Mock configs with different validation results
        mock_config1 = Mock()
        mock_config1.get_display_name.return_value = "Valid Org"
        mock_config1.validate_business_rules.return_value = []

        mock_config2 = Mock()
        mock_config2.get_display_name.return_value = "Invalid Org"
        mock_config2.validate_business_rules.return_value = ["Missing required field", "Invalid URL format"]

        mock_configs = {"valid-org": mock_config1, "invalid-org": mock_config2}
        config_loader.load_all_configs.return_value = mock_configs

        service = ConfigService(config_loader, sync_manager, scraper_runner)

        result = service.validate_configs()

        assert result["total_configs"] == 2
        assert result["configs_with_warnings"] == 1
        assert result["valid_configs"] == 1
        assert len(result["validation_details"]) == 2
        assert result["validation_details"]["valid-org"]["warnings"] == []
        assert result["validation_details"]["invalid-org"]["warnings"] == ["Missing required field", "Invalid URL format"]
