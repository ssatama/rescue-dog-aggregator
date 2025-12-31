"""
Consolidated parsing and text extraction tests for REAN scraper.

This module contains all unit tests for REAN's text parsing, data extraction,
and transformation logic without requiring network or browser operations.
"""

from unittest.mock import MagicMock, Mock, patch

import pytest

from scrapers.rean.dogs_scraper import REANScraper


class TestREANParsing:
    """Test suite for REAN text parsing and extraction logic."""

    @pytest.fixture
    def scraper(self):
        """Create a REAN scraper instance for testing."""
        with (
            patch("scrapers.base_scraper.create_default_sync_service") as mock_sync,
            patch("scrapers.base_scraper.ConfigLoader") as mock_config_loader,
        ):
            mock_config = MagicMock()
            mock_config.name = "REAN Test"
            mock_config.get_scraper_config_dict.return_value = {
                "rate_limit_delay": 0.1,
                "max_retries": 1,
                "timeout": 5,
            }
            mock_config.metadata.website_url = "https://rean.org.uk"

            mock_config_loader.return_value.load_config.return_value = mock_config
            mock_sync_service = Mock()
            mock_sync_service.sync_single_organization.return_value = Mock(organization_id=1, was_created=True)
            mock_sync.return_value = mock_sync_service

            return REANScraper()

    @pytest.mark.unit
    def test_extract_name_patterns(self, scraper):
        """Test name extraction with various patterns."""
        test_cases = [
            # Standard patterns
            ("Bobbie is around 5 months old", "Bobbie"),
            ("Jerry is 4 months old", "Jerry"),
            ("Paloma is around 2 years old", "Paloma"),
            # Descriptive patterns
            ("Little friendly Toby is 1.5 years", "Toby"),
            ("Sweet boy Max is around 16 kg", "Max"),
            ("Puppy Donald is 20kg", "Donald"),
            # Edge cases
            ("REAN is looking for homes", None),  # Organization name filtered
            ("Reana is a sweet dog", "Reana"),  # Similar to REAN but valid
            # Location prefix patterns
            ("- Wrexham Nala is 2 years old", "Nala"),
            ("- in Romania Tiny is 6 months old", "Tiny"),
        ]

        for text, expected in test_cases:
            assert scraper.extract_name(text) == expected

    @pytest.mark.unit
    @pytest.mark.parametrize(
        "text,expected",
        [
            ("5 months old", "5 months"),
            ("around 5 months old", "5 months"),
            ("1.5 years old", "1.5 years"),
            ("around 2 years old", "2 years"),
            ("no age here", None),
        ],
    )
    def test_extract_age(self, scraper, text, expected):
        """Test age extraction with parametrized inputs."""
        assert scraper.extract_age(text) == expected

    @pytest.mark.unit
    def test_determine_location(self, scraper):
        """Test location determination logic."""
        # Romania always returns "Romania"
        assert scraper.determine_location("any text", "romania") == "Romania"

        # UK extracts specific cities
        uk_cases = [
            ("foster in Norfolk", "Norfolk"),
            ("fostered in Lincolnshire", "Lincolnshire"),
            ("foster care in Derby", "Derby"),
            ("no specific location", "UK"),  # Default
        ]

        for text, expected in uk_cases:
            assert scraper.determine_location(text, "uk_foster") == expected

    @pytest.mark.unit
    def test_medical_status_extraction(self, scraper):
        """Test medical status extraction patterns."""
        test_cases = [
            ("He is vaccinated and chipped", "vaccinated and chipped"),
            ("She is spayed, vaccinated and chipped", "spayed, vaccinated and chipped"),
            (
                "He is neutered, vaccinated and chipped",
                "neutered, vaccinated and chipped",
            ),
            ("no medical info", None),
        ]

        for text, expected in test_cases:
            assert scraper.extract_medical_status(text) == expected

    @pytest.mark.unit
    def test_urgency_assessment(self, scraper):
        """Test urgency level assessment."""
        urgent_keywords = [
            "desperately",
            "urgent",
            "emergency",
            "stuck",
            "ready to travel",
        ]

        for keyword in urgent_keywords:
            assert scraper.assess_urgency(f"Dog {keyword} needs home") == "urgent"

        assert scraper.assess_urgency("Sweet dog looking for family") == "standard"

    @pytest.mark.unit
    def test_weight_and_size_prediction(self, scraper):
        """Test weight extraction and size prediction."""
        # Weight extraction
        assert scraper.extract_weight("Max is around 16 kg") == 16.0
        assert scraper.extract_weight("Donald is 20kg") == 20.0
        assert scraper.extract_weight("no weight") is None

        # Size from weight
        assert scraper.predict_size_from_weight(10.0) == "Small"
        assert scraper.predict_size_from_weight(20.0) == "Medium"
        assert scraper.predict_size_from_weight(35.0) == "Large"

        # Size from description
        assert scraper.predict_size_from_description("little dog") == "Small"
        assert scraper.predict_size_from_description("medium size boy") == "Medium"
        assert scraper.predict_size_from_description("big soft boy") == "Large"

    @pytest.mark.unit
    def test_description_extraction(self, scraper):
        """Test description extraction for About section."""
        # Test proper cleanup and formatting
        text = """
        Lucky - 7 months old
        Lucky is a playful and energetic little pup. He can be transported to the UK
        with all the necessary paperwork. He's currently in foster care and needs
        a loving home. (Updated 22/4/25)
        """

        description = scraper.extract_description_for_about_section(text)

        # Should remove redundant prefix
        assert not description.startswith("Lucky - 7 months old")
        # Should preserve update timestamp
        assert "(Updated 22/4/25)" in description
        # Should keep meaningful content
        assert "playful and energetic" in description

    @pytest.mark.unit
    def test_description_no_truncation(self, scraper):
        """Test that descriptions are not truncated at 300 chars."""
        long_text = "Lucky is 7 months old. " + ("He loves to play. " * 50) + "(Updated 22/4/25)"

        description = scraper.extract_description_for_about_section(long_text)

        # Should be much longer than 300 chars
        assert len(description) > 300
        # Should preserve update timestamp
        assert "(Updated 22/4/25)" in description

    @pytest.mark.unit
    def test_complete_dog_data_extraction(self, scraper):
        """Test complete dog data extraction for both Romania and UK."""
        # Romania dog
        romania_entry = """
        Bobbie is around 5 months old, rescued from the local kill shelter.
        He is vaccinated and chipped. This little boy desperately needs a home.
        (Updated 22/4/25)
        """

        romania_data = scraper.extract_dog_data(romania_entry, "romania")

        assert romania_data["name"] == "Bobbie"
        assert romania_data["age_text"] == "5 months"
        assert romania_data["properties"]["current_location"] == "Romania"
        assert romania_data["properties"]["transport_required"] is True
        assert romania_data["properties"]["medical_status"] == "vaccinated and chipped"
        assert romania_data["properties"]["urgency_level"] == "urgent"
        assert "(Updated 22/4/25)" in romania_data["properties"]["description"]

        # UK foster dog
        uk_entry = """
        Toby is 1.5 years old, currently in foster in Norfolk.
        He is neutered, vaccinated and chipped. Toby is a medium size boy.
        (Updated 21/4/25)
        """

        uk_data = scraper.extract_dog_data(uk_entry, "uk_foster")

        assert uk_data["name"] == "Toby"
        assert uk_data["age_text"] == "1.5 years"
        assert uk_data["properties"]["current_location"] == "Norfolk"
        assert uk_data["properties"]["transport_required"] is False
        assert uk_data["properties"]["medical_status"] == "neutered, vaccinated and chipped"
        assert uk_data["properties"]["size_prediction"] == "Medium"

    @pytest.mark.unit
    def test_split_dog_entries(self, scraper):
        """Test splitting page text into individual dog entries."""
        page_text = """
        Bobbie is around 5 months old, rescued from the kill shelter.
        He is vaccinated and chipped.
        (Updated 22/4/25)

        Jerry is 4 months old, found on the streets.
        Vaccinated and chipped.
        (Updated 22/4/25)

        Paloma is around 2 years old, rescued from terrible conditions.
        She is vaccinated and chipped.
        (Updated 20/4/25)
        """

        entries = scraper.split_dog_entries(page_text, "romania")

        assert len(entries) == 3
        assert "Bobbie" in entries[0]
        assert "Jerry" in entries[1]
        assert "Paloma" in entries[2]

    @pytest.mark.unit
    def test_age_standardization(self, scraper):
        """Test age text to months conversion."""
        assert scraper.standardize_age_to_months("5 months") == 5
        assert scraper.standardize_age_to_months("1.5 years") == 18
        assert scraper.standardize_age_to_months("2 years") == 24
        assert scraper.standardize_age_to_months("invalid") is None

    @pytest.mark.unit
    def test_html_image_extraction(self, scraper):
        """Test image extraction from HTML content."""
        html_content = """
        <div>
            <img src="https://img1.wsimg.com/isteam/ip/abc/dog1.jpg" alt="Dog 1" />
            <img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" />
            <img data-src="https://img1.wsimg.com/isteam/ip/def/dog2.jpg" />
            <div style="background-image: url('https://img1.wsimg.com/isteam/ip/ghi/dog3.jpg');"></div>
        </div>
        """

        images = scraper.extract_images_from_html(html_content)

        assert len(images) == 3  # Should skip base64 placeholder
        assert all("wsimg.com" in url for url in images)

    @pytest.mark.unit
    def test_image_url_validation(self, scraper):
        """Test REAN-specific image URL validation."""
        # Valid REAN images
        assert scraper._is_valid_rean_image("https://img1.wsimg.com/isteam/ip/abc/dog.jpg")
        assert scraper._is_valid_rean_image("//img1.wsimg.com/isteam/ip/def/puppy.jpg")

        # Invalid images
        assert not scraper._is_valid_rean_image("data:image/gif;base64,abc")
        assert not scraper._is_valid_rean_image("https://example.com/dog.jpg")
        assert not scraper._is_valid_rean_image("")
        assert not scraper._is_valid_rean_image(None)

    @pytest.mark.unit
    def test_wsimg_url_cleaning(self, scraper):
        """Test cleaning of wsimg.com URLs for Cloudinary."""
        # URL with transformations
        original = "https://img1.wsimg.com/isteam/ip/abc/dog.jpg/:/cr=t:12.5%25,l:0%25,w:100%25,h:75%25/rs=w:600,h:600,cg:true"
        cleaned = scraper._clean_wsimg_url(original)
        assert cleaned == "https://img1.wsimg.com/isteam/ip/abc/dog.jpg"

        # URL without transformations
        clean_url = "https://img1.wsimg.com/isteam/ip/abc/dog.jpg"
        assert scraper._clean_wsimg_url(clean_url) == clean_url

    @pytest.mark.unit
    def test_image_association_with_offset_detection(self, scraper):
        """Test image association with automatic offset detection."""
        # Scenario: 3 dogs, 4 images (1 header)
        dog_data_list = [
            {"name": "Bella", "age_text": "2 years"},
            {"name": "Charlie", "age_text": "6 months"},
            {"name": "Daisy", "age_text": "4 years"},
        ]

        image_urls = [
            "https://img1.wsimg.com/isteam/ip/123/header.jpg",  # Header
            "https://img1.wsimg.com/isteam/ip/123/bella.jpg",
            "https://img1.wsimg.com/isteam/ip/123/charlie.jpg",
            "https://img1.wsimg.com/isteam/ip/123/daisy.jpg",
        ]

        result = scraper.associate_images_with_dogs(dog_data_list, image_urls)

        # Should detect offset of 1 and associate correctly
        assert result[0]["primary_image_url"] == image_urls[1]  # Bella
        assert result[1]["primary_image_url"] == image_urls[2]  # Charlie
        assert result[2]["primary_image_url"] == image_urls[3]  # Daisy

    @pytest.mark.unit
    def test_standardize_animal_data(self, scraper):
        """Test data standardization for database format."""
        dog_data = {
            "name": "Lucky",
            "age_text": "7 months",
            "properties": {
                "current_location": "Romania",
                "medical_status": "vaccinated and chipped",
                "size_prediction": "Small",
                "description": "Sweet puppy looking for home",
            },
            "primary_image_url": "https://img1.wsimg.com/dog.jpg",
        }

        standardized = scraper.standardize_animal_data(dog_data, "romania")

        assert standardized["name"] == "Lucky"
        assert standardized["animal_type"] == "dog"
        assert standardized["age_min_months"] == 7
        assert standardized["age_max_months"] == 9  # Unified standardization expands range to 7-9 months
        assert standardized["size"] == "Small"
        assert standardized["language"] == "en"
        assert "external_id" in standardized
        assert standardized["primary_image_url"] == dog_data["primary_image_url"]
        assert standardized["original_image_url"] == dog_data["primary_image_url"]
