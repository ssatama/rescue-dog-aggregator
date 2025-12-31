"""Tests for Furry Rescue Italy detail page extraction functionality."""

import unittest
from unittest.mock import Mock, patch

import pytest

from scrapers.furryrescueitaly.furryrescueitaly_scraper import FurryRescueItalyScraper


@pytest.mark.unit
@pytest.mark.fast
class TestFurryRescueItalyDetailExtraction(unittest.TestCase):
    """Test cases for Furry Rescue Italy detail page extraction."""

    def setUp(self):
        """Set up test fixtures."""
        self.scraper = FurryRescueItalyScraper(config_id="furryrescueitaly")

    def test_extract_hero_image_from_carousel(self):
        """Test extracting first 600x600 image as hero image."""
        html_content = """
        <html>
        <body>
            <div class="fusion-tb-images-container">
                <img src="https://furryrescueitaly.com/wp-content/uploads/2025/05/judy-1-600x600.jpg" />
                <img src="https://furryrescueitaly.com/wp-content/uploads/2025/05/judy-2-600x600.jpg" />
                <img src="https://furryrescueitaly.com/wp-content/uploads/2025/05/judy-3-600x600.jpg" />
            </div>
        </body>
        </html>
        """

        from bs4 import BeautifulSoup

        soup = BeautifulSoup(html_content, "html.parser")

        hero_image = self.scraper._extract_hero_image(soup)

        self.assertEqual(
            hero_image,
            "https://furryrescueitaly.com/wp-content/uploads/2025/05/judy-1-600x600.jpg",
        )

    def test_extract_properties_with_all_fields(self):
        """Test extracting all properties from bulleted list."""
        html_content = """
        <html>
        <body>
            <ul>
                <li>Born: 25th November 2024</li>
                <li>Sex: Female</li>
                <li>Future size: Medium (approx 20-25 kg)</li>
                <li>Breed: German Sheperd mix</li>
                <li>Personality: shy, sweet, affectionate</li>
                <li>Good with: people, dogs and cats</li>
            </ul>
        </body>
        </html>
        """

        from bs4 import BeautifulSoup

        soup = BeautifulSoup(html_content, "html.parser")

        properties = self.scraper._extract_properties(soup)

        expected = {
            "born": "25th November 2024",
            "sex": "Female",
            "future_size": "Medium (approx 20-25 kg)",
            "breed": "German Sheperd mix",
            "personality": "shy, sweet, affectionate",
            "good_with": "people, dogs and cats",
        }
        self.assertEqual(properties, expected)

    def test_extract_properties_with_size_not_future_size(self):
        """Test extracting properties when 'Size' is used instead of 'Future size'."""
        html_content = """
        <html>
        <body>
            <ul>
                <li>Born: October 2021</li>
                <li>Sex: Male</li>
                <li>Size: Large (approx 28 kgs)</li>
                <li>Breed: Shepherd mix</li>
                <li>Personality: initially afraid but very sweet, cuddly, sociable</li>
                <li>Good with: people, dogs and cats</li>
            </ul>
        </body>
        </html>
        """

        from bs4 import BeautifulSoup

        soup = BeautifulSoup(html_content, "html.parser")

        properties = self.scraper._extract_properties(soup)

        expected = {
            "born": "October 2021",
            "sex": "Male",
            "size": "Large (approx 28 kgs)",
            "breed": "Shepherd mix",
            "personality": "initially afraid but very sweet, cuddly, sociable",
            "good_with": "people, dogs and cats",
        }
        self.assertEqual(properties, expected)

    def test_extract_properties_with_missing_fields(self):
        """Test extracting properties when some fields are missing."""
        html_content = """
        <html>
        <body>
            <ul>
                <li>Born: 2022</li>
                <li>Sex: Female</li>
                <li>Breed: Mixed</li>
            </ul>
        </body>
        </html>
        """

        from bs4 import BeautifulSoup

        soup = BeautifulSoup(html_content, "html.parser")

        properties = self.scraper._extract_properties(soup)

        expected = {"born": "2022", "sex": "Female", "breed": "Mixed"}
        self.assertEqual(properties, expected)

    def test_extract_clean_description(self):
        """Test extracting and cleaning description text."""
        html_content = """
        <html>
        <body>
            <p>Hi everyone! Let me introduce myself: my name is Judy.</p>
            <p>I was found in the countryside with my siblings when I was just a few weeks old.</p>
            <p>I'm a sweet and playful puppy looking for my forever home.</p>
            <p>Can you foster me for some time or adopt me forever?</p>
            <p>👉Fully vaccinated, microchipped, neutered, leishmaniasi and brucella negative, EU pet passport and ready for a good home!</p>
            <p>👉 Full RBU, adoption fees, and home check apply.</p>
            <p>📝 Foster/Adoption FORM: https://forms.gle/cW7UZxWa11dzP9iZ9</p>
            <p>🇮🇹Chiara ‪+39 346 8760522‬ (WhatsApp)</p>
            <p>🐾 Follow & Support:</p>
            <p>📸 IG: @furryrescue_italy</p>
        </body>
        </html>
        """

        from bs4 import BeautifulSoup

        soup = BeautifulSoup(html_content, "html.parser")

        description = self.scraper._extract_clean_description(soup)

        # Should exclude contact info and emojis
        self.assertIn("Hi everyone! Let me introduce myself: my name is Judy.", description)
        self.assertIn("I was found in the countryside", description)
        self.assertIn("sweet and playful puppy", description)
        self.assertIn("Can you foster me", description)

        # Should NOT include these
        self.assertNotIn("👉", description)
        self.assertNotIn("📝", description)
        self.assertNotIn("WhatsApp", description)
        self.assertNotIn("@furryrescue_italy", description)
        self.assertNotIn("Forms.gle", description)
        self.assertNotIn("Follow & Support", description)

    @patch("requests.get")
    def test_scrape_animal_details_judy(self, mock_get):
        """Test complete detail extraction for Judy."""
        judy_html = """
        <html>
        <body>
            <h4 class="fusion-tb-text">JUDY</h4>
            <div class="fusion-tb-images-container">
                <img src="https://furryrescueitaly.com/wp-content/uploads/2025/05/judy-1-600x600.jpg" />
                <img src="https://furryrescueitaly.com/wp-content/uploads/2025/05/judy-2-600x600.jpg" />
            </div>
            <ul>
                <li>Born: 25th November 2024</li>
                <li>Sex: Female</li>
                <li>Future size: Medium (approx 20-25 kg)</li>
                <li>Breed: German Sheperd mix</li>
                <li>Personality: shy, sweet, affectionate</li>
                <li>Good with: people, dogs and cats</li>
            </ul>
            <p>Hi everyone! Let me introduce myself: my name is Judy.</p>
            <p>I was found abandoned in the countryside with my siblings when I was just a few weeks old.</p>
            <p>Can you foster me for some time or adopt me forever?</p>
            <p>👉Fully vaccinated, microchipped, EU pet passport and ready for a good home!</p>
            <p>📝 Foster/Adoption FORM: https://forms.gle/cW7UZxWa11dzP9iZ9</p>
        </body>
        </html>
        """

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = judy_html
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        details = self.scraper.scrape_animal_details("https://furryrescueitaly.com/adoption/judy/")

        self.assertEqual(details["name"], "JUDY")
        self.assertEqual(
            details["primary_image_url"],
            "https://furryrescueitaly.com/wp-content/uploads/2025/05/judy-1-600x600.jpg",
        )
        self.assertIn("Hi everyone! Let me introduce myself", details["description"])
        self.assertIn("I was found abandoned in the countryside", details["description"])
        self.assertNotIn("👉", details["description"])

        # Check properties
        properties = details["properties"]
        self.assertEqual(properties["born"], "25th November 2024")
        self.assertEqual(properties["sex"], "Female")
        self.assertEqual(properties["future_size"], "Medium (approx 20-25 kg)")
        self.assertEqual(properties["breed"], "German Sheperd mix")
        self.assertEqual(properties["personality"], "shy, sweet, affectionate")
        self.assertEqual(properties["good_with"], "people, dogs and cats")

    @patch("requests.get")
    def test_scrape_animal_details_thor(self, mock_get):
        """Test complete detail extraction for Thor (uses Size not Future size)."""
        thor_html = """
        <html>
        <body>
            <h4 class="fusion-tb-text">THOR</h4>
            <div class="fusion-tb-images-container">
                <img src="https://furryrescueitaly.com/wp-content/uploads/2024/05/15-1-600x600.jpg" />
            </div>
            <ul>
                <li>Born: October 2021</li>
                <li>Sex: Male</li>
                <li>Size: Large (approx 28 kgs)</li>
                <li>Breed: Shepherd mix</li>
                <li>Personality: initially afraid but very sweet, cuddly, sociable</li>
                <li>Good with: people, dogs and cats</li>
            </ul>
            <p>Hi everyone! Let me introduce myself: my name is Thor.</p>
            <p>I was only a three-month-old puppy when I was rescued.</p>
            <p>Can you foster me for some time or adopt me forever?</p>
            <p>👉Fully vaccinated, microchipped, neutered.</p>
        </body>
        </html>
        """

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = thor_html
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        details = self.scraper.scrape_animal_details("https://furryrescueitaly.com/adoption/thor-2/")

        self.assertEqual(details["name"], "THOR")
        self.assertEqual(
            details["primary_image_url"],
            "https://furryrescueitaly.com/wp-content/uploads/2024/05/15-1-600x600.jpg",
        )

        # Check properties - should have "size" not "future_size"
        properties = details["properties"]
        self.assertEqual(properties["born"], "October 2021")
        self.assertEqual(properties["sex"], "Male")
        self.assertEqual(properties["size"], "Large (approx 28 kgs)")
        self.assertNotIn("future_size", properties)
        self.assertEqual(properties["breed"], "Shepherd mix")

    @patch("requests.get")
    def test_scrape_animal_details_missing_hero_image(self, mock_get):
        """Test handling when hero image is missing."""
        html_no_image = """
        <html>
        <body>
            <h4 class="fusion-tb-text">TEST DOG</h4>
            <ul>
                <li>Born: 2024</li>
                <li>Sex: Male</li>
            </ul>
            <p>Description text here.</p>
        </body>
        </html>
        """

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = html_no_image
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        details = self.scraper.scrape_animal_details("https://furryrescueitaly.com/adoption/test/")

        self.assertIsNone(details.get("primary_image_url"))

    @patch("requests.get")
    def test_scrape_animal_details_network_error(self, mock_get):
        """Test handling network errors gracefully."""
        mock_get.side_effect = Exception("Network error")

        details = self.scraper.scrape_animal_details("https://furryrescueitaly.com/adoption/test/")

        self.assertEqual(details, {})

    @patch("requests.get")
    def test_scrape_animal_details_404_response(self, mock_get):
        """Test handling 404 responses."""
        mock_response = Mock()
        mock_response.status_code = 404
        mock_response.raise_for_status.side_effect = Exception("404 Not Found")
        mock_get.return_value = mock_response

        details = self.scraper.scrape_animal_details("https://furryrescueitaly.com/adoption/missing/")

        self.assertEqual(details, {})

    def test_description_cleaning_removes_all_patterns(self):
        """Test that all unwanted patterns are removed from description."""
        test_cases = [
            ("👉Fully vaccinated", ""),
            ("📝 Foster/Adoption FORM", ""),
            ("🇮🇹Chiara +39", ""),
            ("WhatsApp only", ""),
            ("Follow & Support:", ""),
            ("@furryrescue_italy", ""),
            ("https://forms.gle/", ""),
            ("💕Donations", ""),
            ("🐾 Follow", ""),
            ("Full RBU, adoption fees", ""),
            ("Hi! I'm a nice dog. 👉Vaccinated", "Hi! I'm a nice dog."),
            ("Normal text here", "Normal text here"),
        ]

        for input_text, expected in test_cases:
            with self.subTest(input=input_text):
                result = self.scraper._clean_description_text(input_text)
                self.assertEqual(result.strip(), expected.strip())

    def test_extract_name_from_detail_page(self):
        """Test extracting dog name from detail page header."""
        html_content = """
        <html>
        <body>
            <h4 class="fusion-tb-text">NINJA</h4>
        </body>
        </html>
        """

        from bs4 import BeautifulSoup

        soup = BeautifulSoup(html_content, "html.parser")

        name = self.scraper._extract_name_from_detail(soup)

        self.assertEqual(name, "NINJA")

    def test_extract_name_fallback_to_uppercase_heading(self):
        """Test extracting dog name falls back to any uppercase heading."""
        html_content = """
        <html>
        <body>
            <h5>STEPHAN</h5>
        </body>
        </html>
        """

        from bs4 import BeautifulSoup

        soup = BeautifulSoup(html_content, "html.parser")

        name = self.scraper._extract_name_from_detail(soup)

        self.assertEqual(name, "STEPHAN")

    def test_extract_weight_from_properties(self):
        """Test extracting weight from size/future_size properties."""
        test_cases = [
            ("Medium (approx 20-25 kg)", "20-25 kg"),
            ("Large (approx 28 kgs)", "28 kgs"),
            ("Small (10kg approx)", "10kg"),
            ("Medium", None),
            ("20-25 kgs when fully grown", "20-25 kgs"),
        ]

        for size_text, expected_weight in test_cases:
            with self.subTest(size=size_text):
                result = self.scraper._extract_weight_from_size(size_text)
                self.assertEqual(result, expected_weight)
