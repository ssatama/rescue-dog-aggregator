from datetime import datetime

import pytest

from management.rean_rekey import plan_rekeys


def _row(animal_id, external_id, seen, name="Alexa", active=False):
    return {"id": animal_id, "name": name, "external_id": external_id, "last_seen_at": datetime(2026, *seen), "active": active}


@pytest.mark.unit
class TestPlanRekeys:
    def test_the_most_recently_seen_duplicate_takes_the_new_id(self):
        rows = [
            _row(4534, "rean-romania-alexa-8e6662", (1, 3)),
            _row(4773, "rean-romania-alexa-793671", (3, 29)),
        ]

        [rekey] = plan_rekeys(rows)

        assert (rekey.animal_id, rekey.new_id) == (4773, "rean-romania-alexa")

    def test_the_same_name_on_the_other_page_is_a_different_dog(self):
        rows = [_row(1, "rean-romania-leo-4c5364", (1, 1), name="Leo"), _row(2, "rean-uk_foster-leo-aaaaaa", (1, 1), name="Leo")]

        assert {rekey.new_id for rekey in plan_rekeys(rows)} == {"rean-romania-leo", "rean-uk_foster-leo"}

    def test_already_keyed_rows_are_left_alone(self):
        assert plan_rekeys([_row(1, "rean-romania-alexa", (9, 1))]) == []

    def test_a_new_id_already_held_by_another_row_is_not_reassigned(self):
        rows = [_row(1, "rean-romania-alexa", (9, 1)), _row(2, "rean-romania-alexa-793671", (9, 2))]

        assert plan_rekeys(rows) == []
