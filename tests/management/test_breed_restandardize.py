"""Re-resolving stored rows from the organisation's original text.

Scrapes cannot repair these rows: most organisations run with
skip_existing_animals, so an existing dog never reaches process_animal again.
Only new dogs get current standardization, which is why a backfill is needed
rather than optional.
"""

import pytest

from management.breed_restandardize import AnimalBreedRow, plan_restandardization


def _row(animal_id, raw, primary, slug, breed_type="purebred", group="Unknown", secondary=None):
    return AnimalBreedRow(
        id=animal_id,
        breed_raw=raw,
        breed=raw,
        primary_breed=primary,
        secondary_breed=secondary,
        breed_slug=slug,
        breed_type=breed_type,
        breed_group=group,
    )


@pytest.mark.unit
class TestPlanRestandardization:
    def test_row_already_correct_is_not_updated(self):
        rows = [_row(1, "Border Collie", "Border Collie", "border-collie", "purebred", "Herding")]
        assert plan_restandardization(rows) == []

    def test_cross_suffix_row_is_rewritten_to_its_root(self):
        rows = [_row(2, "Border Collie Cross", "Border Collie Cross", "border-collie-cross", "crossbreed", "Mixed")]
        plan = plan_restandardization(rows)
        assert len(plan) == 1
        assert plan[0].animal_id == 2
        assert plan[0].fields["primary_breed"] == "Border Collie"
        assert plan[0].fields["breed_slug"] == "border-collie"

    def test_designer_breed_regains_its_own_identity(self):
        rows = [_row(3, "Cockapoo", "Cocker Spaniel", "cocker-spaniel", "crossbreed", "Designer/Hybrid")]
        plan = plan_restandardization(rows)
        assert plan[0].fields["primary_breed"] == "Cockapoo"
        assert plan[0].fields["breed_slug"] == "cockapoo"

    def test_sighthound_becomes_a_real_breed_type(self):
        rows = [_row(4, "Lurcher", "Lurcher", "lurcher", "sighthound", "Hound")]
        plan = plan_restandardization(rows)
        assert plan[0].fields["breed_type"] == "purebred"

    def test_falls_back_to_breed_when_raw_is_missing(self):
        row = AnimalBreedRow(id=5, breed_raw=None, breed="Lurcher Cross", primary_breed="Lurcher Cross", secondary_breed=None, breed_slug="lurcher-cross", breed_type="sighthound", breed_group="Hound")
        plan = plan_restandardization([row])
        assert plan[0].fields["primary_breed"] == "Lurcher"

    def test_row_with_no_breed_text_is_skipped(self):
        row = AnimalBreedRow(id=6, breed_raw=None, breed=None, primary_breed="Unknown", secondary_breed=None, breed_slug="unknown", breed_type="unknown", breed_group="Unknown")
        assert plan_restandardization([row]) == []

    def test_plan_carries_every_derived_field(self):
        rows = [_row(7, "Terrier (Staffordshire Bull) Cross", "Staffordshire Bull Terrier Mix", "staffordshire-bull-terrier-mix", "crossbreed", "Mixed")]
        fields = plan_restandardization(rows)[0].fields
        assert set(fields) == {"primary_breed", "secondary_breed", "breed_slug", "breed_type", "breed_group", "standardized_breed", "breed_confidence"}
        assert fields["primary_breed"] == "Staffordshire Bull Terrier"
        assert fields["breed_group"] == "Terrier"
