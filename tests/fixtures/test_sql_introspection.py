"""Tests for the INSERT column lookup helper.

The helper is load-bearing for slug assertions across two test modules. If it
ever returns a wrong value quietly, those assertions stop meaning anything -
which is the exact failure it was written to replace.
"""

import pytest

from tests.fixtures.sql_introspection import insert_column_value


def _call(sql: str, params: tuple):
    """Shape a value the way mock_cursor.execute.call_args_list entries look."""
    return ((sql, params),)


ANIMALS_SQL = """
    INSERT INTO animals (
        name, breed, breed_raw, slug
    ) VALUES (%s, %s, %s, %s)
    RETURNING id
"""


@pytest.mark.unit
class TestInsertColumnValue:
    def test_returns_the_value_bound_to_the_named_column(self):
        call = _call(ANIMALS_SQL, ("Bella", "Labrador Mix", "labrador mix", "bella-temp"))

        assert insert_column_value(call, "slug") == "bella-temp"
        assert insert_column_value(call, "name") == "Bella"

    def test_survives_a_column_inserted_before_the_one_looked_up(self):
        """The regression that made this helper necessary."""
        without = _call("INSERT INTO animals (name, slug) VALUES (%s, %s)", ("Bella", "bella-temp"))
        with_new = _call("INSERT INTO animals (name, breed_raw, slug) VALUES (%s, %s, %s)", ("Bella", "lab", "bella-temp"))

        assert insert_column_value(without, "slug") == insert_column_value(with_new, "slug")

    def test_raises_when_the_column_is_absent(self):
        call = _call("INSERT INTO animals (name, slug) VALUES (%s, %s)", ("Bella", "bella-temp"))

        with pytest.raises(AssertionError, match="does not write 'breed_raw'"):
            insert_column_value(call, "breed_raw")

    def test_raises_when_column_and_parameter_counts_disagree(self):
        """A short parameter tuple must never yield a plausible wrong value."""
        call = _call("INSERT INTO animals (name, breed_raw, slug) VALUES (%s, %s, %s)", ("Bella", "lab"))

        with pytest.raises(AssertionError, match="declares 3 columns but bound 2"):
            insert_column_value(call, "name")

    def test_raises_on_a_statement_that_is_not_an_insert(self):
        call = _call("UPDATE animals SET slug = %s WHERE id = %s", ("bella-1", 1))

        with pytest.raises(AssertionError, match="Expected an INSERT"):
            insert_column_value(call, "slug")
