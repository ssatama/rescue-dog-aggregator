"""
Utility normalizers for LLM profile data.

Following CLAUDE.md principles:
- Small, focused methods (single responsibility)
- Immutable data (no mutations)
- Pure functions (no side effects)
"""

from typing import Any, Optional


class UtilityNormalizers:
    """Utility normalizers for text processing and special fields."""

    @staticmethod
    def smart_truncate(text: str, max_length: int) -> str:
        """Truncate text intelligently at sentence boundaries."""
        if len(text) <= max_length:
            return text

        # First, try to find a complete sentence within the limit
        # Look for sentence endings followed by space or end of string
        sentence_patterns = [
            (". ", 2),  # Period + space
            ("! ", 2),  # Exclamation + space
            ("? ", 2),  # Question + space
            (".", 1),  # Period at end
            ("!", 1),  # Exclamation at end
            ("?", 1),  # Question at end
        ]

        best_pos = -1
        for pattern, offset in sentence_patterns:
            pos = text[:max_length].rfind(pattern)
            if pos > best_pos and pos > max_length * 0.5:  # At least 50% of target
                best_pos = pos + offset - 1  # Adjust for the punctuation

        if best_pos > 0:
            result = text[:best_pos].strip()
            # Make sure we actually end with punctuation
            if result and result[-1] in ".!?":
                return result

        # If no good sentence boundary, try comma or semicolon
        for sep in [", ", "; "]:
            pos = text[:max_length].rfind(sep)
            if pos > max_length * 0.6:  # At least 60% of target
                return text[:pos].strip() + "..."

        # Fall back to word boundary
        truncated = text[:max_length]
        if " " in truncated:
            # Find last complete word
            last_space = truncated.rfind(" ")
            if last_space > max_length * 0.7:  # At least 70% of target
                return text[:last_space].strip() + "..."

        # Last resort: hard truncate but avoid mid-word
        if max_length > 3:
            return text[: max_length - 3].strip() + "..."
        return text[:max_length]

    @staticmethod
    def normalize_adoption_fee(value: Any) -> Optional[int]:
        """Normalize adoption_fee_euros field."""
        # Handle None or empty string
        if value is None or value == "":
            return None
        if isinstance(value, int):
            return value
        # Handle floats - convert to None (not an integer)
        if isinstance(value, float):
            return None
        if isinstance(value, str):
            # Handle "null" string
            if value.lower() == "null":
                return None
            # Handle empty string
            if not value.strip():
                return None
            try:
                return int(float(value))
            except (ValueError, TypeError):
                # Invalid string -> return None
                return None
        return 350  # Default
