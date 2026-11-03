"""The disabled-org-status-unknown (#566) backfill step, and the retired pets-in-turkey-listing-url (#564)."""

import pytest

from management.backfill_steps import STEPS, Change, plan_step


@pytest.mark.unit
class TestPetsInTurkeyListingUrlRetired:
    def test_no_step_points_pets_in_turkey_dogs_back_at_the_listing(self):
        """Each dog has its own page since #747; the #564 step would undo that."""
        assert "pets-in-turkey-listing-url" not in STEPS


@pytest.mark.unit
class TestDisabledOrgStatusUnknown:
    def test_an_available_row_of_the_disabled_org_becomes_unknown(self):
        records = [{"id": 7, "status": "available", "organization": "galgosdelsol"}]

        assert plan_step(STEPS["disabled-org-status-unknown"], records) == [Change(7, "galgosdelsol", "status", "available", "unknown")]

    def test_is_idempotent(self):
        assert plan_step(STEPS["disabled-org-status-unknown"], [{"id": 7, "status": "unknown", "organization": "galgosdelsol"}]) == []
