"""
PhotoAnalysisResponse Pydantic model for Instagram photo quality analysis.

Following CLAUDE.md principles:
- Immutable data patterns
- Clear data contracts
- Type safety and validation
- Comprehensive validation rules
"""

from typing import List, Literal

from pydantic import BaseModel, Field, validator


class PhotoAnalysisResponse(BaseModel):
    """
    Response model for dog photo quality analysis.

    Scores each photo on 4 dimensions (1-10 scale):
    - quality_score: Technical image quality
    - visibility_score: How well the dog is visible
    - appeal_score: Emotional engagement
    - background_score: Background quality

    Overall score is the average of the 4 scores.
    IG-ready: True if overall_score >= 8.0
    """

    quality_score: int = Field(..., ge=1, le=10, description="Technical quality (1-10)")
    visibility_score: int = Field(..., ge=1, le=10, description="Dog visibility (1-10)")
    appeal_score: int = Field(..., ge=1, le=10, description="Emotional appeal (1-10)")
    background_score: int = Field(..., ge=1, le=10, description="Background quality (1-10)")
    overall_score: float = Field(..., description="Average of 4 scores")
    ig_ready: bool = Field(..., description="True if overall_score >= 8.0")
    confidence: Literal["low", "medium", "high"] = Field(..., description="Analysis confidence level")
    reasoning: str = Field(..., description="Explanation of the scores")
    flags: List[str] = Field(default_factory=list, description="Issues or notable features")

    @validator("overall_score")
    def validate_overall_score(cls, v, values):
        """Ensure overall_score equals the average of the 4 dimension scores."""
        quality = values.get("quality_score", 0)
        visibility = values.get("visibility_score", 0)
        appeal = values.get("appeal_score", 0)
        background = values.get("background_score", 0)

        expected = (quality + visibility + appeal + background) / 4.0

        # Allow small floating point tolerance
        if abs(v - expected) > 0.01:
            raise ValueError(f"overall_score {v} does not equal average {expected:.2f}")

        return v

    class Config:
        """Pydantic configuration."""

        # Ensure strict validation
        validate_assignment = True
