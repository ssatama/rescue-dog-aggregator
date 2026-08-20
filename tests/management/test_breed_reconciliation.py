"""Tests for breed reconciliation.

A green test suite once hid 148 production rows whose breed silently became
Unknown, because nothing compared the resolver against real organisation text.
This report is that missing feedback loop.
"""

import pytest

from management.breed_reconciliation import BreedRow, reconcile


@pytest.mark.unit
class TestUnmatchedDetection:
    def test_text_that_resolves_to_no_breed_is_reported(self):
        report = reconcile([BreedRow("Unlisted", "Unknown", "unknown", 4)])
        assert report.unmatched == [("Unlisted", 4)]

    def test_recognised_breed_is_not_reported_as_unmatched(self):
        report = reconcile([BreedRow("Border Collie", "Border Collie", "border-collie", 10)])
        assert report.unmatched == []

    def test_unmatched_are_ordered_by_row_count(self):
        report = reconcile([BreedRow("Tofu", "Tofu", "tofu", 1), BreedRow("Unlisted", "Unlisted", "unlisted", 9)])
        assert [text for text, _ in report.unmatched] == ["Unlisted", "Tofu"]

    def test_generic_mixed_breed_is_not_treated_as_unmatched(self):
        """ "Mixed Breed" is a real answer, not a failure to resolve."""
        report = reconcile([BreedRow("Mixed Breed", "Mixed Breed", "mixed-breed", 500)])
        assert report.unmatched == []


@pytest.mark.unit
class TestProvisionalDetection:
    def test_unregistered_clean_name_is_flagged_for_the_registry(self):
        report = reconcile([BreedRow("Korean Jindo", "Korean Jindo", "korean-jindo", 3)])
        assert report.provisional == [("Korean Jindo", "Korean Jindo", 3)]

    def test_registered_breed_is_not_flagged(self):
        report = reconcile([BreedRow("Newfoundland", "Newfoundland", "newfoundland", 2)])
        assert report.provisional == []


@pytest.mark.unit
class TestDriftDetection:
    def test_stored_value_behind_the_resolver_is_reported(self):
        """Rows awaiting a rescrape, or a genuine resolver regression."""
        report = reconcile([BreedRow("Border Collie Cross", "Border Collie Cross", "border-collie-cross", 14)])
        assert report.drift == [("Border Collie Cross", "Border Collie Cross", "Border Collie", 14)]

    def test_agreeing_row_is_not_drift(self):
        report = reconcile([BreedRow("Border Collie Cross", "Border Collie", "border-collie", 14)])
        assert report.drift == []

    def test_drift_counts_rows_not_distinct_values(self):
        report = reconcile(
            [
                BreedRow("Lurcher Cross", "Lurcher Cross", "lurcher-cross", 12),
                BreedRow("Poodle Mix", "Poodle Mix", "poodle-mix", 11),
            ]
        )
        assert report.drifted_rows == 23


@pytest.mark.unit
class TestTotals:
    def test_totals_count_rows(self):
        report = reconcile(
            [
                BreedRow("Border Collie", "Border Collie", "border-collie", 10),
                BreedRow("Tofu", "Tofu", "tofu", 2),
            ]
        )
        assert report.total_rows == 12
        assert report.unmatched_rows == 2
        assert report.resolved_rows == 10

    def test_empty_input_is_a_clean_report(self):
        report = reconcile([])
        assert report.total_rows == 0
        assert report.unmatched == []
        assert report.is_clean(unmatched_row_budget=0)


@pytest.mark.unit
class TestCleanliness:
    def test_report_is_dirty_when_unmatched_exceeds_the_budget(self):
        report = reconcile([BreedRow("Tofu", "Tofu", "tofu", 50)])
        assert not report.is_clean(unmatched_row_budget=10)

    def test_report_is_clean_within_the_budget(self):
        report = reconcile([BreedRow("Tofu", "Tofu", "tofu", 5)])
        assert report.is_clean(unmatched_row_budget=10)

    def test_drift_alone_does_not_make_a_report_dirty(self):
        """Drift clears itself on the next scrape; unmatched text does not."""
        report = reconcile([BreedRow("Poodle Mix", "Poodle Mix", "poodle-mix", 99)])
        assert report.is_clean(unmatched_row_budget=0)


@pytest.mark.unit
class TestKnownNonBreedsAreNotRegistryGaps:
    """ "Unknown" and friends are deliberate sentinels, not missing entries.

    Counting them as unmatched buries the two rows of genuinely unrecognised
    text under a hundred rows of organisations saying "we don't know".
    """

    @pytest.mark.parametrize("sentinel", ["Unknown", "Can be the only dog", "N/A", "TBC", "not specified"])
    def test_sentinel_is_not_reported_as_unmatched(self, sentinel):
        report = reconcile([BreedRow(sentinel, "Unknown", "unknown", 83)])
        assert report.unmatched == []
        assert report.unmatched_rows == 0

    def test_genuinely_unrecognised_text_is_still_reported(self):
        report = reconcile([BreedRow("European", "European", "european", 2)])
        assert report.unmatched == [("European", 2)]

    def test_sentinels_do_not_break_the_budget(self):
        rows = [BreedRow("Unknown", "Unknown", "unknown", 83), BreedRow("European", "European", "european", 2)]
        assert reconcile(rows).is_clean(unmatched_row_budget=10)
