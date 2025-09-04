"""Normalizer module for The Underdog scraper.

This module contains helper functions specific to TheUnderdog's Q&A data structure.
Most standardization is now handled by UnifiedStandardizer via BaseScraper.
"""

import re
from typing import Any, Dict, Optional, Tuple


def extract_qa_data(properties: Dict[str, Any]) -> Dict[str, str]:
    """Extract Q&A data from TheUnderdog's properties structure.

    Args:
        properties: Properties dict potentially containing raw_qa_data

    Returns:
        Dict of Q&A pairs or empty dict if no Q&A data
    """
    if isinstance(properties, dict) and "raw_qa_data" in properties:
        qa_data = properties["raw_qa_data"]
        if isinstance(qa_data, dict):
            return qa_data
    return {}


def extract_size_and_weight_from_qa(qa_data: Dict[str, str]) -> Tuple[Optional[str], Optional[float]]:
    """Extract size and weight from TheUnderdog's Q&A 'How big?' field.

    This handles TheUnderdog-specific patterns like:
    - "Large (around 30kg)" → ("Large", 30.0)
    - "Smaller side of medium" → ("Small", None)
    - "was 35kg, now 30kg" → (None, 30.0) [takes latest weight]

    Args:
        qa_data: Q&A data dict

    Returns:
        Tuple of (size, weight_kg) where either can be None
    """
    how_big = qa_data.get("How big?", "")
    if not how_big:
        return None, None

    size = None
    weight_kg = None

    # Normalize the text
    text_lower = how_big.lower().strip()

    # Size mappings for TheUnderdog-specific phrases
    size_mappings = {"tiny": "Tiny", "small": "Small", "medium": "Medium", "large": "Large", "xlarge": "XLarge", "x-large": "XLarge", "extra large": "XLarge"}

    # Special cases for relative sizes
    if "smaller side of medium" in text_lower:
        size = "Small"
    elif "larger side of medium" in text_lower:
        size = "Large"
    elif "smaller side of large" in text_lower:
        size = "Medium"
    else:
        # Standard size extraction
        for key, value in size_mappings.items():
            if key in text_lower:
                size = value
                break

    # Weight extraction patterns
    weight_patterns = [
        # "now 30kg" (latest weight after diet)
        r"now\s+(\d+(?:\.\d+)?)\s*kg",
        # Standard patterns
        r"(\d+(?:\.\d+)?)\s*kg",
        r"around\s+(\d+(?:\.\d+)?)\s*kg",
        r"approximately\s+(\d+(?:\.\d+)?)\s*kg",
        r"about\s+(\d+(?:\.\d+)?)\s*kg",
        r"\((\d+(?:\.\d+)?)\s*kg\)",
    ]

    for pattern in weight_patterns:
        matches = re.findall(pattern, text_lower)
        if matches:
            # Take the last match (most recent weight if multiple)
            try:
                weight_kg = float(matches[-1])
                break
            except (ValueError, IndexError):
                continue

    return size, weight_kg
