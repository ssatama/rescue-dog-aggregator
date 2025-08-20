"""
Compatibility and requirement normalizers for LLM profile data.

Following CLAUDE.md principles:
- Small, focused methods (single responsibility)
- Immutable data (no mutations)
- Pure functions (no side effects)
"""

from typing import Any


class CompatibilityNormalizers:
    """Normalizers for compatibility and living requirement fields."""

    @staticmethod
    def normalize_boolean(value: Any, field_name: str) -> bool:
        """Normalize boolean fields."""
        if isinstance(value, bool):
            return value

        if isinstance(value, str):
            value_lower = value.lower().strip()
            if value_lower in ["true", "yes", "1", "on", "preferred", "required"]:
                return True
            elif value_lower in ["false", "no", "0", "off", "optional", "not required"]:
                return False

        # Default based on field
        if field_name in ["vaccinated", "neutered"]:
            return False
        else:  # yard_required, ready_to_travel
            return True if field_name == "ready_to_travel" else False

    @staticmethod
    def normalize_compatibility(value: Any) -> str:
        """Normalize compatibility fields (good_with_dogs, good_with_cats, good_with_children)."""
        if isinstance(value, bool):
            return "yes" if value else "no"

        if isinstance(value, str):
            value_lower = value.lower().strip()
            if value_lower in ["true", "1"]:
                return "yes"
            elif value_lower in ["false", "0"]:
                return "no"
            elif value_lower in ["on_request", "untested", "unclear"]:
                return "unknown"
            elif value_lower in ["yes", "no", "selective", "unknown", "with_training", "older_children"]:
                return value_lower

        return "unknown"

    @staticmethod
    def normalize_home_type(value: Any) -> str:
        """Normalize home_type field."""
        if not value:
            return "house_preferred"

        mappings = {"apartment": "apartment_ok", "house": "house_preferred", "house_only": "house_required", "farm": "farm_only", "rural": "farm_only", "any": "apartment_ok"}

        if isinstance(value, str):
            value_lower = value.lower().strip()
            normalized = mappings.get(value_lower, value_lower)

            # Validate against allowed values
            if normalized not in ["apartment_ok", "house_preferred", "house_required", "farm_only"]:
                return "house_preferred"
            return normalized

        return "house_preferred"

    @staticmethod
    def normalize_experience_level(value: Any) -> str:
        """Normalize experience_level field."""
        if not value:
            return "some_experience"

        mappings = {
            "first_time_ok": "first_time_ok",
            "beginner": "first_time_ok",
            "novice": "first_time_ok",
            "some_experience": "some_experience",
            "intermediate": "some_experience",
            "experienced": "experienced_only",
            "experienced_only": "experienced_only",
            "advanced": "experienced_only",
            "expert": "experienced_only",
            "any": "first_time_ok",
        }

        if isinstance(value, str):
            value_lower = value.lower().strip()
            normalized = mappings.get(value_lower, value_lower)

            # Validate against allowed values
            if normalized not in ["first_time_ok", "some_experience", "experienced_only"]:
                return "some_experience"
            return normalized

        return "some_experience"

    @staticmethod
    def normalize_exercise_needs(value: Any) -> str:
        """Normalize exercise_needs field."""
        if not value:
            return "moderate"

        mappings = {
            "minimal": "minimal",
            "low": "minimal",
            "moderate": "moderate",
            "medium": "moderate",
            "medium_high": "high",
            "high": "high",
            "very_high": "very_high",
            "athlete": "very_high",
            "none": "minimal",
            "very_low": "minimal",
            "extreme": "very_high",
        }

        if isinstance(value, str):
            value_lower = value.lower().strip()
            normalized = mappings.get(value_lower, value_lower)

            # Validate against allowed values
            if normalized not in ["minimal", "moderate", "high", "very_high"]:
                return "moderate"
            return normalized

        return "moderate"

    @staticmethod
    def normalize_grooming_needs(value: Any) -> str:
        """Normalize grooming_needs field."""
        if not value:
            return "weekly"

        mappings = {
            "minimal": "minimal",
            "none": "minimal",
            "low": "minimal",
            "weekly": "weekly",
            "medium": "weekly",
            "moderate": "weekly",
            "frequent": "frequent",
            "high": "frequent",
            "professional": "professional",
            "very_high": "professional",
            "daily": "frequent",
        }

        if isinstance(value, str):
            value_lower = value.lower().strip()
            # Check if the value maps to a different option
            if value_lower in mappings:
                normalized = mappings[value_lower]
            else:
                normalized = value_lower

            # Validate against allowed values
            if normalized not in ["minimal", "weekly", "frequent", "professional"]:
                return "weekly"
            return normalized

        return "weekly"
