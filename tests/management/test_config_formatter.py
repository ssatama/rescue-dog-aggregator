from contextlib import redirect_stdout
from io import StringIO
from unittest.mock import patch

import pytest

from management.formatters.config_formatter import ConfigFormatter


class TestConfigFormatter:
    """Test suite for ConfigFormatter following TDD methodology."""

    def test_formatter_creation(self):
        """Test ConfigFormatter can be created."""
        formatter = ConfigFormatter()
        assert formatter is not None

    def test_format_organizations_list(self):
        """Test formatting organizations list output."""
        formatter = ConfigFormatter()

        organizations = [
            {"config_id": "org1", "display_name": "Test Organization 1", "enabled": True, "scraper_class": "TestScraper1", "scraper_module": "test.module1"},
            {"config_id": "org2", "display_name": "Test Organization 2", "enabled": False, "scraper_class": "TestScraper2", "scraper_module": "test.module2"},
        ]

        # Capture output
        output = StringIO()
        with redirect_stdout(output):
            formatter.format_organizations_list(organizations)

        result = output.getvalue()

        assert "🏢 Available Organizations:" in result
        assert "Test Organization 1" in result
        assert "Test Organization 2" in result
        assert "✅ ENABLED" in result
        assert "❌ DISABLED" in result

    def test_format_organization_details(self):
        """Test formatting organization details output."""
        formatter = ConfigFormatter()

        details = {
            "config_id": "test-org",
            "schema_version": "1.0",
            "enabled": True,
            "display_name": "Test Organization",
            "contact": {"email": "test@example.com", "phone": "+1-555-0123"},
            "online": {"website": "https://test.org", "facebook": "https://facebook.com/test", "instagram": "https://instagram.com/test"},
            "location": {"country": "US", "city": "Test City"},
            "service_regions": ["US: California", "US: Nevada"],
            "scraper": {"class_name": "TestScraper", "module": "test.module", "config": {"rate_limit_delay": 2.0, "max_retries": 3}},
            "validation_warnings": [],
        }

        # Capture output
        output = StringIO()
        with redirect_stdout(output):
            formatter.format_organization_details(details)

        result = output.getvalue()

        assert "🏢 Organization Details: Test Organization" in result
        assert "Config ID: test-org" in result
        assert "✅ ENABLED" in result
        assert "test@example.com" in result
        assert "+1-555-0123" in result
        assert "https://test.org" in result
        assert "US: California" in result
        assert "TestScraper" in result
        assert "✅ No validation warnings" in result

    def test_format_organization_details_with_warnings(self):
        """Test formatting organization details with validation warnings."""
        formatter = ConfigFormatter()

        details = {
            "config_id": "test-org",
            "schema_version": "1.0",
            "enabled": False,
            "display_name": "Test Organization",
            "contact": {"email": "test@example.com", "phone": "+1-555-0123"},
            "online": {"website": "https://test.org", "facebook": None, "instagram": None},
            "location": {"country": "US", "city": "Test City"},
            "service_regions": [],
            "scraper": {"class_name": "TestScraper", "module": "test.module", "config": {}},
            "validation_warnings": ["Missing required field", "Invalid URL format"],
        }

        # Capture output
        output = StringIO()
        with redirect_stdout(output):
            formatter.format_organization_details(details)

        result = output.getvalue()

        assert "❌ DISABLED" in result
        assert "No service regions defined" in result
        assert "⚠️  Validation Warnings:" in result
        assert "Missing required field" in result
        assert "Invalid URL format" in result

    def test_format_sync_status(self):
        """Test formatting sync status output."""
        formatter = ConfigFormatter()

        sync_result = {
            "dry_run": True,
            "status": {
                "total_configs": 5,
                "total_db_orgs": 3,
                "synced": 2,
                "missing_from_db": ["org4", "org5"],
                "needs_update": ["org1"],
                "orphaned_in_db": [],
                "service_regions": {"total_service_regions": 10, "organizations_with_regions": 3, "coverage_percentage": 60},
            },
        }

        # Capture output
        output = StringIO()
        with redirect_stdout(output):
            formatter.format_sync_status(sync_result)

        result = output.getvalue()

        assert "🔍 Dry run" in result
        assert "📊 Sync Status:" in result
        assert "Total configs: 5" in result
        assert "Organizations in database: 3" in result
        assert "🗺️  Service Regions Status:" in result
        assert "Coverage: 60%" in result
        assert "➕ Would create:" in result
        assert "org4" in result
        assert "🔄 Would update:" in result
        assert "org1" in result

    def test_format_sync_results(self):
        """Test formatting actual sync results."""
        formatter = ConfigFormatter()

        sync_result = {"dry_run": False, "success": True, "created": 2, "updated": 1, "processed": 5, "errors": []}

        # Capture output
        output = StringIO()
        with redirect_stdout(output):
            formatter.format_sync_status(sync_result)

        result = output.getvalue()

        assert "🔄 Syncing organizations" in result
        assert "✅ Sync completed successfully!" in result
        assert "➕ Created: 2" in result
        assert "🔄 Updated: 1" in result
        assert "📊 Total processed: 5" in result

    def test_format_validation_results(self):
        """Test formatting validation results."""
        formatter = ConfigFormatter()

        validation_result = {
            "total_configs": 3,
            "configs_with_warnings": 1,
            "valid_configs": 2,
            "validation_details": {
                "valid-org1": {"display_name": "Valid Org 1", "warnings": []},
                "valid-org2": {"display_name": "Valid Org 2", "warnings": []},
                "invalid-org": {"display_name": "Invalid Org", "warnings": ["Missing field", "Invalid format"]},
            },
        }

        # Capture output
        output = StringIO()
        with redirect_stdout(output):
            formatter.format_validation_results(validation_result)

        result = output.getvalue()

        assert "🔍 Validating configurations..." in result
        assert "✅ Valid Org 1" in result
        assert "✅ Valid Org 2" in result
        assert "⚠️  Invalid Org" in result
        assert "Missing field" in result
        assert "📊 Summary:" in result
        assert "Total configs: 3" in result
        assert "Configs with warnings: 1" in result
        assert "Valid configs: 2" in result

    def test_format_scraper_results(self):
        """Test formatting scraper execution results."""
        formatter = ConfigFormatter()

        # Test successful scraper result
        scraper_result = {"success": True, "organization": "Test Organization", "animals_found": 25, "error": None}

        # Capture output
        output = StringIO()
        with redirect_stdout(output):
            formatter.format_scraper_results("test-org", scraper_result)

        result = output.getvalue()

        assert "🚀 Running scraper for: test-org" in result
        assert "✅ Scraper completed successfully!" in result
        assert "Organization: Test Organization" in result
        assert "Animals found: 25" in result

    def test_format_scraper_results_failure(self):
        """Test formatting failed scraper results."""
        formatter = ConfigFormatter()

        # Test failed scraper result
        scraper_result = {"success": False, "organization": "Test Organization", "animals_found": 0, "error": "Connection timeout"}

        # Capture output
        output = StringIO()
        with redirect_stdout(output):
            formatter.format_scraper_results("test-org", scraper_result)

        result = output.getvalue()

        assert "🚀 Running scraper for: test-org" in result
        assert "❌ Scraper failed!" in result
        assert "Error: Connection timeout" in result
