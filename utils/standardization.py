#!/usr/bin/env python3
"""
Standardization utilities for the Rescue Dog Aggregator.

This module provides functions to standardize dog data including:
- Breed standardization
- Age standardization
- Size estimation based on breed
"""

import re

# Maximum dog age in months (30 years) - covers all recorded lifespans + buffer
# Based on 2024 research: longest verified dog lived 29 years (Bluey)
# This prevents None values that break filters and API endpoints
MAX_DOG_AGE_MONTHS = 360

# Define breed mapping dictionary - comprehensive list covering common breeds
# Format: "Original breed pattern": ("Standardized breed", "Breed group",
# "Size estimate")
BREED_MAPPING = {
    # Sporting Group
    "labrador": ("Labrador Retriever", "Sporting", "Large"),
    "lab retriever": ("Labrador Retriever", "Sporting", "Large"),
    "golden retriever": ("Golden Retriever", "Sporting", "Large"),
    "retriever": ("Retriever", "Sporting", "Large"),
    "cocker spaniel": ("Cocker Spaniel", "Sporting", "Medium"),
    "english springer spaniel": ("English Springer Spaniel", "Sporting", "Medium"),
    "spaniel": ("Spaniel", "Sporting", "Medium"),
    "pointer": ("Pointer", "Sporting", "Large"),
    "setter": ("Setter", "Sporting", "Large"),
    "weimaraner": ("Weimaraner", "Sporting", "Large"),
    "vizsla": ("Vizsla", "Sporting", "Medium"),
    "bretone": ("Brittany", "Sporting", "Medium"),
    "brittany": ("Brittany", "Sporting", "Medium"),
    "perro de agua español": ("Spanish Water Dog", "Sporting", "Medium"),
    "perro de agua español (spanischer water dog)": (
        "Spanish Water Dog",
        "Sporting",
        "Medium",
    ),
    # Hound Group
    "beagle": ("Beagle", "Hound", "Small"),
    "dachshund": ("Dachshund", "Hound", "Small"),
    "dackel": ("Dachshund", "Hound", "Small"),
    "dackel (kurzhaar)": ("Dachshund", "Hound", "Small"),
    "basset hound": ("Basset Hound", "Hound", "Medium"),
    "bloodhound": ("Bloodhound", "Hound", "Large"),
    "greyhound": ("Greyhound", "Hound", "Large"),
    "whippet": ("Whippet", "Hound", "Medium"),
    "afghan hound": ("Afghan Hound", "Hound", "Large"),
    "basenji": ("Basenji", "Hound", "Small"),
    "rhodesian ridgeback": ("Rhodesian Ridgeback", "Hound", "Large"),
    # Spanish Hounds
    "podenco": ("Podenco", "Hound", "Medium"),
    "podenca": ("Podenca", "Hound", "Medium"),
    "podengo portugues grande": ("Podengo Portugues Grande", "Hound", "Large"),
    "podengo portugues pequeno": ("Podengo Portugues Pequeno", "Hound", "Small"),
    "galgo": ("Galgo", "Hound", "Large"),
    "galga": ("Galga", "Hound", "Large"),
    "galgo español": ("Galgo Español", "Hound", "Large"),
    # Working Group
    "boxer": ("Boxer", "Working", "Large"),
    "rottweiler": ("Rottweiler", "Working", "Large"),
    "doberman": ("Doberman Pinscher", "Working", "Large"),
    "pinscher": ("Pinscher", "Working", "Small"),
    "great dane": ("Great Dane", "Working", "XLarge"),
    "mastiff": ("Mastiff", "Working", "XLarge"),
    "saint bernard": ("Saint Bernard", "Working", "XLarge"),
    "newfoundland": ("Newfoundland", "Working", "XLarge"),
    "husky": ("Siberian Husky", "Working", "Medium"),
    "akita": ("Akita", "Working", "Large"),
    "alaskan malamute": ("Alaskan Malamute", "Working", "Large"),
    "bernese mountain dog": ("Bernese Mountain Dog", "Working", "Large"),
    "cane corso": ("Cane Corso", "Working", "Large"),
    "livestock guardian dog": ("Livestock Guardian Dog", "Working", "XLarge"),
    "tschechoslowakischer wolfshund": ("Czechoslovakian Wolfdog", "Working", "Large"),
    "czechoslovakian wolfdog": ("Czechoslovakian Wolfdog", "Working", "Large"),
    # Terrier Group
    "bull terrier": ("Bull Terrier", "Terrier", "Medium"),
    "pit bull": ("American Pit Bull Terrier", "Terrier", "Medium"),
    "pitbull": ("American Pit Bull Terrier", "Terrier", "Medium"),
    "pittie": ("American Pit Bull Terrier", "Terrier", "Medium"),
    "american staffordshire terrier": (
        "American Staffordshire Terrier",
        "Terrier",
        "Medium",
    ),
    "staffordshire bull terrier": ("Staffordshire Bull Terrier", "Terrier", "Medium"),
    "staffordshire terrier": ("Staffordshire Terrier", "Terrier", "Medium"),
    "staffie": ("Staffordshire Bull Terrier", "Terrier", "Medium"),
    "jack russell": ("Jack Russell Terrier", "Terrier", "Small"),
    "jack russell terrier": ("Jack Russell Terrier", "Terrier", "Small"),
    "fox terrier": ("Fox Terrier", "Terrier", "Small"),
    "yorkshire terrier": ("Yorkshire Terrier", "Terrier", "Tiny"),
    "yorkie": ("Yorkshire Terrier", "Terrier", "Tiny"),
    "west highland": ("West Highland White Terrier", "Terrier", "Small"),
    "westie": ("West Highland White Terrier", "Terrier", "Small"),
    "airedale": ("Airedale Terrier", "Terrier", "Medium"),
    "scottish terrier": ("Scottish Terrier", "Terrier", "Small"),
    "cairn terrier": ("Cairn Terrier", "Terrier", "Small"),
    "spanish terrier andaluz": ("Spanish Terrier Andaluz", "Terrier", "Small"),
    "bodeguero andaluz": ("Bodeguero Andaluz", "Terrier", "Small"),
    "bodeguero andaluz andaluz": ("Bodeguero Andaluz", "Terrier", "Small"),
    "bodeguero andaluz espanol": ("Bodeguero Andaluz", "Terrier", "Small"),
    "ratonero bodeguero andaluz": ("Ratonero Bodeguero Andaluz", "Terrier", "Small"),
    "ratonero bodeguero andaluz andaluz": (
        "Ratonero Bodeguero Andaluz",
        "Terrier",
        "Small",
    ),
    "bodeguera andaluz": ("Bodeguero Andaluz", "Terrier", "Small"),
    # Toy Group
    "chihuahua": ("Chihuahua", "Toy", "Tiny"),
    "pomeranian": ("Pomeranian", "Toy", "Tiny"),
    "toy poodle": ("Toy Poodle", "Toy", "Tiny"),
    "shih tzu": ("Shih Tzu", "Toy", "Small"),
    "maltese": ("Maltese", "Toy", "Tiny"),
    "papillon": ("Papillon", "Toy", "Tiny"),
    "pug": ("Pug", "Toy", "Small"),
    "havanese": ("Havanese", "Toy", "Small"),
    "pekingese": ("Pekingese", "Toy", "Small"),
    "italian greyhound": ("Italian Greyhound", "Toy", "Small"),
    # Non-Sporting Group
    "bulldog": ("Bulldog", "Non-Sporting", "Medium"),
    "french bulldog": ("French Bulldog", "Non-Sporting", "Small"),
    "frenchie": ("French Bulldog", "Non-Sporting", "Small"),
    "dalmatian": ("Dalmatian", "Non-Sporting", "Large"),
    "poodle": ("Poodle", "Non-Sporting", "Medium"),
    "standard poodle": ("Standard Poodle", "Non-Sporting", "Medium"),
    "miniature poodle": ("Miniature Poodle", "Non-Sporting", "Small"),
    "boston terrier": ("Boston Terrier", "Non-Sporting", "Small"),
    "bichon frise": ("Bichon Frise", "Non-Sporting", "Small"),
    "chow chow": ("Chow Chow", "Non-Sporting", "Medium"),
    "lhasa apso": ("Lhasa Apso", "Non-Sporting", "Small"),
    "shiba inu": ("Shiba Inu", "Non-Sporting", "Small"),
    # Herding Group
    "german shepherd": ("German Shepherd", "Herding", "Large"),
    "shepherd": ("Shepherd", "Herding", "Large"),
    "gsd": ("German Shepherd", "Herding", "Large"),
    "border collie": ("Border Collie", "Herding", "Medium"),
    "australian shepherd": ("Australian Shepherd", "Herding", "Medium"),
    "aussie": ("Australian Shepherd", "Herding", "Medium"),
    "belgian malinois": ("Belgian Malinois", "Herding", "Large"),
    "welsh corgi": ("Welsh Corgi", "Herding", "Small"),
    "corgi": ("Welsh Corgi", "Herding", "Small"),
    "collie": ("Collie", "Herding", "Large"),
    "shetland sheepdog": ("Shetland Sheepdog", "Herding", "Small"),
    "sheltie": ("Shetland Sheepdog", "Herding", "Small"),
    # Spanish/European breeds
    "bardino": ("Bardino", "Herding", "Medium"),
    "bretone": ("Brittany", "Sporting", "Medium"),
    "bretonen": ("Brittany", "Sporting", "Medium"),
    "basset fauve de bretagne": ("Basset Fauve de Bretagne", "Hound", "Small"),
    "shar pei": ("Shar Pei", "Non-Sporting", "Medium"),
    "sharpei": ("Shar Pei", "Non-Sporting", "Medium"),
    # Common Mixed Breeds
    "labrador mix": ("Labrador Retriever Mix", "Mixed", "Large"),
    "lab mix": ("Labrador Retriever Mix", "Mixed", "Large"),
    "golden retriever mix": ("Golden Retriever Mix", "Mixed", "Large"),
    "shepherd mix": ("Shepherd Mix", "Mixed", "Large"),
    "terrier mix": ("Terrier Mix", "Mixed", "Medium"),
    "spaniel mix": ("Spaniel Mix", "Mixed", "Medium"),
    "poodle mix": ("Poodle Mix", "Mixed", "Medium"),
    "hound mix": ("Hound Mix", "Mixed", "Medium"),
    "hunting dog": ("Hunting Dog", "Sporting", "Large"),
    "hunting dog mix": ("Hunting Dog Mix", "Mixed", "Large"),
    "herding dog": ("Herding Dog", "Herding", "Large"),
    "herding dog mix": ("Herding Dog Mix", "Mixed", "Large"),
    "livestock guardian mix": ("Livestock Guardian Dog Mix", "Mixed", "XLarge"),
    "livestock guardian dog mix": ("Livestock Guardian Dog Mix", "Mixed", "XLarge"),
    "rhodesian ridgeback mix": ("Rhodesian Ridgeback Mix", "Mixed", "Large"),
    "basset fauve de bretagne mix": ("Basset Fauve de Bretagne Mix", "Mixed", "Small"),
    "bardino mix": ("Bardino Mix", "Mixed", "Medium"),
    "bretonen mix": ("Brittany Mix", "Mixed", "Medium"),
    "shar pei mix": ("Shar Pei Mix", "Mixed", "Medium"),
    "sharpei mix": ("Shar Pei Mix", "Mixed", "Medium"),
    "bodeguero andaluz mix": ("Bodeguero Andaluz Mix", "Mixed", "Small"),
    "bodeguera andaluz mix": ("Bodeguero Andaluz Mix", "Mixed", "Small"),
    # Generic categories
    "mixed breed": ("Mixed Breed", "Mixed", "Medium"),
    "mixed": ("Mixed Breed", "Mixed", "Medium"),
    "unknown": ("Unknown", "Unknown", None),
}

