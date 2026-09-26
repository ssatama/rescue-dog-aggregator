"""Ages that keep up with time (#561)."""

from datetime import UTC, date, datetime, timedelta

import pytest

from utils.birth_dates import (
    REFRESH_AGES_SQL,
    ages_at,
    birth_range_from_age,
    months_between,
    months_sql,
    parse_birth_date,
    resolve_age,
    subtract_months,
)

TODAY = date(2026, 9, 26)


@pytest.mark.unit
class TestParseBirthDate:
    @pytest.mark.parametrize(
        "text,expected",
        [
            # Santer Paws D.O.B, day-first: 3 October, not 10 March
            ("03/10/2025", (date(2025, 10, 3), date(2025, 10, 3))),
            ("31/07/2017", (date(2017, 7, 31), date(2017, 7, 31))),
            # Tierschutzverein Geburtstag, with the site's own age after it
            ("03.2025", (date(2025, 3, 1), date(2025, 3, 31))),
            ("04.2019 (7 Jahre alt)", (date(2019, 4, 1), date(2019, 4, 30))),
            # Bosnia date_of_birth
            ("January 2022", (date(2022, 1, 1), date(2022, 1, 31))),
            # Daisy Alter
            ("01/2026", (date(2026, 1, 1), date(2026, 1, 31))),
            # Pets in Turkey "Born in", day-first
            ("15/02/2026", (date(2026, 2, 15), date(2026, 2, 15))),
            # MISIs DOB bullets
            ("DOB: 08.12.2023.", (date(2023, 12, 8), date(2023, 12, 8))),
            ("rough estimate DOB -April /May 2024", (date(2024, 4, 1), date(2024, 5, 31))),
            ("DOB- March 2025", (date(2025, 3, 1), date(2025, 3, 31))),
            ("DOB: around May 2021", (date(2021, 5, 1), date(2021, 5, 31))),
            ("rough estimate DOB -beginning of June 2024", (date(2024, 6, 1), date(2024, 6, 30))),
            ("DOB 2022", (date(2022, 1, 1), date(2022, 12, 31))),
            ("DOB-2015", (date(2015, 1, 1), date(2015, 12, 31))),
            ("Geburtstag: März 2020", (date(2020, 3, 1), date(2020, 3, 31))),
            # This month: the whole month, so the stored range doesn't change daily
            ("09.2026", (date(2026, 9, 1), date(2026, 9, 30))),
            # The date written first is the birth date
            ("DOB 2019, arrived at the shelter March 2023", (date(2019, 1, 1), date(2019, 12, 31))),
            # Only real month names: "maybe" is not May
            ("DOB: maybe 2022", (date(2022, 1, 1), date(2022, 12, 31))),
            ("DOB: Sept 2023", (date(2023, 9, 1), date(2023, 9, 30))),
            # Two months across New Year
            ("DOB Dec/Jan 2024", (date(2023, 12, 1), date(2024, 1, 31))),
            ("Dezember/Januar 2025", (date(2024, 12, 1), date(2025, 1, 31))),
            # A full stop ends the sentence; a year range spans both years
            ("rough estimate DOB 2021.", (date(2021, 1, 1), date(2021, 12, 31))),
            ("2019-2020", (date(2019, 1, 1), date(2020, 12, 31))),
        ],
    )
    def test_formats_the_rescues_publish(self, text, expected):
        assert parse_birth_date(text, TODAY) == expected

    @pytest.mark.parametrize(
        "text",
        [
            None,
            "",
            "2 years",
            "3 months",
            "07/20218",  # a Daisy typo in production
            "31/02/2024",
            "13.2024",
            "12.2026",  # future
            "1990",  # older than any dog
            "June/April 2024",
            "Mixed breed",
        ],
    )
    def test_anything_else_is_none(self, text):
        assert parse_birth_date(text, TODAY) is None


