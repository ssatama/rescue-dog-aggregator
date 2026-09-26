"""Data normalization functions for MisisRescue.

This module provides pure functions to normalize and standardize data extracted
from MisisRescue website "Things you should know" sections.

MIGRATION NOTICE: This module uses shared extraction utilities for consolidation.
Age, breed, sex, and weight extraction logic has been moved to:
- utils.shared_extraction_patterns
"""

import re

# Import shared extraction utilities
from utils.breed_registry import resolve_breed
from utils.shared_extraction_patterns import extract_weight_from_text


def normalize_name(name: str | None) -> str:
    """Normalize animal names by removing emojis, gender descriptors, and location info.

    Args:
        name: Raw name from extraction

    Returns:
        Cleaned name string
    """
    if not name:
        return ""

    # Remove emojis and special unicode symbols
    # This regex matches most emoji ranges
    emoji_pattern = re.compile(
        "["
        "\U0001f1e0-\U0001f1ff"  # flags (iOS)
        "\U0001f300-\U0001f5ff"  # symbols & pictographs
        "\U0001f600-\U0001f64f"  # emoticons
        "\U0001f680-\U0001f6ff"  # transport & map symbols
        "\U0001f700-\U0001f77f"  # alchemical symbols
        "\U0001f780-\U0001f7ff"  # Geometric Shapes Extended
        "\U0001f800-\U0001f8ff"  # Supplemental Arrows-C
        "\U0001f900-\U0001f9ff"  # Supplemental Symbols and Pictographs
        "\U0001fa00-\U0001fa6f"  # Chess Symbols
        "\U0001fa70-\U0001faff"  # Symbols and Pictographs Extended-A
        "\U00002702-\U000027b0"  # Dingbats
        "\U000024c2-\U0001f251"
        "\u200d"  # Zero-width joiner
        "\u200c"  # Zero-width non-joiner
        "\u200b"  # Zero-width space
        "]+",
        flags=re.UNICODE,
    )

    cleaned = emoji_pattern.sub("", name)

    # Remove gender descriptors (case insensitive) - do this first
    # Order matters: longer patterns first!
    gender_patterns = [
        r"\s+she's\s+a\s+girl.*$",  # Handle complex "she's a girl from..." patterns FIRST
        r"\s+he's\s+a\s+boy.*$",  # Handle complex "he's a boy from..." patterns FIRST
        r"\s*he'?s\s+a\s+boy\s*",
        r"\s*she'?s\s+a\s+girl\s*",
        r"\s*he\s+is\s+male\s*",
        r"\s*she\s+is\s+female\s*",
        r"\s*\(male\)\s*",
        r"\s*\(female\)\s*",
        r"\s*-\s*male\s*",
        r"\s*-\s*female\s*",
    ]

    for pattern in gender_patterns:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)

    # Clean up whitespace after gender removal
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    # Remove location suffixes - enhanced patterns
    location_patterns = [
        r"\s+in\s+the\s+uk[!\s]*$",  # "in the UK!" (specific common pattern)
        r"\s+in\s+the\s+\w+[!\s]*$",  # "in the [country]!"
        r"\s+in\s+\w+[!\s]*$",  # "in UK", "in Germany" with optional !
        r"\s+from\s+\w+[!\s]*$",  # "from Serbia"
        r"\s*-\s*\w+\s*$",  # "- UK"
        r"\s*\(\w+\)\s*$",  # "(Serbia)"
        r"^in\s+\w+\s*$",  # Just "in UK"
        r"\s*{.*?}",  # Remove {!} or similar bracketed content
        r"\s*\{.*?\}",  # Remove curly brace content
    ]

    for pattern in location_patterns:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)

    # Clean up extra whitespace and normalize casing
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    if not cleaned:
        return ""

    # Title case each word properly
    return cleaned.title()


