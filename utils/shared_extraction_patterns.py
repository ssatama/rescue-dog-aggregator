#!/usr/bin/env python3
"""
Shared Data Extraction Patterns - Phase 2 Dead Code Consolidation

This module consolidates duplicate data extraction logic from:
- scrapers/theunderdog/normalizer.py
- scrapers/misis_rescue/normalizer.py
- scrapers/rean/dogs_scraper.py

Provides unified, well-tested extraction methods for:
- Age extraction from various text formats
- Breed extraction from description text
- Sex/gender determination from text
- Weight extraction with unit conversion

Design principles:
- Pure functions with no side effects
- Immutable data processing
- Comprehensive pattern matching
- Robust error handling
- Extensive test coverage
"""

import re
from typing import Optional, Tuple


def extract_age_from_text(text: Optional[str]) -> Optional[float]:
    """
    Extract age in decimal years from text using consolidated patterns.

    Consolidates age extraction logic from:
    - theunderdog: extract_age_years(), extract_age_text()
    - misis_rescue: extract_age_from_text()
    - rean: extract_age()

    Args:
        text: Text containing age information

    Returns:
        Age in decimal years or None if not extractable
    """
    if not text:
        return None

    text = text.lower().strip()

    # Pattern 1: "around X years", "around 2 years", "around two years"
    match = re.search(
        r"around\s+(two|three|four|five|six|seven|eight|nine|ten|\d+(?:\.\d+)?)\s+years?",
        text,
    )
    if match:
        age_text = match.group(1)
        # Convert word to number
        word_to_num = {
            "two": 2,
            "three": 3,
            "four": 4,
            "five": 5,
            "six": 6,
            "seven": 7,
            "eight": 8,
            "nine": 9,
            "ten": 10,
        }
        if age_text in word_to_num:
            return float(word_to_num[age_text])
        try:
            return float(age_text)
        except ValueError:
            pass

    # Pattern 2: "X months old", "18 months"
    match = re.search(r"(\d+(?:\.\d+)?)\s+months?\s*(?:old)?", text)
    if match:
        months = float(match.group(1))
        return round(months / 12.0, 2)

    # Pattern 3: "2-3 years", "8-10 years" (take average)
    match = re.search(r"(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)\s+years?", text)
    if match:
        year1 = float(match.group(1))
        year2 = float(match.group(2))
        return (year1 + year2) / 2.0

    # Pattern 4: "3 years old", "approximately 3 years", "nearly 2 years old"
    match = re.search(
        r"(?:nearly|approximately|roughly|about|exactly)?\s*(\d+(?:\.\d+)?)\s+years?\s*(?:old)?",
        text,
    )
    if match:
        return float(match.group(1))

    # Pattern 5: "8+ years", "3+ years old" (use minimum)
    match = re.search(r"(\d+(?:\.\d+)?)\+\s*years?", text)
    if match:
        return float(match.group(1))

    # Pattern 6: "under 1 year", "less than 2 years"
    match = re.search(r"(?:under|less than)\s+(\d+(?:\.\d+)?)\s+years?", text)
    if match:
        max_years = float(match.group(1)) - 0.5  # Estimate
        return max(max_years, 0.5)

    # Pattern 7: Written numbers - "two years", "eighteen months"
    number_map = {
        "one": 1,
        "two": 2,
        "three": 3,
        "four": 4,
        "five": 5,
        "six": 6,
        "seven": 7,
        "eight": 8,
        "nine": 9,
        "ten": 10,
        "eleven": 11,
        "twelve": 12,
        "thirteen": 13,
        "fourteen": 14,
        "fifteen": 15,
        "sixteen": 16,
        "seventeen": 17,
        "eighteen": 18,
        "nineteen": 19,
        "twenty": 20,
    }
    for word, num in number_map.items():
        if f"{word} year" in text:
            return float(num)
        if f"{word} month" in text:
            return round(num / 12.0, 2)

    # Pattern 8: Veterinary estimates (from misis_rescue)
    match = re.search(
        r"(?:vet|veterinary).*?(?:estimates?|assessment).*?(\d+(?:\.\d+)?)\s*(?:years?|y)",
        text,
    )
    if match:
        return float(match.group(1))

    # Pattern 9: "vet estimated her X y" patterns
    match = re.search(r"vet estimated.*?(\d+(?:\.\d+)?)\s*y", text)
    if match:
        return float(match.group(1))

    # Pattern 10: "4 y old", "roughly 3 y old"
    match = re.search(r"(?:roughly|approximately|about)?\s*(\d+(?:\.\d+)?)\s*y\s+old", text)
    if match:
        return float(match.group(1))

    # Pattern 11: Age categories to estimated years
    if "puppy" in text:
        return 0.5
    elif "young" in text or "adolescent" in text:
        return 1.5
    elif "adult" in text:
        return 3.0
    elif "senior" in text:
        return 8.0

    return None


