"""
Profile normalization for LLM outputs.

Following CLAUDE.md principles:
- Pure functions, no mutations
- Single responsibility
- Clear data transformations
"""

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Union

logger = logging.getLogger(__name__)


@dataclass
class NormalizationRules:
    """Configuration for normalization rules."""

    energy_mappings: Dict[str, str] = field(
        default_factory=lambda: {
            "moderate": "medium",
            "very_energetic": "very_high",
            "energetic": "high",
            "calm": "low",
            "lazy": "low",
            "active": "high",
            "very_active": "very_high",
        }
    )

    trainability_mappings: Dict[str, str] = field(
        default_factory=lambda: {
            "easily_trainable": "easy",
            "easy_to_train": "easy",
            "difficult": "challenging",
            "stubborn": "challenging",
            "independent": "challenging",
            "moderate": "moderate",
            "average": "moderate",
        }
    )

    compatibility_mappings: Dict[str, Dict[str, str]] = field(
        default_factory=lambda: {
            "children": {
                "selective": "older_children",
                "yes": "yes",
                "no": "no",
                "maybe": "older_children",
                "unknown": "unknown",
            },
            "cats": {
                "selective": "maybe",
                "yes": "yes",
                "no": "no",
                "maybe": "maybe",
                "unknown": "unknown",
            },
            "dogs": {
                "selective": "selective",
                "yes": "yes",
                "no": "no",
                "maybe": "selective",
                "unknown": "unknown",
            },
        }
    )

    default_values: Dict[str, Any] = field(
        default_factory=lambda: {
            "energy_level": "medium",
            "trainability": "moderate",
            "sociability": "selective",
            "confidence": "moderate",
            "exercise_needs": "moderate",
            "grooming_needs": "weekly",
            "experience_level": "some_experience",
            "home_type": "house_preferred",
            "yard_required": False,
        }
    )

    list_constraints: Dict[str, Dict[str, Any]] = field(
        default_factory=lambda: {
            "personality_traits": {
                "min": 3,
                "max": 5,
                "defaults": ["friendly", "gentle", "loyal"],
            },
            "favorite_activities": {"min": 2, "max": 4, "defaults": ["walks", "play"]},
        }
    )

    @classmethod
    def from_config(cls) -> "NormalizationRules":
        """Load rules from configuration."""
        # In production, this would load from a config file
        return cls()


