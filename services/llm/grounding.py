"""Grounding checks for LLM dog profiling.

The prompt builder serialises the entire properties dict into the request, so
the model's only defence against inventing a personality is having real source
text to work from. These pure helpers decide whether a dog has enough of it.
"""

import os
from typing import Any

MIN_SOURCE_TEXT_CHARS = 150


def source_text_length(dog_data: dict[str, Any]) -> int:
    """Length of the longest narrative field in a dog's scraped properties.

    The story is `description` (#568), but some rescues keep narrative in
    other keys too (Many Tears' requirement sections), so the longest
    string value stands in for "the narrative", rather than a per-org key list
    that silently returns zero when an org is missing from it. A list of
    strings counts as its lines: MISIs tells most of a story as bullet points
    (`raw_bullet_points`), and the prompt sends them with the rest.
    """
    properties = dog_data.get("properties")
    if not isinstance(properties, dict):
        return 0

    lengths = [len(_as_text(value)) for value in properties.values()]

    return max(lengths, default=0)


def _as_text(value: Any) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, list) and all(isinstance(item, str) for item in value):
        return "\n".join(value)
    return ""


def minimum_source_chars() -> int:
    """Grounding threshold, overridable for tuning without a code change."""
    raw = os.environ.get("LLM_MIN_SOURCE_CHARS")
    if raw is None:
        return MIN_SOURCE_TEXT_CHARS

    try:
        return int(raw)
    except ValueError:
        return MIN_SOURCE_TEXT_CHARS


def is_sufficiently_grounded(dog_data: dict[str, Any]) -> bool:
    """Whether there is enough source text to profile this dog honestly."""
    return source_text_length(dog_data) >= minimum_source_chars()