def extract_breed_from_text(text: Optional[str]) -> str:
    """
    Extract breed from description text.

    Consolidates breed extraction logic from:
    - theunderdog: extract_breed_from_description()
    - misis_rescue: extract_breed_from_text(), extract_breed()
    - Generic breed pattern matching

    Args:
        text: Description text to search for breed information

    Returns:
        Extracted breed or "Mixed Breed" as default
    """
    if not text:
        return "Mixed Breed"

    text_lower = text.lower()

    # Pattern 1: Explicit mixed breed mentions (but not when specific breed is mentioned)
    if re.search(r"\bmixed breed\b|\bcross[\s-]?breed\b", text_lower):
        # Check if there's a specific breed mentioned with the mixed breed
        if not re.search(
            r"\b(labrador|lab|german shepherd|husky|terrier|retriever|spaniel|pointer|collie|shepherd)\b",
            text_lower,
        ):
            return "Mixed Breed"

    # Handle standalone "crossbreed" with specific breeds mentioned
    if re.search(r"\bcrossbreed\b", text_lower):
        # Look for specific breed before crossbreed
        crossbreed_match = re.search(
            r"\b(labrador|lab|german shepherd|husky|terrier|retriever|spaniel|pointer|collie|shepherd)\s+crossbreed\b",
            text_lower,
        )
        if crossbreed_match:
            breed = crossbreed_match.group(1)
            if breed == "lab":
                breed = "labrador"
            return f"{breed.title()} Mix"
        # Check for qualifiers before breed + crossbreed
        qualified_crossbreed = re.search(
            r"(?:possibly|might be|looks like|appears to be)\s+(labrador|lab|german shepherd|husky|terrier|retriever|spaniel|pointer|collie|shepherd)\s+crossbreed\b",
            text_lower,
        )
        if qualified_crossbreed:
            breed = qualified_crossbreed.group(1)
            if breed == "lab":
                breed = "labrador"
            return f"{breed.title()} Mix"
        # If no specific breed found, return mixed breed
        return "Mixed Breed"

    # Pattern 2: Specific breed with mix/cross (order matters - specific breeds first)
    breed_mix_patterns = [
        # Hyphenated breed mixes
        r"\b(lab)-(shepherd|terrier|retriever)\s+mix\b",
        r"\b(shepherd|terrier|retriever)-(lab|labrador)\s+mix\b",
        # Pattern with qualifiers (from misis_rescue) - check these first
        r"(?:possibly|might be|looks like|appears to be)\s+(husky)\s+(?:mix|cross)\b",
        r"(?:possibly|might be|looks like|appears to be)\s+(labrador|lab)\s+(?:mix|cross|crossbreed)\b",
        r"(?:possibly|might be|looks like|appears to be)\s+(german shepherd)\s+(?:mix|cross)\b",
        r"(?:possibly|might be|looks like|appears to be)\s+(terrier)\s+(?:mix|cross)\b",
        # Specific breed mixes (high priority)
        r"\b(labrador|lab)\s+(?:mix|cross|crossbreed)\b",
        r"\b(german shepherd)\s+(?:mix|cross|crossbreed)\b",
        r"\b(golden retriever)\s+(?:mix|cross|crossbreed)\b",
        r"\b(border collie)\s+(?:mix|cross|crossbreed)\b",
        r"\b(husky)\s+(?:mix|cross|crossbreed)\b",
        r"\b(terrier)\s+(?:mix|cross|crossbreed)\b",
        r"\b(shepherd)\s+(?:mix|cross|crossbreed)\b",
        r"\b(retriever)\s+(?:mix|cross|crossbreed)\b",
        r"\b(collie)\s+(?:mix|cross|crossbreed)\b",
        r"\b(spaniel)\s+(?:mix|cross|crossbreed)\b",
        r"\b(pointer)\s+(?:mix|cross|crossbreed)\b",
        # Generic pattern (lowest priority)
        r"\b([a-z]+)\s+(?:mix|cross)\b",
    ]

    for pattern in breed_mix_patterns:
        match = re.search(pattern, text_lower)
        if match:
            # Handle hyphenated breeds (prioritize labrador)
            if match.lastindex and match.lastindex == 2:  # Two groups (hyphenated case)
                breed1 = match.group(1)
                breed2 = match.group(2)
                # Prioritize lab over others
                if breed1 in ["lab", "labrador"] or breed2 in ["lab", "labrador"]:
                    breed = "labrador"
                else:
                    breed = breed1  # Take first one
            else:
                breed = match.group(1)

            # Normalize breed names
            if breed == "lab":
                breed = "labrador"

            return f"{breed.title()} Mix"

    # Pattern 3: Pure breed mentions
    pure_breed_patterns = [
        # Two-word breeds (check first to avoid partial matches)
        r"\b(golden retriever)\b",
        r"\b(labrador retriever)\b",
        r"\b(german shepherd)\b",
        r"\b(border collie)\b",
        r"\b(siberian husky)\b",
        r"\b(english pointer)\b",
        r"\b(american staffordshire terrier)\b",
        r"\b(jack russell terrier)\b",
        r"\b(yorkshire terrier)\b",
        # Single-word breeds
        r"\b(labrador)\b",
        r"\b(retriever)\b",
        r"\b(shepherd)\b",
        r"\b(terrier)\b",
        r"\b(spaniel)\b",
        r"\b(bulldog)\b",
        r"\b(boxer)\b",
        r"\b(rottweiler)\b",
        r"\b(doberman)\b",
        r"\b(poodle)\b",
        r"\b(beagle)\b",
        r"\b(husky)\b",
        r"\b(collie)\b",
        r"\b(pointer)\b",
    ]

    for pattern in pure_breed_patterns:
        match = re.search(pattern, text_lower)
        if match:
            breed = match.group(1)
            return breed.title()

    # Pattern 4: Generic mix indicators
    if re.search(r"\bmix\b|\bcross\b", text_lower):
        return "Mixed Breed"

    # Default fallback
    return "Mixed Breed"


