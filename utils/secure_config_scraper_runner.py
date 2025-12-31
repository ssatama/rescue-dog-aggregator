"""
Secure configuration-based scraper runner with dependency injection.
Follows CLAUDE.md principles: immutable data, pure functions, early returns.
"""

import logging
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Protocol, Tuple

from utils.config_loader import ConfigLoader
from utils.organization_sync_service import (
    OrganizationSyncService,
    create_default_sync_service,
)
from utils.secure_scraper_loader import ScraperModuleInfo, SecureScraperLoader

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ScraperInfo:
    """Immutable scraper information."""

    config_id: str
    name: str
    enabled: bool
    scraper_class: str
    module: str
    display_name: str


@dataclass(frozen=True)
class ScraperRunResult:
    """Immutable scraper run result."""

    config_id: str
    success: bool
    organization: Optional[str] = None
    animals_found: Optional[int] = None
    error: Optional[str] = None


@dataclass(frozen=True)
class BatchRunResult:
    """Immutable batch run result."""

    success: bool
    total_orgs: int
    successful: int
    failed: int
    results: List[ScraperRunResult]
    sync_results: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class ConfigLoaderProtocol(Protocol):
    """Protocol for configuration loaders."""

    def load_all_configs(self) -> Dict[str, Any]: ...

    def load_config(self, org_id: str) -> Any: ...

    def get_enabled_orgs(self) -> List[Any]: ...


