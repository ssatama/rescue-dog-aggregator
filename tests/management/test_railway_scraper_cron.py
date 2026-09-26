"""The cron entrypoint: what production reads to decide if a scrape worked.

An import error in this module has taken production down before; #351 covers
that class. These cover the behaviour, in particular the summary Railway logs
and the exit code it derives, because a wrong "success" here is invisible - the
run just looks fine.
"""

from datetime import UTC, datetime, timedelta
from unittest.mock import Mock, patch

import pytest

from management import railway_scraper_cron as cron
from utils.secure_config_scraper_runner import BatchRunResult, ScraperRunResult

FIXED_START = datetime(2026, 8, 22, 15, 0, 0, tzinfo=UTC)


def batch(results: list[ScraperRunResult], success: bool = True) -> BatchRunResult:
    return BatchRunResult(
        success=success,
        total_orgs=len(results),
        successful=sum(1 for r in results if r.success),
        failed=sum(1 for r in results if not r.success),
        results=results,
    )


@pytest.fixture
def no_breed_report():
    """format_batch_summary reaches the database through this; pin it."""
    with patch.object(cron, "report_breed_reconciliation", return_value={"unmatched_rows": 0, "provisional_values": 0, "top_unmatched": []}):
        yield


@pytest.mark.unit
class TestFormatBatchSummary:
    def test_counts_only_dogs_from_scrapers_that_succeeded(self, no_breed_report):
        """A failed org's count is not trustworthy and must not inflate the total."""
        result = batch(
            [
                ScraperRunResult(config_id="a", success=True, animals_found=100),
                ScraperRunResult(config_id="b", success=False, animals_found=999, error="boom"),
            ]
        )

        assert cron.format_batch_summary(result, FIXED_START)["total_dogs_found"] == 100

    def test_a_successful_scraper_reporting_no_count_does_not_crash(self, no_breed_report):
        result = batch([ScraperRunResult(config_id="a", success=True, animals_found=None)])

        assert cron.format_batch_summary(result, FIXED_START)["total_dogs_found"] == 0

    def test_names_the_organisations_that_failed(self, no_breed_report):
        result = batch(
            [
                ScraperRunResult(config_id="dogstrust", success=False, error="timeout"),
                ScraperRunResult(config_id="rean", success=True, animals_found=5),
                ScraperRunResult(config_id="misisrescue", success=False, error="503"),
            ]
        )

        assert cron.format_batch_summary(result, FIXED_START)["failed_orgs"] == ["dogstrust", "misisrescue"]

    def test_one_failed_organisation_makes_the_whole_run_unsuccessful(self, no_breed_report):
        """This is the exit code Railway reads, so it must not round up."""
        result = batch([ScraperRunResult(config_id="a", success=True, animals_found=1), ScraperRunResult(config_id="b", success=False, error="x")])

        assert cron.format_batch_summary(result, FIXED_START)["overall_success"] is False

    def test_an_all_green_run_is_successful(self, no_breed_report):
        result = batch([ScraperRunResult(config_id="a", success=True, animals_found=1)])

        assert cron.format_batch_summary(result, FIXED_START)["overall_success"] is True

    def test_a_batch_that_failed_wholesale_is_not_rescued_by_zero_failed_orgs(self, no_breed_report):
        """success=False with an empty results list must not read as a clean run."""
        summary = cron.format_batch_summary(BatchRunResult(success=False, total_orgs=0, successful=0, failed=0, results=[], error="sync failed"), FIXED_START)

        assert summary["overall_success"] is False

    def test_reports_elapsed_time_from_the_start_it_was_given(self, no_breed_report):
        with patch.object(cron, "datetime", Mock(now=Mock(return_value=FIXED_START + timedelta(seconds=92.5)))):
            summary = cron.format_batch_summary(batch([ScraperRunResult(config_id="a", success=True)]), FIXED_START)

        assert summary["duration_seconds"] == 92.5


@pytest.mark.unit
class TestBreedReconciliationNeverFailsTheScrape:
    """A reporting problem must not turn a good scrape into a failed run."""

    def test_a_database_error_is_captured_rather_than_raised(self):
        with patch.object(cron, "fetch_breed_rows", side_effect=RuntimeError("connection refused")):
            assert cron.report_breed_reconciliation() == {"error": "connection refused"}

    def test_a_reconciler_error_is_captured_rather_than_raised(self):
        with patch.object(cron, "fetch_breed_rows", return_value=[]), patch.object(cron, "reconcile", side_effect=ValueError("bad row")):
            assert cron.report_breed_reconciliation() == {"error": "bad row"}

    def test_a_captured_error_does_not_make_the_batch_fail(self):
        with patch.object(cron, "report_breed_reconciliation", return_value={"error": "connection refused"}):
            summary = cron.format_batch_summary(batch([ScraperRunResult(config_id="a", success=True, animals_found=3)]), FIXED_START)

        assert summary["overall_success"] is True
        assert summary["breed_reconciliation"] == {"error": "connection refused"}

    def test_reports_only_the_worst_five_unmatched_strings(self):
        report = Mock(unmatched_rows=40, provisional=[], unmatched=[(f"breed{i}", 10 - i) for i in range(9)])

        with patch.object(cron, "fetch_breed_rows", return_value=[]), patch.object(cron, "reconcile", return_value=report):
            assert len(cron.report_breed_reconciliation()["top_unmatched"]) == 5


