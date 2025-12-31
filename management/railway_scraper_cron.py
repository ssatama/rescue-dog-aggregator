#!/usr/bin/env python
"""Railway cron job entrypoint for running all scrapers.

This script is designed to run as a Railway cron job on Tue/Thu/Sat at 6am UTC.
It initializes Sentry, runs all enabled scrapers, and outputs a JSON summary.

Usage:
    python management/railway_scraper_cron.py           # Run all enabled scrapers
    python management/railway_scraper_cron.py --org=misisrescue  # Run single org
    python management/railway_scraper_cron.py --dry-run # Show what would run

Environment Variables Required:
    DATABASE_URL or RAILWAY_DATABASE_URL: PostgreSQL connection string
    SENTRY_DSN_BACKEND: Sentry DSN for error tracking (optional in non-prod)
    ENVIRONMENT: production/development (default: production)
    OPENROUTER_API_KEY: For LLM enrichment
    R2_*: For image uploads to Cloudflare R2
"""

import nest_asyncio

nest_asyncio.apply()

import argparse
import json
import logging
import os
import signal
import sys
from datetime import datetime, timezone

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from config import enable_world_class_scraper_logging, get_database_config
from scrapers.sentry_integration import add_scrape_breadcrumb, init_scraper_sentry
from utils.db_connection import (
    create_database_config_from_env,
    initialize_database_pool,
)
from utils.secure_config_scraper_runner import (
    BatchRunResult,
    SecureConfigScraperRunner,
)

# Configure root logger directly (basicConfig doesn't work if called after config.py import)
root_logger = logging.getLogger()
handler = logging.StreamHandler()
handler.setFormatter(
    logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%SZ",
    )
)
root_logger.handlers.clear()
root_logger.addHandler(handler)
root_logger.setLevel(logging.INFO)

logger = logging.getLogger(__name__)

shutdown_requested = False


def handle_shutdown(signum, frame):
    """Handle SIGTERM/SIGINT for graceful shutdown."""
    global shutdown_requested
    signal_name = signal.Signals(signum).name
    logger.warning(f"Received {signal_name}, requesting graceful shutdown...")
    shutdown_requested = True


def validate_environment() -> bool:
    """Validate required environment variables are set."""
    db_config = get_database_config()

    if not db_config.get("host") or not db_config.get("database"):
        logger.error("Database configuration missing. Set DATABASE_URL or RAILWAY_DATABASE_URL.")
        return False

    logger.info(f"Database: {db_config['user']}@{db_config['host']}/{db_config['database']}")
    return True


def run_single_scraper(runner: SecureConfigScraperRunner, config_id: str) -> dict:
    """Run a single scraper and return result as dict."""
    logger.info(f"Running single scraper: {config_id}")
    add_scrape_breadcrumb(f"Starting scraper: {config_id}", category="cron")

    result = runner.run_scraper(config_id, sync_first=True)

    return {
        "config_id": result.config_id,
        "success": result.success,
        "organization": result.organization,
        "animals_found": result.animals_found,
        "error": result.error,
    }


def run_all_scrapers(runner: SecureConfigScraperRunner) -> BatchRunResult:
    """Run all enabled scrapers."""
    logger.info("Running all enabled scrapers")
    add_scrape_breadcrumb("Starting batch scrape run", category="cron")

    return runner.run_all_enabled_scrapers()


def format_batch_summary(result: BatchRunResult, start_time: datetime) -> dict:
    """Format batch result as JSON summary."""
    end_time = datetime.now(timezone.utc)
    duration_seconds = (end_time - start_time).total_seconds()

    total_dogs_found = sum(r.animals_found or 0 for r in result.results if r.success)

    failed_orgs = [r.config_id for r in result.results if not r.success]

    return {
        "batch_complete": True,
        "timestamp": end_time.isoformat(),
        "total_orgs": result.total_orgs,
        "successful": result.successful,
        "failed": result.failed,
        "total_dogs_found": total_dogs_found,
        "duration_seconds": round(duration_seconds, 2),
        "failed_orgs": failed_orgs,
        "overall_success": result.success and result.failed == 0,
    }


