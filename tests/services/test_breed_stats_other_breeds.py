"""The hub links every breed: one without a page is listed with its count (#668)."""

import pytest

from api.services.animal_service import AnimalService
from tests.conftest import override_get_db_cursor

DOGS = [
    # (primary_breed, breed_slug, breed_type, breed_group)
    ("Podenco", "podenco", "purebred", "Hound"),
    ("Podenco", "podenco", "purebred", "Hound"),
    ("Podenco", "podenco", "crossbreed", "Hound"),
    ("Dalmatian", "dalmatian", "purebred", "Non-Sporting"),
    ("Beagle Mix", "beagle-mix", "mixed", "Mixed"),
    ("Unknown", "unknown", "unknown", "Unknown"),
]


@pytest.mark.database
@pytest.mark.integration
def test_breeds_below_the_page_threshold_are_listed_with_their_counts():
    cursor_generator = override_get_db_cursor()
    cursor = next(cursor_generator)
    try:
        for i, (breed, slug, breed_type, group) in enumerate(DOGS):
            cursor.execute(
                """
                INSERT INTO animals (id, name, slug, animal_type, status, active, organization_id, adoption_url,
                                     primary_breed, breed_slug, breed_type, breed_group)
                VALUES (%s, %s, %s, 'dog', 'available', TRUE, 901, %s, %s, %s, %s, %s)
                """,
                (9801 + i, f"Dog {i}", f"dog-{i}", f"http://example.com/{i}", breed, slug, breed_type, group),
            )

        stats = AnimalService(cursor).get_breed_stats()

        other = {b["primary_breed"]: b["count"] for b in stats["other_breeds"]}
        assert "Podenco" in {b["primary_breed"] for b in stats["qualifying_breeds"]}
        assert "Podenco" not in other
        assert other["Dalmatian"] == 1
        # Mixes are the Mixed page's, and Unknown is no breed
        assert "Beagle Mix" not in other
        assert "Unknown" not in other
    finally:
        cursor.connection.rollback()
        cursor_generator.close()
