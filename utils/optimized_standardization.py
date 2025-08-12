"""
Optimized standardization utilities with caching and immutable data patterns.
Follows CLAUDE.md principles: immutable data, pure functions, performance optimization.
"""

import re
from dataclasses import dataclass
from datetime import datetime
from functools import lru_cache
from typing import Dict, Optional

# Maximum dog age in months (30 years) - covers all recorded lifespans + buffer
# Based on 2024 research: longest verified dog lived 29 years (Bluey)
# This prevents None values that break filters and API endpoints
MAX_DOG_AGE_MONTHS = 360

# Pre-compiled regex patterns for performance
_COMPILED_PATTERNS = {
    "years": re.compile(r"(?<!-)\b(\d+(?:[.,]\d+)?)\s*(?:years?|y(?:rs?)?(?:\/o)?|yo|jahr)"),
    "months": re.compile(r"(?<!-)\b(\d+)\s*(?:months?|mo|mon)"),
    "weeks": re.compile(r"(?<!-)\b(\d+)\s*(?:weeks?|wks?)"),
    "birth_date": re.compile(r"(?:born\s*)?(\d{1,2})[/-](\d{4})", re.IGNORECASE),
    "birth_year": re.compile(r"(?:born\s*)?(\d{4})(?:\s|$)", re.IGNORECASE),
    "range": re.compile(r"(\d+)\s*-\s*(\d+)\s*(years?|months?)"),
    "senior_plus": re.compile(r"(\d+)\s*\+\s*years?", re.IGNORECASE),
}


@dataclass(frozen=True)
class BreedInfo:
    """Immutable breed information."""

    standardized_name: str
    breed_group: str
    size_estimate: Optional[str] = None


@dataclass(frozen=True)
class AgeInfo:
    """Immutable age information."""

    category: Optional[str] = None
    min_months: Optional[int] = None
    max_months: Optional[int] = None


@dataclass(frozen=True)
class StandardizedAnimal:
    """Immutable standardized animal data."""

    # Original data (preserved)
    name: str
    breed: Optional[str] = None
    age_text: Optional[str] = None
    size: Optional[str] = None

    # Standardized data
    standardized_breed: Optional[str] = None
    breed_group: Optional[str] = None
    age_category: Optional[str] = None
    age_min_months: Optional[int] = None
    age_max_months: Optional[int] = None
    standardized_size: Optional[str] = None

    def to_dict(self) -> Dict:
        """Convert to dictionary for backward compatibility."""
        return {
            "name": self.name,
            "breed": self.breed,
            "age_text": self.age_text,
            "size": self.size,
            "standardized_breed": self.standardized_breed,
            "breed_group": self.breed_group,
            "age_category": self.age_category,
            "age_min_months": self.age_min_months,
            "age_max_months": self.age_max_months,
            "standardized_size": self.standardized_size,
        }


