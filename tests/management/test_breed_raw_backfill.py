"""The restore-breed-raw backfill step (#560)."""

import pytest

from management.backfill_steps import BREED_SOURCE_ORGS, STEPS, Change, plan_step


def _record(id, source, breed_raw, organization="dogstrust"):
    return {"id": id, "source_breed": source, "breed_raw": breed_raw, "organization": organization}


@pytest.mark.unit
class TestRestoreBreedRaw:
    def test_is_registered_for_the_rescues_with_a_source_copy(self):
        step = STEPS["restore-breed-raw"]
        assert all(f"'{org}'" in step.fetch_sql for org in BREED_SOURCE_ORGS)
        assert "manytearsrescue" not in step.fetch_sql

    def test_restores_the_rescues_text(self):
        records = [_record(1, "Poodle (Toy)", "Toy Poodle"), _record(2, " Mixed ", "Mixed Breed", "santerpawsbulgarianrescue")]

        assert plan_step(STEPS["restore-breed-raw"], records) == [
            Change(1, "dogstrust", "breed_raw", "Toy Poodle", "Poodle (Toy)"),
            Change(2, "santerpawsbulgarianrescue", "breed_raw", "Mixed Breed", "Mixed"),
        ]

    def test_is_idempotent(self):
        """Planned from fresh rows, a step that already ran plans nothing."""
        assert plan_step(STEPS["restore-breed-raw"], [_record(1, "Poodle (Toy)", "Poodle (Toy)")]) == []

    def test_a_blank_source_is_left_alone(self):
        assert plan_step(STEPS["restore-breed-raw"], [_record(1, "  ", "Toy Poodle"), _record(2, None, "Toy Poodle")]) == []
