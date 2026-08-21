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

    Scrapers disagree on where narrative text goes - `description`,
    `raw_description`, `Beschreibung`, `page_text_excerpt` - so the longest
    string value stands in for "the narrative", rather than a per-org key list
    that silently returns zero when an org is missing from it.
    """
    properties = dog_data.get("properties")
    if not isinstance(properties, dict):
        return 0

    lengths = [len(value) for value in properties.values() if isinstance(value, str)]

    return max(lengths, default=0)


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
