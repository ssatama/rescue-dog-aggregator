"""
Unified standardization module that consolidates all breed, age, and size standardization logic.
Combines the best features from standardization.py, optimized_standardization.py, and enhanced_breed_standardization.py
"""

import re
from copy import deepcopy
from dataclasses import dataclass
from datetime import datetime
from functools import lru_cache
from typing import Any, Dict, List, Optional, Tuple

from utils.breed_utils import generate_breed_slug


@dataclass(frozen=True)
class BreedInfo:
    """Immutable breed information structure"""

    standardized_name: str
    breed_group: str
    size_estimate: Optional[str]


@dataclass(frozen=True)
class AgeInfo:
    """Immutable age information structure"""

    category: str
    min_months: int
    max_months: int


MAX_DOG_AGE_MONTHS = 360


class UnifiedStandardizer:
    """Unified standardizer that handles breed, age, and size standardization in a single pass."""

    def __init__(
        self,
        enable_breed_standardization: bool = True,
        enable_age_standardization: bool = True,
        enable_size_standardization: bool = True,
    ):
        """
        Initialize the unified standardizer with optional feature flags.

        Args:
            enable_breed_standardization: Enable breed standardization features
            enable_age_standardization: Enable age standardization features
            enable_size_standardization: Enable size standardization features
        """
        self.enable_breed_standardization = enable_breed_standardization
        self.enable_age_standardization = enable_age_standardization
        self.enable_size_standardization = enable_size_standardization

        self.breed_data = self._initialize_breed_data()
        self.designer_breeds = self._initialize_designer_breeds()
        self.staffordshire_variations = self._initialize_staffordshire_variations()
        self.american_staffordshire_variations = (
            self._initialize_american_staffordshire_variations()
        )

        # Pre-compile regex patterns for performance
        self.age_patterns = self._compile_age_patterns()
        self.breed_patterns = self._compile_breed_patterns()

    def _initialize_breed_data(self) -> Dict[str, BreedInfo]:
        """Initialize the consolidated breed data with all fixes."""
        breed_data = {
            # Hound Group - Fixed Lurcher classification
            "lurcher": BreedInfo("Lurcher", "Hound", "Large"),
            "greyhound": BreedInfo("Greyhound", "Hound", "Large"),
            "whippet": BreedInfo("Whippet", "Hound", "Medium"),
            "beagle": BreedInfo("Beagle", "Hound", "Medium"),
            "basset hound": BreedInfo("Basset Hound", "Hound", "Medium"),
            "bloodhound": BreedInfo("Bloodhound", "Hound", "Large"),
            "dachshund": BreedInfo("Dachshund", "Hound", "Small"),
            "dackel (kurzhaar)": BreedInfo(
                "Dachshund", "Hound", "Small"
            ),  # German name for Dachshund
            "irish wolfhound": BreedInfo("Irish Wolfhound", "Hound", "XLarge"),
            "afghan hound": BreedInfo("Afghan Hound", "Hound", "Large"),
            "hound": BreedInfo("Hound", "Hound", "Medium"),  # Generic hound
            "hound dog": BreedInfo("Hound", "Hound", "Medium"),  # Generic hound dog
            "foxhound": BreedInfo("Foxhound", "Hound", "Large"),
            "harrier": BreedInfo("Harrier", "Hound", "Medium"),
            "hound dog (segugio)": BreedInfo(
                "Segugio Italiano", "Hound", "Medium"
            ),  # Italian hound
            "black and tan coonhound": BreedInfo(
                "Black and Tan Coonhound", "Hound", "Large"
            ),
            "gonche (bulgarian scenthound)": BreedInfo(
                "Bulgarian Scenthound", "Hound", "Medium"
            ),
            "gonche bulgarian scenthound": BreedInfo(
                "Bulgarian Scenthound", "Hound", "Medium"
            ),
            "podengo portugues pequeno": BreedInfo(
                "Portuguese Podengo", "Hound", "Small"
            ),
            # Terrier Group - Including Staffordshire Bull Terrier
            "staffordshire bull terrier": BreedInfo(
                "Staffordshire Bull Terrier", "Terrier", "Medium"
            ),
            "american staffordshire terrier": BreedInfo(
                "American Staffordshire Terrier", "Terrier", "Medium"
            ),
            "jack russell terrier": BreedInfo(
                "Jack Russell Terrier", "Terrier", "Small"
            ),
            "jack russell": BreedInfo(
                "Jack Russell Terrier", "Terrier", "Small"
            ),  # Alias without "Terrier"
            "yorkshire terrier": BreedInfo("Yorkshire Terrier", "Terrier", "Tiny"),
            "terrier (yorkshire)": BreedInfo("Yorkshire Terrier", "Terrier", "Tiny"),
            "bull terrier": BreedInfo("Bull Terrier", "Terrier", "Medium"),
            "terrier (bull)": BreedInfo("Bull Terrier", "Terrier", "Medium"),
            "scottish terrier": BreedInfo("Scottish Terrier", "Terrier", "Small"),
            "west highland white terrier": BreedInfo(
                "West Highland White Terrier", "Terrier", "Small"
            ),
            "terrier": BreedInfo("Terrier", "Terrier", "Medium"),  # Generic terrier
            "terrier (patterdale)": BreedInfo("Patterdale Terrier", "Terrier", "Small"),
            "patterdale terrier": BreedInfo("Patterdale Terrier", "Terrier", "Small"),
            "terrier (lakeland)": BreedInfo("Lakeland Terrier", "Terrier", "Small"),
            "lakeland terrier": BreedInfo("Lakeland Terrier", "Terrier", "Small"),
            "terrier (fox wire)": BreedInfo("Wire Fox Terrier", "Terrier", "Small"),
            "wire fox terrier": BreedInfo("Wire Fox Terrier", "Terrier", "Small"),
            "terrier (soft coated wheaten)": BreedInfo(
                "Soft Coated Wheaten Terrier", "Terrier", "Medium"
            ),
            "soft coated wheaten terrier": BreedInfo(
                "Soft Coated Wheaten Terrier", "Terrier", "Medium"
            ),
            "terrier (miniature bull)": BreedInfo(
                "Miniature Bull Terrier", "Terrier", "Small"
            ),
            "miniature bull terrier": BreedInfo(
                "Miniature Bull Terrier", "Terrier", "Small"
            ),
            "terrier (bedlington)": BreedInfo("Bedlington Terrier", "Terrier", "Small"),
            "bedlington terrier": BreedInfo("Bedlington Terrier", "Terrier", "Small"),
            "terrier (parson russell)": BreedInfo(
                "Parson Russell Terrier", "Terrier", "Small"
            ),
            "parson russell terrier": BreedInfo(
                "Parson Russell Terrier", "Terrier", "Small"
            ),
            "terrier (border)": BreedInfo("Border Terrier", "Terrier", "Small"),
            "border terrier": BreedInfo("Border Terrier", "Terrier", "Small"),
            "deutscher jagdterrier": BreedInfo(
                "German Hunting Terrier", "Terrier", "Small"
            ),
            "german hunting terrier": BreedInfo(
                "German Hunting Terrier", "Terrier", "Small"
            ),
            "bodeguero andaluz": BreedInfo(
                "Bodeguero Andaluz", "Terrier", "Small"
            ),  # Spanish terrier
            "miniature schnauzer": BreedInfo("Miniature Schnauzer", "Terrier", "Small"),
            "schnauzer (miniature)": BreedInfo(
                "Miniature Schnauzer", "Terrier", "Small"
            ),
            # Additional missing breeds from Dogs Trust patterns
            "cavalier king charles spaniel": BreedInfo(
                "Cavalier King Charles Spaniel", "Toy", "Small"
            ),
            "flat-coated retriever": BreedInfo(
                "Flat-Coated Retriever", "Sporting", "Large"
            ),
            "german shorthaired pointer": BreedInfo(
                "German Shorthaired Pointer", "Sporting", "Large"
            ),
            "german wirehaired pointer": BreedInfo(
                "German Wirehaired Pointer", "Sporting", "Large"
            ),
            "standard schnauzer": BreedInfo("Standard Schnauzer", "Working", "Medium"),
            "giant schnauzer": BreedInfo("Giant Schnauzer", "Working", "Large"),
            "standard poodle": BreedInfo("Standard Poodle", "Non-Sporting", "Large"),
            "miniature poodle": BreedInfo("Miniature Poodle", "Non-Sporting", "Small"),
            "toy poodle": BreedInfo("Toy Poodle", "Toy", "Tiny"),
            "miniature dachshund": BreedInfo("Miniature Dachshund", "Hound", "Small"),
            "miniature pinscher": BreedInfo("Miniature Pinscher", "Toy", "Small"),
            "belgian shepherd dog": BreedInfo(
                "Belgian Shepherd Dog", "Herding", "Large"
            ),
            "boston terrier": BreedInfo("Boston Terrier", "Non-Sporting", "Small"),
            # Sporting Group
            "labrador retriever": BreedInfo("Labrador Retriever", "Sporting", "Large"),
            "golden retriever": BreedInfo("Golden Retriever", "Sporting", "Large"),
            "cocker spaniel": BreedInfo("Cocker Spaniel", "Sporting", "Medium"),
            "english springer spaniel": BreedInfo(
                "English Springer Spaniel", "Sporting", "Medium"
            ),
            "english springer": BreedInfo(
                "English Springer Spaniel", "Sporting", "Medium"
            ),  # Alias without "Spaniel"
            "pointer": BreedInfo("Pointer", "Sporting", "Large"),
            "setter": BreedInfo("Setter", "Sporting", "Large"),
            # Working Group
            "siberian husky": BreedInfo("Siberian Husky", "Working", "Large"),
            "alaskan malamute": BreedInfo("Alaskan Malamute", "Working", "Large"),
            "rottweiler": BreedInfo("Rottweiler", "Working", "Large"),
            "rottweiller": BreedInfo(
                "Rottweiler", "Working", "Large"
            ),  # Common misspelling
            "doberman pinscher": BreedInfo("Doberman Pinscher", "Working", "Large"),
            "great dane": BreedInfo("Great Dane", "Working", "XLarge"),
            "bernese mountain dog": BreedInfo(
                "Bernese Mountain Dog", "Working", "Large"
            ),
            "boxer": BreedInfo("Boxer", "Working", "Large"),
            "cane corso": BreedInfo("Cane Corso", "Working", "Large"),  # Italian breed
            "italian corso dog": BreedInfo(
                "Cane Corso", "Working", "Large"
            ),  # Alias for Cane Corso
            "samoyed": BreedInfo("Samoyed", "Working", "Large"),
            "dogue de bordeaux": BreedInfo("Dogue de Bordeaux", "Working", "XLarge"),
            "saint bernard": BreedInfo("Saint Bernard", "Working", "XLarge"),
            "st bernard": BreedInfo("Saint Bernard", "Working", "XLarge"),
            "czechoslovakian wolfdog": BreedInfo(
                "Czechoslovakian Wolfdog", "Working", "Large"
            ),
            "tschechoslowakischer wolfshund": BreedInfo(
                "Czechoslovakian Wolfdog", "Working", "Large"
            ),  # German name
            # Herding Group
            "german shepherd": BreedInfo("German Shepherd Dog", "Herding", "Large"),
            "german shepherd dog": BreedInfo("German Shepherd Dog", "Herding", "Large"),
            "border collie": BreedInfo("Border Collie", "Herding", "Medium"),
            "australian shepherd": BreedInfo("Australian Shepherd", "Herding", "Large"),
            "belgian malinois": BreedInfo("Belgian Malinois", "Herding", "Large"),
            "malinois": BreedInfo("Belgian Malinois", "Herding", "Large"),
            "collie": BreedInfo("Collie", "Herding", "Large"),
            "corgi": BreedInfo("Corgi", "Herding", "Small"),
            "finnish lapphund": BreedInfo("Finnish Lapphund", "Herding", "Medium"),
            "australian kelpie": BreedInfo("Australian Kelpie", "Herding", "Medium"),
            # Toy Group
            "chihuahua": BreedInfo("Chihuahua", "Toy", "Tiny"),
            "pomeranian": BreedInfo("Pomeranian", "Toy", "Tiny"),
            "shih tzu": BreedInfo("Shih Tzu", "Toy", "Small"),
            "maltese": BreedInfo("Maltese", "Toy", "Tiny"),
            "pug": BreedInfo("Pug", "Toy", "Small"),
            "papillon": BreedInfo("Papillon", "Toy", "Small"),
            "bolognese": BreedInfo("Bolognese", "Toy", "Small"),
            "miniature pinscher": BreedInfo("Miniature Pinscher", "Toy", "Small"),
            "pinscher (miniature)": BreedInfo("Miniature Pinscher", "Toy", "Small"),
            # Non-Sporting Group
            "poodle": BreedInfo("Poodle", "Non-Sporting", "Medium"),
            "bulldog": BreedInfo("Bulldog", "Non-Sporting", "Medium"),
            "french bulldog": BreedInfo("French Bulldog", "Non-Sporting", "Small"),
            "dalmatian": BreedInfo("Dalmatian", "Non-Sporting", "Large"),
            "bichon frise": BreedInfo("Bichon Frise", "Non-Sporting", "Small"),
            "shar pei": BreedInfo("Shar Pei", "Non-Sporting", "Medium"),
            "spitz": BreedInfo("Spitz", "Non-Sporting", "Medium"),
            "american bully": BreedInfo("American Bully", "Non-Sporting", "Medium"),
            "american bully pocket": BreedInfo(
                "American Bully", "Non-Sporting", "Medium"
            ),
            "boston terrier": BreedInfo(
                "Boston Terrier", "Non-Sporting", "Small"
            ),  # Boston Terrier is Non-Sporting, not Terrier group!
            "terrier (boston)": BreedInfo("Boston Terrier", "Non-Sporting", "Small"),
            # Additional breeds for European scrapers
            "spanish mastiff": BreedInfo("Spanish Mastiff", "Working", "XLarge"),
            "mastiff": BreedInfo("Mastiff", "Working", "XLarge"),
            "brittany": BreedInfo("Brittany", "Sporting", "Medium"),
            "brittany spaniel": BreedInfo("Brittany", "Sporting", "Medium"),
            "podenco": BreedInfo("Podenco", "Hound", "Medium"),
            "galgo": BreedInfo("Galgo", "Hound", "Large"),
            "galgo español": BreedInfo("Galgo Español", "Hound", "Large"),
            "livestock guardian dog": BreedInfo(
                "Livestock Guardian Dog", "Working", "Large"
            ),
            # Guardian breeds
            "kangal": BreedInfo("Kangal", "Guardian", "XLarge"),
            "turkish kangal dog": BreedInfo("Kangal", "Guardian", "XLarge"),
            "anatolian shepherd": BreedInfo("Anatolian Shepherd", "Guardian", "XLarge"),
            "anatolian shepherd dog": BreedInfo(
                "Anatolian Shepherd", "Guardian", "XLarge"
            ),
            "akbash": BreedInfo("Akbash", "Guardian", "XLarge"),
            "maremma sheepdog": BreedInfo("Maremma Sheepdog", "Guardian", "Large"),
            "brindle maremma hound": BreedInfo(
                "Maremma Sheepdog", "Guardian", "Large"
            ),  # Maremma is actually a guardian breed
        }

        return breed_data

    def _initialize_designer_breeds(self) -> Dict[str, Dict[str, str]]:
        """Initialize designer breed mappings with parent breeds."""
        return {
            "cockapoo": {
                "name": "Cockapoo",
                "primary": "Cocker Spaniel",
                "secondary": "Poodle",
                "group": "Designer/Hybrid",
                "size": "Small",
            },
            "cockerpoo": {
                "name": "Cockapoo",
                "primary": "Cocker Spaniel",
                "secondary": "Poodle",
                "group": "Designer/Hybrid",
                "size": "Small",
            },  # Variant spelling
            "labradoodle": {
                "name": "Labradoodle",
                "primary": "Labrador Retriever",
                "secondary": "Poodle",
                "group": "Designer/Hybrid",
                "size": "Large",
            },
            "puggle": {
                "name": "Puggle",
                "primary": "Pug",
                "secondary": "Beagle",
                "group": "Hound",
                "size": "Small",
            },  # Takes from Beagle
            "schnoodle": {
                "name": "Schnoodle",
                "primary": "Schnauzer",
                "secondary": "Poodle",
                "group": "Non-Sporting",
                "size": "Medium",
            },
            "yorkipoo": {
                "name": "Yorkipoo",
                "primary": "Yorkshire Terrier",
                "secondary": "Poodle",
                "group": "Toy",
                "size": "Tiny",
            },
            "maltipoo": {
                "name": "Maltipoo",
                "primary": "Maltese",
                "secondary": "Poodle",
                "group": "Toy",
                "size": "Small",
            },
            "goldendoodle": {
                "name": "Goldendoodle",
                "primary": "Golden Retriever",
                "secondary": "Poodle",
                "group": "Sporting",
                "size": "Large",
            },
            "cavapoo": {
                "name": "Cavapoo",
                "primary": "Cavalier King Charles Spaniel",
                "secondary": "Poodle",
                "group": "Toy",
                "size": "Small",
            },
            "cavachon": {
                "name": "Cavachon",
                "primary": "Cavalier King Charles Spaniel",
                "secondary": "Bichon Frise",
                "group": "Designer",
                "size": "Small",
            },
            "pomsky": {
                "name": "Pomsky",
                "primary": "Pomeranian",
                "secondary": "Siberian Husky",
                "group": "Designer/Hybrid",
                "size": "Small",
            },
        }

    def _initialize_staffordshire_variations(self) -> List[str]:
        """Initialize Staffordshire Bull Terrier name variations."""
        return [
            "staffie",
            "staffy",
            "staff",
            "staffordshire",
            "staffordshire terrier",
            "stafford",
            "sbt",
            "staffy bull terrier",
            "english staffordshire bull terrier",
            "english staffie",
            "english staffy",
        ]

    def _initialize_american_staffordshire_variations(self) -> List[str]:
        """Initialize American Staffordshire Terrier name variations."""
        return [
            "am staff",
            "amstaff",
            "american stafford",
            "american staffy",
            "american staffie",
        ]

    def _compile_age_patterns(self) -> Dict[str, re.Pattern]:
        """Compile regex patterns for age parsing."""
        return {
            "birth_date": re.compile(
                r"born\s+on\s+(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})", re.IGNORECASE
            ),
            "years_months": re.compile(
                r"(\d+)\s*(?:year|yr)s?\s*(?:and\s*)?(\d+)?\s*(?:month|mo)s?",
                re.IGNORECASE,
            ),
            "months_only": re.compile(r"(\d+)\s*(?:month|mo)s?", re.IGNORECASE),
            "weeks_only": re.compile(r"(\d+)\s*(?:week|wk)s?", re.IGNORECASE),
            "decimal_years": re.compile(r"(\d+[.,]\d+)\s*(?:year|yr)s?", re.IGNORECASE),
            "range": re.compile(
                r"(\d+)\s*(?:-|to)\s*(\d+)\s*(?:year|yr|month|mo)s?", re.IGNORECASE
            ),
        }

    def _compile_breed_patterns(self) -> Dict[str, re.Pattern]:
        """Compile regex patterns for breed processing."""
        return {
            "mixed": re.compile(r"(mixed|mix|mongrel|mutt)", re.IGNORECASE),
            "cross": re.compile(r"\b(cross|x|×)\b", re.IGNORECASE),
        }

    def _parse_parenthetical_breed(self, breed: str) -> Optional[str]:
        """
        Parse Dogs Trust style parenthetical breed patterns.
        Examples:
            Terrier (jack Russell) -> Jack Russell Terrier
            Collie (border) -> Border Collie
            Retriever (labrador) -> Labrador Retriever
        """
        breed_lower = breed.lower().strip()

        # Pattern: Main breed type (specific variant)
        patterns = [
            (
                r"terrier\s*\(([\w\s]+)\)",
                lambda m: f"{self._capitalize_breed_name(m.group(1))} Terrier",
            ),
            (
                r"retriever\s*\(([\w\s]+)\)",
                lambda m: f"{self._capitalize_breed_name(m.group(1))} Retriever",
            ),
            (
                r"collie\s*\(([\w\s]+)\)",
                lambda m: f"{self._capitalize_breed_name(m.group(1))} Collie",
            ),
            (
                r"spaniel\s*\(([\w\s]+)\)",
                lambda m: f"{self._capitalize_breed_name(m.group(1))} Spaniel",
            ),
            (
                r"schnauzer\s*\(([\w\s]+)\)",
                lambda m: f"{self._capitalize_breed_name(m.group(1))} Schnauzer",
            ),
            (
                r"poodle\s*\(([\w\s]+)\)",
                lambda m: f"{self._capitalize_breed_name(m.group(1))} Poodle",
            ),
            (
                r"pointer\s*\(([\w\s]+)\)",
                lambda m: f"{self._capitalize_breed_name(m.group(1))} Pointer",
            ),
            (
                r"shepherd dog\s*\(([\w\s]+)\)",
                lambda m: f"{self._capitalize_breed_name(m.group(1))} Shepherd",
            ),
            (
                r"dachshund\s*\(([\w\s]+)\)",
                lambda m: f"{self._capitalize_breed_name(m.group(1))} Dachshund",
            ),
            (
                r"chihuahua\s*\(([\w\s]+)\)",
                lambda m: f"{self._capitalize_breed_name(m.group(1))} Chihuahua",
            ),
            (
                r"pinscher\s*\(([\w\s]+)\)",
                lambda m: f"{self._capitalize_breed_name(m.group(1))} Pinscher",
            ),
        ]

        for pattern, transformer in patterns:
            match = re.search(pattern, breed_lower)
            if match:
                # Check if it's a cross
                is_cross = " cross" in breed_lower or " x " in breed_lower
                base_breed = transformer(match)

                # Special case handling for common variants
                replacements = {
                    "Jack Russell Terrier": "Jack Russell Terrier",
                    "Border Collie": "Border Collie",
                    "Labrador Retriever": "Labrador Retriever",
                    "Golden Retriever": "Golden Retriever",
                    "Cocker Spaniel": "Cocker Spaniel",
                    "Cavalier King Charles Spaniel": "Cavalier King Charles Spaniel",
                    "English Springer Spaniel": "English Springer Spaniel",
                    "German Shorthaired Pointer": "German Shorthaired Pointer",
                    "German Wirehaired Pointer": "German Wirehaired Pointer",
                    "Flat Coated Retriever": "Flat-Coated Retriever",
                    "Miniature Schnauzer": "Miniature Schnauzer",
                    "Giant Schnauzer": "Giant Schnauzer",
                    "Standard Poodle": "Standard Poodle",
                    "Miniature Poodle": "Miniature Poodle",
                    "Smooth Haired Dachshund": "Dachshund",
                    "Miniature Smooth Haired Dachshund": "Miniature Dachshund",
                    "Long Coat Chihuahua": "Chihuahua",
                    "Smooth Coat Chihuahua": "Chihuahua",
                    "Miniature Pinscher": "Miniature Pinscher",
                    "Malinois Shepherd": "Belgian Malinois",
                    "Groenendael Shepherd": "Belgian Shepherd Dog",
                    "West Highland White Terrier": "West Highland White Terrier",
                    "Staffordshire Bull Terrier": "Staffordshire Bull Terrier",
                    "Miniature Bull Terrier": "Miniature Bull Terrier",
                    "Lakeland Terrier": "Lakeland Terrier",
                    "Bedlington Terrier": "Bedlington Terrier",
                    "Parson Russell Terrier": "Parson Russell Terrier",
                    "Patterdale Terrier": "Patterdale Terrier",
                    "Boston Terrier": "Boston Terrier",
                    "Yorkshire Terrier": "Yorkshire Terrier",
                    "Fox Wire Terrier": "Wire Fox Terrier",
                }

                # Apply replacements
                for old, new in replacements.items():
                    if base_breed.lower() == old.lower():
                        base_breed = new
                        break

                return base_breed + (" Cross" if is_cross else "")

        return None

    @lru_cache(maxsize=1000)
    def apply_full_standardization(
        self,
        breed: Optional[str] = None,
        age: Optional[str] = None,
        size: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Apply full standardization to all three fields in a single pass.

        Args:
            breed: The breed string to standardize
            age: The age string to parse
            size: The size string to standardize

        Returns:
            Dictionary with standardized breed, age, and size information
        """
        # Standardize breed
        breed_result = (
            self._standardize_breed(breed)
            if self.enable_breed_standardization
            else {
                "name": breed,
                "group": "Unknown",
                "confidence": 0.0,
                "is_mixed": False,
            }
        )

        # Standardize age
        age_result = (
            self._standardize_age(age)
            if self.enable_age_standardization
            else {"age_category": None, "age_min_months": None, "age_max_months": None}
        )

        # Standardize size
        size_result = (
            self._standardize_size(size, breed)
            if self.enable_size_standardization
            else {"category": size}
        )

        # Build result in the format expected by BaseScraper and tests
        primary_breed = breed_result.get(
            "primary_breed", breed_result.get("name", "Unknown")
        )
        result = {
            # Breed fields
            "breed": breed_result.get("name", "Unknown"),
            "standardized_breed": breed_result.get(
                "name", "Unknown"
            ),  # Add standardized_breed for tests
            "breed_category": breed_result.get("group", "Unknown"),
            "breed_type": breed_result.get(
                "breed_type", "purebred"
            ),  # Add breed_type field
            "breed_confidence": breed_result.get(
                "confidence", 0.0
            ),  # Add breed_confidence field
            "primary_breed": primary_breed,
            "secondary_breed": breed_result.get("secondary_breed"),
            "breed_slug": generate_breed_slug(
                primary_breed
            ),  # Generate breed_slug for breed pages
            "standardization_confidence": breed_result.get("confidence", 0.0),
            # Age fields - preserve original and add ranges
            "age": age,  # Preserve original age field
            "age_text": age or "Unknown",  # Database expects age_text field
            "age_category": age_result.get("age_category"),
            "age_min_months": age_result.get("age_min_months"),
            "age_max_months": age_result.get("age_max_months"),
            # Size fields - preserve original and add standardized
            "size": size,  # Preserve original size field
            "standardized_size": size_result.get("category", "Medium"),
        }

        # Handle mixed breeds properly for primary/secondary breed fields
        if breed_result.get("is_mixed") and not breed_result.get("primary_breed"):
            # For regular mixed breeds like "Terrier Mix", set secondary to "Mixed Breed"
            result["secondary_breed"] = "Mixed Breed"
        elif not breed_result.get("is_mixed"):
            # For pure breeds, secondary breed should be None
            result["secondary_breed"] = None

        # Return deep copy to prevent cache mutation
        return deepcopy(result)

    def apply_field_normalization(self, animal_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Apply field normalization including trimming, boolean conversion, and defaults.
        This method handles all the field cleaning that was in the legacy standardization.
        """
        if not animal_data:
            return animal_data

        result = animal_data.copy()

        # String field trimming and cleaning
        string_fields = [
            "name",
            "breed",
            "age",
            "size",
            "sex",
            "gender",
            "location",
            "description",
            "external_url",
            "external_id",
        ]
        for field in string_fields:
            if field in result and isinstance(result[field], str):
                result[field] = result[field].strip()
                # Clean empty strings to None for consistency
                if not result[field]:
                    result[field] = None

        # Boolean field normalization
        boolean_fields = ["neutered", "spayed", "vaccinated", "microchipped"]
        for field in boolean_fields:
            if field in result:
                result[field] = self._normalize_boolean(result[field])

        # Image URL cleaning (especially for PetsInTurkey Wix images)
        if "image" in result and result["image"]:
            result["image"] = self._clean_image_url(result["image"])

        # Set default values for required fields
        result = self._set_default_values(result)

        return result

    def _normalize_boolean(self, value: Any) -> Optional[bool]:
        """Convert various boolean representations to actual booleans."""
        if value is None:
            return None
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            value_lower = value.strip().lower()
            if value_lower in ["yes", "true", "1", "y", "ja", "si"]:
                return True
            elif value_lower in ["no", "false", "0", "n", "nein"]:
                return False
            elif value_lower == "":
                return None
        return None

    def _clean_image_url(self, image_url: str) -> str:
        """Clean image URLs, especially Wix platform URLs."""
        if not image_url or not isinstance(image_url, str):
            return image_url

        # Clean Wix image URLs by removing parameters
        if "wix:image://" in image_url:
            # Remove everything after # for Wix URLs
            if "#" in image_url:
                image_url = image_url.split("#")[0]
            # Convert wix:image:// to actual URL if possible
            # This is a simplified conversion - in practice you'd need the full Wix media URL
            if image_url.startswith("wix:image://"):
                # For now, just remove the wix:image:// prefix as it's not a valid URL
                return image_url.replace(
                    "wix:image://", "https://static.wixstatic.com/"
                )

        return image_url

    def _set_default_values(self, animal_data: Dict[str, Any]) -> Dict[str, Any]:
        """Set default values for required fields."""
        defaults = {
            "animal_type": "dog",
            "status": "available",
        }

        for field, default_value in defaults.items():
            if field not in animal_data or animal_data[field] is None:
                animal_data[field] = default_value

        return animal_data

    def _standardize_breed(self, breed: Optional[str]) -> Dict[str, Any]:
        """Standardize breed with all fixes including Lurcher, designer breeds, and Staffordshire."""
        if not breed:
            return {
                "name": "Unknown",
                "group": "Unknown",
                "size": None,
                "confidence": 0.0,
                "breed_type": "unknown",
                "is_mixed": False,
            }

        # Handle non-string inputs
        if not isinstance(breed, str):
            return {
                "name": "Unknown",
                "group": "Unknown",
                "size": None,
                "confidence": 0.0,
                "breed_type": "unknown",
                "is_mixed": False,
            }

        breed_lower = breed.strip().lower()
        is_mixed = bool(
            self.breed_patterns["cross"].search(breed_lower)
            or self.breed_patterns["mixed"].search(breed_lower)
        )

        # Try parenthetical pattern first (Dogs Trust style)
        parsed_breed = self._parse_parenthetical_breed(breed)
        if parsed_breed:
            # Now look up the parsed breed in our data
            parsed_lower = parsed_breed.replace(" Cross", "").lower()
            if parsed_lower in self.breed_data:
                breed_info = self.breed_data[parsed_lower]
                return {
                    "name": parsed_breed,
                    "group": "Mixed" if is_mixed else breed_info.breed_group,
                    "size": breed_info.size_estimate,
                    "confidence": 0.9 if not is_mixed else 0.7,
                    "breed_type": "purebred" if not is_mixed else "crossbreed",
                    "is_mixed": is_mixed,
                    "primary_breed": parsed_breed.replace(" Cross", ""),
                    "secondary_breed": None,
                }
            else:
                # Parsed but not in breed_data - still better than unknown
                return {
                    "name": parsed_breed,
                    "group": "Mixed" if is_mixed else "Unknown",
                    "size": None,
                    "confidence": 0.7 if not is_mixed else 0.6,
                    "breed_type": "purebred" if not is_mixed else "crossbreed",
                    "is_mixed": is_mixed,
                    "primary_breed": parsed_breed.replace(" Cross", ""),
                    "secondary_breed": None,
                }

        # Check for Lurcher first (high priority fix)
        if "lurcher" in breed_lower:
            return {
                "name": "Lurcher" + (" Cross" if is_mixed else ""),
                "group": "Hound",
                "size": "Large",
                "confidence": 0.95,
                "breed_type": "sighthound",
                "is_mixed": is_mixed,
            }

        # Check for American Staffordshire variations first (more specific)
        for variation in self.american_staffordshire_variations:
            if variation in breed_lower or (
                "american" in breed_lower and "staff" in breed_lower
            ):
                return {
                    "name": "American Staffordshire Terrier"
                    + (" Mix" if is_mixed else ""),
                    "group": "Mixed" if is_mixed else "Terrier",
                    "size": "Medium",
                    "confidence": 0.9 if not is_mixed else 0.8,
                    "breed_type": "purebred" if not is_mixed else "crossbreed",
                    "is_mixed": is_mixed,
                }

        # Check for Staffordshire variations (less specific)
        for variation in self.staffordshire_variations:
            if variation in breed_lower and "american" not in breed_lower:
                return {
                    "name": "Staffordshire Bull Terrier" + (" Mix" if is_mixed else ""),
                    "group": "Mixed" if is_mixed else "Terrier",
                    "size": "Medium",
                    "confidence": 0.9 if not is_mixed else 0.8,
                    "breed_type": "purebred" if not is_mixed else "crossbreed",
                    "is_mixed": is_mixed,
                }

        # Check for designer breeds
        for designer_key, designer_info in self.designer_breeds.items():
            if designer_key in breed_lower:
                return {
                    "name": designer_info["name"],
                    "group": designer_info["group"],
                    "size": designer_info["size"],
                    "confidence": 0.85,
                    "breed_type": "crossbreed",  # Designer breeds are crossbreeds
                    "primary_breed": designer_info["primary"],
                    "secondary_breed": designer_info["secondary"],
                    "is_mixed": True,
                }

        # Check standard breed data
        if breed_lower in self.breed_data:
            breed_info = self.breed_data[breed_lower]
            return {
                "name": breed_info.standardized_name + (" Cross" if is_mixed else ""),
                "group": "Mixed" if is_mixed else breed_info.breed_group,
                "size": breed_info.size_estimate,
                "confidence": 0.9 if not is_mixed else 0.7,
                "breed_type": "purebred" if not is_mixed else "crossbreed",
                "is_mixed": is_mixed,
            }

        # Check for crosses with specific breed mentioned FIRST (before generic mixed breed)
        # Include international breed terms (German: schäferhund=shepherd, hund=dog)
        if is_mixed and any(
            word in breed_lower
            for word in [
                "labrador",
                "collie",
                "terrier",
                "spaniel",
                "shepherd",
                "retriever",
                "pointer",
                "setter",
                "podenco",
                "galgo",
                "chihuahua",
                "beagle",
                "bulldog",
                "hound",
                "pug",
                "ridgeback",
                "poodle",
                "mastiff",
                "husky",
                "akita",
                "boxer",
                "rottweiler",
                "newfoundland",
                "bichon",
                "maltese",
                "shih tzu",
                "whippet",
                "dalmatian",
                "basset",
                "australian",
                "finnish",
                "french",
                "american",
                "dutch",
                "schäferhund",
                "hund",
                "dogo",
                "gordon",
                "lhasa",
                "pomeranian",
                "dachshund",
                "great dane",
                "irish",
                "northern",
            ]
        ):
            # This is a cross with an identifiable breed component
            # Properly capitalize breed names like "Terrier Mix", "Labrador Cross", "German Shepherd Mix"
            breed_name = self._capitalize_breed_name(breed.strip())
            return {
                "name": breed_name,
                "group": "Mixed",
                "size": None,
                "confidence": 0.7,
                "breed_type": "crossbreed",
                "is_mixed": True,
            }  # Medium confidence for identifiable crosses

        # Check for generic mixed breed (only if no specific breed identified)
        if self.breed_patterns["mixed"].search(breed_lower):
            return {
                "name": "Mixed Breed",
                "group": "Mixed",
                "size": None,
                "confidence": 0.5,
                "breed_type": "mixed",
                "is_mixed": True,
            }

        # Unknown breed - if it's mixed, put in Mixed group, otherwise Unknown
        breed_name = self._capitalize_breed_name(breed.strip())
        return {
            "name": breed_name,
            "group": "Mixed" if is_mixed else "Unknown",
            "size": None,
            "confidence": 0.3,
            "breed_type": "unknown",
            "is_mixed": is_mixed,
        }

    def _capitalize_breed_name(self, breed: str) -> str:
        """
        Properly capitalize breed names.

        Args:
            breed: The breed string to capitalize

        Returns:
            Properly capitalized breed name
        """
        if not breed:
            return breed

        # Common words that should remain lowercase unless at start
        lowercase_words = {"of", "de", "and", "or", "the"}

        # Words that should always be uppercase
        uppercase_words = {"ii", "iii", "iv"}

        words = breed.split()
        result = []

        for i, word in enumerate(words):
            word_lower = word.lower()

            if word_lower in uppercase_words:
                result.append(word.upper())
            elif i == 0 or word_lower not in lowercase_words:
                # Capitalize first letter, keep rest of case
                result.append(word.capitalize())
            else:
                result.append(word_lower)

        return " ".join(result)

    def _parse_age_text(
        self, age_text: str
    ) -> Tuple[Optional[str], Optional[int], Optional[int]]:
        """
        Parse age text into a standardized age category and month range.
        Ported from legacy standardization.py for full compatibility.

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
        years_match = re.search(
            r"(?<!-)\b(\d+(?:[.,]\d+)?)\s*(?:years?|y(?:rs?)?(?:\/o)?|yo|jahr)",
            age_text,
        )
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
                if (
                    months < 0 or months > 300
                ):  # Reasonable bounds for dog age in months
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
        current_date = datetime.now()

        # Pattern 1: Born MM/YYYY or MM/YYYY
        birth_date_match = re.search(r"(?:born\s*)?(\d{1,2})[/-](\d{4})", age_text)
        if birth_date_match:
            try:
                birth_month = int(birth_date_match.group(1))
                birth_year = int(birth_date_match.group(2))

                # Validate birth date reasonableness (dogs live max ~15-20 years)
                earliest_reasonable_year = current_date.year - 20
                if (
                    birth_year < earliest_reasonable_year
                    or birth_year > current_date.year + 1
                ):
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
        if birth_year_match and not re.search(
            r"\d+\s*(?:years?|months?)", age_text
        ):  # Avoid matching "2 years"
            try:
                birth_year = int(birth_year_match.group(1))

                # Validate birth year reasonableness (dogs live max ~15-20 years)
                earliest_reasonable_year = current_date.year - 20
                if (
                    birth_year < earliest_reasonable_year
                    or birth_year > current_date.year + 1
                ):
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
        elif any(
            term in age_text
            for term in ["young adult", "adolescent", "juvenile", "teen"]
        ):
            return "Young", 12, 36
        elif any(term in age_text for term in ["adult", "grown", "mature"]):
            return "Adult", 36, 96
        elif any(term in age_text for term in ["senior", "older", "elderly", "old"]):
            return "Senior", 96, 240

        # Handle ranges (duplicate pattern for different order)
        range_match = re.search(
            r"(\d+)\s*(?:-|to)\s*(\d+)\s*(?:year|yr|month|mo)s?", age_text
        )
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
        if any(
            gender_term in age_text
            for gender_term in ["geschlecht:", "gender:", "sex:"]
        ):
            return None, None, None

        # If we can't determine, return None
        return None, None, None

    def _standardize_age(self, age: Optional[str]) -> Dict[str, Any]:
        """Standardize age string into structured format."""
        if not age:
            return {
                "original": age,
                "age_category": None,
                "age_min_months": None,
                "age_max_months": None,
            }

        if not isinstance(age, str):
            return {
                "original": str(age),
                "age_category": None,
                "age_min_months": None,
                "age_max_months": None,
            }

        # Use the comprehensive age parsing logic
        category, min_months, max_months = self._parse_age_text(age)

        return {
            "original": age,
            "age_category": category,
            "age_min_months": min_months,
            "age_max_months": max_months,
        }

    def _get_size_from_breed(self, breed: str) -> Optional[str]:
        """
        Estimate dog size based on breed.
        Ported from legacy standardization.py for breed-based size estimation.

        Args:
            breed: Standardized breed name

        Returns:
            Size estimate (Tiny, Small, Medium, Large, XLarge) or None if unknown
        """
        if not breed:
            return None

        # Ensure breed is a string
        if not isinstance(breed, str):
            return None

        # Try to find the breed in our mapping
        clean_breed = breed.lower()

        # First check our breed_data for direct matches
        if clean_breed in self.breed_data:
            breed_info = self.breed_data[clean_breed]
            return breed_info.size_estimate

        # Check designer breeds
        for designer_key, designer_info in self.designer_breeds.items():
            if designer_key in clean_breed:
                return designer_info["size"]

        # For mixed breeds, try to extract the base breed
        if "mix" in clean_breed or "cross" in clean_breed:
            # Remove mix/cross indicators to find base breed
            base_breed = clean_breed.replace("mix", "").replace("cross", "").strip()

            # Try partial matches for common breed words
            for breed_key, breed_info in self.breed_data.items():
                if breed_key in base_breed or base_breed in breed_key:
                    return breed_info.size_estimate

        # Try partial matching for any breed words
        breed_words = clean_breed.split()
        for word in breed_words:
            if len(word) > 3:  # Skip short words
                for breed_key, breed_info in self.breed_data.items():
                    if word in breed_key or breed_key in word:
                        return breed_info.size_estimate

        return None

    def _standardize_size(
        self, size: Optional[str], breed: Optional[str] = None
    ) -> Dict[str, Any]:
        """Standardize size with comprehensive fallback chain: explicit → breed → weight → default."""
        canonical_sizes = ["Tiny", "Small", "Medium", "Large", "XLarge"]

        # Step 1: Try to use explicit size if provided
        if size and isinstance(size, str):
            size_lower = size.strip().lower()

            size_map = {
                "tiny": "Tiny",  # Keep actual tiny for tiny breeds
                "extra small": "Small",
                "xs": "Small",
                "small": "Small",
                "s": "Small",
                "medium": "Medium",
                "m": "Medium",
                "large": "Large",
                "l": "Large",
                "extra large": "Large",  # Map XLarge to Large for canonical sizes
                "xlarge": "Large",
                "xl": "Large",
                "giant": "Large",
            }

            if size_lower in size_map:
                return {
                    "category": size_map[size_lower],
                    "weight_range": self._get_weight_range(size_map[size_lower]),
                    "source": "explicit",
                }

        # Step 2: Fall back to breed-based estimation
        if breed and self.enable_breed_standardization:
            breed_size = self._get_size_from_breed(breed)
            if breed_size:
                # Map XLarge to Large for canonical sizes unless it's a guardian breed
                if breed_size == "XLarge":
                    breed_size = "Large"
                return {
                    "category": breed_size,
                    "weight_range": self._get_weight_range(breed_size),
                    "source": "breed_estimated",
                }

        # Step 3: TODO - Weight-based estimation would go here
        # Step 4: Default fallback
        return {
            "category": "Medium",
            "weight_range": self._get_weight_range("Medium"),
            "source": "default",
        }

    def _get_weight_range(self, size_category: str) -> Dict[str, int]:
        """Get weight range for a size category."""
        weight_ranges = {
            "Tiny": {"min": 0, "max": 10},
            "Small": {"min": 10, "max": 25},
            "Medium": {"min": 25, "max": 60},
            "Large": {"min": 60, "max": 90},
            "XLarge": {"min": 90, "max": 200},
        }
        return weight_ranges.get(size_category, {"min": 25, "max": 60})

    def apply_batch_standardization(
        self, animals: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Process multiple animals efficiently in batch."""
        results = []
        for animal in animals:
            result = self.apply_full_standardization(
                breed=animal.get("breed"),
                age=animal.get("age"),
                size=animal.get("size"),
            )
            results.append(result)
        return results

    def clear_cache(self):
        """Clear all LRU caches."""
        self.apply_full_standardization.cache_clear()

    def get_cache_info(self) -> Dict[str, Any]:
        """Get cache statistics."""
        return {
            "full_standardization": self.apply_full_standardization.cache_info()._asdict()
        }
