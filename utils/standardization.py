#!/usr/bin/env python3
"""
Standardization utilities for the Rescue Dog Aggregator.

This module provides functions to standardize dog data including:
- Breed standardization
- Age standardization
- Size estimation based on breed
"""

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
    return _get_unified_standardizer()._parse_age_text(age_text)


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
