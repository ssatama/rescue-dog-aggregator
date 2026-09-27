from datetime import datetime

import pytest

from management.pets_in_turkey_rekey import plan_rekeys

BARNEY = "https://static.wixstatic.com/media/3da926_396bf19072fa4b8a9fef8f8d83f06775~mv2.jpeg"
BARNEY_ID = "pit-396bf19072fa4b8a9fef8f8d83f06775"


def _row(animal_id, external_id, seen, photo=BARNEY, active=False):
    return {"id": animal_id, "name": "Barney", "external_id": external_id, "original_image_url": photo, "last_seen_at": datetime(2026, *seen), "active": active}


@pytest.mark.unit
class TestPlanRekeys:
    def test_the_most_recently_seen_row_with_the_photo_takes_the_new_id(self):
        # Barney was re-created when "Mixed Breed" became "Mix" (production, 2025-09-04)
        rows = [_row(3931, "pit-barney-mixed-breed", (1, 1)), _row(4932, "pit-barney-mix", (9, 26), active=True)]

        [rekey] = plan_rekeys(rows)

        assert (rekey.animal_id, rekey.old_id, rekey.new_id) == (4932, "pit-barney-mix", BARNEY_ID)

    def test_already_keyed_rows_are_left_alone(self):
        assert plan_rekeys([_row(1, BARNEY_ID, (9, 1))]) == []

    def test_a_new_id_already_held_by_another_row_is_not_reassigned(self):
        rows = [_row(1, BARNEY_ID, (9, 1)), _row(2, "pit-barney-mix", (9, 2))]

        assert plan_rekeys(rows) == []

    def test_a_row_without_a_wix_photo_keeps_its_id(self):
        assert plan_rekeys([_row(1, "pit-barney-mix", (9, 1), photo=None)]) == []
