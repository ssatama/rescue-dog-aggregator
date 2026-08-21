"""Tests for the fabricated-age backfill planner."""

import pytest

from management.age_backfill import AgeRow, is_fabricated, plan_clears, rows_from_records, summarise


def row(**overrides) -> AgeRow:
    base = {"id": 1, "age_text": None, "age_min_months": None, "age_max_months": None, "organization": "org"}
    return AgeRow(**{**base, "id": overrides.pop("id", 1), **overrides})


@pytest.mark.unit
class TestIsFabricated:
    @pytest.mark.parametrize("text", ["Unknown", "unknown", "UNKNOWN", "  Unknown  ", "N/A", "none", ""])
    def test_placeholders_with_no_range_are_fabricated(self, text):
        assert is_fabricated(row(age_text=text)) is True

    def test_a_real_age_is_left_alone(self):
        assert is_fabricated(row(age_text="2 years", age_min_months=24, age_max_months=24)) is False

    def test_an_already_null_age_is_not_a_change(self):
        assert is_fabricated(row(age_text=None)) is False

    def test_a_placeholder_backed_by_a_real_range_is_left_alone(self):
        """A parsed age produced the range, so the text describes something."""
        assert is_fabricated(row(age_text="Unknown", age_min_months=24)) is False

    def test_unrecognised_text_is_never_cleared(self):
        assert is_fabricated(row(age_text="ancient")) is False


@pytest.mark.unit
class TestPlanClears:
    def test_plans_only_the_fabricated_rows(self):
        rows = [
            row(id=1, age_text="Unknown"),
            row(id=2, age_text="3 years", age_min_months=36),
            row(id=3, age_text="N/A"),
        ]

        assert [clear.animal_id for clear in plan_clears(rows)] == [1, 3]

    def test_records_what_it_is_replacing(self):
        [clear] = plan_clears([row(id=7, age_text="Unknown", organization="santerpaws")])

        assert (clear.was, clear.organization) == ("Unknown", "santerpaws")

    def test_a_clean_database_plans_nothing(self):
        assert plan_clears([row(age_text="5 years", age_min_months=60)]) == []

    def test_output_is_ordered_by_id(self):
        rows = [row(id=9, age_text="Unknown"), row(id=2, age_text="Unknown")]

        assert [clear.animal_id for clear in plan_clears(rows)] == [2, 9]


@pytest.mark.unit
class TestSummarise:
    def test_counts_per_organisation_largest_first(self):
        clears = plan_clears(
            [
                row(id=1, age_text="Unknown", organization="santerpaws"),
                row(id=2, age_text="Unknown", organization="santerpaws"),
                row(id=3, age_text="Unknown", organization="bosnia"),
            ]
        )

        assert summarise(clears) == {"santerpaws": 2, "bosnia": 1}


@pytest.mark.unit
class TestRowsFromRecords:
    def test_maps_database_records(self):
        rows = rows_from_records([{"id": 4, "age_text": "Unknown", "age_min_months": None, "age_max_months": None, "organization": "org"}])

        assert rows == [AgeRow(id=4, age_text="Unknown", age_min_months=None, age_max_months=None, organization="org")]
