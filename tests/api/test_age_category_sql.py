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

    def test_a_stated_span_is_in_its_cards_bucket(self):
        assert _buckets(24, 60) == {"Young"}

    def test_a_bucket_word_range_after_a_refresh_stays_in_its_bucket(self):
        """#652 review: The Underdog's "adult" (36, 96) is (41, 101) five months on."""
        assert _buckets(41, 101) == {"Adult"}
        assert _buckets(15, 39) == {"Young"}

    def test_a_year_only_birth_date_on_the_31st_keeps_its_bucket(self):
        """#652: 11 wide on the 31st of a month."""
        assert _buckets(34, 45) == {"Young"}

    def test_an_exact_birth_date_is_one_bucket(self):
        assert _buckets(36, 36) == {"Adult"}
