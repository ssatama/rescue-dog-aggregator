"""Breed stats count the values profiles actually store.

The experience counts looked for beginner/intermediate/experienced, which the
profiler never writes (first_time_ok/some_experience/experienced_only), so
every breed reported 0/0/0. Energy left out very_high and good-with-dogs looked
for "sometimes" instead of "selective". Answers the profile scored 0.5 or less
are guesses the dog page hides (#696), so they are not counted either.
"""

import json

import pytest

from api.services.animal_service import AnimalService
from tests.conftest import override_get_db_cursor

PROFILES = [
    {"experience_level": "first_time_ok", "energy_level": "very_high", "good_with_dogs": "selective", "confidence": "confident"},
    {"experience_level": "some_experience", "energy_level": "low", "good_with_dogs": "yes", "confidence": "moderate"},
    {"experience_level": "experienced_only", "energy_level": "low", "good_with_dogs": "no", "confidence": "shy"},
    # Guesses: counted nowhere
    {
        "experience_level": "first_time_ok",
        "energy_level": "low",
        "good_with_dogs": "yes",
        "confidence": "very_shy",
        "confidence_scores": {"experience_level": 0.4, "energy_level": 0.5, "good_with_dogs": 0.3, "confidence": 0.2},
    },
]


@pytest.fixture
def podenco():
    cursor_generator = override_get_db_cursor()
    cursor = next(cursor_generator)
    try:
        for i, profile in enumerate(PROFILES):
            cursor.execute(
                """
                INSERT INTO animals (id, name, slug, animal_type, status, active, organization_id, adoption_url,
                                     primary_breed, breed_slug, breed_group, dog_profiler_data)
                VALUES (%s, %s, %s, 'dog', 'available', TRUE, 901, %s, 'Podenco', 'podenco', 'Hound', %s)
                """,
                (9911 + i, f"Podenco {i}", f"podenco-{i}", f"http://example.com/{i}", json.dumps(profile)),
            )
        stats = AnimalService(cursor).get_breed_stats()
        yield next(b for b in stats["qualifying_breeds"] if b["primary_breed"] == "Podenco")
    finally:
        cursor.connection.rollback()
        cursor_generator.close()


@pytest.mark.database
@pytest.mark.integration
class TestBreedStatsProfileValues:
    def test_experience_counts_the_stored_values(self, podenco):
        assert podenco["experience_distribution"] == {"first_time_ok": 1, "some_experience": 1, "experienced": 1}

    def test_energy_counts_very_high_as_high_and_skips_the_guess(self, podenco):
        # low 2 (weight 1), high 1 (weight 3): 5 / 9 = 55%
        assert podenco["personality_metrics"]["energy_level"]["percentage"] == 55

    def test_affection_counts_selective_and_skips_the_guess(self, podenco):
        # yes 3 + selective 2 + no 1 = 6 / 9 = 66%
        assert podenco["personality_metrics"]["affection"]["percentage"] == 66

    def test_trainability_skips_the_guessed_confidence(self, podenco):
        # confident 3 + moderate 2 + shy 1 = 6 / 9 = 66%
        assert podenco["personality_metrics"]["trainability"]["percentage"] == 66
