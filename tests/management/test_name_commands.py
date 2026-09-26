"""Planning the stored-name backfill (#505)."""

import pytest

from management.name_commands import plan_renames


def record(id, name, breed="Mixed Breed", properties=None):
    return {"id": id, "name": name, "breed": breed, "slug": f"dog-{id}", "properties": properties, "organization": "org"}


@pytest.mark.unit
class TestPlanRenames:
    def test_cleans_labels_and_keeps_the_original(self):
        [rename] = plan_renames([record(1, "Ally OVERLOOKED", properties={"location": "Wales"})])

        assert rename.name == "Ally"
        assert rename.slug == "dog-1"
        # Only the new keys: the UPDATE merges them, so "location" isn't rewritten.
        assert rename.added_properties == {"raw_name": "Ally OVERLOOKED", "overlooked": True}

    def test_clean_names_are_left_out(self):
        assert plan_renames([record(1, "Ally"), record(2, "Long John Silver", "Greyhound")]) == []

    def test_a_second_run_changes_nothing(self):
        """The scraper may already have cleaned the name and set the flag."""
        done = record(1, "Ally", properties={"raw_name": "Ally OVERLOOKED", "overlooked": True})

        assert plan_renames([done]) == []

    def test_appended_breed_word(self):
        [rename] = plan_renames([record(1, "Lola Lab", "Labrador Retriever Cross")])

        assert (rename.was, rename.name) == ("Lola Lab", "Lola")

    def test_keeps_an_existing_raw_name(self):
        [rename] = plan_renames([record(1, "Ally OVERLOOKED", properties={"raw_name": "ALLY - OVERLOOKED"})])

        assert rename.added_properties == {"overlooked": True}
