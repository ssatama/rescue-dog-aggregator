"""The swipe age filter reads the refreshed months, not age_text (#643)."""

import psycopg2
import pytest

from api.routes.swipe import build_age_conditions
from config import get_database_config


def _matching(age_group: str) -> set[int]:
    (condition,) = build_age_conditions([age_group])
    with psycopg2.connect(**get_database_config()) as conn, conn.cursor() as cursor:
        cursor.execute(f"SELECT a.id FROM animals a WHERE a.id IN (9001, 9002) AND {condition}")
        return {row[0] for row in cursor.fetchall()}


@pytest.mark.database
@pytest.mark.integration
class TestSwipeAgeFilter:
    def test_a_dog_first_read_as_a_puppy_ages_out(self):
        """Listed as "3 months" a year ago: 15 months now, a young dog, as its card says."""
        with psycopg2.connect(**get_database_config()) as conn, conn.cursor() as cursor:
            cursor.execute("UPDATE animals SET age_text = '3 months', age_min_months = 15, age_max_months = 27 WHERE id = 9001")

        assert 9001 not in _matching("puppy")
        assert 9001 in _matching("young")

    def test_the_groups_are_the_cards(self):
        with psycopg2.connect(**get_database_config()) as conn, conn.cursor() as cursor:
            cursor.execute("UPDATE animals SET age_text = '8 years', age_min_months = 96, age_max_months = 108 WHERE id = 9002")

        assert 9002 in _matching("senior")
        assert 9002 not in _matching("adult")


@pytest.mark.unit
def test_an_unknown_group_adds_no_condition():
    assert build_age_conditions(["ancient"]) == []


@pytest.mark.database
@pytest.mark.integration
def test_a_dog_of_unknown_age_is_not_offered_as_a_puppy():
    """Review of #647: a single-card stack filtered to "Puppy" promises an age, so
    a dog with none stays out, as the regexes kept it (age_known, like /dogs/puppies)."""
    with psycopg2.connect(**get_database_config()) as conn, conn.cursor() as cursor:
        cursor.execute("UPDATE animals SET age_text = NULL, age_min_months = NULL, age_max_months = NULL WHERE id = 9001")

    assert 9001 not in _matching("puppy")
