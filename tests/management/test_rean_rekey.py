from datetime import datetime

import pytest

from management.rean_rekey import plan_rekeys
from scrapers.rean.dogs_scraper import rean_external_id

ALEXA_PHOTO = "//img1.wsimg.com/isteam/ip/a/514282681_1190570573111265_9170780346239321032.jpg"


def _row(animal_id, external_id, image, seen, name="Alexa", active=False):
    return {"id": animal_id, "name": name, "external_id": external_id, "original_image_url": image, "last_seen_at": datetime(2026, *seen), "active": active}


@pytest.mark.unit
class TestPlanRekeys:
    def test_the_most_recently_seen_duplicate_takes_the_new_id(self):
        rows = [
            _row(4534, "rean-romania-alexa-8e6662", "https:" + ALEXA_PHOTO, (1, 3)),
            _row(4773, "rean-romania-alexa-793671", ALEXA_PHOTO, (3, 29)),
        ]

        [rekey] = plan_rekeys(rows)

        assert rekey.animal_id == 4773
        assert rekey.new_id == rean_external_id("Alexa", "romania", ALEXA_PHOTO, None, None, None)

    def test_rows_without_a_photo_keep_their_id(self):
        assert plan_rekeys([_row(54, "rean-uk_foster-lois-232ac5", None, (3, 29), name="Lois")]) == []

    def test_keeps_the_page_type_from_the_old_id(self):
        [rekey] = plan_rekeys([_row(4541, "rean-uk_foster-freddie-67d36a", "//img1.wsimg.com/isteam/ip/a/Freddy1.jpg", (9, 20), name="Freddie", active=True)])

        assert rekey.new_id.startswith("rean-uk_foster-freddie-")

    def test_already_keyed_rows_are_left_alone(self):
        new_id = rean_external_id("Alexa", "romania", ALEXA_PHOTO, None, None, None)

        assert plan_rekeys([_row(1, new_id, ALEXA_PHOTO, (9, 1))]) == []
