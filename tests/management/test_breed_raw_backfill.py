"""The restore-breed-raw backfill step (#560)."""

from decimal import Decimal

import pytest

from management.backfill_steps import STEPS, Change, plan_step
from management.breed_raw_backfill import plan_breed_raw
from management.breed_restandardize import resolved_fields
from utils.unified_standardization import UnifiedStandardizer


def _record(id, source, breed_raw, organization="dogstrust", **stored):
    """A stored dog whose derived columns match what breed_raw resolves to, unless overridden."""
    return {"id": id, "source_breed": source, "breed_raw": breed_raw, "organization": organization, **resolved_fields(breed_raw), **stored}


@pytest.mark.unit
class TestRestoreBreedRaw:
    def test_is_registered(self):
        assert "restore-breed-raw" in STEPS

    def test_restores_the_rescues_text_and_changes_only_what_resolves_differently(self):
        changes = plan_step(STEPS["restore-breed-raw"], [_record(1, "Poodle (Toy)", "Toy Poodle")])

        # Same breed; the rescue's wording resolves with a little less confidence
        assert changes == [
            Change(1, "dogstrust", "breed_raw", "Toy Poodle", "Poodle (Toy)"),
            Change(1, "dogstrust", "breed_confidence", 0.95, 0.9),
        ]

    def test_re_resolves_derived_columns_from_the_restored_text(self):
        changes = plan_breed_raw([_record(2, "Mixed (Dachshund shape)", "Hound", "santerpawsbulgarianrescue")])

        columns = {column: now for _, _, column, _, now in changes}
        assert columns["breed_raw"] == "Mixed (Dachshund shape)"
        assert columns["standardized_breed"] == "Dachshund Cross"
        assert columns["breed_type"] == "crossbreed"

    def test_is_idempotent(self):
        """Planned from fresh rows, a step that already ran plans nothing."""
        assert plan_breed_raw([_record(1, "Poodle (Toy)", "Poodle (Toy)")]) == []

    def test_a_blank_source_is_left_alone(self):
        assert plan_breed_raw([_record(1, "  ", "Toy Poodle"), _record(2, None, "Toy Poodle")]) == []

    def test_a_confidence_read_as_decimal_is_not_a_change(self):
        record = _record(1, "Poodle (Toy)", "Toy Poodle")
        record["breed_confidence"] = Decimal("0.90")
        assert [column for _, _, column, _, _ in plan_breed_raw([record])] == ["breed_raw"]

    @pytest.mark.parametrize("text", ["Poodle (Toy)", "Collie (Border)", "Mix", "Pointer mix", "Mixed (Dachshund shape)", "Romanian Shepherd Cross Mix"])
    def test_resolves_what_a_fresh_scrape_writes(self, text):
        """The step and a forced re-scrape (#572) must leave a dog the same."""
        scraped = UnifiedStandardizer().apply_full_standardization(breed=text)
        planned = resolved_fields(text)

        assert planned["standardized_breed"] == scraped["standardized_breed"]
        assert planned["breed_slug"] == scraped["breed_slug"]
        assert planned["primary_breed"] == scraped["primary_breed"]
