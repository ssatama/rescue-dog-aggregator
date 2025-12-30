"""
Text utilities for LLM dog profiler.

Following CLAUDE.md principles:
- Pure functions, no mutations
- Single responsibility
- Clear boundaries
"""


class TextUtilities:
    """Utility methods for text processing."""

    @staticmethod
    def smart_truncate(text: str, max_length: int) -> str:
        """
        Intelligently truncate text at sentence or word boundaries.

        Args:
            text: Text to truncate
            max_length: Maximum allowed length

        Returns:
            Truncated text that ends at a natural boundary
        """
        if len(text) <= max_length:
            return text

        # Try to find the last sentence ending within limit
        sentence_endings = [". ", "! ", "? "]
        best_pos = -1

        for ending in sentence_endings:
            # Look for sentence endings in the allowed range
            search_text = text[:max_length]
            pos = search_text.rfind(ending)
            if pos > best_pos:
                best_pos = pos + 1  # Include the punctuation

        if (
            best_pos > max_length * 0.5
        ):  # Accept if we keep at least 50% of target length
            return text[:best_pos].strip()

        # Fall back to word boundary
        # Find the last space before the limit
        search_text = text[:max_length]
        last_space = search_text.rfind(" ")

        if (
            last_space > max_length * 0.7
        ):  # Accept if we keep at least 70% of target length
            return text[:last_space].strip() + "..."

        # Last resort: hard truncate but try to avoid mid-word
        # Look for a space shortly after the limit
        for i in range(max_length, min(max_length + 20, len(text))):
            if text[i] == " ":
                return text[:i].strip() + "..."

        # Absolute last resort: hard truncate
        return text[: max_length - 3].strip() + "..."