# List of common breed indicators for pattern matching
BREED_INDICATORS = [
    "mix",
    "cross",
    "blend",
    "hybrid",
    "combo",
    "mixed",
    "shepherd",
    "retriever",
    "terrier",
    "hound",
    "spaniel",
    "poodle",
]


# Module-level singleton for performance (avoid creating new instance per call)
_unified_standardizer = None


def _get_unified_standardizer():
    """Get or create the singleton UnifiedStandardizer instance."""
    global _unified_standardizer
    if _unified_standardizer is None:
        from utils.unified_standardization import UnifiedStandardizer

        _unified_standardizer = UnifiedStandardizer()
    return _unified_standardizer


def standardize_breed(breed_text: str) -> tuple[str, str, str | None]:
    """
    Standardize a dog breed name.

    Args:
        breed_text: Original breed text from the database

    Returns:
        Tuple of (standardized_breed, breed_group, size_estimate)
    """
    # CRITICAL-2: Use UnifiedStandardizer instead of legacy enhanced_standardizer
    standardizer = _get_unified_standardizer()
    result = standardizer._standardize_breed(breed_text)
    return (result["name"], result["group"], result.get("size"))


def parse_age_text(age_text: str) -> tuple[str | None, int | None, int | None]:
    """
    Parse age text into a standardized age category and month range.

    Args:
        age_text: Text description of age (e.g., "2 years", "6 months", "Young", "6 - 12 months")

    Returns:
        Tuple of (age_category, min_months, max_months)
    """
    if not age_text:
        return None, None, None

    age_text = str(age_text).lower().strip()

    # Handle Dogs Trust specific patterns first
    # Pattern: "Under X months" -> 0 to X months
    under_match = re.search(r"under\s+(\d+)\s*(?:months?|mo)", age_text)
    if under_match:
        max_months = int(under_match.group(1))
        if max_months <= 12:
            return "Puppy", 0, max_months
        else:
            return "Young", 0, max_months

    # Pattern: "X + years" -> X years minimum, capped at max lifespan (for senior dogs)
    plus_years_match = re.search(r"(\d+)\s*\+\s*years?", age_text)
    if plus_years_match:
        min_years = int(plus_years_match.group(1))
        min_months = min_years * 12
        # Determine category based on minimum age
        if min_months >= 96:  # 8+ years
            return (
                "Senior",
                min_months,
                MAX_DOG_AGE_MONTHS,
            )  # Capped max instead of open-ended
        elif min_months >= 60:  # 5+ years
            return "Adult", min_months, MAX_DOG_AGE_MONTHS
        else:
            return "Young", min_months, MAX_DOG_AGE_MONTHS

    # Pattern: "X - Y months/years" -> X to Y range
    range_match = re.search(r"(\d+)\s*-\s*(\d+)\s*(months?|years?|mo|yr)", age_text)
    if range_match:
        min_val = int(range_match.group(1))
        max_val = int(range_match.group(2))
        unit = range_match.group(3).lower()

        # Convert to months if needed
        if "year" in unit or "yr" in unit:
            min_months = min_val * 12
            max_months = max_val * 12
        else:
            min_months = min_val
            max_months = max_val

        # Determine category based on range
        if max_months <= 12:
            return "Puppy", min_months, max_months
        elif max_months <= 36:
            return "Young", min_months, max_months
        elif max_months <= 96:
            return "Adult", min_months, max_months
        else:
            return "Senior", min_months, max_months

    # Check for years pattern (e.g., "2 years", "2.5 y/o") - no negative numbers
    years_match = re.search(r"(?<!-)\b(\d+(?:[.,]\d+)?)\s*(?:years?|y(?:rs?)?(?:\/o)?|yo|jahr)", age_text)
    if years_match:
        try:
            years = float(years_match.group(1).replace(",", "."))
            if years < 0 or years > 25:  # Reasonable bounds for dog age
                return None, None, None
            months = int(years * 12)

            # Determine category
            if months < 12:
                return "Puppy", months, min(months + 2, 12)
            elif months < 36:
                return "Young", months, min(months + 12, 36)
            elif months < 96:
                return "Adult", months, min(months + 12, 96)
            else:
                return "Senior", months, months + 24
        except (ValueError, TypeError):
            # If parsing fails, continue to other patterns
            pass

    # Check for months pattern (e.g., "6 months", "6mo") - no negative numbers
    months_match = re.search(r"(?<!-)\b(\d+)\s*(?:months?|mo|mon)", age_text)
    if months_match:
        try:
            months = int(months_match.group(1))
            if months < 0 or months > 300:  # Reasonable bounds for dog age in months
                return None, None, None
            if months < 12:
                return "Puppy", months, min(months + 2, 12)
            else:
                return "Young", months, min(months + 6, 36)
        except (ValueError, TypeError):
            # If parsing fails, continue to other patterns
            pass

    # Check for weeks pattern (e.g., "10 weeks", "8 wks") - no negative numbers
    weeks_match = re.search(r"(?<!-)\b(\d+)\s*(?:weeks?|wks?)", age_text)
    if weeks_match:
        weeks = int(weeks_match.group(1))
        months = int(weeks / 4.3)  # Approximate conversion
        return "Puppy", months, min(months + 2, 12)

    # Check for birth date pattern (e.g., "Born 03/2020", "03/2020", "Born 2020")
    from datetime import datetime

    current_date = datetime.now()

    # Pattern 1: Born MM/YYYY or MM/YYYY
    birth_date_match = re.search(r"(?:born\s*)?(\d{1,2})[/-](\d{4})", age_text)
    if birth_date_match:
        try:
            birth_month = int(birth_date_match.group(1))
            birth_year = int(birth_date_match.group(2))

            # Validate birth date reasonableness (dogs live max ~15-20 years)
            earliest_reasonable_year = current_date.year - 20
            if birth_year < earliest_reasonable_year or birth_year > current_date.year + 1:
                # Dogs don't live 20+ years, future dates are errors
                return None, None, None

            if birth_month < 1 or birth_month > 12:
                # Invalid month
                return None, None, None

            # Calculate age in months
            age_years = current_date.year - birth_year
            age_months = age_years * 12 + (current_date.month - birth_month)

            # Handle future birth months in current year (assume they meant last year)
            if age_months < 0 and age_years == 0:
                age_months += 12  # Born last year, not this year

            # Ensure non-negative age after adjustment
            if age_months < 0:
                return None, None, None

            # Determine category based on age
            if age_months < 12:
                return "Puppy", max(0, age_months), min(age_months + 2, 12)
            elif age_months < 36:
                return "Young", age_months, min(age_months + 6, 36)
            elif age_months < 96:
                return "Adult", age_months, min(age_months + 12, 96)
            else:
                return "Senior", age_months, age_months + 24
        except (ValueError, TypeError):
            pass

    # Pattern 2: Born YYYY (just year)
    birth_year_match = re.search(r"(?:born\s*)?(\d{4})(?:\s|$)", age_text)
    if birth_year_match and not re.search(r"\d+\s*(?:years?|months?)", age_text):  # Avoid matching "2 years"
        try:
            birth_year = int(birth_year_match.group(1))

            # Validate birth year reasonableness (dogs live max ~15-20 years)
            earliest_reasonable_year = current_date.year - 20
            if birth_year < earliest_reasonable_year or birth_year > current_date.year + 1:
                return None, None, None

            # Assume born in middle of year (June)
            age_years = current_date.year - birth_year
            age_months = age_years * 12 + (current_date.month - 6)

            # Ensure non-negative age
            if age_months < 0:
                return None, None, None

            # Add some uncertainty since we don't know exact month
            if age_months < 12:
                return "Puppy", max(0, age_months - 3), min(age_months + 3, 12)
            elif age_months < 36:
                return "Young", max(12, age_months - 6), min(age_months + 6, 36)
            elif age_months < 96:
                return "Adult", max(36, age_months - 6), min(age_months + 6, 96)
            else:
                return "Senior", max(96, age_months - 6), age_months + 24
        except (ValueError, TypeError):
            pass

    # Check for exact standardized category names first (fastest check)
    if age_text == "puppy":
        return "Puppy", 2, 10
    elif age_text == "young":
        return "Young", 12, 36
    elif age_text == "adult":
        return "Adult", 36, 96
    elif age_text == "senior":
        return "Senior", 96, 240

    # Check for descriptive terms (includes exact matches from above)
    if any(term in age_text for term in ["puppy", "pup", "baby", "young puppy"]):
        return "Puppy", 2, 10
    elif any(term in age_text for term in ["young adult", "adolescent", "juvenile", "teen"]):
        return "Young", 12, 36
    elif any(term in age_text for term in ["adult", "grown", "mature"]):
        return "Adult", 36, 96
    elif any(term in age_text for term in ["senior", "older", "elderly", "old"]):
        return "Senior", 96, 240

    # Handle ranges
    range_match = re.search(r"(\d+)\s*-\s*(\d+)\s*(years?|months?)", age_text)
    if range_match:
        start, end, unit = range_match.groups()
        start, end = int(start), int(end)

        if "month" in unit:
            if end < 12:
                return "Puppy", start, end
            elif end < 36:
                return "Young", start, end
            else:
                return "Adult", start, end
        else:  # years
            start_months, end_months = start * 12, end * 12
            if end < 1:
                return "Puppy", start_months, end_months
            elif end < 3:
                return "Young", start_months, end_months
            elif end < 8:
                return "Adult", start_months, end_months
            else:
                return "Senior", start_months, end_months

    # Check for German "Unbekannt" (Unknown) and English "Unknown"
    if any(unknown in age_text for unknown in ["unbekannt", "unknown"]):
        return None, None, None

    # Check for corrupted data (gender info in age field)
    if any(gender_term in age_text for gender_term in ["geschlecht:", "gender:", "sex:"]):
        return None, None, None

    # If we can't determine, return None
    return None, None, None


