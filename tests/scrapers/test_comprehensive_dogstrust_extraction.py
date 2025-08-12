"""Comprehensive test suite for Dogs Trust enhanced extraction."""

from unittest.mock import patch

import pytest

from scrapers.dogstrust.dogstrust_scraper import DogsTrustScraper


class TestComprehensiveDogsTrustExtraction:
    """Test comprehensive data extraction following Many Tears Rescue pattern."""

    @pytest.fixture
    def scraper(self):
        """Create Dogs Trust scraper with mocked dependencies."""
        from unittest.mock import MagicMock

        # Create proper mock for configuration
        mock_config = MagicMock()
        mock_config.name = "Dogs Trust"
        mock_config.metadata.website_url = "https://www.dogstrust.org.uk"
        mock_config.get_scraper_config_dict.return_value = {"rate_limit_delay": 2.5, "max_retries": 3, "timeout": 30, "batch_size": 10, "skip_existing_animals": False}
        # Fix: Make get_display_name return a string, not a MagicMock
        mock_config.get_display_name = MagicMock(return_value="Dogs Trust")

        mock_loader = MagicMock()
        mock_loader.load_config.return_value = mock_config

        with patch("scrapers.base_scraper.ConfigLoader", return_value=mock_loader), patch("scrapers.base_scraper.create_default_sync_service"):
            return DogsTrustScraper(config_id="dogstrust")

    def test_extract_simone_comprehensive_properties(self, scraper):
        """Test comprehensive extraction for Simone (Whippet) with living_off_site property.

        Based on PDF screenshot analysis from Phase 2.
        URL: https://www.dogstrust.org.uk/rehoming/dogs/whippet/3592141
        """
        url = "https://www.dogstrust.org.uk/rehoming/dogs/whippet/3592141"
        result = scraper._scrape_animal_details_http(url)

        # Test standard fields
        assert result["name"] == "Simone"
        assert result["breed"] == "Whippet"
        assert result["age_text"] is not None
        assert result["sex"] is not None
        assert result["location"] is not None

        # Test properties JSON structure (following Many Tears pattern)
        assert "properties" in result
        properties = result["properties"]

        # Test additional properties from real page content (verified via Firecrawl)
        # Simone should have "Living off site: Yes" based on actual page content
        assert "living_off_site" in properties
        assert properties["living_off_site"] == "Yes"

        # Test that medical_care is not present for Simone (based on screenshot)
        assert "medical_care" not in properties

        # Test description is in properties (critical for database storage)
        assert "description" in properties
        assert len(properties["description"]) > 0

    def test_extract_nala_comprehensive_properties(self, scraper):
        """Test comprehensive extraction for Nala (Italian Corso Dog Cross) with medical_care property.

        Based on PDF screenshot analysis from Phase 2.
        URL: https://www.dogstrust.org.uk/rehoming/dogs/italian-corso-dog/3427428
        """
        url = "https://www.dogstrust.org.uk/rehoming/dogs/italian-corso-dog/3427428"
        result = scraper._scrape_animal_details_http(url)

        # Test standard fields
        assert result["name"] == "Nala"
        assert result["breed"] == "Mixed Breed"  # Standardized from "Italian Corso Dog Cross"

        # Test properties JSON structure
        assert "properties" in result
        properties = result["properties"]

        # Test medical care property from screenshot
        assert "medical_care" in properties
        assert "I need ongoing medical care" in properties["medical_care"]

        # Test description is in properties
        assert "description" in properties

    def test_extract_lucy_comprehensive_properties(self, scraper):
        """Test comprehensive extraction for Lucy (Retriever Labrador) with may_live_with property.

        Based on PDF screenshot analysis from Phase 2.
        URL: https://www.dogstrust.org.uk/rehoming/dogs/retriever-labrador/3593458
        """
        url = "https://www.dogstrust.org.uk/rehoming/dogs/retriever-labrador/3593458"
        result = scraper._scrape_animal_details_http(url)

        # Test standard fields
        assert result["name"] == "Lucy"
        assert result["breed"] == "Labrador Retriever"  # Standardized from "Retriever (Labrador)"

        # Test properties JSON structure
        assert "properties" in result
        properties = result["properties"]

        # Test compatibility property from real page content (verified via Firecrawl)
        # Lucy should have "May live with: Dogs" based on actual page content
        assert "may_live_with" in properties
        assert "Dogs" in properties["may_live_with"]

        # Test description is in properties
        assert "description" in properties

    def test_properties_json_structure_matches_many_tears_pattern(self, scraper):
        """Test that properties JSON structure exactly matches Many Tears Rescue pattern."""
        url = "https://www.dogstrust.org.uk/rehoming/dogs/whippet/3592141"
        result = scraper._scrape_animal_details_http(url)

        # Test that properties is a dictionary (not list or string)
        assert isinstance(result["properties"], dict)

        # Test that description is stored in properties (Many Tears pattern)
        assert "description" in result["properties"]

        # Test that both result and properties have description (compatibility)
        assert result["description"] == result["properties"]["description"]

        # Test Zero NULLs compliance
        assert result["name"] != ""
        assert result["breed"] != ""
        assert result["description"] != ""

    def test_additional_properties_extraction_methods_exist(self, scraper):
        """Test that new modular extraction methods exist."""
        # These methods should be implemented as part of the enhancement
        assert hasattr(scraper, "_extract_additional_properties")
        assert hasattr(scraper, "_extract_medical_care")
        assert hasattr(scraper, "_extract_living_situation")
        assert hasattr(scraper, "_extract_compatibility")

    def test_enhanced_image_extraction(self, scraper):
        """Test that image extraction supports multiple images (image_urls list)."""
        url = "https://www.dogstrust.org.uk/rehoming/dogs/whippet/3592141"
        result = scraper._scrape_animal_details_http(url)

        # Test image_urls list exists (for R2 integration)
        assert "image_urls" in result
        assert isinstance(result["image_urls"], list)

        # Test primary image is also in the list
        if result["primary_image_url"]:
            assert result["primary_image_url"] in result["image_urls"]

    def test_two_part_description_extraction(self, scraper):
        """Test that description extraction handles two-part Dogs Trust pattern."""
        url = "https://www.dogstrust.org.uk/rehoming/dogs/whippet/3592141"
        result = scraper._scrape_animal_details_http(url)

        description = result["description"]

        # Test that description is comprehensive (should be longer with two parts)
        assert len(description) > 100  # Should be substantial with two parts

        # Test that description doesn't contain HTML artifacts
        assert "<h2>" not in description
        assert "<p>" not in description
