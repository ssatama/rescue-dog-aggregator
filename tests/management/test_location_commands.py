"""Planning the display-location and country backfill (#505, #702)."""

import pytest

from management.location_commands import countries, coverage, plan_locations

REGIONS = {"dogstrust": ["UK"], "rean": ["UK", "RO"], "misisrescue": ["RS", "MK"]}


def record(id, properties, organization="dogstrust"):
    country = "RS" if organization == "misisrescue" else "UK"
    return {"id": id, "slug": f"dog-{id}", "properties": properties, "organization": organization, "service_regions": REGIONS[organization], "country": country}


@pytest.mark.unit
class TestPlanLocations:
    def test_adds_the_display_location_and_keeps_the_rest(self):
        [(animal_id, slug, properties)] = plan_locations([record(1, {"location": "Snetterton (Norfolk) (Snetterton)", "colour": "black"})])

        assert (animal_id, slug) == (1, "dog-1")
        assert properties == {"location": "Snetterton (Norfolk) (Snetterton)", "colour": "black", "display_location": "Snetterton, Norfolk", "location_country": "UK"}

    def test_a_second_run_changes_nothing(self):
        done = record(1, {"location": "Cardiff (Cardiff)", "display_location": "Cardiff", "location_country": "UK"})

        assert plan_locations([done]) == []

    def test_dogs_without_a_place_or_a_country_are_left_out(self):
        assert plan_locations([record(1, None, "misisrescue"), record(2, {"Aufenthaltsort": "auf Anfrage"}, "rean")]) == []

    def test_a_single_region_gives_the_country_without_a_place(self):
        [(_, _, properties)] = plan_locations([record(1, None)])

        assert properties == {"location_country": "UK"}

    def test_the_country_comes_from_the_place_before_the_rescue(self):
        [(_, _, romania), (_, _, norfolk)] = plan_locations([record(1, {"current_location": "Romania"}, "rean"), record(2, {"current_location": "Norfolk"}, "rean")])

        assert (romania["location_country"], norfolk["location_country"]) == ("RO", "UK")

    def test_countries_counts_the_unknown(self):
        records = [record(1, None), record(2, {"current_location": "Romania"}, "rean"), record(3, None, "misisrescue")]

        assert countries(records, plan_locations(records)) == {"UK": 1, "RO": 1, None: 1}

    def test_coverage_counts_before_and_after(self):
        records = [record(1, {"location": "Cardiff (Cardiff)"}), record(2, None), record(3, {"current_location": "Norfolk"}, "rean")]

        assert coverage(records, plan_locations(records)) == {"dogstrust": (2, 0, 1), "rean": (1, 0, 1)}
