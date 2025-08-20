import argparse
import logging
import os
import sys

# Add the project root directory to Python path BEFORE imports
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

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

    def profile_dogs(self, org_id: int, limit: int = None, dry_run: bool = False):
        """Run LLM profiling for dogs.

        Args:
            org_id: Organization ID to profile dogs for
            limit: Maximum number of dogs to profile (None for all)
            dry_run: Only show what would be profiled, don't save
        """
        import asyncio
        import os
        import sys

        import psycopg2

        # Ensure project root is in path for LLM imports
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        if project_root not in sys.path:
            sys.path.insert(0, project_root)

        from config import DB_CONFIG
        from services.llm.dog_profiler import DogProfilerPipeline
        from services.llm.organization_config_loader import get_config_loader

        # Check if organization has a prompt template configured
        loader = get_config_loader()
        org_config = loader.load_config(org_id)

        if not org_config:
            print(f"❌ No LLM configuration found for organization {org_id}")
            print(f"   Available organizations: {loader.get_supported_organizations()}")
            return

        # Check if prompt template exists
        from pathlib import Path

        template_path = Path("prompts/organizations") / org_config.prompt_file
        if not template_path.exists():
            print(f"❌ Organization {org_id} ({org_config.organization_name}) is configured but prompt template not found: {org_config.prompt_file}")
            print(f"   This organization needs a prompt template to be created before LLM profiling can be used.")
            return

        print(f"🤖 Starting LLM profiling for {org_config.organization_name} (ID: {org_id})")
        print(f"   Source Language: {org_config.source_language}")
        print(f"   Model: {org_config.model_preference}")

        # Connect to database
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        # Get unprofiled dogs
        query = """
            SELECT id, name, breed, age_text, properties
            FROM animals 
            WHERE organization_id = %s 
            AND (dog_profiler_data IS NULL OR dog_profiler_data = '{}')
            ORDER BY id DESC
        """

        if limit:
            query += f" LIMIT {limit}"

        cursor.execute(query, (org_id,))

        dogs = []
        for row in cursor.fetchall():
            dogs.append({"id": row[0], "name": row[1], "breed": row[2], "age_text": row[3], "properties": row[4]})

        if not dogs:
            print("✅ No dogs need profiling")
            cursor.close()
            conn.close()
            return

        print(f"📊 Found {len(dogs)} dogs to profile")

        # Initialize pipeline
        pipeline = DogProfilerPipeline(organization_id=org_id, dry_run=dry_run)

        # Process batch
        print(f"🔄 Processing batch (dry_run={dry_run})...")
        results = asyncio.run(pipeline.process_batch(dogs, batch_size=5))

        print(f"✨ Processed {len(results)} dogs")

        # Save results if not dry run
        if results and not dry_run:
            success = asyncio.run(pipeline.save_results(results))
            print(f"💾 Save success: {success}")

        # Show statistics
        stats = pipeline.get_statistics()
        print(f"\n📈 Statistics:")
        print(f"  • Processed: {stats['processed']}")
        print(f"  • Successful: {stats['successful']}")
        print(f"  • Success rate: {stats['success_rate']:.1f}%")

        cursor.close()
        conn.close()


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

    # Profile command
    profile_parser = subparsers.add_parser("profile", help="Run LLM profiling for dogs")
    profile_parser.add_argument("--org-id", type=int, default=11, help="Organization ID (default: 11)")
    profile_parser.add_argument("--limit", type=int, help="Maximum number of dogs to profile")
    profile_parser.add_argument("--dry-run", action="store_true", help="Don't save results to database")

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
    elif args.command == "profile":
        manager.profile_dogs(args.org_id, limit=args.limit, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