@pytest.mark.unit
class TestMonthArithmetic:
    @pytest.mark.parametrize(
        "earlier,later,months",
        [
            (date(2025, 3, 1), date(2026, 9, 26), 18),
            (date(2025, 3, 31), date(2026, 9, 26), 17),
            (date(2025, 1, 31), date(2025, 2, 28), 0),
            (date(2025, 2, 28), date(2025, 3, 31), 1),
            (date(2026, 9, 30), date(2026, 9, 26), 0),  # never negative
        ],
    )
    def test_months_between_counts_like_postgres_age(self, earlier, later, months):
        assert months_between(earlier, later) == months

    def test_subtract_months_clamps_to_the_month_end(self):
        assert subtract_months(date(2026, 3, 31), 1) == date(2026, 2, 28)
        assert subtract_months(date(2026, 1, 15), 13) == date(2024, 12, 15)

    @pytest.mark.parametrize("observed", [date(2026, 3, 31), date(2026, 5, 31), date(2026, 2, 28), date(2025, 12, 1)])
    @pytest.mark.parametrize("min_months,max_months", [(0, 6), (3, 5), (24, 36), (96, 360)])
    def test_a_stated_age_reads_back_unchanged_on_the_day_it_was_read(self, observed, min_months, max_months):
        assert ages_at(*birth_range_from_age(min_months, max_months, observed), observed) == (min_months, max_months)

    def test_an_open_ended_age_keeps_its_cap(self):
        """ "8+ years" is 96-360 months; a year on it is 108-360, not 108-372."""
        born = birth_range_from_age(96, 360, date(2025, 9, 26))
        assert ages_at(*born, TODAY) == (108, 360)

    def test_a_birth_month_gives_a_one_month_range(self):
        assert ages_at(date(2025, 3, 1), date(2025, 3, 31), TODAY) == (17, 18)


