"""
Extracted profile normalization orchestrator.

Following CLAUDE.md principles:
- Small file (<200 lines)
- Single responsibility (orchestration)
- Immutable data (no mutations)
"""

import copy
from typing import Any, Dict

from services.llm.field_normalizers import FieldNormalizers


class ExtractedProfileNormalizer:
    """Orchestrates profile data normalization."""

    def __init__(self):
        self.normalizers = FieldNormalizers()

    def normalize(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize profile data to match schema requirements."""
        # Create a deep copy to ensure immutability
        result = copy.deepcopy(data)

        # Normalize individual fields
        result = self._normalize_basic_fields(result)
        result = self._normalize_boolean_fields(result)
        result = self._normalize_compatibility_fields(result)
        result = self._normalize_text_fields(result)
        result = self._normalize_lists(result)
        result = self._normalize_metadata_fields(result)
        result = self._apply_field_specific_fixes(result)
        result = self._apply_defaults(result)

        return result

    def _normalize_basic_fields(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize basic enum fields."""
        result = copy.deepcopy(data)

        if "energy_level" in result:
            result["energy_level"] = self.normalizers.normalize_energy_level(
                result["energy_level"]
            )

        if "trainability" in result:
            result["trainability"] = self.normalizers.normalize_trainability(
                result["trainability"]
            )

        if "sociability" in result:
            result["sociability"] = self.normalizers.normalize_sociability(
                result["sociability"]
            )

        if "confidence" in result:
            result["confidence"] = self.normalizers.normalize_confidence(
                result["confidence"]
            )

        if "home_type" in result:
            result["home_type"] = self.normalizers.normalize_home_type(
                result["home_type"]
            )

        if "experience_level" in result:
            result["experience_level"] = self.normalizers.normalize_experience_level(
                result["experience_level"]
            )

        if "exercise_needs" in result:
            result["exercise_needs"] = self.normalizers.normalize_exercise_needs(
                result["exercise_needs"]
            )

        if "grooming_needs" in result:
            result["grooming_needs"] = self.normalizers.normalize_grooming_needs(
                result["grooming_needs"]
            )

        if "adoption_fee_euros" in result:
            result["adoption_fee_euros"] = self.normalizers.normalize_adoption_fee(
                result["adoption_fee_euros"]
            )

        return result

    def _normalize_boolean_fields(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize boolean fields."""
        result = copy.deepcopy(data)

        boolean_fields = ["yard_required", "ready_to_travel", "vaccinated", "neutered"]

        for field in boolean_fields:
            if field in result:
                result[field] = self.normalizers.normalize_boolean(result[field], field)

        return result

    def _normalize_compatibility_fields(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize compatibility fields."""
        result = copy.deepcopy(data)

        compatibility_fields = [
            "good_with_dogs",
            "good_with_cats",
            "good_with_children",
        ]

        for field in compatibility_fields:
            if field in result:
                result[field] = self.normalizers.normalize_compatibility(result[field])

        return result

    def _normalize_text_fields(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize and truncate text fields."""
        result = copy.deepcopy(data)

        text_limits = {
            "tagline": 50,
            "description": 400,
            "unique_quirk": 150,
            "medical_needs": 200,
            "special_needs": 200,
        }

        for field, limit in text_limits.items():
            if field in result and result[field]:
                if isinstance(result[field], str):
                    result[field] = self.normalizers.smart_truncate(
                        result[field], limit
                    )

        return result

    def _normalize_lists(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize list fields."""
        result = copy.deepcopy(data)

        # Track if we need to add confidence scores
        personality_traits_padded = False
        favorite_activities_defaulted = False

        # Personality traits - FIX: no duplicates
        if "personality_traits" in result:
            traits = result["personality_traits"]
            if not traits or not isinstance(traits, list):
                result["personality_traits"] = ["friendly", "loyal", "gentle"]
                personality_traits_padded = True
            else:
                original_len = len(traits)
                # Pad with default traits to reach 3, without duplicates
                if len(traits) < 3:
                    default_traits = [
                        "gentle",
                        "loyal",
                        "friendly",
                        "calm",
                        "affectionate",
                    ]
                    for trait in default_traits:
                        if trait not in traits:
                            traits.append(trait)
                            if len(traits) >= 3:
                                break
                    # Check if we actually padded
                    if len(traits) > original_len:
                        personality_traits_padded = True
                elif len(traits) > 5:
                    result["personality_traits"] = traits[:5]

        # Favorite activities
        if "favorite_activities" in result:
            activities = result["favorite_activities"]
            if not activities or not isinstance(activities, list):
                result["favorite_activities"] = ["walks", "play"]
                favorite_activities_defaulted = True
            else:
                # Only truncate if > 4, don't pad
                if len(activities) > 4:
                    result["favorite_activities"] = activities[:4]

        # Add confidence scores if needed
        if personality_traits_padded or favorite_activities_defaulted:
            if "confidence_scores" not in result:
                result["confidence_scores"] = {}
            if personality_traits_padded:
                result["confidence_scores"]["personality_traits"] = 0.1
            if favorite_activities_defaulted:
                result["confidence_scores"]["favorite_activities"] = 0.1

        return result

    def _normalize_metadata_fields(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize metadata fields."""
        result = copy.deepcopy(data)

        # Source references
        if "source_references" not in result:
            result["source_references"] = {}

        if isinstance(result["source_references"], dict):
            refs = {}
            for key, value in result["source_references"].items():
                if value is None:
                    refs[key] = "not specified"
                elif isinstance(value, list):
                    refs[key] = "; ".join(str(v) for v in value)
                else:
                    refs[key] = str(value)
            result["source_references"] = refs

            # Add required default references if missing
            if "description" not in result["source_references"]:
                result["source_references"]["description"] = (
                    "generated from available data"
                )
            if "personality_traits" not in result["source_references"]:
                has_breed = "breed" in str(result)
                result["source_references"]["personality_traits"] = (
                    "inferred from breed" if has_breed else "default values"
                )

        # Confidence scores
        if "confidence_scores" in result and isinstance(
            result["confidence_scores"], dict
        ):
            for key in result["confidence_scores"]:
                if result["confidence_scores"][key] is None:
                    result["confidence_scores"][key] = 0.0

        return result

    def _apply_field_specific_fixes(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Apply second-pass field-specific fixes."""
        result = copy.deepcopy(data)

        # Fix good_with_children
        if "good_with_children" in result:
            value = result["good_with_children"]
            if value == "selective" or value not in [
                "yes",
                "no",
                "older_children",
                "unknown",
            ]:
                result["good_with_children"] = "older_children"

        # Fix good_with_cats
        if "good_with_cats" in result:
            value = result["good_with_cats"]
            if value == "selective" or value not in [
                "yes",
                "no",
                "with_training",
                "unknown",
            ]:
                result["good_with_cats"] = "with_training"

        return result

    def _apply_defaults(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Apply default values for missing required fields."""
        result = copy.deepcopy(data)

        # Track if we're setting defaults
        personality_traits_defaulted = "personality_traits" not in result
        favorite_activities_defaulted = "favorite_activities" not in result

        defaults = {
            "trainability": "moderate",
            "confidence": "moderate",
            "yard_required": False,
            "ready_to_travel": True,
            "vaccinated": False,
            "neutered": False,
            "sociability": "selective",
            "energy_level": "medium",
            "experience_level": "some_experience",
            "exercise_needs": "moderate",
            "grooming_needs": "weekly",
            "home_type": "house_preferred",
            "personality_traits": ["friendly", "loyal", "gentle"],
            "favorite_activities": ["walks", "play"],
            "source_references": {},
            "confidence_scores": {
                "description": 0.2,
                "energy_level": 0.2,
                "trainability": 0.2,
            },
        }

        for field, default_value in defaults.items():
            if field not in result:
                result[field] = copy.deepcopy(default_value)

        # Add confidence scores if fields were defaulted
        if personality_traits_defaulted or favorite_activities_defaulted:
            if "confidence_scores" not in result:
                result["confidence_scores"] = {}
            if personality_traits_defaulted:
                result["confidence_scores"]["personality_traits"] = 0.1
            if favorite_activities_defaulted:
                result["confidence_scores"]["favorite_activities"] = 0.1

        # Ensure favorite_activities has at least 2 items
        if not result.get("favorite_activities"):
            result["favorite_activities"] = ["walks", "play"]

        return result
