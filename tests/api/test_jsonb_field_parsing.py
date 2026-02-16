"""
Test JSONB field parsing: the parse_json_field utility and API serialization guarantees.

Validates that JSONB fields (properties, social_media, ships_to, service_regions)
are always returned as dicts/lists regardless of how they're stored in the database
(string, NULL, dict, or malformed JSON).
"""

import json

import pytest

from api.utils.json_parser import build_organization_object, parse_json_field, parse_organization_fields


class TestParseJsonField:
    """Unit tests for parse_json_field — the core JSONB parsing function."""

    def test_parses_json_string_to_dict(self):
        data = {"props": '{"key": "value"}'}
        parse_json_field(data, "props")
        assert data["props"] == {"key": "value"}

    def test_parses_json_string_to_list(self):
        data = {"tags": '["a", "b"]'}
        parse_json_field(data, "tags", default_value=[])
        assert data["tags"] == ["a", "b"]

    def test_null_becomes_empty_dict_by_default(self):
        data = {"props": None}
        parse_json_field(data, "props")
        assert data["props"] == {}

    def test_null_becomes_custom_default(self):
        data = {"tags": None}
        parse_json_field(data, "tags", default_value=[])
        assert data["tags"] == []

    def test_existing_dict_is_preserved(self):
        original = {"nested": True}
        data = {"props": original}
        parse_json_field(data, "props")
        assert data["props"] is original

    def test_existing_list_is_preserved(self):
        original = ["a", "b"]
        data = {"tags": original}
        parse_json_field(data, "tags", default_value=[])
        assert data["tags"] is original

    def test_malformed_json_string_becomes_default(self):
        data = {"props": "{not valid json"}
        parse_json_field(data, "props")
        assert data["props"] == {}

    def test_empty_string_becomes_default(self):
        data = {"props": ""}
        parse_json_field(data, "props")
        assert data["props"] == {}

    def test_missing_field_becomes_default(self):
        data = {}
        parse_json_field(data, "props")
        assert data["props"] == {}

    def test_empty_json_object_string(self):
        data = {"props": "{}"}
        parse_json_field(data, "props")
        assert data["props"] == {}

    def test_nested_json_string(self):
        nested = {"level1": {"level2": [1, 2, 3]}}
        data = {"props": json.dumps(nested)}
        parse_json_field(data, "props")
        assert data["props"] == nested


class TestParseOrganizationFields:
    """Unit tests for parse_organization_fields — social_media, ships_to, service_regions."""

    def test_parses_all_string_fields(self):
        row = {
            "org_social_media": '{"facebook": "https://fb.com/org"}',
            "org_ships_to": '["Germany", "Austria"]',
            "org_service_regions": '["Bavaria", "Tyrol"]',
        }
        result = parse_organization_fields(row)
        assert result["social_media"] == {"facebook": "https://fb.com/org"}
        assert result["ships_to"] == ["Germany", "Austria"]
        assert result["service_regions"] == ["Bavaria", "Tyrol"]

    def test_null_fields_become_empty_defaults(self):
        row = {"org_social_media": None, "org_ships_to": None, "org_service_regions": None}
        result = parse_organization_fields(row)
        assert result["social_media"] == {}
        assert result["ships_to"] == []
        assert result["service_regions"] == []

    def test_missing_fields_become_empty_defaults(self):
        result = parse_organization_fields({})
        assert result["social_media"] == {}
        assert result["ships_to"] == []
        assert result["service_regions"] == []

    def test_already_parsed_dicts_preserved(self):
        row = {
            "org_social_media": {"instagram": "https://ig.com/org"},
            "org_ships_to": ["Finland"],
            "org_service_regions": ["Uusimaa"],
        }
        result = parse_organization_fields(row)
        assert result["social_media"] == {"instagram": "https://ig.com/org"}
        assert result["ships_to"] == ["Finland"]
        assert result["service_regions"] == ["Uusimaa"]

    def test_malformed_json_falls_back_to_empty(self):
        row = {
            "org_social_media": "not json",
            "org_ships_to": "{bad",
            "org_service_regions": "[broken",
        }
        result = parse_organization_fields(row)
        assert result["social_media"] == {}
        assert result["ships_to"] == []
        assert result["service_regions"] == []


class TestBuildOrganizationObject:
    """Unit tests for build_organization_object — nested org from DB row."""

    def test_builds_complete_organization(self):
        row = {
            "organization_id": 1,
            "org_name": "Test Rescue",
            "org_slug": "test-rescue",
            "org_city": "Helsinki",
            "org_country": "Finland",
            "org_website_url": "https://test.com",
            "org_social_media": '{"facebook": "https://fb.com/test"}',
            "org_ships_to": '["Finland", "Sweden"]',
        }
        org = build_organization_object(row)
        assert org["id"] == 1
        assert org["name"] == "Test Rescue"
        assert org["social_media"] == {"facebook": "https://fb.com/test"}
        assert org["ships_to"] == ["Finland", "Sweden"]

    def test_returns_none_when_no_org_name(self):
        row = {"org_name": None, "organization_id": 1}
        assert build_organization_object(row) is None

    def test_returns_none_when_org_name_missing(self):
        assert build_organization_object({}) is None


@pytest.mark.slow
@pytest.mark.database
class TestJSONBFieldsInAPI:
    """Integration: verify JSONB fields are always dict/list in API responses, never strings."""

    def test_animal_properties_always_dict(self, client):
        response = client.get("/api/animals?limit=5")
        assert response.status_code == 200
        animals = response.json()
        assert len(animals) > 0

        for animal in animals:
            assert isinstance(animal["properties"], dict), f"Animal {animal['id']} properties is {type(animal['properties'])}, expected dict"

    def test_animal_organization_social_media_always_dict(self, client):
        response = client.get("/api/animals?limit=5")
        assert response.status_code == 200
        animals = response.json()

        for animal in animals:
            org = animal["organization"]
            assert isinstance(org["social_media"], dict), f"Animal {animal['id']} org social_media is {type(org['social_media'])}, expected dict"

    def test_organization_social_media_always_dict(self, client):
        response = client.get("/api/organizations")
        assert response.status_code == 200
        orgs = response.json()
        assert len(orgs) > 0

        for org in orgs:
            assert isinstance(org["social_media"], dict), f"Org {org['id']} social_media is {type(org['social_media'])}, expected dict"

    def test_test_org_social_media_has_expected_keys(self, client):
        """Verify the seeded test org has facebook and instagram in social_media."""
        response = client.get("/api/organizations")
        assert response.status_code == 200
        orgs = response.json()

        test_org = next((o for o in orgs if o["slug"] == "mock-test-org"), None)
        assert test_org is not None, "Test org 'mock-test-org' not found"
        assert "facebook" in test_org["social_media"]
        assert "instagram" in test_org["social_media"]
        assert test_org["social_media"]["facebook"].startswith("https://")

    def test_animal_response_has_required_fields(self, client):
        """Verify animals have the expected field structure."""
        response = client.get("/api/animals?limit=1")
        assert response.status_code == 200
        animals = response.json()
        assert len(animals) == 1

        animal = animals[0]
        required = ["id", "name", "animal_type", "properties", "organization", "breed", "sex", "status"]
        for field in required:
            assert field in animal, f"Missing required field: {field}"

        org = animal["organization"]
        org_required = ["id", "name", "slug", "social_media"]
        for field in org_required:
            assert field in org, f"Missing required org field: {field}"