def extract_sex_from_text(text: Optional[str]) -> Optional[str]:
    """
    Extract sex from text using confidence-based scoring.

    Consolidates sex extraction logic from:
    - theunderdog: extract_gender()
    - misis_rescue: extract_sex_from_text(), extract_sex()
    - Confidence scoring for conflicting signals

    Args:
        text: Text content to analyze for sex indicators

    Returns:
        'Male', 'Female', or None if not determinable (capitalized for DB consistency)
    """
    if not text:
        return None

    text_lower = text.lower()

    # Strong indicators (medical terms) - weight = 3
    spayed_count = len(re.findall(r"\bspayed\b", text_lower))
    neutered_count = len(re.findall(r"\bneutered\b", text_lower))
    castrated_count = len(re.findall(r"\bcastrated?\b", text_lower))

    # Medium indicators (pronouns) - weight = 1
    she_count = len(re.findall(r"\bshe\b", text_lower))
    her_count = len(re.findall(r"\bher\b", text_lower))
    he_count = len(re.findall(r"\bhe\b", text_lower))
    his_count = len(re.findall(r"\bhis\b", text_lower))

    # Weak indicators (explicit mentions) - weight = 2
    female_count = len(re.findall(r"\bfemale\b", text_lower))
    male_count = len(re.findall(r"\bmale\b", text_lower))
    girl_count = len(re.findall(r"\bgirl\b", text_lower))
    boy_count = len(re.findall(r"\bboy\b", text_lower))

    # Calculate confidence scores
    female_score = (spayed_count * 3) + (she_count + her_count) + ((female_count + girl_count) * 2)
    male_score = ((neutered_count + castrated_count) * 3) + (he_count + his_count) + ((male_count + boy_count) * 2)

    # Check for conflicting signals (mixed pronouns might indicate multiple dogs)
    pronoun_conflict = (she_count > 0 and he_count > 0) and abs(she_count - he_count) <= 1

    # Also check for explicit gender conflicts (e.g., "she is a good boy")
    gender_conflict = (female_count + girl_count) > 0 and (male_count + boy_count) > 0

    # Additional check for contradictory gender language
    contradictory_language = (she_count > 0 and boy_count > 0) or (he_count > 0 and girl_count > 0)

    # If there are conflicts without strong medical indicators, return None
    if (pronoun_conflict or gender_conflict or contradictory_language) and (spayed_count == 0 and neutered_count == 0 and castrated_count == 0):
        return None  # Likely multiple dogs or conflicting info

    # Return result based on confidence scores
    # Lower threshold for basic pronoun detection
    # Return CAPITALIZED for database and API consistency
    if female_score > male_score and female_score >= 1:
        return "Female"
    elif male_score > female_score and male_score >= 1:
        return "Male"

    return None


