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


@pytest.mark.database
class TestAnimalServiceBreedGroupFilter:
    def test_filter_by_herding_breed_group(self, client):
        response = client.get("/api/animals/?breed_group=Herding&limit=100")
        assert response.status_code == 200
        animals = response.json()
        names = sorted(a["name"] for a in animals)
        assert names == ["Border Collie", "German Shepherd"]


@pytest.mark.database
class TestAnimalServiceAgeFilter:
    def test_filter_adult_age_category(self, client):
        response = client.get("/api/animals/?age_category=Adult&limit=100")
        assert response.status_code == 200
        animals = response.json()
        ids = sorted(a["id"] for a in animals)
        # 9008 is exactly 96 months. The bucket boundary is Senior at 96, so it
        # is Senior only; containment semantics previously put it in both.
        assert ids == [9003, 9005, 9007, 9009, 9011, 9012]

    def test_ninety_six_months_is_senior(self, client):
        response = client.get("/api/animals/?age_category=Senior&limit=100")
        assert response.status_code == 200
        ids = sorted(a["id"] for a in response.json())
        assert 9008 in ids

    def test_every_dog_reaches_at_least_one_age_category(self, client):
        """The defect this fix addresses: 28% of available dogs matched no
        category at all, either because their estimated range straddled a
        boundary or because they had no recorded age."""
        all_ids = {a["id"] for a in client.get("/api/animals/?limit=1000").json()}

        reachable: set[int] = set()
        for category in ("Puppy", "Young", "Adult", "Senior", "Unknown"):
            response = client.get(f"/api/animals/?age_category={category}&limit=1000")
            assert response.status_code == 200
            reachable.update(a["id"] for a in response.json())

        assert all_ids - reachable == set()

    def test_unknown_category_is_accepted(self, client):
        response = client.get("/api/animals/?age_category=Unknown&limit=100")
        assert response.status_code == 200

    def test_unknown_age_dogs_stay_out_of_the_real_buckets(self, client):
        """Buckets stay honest: a missing age is not evidence of puppyhood."""
        unknown_ids = {a["id"] for a in client.get("/api/animals/?age_category=Unknown&limit=1000").json()}

        for category in ("Puppy", "Young", "Adult", "Senior"):
            bucket_ids = {a["id"] for a in client.get(f"/api/animals/?age_category={category}&limit=1000").json()}
            assert unknown_ids & bucket_ids == set(), f"unknown-age dog leaked into {category}"
