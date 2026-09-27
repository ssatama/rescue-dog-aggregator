"""The one-description-key and unknown-to-null backfill steps (#568)."""

import json

import pytest

from management.backfill_steps import STEPS, plan_step


def _story_record(properties):
    return {"id": 1, "organization": "theunderdog", "properties": properties}


def _planned(properties):
    [change] = plan_step(STEPS["one-description-key"], [_story_record(properties)])
    return json.loads(change.now)


@pytest.mark.unit
class TestOneDescriptionKey:
    def test_raw_description_becomes_the_description(self):
        assert _planned({"raw_description": "Vicky loves walks.", "page_url": "u"}) == {"description": "Vicky loves walks.", "page_url": "u"}

    def test_beschreibung_becomes_the_description(self):
        assert _planned({"Beschreibung": "Bonsai ist lieb."}) == {"description": "Bonsai ist lieb."}

    def test_a_placeholder_story_is_removed(self):
        assert _planned({"description": "No description available", "raw_description": "No description available"}) == {}

    def test_an_underdog_placeholder_gives_way_to_the_real_story(self):
        assert _planned({"description": "Rescue dog Vicky from The Underdog organization.", "raw_description": "Vicky loves walks."}) == {"description": "Vicky loves walks."}

    def test_a_real_story_stays_and_the_old_key_goes(self):
        assert _planned({"description": "Sora is sweet.", "raw_description": "Sora is sweet."}) == {"description": "Sora is sweet."}

    def test_is_idempotent(self):
        assert plan_step(STEPS["one-description-key"], [_story_record({"description": "Sora is sweet."})]) == []


@pytest.mark.unit
class TestUnknownToNull:
    def test_each_unknown_column_becomes_null(self):
        record = {"id": 2, "organization": "rean", "breed": "Unknown", "standardized_breed": "Unknown", "primary_breed": "Unknown", "breed_group": "Unknown", "sex": "Male"}

        changes = plan_step(STEPS["unknown-to-null"], [record])

        assert [(change.column, change.now) for change in changes] == [("breed", None), ("standardized_breed", None), ("primary_breed", None), ("breed_group", None)]

    def test_a_real_breed_is_left_alone(self):
        record = {"id": 3, "organization": "rean", "breed": "Mixed Breed", "standardized_breed": "Mixed Breed", "primary_breed": "Mixed Breed", "breed_group": "Mixed", "sex": "Female"}

        assert plan_step(STEPS["unknown-to-null"], [record]) == []


@pytest.mark.unit
def test_a_real_story_that_starts_like_a_placeholder_stays():
    story = "Rescue dog from Cyprus who loves the beach, Bella is looking for a quiet home."

    assert plan_step(STEPS["one-description-key"], [_story_record({"description": story})]) == []
