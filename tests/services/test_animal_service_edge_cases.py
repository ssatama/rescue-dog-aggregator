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
        assert len(animals) == 14
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
        # 9014 has no recorded age, so it appears under every age (#494).
        assert ids == [9003, 9005, 9007, 9009, 9011, 9012, 9014]

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
        for category in ("Puppy", "Young", "Adult", "Senior"):
            response = client.get(f"/api/animals/?age_category={category}&limit=1000")
            assert response.status_code == 200
            reachable.update(a["id"] for a in response.json())

        assert all_ids - reachable == set()

    def test_age_filter_counts_match_the_filter(self, client):
        """_get_age_counts had no coverage, and it is easy for the counts query
        and the filter query to drift apart. They are built from the same
        helper, so a count must equal the number of dogs the filter returns."""
        response = client.get("/api/animals/meta/filter_counts")
        assert response.status_code == 200

        counts = {opt["value"]: opt["count"] for opt in response.json()["age_options"]}
        assert "Unknown" not in counts

        for category, count in counts.items():
            filtered = client.get(f"/api/animals/?age_category={category}&limit=1000")
            assert filtered.status_code == 200
            assert len(filtered.json()) == count, f"{category}: count {count} != {len(filtered.json())} returned"

    def test_dogs_without_an_age_appear_under_every_age(self, client):
        """#494: no "Age Unknown" option; every age search includes them."""
        no_age = {a["id"] for a in client.get("/api/animals/?limit=1000").json() if a["age_min_months"] is None and a["age_max_months"] is None}
        assert no_age, "fixture has no dog without an age"

        for category in ("Puppy", "Young", "Adult", "Senior"):
            bucket_ids = {a["id"] for a in client.get(f"/api/animals/?age_category={category}&limit=1000").json()}
            assert no_age <= bucket_ids, f"dog without an age missing from {category}"

    def test_age_known_keeps_dogs_without_an_age_out(self, client):
        """Pages that promise an age (/dogs/puppies) ask for age_known."""
        ids = {a["id"] for a in client.get("/api/animals/?age_category=Adult&age_known=true&limit=100").json()}
        assert 9014 not in ids
        assert 9003 in ids

    def test_age_known_counts_match_the_strict_filter(self, client):
        counts = {opt["value"]: opt["count"] for opt in client.get("/api/animals/meta/filter_counts?age_known=true").json()["age_options"]}
        for category, count in counts.items():
            strict = client.get(f"/api/animals/?age_category={category}&age_known=true&limit=1000").json()
            assert len(strict) == count, category
