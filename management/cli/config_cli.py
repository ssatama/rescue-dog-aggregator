"""
Command-line interface for configuration management operations.
Handles CLI commands and coordinates between services and formatters.
"""

from management.formatters.config_formatter import ConfigFormatter
from management.services.config_service import ConfigService


class ConfigCLI:
    """Command-line interface for configuration management."""

    def __init__(self, config_service: ConfigService, formatter: ConfigFormatter):
        """Initialize CLI with dependencies."""
        self.config_service = config_service
        self.formatter = formatter

    def list_organizations(self, enabled_only: bool = False) -> bool:
        """List organizations command."""
        try:
            organizations = self.config_service.get_organizations_list(enabled_only=enabled_only)
            self.formatter.format_organizations_list(organizations)
            return True
        except Exception as e:
            print(f"❌ Error listing organizations: {e}")
            return False

    def show_organization(self, config_id: str) -> bool:
        """Show organization details command."""
        try:
            details = self.config_service.get_organization_details(config_id)
            self.formatter.format_organization_details(details)
            return True
        except Exception as e:
            print(f"❌ Error showing organization: {e}")
            print("Debug info:")
            return False

    def sync_organizations(self, dry_run: bool = False) -> bool:
        """Sync organizations command."""
        try:
            result = self.config_service.sync_organizations(dry_run=dry_run)
            self.formatter.format_sync_status(result)
            return True
        except Exception as e:
            print(f"❌ Error syncing organizations: {e}")
            return False

    def run_scraper(self, config_id: str, sync_first: bool = True) -> bool:
        """Run scraper command."""
        try:
            result = self.config_service.run_scraper(config_id, sync_first=sync_first)
            self.formatter.format_scraper_results(config_id, result)
            return True
        except Exception as e:
            print(f"❌ Error running scraper: {e}")
            return False

    def run_all_scrapers(self, sync_first: bool = True) -> bool:
        """Run all scrapers command."""
        try:
            result = self.config_service.run_all_scrapers(sync_first=sync_first)

            if "results" in result:
                total_animals_found = 0

                print("🚀 Running all enabled scrapers...")
                print("=" * 50)

                for scraper_result in result["results"]:
                    config_id = scraper_result.get("config_id", "unknown")
                    if scraper_result.get("success"):
                        animals_found = scraper_result.get("animals_found", 0)
                        total_animals_found += animals_found
                        org_name = scraper_result.get("organization", "Unknown Organization")
                        print(f"✅ {org_name}: {animals_found} animals found")
                    else:
                        print(f"❌ Error in {scraper_result.get('organization', config_id)}: {scraper_result.get('error')}")

                print("=" * 50)
                print(f"🐾 Total animals found: {total_animals_found}")
                print(f"📊 Overall: {result.get('successful', 0)} succeeded, {result.get('failed', 0)} failed out of {result.get('total_orgs', 0)} orgs")
            else:
                print("❌ Unexpected response format from scraper runner")

            return True
        except Exception as e:
            print(f"❌ Error running all scrapers: {e}")
            return False

    def validate_configs(self) -> bool:
        """Validate configurations command."""
        try:
            result = self.config_service.validate_configs()
            self.formatter.format_validation_results(result)
            return True
        except Exception as e:
            print(f"❌ Error validating configs: {e}")
            return False
