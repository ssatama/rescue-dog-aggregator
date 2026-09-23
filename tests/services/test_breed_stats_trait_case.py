"""Breed pages must not list one trait twice because profiles vary its case (#449)."""

import json

import pytest

from api.services.animal_service import AnimalService
from tests.conftest import override_get_db_cursor

PROFILES = [
    ["Affectionate", "Sensitive"],
    ["affectionate", "Sensitive"],
    ["AFFECTIONATE", "gentle"],
]


@pytest.mark.database
@pytest.mark.integration
def test_breed_traits_are_counted_case_insensitively():
    cursor_generator = override_get_db_cursor()
    cursor = next(cursor_generator)
    try:
        for i, traits in enumerate(PROFILES):
            cursor.execute(
                """
                INSERT INTO animals (id, name, slug, animal_type, status, active, organization_id, adoption_url,
                                     primary_breed, breed_slug, breed_group, dog_profiler_data)
                VALUES (%s, %s, %s, 'dog', 'available', TRUE, 901, %s, 'Podenco', 'podenco', 'Hound', %s)
                """,
                (9901 + i, f"Podenco {i}", f"podenco-{i}", f"http://example.com/{i}", json.dumps({"personality_traits": traits})),
            )

        stats = AnimalService(cursor).get_breed_stats()

        podenco = next(b for b in stats["qualifying_breeds"] if b["primary_breed"] == "Podenco")
        assert podenco["personality_traits"] == ["Affectionate", "Sensitive", "Gentle"]
    finally:
        cursor.connection.rollback()
        cursor_generator.close()
