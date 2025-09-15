#!/usr/bin/env python3
"""
Management command for checking dog adoption status using Firecrawl API.

Usage:
    python management/check_adoptions.py --org dogstrust
    python management/check_adoptions.py --all
    python management/check_adoptions.py --dry-run --verbose
    python management/check_adoptions.py --limit 10 --org dogstrust
"""

import argparse
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import psycopg2
from dotenv import load_dotenv
from psycopg2.extras import RealDictCursor

from services.adoption_detection import AdoptionCheckResult, AdoptionDetectionService
from utils.config_loader import ConfigLoader

load_dotenv()


class CheckAdoptionsCommand:
    """Management command for checking dog adoption status."""

    def __init__(self, dry_run: bool = False, verbose: bool = False):
        """Initialize the command.

        Args:
            dry_run: If True, don't make actual API calls or database updates
            verbose: If True, print detailed output
        """
        self.dry_run = dry_run
        self.verbose = verbose
        self.conn = None
        self.cursor = None
        self.config_loader = ConfigLoader()
        self.adoption_service = AdoptionDetectionService()

    def connect(self):
        """Connect to the database."""
        try:
            self.conn = psycopg2.connect(
                dbname=os.getenv("DB_NAME", "rescue_dogs"),
                user=os.getenv("DB_USER", "postgres"),
                password=os.getenv("DB_PASSWORD"),
                host=os.getenv("DB_HOST", "localhost"),
                port=os.getenv("DB_PORT", "5432"),
            )
            self.cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            if self.verbose:
                print(f"✅ Connected to database: {os.getenv('DB_NAME')}")
        except Exception as e:
            print(f"❌ Failed to connect to database: {e}")
            sys.exit(1)

    def get_organizations(self, org_slug: Optional[str] = None, all_orgs: bool = False):
        """Get organizations to check.

        Args:
            org_slug: Specific organization slug to check
            all_orgs: Check all organizations with adoption checking enabled

        Returns:
            List of organization configs
        """
        if org_slug:
            # Check specific organization
            config = self.config_loader.load_config(org_slug)
            if not config:
                print(f"❌ Organization '{org_slug}' not found")
                sys.exit(1)
            return [config]
        elif all_orgs:
            # Check all organizations with adoption checking enabled
            all_configs = self.config_loader.load_all_configs()
            enabled_configs = [config for config in all_configs.values() if getattr(config, "check_adoption_status", False)]
            if not enabled_configs:
                print("⚠️ No organizations have adoption checking enabled")
                return []
            return enabled_configs
        else:
            print("❌ Must specify --org or --all")
            sys.exit(1)

    def get_eligible_dogs(self, org_id: int, threshold: int, limit: int, check_interval_hours: int) -> List[dict]:
        """Get dogs eligible for adoption checking.

        Args:
            org_id: Organization ID
            threshold: Minimum consecutive scrapes missing
            limit: Maximum number of dogs to check
            check_interval_hours: Minimum hours between checks

        Returns:
            List of eligible dogs
        """
        # Calculate cutoff time for rechecks
        recheck_cutoff = datetime.now(timezone.utc) - timedelta(hours=check_interval_hours)

        query = """
            SELECT 
                id,
                name,
                adoption_url as url,
                status,
                consecutive_scrapes_missing,
                adoption_checked_at,
                adoption_check_data
            FROM animals
            WHERE organization_id = %s
            AND consecutive_scrapes_missing >= %s
            AND status NOT IN ('adopted', 'reserved')
            AND (
                adoption_checked_at IS NULL 
                OR adoption_checked_at < %s
            )
            ORDER BY consecutive_scrapes_missing DESC, id
            LIMIT %s
        """

        self.cursor.execute(query, (org_id, threshold, recheck_cutoff, limit))
        return self.cursor.fetchall()

    def get_organization_id(self, config_id: str) -> Optional[int]:
        """Get organization ID from database using config ID.

        Args:
            config_id: Configuration ID (e.g., 'dogstrust')

        Returns:
            Organization database ID or None if not found
        """
        query = "SELECT id FROM organizations WHERE config_id = %s"
        self.cursor.execute(query, (config_id,))
        result = self.cursor.fetchone()
        return result["id"] if result else None

    def check_organization(self, config: dict, limit: int):
        """Check adoption status for dogs in an organization.

        Args:
            config: Organization configuration
            limit: Maximum number of dogs to check
        """
        # Get database organization ID
        org_id = self.get_organization_id(config.id)
        if not org_id:
            print(f"❌ Organization '{config.id}' not found in database")
            return

        org_name = config.name

        # Get adoption check configuration
        threshold = getattr(config, "adoption_check_threshold", 3)
        adoption_config = getattr(config, "adoption_check_config", {})
        max_checks = min(limit, adoption_config.get("max_checks_per_run", 50))
        check_interval = adoption_config.get("check_interval_hours", 24)

        print(f"\n🔍 Checking {org_name}...")

        # Get eligible dogs
        eligible_dogs = self.get_eligible_dogs(org_id, threshold, max_checks, check_interval)

        if not eligible_dogs:
            print(f"  No eligible dogs to check")
            return

        print(f"  Found {len(eligible_dogs)} eligible dogs")

        if self.dry_run:
            print(f"\n  🔍 DRY RUN - Would check:")
            for dog in eligible_dogs[:5]:  # Show first 5
                print(f"    - {dog['name']} (ID: {dog['id']}, missing: {dog['consecutive_scrapes_missing']} scrapes)")
            if len(eligible_dogs) > 5:
                print(f"    ... and {len(eligible_dogs) - 5} more")
            return

        # Process dogs
        results = []
        for i, dog in enumerate(eligible_dogs, 1):
            if self.verbose:
                print(f"  [{i}/{len(eligible_dogs)}] Checking {dog['name']}...")

            try:
                # Create an animal-like object for the service
                # The service expects an animal object with id, name, url attributes
                class AnimalStub:
                    def __init__(self, id, name, url, status):
                        self.id = id
                        self.name = name
                        self.url = url
                        self.status = status

                animal = AnimalStub(id=dog["id"], name=dog["name"], url=dog["url"], status=dog["status"])

                # Check adoption status using Firecrawl
                result = self.adoption_service.check_adoption_status(animal)

                results.append(result)

                # Update database with result
                self.update_dog_status(dog["id"], result)

                if self.verbose:
                    status_emoji = {"adopted": "🎉", "reserved": "📝", "available": "✅", "unknown": "❓"}.get(result.detected_status, "❓")

                    print(f"    {status_emoji} Status: {result.detected_status} (confidence: {result.confidence:.2f})")
                    if result.evidence:
                        print(f"       Evidence: {result.evidence[:100]}...")

            except Exception as e:
                print(f"    ❌ Error checking {dog['name']}: {e}")
                continue

        # Print summary
        self.print_summary(org_name, results)

    def update_dog_status(self, dog_id: int, result: AdoptionCheckResult):
        """Update dog status in database based on check result.

        Args:
            dog_id: Dog ID to update
            result: Adoption check result
        """
        if self.dry_run:
            return

        update_query = """
            UPDATE animals
            SET 
                status = %s,
                adoption_check_data = %s,
                adoption_checked_at = %s
            WHERE id = %s
        """

        # Prepare adoption check data for storage
        check_data = {
            "evidence": result.evidence,
            "confidence": result.confidence,
            "previous_status": result.previous_status,
            "checked_at": result.checked_at.isoformat() if result.checked_at else None,
            "error": result.error,
        }

        # Only include raw_response if it's not too large
        if result.raw_response and len(json.dumps(result.raw_response)) < 10000:
            check_data["raw_response"] = result.raw_response

        self.cursor.execute(update_query, (result.detected_status, json.dumps(check_data), result.checked_at, dog_id))
        self.conn.commit()

    def print_summary(self, org_name: str, results: List[AdoptionCheckResult]):
        """Print summary of adoption checks.

        Args:
            org_name: Organization name
            results: List of check results
        """
        if not results:
            return

        print(f"\n📊 Summary for {org_name}:")

        # Count by status
        status_counts = {}
        for result in results:
            status = result.detected_status
            status_counts[status] = status_counts.get(status, 0) + 1

        total = len(results)
        print(f"  Total checked: {total}")

        for status, count in sorted(status_counts.items()):
            percentage = (count / total) * 100
            emoji = {"adopted": "🎉", "reserved": "📝", "available": "✅", "unknown": "❓"}.get(status, "❓")
            print(f"  {emoji} {status}: {count} ({percentage:.1f}%)")

        # Count errors
        error_count = sum(1 for r in results if r.error)
        if error_count > 0:
            print(f"  ❌ Errors: {error_count}")

    def cleanup(self):
        """Close database connections."""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
        if self.verbose:
            print("\n✅ Database connection closed.")