@pytest.mark.unit
class TestResolveAge:
    def test_a_new_dog_is_anchored_today(self):
        age = resolve_age(date_of_birth=None, age_text="3 months", min_months=3, max_months=5, today=TODAY)
        assert (age.age_observed_at, age.age_min_months, age.age_max_months) == (TODAY, 3, 5)
        assert (age.birth_date_min, age.birth_date_max) == (date(2026, 4, 26), date(2026, 6, 26))

    def test_a_date_of_birth_wins_over_the_stated_age(self):
        age = resolve_age(date_of_birth="03.2025", age_text="1 year", min_months=12, max_months=24, today=TODAY)
        assert (age.birth_date_min, age.birth_date_max, age.age_min_months, age.age_max_months) == (date(2025, 3, 1), date(2025, 3, 31), 17, 18)

    def test_a_date_of_birth_written_as_the_age_is_used(self):
        """The Underdog: "Puppy (estimated DOB 01.03.2026)" is a birth date, not a category."""
        age = resolve_age(date_of_birth=None, age_text="Puppy (estimated DOB 01.03.2026)", min_months=2, max_months=10, today=TODAY)
        assert (age.birth_date_min, age.age_min_months, age.age_max_months) == (date(2026, 3, 1), 6, 6)

    def test_a_date_age_text_is_not_anchored_in_the_past(self):
        """parse_age_text turns "02/2024" into months as of today; re-anchoring them at first sight would count the time twice."""
        stored = {"age_text": "02/2024", "age_min_months": 19, "age_max_months": 25, "created_at": "2025-09-26"}
        age = resolve_age(date_of_birth=None, age_text="02/2024", min_months=31, max_months=37, today=TODAY, stored=stored)
        assert (age.age_min_months, age.age_max_months) == (30, 31)

    def test_other_dates_in_age_text_are_not_birth_dates(self):
        age = resolve_age(date_of_birth=None, age_text="approx. 2 years, arrived 03/2024", min_months=24, max_months=36, today=TODAY)
        assert (age.age_min_months, age.age_max_months) == (24, 36)

    def test_a_bare_date_that_is_not_a_birth_date_is_no_age(self):
        """Daisy's "07/20218": parse_age_text would read "07/2021" and count from today."""
        age = resolve_age(date_of_birth="07/20218", age_text="07/20218", min_months=62, max_months=74, today=TODAY)
        assert age.age_min_months is None and age.birth_date_min is None

    def test_an_unparseable_date_of_birth_falls_back_to_the_stated_age(self):
        age = resolve_age(date_of_birth="07/20218", age_text="5 years", min_months=60, max_months=72, today=TODAY)
        assert (age.age_min_months, age.age_max_months) == (60, 72)

    def test_no_age_at_all_stores_nothing(self):
        assert resolve_age(date_of_birth=None, age_text=None, min_months=None, max_months=None, today=TODAY) == resolve_age(
            date_of_birth=None, age_text="Unknown", min_months=None, max_months=None, today=TODAY
        )
        assert resolve_age(date_of_birth=None, age_text=None, min_months=None, max_months=None, today=TODAY).age_observed_at is None

    def test_an_unchanged_age_text_keeps_the_stored_anchor(self):
        """MISIs' "Bubby, 3 months", still on the site a year later, is 15 months old."""
        observed = date(2025, 9, 26)
        stored = {"age_text": "3 months", "birth_date_min": date(2025, 4, 26), "birth_date_max": date(2025, 6, 26), "age_observed_at": observed}
        age = resolve_age(date_of_birth=None, age_text="3 months", min_months=3, max_months=5, today=TODAY, stored=stored)
        assert (age.age_observed_at, age.age_min_months, age.age_max_months) == (observed, 15, 17)

    def test_a_row_from_before_561_is_anchored_at_first_sight(self):
        """No stored range yet: the age was read when the dog was first seen."""
        stored = {"age_text": "3 months", "age_min_months": 3, "age_max_months": 5, "created_at": datetime(2025, 7, 5, 15, 42)}
        age = resolve_age(date_of_birth=None, age_text="3 months", min_months=3, max_months=5, today=TODAY, stored=stored)
        assert (age.age_observed_at, age.age_min_months, age.age_max_months) == (date(2025, 7, 5), 17, 19)

    def test_the_admin_api_returns_dates_as_text(self):
        stored = {"age_text": "3 months", "age_min_months": "3", "age_max_months": "5", "created_at": "2025-07-05T15:42:00"}
        age = resolve_age(date_of_birth=None, age_text="3 months", min_months=3, max_months=5, today=TODAY, stored=stored)
        assert age.age_observed_at == date(2025, 7, 5)

    def test_a_parser_fix_still_lands_on_an_unchanged_age_text(self):
        """The anchor is kept, the months are the new parse: "10 weeks" once stored as 120 months."""
        stored = {"age_text": "10 weeks", "birth_date_min": date(2015, 7, 5), "birth_date_max": date(2015, 7, 5), "age_observed_at": date(2025, 7, 5)}
        age = resolve_age(date_of_birth=None, age_text="10 weeks", min_months=2, max_months=4, today=TODAY, stored=stored)
        assert (age.age_observed_at, age.age_min_months, age.age_max_months) == (date(2025, 7, 5), 16, 18)

    def test_a_changed_age_text_is_anchored_again(self):
        stored = {"age_text": "3 months", "birth_date_min": date(2025, 4, 26), "birth_date_max": date(2025, 6, 26), "age_observed_at": date(2025, 9, 26)}
        age = resolve_age(date_of_birth=None, age_text="1 year", min_months=12, max_months=14, today=TODAY, stored=stored)
        assert (age.age_observed_at, age.age_min_months, age.age_max_months) == (TODAY, 12, 14)

    def test_an_unchanged_date_of_birth_keeps_its_observation_day(self):
        stored = {"birth_date_min": date(2025, 3, 1), "birth_date_max": date(2025, 3, 31), "age_observed_at": date(2026, 1, 1)}
        age = resolve_age(date_of_birth="03.2025", age_text="03.2025", min_months=None, max_months=None, today=TODAY, stored=stored)
        assert age.age_observed_at == date(2026, 1, 1)


