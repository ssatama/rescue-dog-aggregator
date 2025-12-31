"""ScraperConfig dataclass for centralized scraper configuration."""

from dataclasses import asdict, dataclass
from typing import Any, Dict, Optional


@dataclass(frozen=True)
class ScraperConfig:
    """Immutable configuration for scraper initialization.

    Centralizes the ~50 lines of __init__ parameter handling from BaseScraper
    into a clean, testable dataclass.
    """

    organization_id: int
    organization_name: str
    rate_limit_delay: float = 1.0
    max_retries: int = 3
    timeout: int = 30
    retry_backoff_factor: float = 2.0
    batch_size: int = 6
    skip_existing_animals: bool = False

    @classmethod
    def from_config_id(cls, config_id: str) -> "ScraperConfig":
        """Create ScraperConfig from a YAML config file ID.

        Args:
            config_id: The organization config ID (e.g., "dogstrust", "rean")

        Returns:
            ScraperConfig populated from the YAML configuration

        Raises:
            ValueError: If config_id is not found
        """
        from utils.config_loader import ConfigLoader, ConfigLoadError

        config_loader = ConfigLoader()
        try:
            org_config = config_loader.load_config(config_id)
        except ConfigLoadError as e:
            raise ValueError(f"Config not found: {config_id}") from e

        scraper_settings = org_config.get_scraper_config_dict()

        return cls(
            organization_id=0,
            organization_name=org_config.name,
            rate_limit_delay=scraper_settings.get("rate_limit_delay", 1.0),
            max_retries=scraper_settings.get("max_retries", 3),
            timeout=scraper_settings.get("timeout", 30),
            retry_backoff_factor=scraper_settings.get("retry_backoff_factor", 2.0),
            batch_size=scraper_settings.get("batch_size", 6),
            skip_existing_animals=scraper_settings.get("skip_existing_animals", False),
        )

    @classmethod
    def from_organization_id(
        cls,
        org_id: int,
        organization_name: Optional[str] = None,
        rate_limit_delay: float = 1.0,
        max_retries: int = 3,
        timeout: int = 30,
        retry_backoff_factor: float = 2.0,
        batch_size: int = 6,
        skip_existing_animals: bool = False,
    ) -> "ScraperConfig":
        """Create ScraperConfig from a database organization ID.

        This is the legacy mode for scrapers that don't use YAML configs.

        Args:
            org_id: Database organization ID
            organization_name: Optional name (defaults to "Organization ID {id}")
            rate_limit_delay: Delay between requests in seconds
            max_retries: Maximum retry attempts
            timeout: Request timeout in seconds
            retry_backoff_factor: Multiplier for exponential backoff
            batch_size: Number of items to process per batch
            skip_existing_animals: Whether to skip already-saved animals

        Returns:
            ScraperConfig with specified or default values
        """
        name = organization_name or f"Organization ID {org_id}"

        return cls(
            organization_id=org_id,
            organization_name=name,
            rate_limit_delay=rate_limit_delay,
            max_retries=max_retries,
            timeout=timeout,
            retry_backoff_factor=retry_backoff_factor,
            batch_size=batch_size,
            skip_existing_animals=skip_existing_animals,
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert config to dictionary.

        Returns:
            Dictionary representation of all config fields
        """
        return asdict(self)
