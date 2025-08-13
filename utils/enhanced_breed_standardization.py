#!/usr/bin/env python3
"""
Enhanced Breed Standardization - Phase 3 Implementation
Improved breed standardization algorithm based on database analysis and pattern detection.
"""

import json
import re
from difflib import SequenceMatcher
from typing import Dict, List, Optional, Tuple


# Load the enhanced mapping rules from Phase 2 analysis
def load_enhanced_rules() -> Dict:
    """Load enhanced mapping rules from Phase 2 analysis."""
    try:
        with open("/Users/samposatama/Documents/rescue-dog-aggregator/analysis/enhanced_mapping_rules.json", "r") as f:
            return json.load(f)
    except FileNotFoundError:
        # Fallback to embedded rules if file not found
        return get_embedded_enhanced_rules()


def get_embedded_enhanced_rules() -> Dict:
    """Embedded enhanced rules as fallback."""
    return {
        "preprocessing_rules": {
            "punctuation_cleanup": [
                (r"\s*-\s*", " "),
                (r"\s*\.\s*", " "),
                (r"\s*\(\s*", " ("),
                (r"\s*\)\s*", ") "),
                (r"\s+", " "),
            ],
            "abbreviation_expansion": {
                "gsd": "german shepherd",
                "jrt": "jack russell terrier",
                "bc": "border collie",
                "lab": "labrador",
                "gs": "german shepherd",
                "am staff": "american staffordshire terrier",
            },
            "typo_correction": {
                "retreiver": "retriever",
                "german sheperd": "german shepherd",
                "german shephard": "german shepherd",
                "labardor": "labrador",
                "labardoor": "labrador",
                "pittbull": "pit bull",
                "rott weiler": "rottweiler",
                "yorkie": "yorkshire terrier",
                "rottie": "rottweiler",
            },
            "language_normalization": {
                "schäferhund": "german shepherd",
                "hütehund": "herding dog",
                "herdenschutzhund": "livestock guardian dog",
                "bodeguero": "spanish terrier",
                "galgo español": "galgo",
                "perdigueiro": "pointer",
            },
        },
        "breed_specific_mappings": {
            # Exact mappings for specific problematic breeds
            "exact_mappings": {
                "choc labrador mix": "Labrador Retriever Mix",
                "labrador mix": "Labrador Retriever Mix",
                "labrador-mix": "Labrador Retriever Mix",
                "gsd mix": "German Shepherd Mix",
                "german shepherd mix": "German Shepherd Mix",
                "schäferhundmix": "German Shepherd Mix",
                "(german shepherd) mixed breed": "German Shepherd Mix",
                "mixed breed (german shepherd)": "German Shepherd Mix",
                "mixed breed, possibly labrador": "Labrador Retriever Mix",
                "pointer (mixed breed)": "Pointer Mix",
                "pointer - mixed breed": "Pointer Mix",
                "pointer cross": "Pointer Mix",
                "a mix": "Mixed Breed",
                "size mix": "Mixed Breed",
                "type mix": "Mixed Breed",
                "started mix": "Mixed Breed",
                "paws mix": "Mixed Breed",
            },
            # Pattern-based mappings for broader categories
            "pattern_mappings": {
                "mixed breed": {"keywords": ["cross", "crossbreed", "mixed", "mix"], "target": "Mixed Breed"},
                "labrador": {"keywords": ["labrador mix", "lab mix", "labrador-mix"], "target": "Labrador Retriever Mix"},
                "german shepherd": {"keywords": ["german shepherd mix", "gsd mix", "shepherd mix"], "target": "German Shepherd Mix"},
            },
        },
        "fuzzy_matching_thresholds": {
            "exact_match_first": True,
            "similarity_threshold": 80,
            "length_difference_threshold": 5,
        },
    }


