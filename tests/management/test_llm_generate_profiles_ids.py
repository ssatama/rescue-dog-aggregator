"""`generate-profiles --ids` names every id it could not select (#505).

The selection keeps status = 'available' and the LLM-enabled rescues, so a
named dog outside them used to be skipped without a word.
"""

from unittest.mock import MagicMock, patch

import pytest
from click.testing import CliRunner

from management.llm_commands import llm


@pytest.mark.unit
def test_ids_that_were_not_selected_are_reported():
    conn = MagicMock()
    conn.cursor.return_value.fetchall.return_value = []
    loader = MagicMock()
    loader.get_supported_organizations.return_value = [11]

    with (
        patch("management.llm_commands.init_scraper_sentry"),
        patch("management.llm_commands.psycopg2.connect", return_value=conn),
        patch("services.llm.organization_config_loader.get_config_loader", return_value=loader),
    ):
        result = CliRunner().invoke(llm, ["generate-profiles", "--ids", "7,5"])

    assert result.exit_code == 0, result.output
    assert "Skipped 2 of the --ids" in result.output
    assert "5, 7" in result.output
