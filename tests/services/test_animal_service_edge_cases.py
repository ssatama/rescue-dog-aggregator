import pytest

from api.utils.sql_utils import escape_like_pattern


class TestEscapeLikePattern:
    @pytest.mark.unit
    def test_escapes_percent(self):
        assert escape_like_pattern("100%") == "100\\%"

    @pytest.mark.unit
    def test_escapes_underscore(self):
        assert escape_like_pattern("some_name") == "some\\_name"

    @pytest.mark.unit
    def test_escapes_backslash(self):
        assert escape_like_pattern("path\\to") == "path\\\\to"

    @pytest.mark.unit
    def test_normal_string_unchanged(self):
        assert escape_like_pattern("Golden Retriever") == "Golden Retriever"

    @pytest.mark.unit
    def test_empty_string(self):
        assert escape_like_pattern("") == ""

    @pytest.mark.unit
    def test_multiple_special_chars(self):
        assert escape_like_pattern("50%_off\\deal") == "50\\%\\_off\\\\deal"


@pytest.mark.slow
@pytest.mark.database
class TestAnimalServiceSorting:
    def test_sort_by_name_asc(self, client):
        response = client.get("/api/animals/?sort=name-asc&limit=100")
        assert response.status_code == 200
        animals = response.json()
        names = [a["name"] for a in animals]
        assert names == sorted(names)

    def test_sort_by_name_desc(self, client):
        response = client.get("/api/animals/?sort=name-desc&limit=100")
        assert response.status_code == 200
        animals = response.json()
        names = [a["name"] for a in animals]
        assert names == sorted(names, reverse=True)

    def test_sort_by_newest_returns_newest_first(self, client):
        response = client.get("/api/animals/?sort=newest&limit=100")
        assert response.status_code == 200
        animals = response.json()
        assert len(animals) == 12
        created_dates = [a["created_at"] for a in animals]
        assert created_dates == sorted(created_dates, reverse=True)


@pytest.mark.slow
@pytest.mark.database
class TestAnimalServiceBreedGroupFilter:
    def test_filter_by_herding_breed_group(self, client):
        response = client.get("/api/animals/?breed_group=Herding&limit=100")
        assert response.status_code == 200
        animals = response.json()
        names = sorted(a["name"] for a in animals)
        assert names == ["Border Collie", "German Shepherd"]


@pytest.mark.slow
@pytest.mark.database
class TestAnimalServiceAgeFilter:
    def test_filter_adult_age_category(self, client):
        response = client.get("/api/animals/?age_category=Adult&limit=100")
        assert response.status_code == 200
        animals = response.json()
        ids = sorted(a["id"] for a in animals)
        assert ids == [9003, 9005, 9007, 9008, 9009, 9011, 9012]