class EnhancedBreedStandardizer:
    """Enhanced breed standardization with fuzzy matching and pattern recognition."""

    def __init__(self):
        self.rules = load_enhanced_rules()
        self.preprocessing_rules = self.rules["preprocessing_rules"]
        self.breed_mappings = self.rules["breed_specific_mappings"]
        self.thresholds = self.rules["fuzzy_matching_thresholds"]

        # Import the original breed mapping for fallback
        from utils.standardization import BREED_MAPPING

        self.original_breed_mapping = BREED_MAPPING

    def preprocess_breed_text(self, breed_text: str) -> str:
        """Apply preprocessing rules to normalize breed text."""
        if not breed_text:
            return breed_text

        processed = breed_text.lower().strip()

        # Apply punctuation cleanup
        for pattern, replacement in self.preprocessing_rules["punctuation_cleanup"]:
            processed = re.sub(pattern, replacement, processed)

        # Apply typo correction
        for typo, correction in self.preprocessing_rules["typo_correction"].items():
            processed = processed.replace(typo, correction)

        # Apply language normalization
        for foreign, english in self.preprocessing_rules["language_normalization"].items():
            processed = processed.replace(foreign, english)

        # Apply abbreviation expansion
        words = processed.split()
        expanded_words = []
        for word in words:
            if word in self.preprocessing_rules["abbreviation_expansion"]:
                expanded_words.append(self.preprocessing_rules["abbreviation_expansion"][word])
            else:
                expanded_words.append(word)

        return " ".join(expanded_words).strip()

    def apply_breed_specific_mappings(self, processed_text: str) -> Optional[Tuple[str, str, Optional[str]]]:
        """Apply breed-specific mapping rules."""
        # First, try exact mappings
        exact_mappings = self.breed_mappings.get("exact_mappings", {})
        if processed_text in exact_mappings:
            target = exact_mappings[processed_text]
            return target, self._get_breed_group(target), self._estimate_size_from_breed(target)

        # Then try pattern-based mappings
        pattern_mappings = self.breed_mappings.get("pattern_mappings", {})
        for breed_category, mapping_info in pattern_mappings.items():
            target = mapping_info["target"]
            keywords = mapping_info["keywords"]

            # Check if any keyword matches exactly
            for keyword in keywords:
                if processed_text == keyword.lower():
                    return target, self._get_breed_group(target), self._estimate_size_from_breed(target)

        # Finally check for keyword containment
        for breed_category, mapping_info in pattern_mappings.items():
            target = mapping_info["target"]
            keywords = mapping_info["keywords"]

            # Check if any keyword is contained in the text
            for keyword in keywords:
                if keyword.lower() in processed_text:
                    return target, self._get_breed_group(target), self._estimate_size_from_breed(target)

        return None

    def fuzzy_match_breed(self, processed_text: str) -> Optional[Tuple[str, str, Optional[str]]]:
        """Apply fuzzy string matching to find similar breeds."""
        if not self.thresholds["exact_match_first"]:
            return None

        best_match = None
        best_ratio = 0

        # Check against original breed mapping
        for original_breed, (std_breed, group, size) in self.original_breed_mapping.items():
            ratio = SequenceMatcher(None, processed_text, original_breed.lower()).ratio() * 100

            # Check similarity threshold and length difference
            length_diff = abs(len(processed_text) - len(original_breed))

            if ratio >= self.thresholds["similarity_threshold"] and length_diff <= self.thresholds["length_difference_threshold"] and ratio > best_ratio:
                best_match = (std_breed, group, size)
                best_ratio = ratio

        return best_match

    def _estimate_size_from_breed(self, breed_name: str) -> Optional[str]:
        """Estimate size from breed name."""
        breed_lower = breed_name.lower()

        # Size indicators
        if any(tiny in breed_lower for tiny in ["chihuahua", "yorkshire", "maltese", "toy"]):
            return "Tiny"
        elif any(small in breed_lower for small in ["beagle", "jack russell", "cocker", "shih tzu"]):
            return "Small"
        elif any(large in breed_lower for large in ["labrador", "german shepherd", "golden", "rottweiler"]):
            return "Large"
        elif any(xlarge in breed_lower for xlarge in ["great dane", "mastiff", "saint bernard"]):
            return "XLarge"
        else:
            return "Medium"  # Default for unknown

    def _get_breed_group(self, breed_name: str) -> str:
        """Get breed group from breed name."""
        breed_lower = breed_name.lower()

        if any(sporting in breed_lower for sporting in ["retriever", "spaniel", "pointer", "setter"]):
            return "Sporting"
        elif any(hound in breed_lower for hound in ["beagle", "hound", "greyhound", "podenco", "galgo"]):
            return "Hound"
        elif any(working in breed_lower for working in ["boxer", "rottweiler", "husky", "mastiff"]):
            return "Working"
        elif any(terrier in breed_lower for terrier in ["terrier", "pittie", "pit bull"]):
            return "Terrier"
        elif any(toy in breed_lower for toy in ["chihuahua", "pomeranian", "maltese", "pug"]):
            return "Toy"
        elif any(herding in breed_lower for herding in ["shepherd", "collie", "corgi", "heeler"]):
            return "Herding"
        elif "mix" in breed_lower:
            return "Mixed"
        else:
            return "Unknown"

    def standardize_breed_enhanced(self, breed_text: str) -> Tuple[str, str, Optional[str]]:
        """
        Enhanced breed standardization with multi-stage processing.

        Args:
            breed_text: Original breed text from the database

        Returns:
            Tuple of (standardized_breed, breed_group, size_estimate)
        """
        if not breed_text or not isinstance(breed_text, (str, type(None))):
            return "Unknown", "Unknown", None

        original_text = str(breed_text).strip()
        if not original_text:
            return "Unknown", "Unknown", None

        # Stage 1: Try exact match with original algorithm first
        for original, standardized in self.original_breed_mapping.items():
            if original == original_text.lower():
                return standardized

        # Stage 2: Preprocess the text
        processed_text = self.preprocess_breed_text(original_text)
        if not processed_text:
            return "Unknown", "Unknown", None

        # Stage 3: Try exact match with preprocessed text
        for original, standardized in self.original_breed_mapping.items():
            if original == processed_text:
                return standardized

        # Stage 4: Apply breed-specific mappings
        specific_match = self.apply_breed_specific_mappings(processed_text)
        if specific_match:
            return specific_match

        # Stage 5: Try original algorithm's "contains" approach with processed text
        for original, standardized in self.original_breed_mapping.items():
            if original in processed_text:
                # If we find a mix indicator, adjust the standardized breed name
                if any(mix_word in processed_text for mix_word in ["mix", "cross", "mixed"]) and " Mix" not in standardized[0]:
                    return f"{standardized[0]} Mix", "Mixed", standardized[2]
                return standardized

        # Stage 6: Apply fuzzy matching
        fuzzy_match = self.fuzzy_match_breed(processed_text)
        if fuzzy_match:
            return fuzzy_match

        # Stage 7: Handle mix breeds not explicitly in our mapping
        if any(mix_word in processed_text for mix_word in ["mix", "cross", "mixed"]):
            return "Mixed Breed", "Mixed", None

        # Stage 8: Fallback to capitalized original
        capitalized_breed = " ".join(word.capitalize() for word in processed_text.split())
        return capitalized_breed, "Unknown", None