# Immutable breed mapping with better organization
BREED_MAPPING = {
    # Sporting Group
    "labrador": BreedInfo("Labrador Retriever", "Sporting", "Large"),
    "lab retriever": BreedInfo("Labrador Retriever", "Sporting", "Large"),
    "golden retriever": BreedInfo("Golden Retriever", "Sporting", "Large"),
    "retriever": BreedInfo("Retriever", "Sporting", "Large"),
    "cocker spaniel": BreedInfo("Cocker Spaniel", "Sporting", "Medium"),
    "english springer spaniel": BreedInfo("English Springer Spaniel", "Sporting", "Medium"),
    "spaniel": BreedInfo("Spaniel", "Sporting", "Medium"),
    "pointer": BreedInfo("Pointer", "Sporting", "Large"),
    "setter": BreedInfo("Setter", "Sporting", "Large"),
    "weimaraner": BreedInfo("Weimaraner", "Sporting", "Large"),
    "vizsla": BreedInfo("Vizsla", "Sporting", "Medium"),
    # Hound Group
    "beagle": BreedInfo("Beagle", "Hound", "Small"),
    "dachshund": BreedInfo("Dachshund", "Hound", "Small"),
    "basset hound": BreedInfo("Basset Hound", "Hound", "Medium"),
    "bloodhound": BreedInfo("Bloodhound", "Hound", "Large"),
    "greyhound": BreedInfo("Greyhound", "Hound", "Large"),
    "whippet": BreedInfo("Whippet", "Hound", "Medium"),
    "afghan hound": BreedInfo("Afghan Hound", "Hound", "Large"),
    "basenji": BreedInfo("Basenji", "Hound", "Small"),
    "podenco": BreedInfo("Podenco", "Hound", "Medium"),
    "podenca": BreedInfo("Podenca", "Hound", "Medium"),
    "galgo": BreedInfo("Galgo", "Hound", "Large"),
    "galga": BreedInfo("Galga", "Hound", "Large"),
    "galgo español": BreedInfo("Galgo Español", "Hound", "Large"),
    # Working Group
    "boxer": BreedInfo("Boxer", "Working", "Large"),
    "rottweiler": BreedInfo("Rottweiler", "Working", "Large"),
    "doberman": BreedInfo("Doberman Pinscher", "Working", "Large"),
    "great dane": BreedInfo("Great Dane", "Working", "XLarge"),
    "mastiff": BreedInfo("Mastiff", "Working", "XLarge"),
    "saint bernard": BreedInfo("Saint Bernard", "Working", "XLarge"),
    "newfoundland": BreedInfo("Newfoundland", "Working", "XLarge"),
    "husky": BreedInfo("Siberian Husky", "Working", "Medium"),
    "akita": BreedInfo("Akita", "Working", "Large"),
    "alaskan malamute": BreedInfo("Alaskan Malamute", "Working", "Large"),
    "bernese mountain dog": BreedInfo("Bernese Mountain Dog", "Working", "Large"),
    "cane corso": BreedInfo("Cane Corso", "Working", "Large"),
    # Terrier Group
    "bull terrier": BreedInfo("Bull Terrier", "Terrier", "Medium"),
    "pit bull": BreedInfo("American Pit Bull Terrier", "Terrier", "Medium"),
    "pitbull": BreedInfo("American Pit Bull Terrier", "Terrier", "Medium"),
    "pittie": BreedInfo("American Pit Bull Terrier", "Terrier", "Medium"),
    "american staffordshire terrier": BreedInfo("American Staffordshire Terrier", "Terrier", "Medium"),
    "staffordshire bull terrier": BreedInfo("Staffordshire Bull Terrier", "Terrier", "Medium"),
    "staffie": BreedInfo("Staffordshire Bull Terrier", "Terrier", "Medium"),
    "jack russell": BreedInfo("Jack Russell Terrier", "Terrier", "Small"),
    "jack russell terrier": BreedInfo("Jack Russell Terrier", "Terrier", "Small"),
    "yorkshire terrier": BreedInfo("Yorkshire Terrier", "Terrier", "Tiny"),
    "yorkie": BreedInfo("Yorkshire Terrier", "Terrier", "Tiny"),
    "west highland": BreedInfo("West Highland White Terrier", "Terrier", "Small"),
    "westie": BreedInfo("West Highland White Terrier", "Terrier", "Small"),
    "airedale": BreedInfo("Airedale Terrier", "Terrier", "Medium"),
    "scottish terrier": BreedInfo("Scottish Terrier", "Terrier", "Small"),
    "cairn terrier": BreedInfo("Cairn Terrier", "Terrier", "Small"),
    # Toy Group
    "chihuahua": BreedInfo("Chihuahua", "Toy", "Tiny"),
    "pomeranian": BreedInfo("Pomeranian", "Toy", "Tiny"),
    "toy poodle": BreedInfo("Toy Poodle", "Toy", "Tiny"),
    "shih tzu": BreedInfo("Shih Tzu", "Toy", "Small"),
    "maltese": BreedInfo("Maltese", "Toy", "Tiny"),
    "papillon": BreedInfo("Papillon", "Toy", "Tiny"),
    "pug": BreedInfo("Pug", "Toy", "Small"),
    "havanese": BreedInfo("Havanese", "Toy", "Small"),
    "pekingese": BreedInfo("Pekingese", "Toy", "Small"),
    "italian greyhound": BreedInfo("Italian Greyhound", "Toy", "Small"),
    # Non-Sporting Group
    "bulldog": BreedInfo("Bulldog", "Non-Sporting", "Medium"),
    "french bulldog": BreedInfo("French Bulldog", "Non-Sporting", "Small"),
    "frenchie": BreedInfo("French Bulldog", "Non-Sporting", "Small"),
    "dalmatian": BreedInfo("Dalmatian", "Non-Sporting", "Large"),
    "poodle": BreedInfo("Poodle", "Non-Sporting", "Medium"),
    "standard poodle": BreedInfo("Standard Poodle", "Non-Sporting", "Medium"),
    "miniature poodle": BreedInfo("Miniature Poodle", "Non-Sporting", "Small"),
    "boston terrier": BreedInfo("Boston Terrier", "Non-Sporting", "Small"),
    "bichon frise": BreedInfo("Bichon Frise", "Non-Sporting", "Small"),
    "chow chow": BreedInfo("Chow Chow", "Non-Sporting", "Medium"),
    "lhasa apso": BreedInfo("Lhasa Apso", "Non-Sporting", "Small"),
    "shiba inu": BreedInfo("Shiba Inu", "Non-Sporting", "Small"),
    # Herding Group
    "german shepherd": BreedInfo("German Shepherd", "Herding", "Large"),
    "shepherd": BreedInfo("Shepherd", "Herding", "Large"),
    "gsd": BreedInfo("German Shepherd", "Herding", "Large"),
    "border collie": BreedInfo("Border Collie", "Herding", "Medium"),
    "australian shepherd": BreedInfo("Australian Shepherd", "Herding", "Medium"),
    "aussie": BreedInfo("Australian Shepherd", "Herding", "Medium"),
    "belgian malinois": BreedInfo("Belgian Malinois", "Herding", "Large"),
    "welsh corgi": BreedInfo("Welsh Corgi", "Herding", "Small"),
    "corgi": BreedInfo("Welsh Corgi", "Herding", "Small"),
    "collie": BreedInfo("Collie", "Herding", "Large"),
    "shetland sheepdog": BreedInfo("Shetland Sheepdog", "Herding", "Small"),
    "sheltie": BreedInfo("Shetland Sheepdog", "Herding", "Small"),
    # Mixed Breeds
    "labrador mix": BreedInfo("Labrador Retriever Mix", "Mixed", "Large"),
    "lab mix": BreedInfo("Labrador Retriever Mix", "Mixed", "Large"),
    "golden retriever mix": BreedInfo("Golden Retriever Mix", "Mixed", "Large"),
    "shepherd mix": BreedInfo("Shepherd Mix", "Mixed", "Large"),
    "terrier mix": BreedInfo("Terrier Mix", "Mixed", "Medium"),
    "spaniel mix": BreedInfo("Spaniel Mix", "Mixed", "Medium"),
    "poodle mix": BreedInfo("Poodle Mix", "Mixed", "Medium"),
    "hound mix": BreedInfo("Hound Mix", "Mixed", "Medium"),
    "mixed breed": BreedInfo("Mixed Breed", "Mixed", "Medium"),
    "mixed": BreedInfo("Mixed Breed", "Mixed", "Medium"),
    "other dog": BreedInfo("Mixed Breed", "Mixed", "Medium"),
    "puppy/teen": BreedInfo("Mixed Breed", "Mixed", "Medium"),
    "unknown": BreedInfo("Unknown", "Unknown", None),
}

