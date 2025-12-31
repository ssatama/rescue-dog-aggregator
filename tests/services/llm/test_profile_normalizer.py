"""
Test suite for profile normalization.

Following CLAUDE.md principles:
- TDD approach
- Pure functions
- Comprehensive edge cases
"""

import pytest

from services.llm.profile_normalizer import ProfileNormalizer


@pytest.mark.services
class TestProfileNormalizer:
    """Test the refactored profile normalization."""

    @pytest.fixture
    def normalizer(self):
        """Create normalizer instance."""
        return ProfileNormalizer()

    @pytest.fixture
    def raw_profile(self):
        """Raw profile data from LLM."""
        return {
            "description": "A wonderful dog",
            "tagline": "Your best friend",
            "energy_level": "moderate",  # Needs mapping
            "trainability": "easily_trainable",  # Needs mapping
            "good_with_children": "selective",  # Needs mapping
            "personality_traits": ["friendly", "calm"],  # Needs padding
            "favorite_activities": [
                "walks",
                "fetch",
                "swimming",
                "running",
                "playing",
            ],  # Too many
            "adoption_fee_euros": "null",  # String null
            "vaccinated": "true",  # String boolean
            "confidence_scores": {
                "description": None,
                "energy_level": 0.9,
            },  # Should be 0.0
        }

    def test_normalize_energy_level(self, normalizer):
        """Test energy level normalization."""
        assert normalizer.normalize_energy_level("moderate") == "medium"
        assert normalizer.normalize_energy_level("very_energetic") == "very_high"
        assert normalizer.normalize_energy_level("lazy") == "low"
        assert normalizer.normalize_energy_level("high") == "high"
        assert normalizer.normalize_energy_level("unknown") == "medium"  # Default

    def test_normalize_trainability(self, normalizer):
        """Test trainability normalization."""
        assert normalizer.normalize_trainability("easily_trainable") == "easy"
        assert normalizer.normalize_trainability("difficult") == "challenging"
        assert normalizer.normalize_trainability("moderate") == "moderate"
        assert normalizer.normalize_trainability("stubborn") == "challenging"
        assert normalizer.normalize_trainability("unknown") == "moderate"  # Default

    def test_normalize_compatibility(self, normalizer):
        """Test compatibility field normalization."""
        assert normalizer.normalize_compatibility("selective", "children") == "older_children"
        assert normalizer.normalize_compatibility("selective", "cats") == "maybe"
        assert normalizer.normalize_compatibility("yes", "dogs") == "yes"
        assert normalizer.normalize_compatibility("no", "children") == "no"
        assert normalizer.normalize_compatibility("unknown", "cats") == "unknown"

    def test_normalize_list_field(self, normalizer):
        """Test list field normalization."""
        # Too few items - should pad
        result = normalizer.normalize_list_field(["friendly"], min_items=3, max_items=5, default_item="gentle")
        assert len(result) == 3
        assert "friendly" in result
        assert "gentle" in result

        # Too many items - should truncate
        result = normalizer.normalize_list_field(["a", "b", "c", "d", "e", "f"], min_items=3, max_items=5)
        assert len(result) == 5
        assert result == ["a", "b", "c", "d", "e"]

        # Just right
        result = normalizer.normalize_list_field(["a", "b", "c", "d"], min_items=3, max_items=5)
        assert len(result) == 4

    def test_normalize_boolean(self, normalizer):
        """Test boolean normalization."""
        assert normalizer.normalize_boolean("true") is True
        assert normalizer.normalize_boolean("True") is True
        assert normalizer.normalize_boolean("yes") is True
        assert normalizer.normalize_boolean(True) is True
        assert normalizer.normalize_boolean("false") is False
        assert normalizer.normalize_boolean("no") is False
        assert normalizer.normalize_boolean(False) is False
        assert normalizer.normalize_boolean("unknown") is None

    def test_normalize_numeric(self, normalizer):
        """Test numeric field normalization."""
        assert normalizer.normalize_numeric("350") == 350
        assert normalizer.normalize_numeric(350) == 350
        assert normalizer.normalize_numeric("null") is None
        assert normalizer.normalize_numeric(None) is None
        assert normalizer.normalize_numeric("invalid") is None

    def test_normalize_confidence_scores(self, normalizer):
        """Test confidence score normalization."""
        scores = {"description": None, "energy_level": 0.9, "missing_field": None}

        result = normalizer.normalize_confidence_scores(scores)
        assert result["description"] == 0.0
        assert result["energy_level"] == 0.9
        assert "missing_field" not in result or result["missing_field"] == 0.0

    def test_normalize_full_profile(self, normalizer, raw_profile):
        """Test normalizing a complete profile."""
        result = normalizer.normalize(raw_profile)

        # Check conversions
        assert result["energy_level"] == "medium"
        assert result["trainability"] == "easy"
        assert result["good_with_children"] == "older_children"

        # Check list normalization
        assert len(result["personality_traits"]) >= 3
        assert len(result["favorite_activities"]) <= 4

        # Check boolean conversion
        assert result["vaccinated"] is True

        # Check numeric conversion
        assert result["adoption_fee_euros"] is None

        # Check confidence scores
        assert result["confidence_scores"]["description"] == 0.0
        assert result["confidence_scores"]["energy_level"] == 0.9

    def test_preserve_valid_fields(self, normalizer):
        """Test that valid fields are preserved."""
        profile = {
            "description": "Perfect description",
            "energy_level": "high",  # Already valid
            "personality_traits": ["friendly", "loyal", "calm"],  # Already valid
            "vaccinated": True,  # Already boolean
        }

        result = normalizer.normalize(profile)
        assert result["description"] == "Perfect description"
        assert result["energy_level"] == "high"
        assert result["personality_traits"] == ["friendly", "loyal", "calm"]
        assert result["vaccinated"] is True

    def test_handle_missing_fields(self, normalizer):
        """Test handling of missing fields."""
        profile = {"description": "Minimal profile", "tagline": "Test"}

        result = normalizer.normalize(profile)
        assert "description" in result
        assert "tagline" in result
        # Should add defaults for required fields
        assert "energy_level" in result
        assert "personality_traits" in result


class TestNormalizationRules:
    """Test normalization rules configuration."""

    def test_load_rules_from_config(self):
        """Test loading normalization rules from configuration."""
        from services.llm.profile_normalizer import NormalizationRules

        rules = NormalizationRules.from_config()
        assert rules.energy_mappings is not None
        assert rules.trainability_mappings is not None
        assert rules.default_values is not None

    def test_custom_rules(self):
        """Test custom normalization rules."""
        from services.llm.profile_normalizer import NormalizationRules

        rules = NormalizationRules(
            energy_mappings={"custom": "high"},
            trainability_mappings={"custom": "easy"},
            default_values={"energy_level": "low"},
        )

        normalizer = ProfileNormalizer(rules=rules)
        assert normalizer.normalize_energy_level("custom") == "high"
        assert normalizer.normalize_trainability("custom") == "easy"
