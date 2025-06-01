"""
Pytest configuration file for API integration tests.

Sets up a connection to a real test database and manages test data.
Uses dependency overrides for TestClient database access.
"""

import os
import sys
import pytest
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi.testclient import TestClient
from fastapi import HTTPException  # <<< Import HTTPException globally

# Add project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.main import app
from api.dependencies import get_db_cursor  # Import the original dependency

# Set TESTING environment variable early
os.environ["TESTING"] = "true"
print("\n[conftest] Set TESTING environment variable.")

# --- Credentials for the TEST database ---
TEST_DB_USER = "postgres"
TEST_DB_PASSWORD = "postgres"
TEST_DB_NAME = "test_rescue_dogs"
TEST_DB_HOST = "localhost"
# ---


# --- Dependency Override Function ---
# This function provides connections/cursors for BOTH setup and request handling
def override_get_db_cursor():
    """Dependency override that connects to the TEST database."""
    test_db_params = {
        "host": TEST_DB_HOST,
        "user": TEST_DB_USER,
        "password": TEST_DB_PASSWORD,
        "database": TEST_DB_NAME,
    }
    conn = psycopg2.connect(**test_db_params)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        yield cursor
        conn.commit()
    finally:
        cursor.close()
        conn.close()


# --- Test Data Management Fixture ---
# MODIFIED: Now uses the override_get_db_cursor logic directly
@pytest.fixture(scope="function", autouse=True)
def manage_test_data():
    """Fixture to clear tables and insert test data using the override connection logic."""
    print("[conftest manage_test_data] Setting up data for test function...")
    # Get a cursor using the same logic as the dependency override
    # We need to manually iterate the generator returned by override_get_db_cursor
    cursor_generator = override_get_db_cursor()
    cursor = next(cursor_generator)  # Get the cursor yielded by the override
    conn = cursor.connection  # Get the underlying connection from the cursor

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
        INSERT INTO organizations (id, name, website_url, country, city, active, social_media)
        VALUES (901, 'Test Organization', 'http://example.com', 'Testland', 'Testville', TRUE, '{"facebook": "https://facebook.com/testorg", "instagram": "https://instagram.com/testorg"}')
        ON CONFLICT (id) DO UPDATE SET 
            name = EXCLUDED.name, 
            website_url = EXCLUDED.website_url,
            social_media = EXCLUDED.social_media;
        """
        cursor.execute(org_sql)
        print("[conftest manage_test_data] Base test data inserted.")

        # Insert specific animal data
        male_dog_sql = """
        INSERT INTO animals (id, name, animal_type, sex, status, organization_id, adoption_url, properties, primary_image_url, created_at, updated_at)
        VALUES (9001, 'Test Male Dog', 'dog', 'Male', 'available', 901, 'http://example.com/9001', '{}', 'http://example.com/male.jpg', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name, animal_type = EXCLUDED.animal_type, sex = EXCLUDED.sex, status = EXCLUDED.status,
            organization_id = EXCLUDED.organization_id, adoption_url = EXCLUDED.adoption_url, properties = EXCLUDED.properties,
            primary_image_url = EXCLUDED.primary_image_url, updated_at = NOW();
        """
        cursor.execute(male_dog_sql)
        print("[conftest.manage_test_data] Specific test animals inserted.")

        # --- IMPORTANT: Commit the setup data using the connection from the override ---
        conn.commit()
        print("[conftest.manage_test_data] Data setup complete and committed.")

        yield  # Test runs here

        # Teardown is implicitly handled by the next test's setup clearing tables
        print(
            "[conftest.manage_test_data] Teardown for test function (data cleared by next setup)."
        )

    except Exception as e:
        if conn:
            conn.rollback()
        pytest.fail(
            f"[conftest.manage_test_data] Error during test data management: {e}",
            pytrace=False,
        )
    finally:
        # Ensure the generator's finally block runs to close connection/cursor
        try:
            # Signal the generator to proceed to its finally block
            next(cursor_generator, None)
        except StopIteration:
            pass  # Expected when generator finishes


# --- TestClient Fixture with Dependency Override ---
# This remains the same, applying the override
@pytest.fixture(scope="module")
def client():
    """Pytest fixture to create a TestClient for the API with DB dependency override."""
    print("\n[conftest client] Creating TestClient with dependency override...")

    # Clear any existing overrides first
    app.dependency_overrides.clear()

    # Set our override
    app.dependency_overrides[get_db_cursor] = override_get_db_cursor

    with TestClient(app) as test_client:
        print("[conftest client] TestClient created.")
        yield test_client

    # Clear overrides after test
    app.dependency_overrides.clear()
    print("[conftest client] TestClient finished and dependency override cleared.")