# Size mapping for performance
SIZE_MAPPINGS = {
    "tiny": "Tiny",
    "small": "Small",
    "medium": "Medium",
    "large": "Large",
    "xlarge": "XLarge",
    "x-large": "XLarge",
    "extra large": "XLarge",
    "extra-large": "XLarge",
    "mini": "Tiny",
    "miniature": "Tiny",
    "toy": "Tiny",
    "sm": "Small",
    "med": "Medium",
    "lg": "Large",
    "xl": "XLarge",
    "xxl": "XLarge",
    "very small": "Tiny",
    "very large": "XLarge",
    "giant": "XLarge",
    "lightweight": "Small",
    "heavy": "Large",
}


@lru_cache(maxsize=1000)
def standardize_breed(breed_text: str) -> BreedInfo:
    """
    Standardize breed text (cached for performance).

    Args:
        breed_text: Original breed text

    Returns:
        BreedInfo with standardized data
    """
    if not breed_text or not isinstance(breed_text, str):
        return BreedInfo("Unknown", "Unknown", None)

    clean_text = breed_text.strip().lower()

    if not clean_text:
        return BreedInfo("Unknown", "Unknown", None)

    # Exact match (fastest)
    if clean_text in BREED_MAPPING:
        return BREED_MAPPING[clean_text]

    # Partial match
    for pattern, breed_info in BREED_MAPPING.items():
        if pattern in clean_text:
            # Handle mix breeds
            if any(mix_word in clean_text for mix_word in ["mix", "cross", "mixed"]):
                if "Mix" not in breed_info.standardized_name:
                    return BreedInfo(f"{breed_info.standardized_name} Mix", "Mixed", breed_info.size_estimate)
            return breed_info

    # Handle unmatched mix breeds
    if any(mix_word in clean_text for mix_word in ["mix", "cross", "mixed"]):
        return BreedInfo("Mixed Breed", "Mixed", None)

    # Fallback: capitalize original
    capitalized = " ".join(word.capitalize() for word in clean_text.split())
    return BreedInfo(capitalized, "Unknown", None)


