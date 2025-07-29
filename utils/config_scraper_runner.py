import logging
from typing import Any, Dict, List, Optional

from utils.config_loader import ConfigLoader
from utils.secure_config_scraper_runner import SecureConfigScraperRunner


class ConfigScraperRunner:
    """Manages running scrapers based on config files - now uses secure implementation."""

    def __init__(self, config_loader: Optional[ConfigLoader] = None):
        """Initialize the scraper runner.

        Args:
            config_loader: ConfigLoader instance, creates new one if None
        """
        self.config_loader = config_loader or ConfigLoader()
        self.logger = logging.getLogger(__name__)
        self._secure_runner = SecureConfigScraperRunner(config_loader)

    def list_available_scrapers(self) -> List[Dict[str, Any]]:
        """List all available scrapers from configs.

        Returns:
            List of scraper information
        """
        scrapers = self._secure_runner.list_available_scrapers()
        return [
            {
                "config_id": scraper.config_id,
                "name": scraper.name,
                "enabled": scraper.enabled,
                "scraper_class": scraper.scraper_class,
                "module": scraper.module,
                "display_name": scraper.display_name,
            }
            for scraper in scrapers
        ]

    def run_scraper(self, config_id: str) -> Dict[str, Any]:
        """Run a specific scraper.

        Args:
            config_id: The config ID of the scraper to run

        Returns:
            Dictionary with success status and message
        """
        result = self._secure_runner.run_scraper(config_id)
        return {
            "success": result.success,
            "config_id": result.config_id,
            "organization": result.organization,
            "animals_found": result.animals_found,
            "error": result.error,
        }

    def run_all_enabled_scrapers(self) -> Dict[str, Any]:
        """Run all enabled scrapers.

        Returns:
            Dictionary with batch run results
        """
        result = self._secure_runner.run_all_enabled_scrapers()
        return {
            "success": result.success,
            "total_orgs": result.total_orgs,
            "successful": result.successful,
            "failed": result.failed,
            "results": [
                {
                    "config_id": r.config_id,
                    "success": r.success,
                    "organization": r.organization,
                    "animals_found": r.animals_found,
                    "error": r.error,
                }
                for r in result.results
            ],
            "sync_results": result.sync_results,
            "error": result.error,
        }

    def get_scraper_status(self, config_id: str) -> Dict[str, Any]:
        """Get status information for a scraper.

        Args:
            config_id: The config ID of the scraper

        Returns:
            Dictionary with scraper status
        """
        return self._secure_runner.get_scraper_status(config_id)

    def get_all_scraper_status(self) -> List[Dict[str, Any]]:
        """Get status for all scrapers.

        Returns:
            List of scraper status dictionaries
        """
        return self._secure_runner.get_all_scraper_status()

    def load_scraper(self, config_id: str):
        """Load scraper instance for testing (delegates to secure runner).

        Args:
            config_id: The config ID of the scraper to load

        Returns:
            Scraper instance
        """
        return self._secure_runner.load_scraper_safely(config_id)
