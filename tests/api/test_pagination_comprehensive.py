import pytest
from fastapi.testclient import TestClient

from api.main import app


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.api
class TestPaginationComprehensive:
    """Test comprehensive pagination handling."""

    # Use the client fixture from conftest.py instead of creating our own

    def test_animals_pagination_basic(self, client):
        """Test basic animals pagination."""
        # Test first page
        response = client.get("/api/animals?limit=5&offset=0")
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 5

        # Test second page
        response = client.get("/api/animals?limit=5&offset=5")
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 5

    def test_organizations_list_basic(self, client):
        """Test organizations list basic functionality."""
        response = client.get("/api/organizations")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