@lru_cache(maxsize=500)
def parse_age_text(age_text: str) -> AgeInfo:
    """
    Parse age text into structured data (cached for performance).

    Args:
        age_text: Age description text

    Returns:
        AgeInfo with parsed data
    """
    if not age_text:
        return AgeInfo()

    age_text = str(age_text).lower().strip()

    # Years pattern
    years_match = _COMPILED_PATTERNS["years"].search(age_text)
    if years_match:
        try:
            years = float(years_match.group(1).replace(",", "."))
            if 0 <= years <= 25:
                months = int(years * 12)
                return _categorize_age_from_months(months)
        except (ValueError, TypeError):
            pass

    # Months pattern
    months_match = _COMPILED_PATTERNS["months"].search(age_text)
    if months_match:
        try:
            months = int(months_match.group(1))
            if 0 <= months <= 300:
                return _categorize_age_from_months(months)
        except (ValueError, TypeError):
            pass

    # Weeks pattern
    weeks_match = _COMPILED_PATTERNS["weeks"].search(age_text)
    if weeks_match:
        try:
            weeks = int(weeks_match.group(1))
            months = int(weeks / 4.3)
            return AgeInfo("Puppy", months, min(months + 2, 12))
        except (ValueError, TypeError):
            pass

    # Birth date patterns
    birth_info = _parse_birth_date(age_text)
    if birth_info:
        return birth_info

    # Descriptive terms
    descriptive_info = _parse_descriptive_age(age_text)
    if descriptive_info:
        return descriptive_info

    # Senior plus years pattern (e.g., "8 + years")
    senior_plus_match = _COMPILED_PATTERNS["senior_plus"].search(age_text)
    if senior_plus_match:
        try:
            years = int(senior_plus_match.group(1))
            if years >= 8:  # Senior dogs 8+ years
                min_months = years * 12
                return AgeInfo("Senior", min_months, MAX_DOG_AGE_MONTHS)
        except (ValueError, TypeError):
            pass

    # Range patterns
    range_info = _parse_age_range(age_text)
    if range_info:
        return range_info

    return AgeInfo()


def _categorize_age_from_months(months: int) -> AgeInfo:
    """Categorize age from months value."""
    if months < 12:
        return AgeInfo("Puppy", months, min(months + 2, 12))
    elif months < 36:
        return AgeInfo("Young", months, min(months + 12, 36))
    elif months < 96:
        return AgeInfo("Adult", months, min(months + 12, 96))
    else:
        return AgeInfo("Senior", months, months + 24)


def _parse_birth_date(age_text: str) -> Optional[AgeInfo]:
    """Parse birth date from age text."""
    current_date = datetime.now()

    # MM/YYYY format
    birth_date_match = _COMPILED_PATTERNS["birth_date"].search(age_text)
    if birth_date_match:
        try:
            birth_month = int(birth_date_match.group(1))
            birth_year = int(birth_date_match.group(2))

            # Validate
            if not (1 <= birth_month <= 12):
                return None
            if not (current_date.year - 20 <= birth_year <= current_date.year + 1):
                return None

            # Calculate age
            age_months = (current_date.year - birth_year) * 12 + (current_date.month - birth_month)
            if age_months < 0:
                age_months += 12

            if age_months >= 0:
                return _categorize_age_from_months(age_months)
        except (ValueError, TypeError):
            pass

    # YYYY format
    birth_year_match = _COMPILED_PATTERNS["birth_year"].search(age_text)
    if birth_year_match and not _COMPILED_PATTERNS["years"].search(age_text):
        try:
            birth_year = int(birth_year_match.group(1))
            if current_date.year - 20 <= birth_year <= current_date.year + 1:
                age_months = (current_date.year - birth_year) * 12 + (current_date.month - 6)
                if age_months >= 0:
                    return AgeInfo(*_categorize_age_from_months(age_months)[:1], max(0, age_months - 6), age_months + 6)
        except (ValueError, TypeError):
            pass

    return None