def standardize_age(age_text: str) -> dict:
    """
    Standardize age text into structured data.

    Args:
        age_text: Original age text

    Returns:
        Dictionary with age_category, min_months, max_months
    """
    category, min_months, max_months = parse_age_text(age_text)

    return {
        "age_category": category,
        "age_min_months": min_months,
        "age_max_months": max_months,
    }


def get_size_from_breed(breed: str) -> str | None:
    """
    Estimate dog size based on breed.

    Args:
        breed: Standardized breed name

    Returns:
        Size estimate (Tiny, Small, Medium, Large, XLarge) or None if unknown
    """
    # Try to find the breed in our mapping
    clean_breed = breed.lower()

    for original, (_, _, size) in BREED_MAPPING.items():
        if original in clean_breed:
            return size

    # For mixed breeds, try to extract the base breed
    if "mix" in clean_breed:
        base_breed = clean_breed.replace("mix", "").strip()
        for original, (_, _, size) in BREED_MAPPING.items():
            if original in base_breed:
                return size

    return None


def standardize_size_value(size: str) -> str | None:
    """
    Standardize a size value to canonical form.

    Args:
        size: Size value from scraper (e.g., "small", "LARGE", "medium", etc.)

    Returns:
        Standardized size (Tiny, Small, Medium, Large, XLarge) or None if invalid
    """
    if not size or not isinstance(size, str):
        return None

    # Clean and normalize the size value
    clean_size = size.strip().lower()

    # Size mapping to standard categories
    size_mappings = {
        # Standard sizes (case variations)
        "tiny": "Tiny",
        "small": "Small",
        "medium": "Medium",
        "large": "Large",
        "xlarge": "XLarge",
        "x-large": "XLarge",
        "extra large": "XLarge",
        "extra-large": "XLarge",
        # Alternative spellings/formats
        "mini": "Tiny",
        "miniature": "Tiny",
        "toy": "Tiny",
        "sm": "Small",
        "med": "Medium",
        "lg": "Large",
        "xl": "XLarge",
        "xxl": "XLarge",
        # Size ranges/descriptions
        "very small": "Tiny",
        "very large": "XLarge",
        "giant": "XLarge",
        # Weight-based descriptions sometimes used as size
        "lightweight": "Small",
        "heavy": "Large",
    }

    # Direct mapping
    if clean_size in size_mappings:
        return size_mappings[clean_size]

    # Handle hyphenated or compound sizes
    if "-" in clean_size:
        # e.g., "medium-large" -> take the larger size
        parts = clean_size.split("-")
        sizes = [size_mappings.get(part.strip()) for part in parts if part.strip() in size_mappings]
        if sizes:
            # Return the largest size found
            size_order = ["Tiny", "Small", "Medium", "Large", "XLarge"]
            return max(sizes, key=lambda x: size_order.index(x) if x in size_order else -1)

    return None


