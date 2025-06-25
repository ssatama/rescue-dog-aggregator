"""
Pytest configuration file for API integration tests.

Sets up a connection to a real test database and manages test data.
Uses dependency overrides for TestClient database access.
"""

import os
import sys
from unittest.mock import patch

import psycopg2
import pytest
from fastapi.testclient import TestClient
from psycopg2.extras import RealDictCursor

from api.dependencies import get_db_cursor  # Import the original dependency
from api.main import app

# Add project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


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
# This function provides connections/cursors for BOTH setup and request
# handling
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
    # We need to manually iterate the generator returned by
    # override_get_db_cursor
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

        # Insert comprehensive test animals for all tests
        animals_sql = """
        INSERT INTO animals (id, name, animal_type, sex, status, organization_id, adoption_url, properties, primary_image_url, created_at, updated_at, availability_confidence, breed, breed_group, size, age_text, age_min_months, age_max_months)
        VALUES 
            (9001, 'Test Male Dog', 'dog', 'Male', 'available', 901, 'http://example.com/9001', '{}', 'http://example.com/male.jpg', NOW(), NOW(), 'high', 'Golden Retriever', 'Sporting', 'large', '2 years', 24, 24),
            (9002, 'Mixed Breed Dog', 'dog', 'Female', 'available', 901, 'http://example.com/9002', '{}', 'http://example.com/female.jpg', NOW(), NOW(), 'high', 'Mixed Breed', 'Mixed', 'medium', '1 year', 12, 12),
            (9003, 'German Shepherd', 'dog', 'Male', 'available', 901, 'http://example.com/9003', '{}', 'http://example.com/shepherd.jpg', NOW(), NOW(), 'high', 'German Shepherd', 'Herding', 'large', '3 years', 36, 36),
            (9004, 'Labrador Mix', 'dog', 'Female', 'available', 901, 'http://example.com/9004', '{}', 'http://example.com/lab.jpg', NOW(), NOW(), 'high', 'Labrador Retriever', 'Sporting', 'large', '18 months', 18, 18),
            (9005, 'Beagle', 'dog', 'Male', 'available', 901, 'http://example.com/9005', '{}', 'http://example.com/beagle.jpg', NOW(), NOW(), 'high', 'Beagle', 'Hound', 'medium', '4 years', 48, 48),
            (9006, 'Poodle', 'dog', 'Female', 'available', 901, 'http://example.com/9006', '{}', 'http://example.com/poodle.jpg', NOW(), NOW(), 'high', 'Poodle', 'Non-Sporting', 'medium', '6 months', 6, 6),
            (9007, 'Bulldog', 'dog', 'Male', 'available', 901, 'http://example.com/9007', '{}', 'http://example.com/bulldog.jpg', NOW(), NOW(), 'high', 'Bulldog', 'Non-Sporting', 'medium', '5 years', 60, 60),
            (9008, 'Chihuahua', 'dog', 'Female', 'available', 901, 'http://example.com/9008', '{}', 'http://example.com/chihuahua.jpg', NOW(), NOW(), 'high', 'Chihuahua', 'Toy', 'small', '8 years', 96, 96),
            (9009, 'Rottweiler', 'dog', 'Male', 'available', 901, 'http://example.com/9009', '{}', 'http://example.com/rottweiler.jpg', NOW(), NOW(), 'high', 'Rottweiler', 'Working', 'large', '7 years', 84, 84),
            (9010, 'Border Collie', 'dog', 'Female', 'available', 901, 'http://example.com/9010', '{}', 'http://example.com/collie.jpg', NOW(), NOW(), 'high', 'Border Collie', 'Herding', 'medium', '2 years', 24, 24),
            (9011, 'Siberian Husky', 'dog', 'Male', 'available', 901, 'http://example.com/9011', '{}', 'http://example.com/husky.jpg', NOW(), NOW(), 'high', 'Siberian Husky', 'Working', 'large', '4 years', 48, 48),
            (9012, 'Yorkshire Terrier', 'dog', 'Female', 'available', 901, 'http://example.com/9012', '{}', 'http://example.com/yorkie.jpg', NOW(), NOW(), 'high', 'Yorkshire Terrier', 'Toy', 'small', '3 years', 36, 36)
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name, animal_type = EXCLUDED.animal_type, sex = EXCLUDED.sex, status = EXCLUDED.status,
            organization_id = EXCLUDED.organization_id, adoption_url = EXCLUDED.adoption_url, properties = EXCLUDED.properties,
            primary_image_url = EXCLUDED.primary_image_url, updated_at = NOW(), availability_confidence = EXCLUDED.availability_confidence,
            breed = EXCLUDED.breed, breed_group = EXCLUDED.breed_group, size = EXCLUDED.size, age_text = EXCLUDED.age_text,
            age_min_months = EXCLUDED.age_min_months, age_max_months = EXCLUDED.age_max_months;
        """
        cursor.execute(animals_sql)
        print("[conftest.manage_test_data] Comprehensive test animals inserted (12 dogs with various breeds).")

        # --- IMPORTANT: Commit the setup data using the connection from the override ---
        conn.commit()
        print("[conftest.manage_test_data] Data setup complete and committed.")

        yield  # Test runs here

        # Teardown is implicitly handled by the next test's setup clearing
        # tables
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


@pytest.fixture(scope="module")
def api_client_no_auth():
    """Pytest fixture for unauthenticated API client testing."""
    print("\n[conftest api_client_no_auth] Creating unauthenticated TestClient...")

    # Create client without any authentication or special overrides
    with TestClient(app) as test_client:
        print("[conftest api_client_no_auth] Unauthenticated TestClient created.")
        yield test_client

    print("[conftest api_client_no_auth] Unauthenticated TestClient finished.")


@pytest.fixture(autouse=True)
def disable_cloudinary_in_tests():
    """Automatically disable Cloudinary for all tests."""
    with patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    ):
        yield
