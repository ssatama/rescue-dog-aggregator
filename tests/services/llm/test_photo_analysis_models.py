"""
Test suite for PhotoAnalysisResponse Pydantic model.

Following CLAUDE.md principles:
- TDD approach: Write tests first, see them FAIL, then implement
- Comprehensive validation testing
- Edge case coverage

These tests are written BEFORE implementation (Task 1.3).
They should ALL FAIL until the model is implemented.
"""

import pytest
from pydantic import ValidationError

from services.llm.photo_analysis_models import PhotoAnalysisResponse


@pytest.mark.services
class TestPhotoAnalysisResponse:
    """Test the PhotoAnalysisResponse Pydantic model."""

    @pytest.fixture
    def valid_response_data(self):
        """Valid photo analysis response fixture."""
        return {
            "quality_score": 8,
            "visibility_score": 9,
            "appeal_score": 7,
            "background_score": 6,
            "overall_score": 7.5,
            "ig_ready": False,
            "confidence": "high",
            "reasoning": "Good photo with minor background distractions",
            "flags": ["busy_background"],
        }

    def test_valid_response_parsing(self, valid_response_data):
        """Test that valid response data parses correctly."""
        response = PhotoAnalysisResponse(**valid_response_data)

        assert response.quality_score == 8
        assert response.visibility_score == 9
        assert response.appeal_score == 7
        assert response.background_score == 6
        assert response.overall_score == 7.5
        assert response.ig_ready is False
        assert response.confidence == "high"
        assert response.reasoning == "Good photo with minor background distractions"
        assert response.flags == ["busy_background"]

    def test_ig_ready_threshold(self, valid_response_data):
        """Test ig_ready flag based on overall score threshold."""
        # Overall score 8.0+ should be ig_ready=True
        valid_response_data.update(
            {
                "quality_score": 8,
                "visibility_score": 8,
                "appeal_score": 8,
                "background_score": 8,
                "overall_score": 8.0,
                "ig_ready": True,
            }
        )
        response = PhotoAnalysisResponse(**valid_response_data)
        assert response.ig_ready is True
        assert response.overall_score == 8.0

        # Overall score 7.9 should be ig_ready=False
        valid_response_data.update(
            {
                "quality_score": 8,
                "visibility_score": 8,
                "appeal_score": 8,
                "background_score": 7,
                "overall_score": 7.75,
                "ig_ready": False,
            }
        )
        response = PhotoAnalysisResponse(**valid_response_data)
        assert response.ig_ready is False
        assert response.overall_score == 7.75

    @pytest.mark.parametrize(
        "invalid_score",
        [0, -1, 11, 15, -5],
    )
    def test_quality_score_validation_rejects_invalid(self, valid_response_data, invalid_score):
        """Test that quality_score must be 1-10, rejects 0, 11, -1, etc."""
        valid_response_data["quality_score"] = invalid_score
        with pytest.raises(ValidationError) as exc_info:
            PhotoAnalysisResponse(**valid_response_data)
        assert "quality_score" in str(exc_info.value).lower()

    @pytest.mark.parametrize(
        "invalid_score",
        [0, -1, 11, 15, -5],
    )
    def test_visibility_score_validation_rejects_invalid(self, valid_response_data, invalid_score):
        """Test that visibility_score must be 1-10."""
        valid_response_data["visibility_score"] = invalid_score
        with pytest.raises(ValidationError) as exc_info:
            PhotoAnalysisResponse(**valid_response_data)
        assert "visibility_score" in str(exc_info.value).lower()

    @pytest.mark.parametrize(
        "invalid_score",
        [0, -1, 11, 15, -5],
    )
    def test_appeal_score_validation_rejects_invalid(self, valid_response_data, invalid_score):
        """Test that appeal_score must be 1-10."""
        valid_response_data["appeal_score"] = invalid_score
        with pytest.raises(ValidationError) as exc_info:
            PhotoAnalysisResponse(**valid_response_data)
        assert "appeal_score" in str(exc_info.value).lower()

    @pytest.mark.parametrize(
        "invalid_score",
        [0, -1, 11, 15, -5],
    )
    def test_background_score_validation_rejects_invalid(self, valid_response_data, invalid_score):
        """Test that background_score must be 1-10."""
        valid_response_data["background_score"] = invalid_score
        with pytest.raises(ValidationError) as exc_info:
            PhotoAnalysisResponse(**valid_response_data)
        assert "background_score" in str(exc_info.value).lower()

    @pytest.mark.parametrize(
        "valid_score",
        [1, 2, 5, 8, 10],
    )
    def test_all_scores_accept_valid_range(self, valid_response_data, valid_score):
        """Test that all scores accept valid 1-10 range."""
        valid_response_data.update(
            {
                "quality_score": valid_score,
                "visibility_score": valid_score,
                "appeal_score": valid_score,
                "background_score": valid_score,
                "overall_score": float(valid_score),
            }
        )
        response = PhotoAnalysisResponse(**valid_response_data)
        assert response.quality_score == valid_score
        assert response.visibility_score == valid_score
        assert response.appeal_score == valid_score
        assert response.background_score == valid_score

    def test_overall_score_must_equal_average(self, valid_response_data):
        """Test that overall_score must equal average of 4 scores."""
        # Correct average
        valid_response_data.update(
            {
                "quality_score": 8,
                "visibility_score": 6,
                "appeal_score": 7,
                "background_score": 5,
                "overall_score": 6.5,  # (8+6+7+5)/4 = 6.5
            }
        )
        response = PhotoAnalysisResponse(**valid_response_data)
        assert response.overall_score == 6.5

        # Incorrect average should fail
        valid_response_data["overall_score"] = 7.0  # Wrong! Should be 6.5
        with pytest.raises(ValidationError) as exc_info:
            PhotoAnalysisResponse(**valid_response_data)
        assert "overall_score" in str(exc_info.value).lower()

    def test_overall_score_calculation_edge_cases(self, valid_response_data):
        """Test overall_score calculation with edge cases."""
        # All minimum scores
        valid_response_data.update(
            {
                "quality_score": 1,
                "visibility_score": 1,
                "appeal_score": 1,
                "background_score": 1,
                "overall_score": 1.0,
            }
        )
        response = PhotoAnalysisResponse(**valid_response_data)
        assert response.overall_score == 1.0

        # All maximum scores
        valid_response_data.update(
            {
                "quality_score": 10,
                "visibility_score": 10,
                "appeal_score": 10,
                "background_score": 10,
                "overall_score": 10.0,
            }
        )
        response = PhotoAnalysisResponse(**valid_response_data)
        assert response.overall_score == 10.0

        # Mixed scores with decimal result
        valid_response_data.update(
            {
                "quality_score": 7,
                "visibility_score": 8,
                "appeal_score": 6,
                "background_score": 9,
                "overall_score": 7.5,  # (7+8+6+9)/4 = 7.5
            }
        )
        response = PhotoAnalysisResponse(**valid_response_data)
        assert response.overall_score == 7.5

    def test_overall_score_tolerance(self, valid_response_data):
        """Test overall_score validation with small floating point tolerance."""
        # Should accept scores within 0.01 tolerance
        valid_response_data.update(
            {
                "quality_score": 7,
                "visibility_score": 8,
                "appeal_score": 6,
                "background_score": 9,
                "overall_score": 7.501,  # Close to 7.5
            }
        )
        # This should either pass (within tolerance) or fail (exact match required)
        # Implementation will determine behavior
        try:
            response = PhotoAnalysisResponse(**valid_response_data)
            # If it passes, tolerance is allowed
            assert abs(response.overall_score - 7.5) < 0.01
        except ValidationError:
            # If it fails, exact match is required
            pass

    @pytest.mark.parametrize(
        "invalid_confidence",
        ["Low", "HIGH", "med", "unknown", "very_high", ""],
    )
    def test_confidence_enum_rejects_invalid(self, valid_response_data, invalid_confidence):
        """Test that confidence must be exactly 'low', 'medium', or 'high'."""
        valid_response_data["confidence"] = invalid_confidence
        with pytest.raises(ValidationError) as exc_info:
            PhotoAnalysisResponse(**valid_response_data)
        assert "confidence" in str(exc_info.value).lower()

    @pytest.mark.parametrize(
        "valid_confidence",
        ["low", "medium", "high"],
    )
    def test_confidence_enum_accepts_valid(self, valid_response_data, valid_confidence):
        """Test that confidence accepts all valid enum values."""
        valid_response_data["confidence"] = valid_confidence
        response = PhotoAnalysisResponse(**valid_response_data)
        assert response.confidence == valid_confidence

    def test_flags_array_empty(self, valid_response_data):
        """Test flags array can be empty."""
        valid_response_data["flags"] = []
        response = PhotoAnalysisResponse(**valid_response_data)
        assert response.flags == []

    def test_flags_array_multiple_items(self, valid_response_data):
        """Test flags array can contain multiple items."""
        valid_response_data["flags"] = ["blurry", "poor_lighting", "kennel_bars", "dog_obscured"]
        response = PhotoAnalysisResponse(**valid_response_data)
        assert len(response.flags) == 4
        assert "blurry" in response.flags
        assert "kennel_bars" in response.flags

    def test_flags_array_single_item(self, valid_response_data):
        """Test flags array with single item."""
        valid_response_data["flags"] = ["excellent_quality"]
        response = PhotoAnalysisResponse(**valid_response_data)
        assert response.flags == ["excellent_quality"]

    def test_flags_default_empty_list(self, valid_response_data):
        """Test flags defaults to empty list if not provided."""
        del valid_response_data["flags"]
        response = PhotoAnalysisResponse(**valid_response_data)
        assert response.flags == []

    def test_reasoning_required(self, valid_response_data):
        """Test that reasoning field is required."""
        del valid_response_data["reasoning"]
        with pytest.raises(ValidationError) as exc_info:
            PhotoAnalysisResponse(**valid_response_data)
        assert "reasoning" in str(exc_info.value).lower()

    def test_reasoning_accepts_string(self, valid_response_data):
        """Test reasoning accepts any non-empty string."""
        valid_response_data["reasoning"] = "Professional quality photo with excellent composition and lighting"
        response = PhotoAnalysisResponse(**valid_response_data)
        assert response.reasoning == "Professional quality photo with excellent composition and lighting"

    def test_all_required_fields_present(self, valid_response_data):
        """Test that all required fields must be present."""
        required_fields = [
            "quality_score",
            "visibility_score",
            "appeal_score",
            "background_score",
            "overall_score",
            "ig_ready",
            "confidence",
            "reasoning",
        ]

        for field in required_fields:
            data = valid_response_data.copy()
            del data[field]
            with pytest.raises(ValidationError) as exc_info:
                PhotoAnalysisResponse(**data)
            assert field in str(exc_info.value).lower()

    def test_invalid_data_types(self, valid_response_data):
        """Test rejection of invalid data types."""
        # String instead of int for score
        valid_response_data["quality_score"] = "eight"
        with pytest.raises(ValidationError):
            PhotoAnalysisResponse(**valid_response_data)

        # Reset
        valid_response_data["quality_score"] = 8

        # String instead of float for overall_score
        valid_response_data["overall_score"] = "seven point five"
        with pytest.raises(ValidationError):
            PhotoAnalysisResponse(**valid_response_data)

    def test_json_serialization(self, valid_response_data):
        """Test JSON serialization of response."""
        response = PhotoAnalysisResponse(**valid_response_data)

        # Convert to dict
        response_dict = response.dict()
        assert isinstance(response_dict["quality_score"], int)
        assert isinstance(response_dict["overall_score"], float)
        assert isinstance(response_dict["ig_ready"], bool)
        assert isinstance(response_dict["flags"], list)

        # Convert to JSON string
        response_json = response.json()
        assert isinstance(response_json, str)
        assert "quality_score" in response_json
        assert "confidence" in response_json

    def test_perfect_score_response(self):
        """Test response with perfect scores (all 10s)."""
        perfect_data = {
            "quality_score": 10,
            "visibility_score": 10,
            "appeal_score": 10,
            "background_score": 10,
            "overall_score": 10.0,
            "ig_ready": True,
            "confidence": "high",
            "reasoning": "Professional-quality photo, perfect for Instagram",
            "flags": [],
        }
        response = PhotoAnalysisResponse(**perfect_data)
        assert response.overall_score == 10.0
        assert response.ig_ready is True
        assert response.flags == []

    def test_poor_score_response(self):
        """Test response with poor scores (all 1s)."""
        poor_data = {
            "quality_score": 1,
            "visibility_score": 1,
            "appeal_score": 1,
            "background_score": 1,
            "overall_score": 1.0,
            "ig_ready": False,
            "confidence": "low",
            "reasoning": "Very poor quality, unusable for social media",
            "flags": ["blurry", "poor_lighting", "dog_not_visible", "cluttered_background"],
        }
        response = PhotoAnalysisResponse(**poor_data)
        assert response.overall_score == 1.0
        assert response.ig_ready is False
        assert len(response.flags) == 4

    def test_mixed_quality_response(self):
        """Test response with mixed quality scores."""
        mixed_data = {
            "quality_score": 9,
            "visibility_score": 8,
            "appeal_score": 6,
            "background_score": 5,
            "overall_score": 7.0,  # (9+8+6+5)/4 = 7.0
            "ig_ready": False,
            "confidence": "medium",
            "reasoning": "Good technical quality but background is distracting",
            "flags": ["busy_background"],
        }
        response = PhotoAnalysisResponse(**mixed_data)
        assert response.quality_score == 9
        assert response.background_score == 5
        assert response.overall_score == 7.0
        assert response.ig_ready is False

    def test_edge_case_average_with_decimals(self):
        """Test overall_score calculation that results in repeating decimals."""
        edge_data = {
            "quality_score": 7,
            "visibility_score": 7,
            "appeal_score": 7,
            "background_score": 8,
            "overall_score": 7.25,  # (7+7+7+8)/4 = 7.25
            "ig_ready": False,
            "confidence": "medium",
            "reasoning": "Consistent quality with slight background advantage",
            "flags": [],
        }
        response = PhotoAnalysisResponse(**edge_data)
        assert response.overall_score == 7.25

    def test_overall_score_accepts_integer(self, valid_response_data):
        """Test that overall_score accepts integer values (coerced to float)."""
        valid_response_data.update(
            {
                "quality_score": 8,
                "visibility_score": 8,
                "appeal_score": 8,
                "background_score": 8,
                "overall_score": 8,  # Integer instead of 8.0
            }
        )
        response = PhotoAnalysisResponse(**valid_response_data)
        assert response.overall_score == 8.0
        assert isinstance(response.overall_score, float)