def main():
    """Main entry point for the command."""
    parser = argparse.ArgumentParser(description="Check dog adoption status using Firecrawl API")
    parser.add_argument("--org", help="Organization slug to check (e.g., dogstrust)")
    parser.add_argument("--all", action="store_true", help="Check all organizations with adoption checking enabled")
    parser.add_argument("--dry-run", action="store_true", help="Preview what would be checked without making API calls")
    parser.add_argument("--verbose", action="store_true", help="Show detailed output")
    parser.add_argument("--limit", type=int, default=50, help="Maximum number of dogs to check per organization (default: 50)")

    args = parser.parse_args()

    # Validate arguments
    if not args.org and not args.all:
        parser.error("Must specify either --org or --all")

    if args.org and args.all:
        parser.error("Cannot specify both --org and --all")

    # Run command
    command = CheckAdoptionsCommand(dry_run=args.dry_run, verbose=args.verbose)

    try:
        command.connect()

        # Get organizations to check
        organizations = command.get_organizations(org_slug=args.org, all_orgs=args.all)

        if not organizations:
            print("No organizations to check")
            sys.exit(0)

        # Check each organization
        for config in organizations:
            command.check_organization(config, args.limit)

        print("\n✅ Adoption checking complete!")

        if args.dry_run:
            print("\n📝 This was a DRY RUN - no API calls or database updates were made")

    except KeyboardInterrupt:
        print("\n⚠️ Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        if args.verbose:
            import traceback

            traceback.print_exc()
        sys.exit(1)
    finally:
        command.cleanup()


if __name__ == "__main__":
    main()
