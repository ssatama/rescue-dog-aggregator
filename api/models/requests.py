# api/models/requests.py

"""
Request models for API endpoints.

This module contains Pydantic models for request parameters and filters.
"""

from typing import Optional, Union

from pydantic import BaseModel, Field, field_validator

from .dog import AnimalStatus, AvailabilityConfidence, StandardizedSize


class AnimalFilterRequest(BaseModel):
    """
    Request model for animal filtering parameters.

    Replaces the 19 individual parameters in get_animals() with a single
    well-validated object.
    """

    # Pagination
    limit: int = Field(default=20, ge=1, le=10000, description="Number of results to return")
    offset: int = Field(default=0, ge=0, description="Number of results to skip")

    # Search and basic filters
    search: Optional[str] = Field(default=None, description="Search in animal names and descriptions")
    animal_type: str = Field(default="dog", description="Type of animal to filter by")
    status: Union[AnimalStatus, str] = Field(default=AnimalStatus.AVAILABLE, description="Animal availability status or 'all'")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        """Validate status field, allowing 'all' as a special case."""
        if v == "all":
            return v
        # If it's already an AnimalStatus enum, return it
        if isinstance(v, AnimalStatus):
            return v
        # If it's a string, try to convert to AnimalStatus
        try:
            return AnimalStatus(v)
        except ValueError:
            raise ValueError(f"Invalid status value: {v}. Must be one of: {', '.join([s.value for s in AnimalStatus])} or 'all'")

    # Breed filters
    breed: Optional[str] = Field(default=None, description="Filter by exact breed name")
    standardized_breed: Optional[str] = Field(default=None, description="Filter by standardized breed")
    breed_group: Optional[str] = Field(default=None, description="Filter by breed group")

    # Physical characteristics
    sex: Optional[str] = Field(default=None, description="Filter by sex (male, female)")
    size: Optional[str] = Field(default=None, description="Filter by size")
    standardized_size: Optional[StandardizedSize] = Field(default=None, description="Filter by standardized size")
    age_category: Optional[str] = Field(default=None, description="Filter by age category")

    # Location filters
    location_country: Optional[str] = Field(default=None, description="Filter by country where animal is located")
    available_to_country: Optional[str] = Field(default=None, description="Filter by adoption destination country")
    available_to_region: Optional[str] = Field(default=None, description="Filter by adoption destination region")

    # Organization filter
    organization_id: Optional[int] = Field(default=None, description="Filter by specific organization")

    # Availability and confidence
    availability_confidence: str = Field(default="high,medium", description="Filter by availability confidence: 'high', 'medium', 'low', or 'all'")

    # Curation
    curation_type: str = Field(default="random", description="Curation type: 'recent' (last 7 days), 'recent_with_fallback' (recent or latest), 'diverse' (one per org), or 'random' (default)")

    @field_validator("curation_type")
    @classmethod
    def validate_curation_type(cls, v):
        """Validate curation_type field."""
        valid_types = ["recent", "recent_with_fallback", "diverse", "random"]
        if v not in valid_types:
            raise ValueError(f"Invalid curation_type: {v}. Must be one of: {', '.join(valid_types)}")
        return v

    def get_confidence_levels(self) -> list[str]:
        """Get parsed confidence levels from string."""
        if self.availability_confidence == "all":
            return []
        return [level.strip() for level in self.availability_confidence.split(",")]

    def needs_service_region_join(self) -> bool:
        """Check if query needs service_regions table join."""
        return bool(self.available_to_country or self.available_to_region)


class OrganizationFilterRequest(BaseModel):
    """Request model for organization filtering parameters."""

    limit: int = Field(default=20, ge=1, le=10000, description="Number of results to return")
    offset: int = Field(default=0, ge=0, description="Number of results to skip")
    search: Optional[str] = Field(default=None, description="Search in organization names")
    country: Optional[str] = Field(default=None, description="Filter by country")
    active_only: bool = Field(default=True, description="Only return active organizations")


class AnimalFilterCountRequest(BaseModel):
    """
    Request model for filter counts endpoint.

    Similar to AnimalFilterRequest but focused on getting counts for filter options
    based on current filter context.
    """

    # Search and basic filters (context for counting)
    search: Optional[str] = Field(default=None, description="Search context for counting")
    animal_type: str = Field(default="dog", description="Type of animal for counting")
    status: Union[AnimalStatus, str] = Field(default=AnimalStatus.AVAILABLE, description="Status context for counting")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        """Validate status field, allowing 'all' as a special case."""
        if v == "all":
            return v
        if isinstance(v, AnimalStatus):
            return v
        try:
            return AnimalStatus(v)
        except ValueError:
            raise ValueError(f"Invalid status value: {v}. Must be one of: {', '.join([s.value for s in AnimalStatus])} or 'all'")

    # Breed filters (context for counting)
    breed: Optional[str] = Field(default=None, description="Breed context for counting")
    standardized_breed: Optional[str] = Field(default=None, description="Standardized breed context for counting")
    breed_group: Optional[str] = Field(default=None, description="Breed group context for counting")

    # Physical characteristics (context for counting)
    sex: Optional[str] = Field(default=None, description="Sex context for counting")
    size: Optional[str] = Field(default=None, description="Size context for counting")
    standardized_size: Optional[StandardizedSize] = Field(default=None, description="Standardized size context for counting")
    age_category: Optional[str] = Field(default=None, description="Age category context for counting")

    # Location filters (context for counting)
    location_country: Optional[str] = Field(default=None, description="Location country context for counting")
    available_to_country: Optional[str] = Field(default=None, description="Available to country context for counting")
    available_to_region: Optional[str] = Field(default=None, description="Available to region context for counting")

    # Organization filter (context for counting)
    organization_id: Optional[int] = Field(default=None, description="Organization context for counting")

    # Availability and confidence (context for counting)
    availability_confidence: str = Field(default="high,medium", description="Availability confidence context for counting")

    def get_confidence_levels(self) -> list[str]:
        """Get parsed confidence levels from string."""
        if self.availability_confidence == "all":
            return []
        return [level.strip() for level in self.availability_confidence.split(",")]

    def needs_service_region_join(self) -> bool:
        """Check if query needs service_regions table join."""
        return bool(self.available_to_country or self.available_to_region)


class MonitoringFilterRequest(BaseModel):
    """Request model for monitoring endpoint parameters."""

    organization_id: Optional[int] = Field(default=None, description="Filter by specific organization")
    time_range_hours: int = Field(default=24, ge=1, le=168, description="Time range in hours")
    status_filter: Optional[str] = Field(default=None, description="Filter by status")
    include_details: bool = Field(default=False, description="Include detailed metrics")
