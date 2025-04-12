"""
Pytest configuration file.

This file contains fixtures and configuration settings for pytest.
"""
import os
import sys
import pytest
from unittest.mock import MagicMock, patch

# Add project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Mock environment variables
@pytest.fixture(autouse=True)
def mock_env_variables():
    """Mock environment variables for testing."""
    with patch.dict(os.environ, {
        'DB_HOST': 'localhost',
        'DB_NAME': 'test_rescue_dogs',
        'DB_USER': 'test_user',
        'DB_PASSWORD': 'test_password'
    }):
        yield

# Mock database connection
@pytest.fixture
def mock_db_connection():
    """Return a mock database connection."""
    conn = MagicMock()
    cursor = MagicMock()
    conn.cursor.return_value = cursor
    return conn, cursor

# Mock dog data for testing
@pytest.fixture
def sample_dog_data():
    """Return sample dog data for testing."""
    return {
        "name": "Test Dog",
        "breed": "Labrador Retriever",
        "age_text": "2 years",
        "sex": "Male",
        "size": "Large",
        "primary_image_url": "http://example.com/image.jpg",
        "adoption_url": "http://example.com/adopt",
        "status": "available",
        "external_id": "test-dog-123",
        "properties": {
            "weight": "30kg",
            "height": "60cm",
            "neutered_spayed": "Yes",
            "description": "A friendly, energetic dog who loves to play fetch."
        }
    }

# For database tests that need a real connection, use this fixture
# Uncomment and configure if you want to run tests against a real test database
"""
@pytest.fixture(scope="session")
def real_db_connection():
    \"""Create a real database connection for integration tests.\"""
    from config import DB_CONFIG
    import psycopg2
    
    # Override config to use test database
    test_config = {
        'host': DB_CONFIG['host'],
        'user': DB_CONFIG['user'],
        'password': DB_CONFIG['password'],
        'database': 'test_rescue_dogs'  # Use a test database
    }
    
    # Connect to PostgreSQL
    conn = psycopg2.connect(**test_config)
    conn.autocommit = False  # Ensure transactions can be rolled back
    
    yield conn
    
    # Teardown - close connection
    conn.close()

@pytest.fixture
def real_db_cursor(real_db_connection):
    \"""Create a database cursor with automatic rollback.\"""
    cursor = real_db_connection.cursor()
    yield cursor
    real_db_connection.rollback()  # Roll back after each test
"""