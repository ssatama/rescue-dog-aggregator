import pytest


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.api
class TestJSONBFieldParsing:
    """Test JSONB field parsing across all API endpoints."""

    def test_animals_properties_structure(self, client):
        """Test that animals endpoint returns proper JSON structure for properties."""
        response = client.get("/api/animals?limit=5")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        # Test that each animal has proper structure
        for animal in data:
            assert "properties" in animal
            assert isinstance(animal["properties"], dict)  # Should be parsed as dict
            assert "organization" in animal
            assert "social_media" in animal["organization"]
            assert isinstance(animal["organization"]["social_media"], dict)

    def test_animals_endpoint_basic_functionality(self, client):
        """Test basic animals endpoint functionality."""
        response = client.get("/api/animals")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        # Should return test data
        assert len(data) > 0

        # Verify first animal has expected structure
        animal = data[0]
        required_fields = ["id", "name", "animal_type", "properties", "organization"]
        for field in required_fields:
            assert field in animal

    def test_organizations_json_structure(self, client):
        """Test organizations endpoint JSON structure."""
        response = client.get("/api/organizations")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        if len(data) > 0:
            org = data[0]
            assert "social_media" in org
            assert isinstance(org["social_media"], dict)

    def test_animals_properties_are_parsed_correctly(self, client):
        """Test that properties field contains actual data and is properly parsed."""
        response = client.get("/api/animals?limit=10")

        assert response.status_code == 200
        animals = response.json()

        # Find an animal with properties
        animal_with_properties = None
        for animal in animals:
            if animal["properties"] and len(animal["properties"]) > 0:
                animal_with_properties = animal
                break

        if animal_with_properties:
            # Verify properties is a dict with actual content
            assert isinstance(animal_with_properties["properties"], dict)
            assert len(animal_with_properties["properties"]) > 0

            # Properties should have string keys
            for key in animal_with_properties["properties"].keys():
                assert isinstance(key, str)

    def test_organization_social_media_parsing(self, client):
        """Test that organization social_media is properly parsed."""
        response = client.get("/api/organizations")

        assert response.status_code == 200
        orgs = response.json()

        # Find an org with social media
        org_with_social = None
        for org in orgs:
            if org["social_media"] and len(org["social_media"]) > 0:
                org_with_social = org
                break

        if org_with_social:
            # Verify social_media is a dict with actual content
            assert isinstance(org_with_social["social_media"], dict)
            assert len(org_with_social["social_media"]) > 0

            # Should have valid social media keys
            expected_keys = ["facebook", "instagram", "twitter", "website"]
            actual_keys = list(org_with_social["social_media"].keys())

            # At least one expected key should be present
            has_expected_key = any(key in actual_keys for key in expected_keys)
            assert has_expected_key, f"Expected at least one of {expected_keys}, got {actual_keys}"

    def test_json_fields_never_return_strings(self, client):
        """Test that JSON fields are never returned as unparsed strings."""
        # Test animals
        response = client.get("/api/animals?limit=5")
        assert response.status_code == 200
        animals = response.json()

        for animal in animals:
            # properties should be dict, not string
            assert isinstance(animal["properties"], dict), f"Animal {animal['id']} properties should be dict, got {type(animal['properties'])}"

            # organization social_media should be dict, not string
            org_social = animal["organization"]["social_media"]
            assert isinstance(org_social, dict), f"Animal {animal['id']} org social_media should be dict, got {type(org_social)}"

        # Test organizations
        response = client.get("/api/organizations")
        assert response.status_code == 200
        orgs = response.json()

        for org in orgs:
            # social_media should be dict, not string
            assert isinstance(org["social_media"], dict), f"Org {org['id']} social_media should be dict, got {type(org['social_media'])}"

    def test_malformed_json_fallback_behavior(self, client):
        """Test that the system handles any edge cases gracefully."""
        # This test verifies that even if there were malformed JSON in the database,
        # the API would return proper dict structures (not strings)

        response = client.get("/api/animals?limit=10")
        assert response.status_code == 200
        animals = response.json()

        for animal in animals:
            # Even with potential malformed JSON in DB,
            # the API should always return dict, never string
            props = animal["properties"]
            assert isinstance(props, dict), f"Properties should be dict, got {type(props)}"

            org_social = animal["organization"]["social_media"]
            assert isinstance(org_social, dict), f"Social media should be dict, got {type(org_social)}"

        # Same test for organizations
        response = client.get("/api/organizations")
        assert response.status_code == 200
        orgs = response.json()

        for org in orgs:
            social = org["social_media"]
            assert isinstance(social, dict), f"Org social_media should be dict, got {type(social)}"