def extract_sex_from_text_legacy(text: str | None) -> str | None:
    """Extract sex from detailed text with confidence scoring.

    Args:
        text: Full text content to search

    Returns:
        'Male', 'Female', or None
    """
    if not text:
        return None

    text = text.lower()

    # Strong indicators (medical terms) - weight = 3
    spayed_count = len(re.findall(r"\bspayed\b", text))
    neutered_count = len(re.findall(r"\bneutered\b", text))
    castrated_count = len(re.findall(r"\bcastrated?\b", text))

    # Medium indicators (pronouns) - weight = 1
    she_count = len(re.findall(r"\bshe\b", text))
    her_count = len(re.findall(r"\bher\b", text))
    he_count = len(re.findall(r"\bhe\b", text))
    his_count = len(re.findall(r"\bhis\b", text))

    # Weak indicators (explicit mentions) - weight = 2
    female_count = len(re.findall(r"\bfemale\b", text))
    male_count = len(re.findall(r"\bmale\b", text))
    girl_count = len(re.findall(r"\bgirl\b", text))
    boy_count = len(re.findall(r"\bboy\b", text))

    # Calculate confidence scores
    female_score = (spayed_count * 3) + (she_count + her_count) + ((female_count + girl_count) * 2)
    male_score = ((neutered_count + castrated_count) * 3) + (he_count + his_count) + ((male_count + boy_count) * 2)

    # Check for conflicting signals (mixed pronouns might indicate multiple dogs)
    pronoun_conflict = (she_count > 0 and he_count > 0) and abs(she_count - he_count) <= 1

    # Also check for explicit gender conflicts (e.g., "she is a good boy")
    gender_conflict = (female_count + girl_count) > 0 and (male_count + boy_count) > 0

    if (pronoun_conflict or gender_conflict) and (spayed_count == 0 and neutered_count == 0 and castrated_count == 0):
        return None  # Likely multiple dogs or conflicting info

    # Return result based on confidence scores
    # Lower threshold for basic pronoun detection
    if female_score > male_score and female_score >= 1:
        return "Female"
    elif male_score > female_score and male_score >= 1:
        return "Male"

    return None


def extract_breed_from_text_legacy(text: str | None) -> str | None:
    """Extract breed from detailed text when bullet points are insufficient.

    Args:
        text: Full text content to search

    Returns:
        Normalized breed string or None
    """
    if not text:
        return None

    text = text.lower()

    # Handle "crossbreed" variations
    if re.search(r"\bcrossbreed\b|\bcross[\s-]?breed\b", text):
        # Look for specific breed mentioned with cross
        breed_cross_patterns = [
            r"(?:possibly|might be|looks like)?\s*(husky)\s+cross",
            r"(?:possibly|might be|looks like)?\s*(labrador|lab)\s+crossbreed",
            r"(?:possibly|might be|looks like)?\s*(german shepherd)\s+cross",
            r"(?:possibly|might be|looks like)?\s*(terrier)\s+cross",
            r"(?:possibly|might be|looks like)?\s*(retriever)\s+cross",
        ]

        for pattern in breed_cross_patterns:
            match = re.search(pattern, text)
            if match:
                breed = match.group(1)
                if breed == "lab":
                    breed = "labrador"
                return f"{breed.title()} Mix"

        return "Mixed Breed"

    # Look for specific breed mentions
    breed_mention_patterns = [
        r"(?:possibly|might be|looks like|appears to be)\s+(husky)\s+cross",  # "husky cross" -> "Husky Mix"
        r"(?:possibly|might be|looks like|appears to be)\s+(german shepherd)\s+cross",
        r"(?:possibly|might be|looks like|appears to be)\s+(labrador|lab)\s+cross",
        r"(?:possibly|might be|looks like|appears to be)\s+(german shepherd)\s+mix",  # "german shepherd mix"
        r"(?:possibly|might be|looks like|appears to be)\s+(terrier)\s+mix",
        r"(?:possibly|might be|looks like|appears to be)\s+([a-z\s]+)\s+mix\b",  # General mix pattern
        r"(?:possibly|might be|looks like|appears to be)\s+(husky)\b",
        r"(?:possibly|might be|looks like|appears to be)\s+(german shepherd)\b",
        r"(?:possibly|might be|looks like|appears to be)\s+(labrador|lab)\s+(retriever)",
    ]

    for pattern in breed_mention_patterns:
        match = re.search(pattern, text)
        if match:
            breed = match.group(1)
            if breed == "lab":
                breed = "labrador"

            # Handle two-word breeds like "labrador retriever"
            if match.lastindex == 2:
                breed2 = match.group(2)
                breed = f"{breed} {breed2}"

            if "cross" in pattern or "mix" in pattern:
                return f"{breed.title()} Mix"
            else:
                return breed.title()

    # General mixed breed indicators
    if re.search(r"\bmixed?\s+breed\b|\bmix\b", text):
        return "Mixed Breed"

    return None