class SecureConfigScraperRunner:
    """Secure scraper runner with dependency injection."""

    def __init__(
        self,
        config_loader: Optional[ConfigLoaderProtocol] = None,
        scraper_loader: Optional[SecureScraperLoader] = None,
        sync_service: Optional[OrganizationSyncService] = None,
    ):
        """Initialize with injected dependencies."""
        self.config_loader = config_loader or ConfigLoader()
        self.scraper_loader = scraper_loader or SecureScraperLoader()
        self.sync_service = sync_service or create_default_sync_service()

    def list_available_scrapers(self) -> List[ScraperInfo]:
        """List all available scrapers from configs (pure function)."""
        configs = self.config_loader.load_all_configs()

        scrapers = []
        for config_id, config in configs.items():
            scraper_info = ScraperInfo(
                config_id=config_id,
                name=config.name,
                enabled=config.enabled,
                scraper_class=config.scraper.class_name,
                module=config.scraper.module,
                display_name=config.get_display_name(),
            )
            scrapers.append(scraper_info)

        return scrapers

    def validate_scraper_config(self, config_id: str) -> Tuple[bool, Optional[str]]:
        """Validate scraper configuration (pure function)."""
        try:
            config = self.config_loader.load_config(config_id)

            # Check if enabled
            if not config.is_enabled_for_scraping():
                return False, f"Organization '{config.get_display_name()}' is disabled"

            # Validate scraper module info
            module_info = ScraperModuleInfo(module_path=config.scraper.module, class_name=config.scraper.class_name)

            # Check if module is allowed
            if not self.scraper_loader.validate_module_path(module_info.module_path):
                return False, f"Module not allowed: {module_info.module_path}"

            # Check class name format
            if not self.scraper_loader.validate_class_name(module_info.class_name):
                return False, f"Invalid class name: {module_info.class_name}"

            return True, None

        except Exception as e:
            return False, f"Configuration validation error: {e}"

    def load_scraper_safely(self, config_id: str):
        """Load scraper with validation and error handling."""
        # Validate configuration first
        is_valid, error = self.validate_scraper_config(config_id)
        if not is_valid:
            raise ValueError(error)

        # Load configuration
        config = self.config_loader.load_config(config_id)

        # Create module info
        module_info = ScraperModuleInfo(module_path=config.scraper.module, class_name=config.scraper.class_name)

        # Load scraper class and create instance
        scraper = self.scraper_loader.create_scraper_instance(module_info, config_id)

        logger.info(f"Successfully loaded scraper for {config_id}")
        return scraper

    def ensure_organization_synced(self, config_id: str) -> int:
        """Ensure organization is synced to database."""
        config = self.config_loader.load_config(config_id)

        # Check if organization exists and get mapping
        mapping = self.sync_service.get_config_to_db_mapping()

        if config_id in mapping:
            return mapping[config_id]

        # Sync organization
        configs = {config_id: config}
        sync_result = self.sync_service.sync_all_organizations(configs)

        if not sync_result.success:
            raise RuntimeError(f"Failed to sync organization {config_id}: {sync_result.errors}")

        if config_id not in sync_result.org_mappings:
            raise RuntimeError(f"Organization {config_id} not found in sync results")

        return sync_result.org_mappings[config_id]

    def run_scraper(self, config_id: str, sync_first: bool = True) -> ScraperRunResult:
        """Run a specific scraper with error handling."""
        try:
            # Load configuration
            config = self.config_loader.load_config(config_id)

            # Early return if disabled
            if not config.is_enabled_for_scraping():
                return ScraperRunResult(
                    config_id=config_id,
                    success=False,
                    error=f"Organization '{config.get_display_name()}' is disabled",
                )

            # Ensure organization is synced if requested
            if sync_first:
                try:
                    self.ensure_organization_synced(config_id)
                except Exception as e:
                    return ScraperRunResult(
                        config_id=config_id,
                        success=False,
                        error=f"Organization sync failed: {e}",
                    )

            # Load scraper
            scraper = self.load_scraper_safely(config_id)

            # Run scraper
            success = scraper.run()

            if success:
                return ScraperRunResult(
                    config_id=config_id,
                    success=True,
                    organization=config.get_display_name(),
                    animals_found=getattr(scraper, "animals_found", 0),
                )
            else:
                return ScraperRunResult(
                    config_id=config_id,
                    success=False,
                    error="Scraper returned False (check logs for details)",
                )

        except Exception as e:
            logger.error(f"Error running scraper for {config_id}: {e}")
            return ScraperRunResult(config_id=config_id, success=False, error=str(e))

    def run_all_enabled_scrapers(self) -> BatchRunResult:
        """Run all enabled scrapers with comprehensive error handling."""
        try:
            # Get enabled organizations
            enabled_orgs = self.config_loader.get_enabled_orgs()

            # Early return if no enabled orgs
            if not enabled_orgs:
                return BatchRunResult(success=True, total_orgs=0, successful=0, failed=0, results=[])

            # Sync all organizations first
            configs = {org.id: org for org in enabled_orgs}
            sync_results = self.sync_service.sync_all_organizations(configs)

            # Run scrapers
            results = []
            for org_config in enabled_orgs:
                result = self.run_scraper(org_config.id, sync_first=False)
                results.append(result)

            # Calculate summary
            successful = sum(1 for r in results if r.success)
            failed = sum(1 for r in results if not r.success)

            return BatchRunResult(
                success=True,
                total_orgs=len(enabled_orgs),
                successful=successful,
                failed=failed,
                results=results,
                sync_results=sync_results.__dict__ if hasattr(sync_results, "__dict__") else None,
            )

        except Exception as e:
            logger.error(f"Error running all scrapers: {e}")
            return BatchRunResult(
                success=False,
                total_orgs=0,
                successful=0,
                failed=0,
                results=[],
                error=str(e),
            )

    def get_scraper_status(self, config_id: str) -> Dict[str, Any]:
        """Get status information for a scraper."""
        try:
            # Validate configuration
            is_valid, error = self.validate_scraper_config(config_id)

            if not is_valid:
                return {
                    "config_id": config_id,
                    "valid": False,
                    "error": error,
                    "can_run": False,
                }

            # Load configuration
            config = self.config_loader.load_config(config_id)

            # Check organization sync status
            mapping = self.sync_service.get_config_to_db_mapping()
            org_synced = config_id in mapping

            return {
                "config_id": config_id,
                "name": config.name,
                "enabled": config.enabled,
                "valid": True,
                "can_run": config.enabled and org_synced,
                "organization_synced": org_synced,
                "organization_db_id": mapping.get(config_id),
                "scraper_class": config.scraper.class_name,
                "scraper_module": config.scraper.module,
                "display_name": config.get_display_name(),
            }

        except Exception as e:
            logger.error(f"Error getting scraper status for {config_id}: {e}")
            return {
                "config_id": config_id,
                "valid": False,
                "error": str(e),
                "can_run": False,
            }

    def get_all_scraper_status(self) -> List[Dict[str, Any]]:
        """Get status for all scrapers."""
        scrapers = self.list_available_scrapers()
        return [self.get_scraper_status(scraper.config_id) for scraper in scrapers]


# Factory function for dependency injection
def create_secure_scraper_runner(
    config_loader: Optional[ConfigLoaderProtocol] = None,
    scraper_loader: Optional[SecureScraperLoader] = None,
    sync_service: Optional[OrganizationSyncService] = None,
) -> SecureConfigScraperRunner:
    """Create secure scraper runner with dependency injection."""
    return SecureConfigScraperRunner(config_loader, scraper_loader, sync_service)


# Convenience function for backward compatibility
def create_default_scraper_runner() -> SecureConfigScraperRunner:
    """Create scraper runner with default dependencies."""
    return create_secure_scraper_runner()


class ScraperRunError(Exception):
    """Raised when scraper run fails."""

    pass
