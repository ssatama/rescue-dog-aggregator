"""Integration tests for Furry Rescue Italy scraper with real URLs."""

import unittest
from unittest.mock import patch

import pytest

from scrapers.furryrescueitaly.furryrescueitaly_scraper import FurryRescueItalyScraper


@pytest.mark.integration
@pytest.mark.slow
class TestFurryRescueItalyIntegration(unittest.TestCase):
    """Integration tests for Furry Rescue Italy scraper."""

    def setUp(self):
        """Set up test fixtures."""
        self.scraper = FurryRescueItalyScraper(config_id="furryrescueitaly")

    @pytest.mark.skip(reason="Uses real network - run manually for validation")
    def test_scrape_real_detail_pages(self):
        """Test scraping real detail pages for the 4 test URLs."""
        test_urls = [
            "https://furryrescueitaly.com/adoption/judy/",
            "https://furryrescueitaly.com/adoption/ninja/",
            "https://furryrescueitaly.com/adoption/thor-2/",
            "https://furryrescueitaly.com/adoption/stephan/",
        ]

        for url in test_urls:
            with self.subTest(url=url):
                details = self.scraper.scrape_animal_details(url)

                # Should have basic fields
                self.assertIn("name", details)
                self.assertIn("primary_image_url", details)
                self.assertIn("description", details)
                self.assertIn("properties", details)

                # Name should be uppercase
                self.assertTrue(details["name"].isupper())

                # Image should be 600x600
                self.assertIn("600x600", details["primary_image_url"])

                # Description should be cleaned
                self.assertNotIn("👉", details["description"])
                self.assertNotIn("WhatsApp", details["description"])

                # Properties should have at least born
                self.assertIn("born", details["properties"])

                # Print for manual verification
                print(f"\n{url}")
                print(f"Name: {details['name']}")
                print(f"Image: {details['primary_image_url']}")
                print(f"Properties: {details['properties']}")
                print(f"Description preview: {details['description'][:200]}...")

    @pytest.mark.skip(reason="Uses real network - run manually for validation")
    def test_collect_data_with_details(self):
        """Test full collect_data flow with detail enrichment."""
        # Limit to first page only for testing
        with patch.object(self.scraper, "get_animal_list") as mock_get_list:
            # Mock a small subset of animals for testing
            mock_get_list.return_value = [
                {
                    "name": "JUDY",
                    "adoption_url": "https://furryrescueitaly.com/adoption/judy/",
                    "animal_type": "dog",
                    "status": "available",
                    "organization_id": "furryrescueitaly",
                    "born": "25th November 2024",
                    "weight": "20-25 kg when fully grown",
                    "location": "Italy",
                },
                {
                    "name": "NINJA",
                    "adoption_url": "https://furryrescueitaly.com/adoption/ninja/",
                    "animal_type": "dog",
                    "status": "available",
                    "organization_id": "furryrescueitaly",
                    "born": "6th November 2024",
                    "weight": "35 kgs when fully grown",
                    "location": "Italy",
                },
            ]

            # Run collect_data
            animals = self.scraper.collect_data()

            # Should have 2 animals
            self.assertEqual(len(animals), 2)

            # Each should be enriched
            for animal in animals:
                self.assertIn("primary_image_url", animal)
                self.assertIn("description", animal)
                self.assertIn("properties", animal)

                # Properties should have detail fields
                props = animal["properties"]
                self.assertIn("sex", props)
                self.assertIn("breed", props)
                self.assertIn("personality", props)
                self.assertIn("good_with", props)

                # Should have standardized fields
                if "born" in props:
                    # Should have age fields from standardization
                    self.assertTrue("age_min_months" in props or "age_max_months" in props or "birth_date" in props)

                # Print for verification
                print(f"\nEnriched animal: {animal['name']}")
                print(f"  Image: {animal.get('primary_image_url', 'None')}")
                print(f"  Properties: {props}")

    def test_data_structure_compliance(self):
        """Test that scraped data follows BaseScraper structure."""
        with patch("requests.get") as mock_get:
            # Mock response for a detail page
            mock_response = mock_get.return_value
            mock_response.status_code = 200
            mock_response.text = """
            <html>
            <body>
                <h4 class="fusion-tb-text">TEST DOG</h4>
                <div class="fusion-tb-images-container">
                    <img src="https://furryrescueitaly.com/wp-content/uploads/2025/05/test-600x600.jpg" />
                </div>
                <ul>
                    <li>Born: January 2025</li>
                    <li>Sex: Female</li>
                    <li>Future size: Medium (20-25 kg)</li>
                    <li>Breed: Mixed Breed</li>
                    <li>Personality: friendly</li>
                    <li>Good with: everyone</li>
                </ul>
                <p>Test description without contact info.</p>
            </body>
            </html>
            """

            details = self.scraper.scrape_animal_details("https://furryrescueitaly.com/adoption/test/")

            # Check structure matches what BaseScraper expects
            self.assertIsInstance(details, dict)
            self.assertIn("name", details)
            self.assertIn("primary_image_url", details)
            self.assertIn("description", details)
            self.assertIn("properties", details)

            # Properties should be a dict
            self.assertIsInstance(details["properties"], dict)

            # Values should be strings or None
            for key, value in details["properties"].items():
                self.assertIsInstance(value, (str, type(None)))

    def test_edge_cases(self):
        """Test various edge cases in detail extraction."""
        test_cases = [
            # Empty HTML
            ("", {}),
            # No properties but has name and description
            ("<h4>DOG</h4><p>Description</p>", {"name": "DOG", "description": "Description"}),
            # Properties without colons - should return empty properties dict
            ("<ul><li>Born 2024</li></ul>", {}),
            # Mixed case property keys - only lowercase 'sex' works
            ("<ul><li>BORN: 2024</li><li>Sex: Male</li></ul>", {"properties": {"sex": "Male"}}),
        ]

        for html, expected_content in test_cases:
            with self.subTest(html=html[:50]):
                with patch("requests.get") as mock_get:
                    mock_response = mock_get.return_value
                    mock_response.status_code = 200
                    mock_response.text = f"<html><body>{html}</body></html>"

                    details = self.scraper.scrape_animal_details("https://test.com/")

                    # Check expected content
                    for key, value in expected_content.items():
                        if key == "properties":
                            # Properties should exist and contain expected values
                            self.assertIn("properties", details)
                            for prop_key, prop_value in value.items():
                                self.assertEqual(details["properties"].get(prop_key), prop_value)
                        else:
                            self.assertEqual(details.get(key), value)
