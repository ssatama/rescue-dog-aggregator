"""Tests for breed statistics endpoint."""
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from api.main import app


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def mock_cursor():
    """Create mock database cursor."""
    cursor = MagicMock()
    return cursor


class TestBreedStatsEndpoint:
    """Test breed statistics endpoint."""
    
    def test_get_breed_stats_endpoint_exists(self, client, mock_cursor):
        """Test that breed stats endpoint exists and responds."""
        # Mock minimal valid response that matches the actual data structure
        mock_stats = {
            "total_dogs": 2500,
            "unique_breeds": 150,
            "purebred_count": 800,
            "crossbreed_count": 238,
            "breed_groups": [],
            "qualifying_breeds": []
        }
        
        with patch("api.routes.animals.get_pooled_db_cursor", return_value=mock_cursor):
            with patch("api.services.animal_service.AnimalService.get_breed_stats", 
                      return_value=mock_stats):
                response = client.get("/api/animals/breeds/stats")
        
        assert response.status_code == 200
        data = response.json()
        assert "total_dogs" in data
        assert "unique_breeds" in data
        assert "breed_groups" in data
        assert "qualifying_breeds" in data
        
    def test_get_breed_stats_database_error(self, client, mock_cursor):
        """Test database error handling in breed stats."""
        import psycopg2
        
        with patch("api.routes.animals.get_pooled_db_cursor", return_value=mock_cursor):
            with patch("api.services.animal_service.AnimalService.get_breed_stats",
                      side_effect=psycopg2.Error("Database connection failed")):
                response = client.get("/api/animals/breeds/stats")
        
        assert response.status_code == 500
        assert "Database error" in response.json()["detail"]