def apply_standardization(animal_data: dict) -> dict:
    """
    Apply all standardization functions to animal data.

    Args:
        animal_data: Dictionary containing animal information

    Returns:
        Updated dictionary with standardized values
    """
    result = animal_data.copy()

    # Standardize breed
    if "breed" in result and result["breed"]:
        std_breed, breed_group, size_estimate = standardize_breed(result["breed"])
        result["standardized_breed"] = std_breed
        result["breed_group"] = breed_group

        # Set size estimate if we don't already have a standardized size and we
        # got an estimate
        if size_estimate and ("standardized_size" not in result or not result["standardized_size"]):
            result["standardized_size"] = size_estimate

    # Standardize size - NEW: fallback to size field standardization
    if "standardized_size" not in result or not result["standardized_size"]:
        if "size" in result and result["size"]:
            standardized_size = standardize_size_value(result["size"])
            if standardized_size:
                result["standardized_size"] = standardized_size

    # Standardize age
    if "age_text" in result and result["age_text"]:
        age_info = standardize_age(result["age_text"])
        result["age_category"] = age_info["age_category"]
        result["age_min_months"] = age_info["age_min_months"]
        result["age_max_months"] = age_info["age_max_months"]

    return result


def clean_breed_text(breed: str) -> str | None:
    """
    Clean and normalize breed text to remove unclear or problematic entries.

    Args:
        breed: Raw breed text

    Returns:
        Cleaned breed text or None for invalid/empty input
    """
    if not breed or not isinstance(breed, str):
        return None

    breed = breed.strip()
    if not breed or breed.lower() in ["n/a", "na", "none"]:
        return None

    # Handle unclear/meaningless breed categories
    unclear_patterns = ["size mix", "a mix", "other mix", "unknown mix"]

    breed_lower = breed.lower()
    if breed_lower in unclear_patterns:
        return "Mixed Breed"

    # Simplify overly long descriptive names
    if len(breed) > 40:  # Lowered threshold for better simplification
        # Try to extract primary breed from long descriptions
        if "podenco" in breed_lower:
            return "Podenco Mix"
        elif "german shepherd" in breed_lower:
            return "German Shepherd Mix"
        elif "border collie" in breed_lower:
            return "Border Collie Mix"
        elif "beagle" in breed_lower:
            return "Beagle Mix"
        else:
            # Fallback for complex descriptions
            return "Mixed Breed"

    return breed


