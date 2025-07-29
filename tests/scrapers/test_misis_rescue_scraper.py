from unittest.mock import MagicMock, Mock, patch

import pytest
from bs4 import BeautifulSoup

# This import will fail initially - that's expected!
from scrapers.misis_rescue.scraper import MisisRescueScraper


class TestMisisRescueScraper:
    """Test main scraper functionality."""

    @pytest.fixture
    def scraper(self):
        """Create scraper with mocked dependencies."""
        with patch("scrapers.base_scraper.create_default_sync_service") as mock_sync, patch("scrapers.base_scraper.ConfigLoader") as mock_loader, patch("scrapers.base_scraper.R2Service"):

            # Mock the sync manager to return organization_id
            mock_sync_instance = Mock()
            mock_sync_instance.sync_single_organization.return_value = Mock(organization_id=1, was_created=True)
            mock_sync.return_value = mock_sync_instance

            mock_config = MagicMock()
            mock_config.get_scraper_config_dict.return_value = {"rate_limit_delay": 0.1, "max_retries": 1, "timeout": 10}
            mock_config.name = "MisisRescue"
            mock_loader.return_value.load_config.return_value = mock_config

            return MisisRescueScraper(config_id="misisrescue")

    def test_initialization(self, scraper):
        """Test scraper initializes correctly."""
        assert scraper.base_url == "https://www.misisrescue.com"
        assert scraper.listing_url == "https://www.misisrescue.com/available-for-adoption"
        assert scraper.detail_parser is not None

    def test_skips_reserved_section(self, scraper):
        """Test that scraper correctly identifies and skips reserved dogs."""
        # CRITICAL TEST - must skip reserved section!
        # Mock HTML with both available and reserved sections
        html_with_reserved = """
        <html>
        <body>
            <div id="available-section">
                <a href="/post/dog1">Dog 1</a>
                <a href="/post/dog2">Dog 2</a>
            </div>
            <h2>💙⭐Reserved⭐💙</h2>
            <div id="reserved-section">
                <a href="/post/reserved-dog">Reserved Dog</a>
            </div>
        </body>
        </html>
        """

        soup = BeautifulSoup(html_with_reserved, "html.parser")

        # Test reserved section detection
        reserved_heading = soup.find("h2", string=lambda text: text and "reserved" in text.lower())
        assert scraper._is_reserved_section(reserved_heading)

        # Test that we can find available dogs before reserved section
        available_dogs = scraper._extract_dogs_before_reserved(soup)
        assert len(available_dogs) == 2
        assert all("reserved" not in dog["url"].lower() for dog in available_dogs)

    def test_extract_dog_urls_from_page(self, scraper):
        """Test extracting dog URLs from listing page."""
        # Mock HTML structure based on DOM analysis
        mock_html = """
        <html>
        <body>
            <main class="PAGES_CONTAINER">
                <a href="/post/available-dog-1" class="O16KGI pu51Xe JnzaaY xs2MeC">Dog 1</a>
                <a href="/post/available-dog-2" class="O16KGI pu51Xe JnzaaY xs2MeC">Dog 2</a>
                <a href="/post/available-dog-3" class="O16KGI pu51Xe JnzaaY xs2MeC">Dog 3</a>
            </main>
        </body>
        </html>
        """

        with patch("scrapers.misis_rescue.scraper.webdriver.Chrome") as mock_driver:
            mock_driver_instance = Mock()
            mock_driver.return_value = mock_driver_instance
            mock_driver_instance.page_source = mock_html

            urls = scraper._extract_dog_urls_from_page(1)

            assert len(urls) == 3
            assert all("/post/" in url for url in urls)
            assert all("available-dog" in url for url in urls)

    def test_pagination_logic(self, scraper):
        """Test pagination handling for multiple pages."""
        # Screenshots show pages 1-4
        with patch.object(scraper, "_extract_dog_urls_from_page") as mock_extract:
            # Mock first 3 pages have dogs, page 4 is empty
            mock_extract.side_effect = [["url1", "url2", "url3"], ["url4", "url5"], ["url6"], []]  # Page 1  # Page 2  # Page 3  # Page 4 - empty

            all_urls = scraper._get_all_dog_urls()

            assert len(all_urls) == 6
            assert mock_extract.call_count == 4  # Should try all 4 pages

    def test_collect_data_integration(self, scraper):
        """Test main collect_data method integration."""
        mock_dog_data = {
            "name": "Test Dog",
            "external_id": "test-dog",
            "adoption_url": "https://www.misisrescue.com/post/test-dog",
            "age_years": 2.0,
            "breed": "Mixed Breed",
            "sex": "Female",
            "size": "Medium",
            "image_urls": ["https://example.com/image.jpg"],
            "properties": {},
        }

        with (
            patch.object(scraper, "_get_all_dogs_from_listing") as mock_listing,
            patch.object(scraper, "_scrape_dog_detail") as mock_detail,
            patch.object(scraper, "_validate_dog_data") as mock_validate,
        ):

            mock_listing.return_value = [{"url": "/post/test-dog1", "name": "Test Dog 1", "image_url": None}, {"url": "/post/test-dog2", "name": "Test Dog 2", "image_url": None}]
            mock_detail.return_value = mock_dog_data
            mock_validate.return_value = True

            result = scraper.collect_data()

            assert len(result) == 2
            assert all(dog["name"] == "Test Dog" for dog in result)
            mock_validate.assert_called()

    def test_reserved_section_detection_variations(self, scraper):
        """Test various Reserved section header formats."""
        test_cases = ["💙⭐Zac⭐💙(Reserved)", "Reserved", "RESERVED DOGS", "💖 Reserved 💖", "Wir sind bereits reserviert"]

        for reserved_text in test_cases:
            mock_element = Mock()
            mock_element.get_text.return_value = reserved_text
            mock_element.text = reserved_text

            assert scraper._is_reserved_section(mock_element)

    def test_data_validation(self, scraper):
        """Test dog data validation."""
        # Valid data
        valid_dog = {"name": "Test Dog", "external_id": "test-dog", "adoption_url": "https://www.misisrescue.com/post/test-dog", "age_years": 2.0, "breed": "Mixed Breed"}

        assert scraper._validate_dog_data(valid_dog)

        # Invalid data - missing required fields
        invalid_dog = {
            "name": "Test Dog"
            # Missing required fields
        }

        assert not scraper._validate_dog_data(invalid_dog)

        # Invalid data - empty name
        invalid_dog2 = {"name": "", "external_id": "test-dog", "adoption_url": "https://www.misisrescue.com/post/test-dog"}

        assert not scraper._validate_dog_data(invalid_dog2)

    def test_external_id_generation(self, scraper):
        """Test external ID generation from URLs."""
        test_url = "https://www.misisrescue.com/post/amena-123"
        external_id = scraper._generate_external_id(test_url)

        assert external_id == "amena-123"
        assert external_id != ""

        # Test with different URL format
        test_url2 = "https://www.misisrescue.com/post/dog-with-multiple-words"
        external_id2 = scraper._generate_external_id(test_url2)

        assert external_id2 == "dog-with-multiple-words"

    def test_selenium_setup(self, scraper):
        """Test Selenium WebDriver setup."""
        with patch("scrapers.misis_rescue.scraper.webdriver.Chrome") as mock_chrome:
            mock_driver = Mock()
            mock_chrome.return_value = mock_driver

            driver = scraper._setup_selenium_driver()

            assert driver is not None
            mock_chrome.assert_called_once()

    @pytest.mark.slow
    @pytest.mark.selenium
    @pytest.mark.browser
    def test_detail_page_scraping(self, scraper):
        """Test individual detail page scraping."""
        mock_html = """
        <html>
        <body>
            <h1>Test Dog</h1>
            <div>
                <h2>Things you should know about Test Dog</h2>
                <ul>
                    <li>DOB: 2022</li>
                    <li>Mixed breed</li>
                    <li>weighs 15kg</li>
                    <li>she loves everyone</li>
                </ul>
            </div>
        </body>
        </html>
        """

        with patch("scrapers.misis_rescue.scraper.webdriver.Chrome") as mock_driver:
            mock_driver_instance = Mock()
            mock_driver.return_value = mock_driver_instance
            mock_driver_instance.page_source = mock_html

            dog_data = scraper._scrape_dog_detail("https://example.com/post/test-dog")

            assert dog_data["name"] == "Test Dog"
            assert dog_data["breed"] == "Mixed Breed"
            assert dog_data["sex"] == "Female"
            # Weight is now stored in properties
            assert dog_data["properties"]["weight"] == "15.0kg"
            assert dog_data["external_id"] == "test-dog"
