"""German to English translations for Tierschutzverein Europa dog data.

This module provides translation functions for all German text found in the
Tierschutzverein Europa database. All mappings are based on actual production data.
"""

import re
from typing import Optional


def translate_gender(gender: Optional[str]) -> Optional[str]:
    """Translate German gender terms to English standard values.

    Based on production data:
    - Rüde: 202 occurrences -> Male
    - Hündin: 164 occurrences -> Female

    Args:
        gender: German gender string

    Returns:
        Standardized English gender ('Male' or 'Female') or None
    """
    if not gender:
        return None

    gender_lower = gender.lower().strip()

    gender_map = {
        "rüde": "Male",
        "hündin": "Female",
        "weiblich": "Female",
        "männlich": "Male",
    }

    return gender_map.get(gender_lower)


def translate_age(age_text: Optional[str]) -> Optional[str]:
    """Translate German age text to English format expected by base_scraper.py.

    Handles patterns like:
    - "05.2025 (3 Monate alt)" -> "3 months old"
    - "01.2024 (1 Jahr alt)" -> "1 year old"
    - "09.2020 (4 Jahre alt)" -> "4 years old"
    - "1 Jahre" -> "1 year"
    - "2 Jahre" -> "2 years"
    - "Unbekannt" -> None

    Args:
        age_text: German age string

    Returns:
        English age string that base_scraper.py can standardize, or None if unknown/invalid
    """
    if not age_text or not age_text.strip():
        return None

    age_text = age_text.strip()

    # Handle "Unbekannt" (unknown)
    if age_text.lower() == "unbekannt":
        return None

    # Handle full date patterns like "05.2025 (3 Monate alt)" or "01.2024 (1 Jahr alt)"
    match = re.match(
        r"^\d{2}\.\d{4}\s*\((\d+)\s*(Jahr[e]?|Monat[e]?)\s*alt\)$", age_text
    )
    if match:
        number = int(match.group(1))
        unit = match.group(2)

        if "Jahr" in unit:
            if number == 1:
                return "1 year old"
            else:
                return f"{number} years old"
        elif "Monat" in unit:
            if number == 1:
                return "1 month old"
            else:
                return f"{number} months old"

    # Handle simpler patterns like "3 Jahre alt" or "6 Monate alt"
    match = re.match(r"^(\d+)\s*(Jahr[e]?|Monat[e]?)\s*alt$", age_text)
    if match:
        number = int(match.group(1))
        unit = match.group(2)

        if "Jahr" in unit:
            if number == 1:
                return "1 year old"
            else:
                return f"{number} years old"
        elif "Monat" in unit:
            if number == 1:
                return "1 month old"
            else:
                return f"{number} months old"

    # Extract years from patterns like "X Jahre" (without "alt")
    match = re.match(r"^(\d+)\s*Jahre?$", age_text)
    if match:
        years = int(match.group(1))
        if years == 1:
            return "1 year"
        else:
            return f"{years} years"

    # Handle months if present (without "alt")
    match = re.match(r"^(\d+)\s*Monat[e]?$", age_text)
    if match:
        months = int(match.group(1))
        if months == 1:
            return "1 month"
        else:
            return f"{months} months"

    # If we can't parse it, return the original text for debugging
    # This helps us identify patterns we haven't handled yet
    return None


