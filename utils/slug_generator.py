"""
Slug generation utility for SEO-friendly URLs.
Follows CLAUDE.md principles: pure functions, immutable data, early returns.
"""

import logging
import re
import time
from typing import Optional, Tuple

logger = logging.getLogger(__name__)


def sanitize_for_slug(text: str) -> str:
    """
    Sanitize text for use in URL slugs.

    Args:
        text: Input text to sanitize

    Returns:
        Sanitized text suitable for URLs
    """
    if not text or not isinstance(text, str):
        return ""

    # Remove special characters, keep alphanumeric, spaces, and hyphens
    sanitized = re.sub(r"[^a-zA-Z0-9\s\-]", "", text)

    # Replace multiple spaces or hyphens with single hyphens
    sanitized = re.sub(r"[\s\-]+", "-", sanitized)

    # Convert to lowercase and strip leading/trailing hyphens
    sanitized = sanitized.lower().strip("-")

    return sanitized


def generate_animal_slug(
    name: str,
    breed: Optional[str] = None,
    standardized_breed: Optional[str] = None,
    animal_id: Optional[int] = None,
) -> str:
    """
    Generate SEO-friendly slug for animal.
    Format: name-breed-id (e.g., "fluffy-mixed-breed-123")

    Args:
        name: Animal name (required)
        breed: Original breed string
        standardized_breed: Standardized breed (preferred over breed)
        animal_id: Animal ID for uniqueness (optional for preview)

    Returns:
        Generated slug string
    """
    slug_parts = []

    # Start with sanitized name
    sanitized_name = sanitize_for_slug(name)
    if sanitized_name:
        slug_parts.append(sanitized_name)
    else:
        # Fallback for empty names
        slug_parts.append("animal")

    # Add breed if available (prefer standardized_breed)
    breed_to_use = standardized_breed or breed
    if breed_to_use:
        sanitized_breed = sanitize_for_slug(breed_to_use)
        if sanitized_breed:
            slug_parts.append(sanitized_breed)

    # Add ID for uniqueness if provided
    if animal_id is not None:
        slug_parts.append(str(animal_id))

    # Join parts with hyphens
    slug = "-".join(slug_parts)

    # Ensure slug is not empty and not too long
    if not slug:
        slug = "animal"

    # Limit slug length to 250 characters (database limit is 255)
    if len(slug) > 250:
        slug = slug[:250].rstrip("-")

    return slug


def ensure_unique_slug(base_slug: str, connection, exclude_id: Optional[int] = None) -> str:
    """
    Ensure slug is unique by checking database and adding suffix if needed.

    Args:
        base_slug: Base slug to check
        connection: Database connection
        exclude_id: Animal ID to exclude from uniqueness check (for updates)

    Returns:
        Unique slug string
    """
    if not connection:
        logger.warning("No database connection provided for slug uniqueness check")
        return base_slug

    try:
        cursor = connection.cursor()

        # Check if base slug exists
        query = "SELECT COUNT(*) FROM animals WHERE slug = %s"
        params = [base_slug]

        if exclude_id is not None:
            query += " AND id != %s"
            params.append(exclude_id)

        cursor.execute(query, params)
        count = cursor.fetchone()[0]
        cursor.close()

        # If slug is unique, return it
        if count == 0:
            return base_slug

        # Generate unique slug with suffix
        counter = 1
        while counter <= 100:  # Prevent infinite loops
            candidate_slug = f"{base_slug}-{counter}"

            # Check if candidate is unique
            cursor = connection.cursor()
            cursor.execute(query.replace(" = %s", " = %s"), [candidate_slug] + params[1:])
            count = cursor.fetchone()[0]
            cursor.close()

            if count == 0:
                return candidate_slug

            counter += 1

        # Fallback: append timestamp if all else fails
        timestamp_suffix = str(int(time.time()))[-6:]  # Last 6 digits of timestamp
        return f"{base_slug}-{timestamp_suffix}"

    except Exception as e:
        logger.error(f"Error checking slug uniqueness: {e}")
        # Fallback: return base slug with warning
        return base_slug


