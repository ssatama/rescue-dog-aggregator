"""The backfill step registry (#556)."""

import pytest

from management.backfill_steps import STEPS, Change, get_steps, plan_step, update_statements


def _age_record(id, age_text, organization="org-a", age_min=None, age_max=None):
    return {"id": id, "age_text": age_text, "age_min_months": age_min, "age_max_months": age_max, "organization": organization}


@pytest.mark.unit
class TestRegistry:
    def test_age_backfill_is_registered(self):
        assert "clear-fabricated-ages" in STEPS

    def test_every_step_fetches_the_organization(self):
        for step in STEPS.values():
            assert "AS organization" in step.fetch_sql, step.name

    def test_unknown_step_names_are_refused(self):
        with pytest.raises(ValueError, match="nope"):
            get_steps(["clear-fabricated-ages", "nope"])

    def test_age_step_plans_clears_from_records(self):
        records = [_age_record(1, "Unknown"), _age_record(2, "2 years", age_min=24, age_max=36), _age_record(3, "unbekannt", "org-b")]

        changes = plan_step(STEPS["clear-fabricated-ages"], records)

        assert changes == [Change(1, "org-a", "age_text", "Unknown", None), Change(3, "org-b", "age_text", "unbekannt", None)]

    def test_age_step_is_idempotent(self):
        """Planned from fresh rows, a step that already ran plans nothing."""
        assert plan_step(STEPS["clear-fabricated-ages"], [_age_record(1, None)]) == []

    def test_plan_can_be_limited_to_organizations(self):
        records = [_age_record(1, "Unknown"), _age_record(3, "unbekannt", "org-b")]

        changes = plan_step(STEPS["clear-fabricated-ages"], records, {"org-b"})

        assert [change.animal_id for change in changes] == [3]


@pytest.mark.unit
class TestUpdateStatements:
    def test_one_parameterised_update_per_change(self):
        statements = update_statements([Change(7, "org", "age_text", "Unknown", None)])

        assert statements == [("UPDATE animals SET age_text = %s WHERE id = %s", (None, 7))]

    def test_refuses_a_suspicious_column(self):
        with pytest.raises(ValueError):
            update_statements([Change(7, "org", "age_text = NULL; DROP TABLE animals; --", None, None)])
