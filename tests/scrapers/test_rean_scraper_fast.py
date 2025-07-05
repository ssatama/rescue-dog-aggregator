"""
Fast unit tests for REAN scraper core logic.

These tests focus on the core business logic without expensive WebDriver operations,
providing quick feedback during development. They complement the comprehensive slow tests.
"""

from unittest.mock import MagicMock, Mock, patch

import pytest

from scrapers.rean.dogs_scraper import REANScraper


class TestREANScraperFast:
    """Fast unit tests for REAN scraper core logic."""

    @pytest.fixture
    def scraper(self):
        """Create a REAN scraper instance for testing."""
        with patch("scrapers.base_scraper.OrganizationSyncManager") as mock_sync, patch("scrapers.base_scraper.ConfigLoader") as mock_config_loader:

            mock_config = MagicMock()
            mock_config.name = "REAN Test"
            mock_config.get_scraper_config_dict.return_value = {"rate_limit_delay": 0.1, "max_retries": 1, "timeout": 5}  # Faster for tests  # Fewer retries for speed  # Shorter timeout
            mock_config.metadata.website_url = "https://rean.org.uk"

            mock_config_loader.return_value.load_config.return_value = mock_config
            mock_sync.return_value.sync_organization.return_value = (1, True)

            scraper = REANScraper()
            return scraper

    @pytest.mark.unit
    def test_extract_name_patterns(self, scraper):
        """Test name extraction patterns quickly."""
        test_cases = [
            ("Bobbie is around 5 months old", "Bobbie"),
            ("Little friendly Toby is 1.5 years", "Toby"),
            ("Sweet boy Max is around 16 kg", "Max"),
            ("Puppy Donald is 20kg", "Donald"),
        ]

        for text, expected in test_cases:
            assert scraper.extract_name(text) == expected

    @pytest.mark.unit
    def test_extract_name_filters_organization_name(self, scraper):
        """Test that organization name 'REAN' is filtered out."""
        test_cases = [
            ("REAN is looking for homes", None),
            ("rean needs your help", None),
            ("Rean dogs available", None),
            ("REAN", None),
            ("Reana is a sweet dog", "Reana"),  # Valid name similar to REAN
            ("Dean is 2 years old", "Dean"),  # Valid name containing 'ean'
        ]

        for text, expected in test_cases:
            assert scraper.extract_name(text) == expected

    @pytest.mark.unit
    def test_extract_age_patterns(self, scraper):
        """Test age extraction patterns quickly."""
        test_cases = [
            ("Bobbie is around 5 months old", "5 months"),
            ("Jerry is 4 months old", "4 months"),
            ("Toby is 1.5 years old", "1.5 years"),
            ("Paloma is around 2 years old", "2 years"),
        ]

        for text, expected in test_cases:
            assert scraper.extract_age(text) == expected

    @pytest.mark.unit
    def test_determine_location_logic(self, scraper):
        """Test location determination logic quickly."""
        # Romania cases
        assert scraper.determine_location("rescued from kill shelter", "romania") == "Romania"
        assert scraper.determine_location("found on streets", "romania") == "Romania"

        # UK cases
        assert scraper.determine_location("foster in Norfolk", "uk_foster") == "Norfolk"
        assert scraper.determine_location("fostered in Lincolnshire", "uk_foster") == "Lincolnshire"
        assert scraper.determine_location("foster care in Derby", "uk_foster") == "Derby"

    @pytest.mark.unit
    def test_weight_extraction_patterns(self, scraper):
        """Test weight extraction patterns quickly."""
        test_cases = [
            ("Max is around 16 kg", 16.0),
            ("Donald is 20kg", 20.0),
            ("22kg big boy", 22.0),
            ("no weight mentioned", None),
        ]

        for text, expected in test_cases:
            assert scraper.extract_weight(text) == expected

    @pytest.mark.unit
    def test_size_prediction_logic(self, scraper):
        """Test size prediction logic quickly."""
        # Weight-based predictions
        assert scraper.predict_size_from_weight(10.0) == "Small"
        assert scraper.predict_size_from_weight(20.0) == "Medium"
        assert scraper.predict_size_from_weight(35.0) == "Large"

        # Description-based predictions
        assert scraper.predict_size_from_description("medium size boy") == "Medium"
        assert scraper.predict_size_from_description("big soft boy") == "Large"
        assert scraper.predict_size_from_description("little friendly dog") == "Small"

    @pytest.mark.unit
    def test_medical_status_extraction(self, scraper):
        """Test medical status extraction quickly."""
        test_cases = [
            ("He is vaccinated and chipped", "vaccinated and chipped"),
            ("She is spayed, vaccinated and chipped", "spayed, vaccinated and chipped"),
            ("He is neutered, vaccinated and chipped", "neutered, vaccinated and chipped"),
        ]

        for text, expected in test_cases:
            assert scraper.extract_medical_status(text) == expected

    @pytest.mark.unit
    def test_urgency_assessment_logic(self, scraper):
        """Test urgency assessment logic quickly."""
        # Standard cases
        standard_texts = [
            "Sweet boy looking for his forever family",
            "Friendly dog needs home",
            "Looking for adoption",
        ]
        for text in standard_texts:
            assert scraper.assess_urgency(text) == "standard"

        # Urgent cases
        urgent_texts = [
            "desperately needs a home",
            "urgent adoption needed",
            "ready to travel",
            "stuck in shelter",
        ]
        for text in urgent_texts:
            assert scraper.assess_urgency(text) == "urgent"

    @pytest.mark.unit
    def test_image_url_validation(self, scraper):
        """Test image URL validation logic quickly."""
        # Valid URLs
        valid_urls = [
            "https://img1.wsimg.com/isteam/ip/abc123/dog.jpg",
            "https://img1.wsimg.com/isteam/ip/def456/puppy.jpg",
            "//img1.wsimg.com/isteam/ip/ghi789/animal.jpg",
        ]
        for url in valid_urls:
            assert scraper._is_valid_rean_image(url) is True

        # Invalid URLs
        invalid_urls = [
            "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=",
            "https://example.com/random.jpg",
            "",
            None,
            "not-a-url",
        ]
        for url in invalid_urls:
            assert scraper._is_valid_rean_image(url) is False

    @pytest.mark.unit
    def test_dog_data_extraction_romania(self, scraper):
        """Test complete dog data extraction for Romania (fast)."""
        entry = """
        Bobbie is around 5 months old, rescued from the local kill shelter.
        He is vaccinated and chipped. This little boy desperately needs a home.
        """

        data = scraper.extract_dog_data(entry, "romania")

        assert data["name"] == "Bobbie"
        assert data["age_text"] == "5 months"
        assert data["properties"]["source_page"] == "romania"
        assert data["properties"]["current_location"] == "Romania"
        assert data["properties"]["transport_required"] is True
        assert data["properties"]["medical_status"] == "vaccinated and chipped"
        assert data["properties"]["urgency_level"] == "urgent"

    @pytest.mark.unit
    def test_dog_data_extraction_uk(self, scraper):
        """Test complete dog data extraction for UK (fast)."""
        entry = """
        Toby is 1.5 years old, currently in foster in Norfolk.
        He is neutered, vaccinated and chipped. Toby is a medium size boy.
        """

        data = scraper.extract_dog_data(entry, "uk_foster")

        assert data["name"] == "Toby"
        assert data["age_text"] == "1.5 years"
        assert data["properties"]["source_page"] == "uk_foster"
        assert data["properties"]["current_location"] == "Norfolk"
        assert data["properties"]["transport_required"] is False
        assert data["properties"]["medical_status"] == "neutered, vaccinated and chipped"
        assert data["properties"]["urgency_level"] == "standard"

    @pytest.mark.unit
    def test_image_association_logic_basic(self, scraper):
        """Test basic image association logic quickly."""
        dog_data_list = [
            {"name": "Toby", "age_text": "1.5 years"},
            {"name": "Max", "age_text": "16 months"},
        ]

        image_urls = [
            "https://img1.wsimg.com/isteam/ip/abc123/dog1.jpg",
            "https://img1.wsimg.com/isteam/ip/def456/dog2.jpg",
        ]

        result = scraper.associate_images_with_dogs(dog_data_list, image_urls)

        assert len(result) == 2
        assert result[0]["name"] == "Toby"
        assert result[0]["primary_image_url"] == "https://img1.wsimg.com/isteam/ip/abc123/dog1.jpg"
        assert result[1]["name"] == "Max"
        assert result[1]["primary_image_url"] == "https://img1.wsimg.com/isteam/ip/def456/dog2.jpg"

    @pytest.mark.unit
    def test_image_association_edge_cases(self, scraper):
        """Test image association edge cases quickly."""
        dog_data_list = [{"name": "Toby", "age_text": "1.5 years"}]

        # More images than dogs
        many_images = [f"https://img1.wsimg.com/isteam/ip/abc{i}/dog.jpg" for i in range(5)]
        result = scraper.associate_images_with_dogs(dog_data_list, many_images)
        assert len(result) == 1
        assert "primary_image_url" in result[0]

        # No images
        result = scraper.associate_images_with_dogs(dog_data_list, [])
        assert len(result) == 1
        assert "primary_image_url" not in result[0]

    @pytest.mark.unit
    def test_html_image_extraction_logic(self, scraper):
        """Test HTML image extraction logic quickly."""
        html_content = """
        <div>
            <img src="https://img1.wsimg.com/isteam/ip/abc/dog1.jpg" alt="Dog 1" />
            <img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" />
            <img src="https://example.com/external.jpg" alt="External" />
        </div>
        """

        images = scraper.extract_images_from_html(html_content)
        # Should include both wsimg and external images (base method behavior)
        assert len(images) == 2
        assert "https://img1.wsimg.com/isteam/ip/abc/dog1.jpg" in images
        assert "https://example.com/external.jpg" in images

    @pytest.mark.unit
    def test_error_handling_malformed_data(self, scraper):
        """Test error handling with malformed data quickly."""
        # Test with invalid entry (method tries to extract but gets poor data)
        result = scraper.extract_dog_data("Random text without dog info", "romania")
        # The method may return data but it should be recognizably poor quality
        if result is not None:
            # Check that name extraction found something questionable
            assert result.get("name") in ["Random", None] or len(result.get("name", "")) < 3

        # Test with empty entry
        result = scraper.extract_dog_data("", "romania")
        assert result is None

        # Test with None
        result = scraper.extract_dog_data(None, "romania")
        assert result is None

    @pytest.mark.unit
    def test_container_validation_logic(self, scraper):
        """Test container validation logic quickly."""
        # Mock containers
        valid_container = Mock()
        valid_container.text = "Toby - 4 months old - in Romania\nVaccinated and chipped."

        invalid_container = Mock()
        invalid_container.text = "Just some random text with no dog info."

        containers = [valid_container, invalid_container]
        validated = scraper._validate_dog_containers(containers)

        assert len(validated) == 1
        assert validated[0] == valid_container

    @pytest.mark.unit
    @patch("requests.get")
    def test_scrape_page_success_fast(self, mock_get, scraper):
        """Test successful page scraping quickly."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = "Sample page content"
        mock_get.return_value = mock_response

        result = scraper.scrape_page("https://rean.org.uk/test")
        assert result == "Sample page content"
        mock_get.assert_called_once()
