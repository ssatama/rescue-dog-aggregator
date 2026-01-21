# api/models/responses.py

"""
Response models for API endpoints.

This module contains Pydantic models for API response structures.
"""

from pydantic import BaseModel, ConfigDict, Field


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

    size_options: list[FilterOption] = Field(default_factory=list, description="Available size options with counts")
    age_options: list[FilterOption] = Field(default_factory=list, description="Available age options with counts")
    sex_options: list[FilterOption] = Field(default_factory=list, description="Available sex options with counts")
    breed_options: list[FilterOption] = Field(default_factory=list, description="Available breed options with counts")
    organization_options: list[FilterOption] = Field(default_factory=list, description="Available organization options with counts")
    location_country_options: list[FilterOption] = Field(
        default_factory=list,
        description="Available location country options with counts",
    )
    available_country_options: list[FilterOption] = Field(
        default_factory=list,
        description="Available adoption country options with counts",
    )
    available_region_options: list[FilterOption] = Field(
        default_factory=list,
        description="Available adoption region options with counts",
    )

    model_config = ConfigDict(
        # Add custom encoders if needed in the future
        # json_encoders can be replaced with custom serializers in v2
    )


class BreedGroupStats(BaseModel):
    """Model for breed group statistics."""

    name: str = Field(..., description="Breed group name")
    count: int = Field(..., description="Number of dogs in this breed group", ge=0)


class AgeDistribution(BaseModel):
    """Model for age distribution of a breed."""

    puppy: int = Field(..., description="Number of puppies (< 12 months)", ge=0)
    young: int = Field(..., description="Number of young dogs (12-36 months)", ge=0)
    adult: int = Field(..., description="Number of adult dogs (36-96 months)", ge=0)
    senior: int = Field(..., description="Number of senior dogs (96+ months)", ge=0)


class SizeDistribution(BaseModel):
    """Model for size distribution of a breed."""

    tiny: int = Field(..., description="Number of tiny dogs", ge=0)
    small: int = Field(..., description="Number of small dogs", ge=0)
    medium: int = Field(..., description="Number of medium dogs", ge=0)
    large: int = Field(..., description="Number of large dogs", ge=0)
    xlarge: int = Field(..., description="Number of extra large dogs", ge=0)


class ExperienceDistribution(BaseModel):
    """Model for experience level distribution of a breed."""

    first_time_ok: int = Field(..., description="Number suitable for first-time owners", ge=0)
    some_experience: int = Field(..., description="Number requiring some experience", ge=0)
    experienced: int = Field(..., description="Number requiring experienced owners", ge=0)


class SexDistribution(BaseModel):
    """Model for sex distribution of a breed."""

    male: int = Field(..., description="Number of male dogs", ge=0)
    female: int = Field(..., description="Number of female dogs", ge=0)


class PersonalityMetric(BaseModel):
    """Model for a single personality metric with percentage and label."""

    percentage: int = Field(..., description="Percentage value (0-100)", ge=0, le=100)
    label: str = Field(..., description="Human-readable label for the percentage")


class PersonalityMetrics(BaseModel):
    """Model for personality metrics from dog_profiler_data aggregation."""

    energy_level: PersonalityMetric = Field(..., description="Energy level metric")
    affection: PersonalityMetric = Field(..., description="Affection/sociability metric")
    trainability: PersonalityMetric = Field(..., description="Trainability metric")
    independence: PersonalityMetric = Field(..., description="Independence metric")


class QualifyingBreed(BaseModel):
    """Model for a qualifying breed with detailed statistics."""

    primary_breed: str = Field(..., description="Primary breed name")
    breed_slug: str = Field(..., description="URL-friendly breed slug")
    breed_type: str | None = Field(
        None,
        description="Breed type (purebred, mixed, crossbreed, unknown, sighthound)",
    )
    breed_group: str | None = Field(None, description="Breed group classification")
    count: int = Field(..., description="Total number of dogs of this breed", ge=0)
    average_age_months: int | None = Field(None, description="Average age in months for this breed")
    organization_count: int = Field(..., description="Number of organizations with this breed", ge=0)
    organizations: list[str] = Field(default_factory=list, description="List of organization names (top 5)")
    age_distribution: AgeDistribution = Field(..., description="Age distribution for this breed")
    size_distribution: SizeDistribution = Field(..., description="Size distribution for this breed")
    sex_distribution: SexDistribution | None = Field(None, description="Sex distribution for this breed")
    personality_traits: list[str] = Field(default_factory=list, description="Top 5 personality traits from LLM analysis")
    experience_distribution: ExperienceDistribution = Field(..., description="Experience level distribution for this breed")
    personality_metrics: PersonalityMetrics | None = Field(None, description="Personality metrics from dog_profiler_data aggregation")


class BreedStatsResponse(BaseModel):
    """
    Response model for breed statistics endpoint.

    Provides comprehensive breed statistics including total counts,
    breed group distribution, and detailed information for qualifying breeds.
    """

    total_dogs: int = Field(..., description="Total number of available dogs", ge=0)
    unique_breeds: int = Field(..., description="Number of unique breeds", ge=0)
    breed_groups: list[BreedGroupStats] = Field(default_factory=list, description="Distribution of dogs by breed group")
    qualifying_breeds: list[QualifyingBreed] = Field(default_factory=list, description="Breeds with 15+ dogs")
    purebred_count: int = Field(default=0, description="Number of purebred dogs", ge=0)
    crossbreed_count: int = Field(default=0, description="Number of crossbreed dogs", ge=0)
