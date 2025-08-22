# api/models/dog.py

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator, model_validator

from api.models.organization import Organization


class AnimalStatus(str, Enum):
    """Valid animal status values."""

    AVAILABLE = "available"
    ADOPTED = "adopted"
    PENDING = "pending"
    RESERVED = "reserved"
    UNAVAILABLE = "unavailable"


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
    breed: Optional[str] = None
    standardized_breed: Optional[str] = None
    breed_group: Optional[str] = None
    age_text: Optional[str] = None
    age_min_months: Optional[int] = None
    age_max_months: Optional[int] = None
    sex: Optional[str] = None
    size: Optional[str] = None
    standardized_size: Optional[StandardizedSize] = None
    status: AnimalStatus = AnimalStatus.AVAILABLE
    primary_image_url: Optional[HttpUrl] = None
    adoption_url: HttpUrl

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
    external_id: Optional[str] = None
    language: str = "en"
    properties: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
    last_scraped_at: Optional[datetime] = None
    availability_confidence: Optional[AvailabilityConfidence] = AvailabilityConfidence.HIGH
    last_seen_at: Optional[datetime] = None
    consecutive_scrapes_missing: Optional[int] = 0
    dog_profiler_data: Optional[Dict[str, Any]] = Field(default_factory=dict)
    organization: Optional[Organization] = None


class AnimalFilter(BaseModel):
    """Schema for filtering animals."""

    animal_type: Optional[str] = "dog"
    breed: Optional[str] = None
    standardized_breed: Optional[str] = None
    sex: Optional[str] = None
    size: Optional[str] = None
    standardized_size: Optional[str] = None
    status: Optional[str] = None
    organization_id: Optional[int] = None


class PaginationParams(BaseModel):
    """Schema for pagination parameters."""

    page: int = 1
    limit: int = 20
