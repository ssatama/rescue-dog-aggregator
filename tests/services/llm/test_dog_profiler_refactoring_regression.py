#!/usr/bin/env python3
"""
Regression test suite for DogProfilerPipeline refactoring.

This test captures the EXACT current behavior of the normalization logic
to ensure no functionality is lost during refactoring.
"""

from typing import Any, Dict

import pytest

from services.llm.dog_profiler import DogProfilerPipeline


class TestNormalizationRegression:
    """Comprehensive tests capturing current normalization behavior."""

    @pytest.fixture
    def pipeline(self):
        """Create pipeline instance for testing."""
        return DogProfilerPipeline(organization_id=11, dry_run=True)

    def test_trainability_normalization(self, pipeline):
        """Test trainability field normalization."""
        test_cases = [
            ({"trainability": "easy"}, "easy"),
            ({"trainability": "medium"}, "moderate"),
            ({"trainability": "moderate"}, "moderate"),
            ({"trainability": "challenging"}, "challenging"),
            ({"trainability": "hard"}, "challenging"),
            ({"trainability": "very_challenging"}, "very_challenging"),
            ({"trainability": "expert_needed"}, "very_challenging"),
            ({"trainability": "null"}, "moderate"),
            ({"trainability": "unknown"}, "moderate"),
            ({"trainability": None}, "moderate"),
            ({}, "moderate"),  # Missing field
        ]

        for input_data, expected in test_cases:
            result = pipeline._normalize_profile_data(input_data.copy())
            assert result["trainability"] == expected, f"Failed for input: {input_data}"

    def test_confidence_normalization(self, pipeline):
        """Test confidence field normalization."""
        test_cases = [
            ({"confidence": "very_confident"}, "very_confident"),
            ({"confidence": "confident"}, "confident"),
            ({"confidence": "moderate"}, "moderate"),
            ({"confidence": "medium"}, "moderate"),
            ({"confidence": "shy"}, "shy"),
            ({"confidence": "very_shy"}, "very_shy"),
            ({"confidence": "fearful"}, "very_shy"),
            ({"confidence": None}, "moderate"),
            ({}, "moderate"),  # Missing field
        ]

        for input_data, expected in test_cases:
            result = pipeline._normalize_profile_data(input_data.copy())
            assert result["confidence"] == expected, f"Failed for input: {input_data}"

    def test_boolean_field_normalization(self, pipeline):
        """Test boolean field normalization."""
        # Test yard_required
        test_cases = [
            ({"yard_required": "true"}, True),
            ({"yard_required": "yes"}, True),
            ({"yard_required": "preferred"}, True),
            ({"yard_required": "required"}, True),
            ({"yard_required": "false"}, False),
            ({"yard_required": "no"}, False),
            ({"yard_required": None}, False),
            ({}, False),  # Missing defaults to False
        ]

        for input_data, expected in test_cases:
            result = pipeline._normalize_profile_data(input_data.copy())
            assert result["yard_required"] == expected, f"Failed for input: {input_data}"

        # Test ready_to_travel
        test_cases = [
            ({"ready_to_travel": "true"}, True),
            ({"ready_to_travel": "false"}, False),
            ({"ready_to_travel": None}, True),
            ({}, True),  # Missing defaults to True
        ]

        for input_data, expected in test_cases:
            result = pipeline._normalize_profile_data(input_data.copy())
            assert result["ready_to_travel"] == expected, f"Failed for input: {input_data}"

    def test_compatibility_field_normalization(self, pipeline):
        """Test good_with_* field normalization."""
        # Test good_with_dogs - only normalizes if field exists
        test_cases = [
            ({"good_with_dogs": True}, "yes"),
            ({"good_with_dogs": False}, "no"),
            ({"good_with_dogs": "on_request"}, "unknown"),
            ({"good_with_dogs": "untested"}, "unknown"),
            ({"good_with_dogs": "unclear"}, "unknown"),
            ({"good_with_dogs": None}, "unknown"),
            ({"good_with_dogs": "yes"}, "yes"),
            ({"good_with_dogs": "no"}, "no"),
            ({"good_with_dogs": "selective"}, "selective"),
            ({"good_with_dogs": "unknown"}, "unknown"),
            ({"good_with_dogs": "invalid"}, "unknown"),
            ({}, None),  # Field not present, no normalization
        ]

        for input_data, expected in test_cases:
            result = pipeline._normalize_profile_data(input_data.copy())
            if expected is None:
                assert "good_with_dogs" not in result, f"Field should not exist for input: {input_data}"
            else:
                assert result.get("good_with_dogs") == expected, f"Failed for input: {input_data}"

        # Test good_with_children special handling - selective becomes older_children
        test_cases = [
            ({"good_with_children": "selective"}, "older_children"),
            ({"good_with_children": "yes"}, "yes"),
            ({"good_with_children": "older_children"}, "older_children"),
            ({"good_with_children": "no"}, "no"),
            ({"good_with_children": "unknown"}, "unknown"),
            ({"good_with_children": "invalid"}, "unknown"),  # Invalid->unknown (first pass)
            ({"good_with_children": True}, "yes"),  # True->yes
            ({"good_with_children": False}, "no"),  # False->no
            ({}, None),  # Field not present
        ]

        for input_data, expected in test_cases:
            result = pipeline._normalize_profile_data(input_data.copy())
            if expected is None:
                assert "good_with_children" not in result, f"Field should not exist for input: {input_data}"
            else:
                assert result.get("good_with_children") == expected, f"Failed for input: {input_data}"

        # Test good_with_cats special handling - selective becomes with_training
        test_cases = [
            ({"good_with_cats": "selective"}, "with_training"),
            ({"good_with_cats": "yes"}, "yes"),
            ({"good_with_cats": "no"}, "no"),
            ({"good_with_cats": "with_training"}, "with_training"),
            ({"good_with_cats": "unknown"}, "unknown"),
            ({"good_with_cats": "invalid"}, "unknown"),  # Invalid->unknown (stays unknown)
            ({"good_with_cats": True}, "yes"),  # True->yes
            ({"good_with_cats": False}, "no"),  # False->no
            ({}, None),  # Field not present
        ]

        for input_data, expected in test_cases:
            result = pipeline._normalize_profile_data(input_data.copy())
            if expected is None:
                assert "good_with_cats" not in result, f"Field should not exist for input: {input_data}"
            else:
                assert result.get("good_with_cats") == expected, f"Failed for input: {input_data}"

    def test_experience_level_normalization(self, pipeline):
        """Test experience_level field normalization."""
        test_cases = [
            ({"experience_level": "first_time_ok"}, "first_time_ok"),
            ({"experience_level": "beginner"}, "first_time_ok"),
            ({"experience_level": "some_experience"}, "some_experience"),
            ({"experience_level": "intermediate"}, "some_experience"),
            ({"experience_level": "experienced"}, "experienced_only"),
            ({"experience_level": "experienced_only"}, "experienced_only"),
            ({"experience_level": "expert"}, "experienced_only"),
            ({"experience_level": "invalid"}, "some_experience"),
            ({"experience_level": None}, "some_experience"),
            ({}, "some_experience"),
        ]

        for input_data, expected in test_cases:
            result = pipeline._normalize_profile_data(input_data.copy())
            assert result["experience_level"] == expected, f"Failed for input: {input_data}"

    def test_exercise_needs_normalization(self, pipeline):
        """Test exercise_needs field normalization."""
        test_cases = [
            ({"exercise_needs": "minimal"}, "minimal"),
            ({"exercise_needs": "low"}, "minimal"),
            ({"exercise_needs": "moderate"}, "moderate"),
            ({"exercise_needs": "medium"}, "moderate"),
            ({"exercise_needs": "medium_high"}, "high"),
            ({"exercise_needs": "high"}, "high"),
            ({"exercise_needs": "very_high"}, "very_high"),
            ({"exercise_needs": "athlete"}, "very_high"),
            ({"exercise_needs": "invalid"}, "moderate"),
        ]

        for input_data, expected in test_cases:
            result = pipeline._normalize_profile_data(input_data.copy())
            if "exercise_needs" in input_data:
                assert result.get("exercise_needs") == expected, f"Failed for input: {input_data}"

    def test_grooming_needs_normalization(self, pipeline):
        """Test grooming_needs field normalization."""
        test_cases = [
            ({"grooming_needs": "minimal"}, "minimal"),
            ({"grooming_needs": "low"}, "minimal"),
            ({"grooming_needs": "weekly"}, "weekly"),
            ({"grooming_needs": "moderate"}, "weekly"),
            ({"grooming_needs": "frequent"}, "frequent"),
            ({"grooming_needs": "high"}, "frequent"),
            ({"grooming_needs": "professional"}, "professional"),
            ({"grooming_needs": "invalid"}, "weekly"),
        ]

        for input_data, expected in test_cases:
            result = pipeline._normalize_profile_data(input_data.copy())
            if "grooming_needs" in input_data:
                assert result.get("grooming_needs") == expected, f"Failed for input: {input_data}"

    def test_text_truncation(self, pipeline):
        """Test text field truncation."""
        long_text = "a" * 500

        # Test description truncation (400 chars - increased limit)
        result = pipeline._normalize_profile_data({"description": long_text})
        assert len(result["description"]) <= 400

        # Test tagline truncation (50 chars)
        result = pipeline._normalize_profile_data({"tagline": long_text})
        assert len(result["tagline"]) == 50

        # Test medical_needs truncation (200 chars)
        result = pipeline._normalize_profile_data({"medical_needs": long_text})
        assert len(result["medical_needs"]) <= 200

        # Test unique_quirk truncation (150 chars - increased limit)
        result = pipeline._normalize_profile_data({"unique_quirk": long_text})
        assert len(result["unique_quirk"]) <= 150

    def test_adoption_fee_normalization(self, pipeline):
        """Test adoption_fee_euros field normalization."""
        test_cases = [
            ({"adoption_fee_euros": 350}, 350),
            ({"adoption_fee_euros": "350"}, 350),
            ({"adoption_fee_euros": "null"}, None),
            ({"adoption_fee_euros": ""}, None),
            ({"adoption_fee_euros": None}, None),
            ({"adoption_fee_euros": "invalid"}, None),
            ({"adoption_fee_euros": 350.5}, None),  # Not an integer
        ]

        for input_data, expected in test_cases:
            result = pipeline._normalize_profile_data(input_data.copy())
            assert result.get("adoption_fee_euros") == expected, f"Failed for input: {input_data}"

    def test_personality_traits_normalization(self, pipeline):
        """Test personality_traits list normalization."""
        # Test missing traits
        result = pipeline._normalize_profile_data({})
        assert result["personality_traits"] == ["friendly", "loyal", "gentle"]
        assert result["confidence_scores"]["personality_traits"] == 0.1

        # Test too few traits - FIXED: no duplicates
        result = pipeline._normalize_profile_data({"personality_traits": ["friendly"]})
        assert len(result["personality_traits"]) == 3
        assert result["personality_traits"][0] == "friendly"
        assert result["personality_traits"][1] == "gentle"
        assert result["personality_traits"][2] == "loyal"  # Fixed: no duplicate "gentle"

        # Test too many traits
        result = pipeline._normalize_profile_data({"personality_traits": ["a", "b", "c", "d", "e", "f", "g"]})
        assert len(result["personality_traits"]) == 5
        assert result["personality_traits"] == ["a", "b", "c", "d", "e"]

        # Test normal case
        result = pipeline._normalize_profile_data({"personality_traits": ["friendly", "loyal", "playful"]})
        assert result["personality_traits"] == ["friendly", "loyal", "playful"]

    def test_favorite_activities_normalization(self, pipeline):
        """Test favorite_activities list normalization."""
        # Test missing activities
        result = pipeline._normalize_profile_data({})
        assert result["favorite_activities"] == ["walks", "play"]
        assert result["confidence_scores"]["favorite_activities"] == 0.1

        # Test too many activities
        result = pipeline._normalize_profile_data({"favorite_activities": ["a", "b", "c", "d", "e"]})
        assert len(result["favorite_activities"]) == 4
        assert result["favorite_activities"] == ["a", "b", "c", "d"]

    def test_home_type_normalization(self, pipeline):
        """Test home_type field normalization."""
        test_cases = [
            ({"home_type": "apartment_ok"}, "apartment_ok"),
            ({"home_type": "house_preferred"}, "house_preferred"),
            ({"home_type": "house_required"}, "house_required"),
            ({"home_type": "farm_only"}, "farm_only"),
            ({"home_type": "unknown"}, "house_preferred"),
            ({"home_type": "invalid"}, "house_preferred"),
            ({"home_type": None}, "house_preferred"),
            ({}, "house_preferred"),
        ]

        for input_data, expected in test_cases:
            result = pipeline._normalize_profile_data(input_data.copy())
            assert result["home_type"] == expected, f"Failed for input: {input_data}"

    def test_source_references_normalization(self, pipeline):
        """Test source_references field normalization."""
        # Test missing source_references
        result = pipeline._normalize_profile_data({})
        assert "source_references" in result
        assert result["source_references"]["description"] == "generated from available data"
        assert result["source_references"]["personality_traits"] == "default values"

        # Test None values conversion
        result = pipeline._normalize_profile_data({"source_references": {"test_field": None, "list_field": ["item1", "item2"], "int_field": 123}})
        assert result["source_references"]["test_field"] == "not specified"
        assert result["source_references"]["list_field"] == "item1; item2"
        assert result["source_references"]["int_field"] == "123"

    def test_confidence_scores_normalization(self, pipeline):
        """Test confidence_scores field normalization."""
        # Test missing confidence_scores
        result = pipeline._normalize_profile_data({})
        assert "confidence_scores" in result
        assert result["confidence_scores"]["description"] == 0.2
        assert result["confidence_scores"]["energy_level"] == 0.2
        assert result["confidence_scores"]["trainability"] == 0.2

        # Test None values conversion
        result = pipeline._normalize_profile_data({"confidence_scores": {"test_field": None, "valid_field": 0.8}})
        assert result["confidence_scores"]["test_field"] == 0.0
        assert result["confidence_scores"]["valid_field"] == 0.8

    def test_required_fields_with_defaults(self, pipeline):
        """Test that all required fields get defaults when missing."""
        result = pipeline._normalize_profile_data({})

        # Check all required fields have values
        assert result["trainability"] == "moderate"
        assert result["confidence"] == "moderate"
        assert result["yard_required"] == False
        assert result["ready_to_travel"] == True
        assert result["vaccinated"] == False
        assert result["neutered"] == False
        assert result["sociability"] == "selective"
        assert result["energy_level"] == "medium"
        assert result["experience_level"] == "some_experience"
        assert result["personality_traits"] == ["friendly", "loyal", "gentle"]
        assert result["favorite_activities"] == ["walks", "play"]
        assert result["home_type"] == "house_preferred"
        assert "source_references" in result
        assert "confidence_scores" in result

    def test_smart_truncate_behavior(self, pipeline):
        """Test smart truncation preserves sentence boundaries."""
        # This assumes smart_truncate tries to break at sentence boundaries
        text = "This is the first sentence. This is the second sentence. This is the third sentence."
        result = pipeline._normalize_profile_data({"description": text * 5})

        # Should be truncated but under 400 chars (increased limit)
        assert len(result["description"]) <= 400
        # Should end cleanly (with period if smart truncate works)
        if "." in result["description"]:
            assert result["description"].rstrip().endswith(".")


