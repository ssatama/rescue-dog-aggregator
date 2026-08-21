"""Read values out of executed SQL by column name rather than by position.

Indexing into an INSERT's parameter tuple by position breaks silently when a
column is added upstream: every later index shifts by one, and the assertion
either compares against whatever value slid into that slot or fails with a bare
``None`` that says nothing about the cause. Looking a column up by name fails
loudly, names the problem, and survives schema changes.
"""

import re
from typing import Any

_INSERT_COLUMNS = re.compile(r"INSERT\s+INTO\s+\w+\s*\((?P<columns>[^)]*)\)", re.IGNORECASE)


def insert_column_value(execute_call: Any, column: str) -> Any:
    """Return the parameter an INSERT bound to ``column``.

    Args:
        execute_call: A single entry from ``mock_cursor.execute.call_args_list``.
        column: Column name as written in the INSERT's column list.

    Raises:
        AssertionError: If the call is not an INSERT, does not name ``column``,
            or binds fewer parameters than the column list declares.
    """
    sql, params = execute_call[0][0], execute_call[0][1]

    match = _INSERT_COLUMNS.search(sql)
    if match is None:
        raise AssertionError(f"Expected an INSERT statement, got: {sql.strip()[:120]}")

    columns = [name.strip() for name in match.group("columns").split(",")]
    if column not in columns:
        raise AssertionError(f"INSERT does not write {column!r}. Columns: {columns}")

    # Checked before indexing: a mismatch makes a late column raise but an
    # early one return a plausible wrong value - the silent rot this exists
    # to prevent.
    if len(columns) != len(params):
        raise AssertionError(f"INSERT declares {len(columns)} columns but bound {len(params)} parameters")

    return params[columns.index(column)]
