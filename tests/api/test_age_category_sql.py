"""age_category_condition run as SQL, on the refreshed shape of a stated age (#650)."""

import psycopg2
import pytest

from api.services.animal_service import age_category_condition
from config import get_database_config


def _buckets(age_min: int, age_max: int) -> set[str]:
    with psycopg2.connect(**get_database_config()) as conn, conn.cursor() as cursor:
        cursor.execute("UPDATE animals SET age_min_months = %s, age_max_months = %s WHERE id = 9001", (age_min, age_max))
        found = set()
        for category in ("Puppy", "Young", "Adult", "Senior"):
            cursor.execute(f"SELECT 1 FROM animals a WHERE a.id = 9001 AND {age_category_condition(category, age_known=True)}")
            if cursor.fetchone():
                found.add(category)
    return found


@pytest.mark.database
@pytest.mark.integration
class TestAgeBucketsInSql:
    def test_a_refreshed_stated_age_keeps_its_bucket(self):
        assert _buckets(25, 37) == {"Young"}

    def test_a_stated_range_still_spans_its_buckets(self):
        assert _buckets(24, 60) == {"Young", "Adult"}

    def test_an_exact_birth_date_is_one_bucket(self):
        assert _buckets(36, 36) == {"Adult"}
