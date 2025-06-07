import argparse
import json
import logging
import os
import sys
from pathlib import Path
from typing import List, Optional

# Add the project root directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.config_loader import ConfigLoader
from utils.config_scraper_runner import ConfigScraperRunner
from utils.org_sync import OrganizationSyncManager


class ConfigManager:
    """Command-line interface for managing configurations."""

    def __init__(self):
        """Initialize the config manager."""
        self.config_loader = ConfigLoader()
        self.sync_manager = OrganizationSyncManager(self.config_loader)
        self.scraper_runner = ConfigScraperRunner(self.config_loader)
        self.logger = logging.getLogger(__name__)

    def list_organizations(self, enabled_only: bool = False):
        """List all organizations from configs.

        Args:
            enabled_only: Only show enabled organizations
        """
        try:
            configs = self.config_loader.load_all_configs()

            print("🏢 Available Organizations:")
            print("=" * 50)

            for config_id, config in configs.items():
                if enabled_only and not config.enabled:
                    continue

                status = "✅ ENABLED" if config.enabled else "❌ DISABLED"
                print(f"{config.get_display_name()}")
                print(f"  Status: {status}")
                print(f"  Scraper: {config.scraper.class_name}")
                print(f"  Module: {config.scraper.module}")
                print()

        except Exception as e:
            print(f"❌ Error listing organizations: {e}")

    def show_organization(self, config_id: str):
        """Show detailed information about an organization.

        Args:
            config_id: Organization config ID
        """
        try:
            config = self.config_loader.load_config(config_id)

            print(f"🏢 Organization Details: {config.get_display_name()}")
            print("=" * 50)
            print(f"Config ID: {config.id}")
            print(f"Schema Version: {config.schema_version}")
            print(f"Status: {'✅ ENABLED' if config.enabled else '❌ DISABLED'}")
            print()

            print("📧 Contact Information:")
            print(f"  Email: {config.metadata.contact.email}")
            print(f"  Phone: {config.metadata.contact.phone}")
            print()

            print("🌐 Online Presence:")
            print(f"  Website: {config.metadata.website_url}")
            print(f"  Facebook: {config.metadata.social_media.facebook}")
            print(f"  Instagram: {config.metadata.social_media.instagram}")
            print()

            print("📍 Location:")
            print(f"  Country: {config.metadata.location.country}")
            print(f"  City: {config.metadata.location.city}")
            print()

            # Show service regions
            print("🗺️  Service Regions:")
            if config.metadata.service_regions:
                for region in config.metadata.service_regions:
                    if isinstance(region, str):
                        print(f"  - {region}")
                    elif isinstance(region, dict):
                        country = region.get("country", "Unknown")
                        regions = region.get("regions", [])
                        if regions:
                            for r in regions:
                                print(f"  - {country}: {r}")
                        else:
                            print(f"  - {country} (all regions)")
            else:
                print("  No service regions defined")
            print()

            print("🔧 Scraper Configuration:")
            print(f"  Class: {config.scraper.class_name}")
            print(f"  Module: {config.scraper.module}")

            # Fix: Handle ScraperConfig object properly
            if hasattr(config.scraper, "config") and config.scraper.config:
                print("  Settings:")
                scraper_config = config.scraper.config

                # Check if it's a dictionary or a config object
                if hasattr(scraper_config, "__dict__"):
                    # It's a config object, get its attributes
                    for key, value in scraper_config.__dict__.items():
                        if not key.startswith("_"):  # Skip private attributes
                            print(f"    {key}: {value}")
                elif hasattr(scraper_config, "items"):
                    # It's a dictionary
                    for key, value in scraper_config.items():
                        print(f"    {key}: {value}")
                else:
                    # Unknown type, just show the string representation
                    print(f"    Config: {scraper_config}")
            else:
                print("  Settings: None")
            print()

            # Show validation warnings
            warnings = config.validate_business_rules()
            if warnings:
                print("⚠️  Validation Warnings:")
                for warning in warnings:
                    print(f"  - {warning}")
            else:
                print("✅ No validation warnings")

        except Exception as e:
            print(f"❌ Error showing organization: {e}")
            # Add debug info to help troubleshoot
            import traceback

            print(f"Debug info: {traceback.format_exc()}")

    def sync_organizations(self, dry_run: bool = False):
        """Sync organizations to database.

        Args:
            dry_run: Only show what would be synced, don't make changes
        """
        try:
            if dry_run:
                print("🔍 Dry run - checking what would be synced...")
                status = self.sync_manager.get_sync_status()

                print("📊 Sync Status:")
                print(f"  Total configs: {status['total_configs']}")
                print(f"  Organizations in database: {status['total_db_orgs']}")
                print(f"  Already synced: {status['synced']}")
                print()

                # NEW: Show service regions status
                if "service_regions" in status:
                    sr_status = status["service_regions"]
                    print("🗺️  Service Regions Status:")
                    print(
                        f"  Total service regions: {sr_status.get('total_service_regions', 0)}"
                    )
                    print(
                        f"  Organizations with regions: {sr_status.get('organizations_with_regions', 0)}"
                    )
                    print(f"  Coverage: {sr_status.get('coverage_percentage', 0)}%")
                    print()

                if status["missing_from_db"]:
                    print("➕ Would create:")
                    for config_id in status["missing_from_db"]:
                        print(f"    - {config_id}")

                if status["needs_update"]:
                    print("🔄 Would update:")
                    for config_id in status["needs_update"]:
                        print(f"    - {config_id}")

                if status["orphaned_in_db"]:
                    print("🗑️  Orphaned in database:")
                    for config_id in status["orphaned_in_db"]:
                        print(f"    - {config_id}")
            else:
                print("🔄 Syncing organizations to database...")
                results = self.sync_manager.sync_all_organizations()

                if results["success"]:
                    print("✅ Sync completed successfully!")
                    print(f"📊 Results:")
                    print(f"  ➕ Created: {results['created']}")
                    print(f"  🔄 Updated: {results['updated']}")
                    print(f"  📊 Total processed: {results['processed']}")
                    print(f"  🗺️  Service regions synced for all organizations")
                else:
                    print("❌ Sync failed!")
                    for error in results.get("errors", []):
                        print(f"  Error: {error}")

        except Exception as e:
            print(f"❌ Error syncing organizations: {e}")

    def run_scraper(self, config_id: str, sync_first: bool = True):
        """Run a specific scraper.

        Args:
            config_id: Organization config ID
            sync_first: Whether to sync organizations before running
        """
        try:
            if sync_first:
                print("🔄 Syncing organizations to database before scraping...")
                sync_res = self.sync_manager.sync_all_organizations()
                if not sync_res.get("success"):
                    print(
                        "⚠️ Warning: organization sync reported errors, continuing to scraper"
                    )

            print(f"🚀 Running scraper for: {config_id}")
            result = self.scraper_runner.run_scraper(config_id)

            if result["success"]:
                print("✅ Scraper completed successfully!")
                print(f"Organization: {result.get('organization', config_id)}")
                print(f"Animals found: {result.get('animals_found', 0)}")
            else:
                print("❌ Scraper failed!")
                print(f"Error: {result['error']}")

        except Exception as e:
            print(f"❌ Error running scraper: {e}")

    def run_all_scrapers(self, sync_first: bool = True):
        """Run all enabled scrapers."""
        try:
            if sync_first:
                print("🔄 Syncing organizations to database before running scrapers...")
                sync_res = self.sync_manager.sync_all_organizations()
                if not sync_res.get("success"):
                    print(
                        "⚠️ Warning: organization sync reported errors, continuing to scrapers"
                    )

            print("🚀 Running all enabled scrapers...")
            print("=" * 50)

            res = self.scraper_runner.run_all_enabled_scrapers()

            # Loop through the per-org results
            total_animals_found = 0
            for result in res.get("results", []):
                if result.get("success"):
                    org_name = result.get("organization", "Unknown Organization")
                    animals_found = result.get("animals_found", 0)
                    total_animals_found += animals_found
                    print(f"✅ {org_name}: {animals_found} animals found")
                else:
                    print(
                        f"❌ Error in {result.get('organization')}: {result.get('error')}"
                    )

            print("=" * 50)
            print(f"🐾 Total animals found: {total_animals_found}")
            print(
                f"📊 Overall: {res.get('successful',0)} succeeded, {res.get('failed',0)} failed out of {res.get('total_orgs',0)} orgs"
            )

        except Exception as e:
            print(f"❌ Error running all scrapers: {e}")

    def validate_configs(self):
        """Validate all configuration files."""
        try:
            configs = self.config_loader.load_all_configs()

            print("🔍 Validating configurations...")
            print("=" * 50)

            total_configs = len(configs)
            configs_with_warnings = 0

            for config_id, config in configs.items():
                warnings = config.validate_business_rules()

                if warnings:
                    configs_with_warnings += 1
                    print(f"⚠️  {config.get_display_name()} ({config_id}):")
                    for warning in warnings:
                        print(f"    - {warning}")
                    print()
                else:
                    print(f"✅ {config.get_display_name()} ({config_id})")

            print("=" * 50)
            print(f"📊 Summary:")
            print(f"  Total configs: {total_configs}")
            print(f"  Configs with warnings: {configs_with_warnings}")
            print(f"  Valid configs: {total_configs - configs_with_warnings}")

        except Exception as e:
            print(f"❌ Error validating configs: {e}")


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(description="Manage config-driven scrapers")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # List command
    list_parser = subparsers.add_parser("list", help="List organizations")
    list_parser.add_argument(
        "--enabled-only", action="store_true", help="Show only enabled organizations"
    )

    # Show command
    show_parser = subparsers.add_parser("show", help="Show organization details")
    show_parser.add_argument("config_id", help="Organization config ID")

    # Sync command
    sync_parser = subparsers.add_parser("sync", help="Sync organizations to database")
    sync_parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be synced without making changes",
    )

    # Run command
    run_parser = subparsers.add_parser("run", help="Run scraper for organization")
    run_parser.add_argument("config_id", help="Organization config ID")
    run_parser.add_argument(
        "--no-sync",
        action="store_true",
        help="Don't sync organization to database first",
    )

    # Run-all command
    run_all_parser = subparsers.add_parser("run-all", help="Run all enabled scrapers")
    run_all_parser.add_argument(
        "--no-sync",
        action="store_true",
        help="Don't sync organizations to database first",
    )

    # Validate command
    validate_parser = subparsers.add_parser(
        "validate", help="Validate configuration files"
    )

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    manager = ConfigManager()

    if args.command == "list":
        manager.list_organizations(enabled_only=args.enabled_only)
    elif args.command == "show":
        manager.show_organization(args.config_id)
    elif args.command == "sync":
        manager.sync_organizations(dry_run=args.dry_run)
    elif args.command == "run":
        manager.run_scraper(args.config_id, sync_first=not args.no_sync)
    elif args.command == "run-all":
        manager.run_all_scrapers(sync_first=not args.no_sync)
    elif args.command == "validate":
        manager.validate_configs()


if __name__ == "__main__":
    main()
