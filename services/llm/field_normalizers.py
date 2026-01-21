"""
Unified field normalizers that delegate to specialized classes.

Following CLAUDE.md principles:
- Small file (<200 lines)
- Single responsibility (coordination)
- Immutable data (no mutations)
"""

from typing import Any

from .normalizers import (
    BehavioralNormalizers,
    CompatibilityNormalizers,
    UtilityNormalizers,
)


class FieldNormalizers:
    """Unified interface for all field normalizers."""

    def __init__(self):
        self.behavioral = BehavioralNormalizers()
        self.compatibility = CompatibilityNormalizers()
        self.utility = UtilityNormalizers()

    # Behavioral normalizers
    @staticmethod
    def normalize_energy_level(value: Any) -> str:
        return BehavioralNormalizers.normalize_energy_level(value)

    @staticmethod
    def normalize_trainability(value: Any) -> str:
        return BehavioralNormalizers.normalize_trainability(value)

    @staticmethod
    def normalize_sociability(value: Any) -> str:
        return BehavioralNormalizers.normalize_sociability(value)

    @staticmethod
    def normalize_confidence(value: Any) -> str:
        return BehavioralNormalizers.normalize_confidence(value)

    # Compatibility normalizers
    @staticmethod
    def normalize_boolean(value: Any, field_name: str) -> bool:
        return CompatibilityNormalizers.normalize_boolean(value, field_name)

    @staticmethod
    def normalize_compatibility(value: Any) -> str:
        return CompatibilityNormalizers.normalize_compatibility(value)

    @staticmethod
    def normalize_home_type(value: Any) -> str:
        return CompatibilityNormalizers.normalize_home_type(value)

    @staticmethod
    def normalize_experience_level(value: Any) -> str:
        return CompatibilityNormalizers.normalize_experience_level(value)

    @staticmethod
    def normalize_exercise_needs(value: Any) -> str:
        return CompatibilityNormalizers.normalize_exercise_needs(value)

    @staticmethod
    def normalize_grooming_needs(value: Any) -> str:
        return CompatibilityNormalizers.normalize_grooming_needs(value)

    # Utility normalizers
    @staticmethod
    def smart_truncate(text: str, max_length: int) -> str:
        return UtilityNormalizers.smart_truncate(text, max_length)

    @staticmethod
    def normalize_adoption_fee(value: Any) -> int | None:
        return UtilityNormalizers.normalize_adoption_fee(value)
