#!/usr/bin/env python3
"""
Railway database management commands.

This module provides CLI commands for managing Railway database operations
including connection testing, migrations, data synchronization, and status monitoring.
"""

import logging
import os
import subprocess
import sys

import click
from dotenv import load_dotenv

# Add the project root directory to Python path (insert at beginning for priority)
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Load environment variables from .env file
load_dotenv()

from services.railway.connection import check_railway_connection
from services.railway.migration import RailwayMigrationManager
from services.railway.sync import (
    RailwayDataSyncer,
    get_local_data_count,
    get_railway_data_count,
)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def safe_execute_railway_command(command: str) -> bool:
    """
    Safely execute a Railway CLI command using subprocess.

    Prevents command injection by using subprocess.run() with list arguments
    instead of os.system() with string concatenation.

    Args:
        command: The command to execute (e.g., "status", "test-connection")

    Returns:
        bool: True if command executed successfully, False otherwise
    """
    try:
        # Validate the command against allowed commands
        allowed_commands = ["status", "test-connection", "migrate", "sync"]

        if command not in allowed_commands:
            logger.error(
                f"Command '{command}' is not allowed. Allowed commands: {allowed_commands}"
            )
            return False

        # Get the absolute path to this script to prevent path manipulation
        script_path = os.path.abspath(__file__)

        # Use subprocess.run with list arguments to prevent injection
        cmd_list = [sys.executable, script_path, command]

        result = subprocess.run(
            cmd_list, check=True, capture_output=True, text=True, timeout=60
        )  # 60 second timeout

        # Print the output
        if result.stdout:
            click.echo(result.stdout)
        if result.stderr:
            click.echo(result.stderr, err=True)

        return True

    except subprocess.CalledProcessError as e:
        logger.error(f"Command '{command}' failed with return code {e.returncode}")
        if e.stdout:
            click.echo(e.stdout)
        if e.stderr:
            click.echo(e.stderr, err=True)
        return False
    except subprocess.TimeoutExpired:
        logger.error(f"Command '{command}' timed out after 60 seconds")
        return False
    except Exception as e:
        logger.error(f"Error executing command '{command}': {e}")
        return False


@click.group()
def railway_cli():
    """Railway database management commands."""
    pass


@railway_cli.command()
def test_connection():
    """Test connection to Railway database."""
    try:
        # Clear any stale cached Railway engine to ensure fresh connection
        from services.railway.connection import dispose_railway_engine

        dispose_railway_engine()

        if not os.getenv("RAILWAY_DATABASE_URL"):
            click.echo("❌ RAILWAY_DATABASE_URL environment variable not set", err=True)
            sys.exit(1)

        if check_railway_connection():
            click.echo("✅ Railway connection successful")
            sys.exit(0)
        else:
            click.echo("❌ Railway connection failed", err=True)
            sys.exit(1)

    except Exception as e:
        click.echo(f"❌ Error testing Railway connection: {e}", err=True)
        sys.exit(1)


@railway_cli.command()
@click.option(
    "--dry-run", is_flag=True, help="Show what would be migrated without making changes"
)
def migrate(dry_run):
    """Run Railway database migrations."""
    try:
        # Clear any stale cached Railway engine to ensure fresh connection
        from services.railway.connection import dispose_railway_engine

        dispose_railway_engine()

        manager = RailwayMigrationManager()

        if dry_run:
            click.echo("🔍 Running Railway migration dry run...")
            success = manager.setup_and_migrate(dry_run=True)
            if success:
                click.echo("✅ Railway migration dry run completed")
                sys.exit(0)
            else:
                click.echo("❌ Railway migration dry run failed", err=True)
                sys.exit(1)
        else:
            click.echo("🚀 Starting Railway database migration...")
            success = manager.setup_and_migrate(dry_run=False)
            if success:
                click.echo("✅ Railway database migration completed successfully")
                sys.exit(0)
            else:
                click.echo("❌ Railway database migration failed", err=True)
                sys.exit(1)

    except Exception as e:
        click.echo(f"❌ Error during Railway migration: {e}", err=True)
        sys.exit(1)


