"""The dry-run diff between a scrape and stored rows (#556)."""

import json
from decimal import Decimal

import pytest

from management.backfill_diff import build_plan, dog_changes, needs_reprofile, render_markdown


def _stored(external_id, id=1, **overrides):
    row = {
        "id": id,
        "external_id": external_id,
        "status": "available",
        "active": True,
        "name": "Rex",
        "breed": "Labrador",
        "age_min_months": 24,
        "breed_confidence": Decimal("0.9"),
        "original_image_url": f"https://example.org/{external_id}.jpg",
        "properties": {"description": "A good dog."},
    }
    row.update(overrides)
    return row


def _scraped(external_id, **overrides):
    dog = {
        "external_id": external_id,
        "status": "available",
        "name": "Rex",
        "breed": "Labrador",
        "age_min_months": 24,
        "breed_confidence": 0.9,
        "image_source": f"https://example.org/{external_id}.jpg",
        "properties": json.dumps({"description": "A good dog."}),
    }
    dog.update(overrides)
    return dog


@pytest.mark.unit
class TestDogChanges:
    def test_identical_dog_has_no_changes(self):
        assert dog_changes(_scraped("a"), _stored("a")) == {}

    def test_numbers_returned_as_text_by_the_api_compare_equal(self):
        assert dog_changes(_scraped("a"), _stored("a", age_min_months="24", breed_confidence="0.90")) == {}

    def test_empty_string_and_null_are_the_same(self):
        assert dog_changes(_scraped("a", sex=""), _stored("a", sex=None)) == {}

    def test_image_source_is_compared_with_the_stored_original(self):
        changes = dog_changes(_scraped("a", image_source="https://example.org/new.jpg"), _stored("a"))

        assert changes == {"image_source": ("https://example.org/a.jpg", "https://example.org/new.jpg")}

    def test_properties_are_compared_per_key(self):
        scraped = _scraped("a", properties=json.dumps({"description": "A good dog.", "display_location": "Berlin"}))

        assert dog_changes(scraped, _stored("a")) == {"properties.display_location": (None, "Berlin")}

    def test_text_change_needs_a_reprofile_but_location_does_not(self):
        assert needs_reprofile({"properties.description": ("a", "b")})
        assert needs_reprofile({"properties.Beschreibung": ("a", "b")})
        assert not needs_reprofile({"properties.display_location": (None, "Berlin"), "size": ("Small", "Medium")})


@pytest.mark.unit
class TestBuildPlan:
    def test_counts_fields_and_lists_new_and_missing_dogs(self):
        scraped = [_scraped("a", breed="Collie"), _scraped("b"), _scraped("new")]
        stored = [_stored("a", id=1), _stored("b", id=2), _stored("gone", id=3)]

        plan = build_plan("org", scraped, [{"external_id": "r", "reason": "no_image"}], stored)

        assert plan["scraped"] == 3
        assert plan["matched"] == 2
        assert plan["stored_available"] == 3
        assert plan["new_on_site"] == ["new"]
        assert plan["missing_from_site"] == ["gone"]
        assert plan["fields"] == {"breed": {"changed": 1, "examples": [{"external_id": "a", "was": "Labrador", "now": "Collie"}]}}
        assert plan["reprofile_ids"] == []

    def test_a_rejected_dog_is_not_reported_missing(self):
        plan = build_plan("org", [], [{"external_id": "a", "reason": "no_image"}], [_stored("a")])

        assert plan["missing_from_site"] == []

    def test_dogs_whose_text_changes_are_listed_for_reprofiling(self):
        plan = build_plan("org", [_scraped("a", properties=json.dumps({"description": "New text."}))], [], [_stored("a", id=42)])

        assert plan["reprofile_ids"] == [42]

    def test_examples_are_capped_at_five(self):
        scraped = [_scraped(str(i), breed="Collie") for i in range(8)]
        stored = [_stored(str(i), id=i) for i in range(8)]

        plan = build_plan("org", scraped, [], stored)

        assert plan["fields"]["breed"]["changed"] == 8
        assert len(plan["fields"]["breed"]["examples"]) == 5


@pytest.mark.unit
class TestRenderMarkdown:
    def test_no_change_says_so(self):
        text = render_markdown(build_plan("rean", [_scraped("a")], [], [_stored("a")]))

        assert "No stored field would change." in text
        assert "Scraped **1**" in text

    def test_changes_render_as_a_table_with_escaped_pipes(self):
        text = render_markdown(build_plan("org", [_scraped("a", name="Rex | URGENT")], [], [_stored("a")]))

        assert "| `name` | 1 / 1 |" in text
        assert "Rex \\| URGENT" in text
