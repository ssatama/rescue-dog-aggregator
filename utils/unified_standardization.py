"""
Unified standardization module that consolidates all breed, age, and size standardization logic.
Combines the best features from standardization.py, optimized_standardization.py, and enhanced_breed_standardization.py
"""

import re
from dataclasses import dataclass
from datetime import datetime, date
from difflib import SequenceMatcher
from functools import lru_cache
from typing import Dict, Tuple, Optional, Any, List


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
        enable_size_standardization: bool = True
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
        self.american_staffordshire_variations = self._initialize_american_staffordshire_variations()
        
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
            "irish wolfhound": BreedInfo("Irish Wolfhound", "Hound", "XLarge"),
            "afghan hound": BreedInfo("Afghan Hound", "Hound", "Large"),
            
            # Terrier Group - Including Staffordshire Bull Terrier
            "staffordshire bull terrier": BreedInfo("Staffordshire Bull Terrier", "Terrier", "Medium"),
            "american staffordshire terrier": BreedInfo("American Staffordshire Terrier", "Terrier", "Medium"),
            "jack russell terrier": BreedInfo("Jack Russell Terrier", "Terrier", "Small"),
            "yorkshire terrier": BreedInfo("Yorkshire Terrier", "Terrier", "Tiny"),
            "bull terrier": BreedInfo("Bull Terrier", "Terrier", "Medium"),
            "scottish terrier": BreedInfo("Scottish Terrier", "Terrier", "Small"),
            "west highland white terrier": BreedInfo("West Highland White Terrier", "Terrier", "Small"),
            
            # Sporting Group
            "labrador retriever": BreedInfo("Labrador Retriever", "Sporting", "Large"),
            "golden retriever": BreedInfo("Golden Retriever", "Sporting", "Large"),
            "cocker spaniel": BreedInfo("Cocker Spaniel", "Sporting", "Medium"),
            "english springer spaniel": BreedInfo("English Springer Spaniel", "Sporting", "Medium"),
            "pointer": BreedInfo("Pointer", "Sporting", "Large"),
            "setter": BreedInfo("Setter", "Sporting", "Large"),
            
            # Working Group
            "siberian husky": BreedInfo("Siberian Husky", "Working", "Large"),
            "alaskan malamute": BreedInfo("Alaskan Malamute", "Working", "Large"),
            "rottweiler": BreedInfo("Rottweiler", "Working", "Large"),
            "doberman pinscher": BreedInfo("Doberman Pinscher", "Working", "Large"),
            "great dane": BreedInfo("Great Dane", "Working", "XLarge"),
            "bernese mountain dog": BreedInfo("Bernese Mountain Dog", "Working", "Large"),
            "boxer": BreedInfo("Boxer", "Working", "Large"),
            
            # Herding Group
            "german shepherd": BreedInfo("German Shepherd", "Herding", "Large"),
            "border collie": BreedInfo("Border Collie", "Herding", "Medium"),
            "australian shepherd": BreedInfo("Australian Shepherd", "Herding", "Large"),
            "belgian malinois": BreedInfo("Belgian Malinois", "Herding", "Large"),
            "collie": BreedInfo("Collie", "Herding", "Large"),
            "corgi": BreedInfo("Corgi", "Herding", "Small"),
            
            # Toy Group
            "chihuahua": BreedInfo("Chihuahua", "Toy", "Tiny"),
            "pomeranian": BreedInfo("Pomeranian", "Toy", "Tiny"),
            "shih tzu": BreedInfo("Shih Tzu", "Toy", "Small"),
            "maltese": BreedInfo("Maltese", "Toy", "Tiny"),
            "pug": BreedInfo("Pug", "Toy", "Small"),
            "papillon": BreedInfo("Papillon", "Toy", "Small"),
            
            # Non-Sporting Group
            "poodle": BreedInfo("Poodle", "Non-Sporting", "Medium"),
            "bulldog": BreedInfo("Bulldog", "Non-Sporting", "Medium"),
            "french bulldog": BreedInfo("French Bulldog", "Non-Sporting", "Small"),
            "dalmatian": BreedInfo("Dalmatian", "Non-Sporting", "Large"),
            "bichon frise": BreedInfo("Bichon Frise", "Non-Sporting", "Small"),
        }
        
        return breed_data
    
    def _initialize_designer_breeds(self) -> Dict[str, Dict[str, str]]:
        """Initialize designer breed mappings with parent breeds."""
        return {
            "cockapoo": {
                "name": "Cockapoo",
                "primary": "Cocker Spaniel",
                "secondary": "Poodle",
                "group": "Non-Sporting",  # Takes from Poodle
                "size": "Small"
            },
            "labradoodle": {
                "name": "Labradoodle",
                "primary": "Labrador Retriever",
                "secondary": "Poodle",
                "group": "Sporting",  # Mixed heritage, defaulting to Labrador
                "size": "Large"
            },
            "puggle": {
                "name": "Puggle",
                "primary": "Pug",
                "secondary": "Beagle",
                "group": "Hound",  # Takes from Beagle
                "size": "Small"
            },
            "schnoodle": {
                "name": "Schnoodle",
                "primary": "Schnauzer",
                "secondary": "Poodle",
                "group": "Non-Sporting",
                "size": "Medium"
            },
            "yorkipoo": {
                "name": "Yorkipoo",
                "primary": "Yorkshire Terrier",
                "secondary": "Poodle",
                "group": "Toy",
                "size": "Tiny"
            },
            "maltipoo": {
                "name": "Maltipoo",
                "primary": "Maltese",
                "secondary": "Poodle",
                "group": "Toy",
                "size": "Small"
            },
            "goldendoodle": {
                "name": "Goldendoodle",
                "primary": "Golden Retriever",
                "secondary": "Poodle",
                "group": "Sporting",
                "size": "Large"
            },
            "cavapoo": {
                "name": "Cavapoo",
                "primary": "Cavalier King Charles Spaniel",
                "secondary": "Poodle",
                "group": "Toy",
                "size": "Small"
            }
        }
    
    def _initialize_staffordshire_variations(self) -> List[str]:
        """Initialize Staffordshire Bull Terrier name variations."""
        return [
            "staffie", "staffy", "staff", "staffordshire", "staffordshire terrier",
            "stafford", "sbt", "staffy bull terrier", "english staffordshire bull terrier",
            "english staffie", "english staffy"
        ]
    
    def _initialize_american_staffordshire_variations(self) -> List[str]:
        """Initialize American Staffordshire Terrier name variations."""
        return [
            "am staff", "amstaff", "american stafford", "american staffy",
            "american staffie", "ast"
        ]
    
    def _compile_age_patterns(self) -> Dict[str, re.Pattern]:
        """Compile regex patterns for age parsing."""
        return {
            'birth_date': re.compile(r'born\s+on\s+(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})', re.IGNORECASE),
            'years_months': re.compile(r'(\d+)\s*(?:year|yr)s?\s*(?:and\s*)?(\d+)?\s*(?:month|mo)s?', re.IGNORECASE),
            'months_only': re.compile(r'(\d+)\s*(?:month|mo)s?', re.IGNORECASE),
            'weeks_only': re.compile(r'(\d+)\s*(?:week|wk)s?', re.IGNORECASE),
            'decimal_years': re.compile(r'(\d+[.,]\d+)\s*(?:year|yr)s?', re.IGNORECASE),
            'range': re.compile(r'(\d+)\s*(?:-|to)\s*(\d+)\s*(?:year|yr|month|mo)s?', re.IGNORECASE)
        }
    
    def _compile_breed_patterns(self) -> Dict[str, re.Pattern]:
        """Compile regex patterns for breed parsing."""
        return {
            'cross': re.compile(r'\b(?:cross|mix|x)\b', re.IGNORECASE),
            'mixed': re.compile(r'\bmixed\s+breed\b', re.IGNORECASE),
            'unknown': re.compile(r'\b(?:unknown|unbekannt|não definida)\b', re.IGNORECASE)
        }
    
    @lru_cache(maxsize=1000)
    def apply_full_standardization(
        self, 
        breed: Optional[str] = None,
        age: Optional[str] = None,
        size: Optional[str] = None
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
        result = {
            'breed': self._standardize_breed(breed) if self.enable_breed_standardization else {'original': breed},
            'age': self._standardize_age(age) if self.enable_age_standardization else {'original': age},
            'size': self._standardize_size(size, breed) if self.enable_size_standardization else {'original': size}
        }
        
        return result
    
    def _standardize_breed(self, breed: Optional[str]) -> Dict[str, Any]:
        """Standardize breed with all fixes including Lurcher, designer breeds, and Staffordshire."""
        if not breed:
            return {
                'name': 'Unknown',
                'group': 'Unknown',
                'size': None,
                'confidence': 0.0,
                'breed_type': 'unknown',
                'is_mixed': False
            }
        
        # Handle non-string inputs
        if not isinstance(breed, str):
            return {
                'name': 'Unknown',
                'group': 'Unknown',
                'size': None,
                'confidence': 0.0,
                'breed_type': 'unknown',
                'is_mixed': False
            }
        
        breed_lower = breed.strip().lower()
        is_mixed = bool(self.breed_patterns['cross'].search(breed_lower))
        
        # Check for Lurcher first (high priority fix)
        if 'lurcher' in breed_lower:
            return {
                'name': 'Lurcher' + (' Cross' if is_mixed else ''),
                'group': 'Hound',
                'size': 'Large',
                'confidence': 0.95,
                'breed_type': 'sighthound',
                'is_mixed': is_mixed
            }
        
        # Check for American Staffordshire variations first (more specific)
        for variation in self.american_staffordshire_variations:
            if variation in breed_lower or ('american' in breed_lower and 'staff' in breed_lower):
                return {
                    'name': 'American Staffordshire Terrier' + (' Mix' if is_mixed else ''),
                    'group': 'Terrier',
                    'size': 'Medium',
                    'confidence': 0.9 if not is_mixed else 0.8,
                    'breed_type': 'purebred' if not is_mixed else 'crossbreed',
                    'is_mixed': is_mixed
                }
        
        # Check for Staffordshire variations (less specific)
        for variation in self.staffordshire_variations:
            if variation in breed_lower and 'american' not in breed_lower:
                return {
                    'name': 'Staffordshire Bull Terrier' + (' Mix' if is_mixed else ''),
                    'group': 'Terrier',
                    'size': 'Medium',
                    'confidence': 0.9 if not is_mixed else 0.8,
                    'breed_type': 'purebred' if not is_mixed else 'crossbreed',
                    'is_mixed': is_mixed
                }
        
        # Check for designer breeds
        for designer_key, designer_info in self.designer_breeds.items():
            if designer_key in breed_lower:
                return {
                    'name': designer_info['name'],
                    'group': designer_info['group'],
                    'size': designer_info['size'],
                    'confidence': 0.85,
                    'breed_type': 'designer',
                    'primary_breed': designer_info['primary'],
                    'secondary_breed': designer_info['secondary'],
                    'is_mixed': True
                }
        
        # Check standard breed data
        if breed_lower in self.breed_data:
            breed_info = self.breed_data[breed_lower]
            return {
                'name': breed_info.standardized_name + (' Cross' if is_mixed else ''),
                'group': breed_info.breed_group,
                'size': breed_info.size_estimate,
                'confidence': 0.9 if not is_mixed else 0.7,
                'breed_type': 'purebred' if not is_mixed else 'crossbreed',
                'is_mixed': is_mixed
            }
        
        # Check for mixed breed
        if self.breed_patterns['mixed'].search(breed_lower):
            return {
                'name': 'Mixed Breed',
                'group': 'Mixed',
                'size': None,
                'confidence': 0.5,
                'breed_type': 'mixed',
                'is_mixed': True
            }
        
        # Check for crosses with specific breed mentioned
        if is_mixed and any(word in breed_lower for word in ['labrador', 'collie', 'terrier', 'spaniel']):
            # This is a cross with an identifiable breed component
            return {
                'name': breed.strip(),
                'group': 'Unknown',
                'size': None,
                'confidence': 0.7,  # Medium confidence for identifiable crosses
                'breed_type': 'crossbreed',
                'is_mixed': True
            }
        
        # Unknown breed
        return {
            'name': breed.strip(),
            'group': 'Unknown',
            'size': None,
            'confidence': 0.3,
            'breed_type': 'unknown',
            'is_mixed': is_mixed
        }
    
    def _standardize_age(self, age: Optional[str]) -> Dict[str, Any]:
        """Standardize age string into structured format."""
        if not age:
            return {
                'original': age,
                'age_category': None,
                'age_min_months': None,
                'age_max_months': None
            }
        
        if not isinstance(age, str):
            return {
                'original': str(age),
                'age_category': None,
                'age_min_months': None,
                'age_max_months': None
            }
        
        age_lower = age.strip().lower()
        
        # Check for descriptive terms (but not "X years old")
        if 'puppy' in age_lower or 'pup' in age_lower:
            return {
                'original': age,
                'age_category': 'Puppy',
                'age_min_months': 0,
                'age_max_months': 12
            }
        elif 'young' in age_lower or 'junior' in age_lower:
            return {
                'original': age,
                'age_category': 'Young',
                'age_min_months': 12,
                'age_max_months': 24
            }
        elif 'adult' in age_lower:
            return {
                'original': age,
                'age_category': 'Adult',
                'age_min_months': 24,
                'age_max_months': 84
            }
        elif 'senior' in age_lower or (re.search(r'\bold\b', age_lower) and not re.search(r'\d+.*years?\s+old', age_lower)):
            # Only treat as senior if "old" is standalone, not part of "X years old"
            return {
                'original': age,
                'age_category': 'Senior',
                'age_min_months': 84,
                'age_max_months': MAX_DOG_AGE_MONTHS
            }
        
        # Try to parse numeric ages
        # First check for simple year patterns like "2 years old"
        simple_years = re.match(r'(\d+)\s*(?:year|yr)s?\s*(?:old)?', age_lower)
        if simple_years:
            years = int(simple_years.group(1))
            total_months = years * 12
            
            if total_months < 12:
                category = 'Puppy'
            elif total_months < 24:
                category = 'Young'
            elif total_months < 84:
                category = 'Adult'
            else:
                category = 'Senior'
            
            return {
                'original': age,
                'age_category': category,
                'age_min_months': total_months,
                'age_max_months': total_months
            }
        
        # Then try years and months pattern
        years_match = self.age_patterns['years_months'].search(age_lower)
        if years_match:
            years = int(years_match.group(1))
            months = int(years_match.group(2)) if years_match.group(2) else 0
            total_months = years * 12 + months
            
            if total_months < 12:
                category = 'Puppy'
            elif total_months < 24:
                category = 'Young'
            elif total_months < 84:
                category = 'Adult'
            else:
                category = 'Senior'
            
            return {
                'original': age,
                'age_category': category,
                'age_min_months': total_months,
                'age_max_months': total_months
            }
        
        # Default case
        return {
            'original': age,
            'age_category': 'Adult',
            'age_min_months': 24,
            'age_max_months': 84
        }
    
    def _standardize_size(self, size: Optional[str], breed: Optional[str] = None) -> Dict[str, Any]:
        """Standardize size with breed-based estimation as fallback."""
        canonical_sizes = ['Tiny', 'Small', 'Medium', 'Large', 'XLarge']
        
        # First try to use explicit size if provided
        if size and isinstance(size, str):
            size_lower = size.strip().lower()
            
            size_map = {
                'tiny': 'Tiny',
                'extra small': 'Tiny',
                'xs': 'Tiny',
                'small': 'Small',
                's': 'Small',
                'medium': 'Medium',
                'm': 'Medium',
                'large': 'Large',
                'l': 'Large',
                'extra large': 'XLarge',
                'xl': 'XLarge',
                'giant': 'XLarge'
            }
            
            if size_lower in size_map:
                return {
                    'category': size_map[size_lower],
                    'weight_range': self._get_weight_range(size_map[size_lower]),
                    'source': 'explicit'
                }
        
        # Fall back to breed-based estimation
        if breed and self.enable_breed_standardization:
            breed_info = self._standardize_breed(breed)
            if breed_info.get('size'):
                return {
                    'category': breed_info['size'],
                    'weight_range': self._get_weight_range(breed_info['size']),
                    'source': 'breed_estimated'
                }
        
        # Default to medium if nothing else works
        return {
            'category': size if size in canonical_sizes else 'Medium',
            'weight_range': self._get_weight_range('Medium'),
            'source': 'default'
        }
    
    def _get_weight_range(self, size_category: str) -> Dict[str, int]:
        """Get weight range for a size category."""
        weight_ranges = {
            'Tiny': {'min': 0, 'max': 10},
            'Small': {'min': 10, 'max': 25},
            'Medium': {'min': 25, 'max': 60},
            'Large': {'min': 60, 'max': 90},
            'XLarge': {'min': 90, 'max': 200}
        }
        return weight_ranges.get(size_category, {'min': 25, 'max': 60})
    
    def apply_batch_standardization(self, animals: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process multiple animals efficiently in batch."""
        results = []
        for animal in animals:
            result = self.apply_full_standardization(
                breed=animal.get('breed'),
                age=animal.get('age'),
                size=animal.get('size')
            )
            results.append(result)
        return results
    
    def clear_cache(self):
        """Clear all LRU caches."""
        self.apply_full_standardization.cache_clear()
    
    def get_cache_info(self) -> Dict[str, Any]:
        """Get cache statistics."""
        return {
            'full_standardization': self.apply_full_standardization.cache_info()._asdict()
        }