@pytest.mark.unit
class TestValidateEnvironment:
    def test_rejects_a_config_with_no_host(self):
        with patch.object(cron, "get_database_config", return_value={"host": "", "database": "rescue_dogs", "user": "u"}):
            assert cron.validate_environment() is False

    def test_rejects_a_config_with_no_database(self):
        with patch.object(cron, "get_database_config", return_value={"host": "db.internal", "database": "", "user": "u"}):
            assert cron.validate_environment() is False

    def test_accepts_a_complete_config(self):
        with patch.object(cron, "get_database_config", return_value={"host": "db.internal", "database": "rescue_dogs", "user": "u"}):
            assert cron.validate_environment() is True


@pytest.mark.unit
class TestSingleScraperResultMapping:
    def test_maps_every_field_the_json_output_promises(self):
        runner = Mock()
        runner.run_scraper.return_value = ScraperRunResult(config_id="rean", success=True, organization="REAN", animals_found=42, error=None)

        assert cron.run_single_scraper(runner, "rean") == {
            "config_id": "rean",
            "success": True,
            "organization": "REAN",
            "animals_found": 42,
            "error": None,
        }

    def test_syncs_the_config_before_scraping(self):
        """A stale config would scrape the wrong organisation."""
        runner = Mock()
        runner.run_scraper.return_value = ScraperRunResult(config_id="rean", success=True)

        cron.run_single_scraper(runner, "rean")

        runner.run_scraper.assert_called_once_with("rean", sync_first=True)


@pytest.mark.unit
class TestGracefulShutdown:
    def test_a_sigterm_sets_the_shutdown_flag(self):
        original = cron.shutdown_requested
        try:
            cron.shutdown_requested = False
            cron.handle_shutdown(15, None)
            assert cron.shutdown_requested is True
        finally:
            cron.shutdown_requested = original


@pytest.mark.unit
def test_info_logs_go_to_stdout_and_warnings_to_stderr(capsys):
    """Railway marks every stderr line as severity error, which buried the real errors (#428)."""
    test_logger = cron.logging.getLogger("cron-severity-test")
    test_logger.propagate = False
    test_logger.setLevel(cron.logging.INFO)
    for handler in cron._log_handlers():
        test_logger.addHandler(handler)

    test_logger.info("scraped 12 dogs")
    test_logger.warning("possible external_id mismatch")

    captured = capsys.readouterr()
    assert "scraped 12 dogs" in captured.out
    assert "scraped 12 dogs" not in captured.err
    assert "possible external_id mismatch" in captured.err
    assert "possible external_id mismatch" not in captured.out


def _child_that(code: str):
    """Replace the scraper child with a tiny Python program; {result} is the result file path."""
    import sys

    return lambda config_id, result_path: [sys.executable, "-c", code.replace("{result}", result_path).replace("{org}", config_id)]


@pytest.mark.unit
@pytest.mark.real_clock
class TestRunOrgIsolated:
    """One hung scraper must not hold the cron (#579)."""

    def test_a_hung_scraper_is_killed_and_its_log_closed(self):
        with (
            patch.object(cron, "_child_command", _child_that("import time; time.sleep(30)")),
            patch.object(cron, "close_timed_out_scrape_log") as close_log,
            patch.object(cron.sentry_sdk, "capture_message") as sentry,
        ):
            result = cron.run_org_isolated("misisrescue", timeout=1)

        assert result == ScraperRunResult(config_id="misisrescue", success=False, error="Timed out after 1s")
        assert close_log.call_args.args[0] == "misisrescue"
        assert "misisrescue timed out" in sentry.call_args.args[0]

    def test_a_scrape_that_finished_but_hangs_on_exit_still_counts(self):
        code = 'import json, time; json.dump({"config_id": "{org}", "success": True, "animals_found": 5}, open("{result}", "w")); time.sleep(30)'
        with patch.object(cron, "_child_command", _child_that(code)), patch.object(cron, "close_timed_out_scrape_log") as close_log:
            result = cron.run_org_isolated("rean", timeout=2)

        assert result == ScraperRunResult(config_id="rean", success=True, animals_found=5)
        close_log.assert_not_called()

    def test_the_result_the_child_writes_is_returned(self):
        code = 'import json; json.dump({"config_id": "{org}", "success": True, "organization": "REAN", "animals_found": 11, "error": None}, open("{result}", "w"))'
        with patch.object(cron, "_child_command", _child_that(code)):
            result = cron.run_org_isolated("rean", timeout=30)

        assert result == ScraperRunResult(config_id="rean", success=True, organization="REAN", animals_found=11)

    def test_a_child_that_dies_without_a_result_is_a_failure(self):
        with patch.object(cron, "_child_command", _child_that("import sys; sys.exit(3)")):
            result = cron.run_org_isolated("rean", timeout=30)

        assert not result.success
        assert "exited with code 3" in result.error

    def test_the_next_organization_still_runs_after_a_timeout(self):
        runner = Mock()
        runner.config_loader.get_enabled_orgs.return_value = [Mock(id="misisrescue"), Mock(id="rean")]
        hung = ScraperRunResult(config_id="misisrescue", success=False, error="Timed out after 1s")
        fine = ScraperRunResult(config_id="rean", success=True, animals_found=11)

        with patch.object(cron, "run_org_isolated", side_effect=[hung, fine]) as run_org:
            batch_result = cron.run_all_scrapers(runner)

        assert [call.args[0] for call in run_org.call_args_list] == ["misisrescue", "rean"]
        assert (batch_result.total_orgs, batch_result.successful, batch_result.failed) == (2, 1, 1)