MAX_DOG_WEIGHT_KG = 100
NAMED_MIX = re.compile(
    r"^(?:(?:possibly|probably|maybe|most likely|likely|looks like|we think(?: (?:she|he)(?:'s| is))?)\s+)?(?:an?\s+)?([a-z][a-z ]{2,30}?)\s+(?:mix|cross)(?:breed)?$",
    re.IGNORECASE,
)
NOT_A_BREED = re.compile(r"\b(?:mixed|breed|size|small|medium|large|big|unknown)\b", re.IGNORECASE)


def extract_breed(bullets: list[str] | None) -> str | None:
    """Extract and normalize breed information from bullet points.

    Args:
        bullets: List of bullet point strings

    Returns:
        Normalized breed string or None
    """
    if not bullets:
        return None

    # A short fact naming the breed and a mix: "Cane Corso cross", "Possibly Staff cross"
    for bullet in bullets:
        named = NAMED_MIX.match(bullet.strip())
        # Only a breed the registry knows: "Probably a mix" and "Beautiful mix" name none
        if named and not NOT_A_BREED.search(named.group(1)) and resolve_breed(named.group(1)).group != "Unknown":
            name = named.group(1).strip().title()
            return f"{'Labrador' if name == 'Lab' else name} Mix"

    # Join all bullets into single text for pattern matching
    text = " ".join(bullets).lower()

    # Look for mixed breed indicators - including checkmark patterns from database
    if any(
        term in text
        for term in [
            "mixed breed",
            "mix",
            "crossbreed",
            "✔️mixed breed",
            "💕mixed breed",
        ]
    ):
        # Check if specific breed mentioned with mix
        breed_patterns = [
            r"✔️([\w\s]+)\s+mix✔️",  # Pattern: ✔️posavac hound mix✔️
            r"✔️([\w\s]+)\s+mix",  # Pattern: ✔️lab mix
            r"([\w\s]+)\s+mix✔️",  # Pattern: lab mix✔️
            r"(golden retriever)\s+mix",
            r"(labrador|lab)\s+mix",
            r"(german shepherd)\s+mix",
            r"(border collie)\s+mix",
            r"(husky)\s+mix",
            r"(posavac hound)\s+mix",  # Found in database
            r"(gun dog)\s+mix",  # Found in database
            # Removed generic pattern that was matching "size mix" incorrectly
        ]

        for pattern in breed_patterns:
            match = re.search(pattern, text)
            if match:
                breed = match.group(1).strip().title()
                # Special cases
                if breed.lower() == "lab":
                    breed = "Labrador"
                elif breed.lower() == "posavac hound":
                    breed = "Posavac Hound"
                elif breed.lower() == "gun dog":
                    breed = "Gun Dog"
                return f"{breed} Mix"

        return "Mixed Breed"

    # Look for specific pure breeds
    breed_patterns = [
        r"✔️([\w\s]+)✔️",  # Pattern with checkmarks
        r"\b(english pointer)\b",  # Add English Pointer support
        r"\b(pointer)\b",  # Generic pointer
        r"\b(golden retriever)\b",
        r"\b(labrador|lab)\b",
        r"\b(german shepherd)\b",
        r"\b(border collie)\b",
        r"\b(husky)\b",
        r"\b(beagle)\b",
        r"\b(boxer)\b",
        r"\b(rottweiler)\b",
        r"\b(doberman)\b",
        r"\b(poodle)\b",
        r"\b(bulldog)\b",
        r"\b(terrier)\b",
        r"\b(spaniel)\b",
        r"\b(retriever)\b",
        r"\b(shepherd)\b",
        r"\b(posavac hound)\b",
        r"\b(gun dog)\b",
        r"\b(hound)\b",  # Generic hound
    ]

    for pattern in breed_patterns:
        match = re.search(pattern, text)
        if match:
            breed = match.group(1).strip()
            if breed.lower() == "lab":
                return "Labrador"
            elif breed.lower() == "english pointer":
                return "English Pointer"
            elif breed.lower() == "pointer":
                return "Pointer"
            return breed.title()

    return None


