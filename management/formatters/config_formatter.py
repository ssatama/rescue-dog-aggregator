"""
Configuration output formatter for CLI commands.
Handles all formatted output for configuration management operations.
"""

from typing import Any


class ConfigFormatter:
    """Handles formatted output for configuration management commands."""

    def format_organizations_list(self, organizations: list[dict[str, Any]]) -> None:
        """Format and print organizations list."""
        print("🏢 Available Organizations:")
        print("=" * 50)

        for org in organizations:
            status = "✅ ENABLED" if org["enabled"] else "❌ DISABLED"
            print(f"{org['display_name']}")
            print(f"  Status: {status}")
            print(f"  Scraper: {org['scraper_class']}")
            print(f"  Module: {org['scraper_module']}")
            print()

    def format_organization_details(self, details: dict[str, Any]) -> None:
        """Format and print organization details."""
        print(f"🏢 Organization Details: {details['display_name']}")
        print("=" * 50)
        print(f"Config ID: {details['config_id']}")
        print(f"Schema Version: {details['schema_version']}")
        print(f"Status: {'✅ ENABLED' if details['enabled'] else '❌ DISABLED'}")
        print()

        print("📧 Contact Information:")
        print(f"  Email: {details['contact']['email']}")
        print(f"  Phone: {details['contact']['phone']}")
        print()

        print("🌐 Online Presence:")
        print(f"  Website: {details['online']['website']}")
        print(f"  Facebook: {details['online']['facebook']}")
        print(f"  Instagram: {details['online']['instagram']}")
        print()

        print("📍 Location:")
        print(f"  Country: {details['location']['country']}")
        print(f"  City: {details['location']['city']}")
        print()

        print("🗺️  Service Regions:")
        if details["service_regions"]:
            for region in details["service_regions"]:
                print(f"  - {region}")
        else:
            print("  No service regions defined")
        print()

        print("🔧 Scraper Configuration:")
        print(f"  Class: {details['scraper']['class_name']}")
        print(f"  Module: {details['scraper']['module']}")

        config = details["scraper"]["config"]
        if config is not None:
            if isinstance(config, dict):
                print("  Settings:")
                for key, value in config.items():
                    print(f"    {key}: {value}")
            else:
                # Handle unknown config types (strings, etc.)
                print(f"  Config: {config}")
        else:
            print("  Settings: None")
        print()

        if details["validation_warnings"]:
            print("⚠️  Validation Warnings:")
            for warning in details["validation_warnings"]:
                print(f"  - {warning}")
        else:
            print("✅ No validation warnings")

    def format_sync_status(self, sync_result: dict[str, Any]) -> None:
        """Format and print sync status or results."""
        if sync_result.get("dry_run", False):
            print("🔍 Dry run - checking what would be synced...")
            status = sync_result["status"]

            print("📊 Sync Status:")
            print(f"  Total configs: {status['total_configs']}")
            print(f"  Organizations in database: {status['total_db_orgs']}")
            print(f"  Already synced: {status['synced']}")
            print()

            if "service_regions" in status:
                sr_status = status["service_regions"]
                print("🗺️  Service Regions Status:")
                print(f"  Total service regions: {sr_status.get('total_service_regions', 0)}")
                print(f"  Organizations with regions: {sr_status.get('organizations_with_regions', 0)}")
                print(f"  Coverage: {sr_status.get('coverage_percentage', 0)}%")
                print()

            if status.get("missing_from_db"):
                print("➕ Would create:")
                for config_id in status["missing_from_db"]:
                    print(f"    - {config_id}")

            if status.get("needs_update"):
                print("🔄 Would update:")
                for config_id in status["needs_update"]:
                    print(f"    - {config_id}")

            if status.get("orphaned_in_db"):
                print("🗑️  Orphaned in database:")
                for config_id in status["orphaned_in_db"]:
                    print(f"    - {config_id}")
        else:
            print("🔄 Syncing organizations...")

            if sync_result.get("success", False):
                print("✅ Sync completed successfully!")
                print("📊 Results:")
                print(f"  ➕ Created: {sync_result.get('created', 0)}")
                print(f"  🔄 Updated: {sync_result.get('updated', 0)}")
                print(f"  📊 Total processed: {sync_result.get('processed', 0)}")
                print("  🗺️  Service regions synced for all organizations")
            else:
                print("❌ Sync failed!")
                for error in sync_result.get("errors", []):
                    print(f"  Error: {error}")

    def format_validation_results(self, validation_result: dict[str, Any]) -> None:
        """Format and print validation results."""
        print("🔍 Validating configurations...")
        print("=" * 50)

        for config_id, details in validation_result["validation_details"].items():
            if details["warnings"]:
                print(f"⚠️  {details['display_name']} ({config_id}):")
                for warning in details["warnings"]:
                    print(f"    - {warning}")
                print()
            else:
                print(f"✅ {details['display_name']} ({config_id})")

        print("=" * 50)
        print("📊 Summary:")
        print(f"  Total configs: {validation_result['total_configs']}")
        print(f"  Configs with warnings: {validation_result['configs_with_warnings']}")
        print(f"  Valid configs: {validation_result['valid_configs']}")

    def format_scraper_results(self, config_id: str, scraper_result: dict[str, Any]) -> None:
        """Format and print scraper execution results."""
        print(f"🚀 Running scraper for: {config_id}")

        # Show sync warnings if present
        if "sync_warnings" in scraper_result:
            print("⚠️ Warning: organization sync reported errors, continuing to scraper")

        if scraper_result.get("success", False):
            print("✅ Scraper completed successfully!")
            print(f"Organization: {scraper_result.get('organization', config_id)}")
            print(f"Animals found: {scraper_result.get('animals_found', 0)}")
        else:
            print("❌ Scraper failed!")
            print(f"Error: {scraper_result.get('error', 'Unknown error')}")
