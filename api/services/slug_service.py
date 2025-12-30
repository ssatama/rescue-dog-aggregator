import re
import unicodedata
from typing import Optional


def generate_organization_slug(name: str, org_id: int) -> str:
    """
    Generate SEO-friendly slug for organization.

    Args:
        name: Organization name
        org_id: Organization ID for uniqueness

    Returns:
        URL-safe slug in format: {sanitized-name}-{id}

    Example:
        generate_organization_slug("Austin Pets Alive!", 12) -> "austin-pets-alive-12"
    """
    clean_name = sanitize_for_url(name)
    return f"{clean_name}-{org_id}"


def generate_animal_slug(
    name: str, standardized_breed: Optional[str], breed: Optional[str], animal_id: int
) -> str:
    """
    Generate SEO-friendly slug for animal using breed information.

    Args:
        name: Animal name
        standardized_breed: Standardized breed (preferred)
        breed: Original breed (fallback)
        animal_id: Animal ID for uniqueness

    Returns:
        URL-safe slug in format: {name}-{breed}-{id} or {name}-{id}

    Example:
        generate_animal_slug("Buddy", "Golden Retriever", None, 1699)
        -> "buddy-golden-retriever-1699"
    """
    parts = [sanitize_for_url(name)]

    # Use standardized_breed if available, otherwise fallback to breed
    breed_to_use = standardized_breed or breed
    if breed_to_use:
        clean_breed = sanitize_for_url(breed_to_use)
        if clean_breed:  # Only add if sanitization resulted in valid text
            parts.append(clean_breed)

    parts.append(str(animal_id))
    return "-".join(parts)


def sanitize_for_url(text: str) -> str:
    """
    Convert text to URL-safe slug.

    Args:
        text: Input text to sanitize

    Returns:
        URL-safe string with only lowercase letters, numbers, and hyphens

    Process:
        1. Normalize unicode characters
        2. Convert to lowercase
        3. Remove special characters (keep alphanumeric and spaces)
        4. Replace spaces and multiple hyphens with single hyphen
        5. Remove leading/trailing hyphens

    Example:
        sanitize_for_url("Austin Pets Alive!") -> "austin-pets-alive"
    """
    if not text:
        return ""

    # Normalize unicode characters (é -> e, ñ -> n, etc.)
    text = unicodedata.normalize("NFKD", text)

    # Convert to lowercase
    text = text.lower()

    # Remove special characters, keep alphanumeric and spaces
    text = re.sub(r"[^a-z0-9\s-]", "", text)

    # Replace spaces and multiple hyphens with single hyphen
    text = re.sub(r"[\s-]+", "-", text)

    # Remove leading/trailing hyphens
    return text.strip("-")
