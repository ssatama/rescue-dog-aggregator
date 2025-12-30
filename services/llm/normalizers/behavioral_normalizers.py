"""
Behavioral trait normalizers for LLM profile data.

Following CLAUDE.md principles:
- Small, focused methods (single responsibility)
- Immutable data (no mutations)
- Pure functions (no side effects)
"""

from typing import Any


class BehavioralNormalizers:
    """Normalizers for behavioral traits (energy, trainability, sociability, confidence)."""

    @staticmethod
    def normalize_energy_level(value: Any) -> str:
        """Normalize energy_level field."""
        if not value:
            return "medium"

        mappings = {
            "low_energy": "low",
            "medium_energy": "medium",
            "high_energy": "high",
            "very_high_energy": "very_high",
            "moderate": "moderate",
            "very_energetic": "very_high",
            "extreme": "very_high",
            "calm": "low",
            "active": "high",
            "lazy": "low",
            "energetic": "high",
        }

        if isinstance(value, str):
            value_lower = value.lower().strip()
            normalized = mappings.get(value_lower, value_lower)

            # Validate against allowed values
            if normalized not in ["low", "medium", "moderate", "high", "very_high"]:
                return "medium"
            return normalized

        return "medium"

    @staticmethod
    def normalize_trainability(value: Any) -> str:
        """Normalize trainability field."""
        if not value:
            return "moderate"

        mappings = {
            "easy": "easy",
            "very_easy": "easy",
            "hard": "challenging",
            "very_hard": "very_challenging",
            "difficult": "challenging",
            "very_difficult": "very_challenging",
            "expert_needed": "very_challenging",
            "medium": "moderate",
        }

        if isinstance(value, str):
            value_lower = value.lower().strip()
            normalized = mappings.get(value_lower, value_lower)

            # Validate against allowed values
            if normalized not in [
                "easy",
                "moderate",
                "challenging",
                "very_challenging",
            ]:
                return "moderate"
            return normalized

        return "moderate"

    @staticmethod
    def normalize_sociability(value: Any) -> str:
        """Normalize sociability field."""
        if not value:
            return "selective"

        mappings = {
            "friendly": "social",
            "reserved": "selective",
            "shy": "independent",
            "outgoing": "very_social",
            "antisocial": "needs_work",
            "aggressive": "needs_work",
            "medium": "selective",
        }

        if isinstance(value, str):
            value_lower = value.lower().strip()
            normalized = mappings.get(value_lower, value_lower)

            # Validate against allowed values
            if normalized not in [
                "very_social",
                "social",
                "selective",
                "independent",
                "needs_work",
            ]:
                return "selective"
            return normalized

        return "selective"

    @staticmethod
    def normalize_confidence(value: Any) -> str:
        """Normalize confidence field."""
        if not value:
            return "moderate"

        mappings = {
            "medium": "moderate",
            "low": "shy",
            "high": "confident",
            "timid": "very_shy",
            "fearful": "very_shy",
            "bold": "very_confident",
            "anxious": "shy",
        }

        if isinstance(value, str):
            value_lower = value.lower().strip()
            normalized = mappings.get(value_lower, value_lower)

            # Validate against allowed values
            if normalized not in [
                "very_confident",
                "confident",
                "moderate",
                "shy",
                "very_shy",
            ]:
                return "moderate"
            return normalized

        return "moderate"