def generate_unique_animal_slug(
    name: str,
    breed: Optional[str] = None,
    standardized_breed: Optional[str] = None,
    animal_id: Optional[int] = None,
    connection=None,
    exclude_id: Optional[int] = None,
) -> str:
    """
    Generate a unique animal slug by combining generation and uniqueness check.

    Args:
        name: Animal name
        breed: Original breed string
        standardized_breed: Standardized breed (preferred)
        animal_id: Animal ID for uniqueness
        connection: Database connection for uniqueness check
        exclude_id: Animal ID to exclude from uniqueness check

    Returns:
        Unique slug string
    """
    # Generate base slug
    base_slug = generate_animal_slug(name, breed, standardized_breed, animal_id)

    # Ensure uniqueness if database connection provided
    if connection:
        return ensure_unique_slug(base_slug, connection, exclude_id)

    return base_slug


def generate_organization_slug(name: str, config_id: str) -> str:
    """
    Generate SEO-friendly slug for organization.
    Format: sanitized-name or fallback to config-id

    Args:
        name: Organization name (required)
        config_id: Configuration ID as fallback

    Returns:
        Generated slug string
    """
    # Try to create slug from organization name
    if name:
        sanitized_name = sanitize_for_slug(name)
        if sanitized_name:
            # Limit slug length to 250 characters (database limit is 255)
            if len(sanitized_name) > 250:
                sanitized_name = sanitized_name[:250].rstrip("-")
            return sanitized_name

    # Fallback to config_id if name sanitization fails
    if config_id:
        sanitized_id = sanitize_for_slug(config_id)
        if sanitized_id:
            return sanitized_id

    # Ultimate fallback
    return "organization"


def ensure_unique_organization_slug(base_slug: str, connection, exclude_id: Optional[int] = None) -> str:
    """
    Ensure organization slug is unique by checking database and adding suffix if needed.

    Args:
        base_slug: Base slug to check
        connection: Database connection
        exclude_id: Organization ID to exclude from uniqueness check (for updates)

    Returns:
        Unique slug string
    """
    if not connection:
        logger.warning("No database connection provided for organization slug uniqueness check")
        return base_slug

    try:
        cursor = connection.cursor()

        # Check if base slug exists
        query = "SELECT COUNT(*) FROM organizations WHERE slug = %s"
        params = [base_slug]

        if exclude_id is not None:
            query += " AND id != %s"
            params.append(exclude_id)

        cursor.execute(query, params)
        count = cursor.fetchone()[0]
        cursor.close()

        # If slug is unique, return it
        if count == 0:
            return base_slug

        # Generate unique slug with suffix
        counter = 1
        while counter <= 100:  # Prevent infinite loops
            candidate_slug = f"{base_slug}-{counter}"

            # Check if candidate is unique
            cursor = connection.cursor()
            cursor.execute(query.replace(" = %s", " = %s"), [candidate_slug] + params[1:])
            count = cursor.fetchone()[0]
            cursor.close()

            if count == 0:
                return candidate_slug

            counter += 1

        # Fallback: append timestamp if all else fails
        timestamp_suffix = str(int(time.time()))[-6:]  # Last 6 digits of timestamp
        return f"{base_slug}-{timestamp_suffix}"

    except Exception as e:
        logger.error(f"Error checking organization slug uniqueness: {e}")
        # Fallback: return base slug with warning
        return base_slug


def generate_unique_organization_slug(name: str, config_id: str, connection=None, exclude_id: Optional[int] = None) -> str:
    """
    Generate a unique organization slug by combining generation and uniqueness check.

    Args:
        name: Organization name
        config_id: Configuration ID as fallback
        connection: Database connection for uniqueness check
        exclude_id: Organization ID to exclude from uniqueness check

    Returns:
        Unique slug string
    """
    # Generate base slug
    base_slug = generate_organization_slug(name, config_id)

    # Ensure uniqueness if database connection provided
    if connection:
        return ensure_unique_organization_slug(base_slug, connection, exclude_id)

    return base_slug


def validate_slug(slug: str) -> Tuple[bool, str]:
    """
    Validate that a slug meets requirements.

    Args:
        slug: Slug to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    if not slug:
        return False, "Slug cannot be empty"

    if len(slug) > 255:
        return False, "Slug too long (max 255 characters)"

    if not re.match(r"^[a-z0-9-]+$", slug):
        return (
            False,
            "Slug contains invalid characters (only lowercase letters, numbers, and hyphens allowed)",
        )

    if slug.startswith("-") or slug.endswith("-"):
        return False, "Slug cannot start or end with hyphen"

    if "--" in slug:
        return False, "Slug cannot contain consecutive hyphens"

    return True, ""
