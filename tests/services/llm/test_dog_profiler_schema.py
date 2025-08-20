"""
Test suite for DogProfilerData schema.

Following CLAUDE.md principles:
- TDD approach
- Comprehensive validation testing
- Edge case coverage
"""

from datetime import datetime

import pytest
from pydantic import ValidationError

from services.llm.schemas.dog_profiler import DogProfilerData


class TestDogProfilerDataSchema:
    """Test the enhanced dog profiler schema."""

    @pytest.fixture
    def valid_profile_data(self):
        """Valid profile data fixture."""
        return {
            "description": "Max is a gentle giant with a heart of gold. This lovable German Shepherd mix combines intelligence with calm demeanor, making him perfect for families seeking a loyal companion.",
            "tagline": "Gentle giant seeking loving family",
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
            "personality_traits": ["gentle", "intelligent", "loyal"],
            "favorite_activities": ["walks", "fetch"],
            "adoption_fee_euros": 350,
            "ready_to_travel": True,
            "vaccinated": True,
            "neutered": True,
            "processing_time_ms": 1250,
            "confidence_scores": {"description": 0.95, "energy_level": 0.88, "trainability": 0.92, "personality_traits": 0.90},
            "source_references": {"description": "ruhiger Schäferhund-Mix, sehr lieb", "personality_traits": "intelligent, gelehrig"},
            "prompt_version": "1.0.0",
        }

    def test_valid_profile_creation(self, valid_profile_data):
        """Test creating a valid profile."""
        profile = DogProfilerData(**valid_profile_data)

        assert profile.description == valid_profile_data["description"]
        assert profile.tagline == valid_profile_data["tagline"]
        assert profile.energy_level == "medium"
        assert profile.confidence_scores["description"] == 0.95
        assert "description" in profile.source_references
        assert profile.profiler_version == "1.0.0"  # Default value
        assert isinstance(profile.profiled_at, datetime)

    def test_description_length_validation(self, valid_profile_data):
        """Test description length constraints."""
        # Too short
        valid_profile_data["description"] = "Too short"
        with pytest.raises(ValidationError) as exc_info:
            DogProfilerData(**valid_profile_data)
        assert "at least 150 characters" in str(exc_info.value).lower() or "description" in str(exc_info.value).lower()

        # Too long
        valid_profile_data["description"] = "x" * 300
        with pytest.raises(ValidationError) as exc_info:
            DogProfilerData(**valid_profile_data)
        assert "at most 250 characters" in str(exc_info.value).lower() or "description" in str(exc_info.value).lower()

        # Just right
        valid_profile_data["description"] = "This is a perfect description that meets all the requirements. " * 3
        valid_profile_data["description"] = valid_profile_data["description"][:200]  # Trim to valid length
        profile = DogProfilerData(**valid_profile_data)
        assert len(profile.description) >= 150
        assert len(profile.description) <= 250

    def test_description_quality_validation(self, valid_profile_data):
        """Test description quality checks."""
        # Placeholder text - should fail
        valid_profile_data["description"] = "Lorem ipsum dolor sit amet " * 6  # About 168 chars
        valid_profile_data["description"] = valid_profile_data["description"][:200]  # Ensure proper length
        with pytest.raises(ValidationError) as exc_info:
            DogProfilerData(**valid_profile_data)
        assert "placeholder" in str(exc_info.value).lower()

        # Too few words - should fail (less than 20 words)
        valid_profile_data["description"] = (
            "Dog is nice. Very good. Likes play. Need home. Please adopt. Good boy. Sweet dog. Friendly pet. Happy animal. Loving companion. Great friend. Wonderful dog. Nice pet. Good friend. Best dog."
        )
        # This has exactly 30 words but let's make it shorter
        valid_profile_data["description"] = "Dog is nice. Good boy. Needs home now please." * 2  # ~18 words
        # Pad to meet minimum length requirement
        valid_profile_data["description"] = valid_profile_data["description"].ljust(150, ".")
        with pytest.raises(ValidationError) as exc_info:
            DogProfilerData(**valid_profile_data)
        assert "too short" in str(exc_info.value).lower() or "minimum 20" in str(exc_info.value).lower()

        # Valid description with enough words and proper length
        valid_profile_data["description"] = (
            "This wonderful dog is looking for a loving home. He is very friendly and loves to play with children. He enjoys long walks in the park and is well trained. Perfect family companion who will bring joy."
        )
        valid_profile_data["description"] = valid_profile_data["description"][:200]  # Ensure it's within bounds
        profile = DogProfilerData(**valid_profile_data)
        assert profile.description

    def test_behavioral_traits_validation(self, valid_profile_data):
        """Test behavioral trait enum validation."""
        # Valid values
        for energy in ["low", "medium", "high", "very_high"]:
            valid_profile_data["energy_level"] = energy
            profile = DogProfilerData(**valid_profile_data)
            assert profile.energy_level == energy

        # Invalid value
        valid_profile_data["energy_level"] = "extreme"
        with pytest.raises(ValidationError):
            DogProfilerData(**valid_profile_data)

    def test_compatibility_optional_fields(self, valid_profile_data):
        """Test that compatibility fields are optional."""
        # Remove optional fields
        del valid_profile_data["good_with_dogs"]
        del valid_profile_data["good_with_cats"]
        del valid_profile_data["good_with_children"]

        profile = DogProfilerData(**valid_profile_data)
        assert profile.good_with_dogs is None
        assert profile.good_with_cats is None
        assert profile.good_with_children is None

    def test_personality_traits_validation(self, valid_profile_data):
        """Test personality traits list validation."""
        # Too few traits
        valid_profile_data["personality_traits"] = ["gentle"]
        with pytest.raises(ValidationError) as exc_info:
            DogProfilerData(**valid_profile_data)
        assert "at least 3" in str(exc_info.value).lower()

        # Too many traits
        valid_profile_data["personality_traits"] = ["gentle", "smart", "loyal", "calm", "friendly", "playful"]
        with pytest.raises(ValidationError) as exc_info:
            DogProfilerData(**valid_profile_data)
        assert "at most 5" in str(exc_info.value).lower()

        # Empty strings filtered out
        valid_profile_data["personality_traits"] = ["gentle", "", "smart", "  ", "loyal"]
        profile = DogProfilerData(**valid_profile_data)
        assert len(profile.personality_traits) == 3
        assert "" not in profile.personality_traits

    def test_confidence_scores_validation(self, valid_profile_data):
        """Test confidence score validation."""
        # Missing required confidence scores
        valid_profile_data["confidence_scores"] = {"some_field": 0.5}
        with pytest.raises(ValidationError) as exc_info:
            DogProfilerData(**valid_profile_data)
        assert "description" in str(exc_info.value)

        # Invalid score range
        valid_profile_data["confidence_scores"] = {"description": 1.5, "energy_level": 0.88, "trainability": 0.92}  # Invalid: > 1.0
        with pytest.raises(ValidationError) as exc_info:
            DogProfilerData(**valid_profile_data)
        assert "confidence score" in str(exc_info.value).lower()

        # Valid scores
        valid_profile_data["confidence_scores"] = {"description": 0.95, "energy_level": 0.0, "trainability": 1.0}  # Valid: edge case  # Valid: edge case
        profile = DogProfilerData(**valid_profile_data)
        assert profile.confidence_scores["energy_level"] == 0.0
        assert profile.confidence_scores["trainability"] == 1.0

    def test_source_references_validation(self, valid_profile_data):
        """Test source reference validation for transparency."""
        # Missing source references
        valid_profile_data["source_references"] = {}
        with pytest.raises(ValidationError) as exc_info:
            DogProfilerData(**valid_profile_data)
        assert "source reference" in str(exc_info.value).lower()

        # Missing required references
        valid_profile_data["source_references"] = {"some_field": "some text"}
        with pytest.raises(ValidationError) as exc_info:
            DogProfilerData(**valid_profile_data)
        assert "description" in str(exc_info.value)

    def test_adoption_info_validation(self, valid_profile_data):
        """Test adoption information validation."""
        # Fee validation
        valid_profile_data["adoption_fee_euros"] = -10
        with pytest.raises(ValidationError):
            DogProfilerData(**valid_profile_data)

        valid_profile_data["adoption_fee_euros"] = 3000
        with pytest.raises(ValidationError):
            DogProfilerData(**valid_profile_data)

        valid_profile_data["adoption_fee_euros"] = 500
        profile = DogProfilerData(**valid_profile_data)
        assert profile.adoption_fee_euros == 500

        # Optional fee
        valid_profile_data["adoption_fee_euros"] = None
        profile = DogProfilerData(**valid_profile_data)
        assert profile.adoption_fee_euros is None

    def test_metadata_fields(self, valid_profile_data):
        """Test metadata field handling."""
        profile = DogProfilerData(**valid_profile_data)

        # Check defaults
        assert profile.profiler_version == "1.0.0"
        assert isinstance(profile.profiled_at, datetime)

        # Check required fields
        assert profile.processing_time_ms == 1250
        assert profile.prompt_version == "1.0.0"

        # Optional model_used field
        assert profile.model_used is None

        # With model specified
        valid_profile_data["model_used"] = "anthropic/claude-3-haiku"
        profile = DogProfilerData(**valid_profile_data)
        assert profile.model_used == "anthropic/claude-3-haiku"

    def test_json_serialization(self, valid_profile_data):
        """Test JSON serialization of the profile."""
        profile = DogProfilerData(**valid_profile_data)

        # Convert to dict
        profile_dict = profile.dict()
        assert isinstance(profile_dict["profiled_at"], datetime)

        # Convert to JSON string
        profile_json = profile.json()
        assert isinstance(profile_json, str)
        assert "description" in profile_json
        assert "confidence_scores" in profile_json

        # Parse back from JSON
        import json

        parsed = json.loads(profile_json)
        assert parsed["description"] == valid_profile_data["description"]
        assert isinstance(parsed["profiled_at"], str)  # DateTime serialized to ISO string

    def test_complete_profile_with_all_fields(self, valid_profile_data):
        """Test a complete profile with all optional fields filled."""
        valid_profile_data.update(
            {
                "medical_needs": "Requires daily medication for allergies",
                "special_needs": "Needs quiet home due to noise sensitivity",
                "unique_quirk": "Carries his favorite toy everywhere",
                "model_used": "anthropic/claude-3-haiku",
            }
        )

        profile = DogProfilerData(**valid_profile_data)
        assert profile.medical_needs == "Requires daily medication for allergies"
        assert profile.special_needs == "Needs quiet home due to noise sensitivity"
        assert profile.unique_quirk == "Carries his favorite toy everywhere"
        assert profile.model_used == "anthropic/claude-3-haiku"

    def test_minimal_required_profile(self):
        """Test creating profile with only required fields."""
        minimal_data = {
            "description": "A wonderful dog looking for a loving home. " * 5,  # Make it long enough
            "tagline": "Your new best friend",
            "energy_level": "medium",
            "trainability": "moderate",
            "sociability": "selective",
            "confidence": "moderate",
            "home_type": "house_preferred",
            "yard_required": False,
            "experience_level": "some_experience",
            "exercise_needs": "moderate",
            "grooming_needs": "weekly",
            "personality_traits": ["friendly", "loyal", "calm"],
            "favorite_activities": ["walks", "naps"],
            "ready_to_travel": True,
            "vaccinated": True,
            "neutered": False,
            "processing_time_ms": 1000,
            "confidence_scores": {"description": 0.9, "energy_level": 0.8, "trainability": 0.85},
            "source_references": {"description": "German text here", "personality_traits": "German traits"},
            "prompt_version": "1.0.0",
        }

        profile = DogProfilerData(**minimal_data)
        assert profile.good_with_dogs is None
        assert profile.medical_needs is None
        assert profile.unique_quirk is None
        assert profile.adoption_fee_euros is None