@railway_cli.command()
@click.option(
    "--dry-run", is_flag=True, help="Show what would be synced without making changes"
)
@click.option("--skip-validation", is_flag=True, help="Skip post-sync validation")
@click.option("--skip-indexes", is_flag=True, help="Skip syncing database indexes")
@click.option(
    "--mode",
    type=click.Choice(["incremental", "rebuild", "force"]),
    default="incremental",
    help="Sync mode: incremental (default), rebuild, or force",
)
@click.option(
    "--confirm-destructive",
    is_flag=True,
    help="Required confirmation for destructive operations (rebuild/force modes)",
)
def sync(dry_run, skip_validation, skip_indexes, mode, confirm_destructive):
    """Sync data from local database to Railway."""
    try:
        # Validate destructive mode confirmation
        if mode in ["rebuild", "force"] and not confirm_destructive:
            click.echo(
                f"❌ {mode.title()} mode requires --confirm-destructive flag", err=True
            )
            sys.exit(1)

        # Clear any stale cached Railway engine to ensure fresh connection
        from services.railway.connection import dispose_railway_engine

        dispose_railway_engine()

        syncer = RailwayDataSyncer()
        validate_after = not skip_validation
        sync_indexes = not skip_indexes

        if dry_run:
            click.echo("🔍 Running Railway sync dry run...")
            success = syncer.perform_full_sync(
                dry_run=True,
                validate_after=validate_after,
                sync_mode=mode,
                sync_indexes=sync_indexes,
            )
            if success:
                click.echo("✅ Railway sync dry run completed")
                sys.exit(0)
            else:
                click.echo("❌ Railway sync dry run failed", err=True)
                sys.exit(1)
        else:
            click.echo("🚀 Starting Railway data sync...")
            if sync_indexes:
                click.echo("📊 Index synchronization enabled")
            success = syncer.perform_full_sync(
                dry_run=False,
                validate_after=validate_after,
                sync_mode=mode,
                sync_indexes=sync_indexes,
            )
            if success:
                click.echo("✅ Railway data sync completed successfully")
                sys.exit(0)
            else:
                click.echo("❌ Railway data sync failed", err=True)
                sys.exit(1)

    except Exception as e:
        click.echo(f"❌ Error during Railway sync: {e}", err=True)
        sys.exit(1)


@railway_cli.command()
def status():
    """Show Railway database status and sync information."""
    try:
        # Clear any stale cached Railway engine to ensure fresh connection
        from services.railway.connection import dispose_railway_engine

        dispose_railway_engine()

        click.echo("🔍 Railway Database Status")
        click.echo("=" * 40)

        # Check connection
        try:
            connection_ok = check_railway_connection()
            if connection_ok:
                click.echo("Railway Connection: ✓ Connected")
            else:
                click.echo("Railway Connection: ✗ Failed")
                click.echo("\n❌ Cannot retrieve database status without connection")
                sys.exit(0)
        except Exception as e:
            click.echo(f"Railway Connection: ✗ Error - {e}")
            sys.exit(0)

        # Get data counts for all tables
        click.echo("\nData Summary:")
        click.echo("-" * 20)

        tables = ["organizations", "animals", "scrape_logs", "service_regions"]
        mismatches = []

        for table in tables:
            local_count = get_local_data_count(table)
            railway_count = get_railway_data_count(table)
            click.echo(
                f"{table.title()}: {local_count} (local) → {railway_count} (Railway)"
            )

            if local_count != railway_count:
                mismatches.append(f"{table.title()}: {local_count} vs {railway_count}")

        if mismatches:
            click.echo("\n⚠ Data mismatch detected:")
            for mismatch in mismatches:
                click.echo(f"  • {mismatch}")
            click.echo("\nConsider running: python management/railway_commands.py sync")
        else:
            click.echo("\n✅ Local and Railway databases are in sync")

        sys.exit(0)

    except Exception as e:
        click.echo(f"❌ Error checking Railway status: {e}", err=True)
        sys.exit(1)


@railway_cli.command()
@click.option(
    "--dry-run", is_flag=True, help="Show what would be done without making changes"
)
def setup(dry_run):
    """Complete Railway database setup (migration + initial sync)."""
    try:
        # Clear any stale cached Railway engine to ensure fresh connection
        from services.railway.connection import dispose_railway_engine

        dispose_railway_engine()

        if dry_run:
            click.echo("🔍 Running Railway setup dry run...")

            # Test migration
            migration_manager = RailwayMigrationManager()
            migration_success = migration_manager.setup_and_migrate(dry_run=True)

            if not migration_success:
                click.echo("❌ Railway migration dry run failed", err=True)
                sys.exit(1)

            # Test sync
            syncer = RailwayDataSyncer()
            sync_success = syncer.perform_full_sync(
                dry_run=True, validate_after=True, sync_mode="incremental"
            )

            if not sync_success:
                click.echo("❌ Railway sync dry run failed", err=True)
                sys.exit(1)

            click.echo("✅ Railway setup dry run completed")
            sys.exit(0)

        else:
            click.echo("🚀 Starting Railway database setup...")

            # Step 1: Run migrations
            click.echo("Step 1: Setting up Railway database schema...")
            migration_manager = RailwayMigrationManager()
            migration_success = migration_manager.setup_and_migrate(dry_run=False)

            if not migration_success:
                click.echo("❌ Railway migration failed during setup", err=True)
                sys.exit(1)

            click.echo("✅ Railway database schema setup complete")

            # Step 2: Sync data
            click.echo("Step 2: Syncing data to Railway...")
            syncer = RailwayDataSyncer()
            sync_success = syncer.perform_full_sync(
                dry_run=False, validate_after=True, sync_mode="incremental"
            )

            if not sync_success:
                click.echo("❌ Railway data sync failed during setup", err=True)
                sys.exit(1)

            click.echo("✅ Railway data sync complete")
            click.echo("✅ Railway setup completed successfully")

            # Show final status
            click.echo("\nFinal Status:")
            safe_execute_railway_command("status")

            sys.exit(0)

    except Exception as e:
        click.echo(f"❌ Error during Railway setup: {e}", err=True)
        sys.exit(1)


if __name__ == "__main__":
    railway_cli()
