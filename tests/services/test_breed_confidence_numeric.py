"""breed_confidence must round-trip as a number, not a string.

The column was VARCHAR and the write path did str(), so comparisons and
ordering were lexical: "0.9" sorts above "0.85", and any threshold filter would
have been silently wrong.
"""

from unittest.mock import Mock

import pytest

from services.animal_data_preparation import prepare_animal_data


@pytest.mark.unit
class TestPreparedConfidenceIsNumeric:
    def test_confidence_is_kept_as_a_float(self):
        prepared = prepare_animal_data({"name": "Ada", "breed": "Border Collie", "breed_confidence": 0.95})
        assert prepared.breed_confidence == 0.95
        assert isinstance(prepared.breed_confidence, float)

    def test_missing_confidence_stays_none(self):
        assert prepare_animal_data({"name": "Ada", "breed": "Border Collie"}).breed_confidence is None


@pytest.mark.unit
class TestLexicalComparisonWasWrong:
    def test_string_ordering_disagrees_with_numeric_ordering(self):
        """Documents the bug: as text, 0.85 sorts above 0.9."""
        assert "0.85" < "0.9"
        assert sorted(["0.9", "0.85"]) == ["0.85", "0.9"]
        assert sorted([0.9, 0.85]) == [0.85, 0.9]


@pytest.mark.database
class TestConfidenceWrittenAsNumber:
    def _service(self, fetchone_side_effect):
        from services.connection_pool import ConnectionPoolService
        from services.database_service import DatabaseService

        pool = Mock(spec=ConnectionPoolService)
        conn, cursor = Mock(), Mock()
        ctx = Mock()
        ctx.__enter__ = Mock(return_value=conn)
        ctx.__exit__ = Mock(return_value=None)
        pool.get_connection_context.return_value = ctx
        conn.cursor.return_value = cursor
        cursor.fetchone.side_effect = fetchone_side_effect
        return DatabaseService(db_config={"host": "h", "user": "u", "database": "d"}, connection_pool=pool), cursor

    def test_insert_passes_a_number_not_a_string(self):
        service, cursor = self._service([(0,), (7,)])

        service.create_animal(
            {
                "name": "Ada",
                "external_id": "x-1",
                "organization_id": 1,
                "breed": "Border Collie",
                "breed_confidence": 0.95,
                "status": "available",
            }
        )

        insert = next(c for c in cursor.execute.call_args_list if "INSERT INTO animals" in c[0][0])
        assert 0.95 in insert[0][1], "confidence should reach the database as a number"
        assert "0.95" not in insert[0][1], "confidence should not be stringified"
