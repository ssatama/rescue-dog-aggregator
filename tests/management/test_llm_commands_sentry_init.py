"""The profiling CLI must initialise Sentry before it drops any dogs.

`_alert_dog_dropped` reports every dog the profiler gives up on, but
`sentry_sdk.capture_*` is a no-op until a DSN is configured, and
`init_scraper_sentry` was called only from the cron entrypoint. The scraper
enriches nothing but newly created animals, so a dog whose profiling failed is
only ever retried by `generate-profiles` - exactly the path where the alerting
was silent.
"""

from unittest.mock import patch

import pytest
from click.testing import CliRunner

from management.llm_commands import llm


@pytest.mark.unit
class TestProfilingCommandsReportToSentry:
    def test_generate_profiles_initialises_sentry(self):
        with patch("management.llm_commands.init_scraper_sentry") as init:
            with patch("management.llm_commands.psycopg2.connect", side_effect=RuntimeError("stop here")):
                CliRunner().invoke(llm, ["generate-profiles"])

        init.assert_called_once()

    def test_it_runs_before_the_database_is_touched(self):
        """A failure connecting to the database is itself worth reporting."""
        calls = []

        with patch("management.llm_commands.init_scraper_sentry", side_effect=lambda **_: calls.append("sentry")):
            with patch("management.llm_commands.psycopg2.connect", side_effect=lambda **_: calls.append("db") or RuntimeError("stop")):
                CliRunner().invoke(llm, ["generate-profiles"])

        assert calls[0] == "sentry"
