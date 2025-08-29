"""Data normalization functions for The Underdog.

This module provides pure functions to normalize and standardize data extracted
from The Underdog website properties and description sections.

MIGRATION NOTICE: This module uses shared extraction utilities for consolidation.
Age, breed, sex, and weight extraction logic has been moved to:
- utils.shared_extraction_patterns
"""

import re
from typing import Any, Dict, Optional, Tuple

# Import shared extraction utilities
from utils.shared_extraction_patterns import calculate_age_range_months, extract_age_from_text, extract_breed_from_text, extract_sex_from_text, extract_weight_from_text, normalize_age_text


def normalize_animal_data(animal_data: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize animal data by extracting structured fields from raw text.

    This function preserves all original data and adds normalized fields:
    - age_text: Standardized format in decimal years (e.g., "2.5 years")
    - age_years: Numeric age in years for calculations
    - age_min_months, age_max_months: Age range in months
    - breed: Extracted from description text (CRITICAL for user filtering)
    - sex: Mapped from properties["Male or female?"]
    - size: Extracted from properties["How big?"]
    - weight_kg: Numeric weight extracted from size text

    Args:
        animal_data: Raw animal data dictionary with properties and description

    Returns:
        Animal data dictionary with added normalized fields
    """
    # Create a copy to avoid mutating the original
    result = animal_data.copy()

    # Extract properties from enhanced structure
    properties = animal_data.get("properties", {})
    if isinstance(properties, dict) and "raw_qa_data" in properties:
        qa_data = properties["raw_qa_data"]
    else:
        qa_data = properties

    description = animal_data.get("description", "")

    # Enhanced age extraction with shared utilities
    age_years = extract_age_from_text(qa_data.get("How old?"))
    if age_years:
        result["age_text"] = normalize_age_text(age_years)
        result["age_years"] = age_years

        # Calculate age range in months
        min_months, max_months = calculate_age_range_months(age_years)
        result["age_min_months"] = min_months
        result["age_max_months"] = max_months
    else:
        result["age_text"] = None
        result["age_years"] = None
        result["age_min_months"] = None
        result["age_max_months"] = None

    # Breed extraction (CRITICAL - from description, not properties!)
    result["breed"] = extract_breed_from_text(description)

    # Gender mapping using shared utilities
    result["sex"] = extract_sex_from_text(qa_data.get("Male or female?"))

    # Size and weight extraction
    size, weight_kg = extract_size_and_weight_legacy(qa_data.get("How big?"))
    result["size"] = size
    result["weight_kg"] = weight_kg

    return result


def extract_age_text_legacy(age_property: Optional[str]) -> Optional[str]:
    """Extract and normalize age text from 'How old?' property.

    Patterns handled:
    - "Young adult (around two years)" -> "2 years"
    - "Puppy (6 months)" -> "6 months"
    - "Around 3 years old" -> "3 years"
    - "2-3 years" -> "2-3 years"
    - "Senior dog (8+ years)" -> "8+ years"
    - "Puppy (DOB 07.03.2025)" -> "Puppy"
    - "Adolescent (around eighteen months)" -> "18 months"

    Args:
        age_property: Text from properties["How old?"]

    Returns:
        Normalized age text or None if not extractable
    """
    if not age_property:
        return None

    text = age_property.lower().strip()

    # Pattern 1: DOB format - "Puppy (DOB 07.03.2025)"
    if re.search(r"dob\s+\d{2}\.\d{2}\.\d{4}", text):
        # Extract the age category before the DOB
        dob_match = re.match(r"^(\w+)\s*\(dob", text)
        if dob_match:
            age_category = dob_match.group(1)
            return age_category.title()
        return "Puppy"

    # Pattern 2: "around two years", "around 2 years"
    match = re.search(r"around\s+(two|\d+)\s+years?", text)
    if match:
        age = match.group(1)
        if age == "two":
            age = "2"
        return f"{age} years"

    # Pattern 3: "6 months", "18 months old"
    match = re.search(r"(\d+)\s+months?", text)
    if match:
        return f"{match.group(1)} months"

    # Pattern 4: "2-3 years", "8-10 years" (must come before single number pattern)
    match = re.search(r"(\d+)-(\d+)\s+years?", text)
    if match:
        return f"{match.group(1)}-{match.group(2)} years"

    # Pattern 5: "3 years old", "approximately 3 years"
    match = re.search(r"(?:approximately|about)?\s*(\d+)\s+years?\s*(?:old)?", text)
    if match:
        return f"{match.group(1)} years"

    # Pattern 6: "8+ years", "3+ years old"
    match = re.search(r"(\d+)\+\s*years?", text)
    if match:
        return f"{match.group(1)}+ years"

    # Pattern 7: "under 1 year", "less than 2 years"
    match = re.search(r"(?:under|less than)\s+(\d+)\s+years?", text)
    if match:
        return f"under {match.group(1)} year"

    # Pattern 8: Written numbers - "two years", "three months", "eighteen months"
    number_map = {
        "one": "1",
        "two": "2",
        "three": "3",
        "four": "4",
        "five": "5",
        "six": "6",
        "seven": "7",
        "eight": "8",
        "nine": "9",
        "ten": "10",
        "eleven": "11",
        "twelve": "12",
        "thirteen": "13",
        "fourteen": "14",
        "fifteen": "15",
        "sixteen": "16",
        "seventeen": "17",
        "eighteen": "18",
        "nineteen": "19",
        "twenty": "20",
    }
    for word, num in number_map.items():
        if f"{word} year" in text:
            return f"{num} years"
        if f"{word} month" in text:
            return f"{num} months"

    return None


def extract_breed_from_description_legacy(description: Optional[str]) -> str:
    """Extract breed from description text (CRITICAL for user filtering).

    This is the primary source of breed information since it's not in properties.
    Used for filtering on the aggregator website.

    Patterns handled:
    - "mixed breed" -> "Mixed Breed"
    - "labrador mix" -> "Labrador Mix"
    - "german shepherd cross" -> "German Shepherd Mix"
    - "terrier" -> "Terrier"
    - "golden retriever" -> "Golden Retriever"

    Args:
        description: Full description text to search

    Returns:
        Extracted breed or "Mixed Breed" as default
    """
    if not description:
        return "Mixed Breed"

    text = description.lower()

    # Pattern 1: Explicit mixed breed mentions
    if re.search(r"\bmixed breed\b|\bcrossbreed\b|\bcross breed\b", text):
        return "Mixed Breed"

    # Pattern 2: Specific breed with mix/cross (order matters - specific breeds first)
    breed_mix_patterns = [
        r"\b(lab)-(\w+)\s+mix\b",  # "lab-shepherd mix"
        r"\b(\w+)-(lab)\s+mix\b",  # "shepherd-lab mix"
        r"\b(labrador|lab)\s+mix\b",
        r"\b(german shepherd)\s+mix\b",
        r"\b(golden retriever)\s+mix\b",
        r"\b(border collie)\s+mix\b",
        r"\b(husky)\s+mix\b",
        r"\b(terrier)\s+mix\b",
        r"\b(shepherd)\s+mix\b",
        r"\b(retriever)\s+mix\b",
        r"\b(collie)\s+mix\b",
        r"\b(spaniel)\s+mix\b",
        r"\b(labrador|lab)\s+cross\b",
        r"\b(german shepherd)\s+cross\b",
        r"\b(golden retriever)\s+cross\b",
        r"\b(border collie)\s+cross\b",
        r"\b(husky)\s+cross\b",
        r"\b(terrier)\s+cross\b",
        r"\b([a-z]+)\s+mix\b",  # Generic pattern last
        r"\b([a-z]+)\s+cross\b",  # Generic pattern last
    ]

    for pattern in breed_mix_patterns:
        match = re.search(pattern, text)
        if match:
            # Handle hyphenated breeds (take first breed mentioned)
            if match.lastindex == 2:  # Two groups (hyphenated case)
                breed1 = match.group(1)
                breed2 = match.group(2)
                # Prioritize lab over others
                if breed1 == "lab" or breed1 == "labrador":
                    breed = breed1
                elif breed2 == "lab" or breed2 == "labrador":
                    breed = breed2
                else:
                    breed = breed1  # Take first one
            else:
                breed = match.group(1)

            if breed == "lab":
                breed = "labrador"
            return f"{breed.title()} Mix"

    # Pattern 3: Pure breed mentions
    pure_breed_patterns = [
        r"\b(golden retriever)\b",
        r"\b(labrador retriever)\b",
        r"\b(german shepherd)\b",
        r"\b(border collie)\b",
        r"\b(siberian husky)\b",
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
    ]

    for pattern in pure_breed_patterns:
        match = re.search(pattern, text)
        if match:
            breed = match.group(1)
            return breed.title()

    # Pattern 4: Generic mix indicators
    if re.search(r"\bmix\b|\bcross\b", text):
        return "Mixed Breed"

    # Default for any dog
    return "Mixed Breed"


def extract_gender_legacy(gender_property: Optional[str]) -> Optional[str]:
    """Extract and map gender from 'Male or female?' property.

    Args:
        gender_property: Text from properties["Male or female?"]

    Returns:
        'Male' for Male, 'Female' for Female, or None if not determinable
    """
    if not gender_property:
        return None

    text = gender_property.lower().strip()

    if "female" in text:
        return "Female"
    elif "male" in text:
        return "Male"

    return None


def extract_size_and_weight_legacy(size_property: Optional[str]) -> Tuple[Optional[str], Optional[float]]:
    """Extract size category and weight from 'How big?' property.

    Patterns handled:
    - "Large (around 30kg)" -> ("Large", 30.0)
    - "Medium (15-20kg)" -> ("Medium", 17.5)
    - "Small (8kg)" -> ("Small", 8.0)
    - "Large" -> ("Large", None)
    - "Big dog (25-30 kilos)" -> ("Big dog", 27.5)
    - "Smaller side of medium" -> ("Small", None)
    - "Medium as adult" -> ("Medium", None)

    Args:
        size_property: Text from properties["How big?"]

    Returns:
        Tuple of (size_category, weight_in_kg)
    """
    if not size_property:
        return None, None

    text = size_property.strip()

    # Handle complex size descriptions first
    text_lower = text.lower()

    # Pattern 1: "Smaller side of medium" -> "Small"
    if "smaller side of medium" in text_lower:
        return "Small", None

    # Pattern 2: "Medium as adult" -> "Medium"
    if "medium as adult" in text_lower:
        return "Medium", None

    # Pattern 3: "Large as adult" -> "Large"
    if "large as adult" in text_lower:
        return "Large", None

    # Pattern 4: "Bigger side of small" -> "Medium"
    if "bigger side of small" in text_lower:
        return "Medium", None

    # Pattern 5: "Large side of medium" -> "Large"
    if "large side of medium" in text_lower:
        return "Large", None

    # Extract size category (everything before parentheses or the whole text)
    size_match = re.match(r"^([^(]+)", text)
    size_category = size_match.group(1).strip() if size_match else None

    # Extract weight from various patterns
    weight_kg = None

    # Pattern 1: Multiple weights - "was 35kg, now 30kg" (take the last/current one)
    multiple_weights = re.findall(r"(\d+\.?\d*)\s*k(?:g|ilos?)", text, re.IGNORECASE)
    if len(multiple_weights) > 1:
        # Take the last weight mentioned (most current)
        weight_kg = float(multiple_weights[-1])

    # Pattern 2: Range with kg - "15-20kg", "(15-20kg)"
    elif re.search(r"(\d+\.?\d*)-(\d+\.?\d*)\s*k(?:g|ilos?)", text, re.IGNORECASE):
        weight_match = re.search(r"(\d+\.?\d*)-(\d+\.?\d*)\s*k(?:g|ilos?)", text, re.IGNORECASE)
        weight1 = float(weight_match.group(1))
        weight2 = float(weight_match.group(2))
        weight_kg = (weight1 + weight2) / 2

    # Pattern 3: Single weight - "30kg", "(around 30kg)"
    elif re.search(r"(\d+\.?\d*)\s*k(?:g|ilos?)", text, re.IGNORECASE):
        weight_match = re.search(r"(\d+\.?\d*)\s*k(?:g|ilos?)", text, re.IGNORECASE)
        weight_kg = float(weight_match.group(1))

    # Pattern 4: Pounds conversion - "20 pounds"
    else:
        pounds_match = re.search(r"(\d+\.?\d*)\s*(?:pounds?|lbs?)", text, re.IGNORECASE)
        if pounds_match:
            pounds = float(pounds_match.group(1))
            weight_kg = round(pounds * 0.453592, 1)  # Convert to kg

    return size_category, weight_kg


def extract_age_years_legacy(age_property: Optional[str]) -> Optional[float]:
    """Extract age in decimal years from 'How old?' property.

    Args:
        age_property: Text from properties["How old?"]

    Returns:
        Age in decimal years or None if not extractable
    """
    if not age_property:
        return None

    text = age_property.lower().strip()

    # Pattern 1: "around two years", "around 2 years", "around four years"
    match = re.search(r"around\s+(two|three|four|five|six|seven|eight|nine|ten|\d+)\s+years?", text)
    if match:
        age = match.group(1)
        # Convert word to number
        word_to_num = {"two": "2", "three": "3", "four": "4", "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9", "ten": "10"}
        if age in word_to_num:
            age = word_to_num[age]
        return float(age)

    # Pattern 2: "6 months", "18 months old"
    match = re.search(r"(\d+)\s+months?", text)
    if match:
        months = int(match.group(1))
        return round(months / 12.0, 1)

    # Pattern 3: "2-3 years", "8-10 years" (take average)
    match = re.search(r"(\d+)-(\d+)\s+years?", text)
    if match:
        year1 = int(match.group(1))
        year2 = int(match.group(2))
        return (year1 + year2) / 2.0

    # Pattern 4: "3 years old", "approximately 3 years"
    match = re.search(r"(?:approximately|about)?\s*(\d+)\s+years?\s*(?:old)?", text)
    if match:
        return float(match.group(1))

    # Pattern 5: "8+ years", "3+ years old" (use minimum)
    match = re.search(r"(\d+)\+\s*years?", text)
    if match:
        return float(match.group(1))

    # Pattern 6: "under 1 year", "less than 2 years"
    match = re.search(r"(?:under|less than)\s+(\d+)\s+years?", text)
    if match:
        max_years = float(match.group(1)) - 0.5  # Estimate
        return max(max_years, 0.5)

    # Pattern 7: Written numbers - "two years", "three months", "eighteen months"
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
            return round(num / 12.0, 1)

    # Pattern 8: Age categories to estimated years
    if "puppy" in text:
        return 0.5
    elif "young" in text or "adolescent" in text:
        return 1.5
    elif "adult" in text:
        return 3.0
    elif "senior" in text:
        return 8.0

    return None


def calculate_age_range_legacy(age_years: Optional[float]) -> Tuple[Optional[int], Optional[int]]:
    """Calculate age range in months from decimal years.

    Args:
        age_years: Age in decimal years

    Returns:
        Tuple of (min_months, max_months)
    """
    if not age_years:
        return None, None

    # Convert to months
    age_months = age_years * 12

    # Define ranges based on age categories
    if age_years < 1.0:  # Puppy
        return int(max(1, age_months - 3)), int(age_months + 3)
    elif age_years < 2.0:  # Young
        return int(age_months - 6), int(age_months + 6)
    elif age_years < 7.0:  # Adult
        return int(age_months - 12), int(age_months + 12)
    else:  # Senior
        return int(age_months - 24), int(age_months + 24)


def format_age_text_legacy(age_years: Optional[float]) -> Optional[str]:
    """Format age in years to standardized text format.

    Args:
        age_years: Age in decimal years

    Returns:
        Formatted age text like "2.5 years" or None
    """
    if not age_years:
        return None

    # Format to 1 decimal place if needed, otherwise integer
    if age_years == int(age_years):
        return f"{int(age_years)} years"
    else:
        return f"{age_years:.1f} years"
