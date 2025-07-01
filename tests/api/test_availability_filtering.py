"""
Test API filtering by availability status and confidence.
"""

import pytest
from fastapi.testclient import TestClient

from api.main import app


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.api
class TestAvailabilityFiltering:
    """Test API endpoints filter animals by availability status and confidence."""

    @pytest.fixture
    def client(self):
        """Create test client."""
        return TestClient(app)

    def test_default_filters_show_only_available_animals(self, client):
        """Test that API only shows available animals by default."""
        response = client.get("/api/animals")

        assert response.status_code == 200
        animals = response.json()

        # All returned animals should have status = 'available'
        for animal in animals:
            assert animal["status"] == "available"

    def test_can_explicitly_request_unavailable_animals(self, client):
        """Test that unavailable animals can be explicitly requested."""
        response = client.get("/api/animals?status=unavailable")

        assert response.status_code == 200
        animals = response.json()

        # All returned animals should have status = 'unavailable'
        for animal in animals:
            assert animal["status"] == "unavailable"

    def test_can_request_all_statuses(self, client):
        """Test that all animals can be requested regardless of status."""
        response = client.get("/api/animals?status=all")

        assert response.status_code == 200
        animals = response.json()

        # Should return animals with any status
        statuses = set(animal["status"] for animal in animals)
        # We might have both available and unavailable animals
        assert len(statuses) >= 1

    def test_default_filters_high_and_medium_confidence(self, client):
        """Test that API only shows high and medium confidence animals by default."""
        response = client.get("/api/animals")

        assert response.status_code == 200
        animals = response.json()

        # All returned animals should have high or medium confidence
        for animal in animals:
            assert animal["availability_confidence"] in ["high", "medium"]

    def test_can_explicitly_request_low_confidence_animals(self, client):
        """Test that low confidence animals can be explicitly requested."""
        response = client.get("/api/animals?availability_confidence=low")

        assert response.status_code == 200
        animals = response.json()

        # All returned animals should have low confidence
        for animal in animals:
            assert animal["availability_confidence"] == "low"

    def test_can_request_all_confidence_levels(self, client):
        """Test that all confidence levels can be requested."""
        response = client.get("/api/animals?availability_confidence=all")

        assert response.status_code == 200
        animals = response.json()

        # Should return animals with any confidence level
        confidence_levels = set(animal["availability_confidence"] for animal in animals)
        assert len(confidence_levels) >= 1

    def test_combined_availability_and_confidence_filtering(self, client):
        """Test combining status and confidence filters."""
        response = client.get("/api/animals?status=available&availability_confidence=high")

        assert response.status_code == 200
        animals = response.json()

        # All animals should be available with high confidence
        for animal in animals:
            assert animal["status"] == "available"
            assert animal["availability_confidence"] == "high"

    def test_individual_animal_endpoint_respects_availability(self, client):
        """Test that individual animal endpoint includes availability info."""
        # First get list of animals to get an ID
        response = client.get("/api/animals?limit=1")
        assert response.status_code == 200
        animals = response.json()

        if animals:
            animal_id = animals[0]["id"]

            # Get individual animal
            response = client.get(f"/api/animals/{animal_id}")
            assert response.status_code == 200

            animal = response.json()
            assert "status" in animal
            assert "availability_confidence" in animal
            assert animal["status"] in ["available", "unavailable"]
            assert animal["availability_confidence"] in ["high", "medium", "low"]

    def test_organization_filtering_via_main_endpoint(self, client):
        """Test that organization filtering works via main animals endpoint."""
        # Get organizations first
        org_response = client.get("/api/organizations")
        assert org_response.status_code == 200
        organizations = org_response.json()

        if organizations:
            org_id = organizations[0]["id"]

            # Test filtering animals by organization
            response = client.get(f"/api/animals?organization_id={org_id}")
            assert response.status_code == 200
            animals = response.json()

            # All returned animals should be from the specified organization
            for animal in animals:
                assert animal["organization_id"] == org_id
                assert animal["status"] == "available"  # Default filtering
                assert animal["availability_confidence"] in ["high", "medium"]

    def test_random_animals_respect_availability_filters(self, client):
        """Test that random animal endpoint respects availability filters."""
        response = client.get("/api/animals/random?count=5")

        assert response.status_code == 200
        animals = response.json()

        # All random animals should be available with good confidence
        for animal in animals:
            assert animal["status"] == "available"
            assert animal["availability_confidence"] in ["high", "medium"]

    def test_availability_fields_in_response(self, client):
        """Test that availability fields are included in API responses."""
        response = client.get("/api/animals?limit=1")
        assert response.status_code == 200
        animals = response.json()

        if animals:
            animal = animals[0]

            # Check that all availability-related fields are present
            assert "status" in animal
            assert "availability_confidence" in animal
            assert "last_seen_at" in animal
            assert "consecutive_scrapes_missing" in animal

            # Check field values are valid
            assert animal["status"] in ["available", "unavailable"]
            assert animal["availability_confidence"] in ["high", "medium", "low"]
            assert isinstance(animal["consecutive_scrapes_missing"], (int, type(None)))

    @pytest.mark.skip(reason="Transaction isolation issues with test data setup - test modifies org data in separate transaction not visible to API")
    def test_ships_to_countries_appear_in_service_regions_filter(self, client):
        """Test that dogs from orgs that ship to a country appear when filtering by that country.

        This test verifies that organizations with ships_to data properly
        populate service_regions table for country filtering to work.
        It uses the existing test organization (901) and test animal, modifying them to test shipping.
        """
        # Get a database cursor to modify the test organization
        from tests.conftest import override_get_db_cursor

        cursor_gen = override_get_db_cursor()
        cursor = next(cursor_gen)

        try:
            # Update the existing test organization (901) to ship to Germany
            cursor.execute(
                """
                UPDATE organizations
                SET ships_to = '["DE", "NL", "BE", "FR"]', country = 'TR', city = 'Istanbul'
                WHERE id = 901
            """
            )

            # Insert service_regions entries for this org (both base country +
            # ships_to countries)
            cursor.execute("DELETE FROM service_regions WHERE organization_id = 901")
            service_regions_data = [
                (901, "TR"),  # Base country where dogs are located
                (901, "DE"),  # Ships to Germany
                (901, "NL"),  # Ships to Netherlands
                (901, "BE"),  # Ships to Belgium
                (901, "FR"),  # Ships to France
            ]

            for org_id, country in service_regions_data:
                cursor.execute(
                    """
                    INSERT INTO service_regions (organization_id, country, created_at, updated_at)
                    VALUES (%s, %s, NOW(), NOW())
                """,
                    (org_id, country),
                )

            cursor.connection.commit()

            # First verify the test org exists and has available dogs (should have
            # Test Male Dog)
            org_response = client.get("/api/animals?organization_id=901")
            assert org_response.status_code == 200
            org_dogs = org_response.json()

            # Should have the existing test dog from conftest
            assert len(org_dogs) > 0, "Test org should have available dogs"
            assert org_dogs[0]["name"] == "Test Male Dog"

            # Now test filtering by Germany - should include the existing test dog
            # since the org ships to Germany (has DE in service_regions)
            germany_response = client.get("/api/animals?available_to_country=DE")
            assert germany_response.status_code == 200
            germany_dogs = germany_response.json()

            # Check if the existing test dog appears in Germany filter results
            test_dogs_in_germany = [dog for dog in germany_dogs if dog["name"] == "Test Male Dog"]

            # This should PASS now that we've fixed the sync logic
            assert len(test_dogs_in_germany) > 0, (
                "Dogs from organizations that ship to Germany should appear when filtering by Germany. " "This indicates ships_to data is not properly synced to service_regions table."
            )

            # Verify it's the right dog
            assert test_dogs_in_germany[0]["name"] == "Test Male Dog"
            assert test_dogs_in_germany[0]["organization_id"] == 901

        finally:
            # Clean up
            try:
                next(cursor_gen)
            except StopIteration:
                pass
