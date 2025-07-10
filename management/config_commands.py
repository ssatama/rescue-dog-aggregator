import argparse
import logging
import os
import sys

# Add the project root directory to Python path BEFORE imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from management.cli.config_cli import ConfigCLI  # noqa: E402
from management.formatters.config_formatter import ConfigFormatter  # noqa: E402
from management.services.config_service import ConfigService  # noqa: E402
from utils.config_loader import ConfigLoader  # noqa: E402
from utils.config_scraper_runner import ConfigScraperRunner  # noqa: E402

# Now import local modules after path is set
from utils.organization_sync_service import create_default_sync_service  # noqa: E402


class ConfigManager:
    """Legacy command-line interface for managing configurations."""

    def __init__(self):
        """Initialize the config manager."""
        self.config_loader = ConfigLoader()
        self.sync_manager = create_default_sync_service()
        self.scraper_runner = ConfigScraperRunner(self.config_loader)
        self.logger = logging.getLogger(__name__)

        # Create new decomposed components
        self.config_service = ConfigService(self.config_loader, self.sync_manager, self.scraper_runner)
        self.formatter = ConfigFormatter()
        self.cli = ConfigCLI(self.config_service, self.formatter)

    def list_organizations(self, enabled_only: bool = False):
        """List all organizations from configs.

        Args:
            enabled_only: Only show enabled organizations
        """
        return self.cli.list_organizations(enabled_only)

    def show_organization(self, config_id: str):
        """Show detailed information about an organization.

        Args:
            config_id: Organization config ID
        """
        return self.cli.show_organization(config_id)

    def sync_organizations(self, dry_run: bool = False):
        """Sync organizations to database.

        Args:
            dry_run: Only show what would be synced, don't make changes
        """
        return self.cli.sync_organizations(dry_run)

    def run_scraper(self, config_id: str, sync_first: bool = True):
        """Run a specific scraper.

        Args:
            config_id: Organization config ID
            sync_first: Whether to sync organizations before running
        """
        return self.cli.run_scraper(config_id, sync_first)

    def run_all_scrapers(self, sync_first: bool = True):
        """Run all enabled scrapers."""
        return self.cli.run_all_scrapers(sync_first)

    def validate_configs(self):
        """Validate all configuration files."""
        return self.cli.validate_configs()


def main():
    """Main CLI entry point."""
    # Initialize database pool first
    from utils.db_connection import create_database_config_from_env, initialize_database_pool

    try:
        db_config = create_database_config_from_env()
        initialize_database_pool(db_config)
    except Exception as e:
        print(f"❌ Failed to initialize database: {e}")
        return 1

    parser = argparse.ArgumentParser(description="Manage config-driven scrapers")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # List command
    list_parser = subparsers.add_parser("list", help="List organizations")
    list_parser.add_argument("--enabled-only", action="store_true", help="Show only enabled organizations")

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
    subparsers.add_parser("validate", help="Validate configuration files")

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
