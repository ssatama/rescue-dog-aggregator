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

    def test_an_underdog_placeholder_with_a_dotted_name_is_removed(self):
        assert _planned({"raw_description": "Rescue dog Mr. Bean from The Underdog organization."}) == {}

    def test_an_underdog_placeholder_gives_way_to_the_real_story(self):
        assert _planned({"description": "Rescue dog Vicky from The Underdog organization.", "raw_description": "Vicky loves walks."}) == {"description": "Vicky loves walks."}

    def test_a_real_story_stays_and_the_old_key_goes(self):
        assert _planned({"description": "Sora is sweet.", "raw_description": "Sora is sweet."}) == {"description": "Sora is sweet."}

    def test_is_idempotent(self):
        assert plan_step(STEPS["one-description-key"], [_story_record({"description": "Sora is sweet."})]) == []


def _breed_record(**columns):
    record = {
        "id": 2,
        "organization": "rean",
        "breed": None,
        "standardized_breed": None,
        "primary_breed": None,
        "secondary_breed": None,
        "breed_group": None,
        "breed_type": None,
        "breed_slug": None,
        "breed_confidence": None,
        "sex": "Male",
    }
    return {**record, **columns}


@pytest.mark.unit
class TestUnknownToNull:
    def test_a_dog_with_no_breed_loses_every_breed_field(self):
        record = _breed_record(breed="Unknown", standardized_breed="Unknown", primary_breed="Unknown", breed_group="Unknown", breed_type="unknown", breed_slug="unknown", breed_confidence=0)

        changes = plan_step(STEPS["unknown-to-null"], [record])

        assert [(change.column, change.now) for change in changes] == [
            ("breed", None),
            ("standardized_breed", None),
            ("primary_breed", None),
            ("breed_group", None),
            ("breed_type", None),
            ("breed_slug", None),
            ("breed_confidence", None),
        ]

    def test_raw_text_that_names_no_breed_goes_too(self):
        """breed_raw keeps what the rescue wrote; the breed column held it unresolved."""
        record = _breed_record(breed="Can be the only dog", standardized_breed="Unknown", breed_slug="unknown")

        assert {change.column for change in plan_step(STEPS["unknown-to-null"], [record])} == {"breed", "standardized_breed", "breed_slug"}

    def test_an_unregistered_breed_keeps_its_unknown_group(self):
        """The standardiser keeps a clean unregistered name, with group "Unknown" and type "unknown"."""
        record = _breed_record(
            breed="Hungarian Pumi", standardized_breed="Hungarian Pumi", primary_breed="Hungarian Pumi", breed_group="Unknown", breed_type="unknown", breed_slug="hungarian-pumi", breed_confidence=0.4
        )

        assert plan_step(STEPS["unknown-to-null"], [record]) == []

    def test_unknown_sex_becomes_null(self):
        record = _breed_record(breed="Beagle", standardized_breed="Beagle", sex="Unknown")

        assert [(change.column, change.now) for change in plan_step(STEPS["unknown-to-null"], [record])] == [("sex", None)]

    def test_a_real_breed_is_left_alone(self):
        record = _breed_record(breed="Mixed Breed", standardized_breed="Mixed Breed", primary_breed="Mixed Breed", breed_group="Mixed", breed_type="mixed", breed_slug="mixed-breed", sex="Female")

        assert plan_step(STEPS["unknown-to-null"], [record]) == []


@pytest.mark.unit
def test_a_real_story_that_starts_like_a_placeholder_stays():
    for story in ("Rescue dog from Cyprus who loves the beach, Bella is looking for a quiet home.", "Rescue dog from a shelter in Spain."):
        assert plan_step(STEPS["one-description-key"], [_story_record({"description": story})]) == []
