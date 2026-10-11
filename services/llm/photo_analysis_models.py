"""
PhotoAnalysisResponse Pydantic model for Instagram photo quality analysis.

Following CLAUDE.md principles:
- Immutable data patterns
- Clear data contracts
- Type safety and validation
- Comprehensive validation rules
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


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
    flags: list[str] = Field(default_factory=list, description="Issues or notable features")

    @model_validator(mode="before")
    @classmethod
    def compute_overall_score(cls, data: dict) -> dict:
        """overall_score and ig_ready are arithmetic, so they are computed here
        rather than asked of the model; any values the model sends are replaced."""
        if not isinstance(data, dict):
            return data
        try:
            scores = [float(data[k]) for k in ("quality_score", "visibility_score", "appeal_score", "background_score")]
        except (KeyError, TypeError, ValueError):
            return data  # field validation reports the bad or missing score
        overall = sum(scores) / 4.0
        return {**data, "overall_score": overall, "ig_ready": overall >= 8.0}

    model_config = ConfigDict(validate_assignment=True)
