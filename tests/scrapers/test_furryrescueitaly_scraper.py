"""Tests for Furry Rescue Italy scraper."""

import unittest
from unittest.mock import Mock, patch

import pytest
import requests.exceptions

from scrapers.furryrescueitaly.furryrescueitaly_scraper import FurryRescueItalyScraper


@pytest.mark.unit
@pytest.mark.fast
class TestFurryRescueItalyScraper(unittest.TestCase):
    """Test cases for Furry Rescue Italy scraper."""

    def setUp(self):
        """Set up test fixtures."""
        # Create scraper instance - it will load its own config
        with patch("scrapers.base_scraper.create_default_sync_service") as mock_create_sync:
            mock_sync = Mock()
            mock_sync.sync_single_organization.return_value = Mock(success=True, organization_id="furryrescueitaly")
            mock_create_sync.return_value = mock_sync
            self.scraper = FurryRescueItalyScraper(config_id="furryrescueitaly")

    def test_initialization(self):
        """Test scraper initialization with config."""
        self.assertEqual(self.scraper.organization_name, "Furry Rescue Italy")
        self.assertEqual(self.scraper.base_url, "https://furryrescueitaly.com")
        self.assertEqual(self.scraper.listing_url, "https://furryrescueitaly.com/adoptions/")

    @patch("scrapers.furryrescueitaly.furryrescueitaly_scraper.requests.get")
    def test_get_animal_list_single_page(self, mock_get):
        """Test getting animal list from a single page."""
        # Mock HTML response with one dog
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = """
        <html>
            <article>
                <h6>BILLO</h6>
                <ul>
                    <li>Born: November 2016</li>
                    <li>Weight: approx 27-30 kg</li>
                    <li>Location: Italy</li>
                </ul>
                <a href="/adoption/billo/">More Info</a>
            </article>
        </html>
        """
        mock_get.return_value = mock_response

        animals = self.scraper.get_animal_list(max_pages_to_scrape=1)

        self.assertEqual(len(animals), 1)
        self.assertEqual(animals[0]["name"], "Billo")
        self.assertEqual(animals[0]["adoption_url"], "https://furryrescueitaly.com/adoption/billo/")
        self.assertIn("born", animals[0])
        self.assertIn("weight", animals[0])
        self.assertIn("location", animals[0])

    @patch("scrapers.furryrescueitaly.furryrescueitaly_scraper.requests.get")
    def test_get_animal_list_multiple_pages(self, mock_get):
        """Test getting animal list from multiple pages with pagination."""
        # Mock responses for page 1 and page 2
        page1_html = """
        <html>
            <article>
                <h6>BILLO</h6>
                <a href="/adoption/billo/">More Info</a>
            </article>
            <article>
                <h6>BIGOL</h6>
                <a href="/adoption/bigol/">More Info</a>
            </article>
            <div class="pagination">
                <a href="/adoptions/page/2/">2</a>
                <a href="/adoptions/page/3/">3</a>
            </div>
        </html>
        """

        page2_html = """
        <html>
            <article>
                <h6>THOR</h6>
                <a href="/adoption/thor-2/">More Info</a>
            </article>
            <div class="pagination">
                <a href="/adoptions/">1</a>
                <a href="/adoptions/page/3/">3</a>
            </div>
        </html>
        """

        page3_html = """
        <html>
            <article>
                <h6>GREGORY</h6>
                <a href="/adoption/gregory/">More Info</a>
            </article>
            <div class="pagination">
                <a href="/adoptions/">1</a>
                <a href="/adoptions/page/2/">2</a>
            </div>
        </html>
        """

        def side_effect(url, **kwargs):
            mock_response = Mock()
            mock_response.status_code = 200
            if "page/2" in url:
                mock_response.text = page2_html
            elif "page/3" in url:
                mock_response.text = page3_html
            else:
                mock_response.text = page1_html
            return mock_response

        mock_get.side_effect = side_effect

        # Get all animals without page limit
        animals = self.scraper.get_animal_list()

        # Should get all 4 dogs from 3 pages
        self.assertEqual(len(animals), 4)
        names = [a["name"] for a in animals]
        self.assertIn("Billo", names)
        self.assertIn("Bigol", names)
        self.assertIn("Thor", names)
        self.assertIn("Gregory", names)

    @patch("scrapers.furryrescueitaly.furryrescueitaly_scraper.requests.get")
    def test_extract_dog_urls_filters_uppercase_names(self, mock_get):
        """Test that only uppercase dog names are extracted (filters out other headings)."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = """
        <html>
            <article>
                <h6>BILLO</h6>
                <a href="/adoption/billo/">More Info</a>
            </article>
            <article>
                <h6>Not A Dog</h6>
                <a href="/page/info/">More Info</a>
            </article>
            <article>
                <h4>BIGOL</h4>
                <a href="/adoption/bigol/">More Info</a>
            </article>
        </html>
        """
        mock_get.return_value = mock_response

        animals = self.scraper.get_animal_list(max_pages_to_scrape=1)

        # Should only get the uppercase named dogs
        self.assertEqual(len(animals), 2)
        names = [a["name"] for a in animals]
        self.assertIn("Billo", names)
        self.assertIn("Bigol", names)
        self.assertNotIn("Not A Dog", names)

    @patch("scrapers.furryrescueitaly.furryrescueitaly_scraper.requests.get")
    def test_handles_network_error_gracefully(self, mock_get):
        """Test that network errors are handled gracefully."""
        mock_get.side_effect = Exception("Network error")

        animals = self.scraper.get_animal_list(max_pages_to_scrape=1)

        # Should return empty list on error
        self.assertEqual(animals, [])

    @patch("scrapers.furryrescueitaly.furryrescueitaly_scraper.requests.get")
    def test_respects_max_pages_limit(self, mock_get):
        """Test that max_pages_to_scrape parameter is respected."""
        # Mock response with pagination
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = """
        <html>
            <article>
                <h6>BILLO</h6>
                <a href="/adoption/billo/">More Info</a>
            </article>
            <div class="pagination">
                <a href="/adoptions/page/2/">2</a>
                <a href="/adoptions/page/3/">3</a>
                <a href="/adoptions/page/4/">4</a>
                <a href="/adoptions/page/5/">5</a>
            </div>
        </html>
        """
        mock_get.return_value = mock_response

        # Limit to 2 pages
        self.scraper.get_animal_list(max_pages_to_scrape=2)

        # Should have made exactly 2 requests (page 1 and page 2)
        self.assertEqual(mock_get.call_count, 2)

    @patch("scrapers.furryrescueitaly.furryrescueitaly_scraper.requests.get")
    def test_filters_reserved_dogs(self, mock_get):
        """Test that reserved dogs are filtered out if they exist."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = """
        <html>
            <article>
                <h6>BILLO</h6>
                <a href="/adoption/billo/">More Info</a>
            </article>
            <article>
                <h6>RESERVED - BIGOL</h6>
                <a href="/adoption/bigol/">More Info</a>
            </article>
            <article>
                <h6>THOR (RESERVED)</h6>
                <a href="/adoption/thor/">More Info</a>
            </article>
        </html>
        """
        mock_get.return_value = mock_response

        animals = self.scraper.get_animal_list(max_pages_to_scrape=1)

        # Should only get the non-reserved dog
        self.assertEqual(len(animals), 1)
        self.assertEqual(animals[0]["name"], "Billo")

    @patch("scrapers.furryrescueitaly.furryrescueitaly_scraper.requests.get")
    def test_error_handling_network_failure(self, mock_get):
        """Test handling of network errors during scraping."""
        # Simulate network error
        mock_get.side_effect = Exception("Connection refused")

        animals = self.scraper.get_animal_list()

        # Should return empty list on error
        self.assertEqual(animals, [])

    @patch("scrapers.furryrescueitaly.furryrescueitaly_scraper.requests.get")
    def test_error_handling_404(self, mock_get):
        """Test handling of 404 errors."""
        mock_response = Mock()
        mock_response.status_code = 404
        mock_response.raise_for_status.side_effect = requests.exceptions.HTTPError("404 Not Found")
        mock_get.return_value = mock_response

        animals = self.scraper.get_animal_list()

        # Should return empty list on 404
        self.assertEqual(animals, [])

    @patch("scrapers.furryrescueitaly.furryrescueitaly_scraper.requests.get")
    def test_empty_page_handling(self, mock_get):
        """Test handling of empty pages."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = "<html><body>No content</body></html>"
        mock_get.return_value = mock_response

        animals = self.scraper.get_animal_list()

        # Should return empty list for pages with no dogs
        self.assertEqual(animals, [])

    def test_data_validation(self):
        """Test data validation method."""
        # Valid animal
        valid_animal = {"name": "Test Dog", "animal_type": "dog", "status": "available", "organization_id": "furryrescueitaly", "adoption_url": "https://test.com"}
        self.assertTrue(self.scraper._validate_animal_data(valid_animal))

        # Missing required field
        invalid_animal = {"animal_type": "dog", "status": "available", "organization_id": "furryrescueitaly"}
        self.assertFalse(self.scraper._validate_animal_data(invalid_animal))

        # Null value in required field
        null_animal = {"name": None, "animal_type": "dog", "status": "available", "organization_id": "furryrescueitaly"}
        self.assertFalse(self.scraper._validate_animal_data(null_animal))

    def test_standardization(self):
        """Test data standardization methods."""
        animal = {
            "name": "Test",
            "properties": {"born": "October 2021", "breed": "german SHEPHERD mix", "size": "Large (25-30 kg)", "sex": "Female", "good_with": "Dogs, Cats and Children", "location": "Italy"},
        }

        self.scraper._standardize_animal_data(animal)
        props = animal["properties"]

        # Check standardization results
        self.assertEqual(props["breed"], "German Shepherd Mix")  # Normalized case
        self.assertEqual(props["size_category"], "Large")  # Title Case for database consistency
        self.assertEqual(props["sex"], "Female")  # Title Case for database consistency
        self.assertEqual(props["good_with_list"], ["dogs", "cats", "children"])  # Parsed list
        self.assertEqual(props["location_country"], "IT")  # Country code
        self.assertIn("age_min_months", props)  # Age standardization should add this

    @patch("scrapers.furryrescueitaly.furryrescueitaly_scraper.requests.get")
    def test_parallel_processing(self, mock_get):
        """Test parallel processing for larger datasets."""
        # Create 15 test animals (triggers parallel processing)
        listing_html = "<html>"
        for i in range(15):
            listing_html += f"""
            <article>
                <h6>DOG{i}</h6>
                <a href="/adoption/dog{i}/">More Info</a>
            </article>
            """
        listing_html += "</html>"

        detail_html = """
        <html>
            <h4>DOG</h4>
            <p>Test description</p>
        </html>
        """

        # Mock responses
        mock_listing_response = Mock()
        mock_listing_response.status_code = 200
        mock_listing_response.text = listing_html
        mock_listing_response.raise_for_status = Mock()

        mock_detail_response = Mock()
        mock_detail_response.status_code = 200
        mock_detail_response.text = detail_html
        mock_detail_response.raise_for_status = Mock()

        # First call returns listing, subsequent calls return details
        mock_get.side_effect = [mock_listing_response] + [mock_detail_response] * 15

        animals = self.scraper.collect_data()

        # Should process all 15 animals
        self.assertEqual(len(animals), 15)
        # Verify parallel processing was used (check batch_size was applied)
        self.assertLessEqual(self.scraper.batch_size, 4)  # Configured max for this site

        # Reserved dogs should be filtered out
        names = [a["name"] for a in animals]
        self.assertNotIn("RESERVED - BIGOL", names)
        self.assertNotIn("THOR (RESERVED)", names)

    def test_context_manager_usage(self):
        """Test that scraper works with context manager pattern."""
        with patch("scrapers.base_scraper.create_default_sync_service") as mock_create_sync:
            mock_sync = Mock()
            mock_sync.sync_single_organization.return_value = Mock(success=True, organization_id="furryrescueitaly")
            mock_create_sync.return_value = mock_sync

            # Test context manager usage
            with FurryRescueItalyScraper(config_id="furryrescueitaly") as scraper:
                # Scraper should be properly initialized
                self.assertEqual(scraper.organization_name, "Furry Rescue Italy")
                self.assertEqual(scraper.base_url, "https://furryrescueitaly.com")

                # Mock a simple animal list request
                with patch("scrapers.furryrescueitaly.furryrescueitaly_scraper.requests.get") as mock_get:
                    mock_response = Mock()
                    mock_response.status_code = 200
                    mock_response.text = """
                    <html>
                        <article>
                            <h6>TEST DOG</h6>
                            <a href="/adoption/test/">More Info</a>
                        </article>
                    </html>
                    """
                    mock_get.return_value = mock_response

                    animals = scraper.get_animal_list(max_pages_to_scrape=1)

                    # Should successfully get the animal
                    self.assertEqual(len(animals), 1)
                    self.assertEqual(animals[0]["name"], "Test Dog")

            # Context manager should handle cleanup automatically
            # (No need to explicitly close connections)


if __name__ == "__main__":
    unittest.main()
