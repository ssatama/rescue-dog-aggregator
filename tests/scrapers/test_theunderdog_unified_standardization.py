"""Test TheUnderdog scraper with unified standardization enabled."""

from unittest.mock import MagicMock, Mock, patch

import pytest

from scrapers.theunderdog.theunderdog_scraper import TheUnderdogScraper


@pytest.fixture
def mock_db_connection():
    """Create a mock database connection."""
    conn = MagicMock()
    cursor = MagicMock()
    conn.cursor.return_value = cursor
    cursor.fetchone.return_value = None  # No existing animals
    return conn


@pytest.fixture
def theunderdog_scraper(mock_db_connection):
    """Create TheUnderdog scraper with mocked dependencies."""
    with (
        patch("scrapers.theunderdog.theunderdog_scraper.requests"),
        patch("scrapers.base_scraper.ConfigLoader"),
    ):
        # Create scraper with real UnifiedStandardizer (not mocked)
        scraper = TheUnderdogScraper(config_id="theunderdog")
        scraper.conn = mock_db_connection
        scraper.logger = Mock()
        scraper.organization_id = 100
        scraper.organization_name = "theunderdog"
        scraper.use_unified_standardization = True  # Enable unified standardization
        return scraper


def test_theunderdog_uses_unified_standardization_when_enabled(theunderdog_scraper):
    """Test that TheUnderdog uses unified standardization via BaseScraper."""
    # Mock animal data as it would come from scrape_animal_details
    raw_animal_data = {
        "name": "Buddy",
        "breed": "staffordshire bull terrier mix",  # Should be standardized
        "age": "2 years",
        "size": "Medium",
        "sex": "Male",
        "organization_id": 100,
        "external_id": "buddy-123",
        "description": "A lovely dog",
        "primary_image_url": "https://example.com/buddy.jpg",
    }

    # Process through base scraper's standardization
    processed_data = theunderdog_scraper.process_animal(raw_animal_data)

    # Verify standardization was applied
    assert (
        processed_data["breed"] == "Staffordshire Bull Terrier Mix"
    )  # Mix properly preserved
    assert processed_data["age"] == "2 years"  # Age preserved
    assert processed_data["size"] == "Medium"  # Size preserved
    assert (
        processed_data["breed_category"] == "Mixed"
    )  # Mix breeds get "Mixed" category


def test_theunderdog_handles_lurcher_breed_correctly(theunderdog_scraper):
    """Test that Lurcher is correctly mapped to Hound group."""
    raw_animal_data = {
        "name": "Shadow",
        "breed": "lurcher",
        "age": "3 years",
        "size": "Large",
        "sex": "Female",
        "organization_id": 100,
        "external_id": "shadow-456",
        "description": "A beautiful lurcher",
        "primary_image_url": "https://example.com/shadow.jpg",
    }

    processed_data = theunderdog_scraper.process_animal(raw_animal_data)

    assert processed_data["breed"] == "Lurcher"
    assert processed_data["breed_category"] == "Hound"  # Critical fix applied


def test_theunderdog_handles_designer_breeds(theunderdog_scraper):
    """Test that designer breeds are handled correctly."""
    raw_animal_data = {
        "name": "Max",
        "breed": "cockapoo",
        "age": "1 year",
        "size": "Small",
        "sex": "Male",
        "organization_id": 100,
        "external_id": "max-789",
        "description": "Adorable cockapoo puppy",
        "primary_image_url": "https://example.com/max.jpg",
    }

    processed_data = theunderdog_scraper.process_animal(raw_animal_data)

    assert processed_data["breed"] == "Cockapoo"
    assert (
        processed_data["breed_category"] == "Designer/Hybrid"
    )  # Designer breeds now have their own category


def test_theunderdog_preserves_qa_data_structure(theunderdog_scraper):
    """Test that Q&A data structure specific to TheUnderdog is preserved."""
    raw_animal_data = {
        "name": "Luna",
        "breed": "Mixed Breed",
        "age": "2 years",
        "sex": "Female",
        "organization_id": 100,
        "external_id": "luna-101",
        "description": "Sweet dog",
        "primary_image_url": "https://example.com/luna.jpg",
        "properties": {
            "raw_qa_data": {
                "How big?": "Medium (20kg)",
                "How old?": "Around 2 years",
                "Good with cats?": "Yes",
            }
        },
    }

    processed_data = theunderdog_scraper.process_animal(raw_animal_data)

    # Q&A data should be preserved in properties
    assert "properties" in processed_data
    assert "raw_qa_data" in processed_data["properties"]
    assert processed_data["properties"]["raw_qa_data"]["How big?"] == "Medium (20kg)"


def test_theunderdog_handles_missing_breed_gracefully(theunderdog_scraper):
    """Test that missing breed is handled with fallback."""
    raw_animal_data = {
        "name": "Unknown",
        "breed": None,  # Missing breed
        "age": "Adult",
        "size": "Medium",
        "sex": "Male",
        "organization_id": 100,
        "external_id": "unknown-202",
        "description": "No breed specified",
        "primary_image_url": "https://example.com/unknown.jpg",
    }

    processed_data = theunderdog_scraper.process_animal(raw_animal_data)

    # Should have a fallback breed
    assert processed_data["breed"] in ["Mixed Breed", "Unknown"]
    assert processed_data.get("breed_category") in ["Mixed", "Unknown", None]


def test_theunderdog_size_extraction_from_qa_data(theunderdog_scraper):
    """Test that size can be extracted from Q&A data when not in main fields."""
    raw_animal_data = {
        "name": "Rex",
        "breed": "German Shepherd",
        "age": "4 years",
        "size": None,  # Size missing from main data
        "sex": "Male",
        "organization_id": 100,
        "external_id": "rex-303",
        "description": "Large dog",
        "primary_image_url": "https://example.com/rex.jpg",
        "properties": {"raw_qa_data": {"How big?": "Large (around 35kg)"}},
    }

    # The scraper should extract size from Q&A data
    # This would happen in the scraper's scrape_animal_details method
    # For now, test that Q&A data is preserved for extraction
    processed_data = theunderdog_scraper.process_animal(raw_animal_data)

    # Q&A data should be available for size extraction
    assert (
        processed_data["properties"]["raw_qa_data"]["How big?"] == "Large (around 35kg)"
    )