def extract_sex(bullets: list[str] | None) -> str | None:
    """Extract sex information from bullet points.

    Args:
        bullets: List of bullet point strings

    Returns:
        'Male', 'Female', or None
    """
    if not bullets:
        return None

    # Join all bullets into single text for pattern matching
    text = " ".join(bullets).lower()

    # Female indicators
    female_patterns = [r"\bshe\b", r"\bher\b", r"\bspayed\b", r"\bfemale\b"]

    # Male indicators
    male_patterns = [
        r"\bhe\b",
        r"\bhis\b",
        r"\bneutered\b",
        r"\bcastration\b",
        r"\bmale\b",
    ]

    female_count = sum(1 for pattern in female_patterns if re.search(pattern, text))
    male_count = sum(1 for pattern in male_patterns if re.search(pattern, text))

    if female_count > male_count:
        return "Female"
    elif male_count > female_count:
        return "Male"

    return None


def normalize_size(weight_text: str | None) -> str | None:
    """Normalize size based on weight information.

    Args:
        weight_text: Text containing weight information

    Returns:
        Size category: 'Tiny', 'Small', 'Medium', 'Large', 'XLarge', or None
    """
    if not weight_text:
        return None

    # Extract weight in kg using shared utility
    weight_kg = extract_weight_from_text(weight_text)
    if not weight_kg:
        return None

    # Size categories based on weight (aligned with rescue dog standards)
    if weight_kg < 5:
        return "Tiny"
    elif weight_kg <= 10:
        return "Small"
    elif weight_kg <= 25:
        return "Medium"
    elif weight_kg <= 40:
        return "Large"
    else:
        return "XLarge"


def extract_weight_kg_legacy(text: str | None) -> float | None:
    """The first weight in the text, in kg: "10 kg", "weighs around 22-25kg" (the middle of a range).

    The first is the current weight; posts add the expected adult weight after
    it ("weighs around 6kg, should be around 15kg at full size").
    """
    if not text:
        return None
    for match in re.finditer(r"(?<![\d/.,])(\d+(?:[.,]\d+)?)\s*(?:[-–]\s*(\d+(?:[.,]\d+)?)\s*)?(?:kgs?|kilos?|kilograms?)\b", text.lower()):
        low = float(match.group(1).replace(",", "."))
        high = float(match.group(2).replace(",", ".")) if match.group(2) else None
        # "around 21-2 kg" is a typo for 21-22, not 11.5
        weight = (low + high) / 2 if high is not None and high >= low else low
        # "DOB 10/2023 - 18kg": a year run into a weight is not one
        if weight <= MAX_DOG_WEIGHT_KG:
            return weight
        if high is not None and high <= MAX_DOG_WEIGHT_KG:
            return high
    return None
