import logging
import importlib
from typing import List, Dict, Any, Optional

from utils.config_loader import ConfigLoader
from utils.org_sync import OrganizationSyncManager


class ConfigScraperRunner:
    """Manages running scrapers based on config files."""

    def __init__(self, config_loader: Optional[ConfigLoader] = None):
        """Initialize the scraper runner.

        Args:
            config_loader: ConfigLoader instance, creates new one if None
        """
        self.config_loader = config_loader or ConfigLoader()
        self.logger = logging.getLogger(__name__)

    def list_available_scrapers(self) -> List[Dict[str, Any]]:
        """List all available scrapers from configs.

        Returns:
            List of scraper information
        """
        configs = self.config_loader.load_all_configs()
        scrapers = []

        for config_id, config in configs.items():
            scrapers.append(
                {
                    "config_id": config_id,
                    "name": config.name,
                    "enabled": config.enabled,
                    "scraper_class": config.scraper.class_name,
                    "module": config.scraper.module,
                    "display_name": config.get_display_name(),
                }
            )

        return scrapers

    def _import_scraper_class(self, config):
        """Import scraper class from config.

        Args:
            config: OrganizationConfig object

        Returns:
            Scraper class

        Raises:
            ImportError: If module cannot be imported
            AttributeError: If class not found in module
        """
        try:
            module_path = config.get_full_module_path()
            module = importlib.import_module(module_path)
        except ImportError as e:
            raise ImportError(f"Failed to import scraper module '{module_path}': {e}")

        if not hasattr(module, config.scraper.class_name):
            raise AttributeError(
                f"Class {config.scraper.class_name} not found in module {module_path}"
            )

        return getattr(module, config.scraper.class_name)

    def _create_scraper_instance(self, scraper_class, config_id: str):
        """Create scraper instance with proper configuration.

        Args:
            scraper_class: The scraper class to instantiate
            config_id: Configuration ID for the scraper

        Returns:
            Instantiated scraper object
        """
        return scraper_class(config_id=config_id)

    def run_scraper(self, config_id: str, sync_first: bool = True) -> Dict[str, Any]:
        """Run a specific scraper by config ID.

        Args:
            config_id: Organization config ID
            sync_first: Whether to sync organization to DB first

        Returns:
            Dictionary with run results
        """
        try:
            # Load config
            config = self.config_loader.load_config(config_id)

            # Check if enabled
            if not config.is_enabled_for_scraping():
                return {
                    "success": False,
                    "config_id": config_id,
                    "error": f"Organization '{config.get_display_name()}' is disabled for scraping",
                }

            # Sync organization if requested
            if sync_first:
                sync_manager = OrganizationSyncManager(self.config_loader)
                org_id, created = sync_manager.sync_organization(config)

            # Import and create scraper
            scraper_class = self._import_scraper_class(config)
            scraper = self._create_scraper_instance(scraper_class, config_id)

            # Run scraper
            data = scraper.collect_data()

            return {
                "success": True,
                "config_id": config_id,
                "organization": config.get_display_name(),
                "animals_found": len(data) if data else 0,
            }

        except Exception as e:
            self.logger.error(f"Error running scraper for {config_id}: {e}")
            return {
                "success": False,
                "config_id": config_id,
                "error": str(e),
            }

    def run_all_enabled_scrapers(self) -> Dict[str, Any]:
        """Run all enabled scrapers.

        Returns:
            Dictionary with overall results
        """
        try:
            # Sync all organizations first
            sync_manager = OrganizationSyncManager(self.config_loader)
            sync_results = sync_manager.sync_all_organizations()

            # Get enabled organizations
            enabled_orgs = self.config_loader.get_enabled_orgs()

            if not enabled_orgs:
                return {
                    "success": True,
                    "total_orgs": 0,
                    "successful": 0,
                    "failed": 0,
                    "results": [],
                }

            results = []
            successful = 0
            failed = 0

            for org_config in enabled_orgs:
                result = self.run_scraper(org_config.id, sync_first=False)
                results.append(result)

                if result["success"]:
                    successful += 1
                else:
                    failed += 1

            return {
                "success": True,
                "total_orgs": len(enabled_orgs),
                "successful": successful,
                "failed": failed,
                "results": results,
                "sync_results": sync_results,
            }

        except Exception as e:
            self.logger.error(f"Error running all scrapers: {e}")
            return {"success": False, "error": str(e)}
