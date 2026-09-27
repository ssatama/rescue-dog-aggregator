"""Re-keying Santer Paws and Bosnia rows onto WordPress post IDs (#570)."""

from datetime import datetime

import pytest

from management.wordpress_rekey import plan_rekeys

LINKS = {"/dog/dexter": (232, "https://santerpawsbulgarianrescue.com/dog/dexter/")}


def _row(row_id, external_id, url, seen, active=True):
    return {"id": row_id, "name": "Dexter", "external_id": external_id, "adoption_url": url, "last_seen_at": datetime(2026, 9, seen), "active": active}


@pytest.mark.unit
class TestPlanRekeys:
    def test_a_row_moves_to_its_post_id_and_current_link(self):
        [rekey], _ = plan_rekeys([_row(1, "spbr-dexter", "https://santerpawsbulgarianrescue.com/adoption/dexter/", 26)], LINKS, "spbr-")

        assert (rekey.old_id, rekey.new_id, rekey.link) == ("spbr-dexter", "spbr-232", "https://santerpawsbulgarianrescue.com/dog/dexter/")

    def test_of_two_rows_for_one_post_the_last_seen_moves(self):
        rows = [_row(1, "spbr-dexter", "https://x/dog/dexter/", 20), _row(2, "spbr-dexter-2", "https://x/dog/Dexter/", 26)]

        rekeys, skipped = plan_rekeys(rows, LINKS, "spbr-")

        assert [rekey.animal_id for rekey in rekeys] == [2]
        assert skipped == ["spbr-dexter: an older row of spbr-232"]

    def test_an_unpublished_page_keeps_its_id(self):
        assert plan_rekeys([_row(1, "spbr-gone", "https://x/dog/gone/", 26)], LINKS, "spbr-") == ([], [])

    def test_is_idempotent(self):
        assert plan_rekeys([_row(1, "spbr-232", "https://x/dog/dexter/", 26)], LINKS, "spbr-") == ([], [])

    def test_a_row_never_seen_still_compares(self):
        rows = [_row(1, "spbr-dexter", "https://x/dog/dexter/", 20), {**_row(2, "spbr-dexter-2", "https://x/dog/dexter/", 20), "last_seen_at": None}]

        assert [rekey.animal_id for rekey in plan_rekeys(rows, LINKS, "spbr-")[0]] == [1]

    def test_an_id_already_taken_is_reported(self):
        rows = [_row(1, "spbr-dexter", "https://x/dog/dexter/", 20), _row(2, "spbr-232", "https://x/dog/other/", 26)]

        assert plan_rekeys(rows, LINKS, "spbr-") == ([], ["spbr-dexter: spbr-232 already exists"])
