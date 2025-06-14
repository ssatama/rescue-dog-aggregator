#!/usr/bin/env python3
"""
Standardization utilities for the Rescue Dog Aggregator.

This module provides functions to standardize dog data including:
- Breed standardization
- Age standardization
- Size estimation based on breed
"""

import re
from typing import Dict, Optional, Tuple

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
    # Hound Group
    "beagle": ("Beagle", "Hound", "Small"),
    "dachshund": ("Dachshund", "Hound", "Small"),
    "basset hound": ("Basset Hound", "Hound", "Medium"),
    "bloodhound": ("Bloodhound", "Hound", "Large"),
    "greyhound": ("Greyhound", "Hound", "Large"),
    "whippet": ("Whippet", "Hound", "Medium"),
    "afghan hound": ("Afghan Hound", "Hound", "Large"),
    "basenji": ("Basenji", "Hound", "Small"),
    # Working Group
    "boxer": ("Boxer", "Working", "Large"),
    "rottweiler": ("Rottweiler", "Working", "Large"),
    "doberman": ("Doberman Pinscher", "Working", "Large"),
    "great dane": ("Great Dane", "Working", "XLarge"),
    "mastiff": ("Mastiff", "Working", "XLarge"),
    "saint bernard": ("Saint Bernard", "Working", "XLarge"),
    "newfoundland": ("Newfoundland", "Working", "XLarge"),
    "husky": ("Siberian Husky", "Working", "Medium"),
    "akita": ("Akita", "Working", "Large"),
    "alaskan malamute": ("Alaskan Malamute", "Working", "Large"),
    "bernese mountain dog": ("Bernese Mountain Dog", "Working", "Large"),
    "cane corso": ("Cane Corso", "Working", "Large"),
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
    "staffie": ("Staffordshire Bull Terrier", "Terrier", "Medium"),
    "jack russell": ("Jack Russell Terrier", "Terrier", "Small"),
    "jack russell terrier": ("Jack Russell Terrier", "Terrier", "Small"),
    "yorkshire terrier": ("Yorkshire Terrier", "Terrier", "Tiny"),
    "yorkie": ("Yorkshire Terrier", "Terrier", "Tiny"),
    "west highland": ("West Highland White Terrier", "Terrier", "Small"),
    "westie": ("West Highland White Terrier", "Terrier", "Small"),
    "airedale": ("Airedale Terrier", "Terrier", "Medium"),
    "scottish terrier": ("Scottish Terrier", "Terrier", "Small"),
    "cairn terrier": ("Cairn Terrier", "Terrier", "Small"),
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
    # Common Mixed Breeds
    "labrador mix": ("Labrador Retriever Mix", "Mixed", "Large"),
    "lab mix": ("Labrador Retriever Mix", "Mixed", "Large"),
    "golden retriever mix": ("Golden Retriever Mix", "Mixed", "Large"),
    "shepherd mix": ("Shepherd Mix", "Mixed", "Large"),
    "terrier mix": ("Terrier Mix", "Mixed", "Medium"),
    "spaniel mix": ("Spaniel Mix", "Mixed", "Medium"),
    "poodle mix": ("Poodle Mix", "Mixed", "Medium"),
    "hound mix": ("Hound Mix", "Mixed", "Medium"),
    # Generic categories
    "mixed breed": ("Mixed Breed", "Mixed", None),
    "mixed": ("Mixed Breed", "Mixed", None),
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


