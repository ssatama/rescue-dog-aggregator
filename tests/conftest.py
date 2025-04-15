"""
Pytest configuration file for API integration tests.

Sets up a connection to a real test database and manages test data.
"""

import os
import sys
import pytest
from unittest.mock import patch
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi.testclient import TestClient

# Add project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.main import app

# Set TESTING environment variable early
os.environ["TESTING"] = "true"
print("\n[conftest] Set TESTING environment variable.")

# Now import config, which should see TESTING=true
from config import DB_CONFIG

# --- Credentials expected by the CI database service ---
CI_DB_USER = "postgres"
CI_DB_PASSWORD = "postgres"
TEST_DB_NAME = "test_rescue_dogs"
TEST_DB_HOST = "localhost"
# ---


# Mock environment variables - This directs the FastAPI app via TestClient
@pytest.fixture(scope="session", autouse=True)
def mock_env_variables():
    """Mock environment variables for the entire test session."""
    print("\n[conftest mock_env_variables] Setting up mocked environment variables...")
    # Use credentials matching the CI database service
    test_db_settings = {
        "DB_HOST": TEST_DB_HOST,
        "DB_NAME": TEST_DB_NAME,
        "DB_USER": CI_DB_USER,  # <<< Use CI user
        "DB_PASSWORD": CI_DB_PASSWORD,  # <<< Use CI password
        "TESTING": "true",
    }
    with patch.dict(os.environ, test_db_settings, clear=True):
        print(
            f"[conftest mock_env_variables] Patched os.environ for tests: DB_NAME={os.environ.get('DB_NAME')}, DB_USER={os.environ.get('DB_USER')}, TESTING={os.environ.get('TESTING')}"
        )
        yield
    print("[conftest mock_env_variables] Restored original environment variables.")
    if "TESTING" in os.environ:
        del os.environ["TESTING"]
        print("[conftest] Cleaned up TESTING environment variable.")


# --- Real Test Database Fixtures ---


@pytest.fixture(scope="session")
def real_db_connection():
    """Create a real database connection FOR TEST SETUP/TEARDOWN to the test DB."""
    # Use credentials matching the CI database service
    test_config = {
        "host": TEST_DB_HOST,
        "user": CI_DB_USER,  # <<< Use CI user
        "password": CI_DB_PASSWORD,  # <<< Use CI password
        "database": TEST_DB_NAME,
    }
    print(
        f"\n[conftest real_db_connection] Attempting to connect fixture to DB: {test_config['database']} as user {test_config['user']}"
    )

    if test_config["database"] != TEST_DB_NAME:
        pytest.fail(
            f"real_db_connection fixture trying to connect to NON-TEST database: {test_config['database']}",
            pytrace=False,
        )

    conn = None
    try:
        conn = psycopg2.connect(**test_config)
        print(
            f"[conftest real_db_connection] Fixture connected successfully to {test_config['database']}."
        )
        yield conn
    except psycopg2.OperationalError as e:
        pytest.fail(
            f"Failed to connect fixture to TEST database '{test_config['database']}': {e}",
            pytrace=False,
        )
    finally:
        if conn:
            conn.close()
            print(
                f"[conftest real_db_connection] Fixture connection to {test_config['database']} closed."
            )


@pytest.fixture(scope="function", autouse=True)
def manage_test_data(real_db_connection):
    """Fixture to clear relevant tables and insert necessary test data before each test."""
    print("[conftest manage_test_data] Setting up data for test function...")
    conn = real_db_connection
    cursor = conn.cursor()
    try:
        # Clear tables
        print("[conftest manage_test_data] Clearing test tables...")
        cursor.execute("DELETE FROM animal_images;")
        cursor.execute("DELETE FROM animals;")
        cursor.execute("DELETE FROM scrape_logs;")
        cursor.execute("DELETE FROM organizations;")
        print("[conftest manage_test_data] Test tables cleared.")

        # Insert base data
        print("[conftest manage_test_data] Inserting base test data...")
        org_sql = """
        INSERT INTO organizations (id, name, website_url, country, city, active)
        VALUES (901, 'Test Organization', 'http://example.com', 'Testland', 'Testville', TRUE)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, website_url = EXCLUDED.website_url;
        """
        cursor.execute(org_sql)
        print("[conftest manage_test_data] Base test data inserted.")

        # Insert specific animal data (example)
        male_dog_sql = """
        INSERT INTO animals (id, name, animal_type, sex, status, organization_id, adoption_url, properties, primary_image_url, created_at, updated_at)
        VALUES (9001, 'Test Male Dog', 'dog', 'Male', 'available', 901, 'http://example.com/9001', '{}', 'http://example.com/male.jpg', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name, animal_type = EXCLUDED.animal_type, sex = EXCLUDED.sex, status = EXCLUDED.status,
            organization_id = EXCLUDED.organization_id, adoption_url = EXCLUDED.adoption_url, properties = EXCLUDED.properties,
            primary_image_url = EXCLUDED.primary_image_url, updated_at = NOW();
        """
        cursor.execute(male_dog_sql)
        print("[conftest manage_test_data] Specific test animals inserted.")

        conn.commit()
        cursor.close()
        print("[conftest manage_test_data] Data setup complete.")
        yield
        print(
            "[conftest manage_test_data] Teardown for test function (data cleared by next setup)."
        )
    except Exception as e:
        conn.rollback()
        cursor.close()
        pytest.fail(
            f"[conftest manage_test_data] Error during test data management: {e}",
            pytrace=False,
        )


# --- TestClient Fixture ---
@pytest.fixture(scope="module")
def client():
    """Pytest fixture to create a TestClient for the API."""
    print("\n[conftest client] Creating TestClient...")
    with TestClient(app) as test_client:
        print("[conftest client] TestClient created.")
        yield test_client
    print("[conftest client] TestClient finished.")