def translate_breed(breed: Optional[str]) -> Optional[str]:
    """Translate German breed names to English.

    Handles common German breed terms and compounds found in production data.

    Args:
        breed: German breed name

    Returns:
        English breed name or original if no translation needed
    """
    if not breed:
        return None

    breed = breed.strip()

    # Handle special quote characters first
    if "„" in breed or '"' in breed:
        breed = breed.replace("„", '"').replace('"', '"')

    # Phrase translations (longer phrases first to avoid partial matches)
    phrase_translations = {
        "wurde mit zwei Müttern gefunden": "found with two mothers",
    }

    # Word translations
    word_translations = {
        "Mischling": "Mixed Breed",
        "Mischlinge": "Mixed Breed",  # Plural form
        "Deutscher Schäferhund": "German Shepherd",
        "Schäferhund": "German Shepherd",
        "Herdenschutzhund": "Livestock Guardian Dog",
        "Herdenschutz": "Livestock Guardian",
        "Jagdhund": "Hunting Dog",
        "Hütehund": "Herding Dog",
        "Wasserhund": "Water Dog",
        "Bretone Epagneul": "Brittany Spaniel",
        "Bodeguero": "Bodeguero Andaluz",  # Keep as Spanish breed name
        "Bodeguera": "Bodeguero Andaluz",  # Female variant
        "Mastin": "Spanish Mastiff",
        "Bardino": "Bardino",  # Canarian breed
        "Bracken": "Hound",
        "Braco Aleman": "German Shorthaired Pointer",
        "Spanischer Windhund": "Spanish Greyhound",
        "Perdiguero de Burgos": "Burgos Pointer",
        "reinrassig": "purebred",
        "vllt.": "possibly",
        "evtl.": "possibly",
        "ggf.": "possibly",
        "und": "and",
        "oder": "or",
        "mit": "with",
        "Mix": "Mix",  # Keep Mix as is
    }

    result = breed

    # Special pattern: "Mix X und Y" -> "X and Y Mix"
    mix_pattern = re.match(r"^Mix\s+(.+)\s+und\s+(.+)$", result)
    if mix_pattern:
        part1 = mix_pattern.group(1)
        part2 = mix_pattern.group(2)
        # Translate individual parts
        for german, english in word_translations.items():
            if german in part1:
                part1 = part1.replace(german, english)
            if german in part2:
                part2 = part2.replace(german, english)
        return f"{part1} and {part2} Mix"

    # Handle compound breeds with "-Mischling" pattern
    result = re.sub(r"(\w+)-Mischling", r"\1 Mix", result)
    result = re.sub(r"(\w+) Mischling(?!\s*\()", r"\1 Mix", result)  # Not followed by (

    # Apply phrase translations first (longer matches)
    for german, english in phrase_translations.items():
        if german in result:
            result = result.replace(german, english)

    # Then apply word translations
    for german, english in word_translations.items():
        if german in result and german != english:  # Avoid replacing if same
            # For abbreviations with periods, don't use word boundaries
            if german.endswith("."):
                result = result.replace(german, english)
            else:
                # Use word boundaries for more accurate replacement
                pattern = r"\b" + re.escape(german) + r"\b"
                result = re.sub(pattern, english, result)

    return result


def normalize_name(name: Optional[str]) -> Optional[str]:
    """Normalize dog names to proper capitalization and remove extra text.

    Handles patterns like:
    - "Strolch (vermittlungshilfe)" -> "Strolch"
    - "Vera (gnadenplatz)" -> "Vera"
    - "Moon (genannt coco)" -> "Moon"
    - "Mo'nique \"vermittlungshilfe\"" -> "Mo'nique"
    - "Benji & dali" -> "Benji & Dali"
    - "BELLA" -> "Bella"

    Args:
        name: Dog name with potential extra text

    Returns:
        Cleaned and properly capitalized name
    """
    if not name:
        return None

    name = name.strip()

    # Remove text in parentheses like (vermittlungshilfe), (gnadenplatz), etc.
    name = re.sub(r"\s*\([^)]*\)", "", name)

    # Remove text in quotes like "vermittlungshilfe"
    name = re.sub(r'\s*"[^"]*"', "", name)

    # Clean up any extra whitespace
    name = " ".join(name.split())

    # Handle special cases with "&" - capitalize both parts
    if "&" in name:
        parts = name.split("&")
        return " & ".join(part.strip().capitalize() for part in parts)

    # Handle hyphenated names
    if "-" in name:
        parts = name.split("-")
        return "-".join(part.capitalize() for part in parts)

    # Handle apostrophes (like Mo'nique)
    if "'" in name:
        # Don't split on apostrophe, just capitalize first letter
        if name.isupper():
            # If all uppercase, use title case
            return name.title()
        else:
            # Otherwise just ensure first letter is capital
            return name[0].upper() + name[1:] if len(name) > 1 else name.upper()

    # Simple capitalization for single words
    return name.capitalize()