def extract_weight_from_text(text: Optional[str]) -> Optional[float]:
    """
    Extract weight in kg from text with unit conversion.

    Consolidates weight extraction logic from:
    - theunderdog: extract_size_and_weight()
    - misis_rescue: extract_weight_kg()
    - rean: extract_weight()

    Args:
        text: Text containing weight information

    Returns:
        Weight in kg as float or None if not extractable
    """
    if not text:
        return None

    text_lower = text.lower()

    # Pattern 1: Multiple weights - "was 35kg, now 30kg" (take the last/current one)
    multiple_weights = re.findall(r"(\d+\.?\d*)\s*k(?:g|ilos?)", text_lower, re.IGNORECASE)
    if len(multiple_weights) > 1:
        # Take the last weight mentioned (most current)
        return float(multiple_weights[-1])

    # Pattern 2: Ranges with "around" - "✔️weighs around 22-25kg"
    match = re.search(r"weighs\s+around\s+(\d+\.?\d*)-(\d+\.?\d*)\s*k(?:g|ilos?)", text_lower)
    if match:
        weight1 = float(match.group(1))
        weight2 = float(match.group(2))
        return (weight1 + weight2) / 2

    # Pattern 3: Range with kg - "15-20kg", "(15-20kg)"
    match = re.search(r"(\d+\.?\d*)-(\d+\.?\d*)\s*k(?:g|ilos?)", text_lower)
    if match:
        weight1 = float(match.group(1))
        weight2 = float(match.group(2))
        return (weight1 + weight2) / 2

    # Pattern 4: "weighs X kg" - specific weighing mentions
    match = re.search(r"weighs\s+(\d+\.?\d*)\s*k(?:g|ilos?)", text_lower)
    if match:
        return float(match.group(1))

    # Pattern 5: "weight: 15 kg" - formatted weight info
    match = re.search(r"weight:\s*(\d+\.?\d*)\s*k(?:g|ilos?)", text_lower)
    if match:
        return float(match.group(1))

    # Pattern 6: Simple kg mentions - "30kg", "(around 30kg)"
    match = re.search(r"(\d+\.?\d*)\s*k(?:g|ilos?)", text_lower)
    if match:
        return float(match.group(1))

    # Pattern 7: Pounds conversion - "20 pounds", "44 lbs"
    match = re.search(r"(\d+\.?\d*)\s*(?:pounds?|lbs?)", text_lower)
    if match:
        pounds = float(match.group(1))
        return round(pounds * 0.453592, 1)  # Convert to kg

    return None


def normalize_age_text(age_years: Optional[float]) -> Optional[str]:
    """
    Format age in years to standardized text format.

    Args:
        age_years: Age in decimal years

    Returns:
        Formatted age text like "2.5 years", "6 months", or None
    """
    if not age_years:
        return None

    # If less than 1 year, show in months
    if age_years < 1.0:
        months = int(age_years * 12)
        if months == 1:
            return "1 month"
        else:
            return f"{months} months"

    # Format to 1 decimal place if needed, otherwise integer
    if age_years == int(age_years):
        years = int(age_years)
        if years == 1:
            return "1 year"
        else:
            return f"{years} years"
    else:
        return f"{age_years:.1f} years"


def calculate_age_range_months(
    age_years: Optional[float],
) -> Tuple[Optional[int], Optional[int]]:
    """
    Calculate age range in months from decimal years.

    Consolidates age range logic from theunderdog normalizer.

    Args:
        age_years: Age in decimal years

    Returns:
        Tuple of (min_months, max_months)
    """
    if not age_years:
        return None, None

    # Convert to months
    age_months = int(age_years * 12)

    # Define ranges based on age categories
    if age_years < 1.0:  # Puppy
        return max(1, age_months - 3), min(age_months + 3, 12)
    elif age_years < 2.0:  # Young
        return max(1, age_months - 6), min(age_months + 6, 24)
    elif age_years < 7.0:  # Adult
        return max(12, age_months - 12), min(age_months + 12, 84)
    else:  # Senior
        return max(84, age_months - 24), age_months + 24
