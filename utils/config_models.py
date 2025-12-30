from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, field_validator


class ServiceRegion(BaseModel):
    """Service region configuration."""

    model_config = ConfigDict(str_strip_whitespace=True)

    country: str
    regions: List[str]


class ContactInfo(BaseModel):
    """Contact information for an organization."""

    model_config = ConfigDict(str_strip_whitespace=True)

    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None


class SocialMedia(BaseModel):
    """Social media links for an organization."""

    model_config = ConfigDict(str_strip_whitespace=True)

    facebook: Optional[str] = None
    instagram: Optional[str] = None
    twitter: Optional[str] = None
    youtube: Optional[str] = None
    linkedin: Optional[str] = None
    website: Optional[str] = None


class Location(BaseModel):
    """Location information for an organization."""

    model_config = ConfigDict(str_strip_whitespace=True)

    country: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None


class OrganizationMetadata(BaseModel):
    """Metadata for an organization."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="allow")

    website_url: Optional[str] = None
    description: Optional[str] = None
    contact: ContactInfo = ContactInfo()
    social_media: SocialMedia = SocialMedia()
    location: Location = Location()
    service_regions: List[str] = []  # Simplified to just country codes
    ships_to: List[str] = []  # Countries where they ship animals
    established_year: Optional[int] = None
    logo_url: Optional[str] = None

    @field_validator("service_regions")
    @classmethod
    def validate_service_regions(cls, v):
        """Validate service regions are valid country codes."""
        if not v:
            return []

        validated = []
        for region in v:
            if isinstance(region, str):
                # Ensure it's a valid 2-character country code
                region = region.strip().upper()
                if len(region) == 2 and region.isalpha():
                    validated.append(region)
                else:
                    raise ValueError(
                        f"Invalid country code in service_regions: {region}"
                    )
            else:
                raise ValueError(
                    f"service_regions must contain only country codes, got: {type(region)}"
                )

        return validated

    @field_validator("ships_to")
    @classmethod
    def validate_ships_to(cls, v):
        """Validate ships_to are valid country codes."""
        if not v:
            return []

        validated = []
        for country in v:
            if isinstance(country, str):
                # Ensure it's a valid 2-character country code
                country = country.strip().upper()
                if len(country) == 2 and country.isalpha():
                    validated.append(country)
                else:
                    raise ValueError(f"Invalid country code in ships_to: {country}")
            else:
                raise ValueError(
                    f"ships_to must contain only country codes, got: {type(country)}"
                )

        return validated

    @field_validator("established_year")
    @classmethod
    def validate_established_year(cls, v):
        """Validate established year is reasonable."""
        if v is None:
            return v

        if not isinstance(v, int):
            raise ValueError("established_year must be an integer")

        if v < 1900 or v > 2030:
            raise ValueError("established_year must be between 1900 and 2030")

        return v


class ScraperConfig(BaseModel):
    """Configuration for scraper behavior."""

    model_config = ConfigDict(extra="allow")  # Allow additional fields

    rate_limit_delay: Optional[float] = None
    max_retries: Optional[int] = None
    timeout: Optional[int] = None


class ScraperInfo(BaseModel):
    """Scraper information and configuration."""

    model_config = ConfigDict(str_strip_whitespace=True)

    class_name: str
    module: str
    config: Optional[ScraperConfig] = ScraperConfig()

    @field_validator("class_name")
    @classmethod
    def validate_class_name(cls, v):
        """Validate class name is not empty."""
        if not v or not v.strip():
            raise ValueError("Class name cannot be empty")
        return v.strip()

    @field_validator("module")
    @classmethod
    def validate_module(cls, v):
        """Validate module name is not empty."""
        if not v or not v.strip():
            raise ValueError("Module name cannot be empty")
        return v.strip()


class OrganizationConfig(BaseModel):
    """Complete organization configuration."""

    model_config = ConfigDict(str_strip_whitespace=True)

    schema_version: str = "1.0"
    id: str
    name: str
    enabled: bool = True
    scraper: ScraperInfo
    metadata: OrganizationMetadata = OrganizationMetadata()

    @field_validator("id")
    @classmethod
    def validate_id(cls, v):
        """Validate organization ID format."""
        if not v or not v.strip():
            raise ValueError("Organization ID cannot be empty")
        return v.strip()

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        """Validate organization name is not empty."""
        if not v or not v.strip():
            raise ValueError("Organization name cannot be empty")
        return v.strip()

    @field_validator("scraper")
    @classmethod
    def validate_scraper(cls, v):
        """Validate scraper configuration."""
        if not v:
            raise ValueError("Scraper configuration is required")
        return v

    def get_scraper_config_dict(self) -> Dict[str, Any]:
        """Get scraper configuration as a dictionary.

        Returns:
            Dictionary of scraper configuration
        """
        if not self.scraper.config:
            return {}

        # Use model_dump (Pydantic v2)
        config_dict = self.scraper.config.model_dump(exclude_none=True)

        return config_dict or {}

    def get_adoption_check_config(self) -> Optional[Dict[str, Any]]:
        """Get adoption checking configuration.

        Returns:
            Dictionary with adoption checking configuration or None if not configured
        """
        scraper_config = self.get_scraper_config_dict()

        # Check if adoption checking is enabled
        if not scraper_config.get("check_adoption_status", False):
            return None

        # Return adoption configuration
        return {
            "enabled": True,
            "threshold": scraper_config.get("adoption_check_threshold", 3),
            "max_checks_per_run": scraper_config.get("adoption_check_config", {}).get(
                "max_checks_per_run", 50
            ),
            "check_interval_hours": scraper_config.get("adoption_check_config", {}).get(
                "check_interval_hours", 24
            ),
        }

    def get_display_name(self) -> str:
        """Get display name for the organization.

        Returns:
            Formatted display name
        """
        return f"{self.name} ({self.id})"

    def get_full_module_path(self) -> str:
        """Get the full module path for the scraper.

        Returns:
            Full module path (e.g., 'scrapers.pets_in_turkey.dogs_scraper')
        """
        return f"scrapers.{self.scraper.module}"

    def is_enabled_for_scraping(self) -> bool:
        """Check if organization is enabled for scraping.

        Returns:
            True if enabled, False otherwise
        """
        return self.enabled

    def validate_business_rules(self) -> List[str]:
        """Validate business rules and return warnings.

        Returns:
            List of warning messages
        """
        warnings = []

        # Check for missing optional but recommended fields
        if not self.metadata.website_url:
            warnings.append("Missing website URL")

        if not self.metadata.description:
            warnings.append("Missing organization description")

        if not self.metadata.contact.email:
            warnings.append("Missing contact email")

        if not self.metadata.location.country:
            warnings.append("Missing country information")

        return warnings