def list_available_scrapers(runner: SecureConfigScraperRunner) -> None:
    """List all available scrapers and their status."""
    scrapers = runner.list_available_scrapers()

    print("\nAvailable scrapers:")
    print("-" * 60)

    for scraper in scrapers:
        status = "enabled" if scraper.enabled else "disabled"
        print(f"  {scraper.config_id:25} {scraper.display_name:25} [{status}]")

    enabled_count = sum(1 for s in scrapers if s.enabled)
    print(f"\nTotal: {len(scrapers)} scrapers ({enabled_count} enabled)")


def main():
    """Main entry point for Railway cron job."""
    parser = argparse.ArgumentParser(description="Railway scraper cron job")
    parser.add_argument("--org", type=str, help="Run only a specific organization")
    parser.add_argument("--dry-run", action="store_true", help="Show what would run without executing")
    parser.add_argument("--list", action="store_true", help="List available scrapers")
    parser.add_argument("--json", action="store_true", help="Output results as JSON only")
    args = parser.parse_args()

    signal.signal(signal.SIGTERM, handle_shutdown)
    signal.signal(signal.SIGINT, handle_shutdown)

    start_time = datetime.now(timezone.utc)
    environment = os.getenv("ENVIRONMENT", "production")

    if not args.json:
        logger.info(f"Railway scraper cron starting at {start_time.isoformat()}")
        logger.info(f"Environment: {environment}")

    init_scraper_sentry(environment=environment)
    add_scrape_breadcrumb("Cron job started", category="cron", data={"start_time": start_time.isoformat()})

    if not validate_environment():
        logger.error("Environment validation failed")
        sys.exit(1)

    # Initialize database connection pool
    db_config = create_database_config_from_env()
    initialize_database_pool(db_config)
    logger.info("Database connection pool initialized")

    enable_world_class_scraper_logging()

    runner = SecureConfigScraperRunner()

    if args.list:
        list_available_scrapers(runner)
        sys.exit(0)

    if args.dry_run:
        logger.info("DRY RUN - showing what would be executed")
        scrapers = runner.list_available_scrapers()
        enabled = [s for s in scrapers if s.enabled]

        if args.org:
            matching = [s for s in scrapers if s.config_id == args.org]
            if not matching:
                logger.error(f"Organization '{args.org}' not found")
                sys.exit(1)
            print(f"\nWould run scraper: {args.org}")
            print(f"  Display name: {matching[0].display_name}")
            print(f"  Enabled: {matching[0].enabled}")
        else:
            print(f"\nWould run {len(enabled)} enabled scrapers:")
            for s in enabled:
                print(f"  - {s.config_id} ({s.display_name})")

        sys.exit(0)

    if shutdown_requested:
        logger.warning("Shutdown requested before scraping started")
        sys.exit(1)

    if args.org:
        result = run_single_scraper(runner, args.org)
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            if result["success"]:
                logger.info(f"Scraper completed: {result['organization']} - {result['animals_found']} animals found")
            else:
                logger.error(f"Scraper failed: {result['error']}")

        sys.exit(0 if result["success"] else 1)

    batch_result = run_all_scrapers(runner)
    summary = format_batch_summary(batch_result, start_time)

    if args.json:
        print(json.dumps(summary, indent=2))
    else:
        logger.info("=" * 60)
        logger.info("BATCH SCRAPE COMPLETE")
        logger.info("=" * 60)
        logger.info(f"Total organizations: {summary['total_orgs']}")
        logger.info(f"Successful: {summary['successful']}")
        logger.info(f"Failed: {summary['failed']}")
        logger.info(f"Total dogs found: {summary['total_dogs_found']}")
        logger.info(f"Duration: {summary['duration_seconds']:.1f} seconds")

        if summary["failed_orgs"]:
            logger.warning(f"Failed organizations: {', '.join(summary['failed_orgs'])}")

        print("\n" + json.dumps(summary, indent=2))

    add_scrape_breadcrumb(
        "Cron job completed",
        category="cron",
        data={
            "successful": summary["successful"],
            "failed": summary["failed"],
            "duration_seconds": summary["duration_seconds"],
        },
    )

    exit_code = 0 if summary["overall_success"] else 1
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
