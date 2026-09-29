"""The reslug-unknown backfill step (#634): slugs made from the old literal "Unknown" breed."""

import pytest

from management.backfill_steps import STEPS, Change, plan_step


def _record(slug, breed=None, standardized_breed=None, name="Sunny", id=11687):
    return {"id": id, "slug": slug, "name": name, "breed": breed, "standardized_breed": standardized_breed, "organization": "rean"}


@pytest.mark.unit
class TestReslugUnknown:
    def test_a_dog_without_a_breed_becomes_name_id(self):
        assert plan_step(STEPS["reslug-unknown"], [_record("sunny-unknown-11687")]) == [Change(11687, "rean", "slug", "sunny-unknown-11687", "sunny-11687")]

    def test_a_dog_with_a_breed_now_gets_it(self):
        changes = plan_step(STEPS["reslug-unknown"], [_record("sunny-unknown-11687", breed="Lurcher x", standardized_breed="Lurcher")])
        assert [c.now for c in changes] == ["sunny-lurcher-11687"]

    def test_is_idempotent(self):
        assert plan_step(STEPS["reslug-unknown"], [_record("sunny-11687")]) == []

    def test_selects_only_the_unknown_slugs(self):
        assert "-unknown-[0-9]+$" in STEPS["reslug-unknown"].fetch_sql