@pytest.mark.database
@pytest.mark.integration
class TestRefreshSql:
    """Against the test database. utils.db_connection's execute_* are mocked suite-wide, so these use a cursor."""

    def test_sql_months_match_python_months(self):
        """REFRESH_AGES_SQL and ages_at must agree, or a save and the next refresh fight."""
        from utils.db_connection import get_db_cursor

        # Including births more than 360 months back, where the cap applies
        births = [date(2020, 1, 31) + timedelta(days=d) for d in range(0, 2400, 7)] + [date(1994, 1, 31) + timedelta(days=d) for d in range(0, 800, 11)]
        todays = [date(2026, 2, 28), date(2026, 3, 31), date(2026, 9, 26), date(2024, 2, 29)]
        values = ", ".join(f"(DATE '{b}', DATE '{t}')" for b in births for t in todays)
        with get_db_cursor() as cursor:
            cursor.execute(f"SELECT b, t, {months_sql('b', 't')} AS months FROM (VALUES {values}) AS v(b, t)")
            rows = cursor.fetchall()

        mismatches = [(row["b"], row["t"], row["months"]) for row in rows if row["months"] != ages_at(row["b"], None, row["t"])[1]]
        assert len(rows) == len(births) * len(todays)
        assert not mismatches

    def test_refresh_ages_a_stored_dog_and_leaves_the_rest(self):
        from utils.db_connection import get_db_cursor

        with get_db_cursor() as cursor:
            cursor.execute("SELECT id FROM organizations LIMIT 1")
            org_id = cursor.fetchone()["id"]
            cursor.execute(
                """
                INSERT INTO animals (name, organization_id, external_id, adoption_url, age_text, age_min_months, age_max_months,
                                     birth_date_min, birth_date_max, age_observed_at)
                VALUES ('Bubby', %(org)s, 'age-bubby', 'https://example.org/bubby', '3 months', 3, 5, DATE '2025-04-26', DATE '2025-06-26', DATE '2025-09-26'),
                       ('Nora', %(org)s, 'age-nora', 'https://example.org/nora', '2 years', 24, 36, NULL, NULL, NULL)
                """,
                {"org": org_id},
            )
            cursor.execute(REFRESH_AGES_SQL)
            cursor.execute("SELECT external_id, age_min_months, age_max_months, birth_date_min, birth_date_max FROM animals WHERE external_id LIKE 'age-%%'")
            rows = {row["external_id"]: row for row in cursor.fetchall()}
            cursor.connection.rollback()

        bubby = rows["age-bubby"]
        today = datetime.now(UTC).date()
        assert (bubby["age_min_months"], bubby["age_max_months"]) == ages_at(bubby["birth_date_min"], bubby["birth_date_max"], today)
        assert bubby["age_min_months"] >= 15
        # No birth range yet (before the #572 backfill): left as it is
        assert (rows["age-nora"]["age_min_months"], rows["age-nora"]["age_max_months"]) == (24, 36)


@pytest.mark.unit
@pytest.mark.parametrize(
    "age_text,is_birth_date",
    [
        ("02/2024", True),
        ("Puppy (estimated DOB 01.03.2026)", True),
        ("ca. 2 Jahre (geb. 03/2022)", True),
        ("2 years, arrived 03/2024", False),
        ("2 years", False),
        (None, False),
    ],
)
def test_age_text_is_a_birth_date_only_when_it_says_so(age_text, is_birth_date):
    from utils.birth_dates import age_text_is_a_birth_date

    assert age_text_is_a_birth_date(age_text) is is_birth_date


@pytest.mark.unit
class TestStatedAt:
    """#562: MISIs says when the rescue wrote the age: the post's last edit."""

    def test_the_day_the_rescue_wrote_the_age_is_the_anchor(self):
        age = resolve_age(date_of_birth=None, age_text="3.5 months", min_months=3, max_months=5, today=TODAY, stated_at=date(2025, 7, 5))
        assert (age.age_observed_at, age.age_min_months) == (date(2025, 7, 5), 17)

    def test_it_wins_over_a_changed_age_text(self):
        """Our parser now writes "4 months" for the same post; that is not the rescue re-aging the dog."""
        stored = {"age_text": "5 months", "created_at": "2025-07-05", "age_min_months": 5, "age_max_months": 7}
        age = resolve_age(date_of_birth=None, age_text="4 months", min_months=4, max_months=6, today=TODAY, stored=stored, stated_at=date(2025, 7, 1))
        assert age.age_observed_at == date(2025, 7, 1)

    def test_a_date_of_birth_still_wins(self):
        age = resolve_age(date_of_birth="DOB January 2026", age_text="DOB January 2026", min_months=None, max_months=None, today=TODAY, stated_at=date(2026, 5, 22))
        assert age.birth_date_min == date(2026, 1, 1)
