# api/models/dog.py

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    HttpUrl,
    field_validator,
    model_validator,
)

from api.models.organization import Organization


class AnimalStatus(str, Enum):
    """Valid animal status values."""

    AVAILABLE = "available"
    ADOPTED = "adopted"
    PENDING = "pending"
    RESERVED = "reserved"
    UNKNOWN = "unknown"


class AvailabilityConfidence(str, Enum):
    """Valid availability confidence levels."""

    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class StandardizedSize(str, Enum):
    """Valid standardized size categories."""

    TINY = "Tiny"
    SMALL = "Small"
    MEDIUM = "Medium"
    LARGE = "Large"
    XLARGE = "XLarge"


class AnimalBase(BaseModel):
    """Base schema with common animal attributes."""

    model_config = ConfigDict(str_strip_whitespace=True)

    name: str
    animal_type: str = "dog"
    breed: str | None = None
    standardized_breed: str | None = None
    breed_group: str | None = None
    primary_breed: str | None = None
    breed_type: str | None = None
    breed_confidence: str | None = None
    secondary_breed: str | None = None
    breed_slug: str | None = None
    age_text: str | None = None
    age_min_months: int | None = None
    age_max_months: int | None = None
    sex: str | None = None
    size: str | None = None
    standardized_size: StandardizedSize | None = None
    status: AnimalStatus = AnimalStatus.AVAILABLE
    primary_image_url: HttpUrl | None = None
    adoption_url: HttpUrl

    @field_validator("primary_image_url", "adoption_url", mode="before")
    @classmethod
    def normalize_protocol_relative_urls(cls, v):
        """Normalize protocol-relative URLs (//example.com) to HTTPS."""
        if isinstance(v, str) and v.startswith("//"):
            return "https:" + v
        return v

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        """Validate and clean name field."""
        if not v or not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip()

    @field_validator("breed", "age_text", "sex", "size")
    @classmethod
    def validate_string_fields(cls, v):
        """Validate and clean string fields."""
        return v.strip() if v else v

    @model_validator(mode="after")
    def validate_age_range(self):
        """Validate that age_min_months <= age_max_months."""
        if self.age_min_months is not None and self.age_max_months is not None:
            if self.age_min_months > self.age_max_months:
                raise ValueError("age_min_months must be <= age_max_months")
        return self


class Animal(AnimalBase):
    """Complete animal schema including database fields."""

    id: int
    slug: str
    organization_id: int
    external_id: str | None = None
    language: str = "en"
    properties: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
    last_scraped_at: datetime | None = None
    availability_confidence: AvailabilityConfidence | None = AvailabilityConfidence.HIGH
    last_seen_at: datetime | None = None
    consecutive_scrapes_missing: int | None = 0
    dog_profiler_data: dict[str, Any] | None = Field(default_factory=dict)
    breed_slug: str | None = None
    organization: Organization | None = None
    adoption_check_data: dict[str, Any] | None = None


class AnimalFilter(BaseModel):
    """Schema for filtering animals."""

    animal_type: str | None = "dog"
    breed: str | None = None
    standardized_breed: str | None = None
    sex: str | None = None
    size: str | None = None
    standardized_size: str | None = None
    status: str | None = None
    organization_id: int | None = None
    primary_breed: str | None = None
    breed_type: str | None = None


class PaginationParams(BaseModel):
    """Schema for pagination parameters."""

    page: int = 1
    limit: int = 20
