from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, field_validator, ConfigDict


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

    model_config = ConfigDict(str_strip_whitespace=True)

    website_url: Optional[str] = None
    description: Optional[str] = None
    contact: ContactInfo = ContactInfo()
    social_media: SocialMedia = SocialMedia()
    location: Location = Location()
    service_regions: Union[List[str], List[ServiceRegion]] = []  # Allow both formats

    @field_validator("service_regions")
    @classmethod
    def validate_service_regions(cls, v):
        """Validate and normalize service regions."""
        if not v:
            return []

        # If it's already a list of strings, return as is
        if isinstance(v[0], str):
            return v

        # If it's a list of ServiceRegion objects or dicts, flatten to strings
        flattened = []
        for region in v:
            if isinstance(region, dict):
                # Convert dict to ServiceRegion for validation
                service_region = ServiceRegion(**region)
                # Add all regions with country prefix
                for reg in service_region.regions:
                    flattened.append(f"{service_region.country}: {reg}")
            elif hasattr(region, "country") and hasattr(region, "regions"):
                # ServiceRegion object
                for reg in region.regions:
                    flattened.append(f"{region.country}: {reg}")
            else:
                # Assume it's a string
                flattened.append(str(region))

        return flattened


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

        # Use model_dump instead of deprecated dict()
        try:
            config_dict = self.scraper.config.model_dump(exclude_none=True)
        except AttributeError:
            # Fallback for older Pydantic versions
            config_dict = self.scraper.config.dict(exclude_none=True)

        return config_dict or {}

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
