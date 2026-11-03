from datetime import datetime
from unittest.mock import MagicMock

import pytest

from management.pets_in_turkey_rekey import Rekey, apply_rekeys, plan_rekeys

PAGE = "https://www.petsinturkey.org/dogs/"


def _row(animal_id, name, sex="Female", external_id=None, active=True, seen=(10, 26)):
    return {
        "id": animal_id,
        "name": name,
        "sex": sex,
        "external_id": external_id or f"pit-old-{animal_id}",
        "adoption_url": "https://www.petsinturkey.org/dogs",
        "active": active,
        "last_seen_at": datetime(2026, *seen),
    }


def _listed(slug, name, sex="Female"):
    return {"external_id": f"pit-{slug}", "name": name, "sex": sex, "adoption_url": PAGE + slug}


@pytest.mark.unit
class TestPlanRekeys:
    def test_an_active_row_takes_its_dogs_page_slug_and_link(self):
        plan = plan_rekeys([_row(10187, "Aliza")], [_listed("aliza", "Aliza")])

        assert plan.rekeys == [Rekey(10187, "Aliza", "pit-old-10187", "pit-aliza", PAGE + "aliza")]
        assert plan.new_dogs == []
        assert plan.ambiguous == []

    def test_the_slug_can_differ_from_the_name(self):
        plan = plan_rekeys([_row(1, "Mona")], [_listed("mona-2", "Mona")])

        assert [(r.animal_id, r.new_id) for r in plan.rekeys] == [(1, "pit-mona-2")]

    def test_names_match_ignoring_case_and_spacing(self):
        plan = plan_rekeys([_row(1, "Mr  Bean", sex="Male")], [_listed("mr-bean", "mr bean", sex="Male")])

        assert [r.animal_id for r in plan.rekeys] == [1]

    def test_an_inactive_row_is_never_revived(self):
        """Chester was last seen in July; a same-named dog now is a new row, not his old page."""
        plan = plan_rekeys([_row(7874, "Chester", sex="Male", active=False)], [_listed("chester", "Chester", sex="Male")])

        assert plan.rekeys == []
        assert [dog["external_id"] for dog in plan.new_dogs] == ["pit-chester"]

    def test_a_row_of_the_other_sex_is_not_the_dog(self):
        plan = plan_rekeys([_row(1, "Teddy", sex="Female")], [_listed("teddy", "Teddy", sex="Male")])

        assert plan.rekeys == []
        assert [dog["name"] for dog in plan.new_dogs] == ["Teddy"]

    def test_a_name_twice_on_either_side_is_left_for_a_human(self):
        two_rows = plan_rekeys([_row(1, "Luna"), _row(2, "Luna")], [_listed("luna", "Luna")])
        two_dogs = plan_rekeys([_row(1, "Luna")], [_listed("luna", "Luna"), _listed("luna-2", "Luna")])

        for plan in (two_rows, two_dogs):
            assert plan.rekeys == []
            assert plan.ambiguous == ["Luna"]

    def test_two_rows_of_one_name_are_told_apart_by_sex(self):
        plan = plan_rekeys([_row(1, "Luna", sex="Female"), _row(2, "Luna", sex="Male")], [_listed("luna", "Luna", sex="Male")])

        assert [r.animal_id for r in plan.rekeys] == [2]

    def test_already_keyed_rows_are_left_alone(self):
        plan = plan_rekeys([_row(1, "Aliza", external_id="pit-aliza")], [_listed("aliza", "Aliza")])

        assert plan.rekeys == []
        assert plan.new_dogs == []

    def test_active_rows_no_longer_listed_are_reported_and_left_to_go_stale(self):
        plan = plan_rekeys([_row(1, "Alfie", sex="Male"), _row(2, "Aliza")], [_listed("aliza", "Aliza")])

        assert [row["name"] for row in plan.unlisted] == ["Alfie"]


@pytest.mark.unit
class TestApplyRekeys:
    def test_counts_only_the_rows_actually_changed(self):
        """A row re-keyed between the dry run and --apply matches no row and isn't counted."""
        cursor = MagicMock()
        type(cursor).rowcount = property(lambda self: [1, 0][cursor.execute.call_count - 1])
        rekeys = [Rekey(1, "Aliza", "pit-old-1", "pit-aliza", PAGE + "aliza"), Rekey(2, "Mona", "pit-old-2", "pit-mona-2", PAGE + "mona-2")]

        changed = apply_rekeys(cursor, rekeys)

        assert [rekey.animal_id for rekey in changed] == [1]
        sql, params = cursor.execute.call_args_list[0].args
        assert "slug" not in sql.replace("external_id", "")
        assert params == ("pit-aliza", PAGE + "aliza", 1, "pit-old-1")
