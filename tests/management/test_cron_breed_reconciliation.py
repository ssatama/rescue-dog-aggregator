"""The cron reports registry gaps after each batch.

The registry only stays correct if someone notices when organisations start
sending breed text it cannot place. Running the check by hand does not scale;
the scrape is the moment new text arrives.
"""

from unittest.mock import patch

import pytest

from management.breed_reconciliation import BreedRow
from management.railway_scraper_cron import report_breed_reconciliation


@pytest.mark.unit
class TestReportBreedReconciliation:
    def test_returns_the_unresolved_row_count(self):
        rows = [BreedRow("European", "European", "european", 2), BreedRow("Border Collie", "Border Collie", "border-collie", 40)]
        with patch("management.railway_scraper_cron.fetch_breed_rows", return_value=rows):
            assert report_breed_reconciliation()["unmatched_rows"] == 2

    def test_clean_data_reports_zero(self):
        rows = [BreedRow("Border Collie", "Border Collie", "border-collie", 40)]
        with patch("management.railway_scraper_cron.fetch_breed_rows", return_value=rows):
            assert report_breed_reconciliation()["unmatched_rows"] == 0

    def test_surfaces_the_worst_offenders_for_the_log(self):
        rows = [BreedRow("Tofu", "Tofu", "tofu", 3), BreedRow("European", "European", "european", 9)]
        with patch("management.railway_scraper_cron.fetch_breed_rows", return_value=rows):
            assert report_breed_reconciliation()["top_unmatched"][0] == ["European", 9]

    def test_a_database_failure_never_breaks_the_cron(self):
        """A reporting problem must not fail a scrape that otherwise succeeded."""
        with patch("management.railway_scraper_cron.fetch_breed_rows", side_effect=RuntimeError("db down")):
            assert report_breed_reconciliation() == {"error": "db down"}
