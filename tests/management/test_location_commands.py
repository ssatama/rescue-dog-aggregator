"""Planning the display-location backfill (#505)."""

import pytest

from management.location_commands import coverage, plan_locations


def record(id, properties, organization="dogstrust"):
    return {"id": id, "slug": f"dog-{id}", "properties": properties, "organization": organization}


@pytest.mark.unit
class TestPlanLocations:
    def test_adds_the_display_location_and_keeps_the_rest(self):
        [(animal_id, slug, properties)] = plan_locations([record(1, {"location": "Snetterton (Norfolk) (Snetterton)", "colour": "black"})])

        assert (animal_id, slug) == (1, "dog-1")
        assert properties == {"location": "Snetterton (Norfolk) (Snetterton)", "colour": "black", "display_location": "Snetterton, Norfolk"}

    def test_a_second_run_changes_nothing(self):
        done = record(1, {"location": "Cardiff (Cardiff)", "display_location": "Cardiff"})

        assert plan_locations([done]) == []

    def test_dogs_without_a_readable_place_are_left_out(self):
        assert plan_locations([record(1, None), record(2, {"Aufenthaltsort": "auf Anfrage"})]) == []

    def test_coverage_counts_before_and_after(self):
        records = [record(1, {"location": "Cardiff (Cardiff)"}), record(2, None), record(3, {"current_location": "Norfolk"}, "rean")]

        assert coverage(records, plan_locations(records)) == {"dogstrust": (2, 0, 1), "rean": (1, 0, 1)}
