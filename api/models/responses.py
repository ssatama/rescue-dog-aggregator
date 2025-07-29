# api/models/responses.py

"""
Response models for API endpoints.

This module contains Pydantic models for API response structures.
"""

from typing import List

from pydantic import BaseModel, Field


class FilterOption(BaseModel):
    """
    Model for a single filter option with count.

    Used in filter counts response to show each available option
    along with how many animals match that option.
    """

    value: str = Field(..., description="The filter value (e.g., 'Large', 'Puppy')")
    label: str = Field(..., description="Human-readable label for the option")
    count: int = Field(..., description="Number of animals matching this option", ge=0)


class FilterCountsResponse(BaseModel):
    """
    Response model for filter counts endpoint.

    Provides counts for each filter option based on current filter context.
    Only includes options that have at least one matching animal.
    """

    size_options: List[FilterOption] = Field(default_factory=list, description="Available size options with counts")
    age_options: List[FilterOption] = Field(default_factory=list, description="Available age options with counts")
    sex_options: List[FilterOption] = Field(default_factory=list, description="Available sex options with counts")
    breed_options: List[FilterOption] = Field(default_factory=list, description="Available breed options with counts")
    organization_options: List[FilterOption] = Field(default_factory=list, description="Available organization options with counts")
    location_country_options: List[FilterOption] = Field(default_factory=list, description="Available location country options with counts")
    available_country_options: List[FilterOption] = Field(default_factory=list, description="Available adoption country options with counts")
    available_region_options: List[FilterOption] = Field(default_factory=list, description="Available adoption region options with counts")

    class Config:
        """Pydantic configuration."""

        json_encoders = {
            # Add custom encoders if needed
        }
