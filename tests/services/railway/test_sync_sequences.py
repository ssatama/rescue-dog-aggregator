"""Tests for primary key sequence resets after Railway data sync.

Rows are synced to Railway with explicit IDs, which does not advance the
auto-increment sequence. Every synced table must have its sequence reset to
MAX(id) afterwards, or the next runtime insert collides with an existing id
(duplicate key on the pkey). See scrape_logs_pkey production incident.
"""

from unittest.mock import MagicMock

import pytest

from services.railway.sync import _reset_sequence


@pytest.mark.unit
@pytest.mark.parametrize("table", ["animals", "scrape_logs", "organizations", "service_regions"])
def test_reset_sequence_executes_setval_for_table(table):
    conn = MagicMock()

    _reset_sequence(conn, table)

    conn.execute.assert_called_once()
    executed_sql = str(conn.execute.call_args[0][0])
    assert "setval" in executed_sql
    assert f"pg_get_serial_sequence('{table}', 'id')" in executed_sql
    assert f"MAX(id) FROM {table}" in executed_sql


@pytest.mark.unit
def test_reset_sequence_swallows_errors(caplog):
    conn = MagicMock()
    conn.execute.side_effect = RuntimeError("connection lost")

    _reset_sequence(conn, "scrape_logs")

    assert "Failed to reset scrape_logs sequence" in caplog.text
