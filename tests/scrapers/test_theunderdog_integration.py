"""Integration tests for The Underdog scraper complete pipeline."""

from unittest.mock import Mock, patch

import pytest

from scrapers.theunderdog.theunderdog_scraper import TheUnderdogScraper


@pytest.mark.integration
@pytest.mark.slow
@pytest.mark.external
class TestTheUnderdogIntegration:
    """Integration test suite for The Underdog scraper."""

    @pytest.fixture
    def scraper(self):
        """Create a scraper instance for testing."""
        scraper = TheUnderdogScraper()
        scraper.organization_id = 14
        return scraper

    @pytest.fixture
    def mock_listing_response(self):
        """Mock HTML response for listing page."""
        return """
        <html>
        <body>
            <div class="ProductList-item">
                <h3 class="ProductList-title">Vicky 🇬🇧</h3>
                <a href="/adopt/vicky" class="ProductList-link">
                    <img class="ProductList-image" src="/thumb-vicky.jpg" alt="Vicky">
                </a>
            </div>
            <div class="ProductList-item">
                <h3 class="ProductList-title">Max ADOPTED</h3>
                <a href="/adopt/max" class="ProductList-link">
                    <img class="ProductList-image" src="/thumb-max.jpg" alt="Max">
                </a>
            </div>
            <div class="ProductList-item">
                <h3 class="ProductList-title">Luna 🇫🇷</h3>
                <a href="/adopt/luna" class="ProductList-link">
                    <img class="ProductList-image" src="/thumb-luna.jpg" alt="Luna">
                </a>
            </div>
        </body>
        </html>
        """

    @pytest.fixture
    def mock_detail_response_vicky(self):
        """Mock HTML response for Vicky's detail page."""
        return """
        <html>
        <body>
            <h1 class="ProductItem-details-title">Vicky 🇬🇧</h1>
            <div class="ProductItem-gallery">
                <img src="https://images.squarespace-cdn.com/vicky-hero.jpg" alt="Vicky">
            </div>
            <div class="ProductItem-details-excerpt">
                How big?<br>Large (around 30kg)<br><br>
                How old?<br>Young adult (around two years)<br><br>
                Male or female?<br>Female<br><br>
                Living with kids?<br>I can live with children (8+)<br><br>
                Living with dogs?<br>I can live with other dogs<br><br>
                Resident dog required?<br>No, but would be beneficial<br><br>
                Living with cats?<br>I've not been tested with cats<br><br>
                Where can I live?<br>I'd like a calm, semi-rural home<br><br>
                Where am I from?<br>Cyprus, now in Devon (Cyprus adoption fee applies)<br><br>
                About Vicky<br><br>
                Vicky is currently in a foster home in North Devon after being rescued from a difficult start in life and spending a good few months in the shelter in Cyprus. She's believed to be around two years old and is a large mixed breed with a calm, sweet and endearing personality.
            </div>
        </body>
        </html>
        """

    @pytest.fixture
    def mock_detail_response_luna(self):
        """Mock HTML response for Luna's detail page."""
        return """
        <html>
        <body>
            <h1 class="ProductItem-details-title">Luna 🇫🇷</h1>
            <div class="ProductItem-gallery">
                <img src="https://images.squarespace-cdn.com/luna-hero.jpg" alt="Luna">
            </div>
            <div class="ProductItem-details-excerpt">
                How big?<br>Medium<br><br>
                Male or female?<br>Female<br><br>
                About Luna<br><br>
                Luna is a beautiful young shepherd mix looking for her forever home. She loves walks and playing with other dogs.
            </div>
        </body>
        </html>
        """

    @patch("scrapers.theunderdog.theunderdog_scraper.requests.get")
    def test_complete_data_pipeline(
        self,
        mock_get,
        scraper,
        mock_listing_response,
        mock_detail_response_vicky,
        mock_detail_response_luna,
    ):
        """Test complete data collection pipeline."""
        # Mock HTTP responses
        mock_responses = [
            Mock(text=mock_listing_response, status_code=200),  # Listing page
            Mock(text=mock_detail_response_vicky, status_code=200),  # Vicky detail
            Mock(text=mock_detail_response_luna, status_code=200),  # Luna detail
        ]
        mock_get.side_effect = mock_responses

        # Mock rate limiting
        scraper.respect_rate_limit = Mock()

        # Run complete data collection
        results = scraper.collect_data()

        # Verify results
        assert len(results) == 2  # Only available dogs (Max is ADOPTED)

        # Test Vicky's data
        vicky = next(r for r in results if r["name"] == "Vicky")
        assert vicky["external_id"] == "tud-vicky"
        assert vicky["adoption_url"] == "https://www.theunderdog.org/adopt/vicky"
        assert vicky["primary_image_url"] == "https://images.squarespace-cdn.com/vicky-hero.jpg"
        assert vicky["animal_type"] == "dog"
        assert vicky["status"] == "available"

        # Test normalized fields - fallback extraction from description should work
        assert vicky["age_text"] == "Young adult (around two years)"  # From Q&A data
        assert vicky["breed"] == "Mixed Breed"
        assert vicky["sex"] == "Female"  # Should be full word
        assert vicky["size"] == "Large"  # Extracted from properties "Large (around 30kg)"
        assert vicky["weight_kg"] == 30.0  # Extracted from "Large (around 30kg)"
        assert vicky["country"] == "United Kingdom"
        assert vicky["country_code"] == "GB"
        assert vicky["location"] == "United Kingdom"

        # Test Luna's data
        luna = next(r for r in results if r["name"] == "Luna")
        assert luna["external_id"] == "tud-luna"
        assert luna["adoption_url"] == "https://www.theunderdog.org/adopt/luna"
        assert luna["primary_image_url"] == "https://images.squarespace-cdn.com/luna-hero.jpg"

        # Test normalized fields
        assert luna["breed"] == "Shepherd Mix" or luna["breed"] == "Mixed Breed"  # Extracted from description or defaulted
        assert luna["sex"] == "Female"  # Should be full word
        assert luna["size"] == "Medium"
        assert luna["country"] == "France"
        assert luna["country_code"] == "FR"
        assert luna["location"] == "France"

        # Verify all required fields are present
        required_fields = [
            "name",
            "external_id",
            "adoption_url",
            "primary_image_url",
            "description",
            "breed",
            "sex",
            "size",
            "animal_type",
            "status",
        ]
        for dog in results:
            for field in required_fields:
                assert field in dog, f"Missing required field '{field}' in {dog['name']}"
                assert dog[field] is not None, f"Field '{field}' is None in {dog['name']}"
                assert dog[field] != "", f"Field '{field}' is empty in {dog['name']}"

    @patch("scrapers.theunderdog.theunderdog_scraper.requests.get")
    def test_error_handling(self, mock_get, scraper):
        """Test error handling in data collection."""
        # Mock HTTP error
        mock_get.side_effect = Exception("Network error")

        # Should not raise exception, but return empty list
        results = scraper.collect_data()
        assert results == []

    @patch("scrapers.theunderdog.theunderdog_scraper.requests.get")
    def test_fallback_extraction(self, mock_get, scraper):
        """Test fallback extraction methods."""
        # Mock minimal detail page
        minimal_response = """
        <html>
        <body>
            <h1 class="ProductItem-details-title">Buddy 🇷🇴</h1>
            <div class="ProductItem-gallery">
                <img src="https://images.squarespace-cdn.com/buddy-hero.jpg" alt="Buddy">
            </div>
            <div class="ProductItem-details-excerpt">
                <p>About Buddy</p>
                <p>Buddy is a lovely 3 year old male dog who loves children. He is looking for his forever home.</p>
            </div>
        </body>
        </html>
        """

        mock_get.side_effect = [
            Mock(
                text='<div class="ProductList-item"><h3 class="ProductList-title">Buddy 🇷🇴</h3><a href="/adopt/buddy"></a></div>',
                status_code=200,
            ),
            Mock(text=minimal_response, status_code=200),
        ]

        scraper.respect_rate_limit = Mock()

        results = scraper.collect_data()
        assert len(results) == 1

        buddy = results[0]

        # Test fallback extractions
        assert buddy["age_text"] == "3 years"  # Extracted from description
        assert buddy["sex"] == "Male"  # Extracted from description
        assert buddy["breed"] == "Mixed Breed"  # Default fallback
        assert buddy["country"] == "Romania"
        assert buddy["country_code"] == "RO"

    def test_field_population_completeness(self, scraper):
        """Test that all critical database fields are populated."""
        # Test with mock data
        mock_data = {
            "name": "Test Dog 🇬🇧",
            "external_id": "test-dog",
            "adoption_url": "https://example.com/test-dog",
            "primary_image_url": "https://example.com/test-dog.jpg",
            "description": "A lovely 2 year old female labrador mix.",
            "properties": {
                "raw_qa_data": {
                    "How big?": "Large (25kg)",
                    "How old?": "Young adult (2 years)",
                    "Male or female?": "Female",
                }
            },
            "animal_type": "dog",
            "status": "available",
            "country": {"name": "United Kingdom", "iso_code": "GB"},
        }

        # Apply normalization (simulating the scraper's process)
        # Note: normalize_animal_data doesn't exist, normalization happens via process_animal
        result = mock_data

        # Apply the same field population logic as the scraper
        # Extract Q&A data
        from scrapers.theunderdog.normalizer import (
            extract_qa_data,
            extract_size_and_weight_from_qa,
        )

        qa_data = extract_qa_data(result.get("properties", {}))

        # Extract size and weight from Q&A
        size, weight_kg = extract_size_and_weight_from_qa(qa_data)
        if size:
            result["size"] = size
        if weight_kg:
            result["weight_kg"] = weight_kg

        if not result.get("breed"):
            # Extract breed from description
            from utils.shared_extraction_patterns import extract_breed_from_text

            result["breed"] = extract_breed_from_text(result["description"])
        if not result.get("age_text"):
            result["age_text"] = scraper._extract_age_fallback(result["description"])
        if not result.get("sex"):
            result["sex"] = scraper._extract_sex_fallback(result["description"])
        if not result.get("size"):
            if result.get("weight_kg"):
                result["size"] = scraper._estimate_size_from_weight(result["weight_kg"])
            else:
                result["size"] = "Medium"
        if not result.get("description"):
            result["description"] = f"Rescue dog from {result.get('country', 'unknown location')}"
        if not result.get("location"):
            result["location"] = result.get("country", "Unknown")

        # Test all critical fields are populated
        critical_fields = [
            "name",
            "external_id",
            "adoption_url",
            "primary_image_url",
            "description",
            "breed",
            "age_text",
            "sex",
            "size",
            "animal_type",
            "status",
        ]

        for field in critical_fields:
            assert field in result, f"Missing critical field: {field}"
            assert result[field] is not None, f"Critical field '{field}' is None"
            assert result[field] != "", f"Critical field '{field}' is empty"

        # Test data types are correct
        assert isinstance(result["name"], str)
        assert isinstance(result["external_id"], str)
        assert isinstance(result["adoption_url"], str)
        assert isinstance(result["primary_image_url"], str)
        assert isinstance(result["description"], str)
        assert isinstance(result["breed"], str)
        assert isinstance(result["sex"], str)
        assert isinstance(result["size"], str)
        assert isinstance(result["animal_type"], str)
        assert isinstance(result["status"], str)

        # Test normalized fields
        assert result["breed"] == "Labrador Mix"
        assert result["age_text"] == "2 years"
        assert result["sex"] == "Female"  # Updated to new format
        assert result["size"] == "Large"
        assert result["weight_kg"] == 25.0

    def test_data_accuracy_validation(self, scraper):
        """Test data accuracy and consistency."""
        # Test age extraction accuracy
        age_tests = [
            ("A 2 year old dog", "2 years"),
            ("This 6 month old puppy", "6 months"),
            ("Around 3 years old", "3 years"),
            ("No age mentioned", None),
        ]

        for description, expected_age in age_tests:
            result = scraper._extract_age_fallback(description)
            assert result == expected_age, f"Age extraction failed for '{description}'"

        # Test sex extraction accuracy
        sex_tests = [
            ("She is a lovely dog", "Female"),
            ("He loves to play", "Male"),
            ("This dog is friendly", None),
        ]

        for description, expected_sex in sex_tests:
            result = scraper._extract_sex_fallback(description)
            assert result == expected_sex, f"Sex extraction failed for '{description}'"

        # Test size estimation accuracy
        size_tests = [
            (5.0, "Small"),
            (15.0, "Medium"),
            (30.0, "Large"),
            (50.0, "XLarge"),
        ]

        for weight, expected_size in size_tests:
            result = scraper._estimate_size_from_weight(weight)
            assert result == expected_size, f"Size estimation failed for {weight}kg"