def standardize_breed(breed_text: str) -> Tuple[str, str, Optional[str]]:
    """
    Standardize a dog breed name.

    Args:
        breed_text: Original breed text from the database

    Returns:
        Tuple of (standardized_breed, breed_group, size_estimate)
    """
    if not breed_text:
        return "Unknown", "Unknown", None

    # Clean the breed text
    clean_text = breed_text.strip().lower()

    # First try an exact match
    for original, standardized in BREED_MAPPING.items():
        if original == clean_text:
            return standardized

    # Next try a "contains" approach for partial matches
    for original, standardized in BREED_MAPPING.items():
        if original in clean_text:
            # If we find a mix indicator, adjust the standardized breed name
            if (
                any(mix_word in clean_text for mix_word in [
                    "mix", "cross", "mixed"])
                and " Mix" not in standardized[0]
            ):
                return f"{standardized[0]} Mix", "Mixed", standardized[2]
            return standardized

    # Handle mix breeds not explicitly in our mapping
    if any(mix_word in clean_text for mix_word in ["mix", "cross", "mixed"]):
        # Try to extract the primary breed from the mix
        for breed_indicator in BREED_INDICATORS:
            if breed_indicator in clean_text:
                # Find the appropriate standardized breed
                for original, standardized in BREED_MAPPING.items():
                    if breed_indicator == original:
                        return f"{standardized[0]} Mix", "Mixed", standardized[2]

        # If we can't determine a primary breed, just return "Mixed Breed"
        return "Mixed Breed", "Mixed", None

    # If no match found, use the original with Unknown group
    capitalized_breed = " ".join(word.capitalize()
                                 for word in clean_text.split())
    return capitalized_breed, "Unknown", None


def parse_age_text(age_text: str) -> Tuple[Optional[str], Optional[int], Optional[int]]:
    """
    Parse age text into a standardized age category and month range.

    Args:
        age_text: Text description of age (e.g., "2 years", "6 months", "Young")

    Returns:
        Tuple of (age_category, min_months, max_months)
    """
    if not age_text:
        return None, None, None

    age_text = str(age_text).lower().strip()

    # Define age categories (defined but not currently used)
    # categories = {
    #     "Puppy": (0, 12),  # 0-12 months
    #     "Young": (12, 36),  # 1-3 years
    #     "Adult": (36, 96),  # 3-8 years
    #     "Senior": (96, 240),  # 8+ years
    # }

    # Check for years pattern (e.g., "2 years", "2.5 y/o")
    years_match = re.search(
        r"(\d+(?:[.,]\d+)?)\s*(?:years?|y(?:rs?)?(?:\/o)?|yo|jahr)", age_text
    )
    if years_match:
        years = float(years_match.group(1).replace(",", "."))
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

    # Check for months pattern (e.g., "6 months", "6mo")
    months_match = re.search(r"(\d+)\s*(?:months?|mo|mon)", age_text)
    if months_match:
        months = int(months_match.group(1))
        if months < 12:
            return "Puppy", months, min(months + 2, 12)
        else:
            return "Young", months, min(months + 6, 36)

    # Check for weeks pattern (e.g., "10 weeks", "8 wks")
    weeks_match = re.search(r"(\d+)\s*(?:weeks?|wks?)", age_text)
    if weeks_match:
        weeks = int(weeks_match.group(1))
        months = int(weeks / 4.3)  # Approximate conversion
        return "Puppy", months, min(months + 2, 12)

    # Check for descriptive terms
    if any(term in age_text for term in ["puppy", "pup", "baby", "young puppy"]):
        return "Puppy", 2, 10
    elif any(
        term in age_text for term in ["young adult", "adolescent", "juvenile", "teen"]
    ):
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

    # If we can't determine, return None
    return None, None, None


def standardize_age(age_text: str) -> Dict:
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


def get_size_from_breed(breed: str) -> Optional[str]:
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


def apply_standardization(animal_data: Dict) -> Dict:
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
        std_breed, breed_group, size_estimate = standardize_breed(
            result["breed"])
        result["standardized_breed"] = std_breed
        result["breed_group"] = breed_group

        # Set size estimate if we don't already have a size and we got an
        # estimate
        if "size" not in result or not result["size"]:
            result["standardized_size"] = size_estimate

    # Standardize age
    if "age_text" in result and result["age_text"]:
        age_info = standardize_age(result["age_text"])
        result["age_category"] = age_info["age_category"]
        result["age_min_months"] = age_info["age_min_months"]
        result["age_max_months"] = age_info["age_max_months"]

    return result


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
        print(
            f"{age:<15} -> Category: {age_info['age_category']:<8}, Range: {age_info['age_min_months']}-{age_info['age_max_months']} months"
        )