class ProfileNormalizer:
    """Normalizes LLM profile outputs to match schema requirements."""

    def __init__(self, rules: Optional[NormalizationRules] = None):
        """
        Initialize normalizer with rules.

        Args:
            rules: Normalization rules to use
        """
        self.rules = rules or NormalizationRules()

    def normalize(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize a complete profile.

        Args:
            profile: Raw profile from LLM

        Returns:
            Normalized profile matching schema
        """
        normalized = profile.copy()

        # Normalize enum fields
        if "energy_level" in normalized:
            normalized["energy_level"] = self.normalize_energy_level(
                normalized["energy_level"]
            )
        elif "energy_level" not in normalized:
            normalized["energy_level"] = self.rules.default_values["energy_level"]

        if "trainability" in normalized:
            normalized["trainability"] = self.normalize_trainability(
                normalized["trainability"]
            )
        elif "trainability" not in normalized:
            normalized["trainability"] = self.rules.default_values["trainability"]

        # Normalize compatibility fields
        for field in ["good_with_children", "good_with_cats", "good_with_dogs"]:
            if field in normalized:
                field_type = field.replace("good_with_", "")
                normalized[field] = self.normalize_compatibility(
                    normalized[field], field_type
                )

        # Normalize list fields
        for field, constraints in self.rules.list_constraints.items():
            if field in normalized:
                normalized[field] = self.normalize_list_field(
                    normalized[field],
                    min_items=constraints["min"],
                    max_items=constraints["max"],
                    default_item=constraints["defaults"][0]
                    if constraints["defaults"]
                    else None,
                )
            elif field not in normalized and constraints["min"] > 0:
                # Add default list if required
                normalized[field] = constraints["defaults"][: constraints["min"]]

        # Normalize boolean fields
        boolean_fields = ["vaccinated", "neutered", "ready_to_travel", "yard_required"]
        for field in boolean_fields:
            if field in normalized:
                normalized[field] = self.normalize_boolean(normalized[field])

        # Normalize numeric fields
        if "adoption_fee_euros" in normalized:
            normalized["adoption_fee_euros"] = self.normalize_numeric(
                normalized["adoption_fee_euros"]
            )

        # Normalize confidence scores
        if "confidence_scores" in normalized:
            normalized["confidence_scores"] = self.normalize_confidence_scores(
                normalized["confidence_scores"]
            )

        # Apply defaults for missing required fields
        for field, default_value in self.rules.default_values.items():
            if field not in normalized:
                normalized[field] = default_value

        return normalized

    def normalize_energy_level(self, value: str) -> str:
        """Normalize energy level to valid enum."""
        if not value:
            return self.rules.default_values["energy_level"]

        value_lower = str(value).lower().strip()

        # Direct match
        if value_lower in ["low", "medium", "high", "very_high"]:
            return value_lower

        # Check mappings
        if value_lower in self.rules.energy_mappings:
            return self.rules.energy_mappings[value_lower]

        # Default
        return self.rules.default_values["energy_level"]

    def normalize_trainability(self, value: str) -> str:
        """Normalize trainability to valid enum."""
        if not value:
            return self.rules.default_values["trainability"]

        value_lower = str(value).lower().strip()

        # Direct match
        if value_lower in ["easy", "moderate", "challenging"]:
            return value_lower

        # Check mappings
        if value_lower in self.rules.trainability_mappings:
            return self.rules.trainability_mappings[value_lower]

        # Default
        return self.rules.default_values["trainability"]

    def normalize_compatibility(self, value: str, field_type: str) -> str:
        """Normalize compatibility fields."""
        if not value:
            return "unknown"

        value_lower = str(value).lower().strip()

        # Get mappings for this field type
        mappings = self.rules.compatibility_mappings.get(field_type, {})

        # Check mappings
        if value_lower in mappings:
            return mappings[value_lower]

        # Direct match for valid values
        if field_type == "children" and value_lower in [
            "yes",
            "no",
            "older_children",
            "unknown",
        ]:
            return value_lower
        elif field_type in ["cats", "dogs"] and value_lower in [
            "yes",
            "no",
            "maybe",
            "selective",
            "unknown",
        ]:
            return value_lower

        return "unknown"

    def normalize_list_field(
        self,
        values: List[str],
        min_items: int,
        max_items: int,
        default_item: Optional[str] = None,
    ) -> List[str]:
        """Normalize list fields to meet constraints."""
        if not values:
            values = []

        # Ensure it's a list
        if not isinstance(values, list):
            values = [values]

        # Filter empty strings
        values = [v for v in values if v and str(v).strip()]

        # Truncate if too many
        if len(values) > max_items:
            values = values[:max_items]

        # Pad if too few
        while len(values) < min_items:
            if default_item:
                values.append(default_item)
            else:
                # Use generic padding
                values.append(f"trait_{len(values) + 1}")

        return values

    def normalize_boolean(self, value: Any) -> Optional[bool]:
        """Normalize boolean values."""
        if value is None:
            return None

        if isinstance(value, bool):
            return value

        value_str = str(value).lower().strip()

        if value_str in ["true", "yes", "1", "on"]:
            return True
        elif value_str in ["false", "no", "0", "off"]:
            return False
        elif value_str in ["null", "none", "unknown"]:
            return None

        return None

    def normalize_numeric(self, value: Any) -> Optional[Union[int, float]]:
        """Normalize numeric values."""
        if value is None:
            return None

        if isinstance(value, (int, float)):
            return value

        value_str = str(value).strip()

        if value_str.lower() in ["null", "none", ""]:
            return None

        try:
            # Try integer first
            if "." not in value_str:
                return int(value_str)
            else:
                return float(value_str)
        except (ValueError, TypeError):
            return None

    def normalize_confidence_scores(self, scores: Dict[str, Any]) -> Dict[str, float]:
        """Normalize confidence scores."""
        normalized = {}

        for key, value in scores.items():
            if value is None:
                normalized[key] = 0.0
            elif isinstance(value, (int, float)):
                # Clamp to 0-1 range
                normalized[key] = max(0.0, min(1.0, float(value)))
            else:
                normalized[key] = 0.0

        return normalized