def _parse_descriptive_age(age_text: str) -> Optional[AgeInfo]:
    """Parse descriptive age terms."""
    # Exact matches first
    if age_text == "puppy":
        return AgeInfo("Puppy", 2, 10)
    elif age_text == "young":
        return AgeInfo("Young", 12, 36)
    elif age_text == "adult":
        return AgeInfo("Adult", 36, 96)
    elif age_text == "senior":
        return AgeInfo("Senior", 96, 240)

    # Partial matches
    if any(term in age_text for term in ["puppy", "pup", "baby", "young puppy"]):
        return AgeInfo("Puppy", 2, 10)
    elif any(term in age_text for term in ["young adult", "adolescent", "juvenile", "teen"]):
        return AgeInfo("Young", 12, 36)
    elif any(term in age_text for term in ["adult", "grown", "mature"]):
        return AgeInfo("Adult", 36, 96)
    elif any(term in age_text for term in ["senior", "older", "elderly", "old"]):
        return AgeInfo("Senior", 96, 240)

    return None


def _parse_age_range(age_text: str) -> Optional[AgeInfo]:
    """Parse age ranges."""
    range_match = _COMPILED_PATTERNS["range"].search(age_text)
    if range_match:
        try:
            start, end, unit = range_match.groups()
            start, end = int(start), int(end)

            if "month" in unit:
                category = _categorize_age_from_months(end).category
                return AgeInfo(category, start, end)
            else:  # years
                start_months, end_months = start * 12, end * 12
                category = _categorize_age_from_months(end_months).category
                return AgeInfo(category, start_months, end_months)
        except (ValueError, TypeError):
            pass

    return None


@lru_cache(maxsize=200)
def standardize_size_value(size: str) -> Optional[str]:
    """
    Standardize size value (cached for performance).

    Args:
        size: Size description

    Returns:
        Standardized size or None
    """
    if not size or not isinstance(size, str):
        return None

    clean_size = size.strip().lower()

    # Direct mapping
    if clean_size in SIZE_MAPPINGS:
        return SIZE_MAPPINGS[clean_size]

    # Handle hyphenated sizes
    if "-" in clean_size:
        parts = clean_size.split("-")
        sizes = [SIZE_MAPPINGS.get(part.strip()) for part in parts if part.strip() in SIZE_MAPPINGS]
        if sizes:
            size_order = ["Tiny", "Small", "Medium", "Large", "XLarge"]
            return max(sizes, key=lambda x: size_order.index(x) if x in size_order else -1)

    return None


def standardize_animal_data(animal_data: Dict) -> StandardizedAnimal:
    """
    Standardize animal data following immutability principles.

    Args:
        animal_data: Original animal data dictionary

    Returns:
        StandardizedAnimal with all standardized fields
    """
    # Extract original fields
    name = animal_data.get("name", "")
    breed = animal_data.get("breed")
    age_text = animal_data.get("age_text")
    size = animal_data.get("size")

    # Initialize standardized fields
    standardized_breed = None
    breed_group = None
    age_category = None
    age_min_months = None
    age_max_months = None
    standardized_size = None

    # Standardize breed
    if breed:
        breed_info = standardize_breed(breed)
        standardized_breed = breed_info.standardized_name
        breed_group = breed_info.breed_group
        standardized_size = breed_info.size_estimate

    # Standardize age
    if age_text:
        age_info = parse_age_text(age_text)
        age_category = age_info.category
        age_min_months = age_info.min_months
        age_max_months = age_info.max_months

    # Standardize size (fallback to size field if no breed estimate)
    if not standardized_size and size:
        standardized_size = standardize_size_value(size)

    return StandardizedAnimal(
        name=name,
        breed=breed,
        age_text=age_text,
        size=size,
        standardized_breed=standardized_breed,
        breed_group=breed_group,
        age_category=age_category,
        age_min_months=age_min_months,
        age_max_months=age_max_months,
        standardized_size=standardized_size,
    )


def apply_standardization(animal_data: Dict) -> Dict:
    """
    Apply standardization and return new dictionary (backward compatibility).

    Args:
        animal_data: Original animal data

    Returns:
        New dictionary with standardized fields
    """
    standardized = standardize_animal_data(animal_data)

    # Merge with original data for backward compatibility
    result = animal_data.copy()
    result.update(standardized.to_dict())

    return result


def clear_standardization_cache():
    """Clear all caches (for testing)."""
    standardize_breed.cache_clear()
    parse_age_text.cache_clear()
    standardize_size_value.cache_clear()


def get_cache_info():
    """Get cache statistics."""
    return {
        "breed_cache": standardize_breed.cache_info(),
        "age_cache": parse_age_text.cache_info(),
        "size_cache": standardize_size_value.cache_info(),
    }
