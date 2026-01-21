# api/models/organization.py

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator


class Organization(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="ignore")
    id: int
    name: str
    slug: str

    website_url: HttpUrl | None = None
    description: str | None = None
    country: str | None = None
    city: str | None = None
    logo_url: HttpUrl | None = None
    active: bool | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    # Enhanced fields for organization profiles
    social_media: dict[str, str] = Field(default_factory=dict)
    ships_to: list[str] = Field(default_factory=list)
    established_year: int | None = None

    # Enhanced card fields
    service_regions: list[str] = Field(default_factory=list)
    total_dogs: int | None = None
    new_this_week: int | None = None
    recent_dogs: list[dict[str, Any]] = Field(default_factory=list)

    # Adoption fees for dynamic pricing
    adoption_fees: dict[str, Any] = Field(default_factory=dict)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        """Validate and clean organization name."""
        if not v or not v.strip():
            raise ValueError("Organization name cannot be empty")
        return v.strip()

    @field_validator("description", "country", "city")
    @classmethod
    def validate_string_fields(cls, v):
        """Validate and clean string fields."""
        return v.strip() if v else v

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
