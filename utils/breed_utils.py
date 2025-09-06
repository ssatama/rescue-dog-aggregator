# utils/breed_utils.py

import re
from typing import Optional


def generate_breed_slug(primary_breed: str) -> str:
    """
    Convert primary breed names to URL-friendly slugs.
    
    Args:
        primary_breed: The primary breed name to convert
        
    Returns:
        URL-friendly slug version of the breed name
        
    Examples:
        "Collie Mix" → "collie-mix"
        "German Shepherd" → "german-shepherd"
        "Jack Russell Terrier" → "jack-russell-terrier"
    """
    if not primary_breed:
        return ""
    
    # Convert to lowercase
    slug = primary_breed.lower()
    
    # Handle special case of "Mix" suffix - preserve it with hyphen
    slug = re.sub(r'\s+mix$', '-mix', slug, flags=re.IGNORECASE)
    
    # Replace any non-alphanumeric characters (except hyphens) with hyphens
    slug = re.sub(r'[^a-z0-9-]+', '-', slug)
    
    # Remove leading/trailing hyphens
    slug = slug.strip('-')
    
    # Replace multiple consecutive hyphens with single hyphen
    slug = re.sub(r'-+', '-', slug)
    
    return slug


def is_qualifying_breed(count: int, threshold: int = 15) -> bool:
    """
    Check if a breed qualifies for a dedicated page.
    
    Args:
        count: Number of dogs of this breed
        threshold: Minimum count required for qualification (default: 15)
        
    Returns:
        True if breed qualifies for dedicated page, False otherwise
    """
    return count >= threshold


def validate_breed_type(breed_type: Optional[str]) -> bool:
    """
    Validate breed type values against allowed types.
    
    Args:
        breed_type: The breed type to validate
        
    Returns:
        True if breed type is valid or None, False otherwise
    """
    if breed_type is None:
        return True
        
    allowed_types = {"purebred", "mixed", "crossbreed", "unknown", "sighthound"}
    return breed_type.lower() in allowed_types