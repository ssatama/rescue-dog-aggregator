"""The derive-birth-dates backfill step (#561): ages that keep up with time."""

from datetime import date

import pytest

from management.backfill_steps import STEPS, _plan_birth_dates

TODAY = date(2026, 9, 26)


def _record(**overrides):
    record = {
        "id": 1,
        "organization": "misisrescue",
        "age_text": "3 months",
        "age_min_months": 3,
        "age_max_months": 5,
        "created_at": "2025-07-05T15:42:00",
        "birth_date_min": None,
        "birth_date_max": None,
        "age_observed_at": None,
        "date_of_birth": None,
        "bullets": None,
    }
    return {**record, **overrides}


def _after(changes):
    return {change.column: change.now for change in changes}


@pytest.mark.unit
class TestDeriveBirthDates:
    def test_a_stale_puppy_ages_from_first_sight(self):
        """MISIs "Bubby, 3 months", first seen 2025-07-05, is 17 months old now."""
        after = _after(_plan_birth_dates([_record()], TODAY))

        assert after["age_observed_at"] == date(2025, 7, 5)
        assert (after["age_min_months"], after["age_max_months"]) == (17, 19)

    def test_a_published_date_of_birth_wins(self):
        record = _record(organization="tierschutzverein-europa", age_text="03.2025 (1 Jahr alt)", age_min_months=12, age_max_months=24, date_of_birth="03.2025 (1 Jahr alt)")

        after = _after(_plan_birth_dates([record], TODAY))

        assert (after["birth_date_min"], after["birth_date_max"]) == (date(2025, 3, 1), date(2025, 3, 31))
        assert (after["age_min_months"], after["age_max_months"]) == (17, 18)

    def test_misis_reads_the_dob_bullet(self):
        record = _record(age_text=None, age_min_months=None, age_max_months=None, bullets='["She is a natural-born explorer", "DOB: around May 2021", "mixed breed"]')

        after = _after(_plan_birth_dates([record], TODAY))

        assert (after["birth_date_min"], after["birth_date_max"]) == (date(2021, 5, 1), date(2021, 5, 31))
        assert after["age_min_months"] == 63

    def test_a_dog_with_no_age_is_left_alone(self):
        assert _plan_birth_dates([_record(age_text=None, age_min_months=None, age_max_months=None)], TODAY) == []

    def test_a_second_run_plans_nothing(self):
        """Steps are planned from fresh rows at apply time, so a step that already ran must plan nothing."""
        first = _record()
        applied = {**first, **{c.column: c.now.isoformat() if isinstance(c.now, date) else c.now for c in _plan_birth_dates([first], TODAY)}}

        assert _plan_birth_dates([applied], TODAY) == []

    def test_is_registered_and_reads_only_active_dogs(self):
        sql = STEPS["derive-birth-dates"].fetch_sql

        assert "WHERE a.active" in sql
        assert "to_jsonb(a)->>'birth_date_min'" in sql
