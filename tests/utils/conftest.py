"""
Pytest configuration for utils tests.
Initializes database pool for secure modules.
"""

import os
import sys

import pytest

# Add project root to Python path
sys.path.insert(
    0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

from utils.db_connection import DatabaseConfig

# Test database configuration (matching main conftest)
TEST_DB_USER = "postgres"
TEST_DB_PASSWORD = "postgres"
TEST_DB_NAME = "test_rescue_dogs"
TEST_DB_HOST = "localhost"


@pytest.fixture(scope="session", autouse=True)
def initialize_database_pool():
    """Initialize the database connection pool for the entire test session.

    This fixture runs automatically at the start of the test session and ensures
    the database pool is initialized before any tests that might use the new
    secure database modules.
    """
    print(
        "\n[utils conftest] Initializing database connection pool for test session..."
    )

    # Create test database configuration
    test_db_config = DatabaseConfig(
        host=TEST_DB_HOST,
        user=TEST_DB_USER,
        database=TEST_DB_NAME,
        password=TEST_DB_PASSWORD,
        port=5432,
    )

    # Initialize the pool
    try:
        from utils.db_connection import initialize_database_pool

        pool = initialize_database_pool(test_db_config)
        print("[utils conftest] Database connection pool initialized successfully.")

        yield

        # Cleanup: Close the pool after all tests
        print("[utils conftest] Closing database connection pool...")
        pool.close_all_connections()
        print("[utils conftest] Database connection pool closed.")
    except Exception as e:
        print(f"[utils conftest] Warning: Could not initialize database pool: {e}")
        print("[utils conftest] Tests requiring database connections may fail.")
        yield
