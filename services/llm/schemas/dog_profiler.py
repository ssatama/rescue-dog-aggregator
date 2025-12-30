"""
Enhanced DogProfilerData schema for comprehensive dog profiles.

Following CLAUDE.md principles:
- Immutable data patterns
- Clear data contracts
- Type safety and validation
- Comprehensive metadata tracking
"""

from datetime import datetime
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class DogProfilerData(BaseModel):
    """
    Comprehensive dog profile for all touchpoints.

    This enhanced schema provides:
    - Rich personality and behavioral data
    - Compatibility information
    - Living requirements
    - Care needs
    - Metadata for transparency and quality tracking
    """

    # ===== CORE DESCRIPTION =====
    description: str = Field(
        ...,
        min_length=150,
        max_length=500,
        description="Engaging English description of the dog",
    )
    tagline: str = Field(
        ..., max_length=150, description="Catchy hook for the dog's profile"
    )

    # ===== BEHAVIORAL TRAITS =====
    energy_level: Literal["low", "medium", "high", "very_high"] = Field(
        ..., description="Dog's typical energy level"
    )
    trainability: Literal["easy", "moderate", "challenging", "very_challenging"] = (
        Field(..., description="How easily the dog can be trained")
    )
    sociability: Literal[
        "very_social", "social", "selective", "independent", "needs_work"
    ] = Field(..., description="Dog's social tendencies")
    confidence: Literal[
        "very_confident", "confident", "moderate", "shy", "very_shy"
    ] = Field(..., description="Dog's confidence level")

    # ===== COMPATIBILITY =====
    good_with_dogs: Optional[Literal["yes", "no", "selective", "unknown"]] = Field(
        None, description="Compatibility with other dogs"
    )
    good_with_cats: Optional[Literal["yes", "no", "with_training", "unknown"]] = Field(
        None, description="Compatibility with cats"
    )
    good_with_children: Optional[Literal["yes", "older_children", "no", "unknown"]] = (
        Field(None, description="Compatibility with children")
    )

    # ===== LIVING REQUIREMENTS =====
    home_type: Literal[
        "apartment_ok", "house_preferred", "house_required", "farm_only"
    ] = Field(..., description="Suitable home environment")
    yard_required: bool = Field(..., description="Whether a yard is necessary")
    experience_level: Literal[
        "first_time_ok", "some_experience", "experienced_only"
    ] = Field(..., description="Required owner experience level")
    exercise_needs: Literal["minimal", "moderate", "high", "very_high"] = Field(
        ..., description="Daily exercise requirements"
    )

    # ===== CARE NEEDS =====
    grooming_needs: Literal["minimal", "weekly", "frequent", "professional"] = Field(
        ..., description="Grooming requirements"
    )
    medical_needs: Optional[str] = Field(
        None, max_length=250, description="Any ongoing medical conditions or needs"
    )
    special_needs: Optional[str] = Field(
        None, max_length=250, description="Any special requirements or considerations"
    )

    # ===== PERSONALITY =====
    personality_traits: List[str] = Field(
        ..., min_items=3, max_items=5, description="Key personality characteristics"
    )
    favorite_activities: List[str] = Field(
        ..., min_items=2, max_items=4, description="Things the dog enjoys doing"
    )
    unique_quirk: Optional[str] = Field(
        None, max_length=200, description="A unique or endearing trait"
    )

    # ===== ADOPTION INFO =====
    adoption_fee_euros: Optional[int] = Field(
        None, ge=0, le=2000, description="Adoption fee in euros"
    )
    ready_to_travel: bool = Field(
        ..., description="Whether dog can be transported internationally"
    )
    vaccinated: bool = Field(..., description="Current vaccination status")
    neutered: bool = Field(..., description="Spay/neuter status")

    # ===== METADATA (Critical for transparency) =====
    profiler_version: str = Field(
        default="1.0.0", description="Version of the profiler system"
    )
    profiled_at: datetime = Field(
        default_factory=datetime.utcnow, description="When the profile was generated"
    )
    processing_time_ms: int = Field(..., description="Time taken to generate profile")
    confidence_scores: Dict[str, float] = Field(
        ..., description="Field-level confidence scores (0.0-1.0)"
    )
    source_references: Dict[str, str] = Field(
        ..., description="Which German text mapped to which field"
    )
    prompt_version: str = Field(..., description="Version of the prompt used")
    model_used: Optional[str] = Field(
        None, description="Which LLM model was selected by Auto Router"
    )

    # ===== VALIDATORS =====

    @field_validator("personality_traits", "favorite_activities")
    @classmethod
    def validate_list_items(cls, v: List[str]) -> List[str]:
        """Ensure list items are non-empty strings."""
        if not v:
            return v
        return [item.strip() for item in v if item and item.strip()]

    @field_validator("description")
    @classmethod
    def validate_description_quality(cls, v: str) -> str:
        """Ensure description is engaging and complete."""
        if not v:
            raise ValueError("Description is required")

        # Check for placeholder text
        if any(
            placeholder in v.lower() for placeholder in ["lorem ipsum", "todo", "tbd"]
        ):
            raise ValueError("Description contains placeholder text")

        # Check for minimum word count (roughly 25-60 words for 150-400 chars)
        word_count = len(v.split())
        if word_count < 20:
            raise ValueError(f"Description too short: {word_count} words (minimum 20)")

        return v

    @field_validator("confidence_scores")
    @classmethod
    def validate_confidence_scores(cls, v: Dict[str, float]) -> Dict[str, float]:
        """Ensure confidence scores are valid probabilities."""
        if not v:
            raise ValueError("Confidence scores are required")

        for field, score in v.items():
            if not 0.0 <= score <= 1.0:
                raise ValueError(f"Invalid confidence score for {field}: {score}")

        # Ensure critical fields have confidence scores
        required_fields = ["description", "energy_level", "trainability"]
        for field in required_fields:
            if field not in v:
                raise ValueError(
                    f"Missing confidence score for required field: {field}"
                )

        return v

    @field_validator("source_references")
    @classmethod
    def validate_source_references(cls, v: Dict[str, str]) -> Dict[str, str]:
        """Ensure source references prevent hallucination."""
        if not v:
            raise ValueError("Source references are required for transparency")

        # At minimum, we need references for core fields
        required_refs = ["description", "personality_traits"]
        for field in required_refs:
            if field not in v:
                raise ValueError(f"Missing source reference for: {field}")

        return v

    model_config = ConfigDict(
        use_enum_values=True,
        json_schema_extra={
            "example": {
                "description": "Max is a loyal companion with a heart of gold. This lovable 3-year-old German Shepherd mix combines intelligence with a calm demeanor, making him perfect for families. He's mastered basic commands and is eager to learn more, always looking to please his humans with his attentive nature.",
                "tagline": "Loyal companion seeking loving family",
                "energy_level": "medium",
                "trainability": "easy",
                "sociability": "very_social",
                "confidence": "confident",
                "good_with_dogs": "yes",
                "good_with_cats": "unknown",
                "good_with_children": "older_children",
                "home_type": "house_preferred",
                "yard_required": True,
                "experience_level": "some_experience",
                "exercise_needs": "moderate",
                "grooming_needs": "weekly",
                "medical_needs": None,
                "special_needs": None,
                "personality_traits": ["loyal", "intelligent", "calm", "attentive"],
                "favorite_activities": ["walks", "fetch", "cuddles"],
                "unique_quirk": "Carries his favorite toy everywhere",
                "adoption_fee_euros": 350,
                "ready_to_travel": True,
                "vaccinated": True,
                "neutered": True,
                "profiler_version": "1.0.0",
                "profiled_at": "2025-01-19T12:00:00Z",
                "processing_time_ms": 1250,
                "confidence_scores": {
                    "description": 0.95,
                    "energy_level": 0.88,
                    "trainability": 0.92,
                    "personality_traits": 0.90,
                },
                "source_references": {
                    "description": "ruhiger Schäferhund-Mix, 3 Jahre alt, sehr lieb",
                    "personality_traits": "intelligent, gelehrig, anhänglich",
                    "good_with_dogs": "verträglich mit anderen Hunden",
                },
                "prompt_version": "1.0.0",
                "model_used": "google/gemini-3-flash-preview",
            }
        },
    )
