"""Integration tests for Tierschutzverein Europa scraper with base_scraper pipeline.

Tests the complete flow: extract German data → translate → standardize with base_scraper.
"""

from unittest.mock import patch

import pytest

from scrapers.tierschutzverein_europa.dogs_scraper import TierschutzvereinEuropaScraper
from utils.standardization import standardize_age, standardize_breed


@pytest.mark.api
@pytest.mark.browser
@pytest.mark.database
@pytest.mark.integration
@pytest.mark.selenium
@pytest.mark.slow
class TestTierschutzvereinEuropaIntegration:
    """Test integration between scraper, translation, and base_scraper standardization."""

    def test_scraper_base_scraper_integration(self):
        """Test that translated data works with base_scraper standardization."""
        # Create scraper instance
        scraper = TierschutzvereinEuropaScraper(config_id="tierschutzverein-europa")

        # Mock German data as if extracted from website
        german_dogs = [
            {
                "name": "BELLA",
                "sex": "Hündin",
                "age_text": "3 Jahre",
                "breed": "Deutscher Schäferhund",
                "external_id": "bella-123",
                "adoption_url": "https://tierschutzverein-europa.de/tiervermittlung/bella-123/",
                "properties": {
                    "source": "tierschutzverein-europa.de",
                    "country": "DE",
                    "language": "de",
                },
            },
            {
                "name": "MAX",
                "sex": "Rüde",
                "age_text": "1 Jahre",
                "breed": "Mischling",
                "external_id": "max-456",
                "adoption_url": "https://tierschutzverein-europa.de/tiervermittlung/max-456/",
                "properties": {
                    "source": "tierschutzverein-europa.de",
                    "country": "DE",
                    "language": "de",
                },
            },
        ]

        # Mock the extraction method to return our test data
        with (
            patch.object(scraper, "get_animal_list", return_value=german_dogs),
            patch.object(scraper, "_process_animals_parallel", return_value=german_dogs),
        ):
            english_dogs = scraper.collect_data()

        # Verify we got the expected number of dogs
        assert len(english_dogs) == 2

        # Test first dog (Bella)
        bella = english_dogs[0]
        assert bella["name"] == "Bella"  # Capitalized from BELLA
        assert bella["sex"] == "Female"  # Translated from Hündin
        assert bella["age_text"] == "3 years"  # Translated from 3 Jahre
        assert bella["breed"] == "German Shepherd"  # Translated from Deutscher Schäferhund
        assert bella["properties"]["language"] == "en"  # Updated language
        assert bella["properties"]["original_language"] == "de"  # Translation marker

        # Test second dog (Max)
        max_dog = english_dogs[1]
        assert max_dog["name"] == "Max"  # Capitalized from MAX
        assert max_dog["sex"] == "Male"  # Translated from Rüde
        assert max_dog["age_text"] == "1 year"  # Translated from 1 Jahre (singular)
        assert max_dog["breed"] == "Mixed Breed"  # Translated from Mischling

        # Verify base_scraper standardization will work on translated data
        for dog in english_dogs:
            # Test breed standardization
            breed_info = standardize_breed(dog["breed"])
            assert breed_info is not None, f"Breed standardization failed for {dog['breed']}"
            standardized_breed, breed_group, size_estimate = breed_info
            assert standardized_breed is not None, f"No standardized breed for {dog['breed']}"

            # Test age standardization
            age_info = standardize_age(dog["age_text"])
            assert age_info is not None, f"Age standardization failed for {dog['age_text']}"
            assert "age_min_months" in age_info, f"Missing age_min_months for {dog['age_text']}"
            assert "age_max_months" in age_info, f"Missing age_max_months for {dog['age_text']}"

    def test_translation_preserves_semantic_meaning(self):
        """Test that translations preserve semantic meaning for proper categorization."""
        scraper = TierschutzvereinEuropaScraper(config_id="tierschutzverein-europa")

        # Test young and old dogs to verify age categorization
        test_dogs = [
            {
                "name": "YOUNG_DOG",
                "sex": "Hündin",
                "age_text": "1 Jahre",
                "breed": "Mischling",
                "external_id": "young-123",
            },
            {
                "name": "OLD_DOG",
                "sex": "Rüde",
                "age_text": "12 Jahre",
                "breed": "Deutscher Schäferhund",
                "external_id": "old-456",
            },
        ]

        with patch.object(scraper, "_process_animals_parallel", return_value=test_dogs):
            translated_dogs = scraper.collect_data()

        # Test young dog categorization
        young_dog = translated_dogs[0]
        age_info = standardize_age(young_dog["age_text"])
        assert age_info["age_min_months"] <= 12, "Young dog not categorized as young"

        # Test old dog categorization
        old_dog = translated_dogs[1]
        age_info = standardize_age(old_dog["age_text"])
        assert age_info["age_min_months"] >= 120, "Old dog not categorized as senior"

    def test_breed_translation_enables_size_estimation(self):
        """Test that breed translations enable size estimation by base_scraper."""
        scraper = TierschutzvereinEuropaScraper(config_id="tierschutzverein-europa")

        test_dogs = [
            {
                "name": "SHEPHERD_DOG",
                "sex": "Rüde",
                "age_text": "5 Jahre",
                "breed": "Deutscher Schäferhund",
                "external_id": "shepherd-123",
            }
        ]  # Should become "German Shepherd"

        with patch.object(scraper, "_process_animals_parallel", return_value=test_dogs):
            translated_dogs = scraper.collect_data()

        dog = translated_dogs[0]

        # Verify translation worked
        assert "German Shepherd" in dog["breed"]

        # Verify base_scraper can standardize and estimate size
        standardized_breed, breed_group, size_estimate = standardize_breed(dog["breed"])

        # German Shepherds should be recognized and sized
        assert "Shepherd" in standardized_breed or "German Shepherd" in standardized_breed
        # Size estimate should be provided (Large for German Shepherds)
        assert size_estimate in ["Medium", "Large", "XLarge"] or size_estimate is None

    def test_error_handling_in_translation(self):
        """Test that translation errors don't break the pipeline."""
        scraper = TierschutzvereinEuropaScraper(config_id="tierschutzverein-europa")

        # Test with some problematic data
        problematic_dogs = [
            {
                "name": None,
                "sex": "Invalid",
                "age_text": "",
                "breed": "",
                "external_id": "problem-123",
            },  # Missing name  # Invalid gender  # Empty age  # Empty breed
            {
                "name": "GOOD_DOG",
                "sex": "Hündin",
                "age_text": "2 Jahre",
                "breed": "Mischling",
                "external_id": "good-456",
            },
        ]

        with patch.object(scraper, "_process_animals_parallel", return_value=problematic_dogs):
            translated_dogs = scraper.collect_data()

        # Should get both dogs back (translation failures are handled gracefully)
        assert len(translated_dogs) == 2

        # Good dog should be translated properly
        good_dog = next(dog for dog in translated_dogs if dog.get("external_id") == "good-456")
        assert good_dog["name"] == "Good_dog"  # Normalized
        assert good_dog["sex"] == "Female"  # Translated
        assert good_dog["age_text"] == "2 years"  # Translated
        assert good_dog["breed"] == "Mixed Breed"  # Translated

    def test_fallback_extraction_methods_include_translation(self):
        """Test that all extraction fallback methods apply translation."""
        scraper = TierschutzvereinEuropaScraper(config_id="tierschutzverein-europa")

        german_dog = [
            {
                "name": "TEST_DOG",
                "sex": "Rüde",
                "age_text": "4 Jahre",
                "breed": "Mischling",
                "external_id": "test-123",
                "adoption_url": "https://test.com/test-123",
            }
        ]

        # Mock the primary extraction method to fail so we test translation happens
        # The scraper's collect_data calls: get_animal_list -> _process_animals_parallel -> _translate_and_normalize_dogs
        # We'll mock get_animal_list to succeed with our test dog and let translation happen
        with patch.object(scraper, "get_animal_list", return_value=german_dog):
            # Mock _process_animals_parallel to just return the input (no enrichment)
            with patch.object(scraper, "_process_animals_parallel", return_value=german_dog):
                translated_dogs = scraper.collect_data()

        assert len(translated_dogs) == 1
        dog = translated_dogs[0]
        assert dog["name"] == "Test_dog"  # Translated
        assert dog["sex"] == "Male"  # Translated
        assert dog["age_text"] == "4 years"  # Translated
        assert dog["breed"] == "Mixed Breed"  # Translated

    def test_actual_database_patterns_work_with_pipeline(self):
        """Test using actual patterns found in production database."""
        scraper = TierschutzvereinEuropaScraper(config_id="tierschutzverein-europa")

        # Use real patterns from production database
        real_dogs = [
            {
                "name": "ASHANTI",  # Real name from DB
                "sex": "Hündin",  # Real gender pattern
                "age_text": "3 Jahre",  # Real age pattern
                "breed": "Podenco-Mischling",  # Real breed pattern
                "external_id": "ashanti-real",
            },
            {
                "name": "DEXTER",
                "sex": "Rüde",
                "age_text": "7 Jahre",
                "breed": "Schäferhund Mischling",
                "external_id": "dexter-real",
            },  # Real compound breed
        ]

        with patch.object(scraper, "_process_animals_parallel", return_value=real_dogs):
            translated_dogs = scraper.collect_data()

        # Verify all real patterns translate and standardize correctly
        for dog in translated_dogs:
            # Verify translation worked
            assert dog["name"] not in ["ASHANTI", "DEXTER"]  # Should be capitalized
            assert dog["sex"] in ["Male", "Female"]  # Should be English
            assert "years" in dog["age_text"]  # Should be English

            # Verify standardization works
            age_info = standardize_age(dog["age_text"])
            assert age_info is not None
            assert age_info["age_min_months"] > 0

            breed_info = standardize_breed(dog["breed"])
            assert breed_info is not None

    def test_exact_example_from_requirements(self):
        """Test the exact example provided in the requirements."""
        from scrapers.tierschutzverein_europa.dogs_scraper import (
            TierschutzvereinEuropaScraper,
        )
        from utils.standardization import standardize_age, standardize_breed

        scraper = TierschutzvereinEuropaScraper(config_id="tierschutzverein-europa")

        # Mock German data as if extracted - must include adoption_url
        german_dogs = [
            {
                "name": "BELLA",
                "sex": "Hündin",
                "age_text": "3 Jahre",
                "breed": "Deutscher Schäferhund",
                "external_id": "bella-123",
                "adoption_url": "https://tierschutzverein-europa.de/bella-123",
            }
        ]

        # Apply translation (what scraper should do)
        with (
            patch.object(scraper, "get_animal_list", return_value=german_dogs),
            patch.object(scraper, "_process_animals_parallel", return_value=german_dogs),
        ):
            english_dogs = scraper.collect_data()

        # Verify English output
        dog = english_dogs[0]
        assert dog["name"] == "Bella"  # Capitalized
        assert dog["sex"] == "Female"
        assert dog["age_text"] == "3 years"
        assert dog["breed"] == "German Shepherd"

        # Verify base_scraper standardization will work
        breed_info = standardize_breed(dog["breed"])
        # German Shepherd Dog is the official AKC breed name
        assert breed_info[0] == "German Shepherd Dog"  # Standardized breed

        age_info = standardize_age(dog["age_text"])
        assert age_info["age_min_months"] == 36  # 3 years = 36 months
