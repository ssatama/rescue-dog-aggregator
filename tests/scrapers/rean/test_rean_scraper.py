from unittest.mock import MagicMock, Mock, patch

import pytest

from scrapers.rean.dogs_scraper import REANScraper


class TestREANScraper:
    """Test suite for REAN scraper following TDD approach."""

    @pytest.fixture
    def scraper(self):
        """Create a REAN scraper instance for testing."""
        with (
            patch("scrapers.base_scraper.create_default_sync_service") as mock_sync,
            patch("scrapers.base_scraper.ConfigLoader") as mock_config_loader,
        ):
            # Mock the config loader and organization sync
            mock_config = MagicMock()
            mock_config.name = "REAN Test"
            mock_config.get_scraper_config_dict.return_value = {
                "rate_limit_delay": 2.5,
                "max_retries": 3,
                "timeout": 30,
            }
            mock_config.metadata.website_url = "https://rean.org.uk"

            mock_config_loader.return_value.load_config.return_value = mock_config
            mock_sync_service = Mock()
            mock_sync_service.sync_single_organization.return_value = Mock(organization_id=1, was_created=True)
            mock_sync.return_value = mock_sync_service

            scraper = REANScraper()
            return scraper

    @pytest.fixture
    def sample_romania_text(self):
        """Sample Romania page text for testing."""
        return """
        Bobbie is around 5 months old, rescued from the local kill shelter. He is vaccinated and chipped.
        This little boy desperately needs a home.
        (Updated 22/4/25)

        Jerry is 4 months old, found on the streets. Vaccinated and chipped.
        Sweet boy looking for his forever family.
        (Updated 22/4/25)

        Paloma is around 2 years old, rescued from terrible conditions. She is vaccinated and chipped.
        This girl is ready to travel and needs urgent adoption.
        (Updated 20/4/25)
        """

    @pytest.fixture
    def sample_uk_text(self):
        """Sample UK foster page text for testing."""
        return """
        Toby is 1.5 years old, currently in foster in Norfolk. He is neutered, vaccinated and chipped.
        Toby is a medium size boy who loves walks and playing.
        (Updated 22/4/25)

        Little friendly Max is around 16 kg, fostered in Lincolnshire. Spayed, vaccinated and chipped.
        Max is a gentle soul who gets along with other dogs.
        (Updated 21/4/25)

        Donald is 20kg, in foster care in Derby. Neutered, vaccinated and chipped.
        This big soft boy needs a patient family.
        (Updated 20/4/25)
        """

    def test_split_dog_entries_romania(self, scraper, sample_romania_text):
        """Test splitting Romania page into individual dog entries."""
        entries = scraper.split_dog_entries(sample_romania_text, "romania")

        assert len(entries) == 3
        assert "Bobbie" in entries[0]
        assert "Jerry" in entries[1]
        assert "Paloma" in entries[2]

    def test_split_dog_entries_uk(self, scraper, sample_uk_text):
        """Test splitting UK page into individual dog entries."""
        entries = scraper.split_dog_entries(sample_uk_text, "uk_foster")

        assert len(entries) == 3
        assert "Toby" in entries[0]
        assert "Max" in entries[1]
        assert "Donald" in entries[2]

    def test_extract_name_simple(self, scraper):
        """Test extracting simple dog names."""
        assert scraper.extract_name("Bobbie is around 5 months old") == "Bobbie"
        assert scraper.extract_name("Jerry is 4 months old") == "Jerry"
        assert scraper.extract_name("Paloma is around 2 years old") == "Paloma"

    def test_extract_name_descriptive(self, scraper):
        """Test extracting names from descriptive text."""
        assert scraper.extract_name("Little friendly Toby is 1.5 years") == "Toby"
        assert scraper.extract_name("Puppy Donald is 20kg") == "Donald"
        assert scraper.extract_name("Sweet boy Max is around 16 kg") == "Max"

    def test_extract_age_months(self, scraper):
        """Test extracting age in months."""
        assert scraper.extract_age("Bobbie is around 5 months old") == "5 months"
        assert scraper.extract_age("Jerry is 4 months old") == "4 months"

    def test_extract_age_years(self, scraper):
        """Test extracting age in years."""
        assert scraper.extract_age("Toby is 1.5 years old") == "1.5 years"
        assert scraper.extract_age("Paloma is around 2 years old") == "2 years"

    def test_determine_location_romania(self, scraper):
        """Test location determination for Romania dogs."""
        location = scraper.determine_location("rescued from kill shelter", "romania")
        assert location == "Romania"

    def test_determine_location_uk_cities(self, scraper):
        """Test location determination for UK cities."""
        assert scraper.determine_location("foster in Norfolk", "uk_foster") == "Norfolk"
        assert scraper.determine_location("fostered in Lincolnshire", "uk_foster") == "Lincolnshire"
        assert scraper.determine_location("foster care in Derby", "uk_foster") == "Derby"

    def test_extract_medical_status_romania(self, scraper):
        """Test medical status extraction for Romania dogs."""
        text = "He is vaccinated and chipped"
        status = scraper.extract_medical_status(text)
        assert status == "vaccinated and chipped"

    def test_extract_medical_status_uk(self, scraper):
        """Test medical status extraction for UK dogs."""
        text1 = "He is neutered, vaccinated and chipped"
        text2 = "She is spayed, vaccinated and chipped"

        assert scraper.extract_medical_status(text1) == "neutered, vaccinated and chipped"
        assert scraper.extract_medical_status(text2) == "spayed, vaccinated and chipped"

    def test_assess_urgency_standard(self, scraper):
        """Test urgency assessment for standard cases."""
        text = "Sweet boy looking for his forever family"
        assert scraper.assess_urgency(text) == "standard"

    def test_assess_urgency_urgent(self, scraper):
        """Test urgency assessment for urgent cases."""
        urgent_texts = [
            "desperately needs a home",
            "urgent adoption needed",
            "ready to travel",
            "stuck in shelter",
        ]

        for text in urgent_texts:
            assert scraper.assess_urgency(text) == "urgent"

    def test_extract_weight(self, scraper):
        """Test weight extraction from text."""
        assert scraper.extract_weight("Max is around 16 kg") == 16.0
        assert scraper.extract_weight("Donald is 20kg") == 20.0
        assert scraper.extract_weight("22kg big boy") == 22.0
        assert scraper.extract_weight("no weight mentioned") is None

    def test_predict_size_from_weight(self, scraper):
        """Test size prediction from weight."""
        assert scraper.predict_size_from_weight(10.0) == "Small"
        assert scraper.predict_size_from_weight(20.0) == "Medium"
        assert scraper.predict_size_from_weight(35.0) == "Large"

    def test_predict_size_from_description(self, scraper):
        """Test size prediction from descriptive text."""
        assert scraper.predict_size_from_description("medium size boy") == "Medium"
        assert scraper.predict_size_from_description("big soft boy") == "Large"
        assert scraper.predict_size_from_description("little friendly dog") == "Small"

    def test_extract_dog_data_romania(self, scraper):
        """Test complete data extraction for Romania dog."""
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

    def test_extract_dog_data_uk(self, scraper):
        """Test complete data extraction for UK dog."""
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

    def test_extract_rescue_context(self, scraper):
        """Test rescue story extraction."""
        stories = [
            ("rescued from the local kill shelter", "rescued from kill shelter"),
            ("found on the streets", "found on streets"),
            ("rescued from terrible conditions", "rescued from terrible conditions"),
            ("currently in foster", "in foster care"),
        ]

        for input_text, expected in stories:
            result = scraper.extract_rescue_context(input_text)
            assert expected in result.lower()

    @patch("requests.get")
    def test_scrape_page_success(self, mock_get, scraper):
        """Test successful page scraping."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = "Sample page content"
        mock_get.return_value = mock_response

        result = scraper.scrape_page("https://rean.org.uk/test")
        assert result == "Sample page content"

    @pytest.mark.slow
    @pytest.mark.network
    @pytest.mark.network_dependent
    @patch("requests.get")
    def test_scrape_page_failure(self, mock_get, scraper):
        """Test page scraping failure handling."""
        mock_get.side_effect = Exception("Network error")

        result = scraper.scrape_page("https://rean.org.uk/test")
        assert result is None

    def test_error_handling_malformed_entry(self, scraper):
        """Test handling of malformed entries."""
        malformed_entry = "This is not a proper dog entry without name or age"

        data = scraper.extract_dog_data(malformed_entry, "romania")

        # Should handle gracefully and return None for entries without valid
        # names
        assert data is None

    def test_edge_case_empty_entry(self, scraper):
        """Test handling of empty entries."""
        entries = scraper.split_dog_entries("", "romania")
        assert len(entries) == 0

    def test_edge_case_no_update_timestamp(self, scraper):
        """Test handling text without update timestamps."""
        text_without_updates = "Bobbie is 5 months old. Jerry is 4 months old."
        entries = scraper.split_dog_entries(text_without_updates, "romania")

        # Should return the whole text as one entry if no timestamps found
        assert len(entries) <= 1

    def test_extract_image_from_html_basic(self, scraper):
        """Test basic image extraction from HTML."""
        html_content = """
        <div>
            <img src="https://example.com/dog1.jpg" alt="Dog 1" />
            <img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" />
            <img src="https://img1.wsimg.com/image/dog2.jpg" alt="Dog 2" />
        </div>
        """

        images = scraper.extract_images_from_html(html_content)
        assert len(images) == 2  # Should skip base64 placeholder
        assert "https://example.com/dog1.jpg" in images
        assert "https://img1.wsimg.com/image/dog2.jpg" in images

    def test_extract_image_wsimg_cdn(self, scraper):
        """Test extraction of wsimg.com CDN images (used by REAN)."""
        html_content = """
        <img src="//img1.wsimg.com/isteam/ip/abc123/dog.jpg/:/rs=w:400,h:300" />
        """

        images = scraper.extract_images_from_html(html_content)
        assert len(images) == 1
        # Should normalize protocol-relative URLs
        expected_url = "https://img1.wsimg.com/isteam/ip/abc123/dog.jpg/:/rs=w:400,h:300"
        assert images[0] == expected_url

    def test_extract_image_with_data_src(self, scraper):
        """Test extraction of lazy-loaded images via data-src."""
        html_content = """
        <img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
             data-src="https://example.com/lazy-dog.jpg" />
        """

        images = scraper.extract_images_from_html(html_content)
        assert len(images) == 1
        assert images[0] == "https://example.com/lazy-dog.jpg"

    def test_extract_image_background_style(self, scraper):
        """Test extraction of background images from CSS styles."""
        html_content = """
        <div style="background-image: url('https://example.com/bg-dog.jpg');">
            <p>Dog content</p>
        </div>
        """

        images = scraper.extract_images_from_html(html_content)
        assert len(images) == 1
        assert images[0] == "https://example.com/bg-dog.jpg"

    def test_extract_image_no_valid_images(self, scraper):
        """Test handling when no valid images are found."""
        html_content = """
        <div>
            <img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" />
            <p>No real images here</p>
        </div>
        """

        images = scraper.extract_images_from_html(html_content)
        assert len(images) == 0

    # === Browser-based Image Extraction Tests (TDD) ===

    def test_browser_image_extraction_interface(self, scraper):
        """Test that browser image extraction method interface exists."""
        # RED: This should fail initially as method doesn't exist yet
        assert hasattr(scraper, "extract_images_with_browser")
        assert callable(getattr(scraper, "extract_images_with_browser"))

    @pytest.mark.slow
    @pytest.mark.selenium
    @pytest.mark.browser
    @patch("scrapers.rean.dogs_scraper.webdriver.Chrome")
    def test_extract_images_with_browser_basic(self, mock_chrome, scraper):
        """Test basic browser-based image extraction functionality."""
        # Mock WebDriver setup
        mock_driver = MagicMock()
        mock_chrome.return_value = mock_driver

        # Mock execute_script to return appropriate values
        mock_driver.execute_script.side_effect = lambda script: 1000 if "scrollHeight" in script else None

        # Mock image elements with wsimg.com URLs (REAN CDN)
        mock_img1 = MagicMock()
        mock_img1.get_attribute.return_value = "https://img1.wsimg.com/isteam/ip/abc123/dog1.jpg"

        mock_img2 = MagicMock()
        mock_img2.get_attribute.return_value = "https://img1.wsimg.com/isteam/ip/def456/dog2.jpg"

        mock_placeholder = MagicMock()
        mock_placeholder.get_attribute.return_value = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="

        mock_driver.find_elements.return_value = [
            mock_img1,
            mock_img2,
            mock_placeholder,
        ]

        # Test extraction
        images = scraper.extract_images_with_browser("https://rean.org.uk/test")

        # Verify WebDriver was used correctly
        mock_chrome.assert_called_once()
        mock_driver.get.assert_called_once_with("https://rean.org.uk/test")
        mock_driver.quit.assert_called_once()

        # Should return only wsimg.com URLs, not placeholders
        assert len(images) == 2
        assert "https://img1.wsimg.com/isteam/ip/abc123/dog1.jpg" in images
        assert "https://img1.wsimg.com/isteam/ip/def456/dog2.jpg" in images

    @pytest.mark.slow
    @pytest.mark.selenium
    @pytest.mark.browser
    @patch("scrapers.rean.dogs_scraper.webdriver.Chrome")
    @patch("scrapers.rean.dogs_scraper.time.sleep")
    def test_extract_images_with_browser_waits_for_loading(self, mock_sleep, mock_chrome, scraper):
        """Test that browser extraction waits for JavaScript loading."""
        mock_driver = MagicMock()
        mock_chrome.return_value = mock_driver
        mock_driver.find_elements.return_value = []
        mock_driver.execute_script.side_effect = lambda script: 1000 if "scrollHeight" in script else None

        scraper.extract_images_with_browser("https://rean.org.uk/test")

        # Should wait for JavaScript to execute
        assert mock_sleep.call_count >= 1

        # Should scroll to trigger lazy loading
        mock_driver.execute_script.assert_called()
        scroll_calls = [call for call in mock_driver.execute_script.call_args_list if "scrollTo" in str(call)]
        assert len(scroll_calls) > 0

    @pytest.mark.slow
    @pytest.mark.selenium
    @pytest.mark.browser
    @patch("scrapers.rean.dogs_scraper.webdriver.Chrome")
    def test_extract_images_with_browser_filters_wsimg_only(self, mock_chrome, scraper):
        """Test that browser extraction only returns wsimg.com CDN images."""
        mock_driver = MagicMock()
        mock_chrome.return_value = mock_driver
        mock_driver.execute_script.side_effect = lambda script: 1000 if "scrollHeight" in script else None

        # Mock various image sources
        mock_images = []

        # Valid wsimg.com image
        mock_img1 = MagicMock()
        mock_img1.get_attribute.return_value = "https://img1.wsimg.com/isteam/ip/abc123/dog.jpg"
        mock_images.append(mock_img1)

        # Invalid external image
        mock_img2 = MagicMock()
        mock_img2.get_attribute.return_value = "https://example.com/random.jpg"
        mock_images.append(mock_img2)

        # Placeholder image
        mock_img3 = MagicMock()
        mock_img3.get_attribute.return_value = "data:image/gif;base64,abc123"
        mock_images.append(mock_img3)

        # Empty src
        mock_img4 = MagicMock()
        mock_img4.get_attribute.return_value = ""
        mock_images.append(mock_img4)

        mock_driver.find_elements.return_value = mock_images

        images = scraper.extract_images_with_browser("https://rean.org.uk/test")

        # Should only return wsimg.com URLs
        assert len(images) == 1
        assert images[0] == "https://img1.wsimg.com/isteam/ip/abc123/dog.jpg"

    @patch("scrapers.rean.dogs_scraper.get_browser_service")
    def test_extract_images_with_browser_handles_errors(self, mock_browser_service, scraper):
        """Test browser extraction handles WebDriver errors gracefully."""
        # Mock browser service that raises exception when creating driver
        mock_service = MagicMock()
        mock_browser_service.return_value = mock_service
        mock_service.create_driver.side_effect = Exception("WebDriver failed to start")

        images = scraper.extract_images_with_browser("https://rean.org.uk/test")

        # Should return empty list on error, not crash
        assert images == []

    @pytest.mark.slow
    @pytest.mark.selenium
    @pytest.mark.browser
    @patch("scrapers.rean.dogs_scraper.webdriver.Chrome")
    def test_extract_images_with_browser_configuration(self, mock_chrome, scraper):
        """Test browser is configured correctly for headless operation."""
        mock_driver = MagicMock()
        mock_chrome.return_value = mock_driver
        mock_driver.find_elements.return_value = []
        mock_driver.execute_script.side_effect = lambda script: 1000 if "scrollHeight" in script else None

        scraper.extract_images_with_browser("https://rean.org.uk/test")

        # Verify Chrome was configured (will check specific options in
        # implementation)
        mock_chrome.assert_called_once()

    # === Image-to-Dog Association Tests ===

    def test_associate_images_with_dogs_interface(self, scraper):
        """Test that image association method interface exists."""
        # RED: This should fail initially as method doesn't exist yet
        assert hasattr(scraper, "associate_images_with_dogs")
        assert callable(getattr(scraper, "associate_images_with_dogs"))

    def test_associate_images_with_dogs_basic(self, scraper):
        """Test basic image-to-dog association."""
        dog_data_list = [
            {"name": "Toby", "age_text": "1.5 years"},
            {"name": "Max", "age_text": "16 months"},
            {"name": "Donald", "age_text": "2 years"},
        ]

        image_urls = [
            "https://img1.wsimg.com/isteam/ip/abc123/dog1.jpg",
            "https://img1.wsimg.com/isteam/ip/def456/dog2.jpg",
            "https://img1.wsimg.com/isteam/ip/ghi789/dog3.jpg",
        ]

        # Test position-based association
        result = scraper.associate_images_with_dogs(dog_data_list, image_urls)

        assert len(result) == 3
        assert result[0]["name"] == "Toby"
        assert result[0]["primary_image_url"] == "https://img1.wsimg.com/isteam/ip/abc123/dog1.jpg"
        assert result[1]["name"] == "Max"
        assert result[1]["primary_image_url"] == "https://img1.wsimg.com/isteam/ip/def456/dog2.jpg"
        assert result[2]["name"] == "Donald"
        assert result[2]["primary_image_url"] == "https://img1.wsimg.com/isteam/ip/ghi789/dog3.jpg"

    def test_associate_images_with_dogs_fewer_images(self, scraper):
        """Test association when there are fewer images than dogs."""
        dog_data_list = [
            {"name": "Toby", "age_text": "1.5 years"},
            {"name": "Max", "age_text": "16 months"},
            {"name": "Donald", "age_text": "2 years"},
        ]

        image_urls = ["https://img1.wsimg.com/isteam/ip/abc123/dog1.jpg"]

        result = scraper.associate_images_with_dogs(dog_data_list, image_urls)

        assert len(result) == 3
        assert result[0]["primary_image_url"] == "https://img1.wsimg.com/isteam/ip/abc123/dog1.jpg"
        assert "primary_image_url" not in result[1]  # No image assigned
        assert "primary_image_url" not in result[2]  # No image assigned

    def test_associate_images_with_dogs_more_images(self, scraper):
        """Test association when there are more images than dogs."""
        dog_data_list = [{"name": "Toby", "age_text": "1.5 years"}]

        image_urls = [
            "https://img1.wsimg.com/isteam/ip/abc123/dog1.jpg",
            "https://img1.wsimg.com/isteam/ip/def456/dog2.jpg",
            "https://img1.wsimg.com/isteam/ip/ghi789/dog3.jpg",
        ]

        result = scraper.associate_images_with_dogs(dog_data_list, image_urls)

        assert len(result) == 1
        # With improved association logic, excess images trigger offset detection
        # 1 dog + 3 images (ratio > 1.5) triggers offset of 2, so dog gets 3rd
        # image
        assert result[0]["primary_image_url"] == "https://img1.wsimg.com/isteam/ip/ghi789/dog3.jpg"

    def test_associate_images_with_dogs_no_images(self, scraper):
        """Test association when no images are available."""
        dog_data_list = [
            {"name": "Toby", "age_text": "1.5 years"},
            {"name": "Max", "age_text": "16 months"},
        ]

        image_urls = []

        result = scraper.associate_images_with_dogs(dog_data_list, image_urls)

        assert len(result) == 2
        assert "primary_image_url" not in result[0]
        assert "primary_image_url" not in result[1]
