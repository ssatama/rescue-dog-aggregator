# utils/breed_utils.py

import re
import unicodedata


def fold_to_ascii(text: str) -> str:
    """
    Lowercase text and reduce it to ASCII letters.

    Casefolding first expands ligatures (the German sharp s becomes "ss"),
    then NFKD decomposition splits accented characters so the combining marks
    can be dropped, turning "Español" into "espanol" rather than losing the
    character entirely.
    """
    decomposed = unicodedata.normalize("NFKD", text.casefold())
    return "".join(char for char in decomposed if not unicodedata.combining(char))


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

    slug = fold_to_ascii(primary_breed)

    # Handle special case of "Mix" suffix - preserve it with hyphen
    slug = re.sub(r"\s+mix$", "-mix", slug, flags=re.IGNORECASE)

    # Replace any non-alphanumeric characters (except hyphens) with hyphens
    slug = re.sub(r"[^a-z0-9-]+", "-", slug)

    # Remove leading/trailing hyphens
    slug = slug.strip("-")

    # Replace multiple consecutive hyphens with single hyphen
    slug = re.sub(r"-+", "-", slug)

    return slug


# How many available dogs a breed needs before it gets its own page. Deliberately
# low: this is a niche aggregator, so a thin page for an uncommon breed is still
# the only place someone searching for it will land.
QUALIFYING_BREED_MIN_COUNT = 3


def validate_breed_type(breed_type: str | None) -> bool:
    """
    Validate breed type values against allowed types.

    Args:
        breed_type: The breed type to validate

    Returns:
        True if breed type is valid or None, False otherwise
    """
    if breed_type is None:
        return True

    allowed_types = {"purebred", "mixed", "crossbreed", "unknown"}
    return breed_type.lower() in allowed_types