class TestFullPipelineRegression:
    """Test the full pipeline behavior to ensure no regression."""

    @pytest.fixture
    def pipeline(self):
        """Create pipeline instance for testing."""
        return DogProfilerPipeline(organization_id=11, dry_run=True)

    def test_complex_normalization_scenario(self, pipeline):
        """Test a complex scenario with multiple normalizations."""
        input_data = {
            "name": "Max",
            "tagline": "A wonderful companion dog looking for his forever home with loving people",
            "description": "Max is an amazing dog " * 50,  # Very long description
            "trainability": "medium",
            "confidence": "fearful",
            "yard_required": "preferred",
            "ready_to_travel": None,
            "good_with_dogs": True,
            "good_with_cats": "selective",
            "good_with_children": "selective",
            "experience_level": "beginner",
            "exercise_needs": "medium_high",
            "grooming_needs": "moderate",
            "home_type": "invalid_value",
            "personality_traits": ["friendly"],  # Too few
            "favorite_activities": ["walk", "play", "fetch", "swim", "run", "jump"],  # Too many
            "adoption_fee_euros": "350",
            "vaccinated": "yes",
            "neutered": None,
            "unique_quirk": "He loves to play with toys and enjoys long walks in the park " * 5,
            "medical_needs": "Regular checkups needed " * 20,
            "source_references": {"test": None, "list": ["a", "b"]},
            "confidence_scores": {"test": None, "valid": 0.9},
        }

        result = pipeline._normalize_profile_data(input_data)

        # Verify all normalizations
        assert result["trainability"] == "moderate"
        assert result["confidence"] == "very_shy"
        assert result["yard_required"] == True
        assert result["ready_to_travel"] == True
        assert result["good_with_dogs"] == "yes"
        assert result["good_with_cats"] == "with_training"  # selective → with_training in second pass
        assert result["good_with_children"] == "older_children"  # selective → older_children in second pass
        assert result["experience_level"] == "first_time_ok"
        assert result["exercise_needs"] == "high"
        assert result["grooming_needs"] == "weekly"
        assert result["home_type"] == "house_preferred"
        assert len(result["personality_traits"]) == 3
        assert len(result["favorite_activities"]) == 4
        assert result["adoption_fee_euros"] == 350
        assert result["vaccinated"] == True
        assert result["neutered"] == False
        assert len(result["tagline"]) <= 53  # Smart truncate adds "..." so could be up to 53
        assert len(result["description"]) <= 403  # Updated limit + "..."
        assert len(result["unique_quirk"]) <= 153  # Updated limit + "..."
        assert len(result["medical_needs"]) <= 203  # 200 + "..."
        assert result["source_references"]["test"] == "not specified"
        assert result["source_references"]["list"] == "a; b"
        assert result["confidence_scores"]["test"] == 0.0
        assert result["confidence_scores"]["valid"] == 0.9
