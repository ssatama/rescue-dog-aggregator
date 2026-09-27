"""What a scraper's collect_data returns: one ScrapedDog per dog (#568).

`None` (or a missing key) means the rescue didn't say. Never a stand-in such
as "Unknown", "Mixed Breed" or "Medium": the site shows what it knows and
leaves the rest out (#484).

The story is `properties["description"]`, the one description key. Location
text goes in `properties` too (`location`, `Aufenthaltsort`,
`current_location`), where the validator builds `properties.display_location`
from it (#574). A top-level key the save path doesn't read is lost, so
BaseScraper logs any it doesn't know, once per run.
"""

from typing import Any, NotRequired, TypedDict


class ScrapedDog(TypedDict):
    external_id: str
    name: str
    adoption_url: str
    primary_image_url: str
    # The rescue's own values
    breed: NotRequired[str | None]
    breed_raw: NotRequired[str | None]
    age: NotRequired[str | None]
    age_text: NotRequired[str | None]
    date_of_birth: NotRequired[str | None]
    # When the page stated the age, so the age is anchored there (#561)
    age_stated_at: NotRequired[str | None]
    sex: NotRequired[str | None]
    size: NotRequired[str | None]
    image_urls: NotRequired[list[str]]
    images: NotRequired[list[str]]
    original_image_url: NotRequired[str | None]
    animal_type: NotRequired[str]
    status: NotRequired[str]
    organization_id: NotRequired[int]
    properties: NotRequired[dict[str, Any]]
    # Written by process_animal (BaseScraper), not by scrapers
    standardized_breed: NotRequired[str | None]
    breed_category: NotRequired[str | None]
    breed_type: NotRequired[str | None]
    breed_confidence: NotRequired[float | None]
    primary_breed: NotRequired[str | None]
    secondary_breed: NotRequired[str | None]
    breed_slug: NotRequired[str | None]
    standardization_confidence: NotRequired[float | None]
    age_category: NotRequired[str | None]
    age_min_months: NotRequired[int | None]
    age_max_months: NotRequired[int | None]
    standardized_size: NotRequired[str | None]


REQUIRED_KEYS = frozenset(ScrapedDog.__required_keys__)
KNOWN_KEYS = frozenset(ScrapedDog.__annotations__)


def missing_required(dog: dict[str, Any]) -> list[str]:
    """Required keys that are absent or empty.

    For tests of a scraper's output. At save time the same rule is
    AnimalValidator.rejection_reason, which rejects the dog.
    """
    return sorted(key for key in REQUIRED_KEYS if not dog.get(key))


def unknown_keys(dog: dict[str, Any]) -> set[str]:
    """Top-level keys the save path doesn't read: their values would be lost."""
    return set(dog) - KNOWN_KEYS
