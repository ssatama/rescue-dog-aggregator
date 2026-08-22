"""QueryBuilder is the SQL construction surface, so it is the injection surface.

Nothing covered this module. It builds SQL by string concatenation, which is
correct only as long as every caller-supplied *value* goes through a
placeholder and every caller-supplied *identifier* is trusted. These tests pin
which is which, because the distinction is invisible at the call site.
"""

from unittest.mock import Mock

import pytest

from api.database.query_builder import BatchQueryExecutor, QueryBuilder, create_batch_executor, create_query_builder


@pytest.mark.unit
class TestValuesNeverReachTheSQLText:
    """A value must arrive as a parameter, never interpolated into the query."""

    def test_where_in_parameterises_every_value(self):
        hostile = "1); DROP TABLE animals; --"

        query, params = QueryBuilder().select("id").from_table("animals").where_in("id", [1, hostile]).build()

        assert "DROP TABLE" not in query
        assert query.endswith("WHERE id IN (%s,%s)")
        assert params == [1, hostile]

    def test_where_parameterises_its_values(self):
        hostile = "' OR '1'='1"

        query, params = QueryBuilder().select("id").from_table("animals").where("name = %s", hostile).build()

        assert hostile not in query
        assert params == [hostile]

    def test_placeholder_count_matches_the_value_count(self):
        """A mismatch here is what psycopg2 reports as a confusing type error."""
        query, params = QueryBuilder().select("id").from_table("animals").where_in("id", [1, 2, 3, 4, 5]).build()

        assert query.count("%s") == len(params) == 5


@pytest.mark.unit
class TestEmptyInputDoesNotProduceBrokenSQL:
    def test_where_in_with_no_values_matches_nothing(self):
        """`IN ()` is a syntax error; the guard must express 'no rows' instead."""
        query, params = QueryBuilder().select("id").from_table("animals").where_in("id", []).build()

        assert "IN ()" not in query
        assert "1 = 0" in query
        assert params == []

    def test_fetch_service_regions_short_circuits_on_no_organisations(self):
        cursor = Mock()

        assert BatchQueryExecutor(cursor).fetch_service_regions([]) == {}
        cursor.execute.assert_not_called()


@pytest.mark.unit
class TestParameterOrderFollowsClauseOrder:
    """Params are bound positionally, so their order must match the built SQL.

    `build()` emits WHERE before HAVING regardless of call order, while
    `_params` accumulates in call order. Declaring HAVING first therefore binds
    the values to the wrong placeholders - not an error, just wrong rows.
    """

    def test_where_then_having_binds_in_the_order_the_sql_reads(self):
        query, params = QueryBuilder().select("organization_id", "COUNT(*)").from_table("animals").where("status = %s", "available").group_by("organization_id").having("COUNT(*) > %s", 5).build()

        assert query.index("WHERE") < query.index("HAVING")
        assert params == ["available", 5]

    def test_having_declared_before_where_still_binds_correctly(self):
        query, params = QueryBuilder().select("organization_id", "COUNT(*)").from_table("animals").having("COUNT(*) > %s", 5).group_by("organization_id").where("status = %s", "available").build()

        assert query.index("WHERE") < query.index("HAVING")
        assert params == ["available", 5], "params are bound positionally; WHERE's value must come first"


@pytest.mark.unit
class TestBuildRefusesIncompleteQueries:
    def test_select_is_required(self):
        with pytest.raises(ValueError, match="SELECT"):
            QueryBuilder().from_table("animals").build()

    def test_from_table_is_required(self):
        with pytest.raises(ValueError, match="FROM"):
            QueryBuilder().select("id").build()


@pytest.mark.unit
class TestFetchServiceRegionsGroupsItsRows:
    def test_groups_regions_under_their_organisation(self):
        cursor = Mock()
        cursor.fetchall.return_value = [
            {"organization_id": 1, "country": "DE", "region": "Bavaria"},
            {"organization_id": 1, "country": "DE", "region": "Hesse"},
            {"organization_id": 2, "country": "BG", "region": "Sofia"},
        ]

        result = BatchQueryExecutor(cursor).fetch_service_regions([1, 2])

        assert result == {
            1: [{"country": "DE", "region": "Bavaria"}, {"country": "DE", "region": "Hesse"}],
            2: [{"country": "BG", "region": "Sofia"}],
        }

    def test_an_organisation_with_no_regions_is_absent_rather_than_empty(self):
        cursor = Mock()
        cursor.fetchall.return_value = [{"organization_id": 1, "country": "DE", "region": "Bavaria"}]

        result = BatchQueryExecutor(cursor).fetch_service_regions([1, 2])

        assert 2 not in result

    def test_it_asks_for_one_query_not_one_per_organisation(self):
        """The whole point of the class is N+1 prevention."""
        cursor = Mock()
        cursor.fetchall.return_value = []

        BatchQueryExecutor(cursor).fetch_service_regions([1, 2, 3, 4, 5])

        assert cursor.execute.call_count == 1
        sql, params = cursor.execute.call_args[0]
        assert params == [1, 2, 3, 4, 5]


@pytest.mark.unit
class TestFactories:
    def test_factories_return_usable_objects(self):
        cursor = Mock()

        assert isinstance(create_query_builder(), QueryBuilder)
        assert isinstance(create_batch_executor(cursor), BatchQueryExecutor)
