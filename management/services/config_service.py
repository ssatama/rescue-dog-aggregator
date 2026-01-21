"""
Configuration service for management operations following CLAUDE.md principles.
Provides pure business logic functions for configuration management.
"""

from typing import Any

from utils.config_loader import ConfigLoader
from utils.config_scraper_runner import ConfigScraperRunner
from utils.organization_sync_service import OrganizationSyncService


class ConfigService:
    """Pure business logic service for configuration management."""

    def __init__(
        self,
        config_loader: ConfigLoader,
        sync_manager: OrganizationSyncService,
        scraper_runner: ConfigScraperRunner,
    ):
        """Initialize config service with dependencies."""
        self.config_loader = config_loader
        self.sync_manager = sync_manager
        self.scraper_runner = scraper_runner

    def get_organizations_list(self, enabled_only: bool = False) -> list[dict[str, Any]]:
        """Get list of organizations with optional enabled filter."""
        configs = self.config_loader.load_all_configs()

        organizations = []
        for config_id, config in configs.items():
            if enabled_only and not config.enabled:
                continue

            organizations.append(
                {
                    "config_id": config_id,
                    "display_name": config.get_display_name(),
                    "enabled": config.enabled,
                    "scraper_class": config.scraper.class_name,
                    "scraper_module": config.scraper.module,
                }
            )

        return organizations

    def get_organization_details(self, config_id: str) -> dict[str, Any]:
        """Get detailed information about specific organization."""
        config = self.config_loader.load_config(config_id)

        # Extract service regions
        service_regions = []
        if config.metadata.service_regions:
            for region in config.metadata.service_regions:
                if isinstance(region, str):
                    service_regions.append(region)
                elif isinstance(region, dict):
                    country = region.get("country", "Unknown")
                    regions = region.get("regions", [])
                    if regions:
                        for r in regions:
                            service_regions.append(f"{country}: {r}")
                    else:
                        service_regions.append(f"{country} (all regions)")

        # Extract scraper configuration
        scraper_config = None
        if hasattr(config.scraper, "config") and config.scraper.config is not None:
            scraper_config_obj = config.scraper.config
            if hasattr(scraper_config_obj, "__dict__"):
                scraper_config = {key: value for key, value in scraper_config_obj.__dict__.items() if not key.startswith("_")}
            elif hasattr(scraper_config_obj, "items"):
                scraper_config = dict(scraper_config_obj.items())
            else:
                # Handle unknown config types (strings, etc.) by storing as raw value
                scraper_config = scraper_config_obj

        return {
            "config_id": config.id,
            "schema_version": config.schema_version,
            "enabled": config.enabled,
            "display_name": config.get_display_name(),
            "contact": {
                "email": config.metadata.contact.email,
                "phone": config.metadata.contact.phone,
            },
            "online": {
                "website": config.metadata.website_url,
                "facebook": config.metadata.social_media.facebook,
                "instagram": config.metadata.social_media.instagram,
            },
            "location": {
                "country": config.metadata.location.country,
                "city": config.metadata.location.city,
            },
            "service_regions": service_regions,
            "scraper": {
                "class_name": config.scraper.class_name,
                "module": config.scraper.module,
                "config": scraper_config,
            },
            "validation_warnings": config.validate_business_rules(),
        }

    def sync_organizations(self, dry_run: bool = False) -> dict[str, Any]:
        """Sync organizations to database."""
        configs = self.config_loader.load_all_configs()

        if dry_run:
            status = self.sync_manager.get_sync_status(configs)
            return {"dry_run": True, "status": status}
        else:
            results = self.sync_manager.sync_all_organizations(configs)
            return {
                "dry_run": False,
                "success": results.success,
                "created": results.created,
                "updated": results.updated,
                "processed": results.processed,
                "errors": results.errors,
            }

    def run_scraper(self, config_id: str, sync_first: bool = True) -> dict[str, Any]:
        """Run specific scraper with optional pre-sync."""
        sync_errors = []
        if sync_first:
            configs = self.config_loader.load_all_configs()
            sync_result = self.sync_manager.sync_all_organizations(configs)
            if not sync_result.success:
                sync_errors = sync_result.errors

        scraper_result = self.scraper_runner.run_scraper(config_id)

        # Add sync warnings to result if there were any
        if sync_errors:
            scraper_result["sync_warnings"] = sync_errors

        return scraper_result

    def run_all_scrapers(self, sync_first: bool = True) -> dict[str, Any]:
        """Run all enabled scrapers with optional pre-sync."""
        if sync_first:
            configs = self.config_loader.load_all_configs()
            sync_result = self.sync_manager.sync_all_organizations(configs)
            if not sync_result.success:
                return {
                    "success": False,
                    "error": "Organization sync failed before running scrapers",
                    "sync_errors": sync_result.errors,
                }

        return self.scraper_runner.run_all_enabled_scrapers()

    def validate_configs(self) -> dict[str, Any]:
        """Validate all configuration files."""
        configs = self.config_loader.load_all_configs()

        validation_details = {}
        configs_with_warnings = 0

        for config_id, config in configs.items():
            warnings = config.validate_business_rules()
            validation_details[config_id] = {
                "display_name": config.get_display_name(),
                "warnings": warnings,
            }
            if warnings:
                configs_with_warnings += 1

        return {
            "total_configs": len(configs),
            "configs_with_warnings": configs_with_warnings,
            "valid_configs": len(configs) - configs_with_warnings,
            "validation_details": validation_details,
        }