def normalize_breed_case(breed: str) -> str:
    """
    Normalize breed text to consistent capitalization.

    DEPRECATED: This function is deprecated and will be removed in a future version.
    Use utils.enhanced_breed_standardization.normalize_breed_case_v2() directly.

    Args:
        breed: Breed text to normalize

    Returns:
        Breed text with consistent capitalization
    """
    import warnings

    warnings.warn(
        "normalize_breed_case is deprecated. Use enhanced_breed_standardization.normalize_breed_case_v2() directly.",
        DeprecationWarning,
        stacklevel=2,
    )

    # Always use enhanced version (migration completed)
    from utils.enhanced_breed_standardization import normalize_breed_case_v2

    return normalize_breed_case_v2(breed, use_enhanced=True)


if __name__ == "__main__":
    # Test the standardization functions
    test_breeds = [
        "Labrador Retriever",
        "Golden mix",
        "German Shepherd Dog",
        "unknown breed",
        "Spaniel mix",
        "Pit Bull Terrier",
        "Yorkshire Terrier",
        "Lab/Shepherd Mix",
        "French Bulldog",
    ]

    print("\nBreed Standardization Tests:")
    for breed in test_breeds:
        std_breed, group, size = standardize_breed(breed)
        print(f"{breed:<20} -> {std_breed:<25} (Group: {group:<12}, Size: {size})")

    test_ages = [
        "2 years",
        "6 months",
        "puppy",
        "senior",
        "3.5 y/o",
        "4 yrs",
        "1-2 years",
        "Young adult",
        "10 weeks",
    ]

    print("\nAge Standardization Tests:")
    for age in test_ages:
        age_info = standardize_age(age)
        print(f"{age:<15} -> Category: {age_info['age_category']:<8}, Range: {age_info['age_min_months']}-{age_info['age_max_months']} months")
