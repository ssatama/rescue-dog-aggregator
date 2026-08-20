"""Breed group listings must read the breed_group column, not properties JSON.

Both queries filtered on properties->>'breed_group', which is populated on
zero rows in production. get_distinct_breed_groups silently served a
hardcoded list, and get_distinct_breeds returned [] for every group.
"""

from unittest.mock import MagicMock

import pytest

from api.services.animal_service import AnimalService


def _service_with_rows(rows):
    cursor = MagicMock()
    cursor.fetchall.return_value = rows
    return AnimalService(cursor), cursor


@pytest.mark.unit
class TestBreedGroupQueriesUseColumn:
    def test_distinct_breed_groups_queries_the_column(self):
        service, cursor = _service_with_rows([{"breed_group": "Hound"}, {"breed_group": "Guardian"}])

        result = service.get_distinct_breed_groups()

        sql = cursor.execute.call_args[0][0]
        assert "properties" not in sql, "still reading the empty JSON field"
        assert "breed_group" in sql
        assert result == ["Hound", "Guardian"]

    def test_distinct_breed_groups_returns_real_data_not_a_hardcoded_list(self):
        """Guardian and Designer exist in production but were never returned."""
        service, _ = _service_with_rows([{"breed_group": "Guardian"}])

        assert service.get_distinct_breed_groups() == ["Guardian"]

    def test_distinct_breeds_filters_by_group_column(self):
        service, cursor = _service_with_rows([{"standardized_breed": "Greyhound"}])

        result = service.get_distinct_breeds(breed_group="Hound")

        sql, params = cursor.execute.call_args[0]
        assert "properties->>'breed_group'" not in sql
        assert "Hound" in params
        assert result == ["Greyhound"]

    def test_distinct_breeds_ignores_any_group_sentinel(self):
        service, cursor = _service_with_rows([{"standardized_breed": "Greyhound"}])

        service.get_distinct_breeds(breed_group="Any group")

        assert "Any group" not in (cursor.execute.call_args[0][1] or [])
