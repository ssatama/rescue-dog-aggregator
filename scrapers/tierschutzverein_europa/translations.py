"""German to English translations for Tierschutzverein Europa dog data.

This module provides translation functions for all German text found in the
Tierschutzverein Europa database. All mappings are based on actual production data.
"""

import re

# Shoulder height bounds for "Ungefähre Größe" (#563): Small below
# SMALL_BELOW_CM, Medium up to and including MEDIUM_UP_TO_CM, Large above.
SMALL_BELOW_CM = 35
MEDIUM_UP_TO_CM = 55
# Younger dogs are still growing: their height today isn't their adult size
ADULT_FROM_MONTHS = 12

_NUMBER = r"(\d+(?:[.,]\d+)?)"
_HEIGHT_RANGE = re.compile(_NUMBER + r"\s*(?:cm)?\s*(?:-|–|bis)\s*" + _NUMBER + r"\s*cm", re.IGNORECASE)
_HEIGHT = re.compile(_NUMBER + r"\s*cm", re.IGNORECASE)
_SIZE_WORD = r"(mittelgroß|klein|groß)"  # mittelgroß first: it contains groß
_SIZES = {"klein": "Small", "mittelgroß": "Medium", "groß": "Large"}
# The rescue's word for the adult: "klein bleibend", "mittelgroßwerdend", "wird groß"
_ADULT_SIZE_WORD = re.compile(_SIZE_WORD + r"\s*(?:bleibend|werdend)|wird\s+" + _SIZE_WORD, re.IGNORECASE)
_NOT_GROWN = re.compile(r"nicht\s+(?:ganz\s+|voll\s+)?ausgewachsen", re.IGNORECASE)
# The adult's height follows ("Endgröße ca. 40 cm", "ausgewachsen ca. 50 cm")
# or comes before ("55 cm (wenn ausgewachsen)", "37 cm, wächst kaum noch")
_ADULT_HEIGHT = re.compile(r"endgr(?:ö|oe|o)(?:ß|ss)e|\bausgewachsen|kaum noch", re.IGNORECASE)
# \bwachsen keeps "ausgewachsen" (fully grown) out
_GROWING = re.compile(r"wachstum|wächst|\bwachsen|werdend", re.IGNORECASE)
_STATED_AGE = re.compile(r"(\d+)\s*(Jahr|Monat|Woche|Tag)", re.IGNORECASE)


def stated_age_months(age_text: str | None) -> int | None:
    """The age the site states, in whole months: "03.2025 (10 Monate alt)" -> 10."""
    match = _STATED_AGE.search(age_text or "")
    if not match:
        return None
    number, unit = int(match.group(1)), match.group(2).lower()
    return {"jahr": number * 12, "monat": number}.get(unit, 0)


def _height_cm(text: str) -> float | None:
    """The first height in the text; a range counts by its middle."""
    if match := _HEIGHT_RANGE.search(text):
        low, high = (float(group.replace(",", ".")) for group in match.groups())
        return (low + high) / 2
    if match := _HEIGHT.search(text):
        return float(match.group(1).replace(",", "."))
    return None


def translate_size(height_text: str | None, age_months: int | None = None) -> str | None:
    """Adult size from the page's "Ungefähre Größe", by shoulder height.

    "ca. 50 cm, 17 kg" -> Medium; a range counts by its middle ("ca. 60 - 65 cm"
    -> Large). Without a height, the site's word ("mittelgroß"). A dog still
    growing (said so, or younger than ADULT_FROM_MONTHS) has no size yet,
    unless the rescue gives the adult's: "klein bleibend", "Endgröße ca. 40 cm".
    """
    if not height_text:
        return None

    if match := _ADULT_SIZE_WORD.search(height_text):
        return _SIZES[(match.group(1) or match.group(2)).lower()]

    not_grown = _NOT_GROWN.search(height_text)
    text = _NOT_GROWN.sub(" ", height_text)
    adult = _ADULT_HEIGHT.search(text)
    growing = not_grown or _GROWING.search(text) or (age_months is not None and age_months < ADULT_FROM_MONTHS)
    if growing and not adult:
        return None

    height = (_height_cm(text[adult.end() :]) if adult else None) or _height_cm(text)
    if height is not None:
        if height < SMALL_BELOW_CM:
            return "Small"
        return "Medium" if height <= MEDIUM_UP_TO_CM else "Large"

    words = {word.lower() for word in re.findall(_SIZE_WORD, text, re.IGNORECASE)}
    return _SIZES[words.pop()] if len(words) == 1 else None  # "klein bis mittelgroß" is no answer


def translate_gender(gender: str | None) -> str | None:
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


def translate_age(age_text: str | None) -> str | None:
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
    match = re.match(r"^\d{2}\.\d{4}\s*\((\d+)\s*(Jahr[e]?|Monat[e]?|Woche[n]?)\s*alt\)$", age_text)
    if match:
        number = int(match.group(1))
        unit = match.group(2)

        if "Woche" in unit:
            return "1 week old" if number == 1 else f"{number} weeks old"

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

    # Unrecognised: no age rather than German text (the scraper logs it)
    return None


def translate_breed(breed: str | None) -> str | None:
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


def normalize_name(name: str | None) -> str | None:
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
