"""The pets-in-turkey-listing-url (#564) and galgos-status-unknown (#566) backfill steps."""

import pytest

from management.backfill_steps import PETS_IN_TURKEY_LISTING, STEPS, Change, plan_step
from scrapers.pets_in_turkey.petsinturkey_scraper import PetsInTurkeyScraper


def _record(id, adoption_url):
    return {"id": id, "adoption_url": adoption_url, "organization": "pets-in-turkey"}


@pytest.mark.unit
class TestPetsInTurkeyListingUrl:
    def test_the_made_up_anchor_becomes_the_listing(self):
        records = [_record(1, "https://www.petsinturkey.org/adoption#aliza")]

        assert plan_step(STEPS["pets-in-turkey-listing-url"], records) == [Change(1, "pets-in-turkey", "adoption_url", "https://www.petsinturkey.org/adoption#aliza", PETS_IN_TURKEY_LISTING)]

    def test_is_idempotent(self):
        assert plan_step(STEPS["pets-in-turkey-listing-url"], [_record(1, PETS_IN_TURKEY_LISTING)]) == []

    def test_is_the_url_the_scraper_stores(self):
        assert PetsInTurkeyScraper().listing_url == PETS_IN_TURKEY_LISTING


@pytest.mark.unit
class TestGalgosStatusUnknown:
    def test_an_available_row_of_the_disabled_org_becomes_unknown(self):
        records = [{"id": 7, "status": "available", "organization": "galgosdelsol"}]

        assert plan_step(STEPS["galgos-status-unknown"], records) == [Change(7, "galgosdelsol", "status", "available", "unknown")]

    def test_is_idempotent(self):
        assert plan_step(STEPS["galgos-status-unknown"], [{"id": 7, "status": "unknown", "organization": "galgosdelsol"}]) == []