# Global instance for easy use
enhanced_standardizer = EnhancedBreedStandardizer()


def normalize_breed_case_v2(breed_text: str, use_enhanced: bool = False) -> str:
    """
    Enhanced version of normalize_breed_case with feature flag support.

    Args:
        breed_text: Original breed text
        use_enhanced: Whether to use enhanced standardization

    Returns:
        Standardized breed name
    """
    if use_enhanced:
        standardized_breed, _, _ = enhanced_standardizer.standardize_breed_enhanced(breed_text)
        return standardized_breed
    else:
        # Fall back to original implementation
        from utils.standardization import normalize_breed_case

        return normalize_breed_case(breed_text)


def standardize_breed_v2(breed_text: str, use_enhanced: bool = False) -> Tuple[str, str, Optional[str]]:
    """
    Enhanced version of standardize_breed with feature flag support.

    Args:
        breed_text: Original breed text
        use_enhanced: Whether to use enhanced standardization

    Returns:
        Tuple of (standardized_breed, breed_group, size_estimate)
    """
    if use_enhanced:
        return enhanced_standardizer.standardize_breed_enhanced(breed_text)
    else:
        # Fall back to original implementation
        from utils.standardization import standardize_breed

        return standardize_breed(breed_text)


if __name__ == "__main__":
    # Test the enhanced standardization
    test_cases = [
        # Original problematic cases from our analysis
        "Choc. labrador mix",
        "German Shepherd Mix",
        "gsd mix",
        "Labrador-Mix",
        "Mixed Breed (German Shepherd)",
        "A Mix",
        "Size Mix",
        "Schäferhundmix",
        "german sheperd mix",  # typo
        "retreiver mix",  # typo
        "JRT Mix",  # abbreviation
        "BC Mix",  # abbreviation
        "Cross",
        "Crossbreed",
        "Pointer - Mixed Breed",
        "Mixed Breed, possibly Labrador",
        "Galgo Español",
        "Hütehund Mix",
        # Test edge cases
        "",
        None,
        "Unknown",
        "Regular Breed Name",
    ]

    print("Enhanced Breed Standardization Tests:")
    print("=" * 80)
    print(f"{'Original':<35} {'Enhanced':<25} {'Group':<12} {'Size'}")
    print("-" * 80)

    for test_breed in test_cases:
        if test_breed is None:
            print(f"{'None':<35} {'Unknown':<25} {'Unknown':<12} {'None'}")
            continue

        try:
            std_breed, group, size = enhanced_standardizer.standardize_breed_enhanced(test_breed)
            print(f"{str(test_breed):<35} {std_breed:<25} {group:<12} {str(size)}")
        except Exception as e:
            print(f"{str(test_breed):<35} ERROR: {str(e)}")

    print("\nComparison with original algorithm:")
    print("=" * 80)

    comparison_cases = [
        "Choc. labrador mix",
        "GSD Mix",
        "Mixed Breed (German Shepherd)",
        "Schäferhundmix",
        "german sheperd mix",
    ]

    from utils.standardization import standardize_breed as original_standardize

    print(f"{'Test Case':<30} {'Original':<20} {'Enhanced':<20} {'Improved'}")
    print("-" * 80)

    for test_case in comparison_cases:
        original_result = original_standardize(test_case)[0]
        enhanced_result = enhanced_standardizer.standardize_breed_enhanced(test_case)[0]
        improved = "✓" if original_result != enhanced_result else "-"
        print(f"{test_case:<30} {original_result:<20} {enhanced_result:<20} {improved}")
