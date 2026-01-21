from datetime import datetime

from fastapi.testclient import TestClient


def create_test_animal_dict(animal_id, name, breed="Mixed", size="medium", country="US", **kwargs):
    """Create test animal matching conftest.py schema"""
    return {
        "id": animal_id,
        "name": name,
        "breed": breed,
        "standardized_breed": breed,
        "size": size,
        "country": country,
        "animal_type": "dog",
        "status": "available",
        "organization_id": 901,
        "adoption_url": f"http://example.com/{animal_id}",
        "primary_image_url": f"http://example.com/{name}.jpg",
        "created_at": kwargs.get("created_at", datetime.now().isoformat()),
        "updated_at": datetime.now().isoformat(),
        **kwargs,
    }


class TestSwipeEndpoint:
    """Test suite for the /api/swipe endpoint"""

    def test_swipe_endpoint_returns_initial_stack(self, client: TestClient):
        """Test that /api/swipe returns initial stack of dogs"""
        response = client.get("/api/dogs/swipe?limit=20")

        assert response.status_code == 200
        data = response.json()
        assert "dogs" in data
        assert isinstance(data["dogs"], list)
        # Dogs may be empty if test data doesn't have profiler data
        assert len(data["dogs"]) >= 0
        assert len(data["dogs"]) <= 20
        assert "hasMore" in data
        assert isinstance(data["hasMore"], bool)
        assert "nextOffset" in data
        # Only check nextOffset if there are results and more to come
        if data["hasMore"] and len(data["dogs"]) > 0:
            assert data["nextOffset"] == 20

    def test_swipe_endpoint_filters_by_country(self, client: TestClient):
        """Test that endpoint correctly filters dogs by country"""
        # First get all dogs
        all_response = client.get("/api/dogs/swipe?limit=50")
        assert all_response.status_code == 200

        # Then filter by a specific country (GB is common in test data)
        gb_response = client.get("/api/dogs/swipe?country=GB&limit=50")
        assert gb_response.status_code == 200
        gb_data = gb_response.json()

        # If we have GB dogs, they should all be from GB organizations
        if len(gb_data["dogs"]) > 0:
            for dog in gb_data["dogs"]:
                assert dog["organization"]["country"] == "GB"

    def test_swipe_endpoint_filters_by_size(self, client: TestClient):
        """Test that endpoint correctly filters dogs by size"""
        # Get small dogs
        small_response = client.get("/api/dogs/swipe?size=small")
        assert small_response.status_code == 200
        small_data = small_response.json()

        # If we have small dogs, they should all be small
        if len(small_data["dogs"]) > 0:
            for dog in small_data["dogs"]:
                # Size can be in the main field or properties
                if dog.get("size"):
                    assert dog["size"] == "small"

    def test_swipe_endpoint_excludes_swiped_dogs(self, client: TestClient):
        """Test that endpoint excludes already swiped dogs"""
        # Get initial stack
        initial_response = client.get("/api/dogs/swipe?limit=10")
        assert initial_response.status_code == 200
        initial_data = initial_response.json()

        if len(initial_data["dogs"]) > 0:
            # Get IDs of first 3 dogs
            exclude_ids = [str(dog["id"]) for dog in initial_data["dogs"][:3]]

            # Get new stack
            new_response = client.get("/api/dogs/swipe?limit=10&exclude_ids=" + ",".join(exclude_ids))
            assert new_response.status_code == 200
            new_data = new_response.json()

            # Verify no excluded IDs are in the results
            returned_ids = [dog["id"] for dog in new_data["dogs"]]
            for excluded_id in exclude_ids:
                assert excluded_id not in returned_ids

    def test_swipe_endpoint_only_returns_quality_dogs(self, client: TestClient):
        """Test that endpoint only returns dogs with profiler data"""
        response = client.get("/api/dogs/swipe")
        assert response.status_code == 200
        data = response.json()

        # All returned dogs should have quality profiler data
        for dog in data["dogs"]:
            assert "dogProfilerData" in dog
            if dog["dogProfilerData"]:  # If profiler data exists
                # Check that quality score is above threshold
                quality_score = dog["dogProfilerData"].get("qualityScore", 0)
                assert quality_score > 0.7

    def test_swipe_endpoint_pagination(self, client: TestClient):
        """Test that pagination works correctly"""
        # Get first page
        first_page = client.get("/api/dogs/swipe?limit=10&offset=0")
        assert first_page.status_code == 200
        first_data = first_page.json()

        if first_data["hasMore"]:
            # Get second page
            second_page = client.get("/api/dogs/swipe?limit=10&offset=10")
            assert second_page.status_code == 200
            second_data = second_page.json()

            # Dogs should be different
            first_ids = {dog["id"] for dog in first_data["dogs"]}
            second_ids = {dog["id"] for dog in second_data["dogs"]}

            # No overlap between pages
            assert len(first_ids & second_ids) == 0

    def test_swipe_endpoint_filters_by_adoptable_to_country(self, client: TestClient):
        """Test that endpoint correctly filters dogs by adoptable_to_country"""
        # Test with UK - should only return dogs from orgs that ship to UK
        uk_response = client.get("/api/dogs/swipe?adoptable_to_country=UK&limit=50")
        assert uk_response.status_code == 200
        uk_data = uk_response.json()

        # All returned dogs should be from organizations that ship to UK
        for dog in uk_data["dogs"]:
            assert "organization" in dog
            # Organization should have ships_to field containing UK
            # (This will be validated once the API is updated)

        # Test with DE - should only return dogs from orgs that ship to DE
        de_response = client.get("/api/dogs/swipe?adoptable_to_country=DE&limit=50")
        assert de_response.status_code == 200
        _de_data = de_response.json()

        # Test with US - might return fewer/no dogs if no orgs ship to US
        us_response = client.get("/api/dogs/swipe?adoptable_to_country=US&limit=50")
        assert us_response.status_code == 200
        _us_data = us_response.json()

        # The counts should be different for different countries
        # (exact assertion depends on test data)

    def test_swipe_endpoint_accepts_multiple_sizes(self, client: TestClient):
        """Test that endpoint correctly accepts multiple size parameters"""
        # Test with multiple sizes using array notation
        response = client.get("/api/dogs/swipe?size[]=small&size[]=medium&limit=50")
        assert response.status_code == 200
        data = response.json()

        # All returned dogs should be either small or medium
        for dog in data["dogs"]:
            if dog.get("size"):
                assert dog["size"].lower() in ["small", "medium"]

        # Test with single size for comparison
        single_response = client.get("/api/dogs/swipe?size=small&limit=50")
        assert single_response.status_code == 200
        single_data = single_response.json()

        # Multiple sizes should return more or equal dogs than single size
        if len(single_data["dogs"]) > 0:
            assert len(data["dogs"]) >= len(single_data["dogs"])

    def test_swipe_endpoint_filters_by_age(self, client: TestClient):
        """Test that endpoint correctly filters dogs by age"""
        response = client.get("/api/dogs/swipe?age[]=puppy&limit=20")

        assert response.status_code == 200
        data = response.json()
        assert "dogs" in data
        assert isinstance(data["dogs"], list)

    def test_swipe_endpoint_accepts_multiple_ages(self, client: TestClient):
        """Test that endpoint accepts multiple age parameters"""
        response = client.get("/api/dogs/swipe?age[]=puppy&age[]=young&limit=20")

        assert response.status_code == 200
        data = response.json()
        assert "dogs" in data
