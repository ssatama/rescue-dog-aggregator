"""Tests for Furry Rescue Italy scraper."""

from unittest.mock import Mock, patch

import pytest
from bs4 import BeautifulSoup

from scrapers.furryrescueitaly.furryrescueitaly_scraper import FurryRescueItalyScraper
from tests.scrapers.test_scraper_base import ScraperTestBase
from utils.unified_standardization import UnifiedStandardizer


@pytest.mark.unit
class TestFurryRescueItalyScraper(ScraperTestBase):
    scraper_class = FurryRescueItalyScraper
    config_id = "furryrescueitaly"
    expected_org_name = "Furry Rescue Italy"
    expected_base_url = "https://furryrescueitaly.com"

    @patch("scrapers.furryrescueitaly.furryrescueitaly_scraper.requests.get")
    def test_pagination_and_filtering(self, mock_get, scraper):
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = """
        <html>
            <article>
                <h6 class="adoption-header">BILLO</h6>
                <a href="/adoption/billo/" class="btn">More Info</a>
            </article>
            <article>
                <h6 class="adoption-header">RESERVED - BIGOL</h6>
                <a href="/adoption/bigol/" class="btn">More Info</a>
            </article>
            <div class="pagination">
                <a href="/adoptions/page/2/">2</a>
            </div>
        </html>
        """
        mock_get.return_value = mock_response

        animals = scraper.get_animal_list(max_pages_to_scrape=1)

        assert len(animals) == 1
        assert animals[0]["name"] == "Billo"
        assert "RESERVED" not in [a["name"] for a in animals]

    @patch("scrapers.furryrescueitaly.furryrescueitaly_scraper.requests.get")
    def test_data_standardization(self, mock_get, scraper):
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = """
        <html>
            <article>
                <h6 class="adoption-header">THOR</h6>
                <ul>
                    <li>Born: October 2021</li>
                    <li>Breed: german SHEPHERD mix</li>
                    <li>Size: Large (25-30 kg)</li>
                    <li>Sex: Female</li>
                    <li>Good with: Dogs, Cats and Children</li>
                    <li>Location: Italy</li>
                </ul>
                <a href="/adoption/thor/" class="btn">More Info</a>
            </article>
        </html>
        """
        mock_get.return_value = mock_response

        animals = scraper.get_animal_list(max_pages_to_scrape=1)

        assert len(animals) == 1
        animal = animals[0]
        assert "born" in animal
        assert "location" in animal
        assert animal["name"] == "Thor"

    @patch("scrapers.furryrescueitaly.furryrescueitaly_scraper.requests.get")
    def test_error_handling_graceful(self, mock_get, scraper):
        mock_get.side_effect = Exception("Network error")

        animals = scraper.get_animal_list(max_pages_to_scrape=1)

        assert animals == []

    def test_parallel_processing_configuration(self, scraper):
        assert hasattr(scraper, "batch_size")
        assert scraper.batch_size <= 4

    def test_extract_hero_image_from_carousel(self, scraper):
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
        soup = BeautifulSoup(html_content, "html.parser")

        hero_image = scraper._extract_hero_image(soup)

        assert hero_image == "https://furryrescueitaly.com/wp-content/uploads/2025/05/judy-1-600x600.jpg"

    def test_extract_properties_with_all_fields(self, scraper):
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
        soup = BeautifulSoup(html_content, "html.parser")

        properties = scraper._extract_properties(soup)

        assert properties == {
            "born": "25th November 2024",
            "sex": "Female",
            "future_size": "Medium (approx 20-25 kg)",
            "breed": "German Sheperd mix",
            "personality": "shy, sweet, affectionate",
            "good_with": "people, dogs and cats",
        }

    def test_extract_properties_with_size_not_future_size(self, scraper):
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
        soup = BeautifulSoup(html_content, "html.parser")

        properties = scraper._extract_properties(soup)

        assert properties == {
            "born": "October 2021",
            "sex": "Male",
            "size": "Large (approx 28 kgs)",
            "breed": "Shepherd mix",
            "personality": "initially afraid but very sweet, cuddly, sociable",
            "good_with": "people, dogs and cats",
        }

    def test_extract_properties_with_missing_fields(self, scraper):
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
        soup = BeautifulSoup(html_content, "html.parser")

        properties = scraper._extract_properties(soup)

        assert properties == {"born": "2022", "sex": "Female", "breed": "Mixed"}

    def test_extract_properties_berry_div_format(self, scraper):
        html = """
        <div dir="auto">• Born: February 2023</div>
        <div dir="auto">• Sex: Male</div>
        <div dir="auto">• Size: Medium (approx 17 kgs)</div>
        <div dir="auto">• Breed: mix</div>
        <div dir="auto">• Personality: super affectionate, good and sociable</div>
        <div dir="auto">• Good with: people, dogs (sorry, no cats)</div>
        """
        soup = BeautifulSoup(html, "html.parser")

        properties = scraper._extract_properties(soup)

        assert properties.get("born") == "February 2023"
        assert properties.get("sex") == "Male"
        assert properties.get("size") == "Medium (approx 17 kgs)"
        assert properties.get("breed") == "mix"
        assert properties.get("personality") == "super affectionate, good and sociable"
        assert properties.get("good_with") == "people, dogs (sorry, no cats)"

    def test_extract_properties_gregory_trailing_bullet(self, scraper):
        html = """
        <div dir="auto">• Born: 28th March 2024</div>
        <div dir="auto">• Sex: Male</div>
        <div dir="auto">• Size: Medium (approx 21-22 kgs)</div>
        <div dir="auto">• Breed: Border Collie mix</div>
        <div dir="auto">•</div>
        """
        soup = BeautifulSoup(html, "html.parser")

        properties = scraper._extract_properties(soup)

        assert properties.get("born") == "28th March 2024"
        assert properties.get("sex") == "Male"
        assert properties.get("size") == "Medium (approx 21-22 kgs)"
        assert properties.get("breed") == "Border Collie mix"

    def test_extract_clean_description(self, scraper):
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
        soup = BeautifulSoup(html_content, "html.parser")

        description = scraper._extract_clean_description(soup)

        assert "Hi everyone! Let me introduce myself: my name is Judy." in description
        assert "I was found in the countryside" in description
        assert "sweet and playful puppy" in description
        assert "Can you foster me" in description
        assert "\U0001f449" not in description
        assert "\U0001f4dd" not in description
        assert "WhatsApp" not in description
        assert "@furryrescue_italy" not in description
        assert "Forms.gle" not in description
        assert "Follow & Support" not in description

    def test_extract_clean_description_removes_footer(self, scraper):
        html = """
        <p>Hi everyone! I introduce myself: my name is Berry.</p>
        <p>I was alone on the streets… searching for a bit of food.</p>
        <p>This is your chance to feel great saving many lives!</p>
        <p>© 2025 Furry Rescue Italy. Design by Ankit | All rights reserved.</p>
        """
        soup = BeautifulSoup(html, "html.parser")

        description = scraper._extract_clean_description(soup)

        assert "Hi everyone!" in description
        assert "Berry" in description
        assert "\u00a9 2025 Furry Rescue Italy" not in description
        assert "Design by" not in description
        assert "All rights reserved" not in description

    def test_description_cleaning_removes_all_patterns(self, scraper):
        test_cases = [
            ("\U0001f449Fully vaccinated", ""),
            ("\U0001f4dd Foster/Adoption FORM", ""),
            ("\U0001f1ee\U0001f1f9Chiara +39", ""),
            ("WhatsApp only", ""),
            ("Follow & Support:", ""),
            ("@furryrescue_italy", ""),
            ("https://forms.gle/", ""),
            ("\U0001f495Donations", ""),
            ("\U0001f43e Follow", ""),
            ("Full RBU, adoption fees", ""),
            ("Hi! I'm a nice dog. \U0001f449Vaccinated", "Hi! I'm a nice dog."),
            ("Normal text here", "Normal text here"),
        ]

        for input_text, expected in test_cases:
            result = scraper._clean_description_text(input_text)
            assert result.strip() == expected.strip(), f"Input: {input_text!r}, Expected: {expected!r}, Got: {result.strip()!r}"

    def test_extract_name_from_detail_page(self, scraper):
        html_content = """
        <html>
        <body>
            <h4 class="fusion-tb-text">NINJA</h4>
        </body>
        </html>
        """
        soup = BeautifulSoup(html_content, "html.parser")

        name = scraper._extract_name_from_detail(soup)

        assert name == "NINJA"

    def test_extract_name_fallback_to_uppercase_heading(self, scraper):
        html_content = """
        <html>
        <body>
            <h5>STEPHAN</h5>
        </body>
        </html>
        """
        soup = BeautifulSoup(html_content, "html.parser")

        name = scraper._extract_name_from_detail(soup)

        assert name == "STEPHAN"

    def test_extract_weight_from_properties(self, scraper):
        test_cases = [
            ("Medium (approx 20-25 kg)", "20-25 kg"),
            ("Large (approx 28 kgs)", "28 kgs"),
            ("Small (10kg approx)", "10kg"),
            ("Medium", None),
            ("20-25 kgs when fully grown", "20-25 kgs"),
        ]

        for size_text, expected_weight in test_cases:
            result = scraper._extract_weight_from_size(size_text)
            assert result == expected_weight, f"Size: {size_text!r}, Expected: {expected_weight!r}, Got: {result!r}"

    @patch("requests.get")
    def test_scrape_animal_details_judy(self, mock_get, scraper):
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

        details = scraper.scrape_animal_details("https://furryrescueitaly.com/adoption/judy/")

        assert details["name"] == "JUDY"
        assert details["primary_image_url"] == "https://furryrescueitaly.com/wp-content/uploads/2025/05/judy-1-600x600.jpg"
        assert "Hi everyone! Let me introduce myself" in details["description"]
        assert "I was found abandoned in the countryside" in details["description"]
        assert "\U0001f449" not in details["description"]

        properties = details["properties"]
        assert properties["born"] == "25th November 2024"
        assert properties["sex"] == "Female"
        assert properties["future_size"] == "Medium (approx 20-25 kg)"
        assert properties["breed"] == "German Sheperd mix"
        assert properties["personality"] == "shy, sweet, affectionate"
        assert properties["good_with"] == "people, dogs and cats"

    @patch("requests.get")
    def test_scrape_animal_details_thor(self, mock_get, scraper):
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

        details = scraper.scrape_animal_details("https://furryrescueitaly.com/adoption/thor-2/")

        assert details["name"] == "THOR"
        assert details["primary_image_url"] == "https://furryrescueitaly.com/wp-content/uploads/2024/05/15-1-600x600.jpg"

        properties = details["properties"]
        assert properties["born"] == "October 2021"
        assert properties["sex"] == "Male"
        assert properties["size"] == "Large (approx 28 kgs)"
        assert "future_size" not in properties
        assert properties["breed"] == "Shepherd mix"

    @patch("requests.get")
    def test_scrape_animal_details_missing_hero_image(self, mock_get, scraper):
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

        details = scraper.scrape_animal_details("https://furryrescueitaly.com/adoption/test/")

        assert details.get("primary_image_url") is None

    @patch("requests.get")
    def test_scrape_animal_details_network_error(self, mock_get, scraper):
        mock_get.side_effect = Exception("Network error")

        details = scraper.scrape_animal_details("https://furryrescueitaly.com/adoption/test/")

        assert details == {}

    @patch("requests.get")
    def test_scrape_animal_details_404_response(self, mock_get, scraper):
        mock_response = Mock()
        mock_response.status_code = 404
        mock_response.raise_for_status.side_effect = Exception("404 Not Found")
        mock_get.return_value = mock_response

        details = scraper.scrape_animal_details("https://furryrescueitaly.com/adoption/missing/")

        assert details == {}

    def test_merge_animal_details_proper_age_text(self, scraper):
        animal = {
            "name": "Berry",
            "animal_type": "dog",
            "status": "available",
            "organization_id": "furryrescueitaly",
        }
        details = {
            "properties": {
                "born": "February 2023",
                "sex": "Male",
                "size": "Medium (approx 17 kgs)",
                "breed": "mix",
            }
        }

        scraper._merge_animal_details(animal, details)

        age_text = animal.get("age_text", "")
        assert len(age_text) < 100, f"age_text too long: {len(age_text)} chars"
        assert "February 2023" in age_text or "year" in age_text or age_text == ""
        assert "Sex:" not in age_text
        assert "Size:" not in age_text
        assert "Breed:" not in age_text

    def test_size_standardization_proper_case(self, scraper):
        scraper.standardizer = UnifiedStandardizer()

        animal = {
            "name": "Berry",
            "animal_type": "dog",
            "status": "available",
            "organization_id": "furryrescueitaly",
            "properties": {},
        }
        details = {"properties": {"size": "Medium (approx 17 kgs)"}}

        scraper._merge_animal_details(animal, details)

        size = animal.get("size")
        standardized = animal.get("standardized_size")
        if size:
            assert size == "Medium", f"Expected 'Medium', got '{size}'"
        if standardized is None:
            result = scraper.standardizer.apply_full_standardization(size="Medium")
            assert result["standardized_size"] == "Medium", f"Expected 'Medium', got '{result['standardized_size']}'"

    def test_thor_large_size_detection(self, scraper):
        html = """
        <div dir="auto">• Born: October 2021</div>
        <div dir="auto">• Sex: Male</div>
        <div dir="auto">• Size: Large (approx 28 kgs)</div>
        <div dir="auto">• Breed: Shepherd mix</div>
        <div dir="auto">• Personality:</div>
        """
        soup = BeautifulSoup(html, "html.parser")

        properties = scraper._extract_properties(soup)

        scraper.standardizer = UnifiedStandardizer()
        result = scraper.standardizer.apply_full_standardization(
            breed=properties.get("breed"),
            age=properties.get("born"),
            size="Large (approx 28 kgs)",
        )

        assert result["standardized_size"] == "Large"

    def test_complete_animal_processing_berry(self, scraper):
        scraper.standardizer = UnifiedStandardizer()

        animal = {
            "name": "BERRY",
            "animal_type": "dog",
            "status": "available",
            "organization_id": "furryrescueitaly",
            "adoption_url": "https://furryrescueitaly.com/adoption/berry/",
        }
        details = {
            "name": "BERRY",
            "primary_image_url": "https://furryrescueitaly.com/wp-content/uploads/2024/12/berry-foto-1-600x600.jpg",
            "properties": {
                "born": "February 2023",
                "sex": "Male",
                "size": "Medium (approx 17 kgs)",
                "breed": "mix",
                "personality": "super affectionate, good and sociable",
                "good_with": "people, dogs (sorry, no cats)",
            },
            "description": "Hi everyone! I introduce myself: my name is Berry.\n\nI was alone on the streets\u2026 searching for a bit of food.",
        }

        scraper._merge_animal_details(animal, details)
        animal = scraper.process_animal(animal)

        assert animal["name"] == "Berry"
        assert animal.get("breed") in ["Mix", "Mixed Breed"]
        assert animal.get("sex") == "Male"
        if animal.get("size"):
            assert animal.get("size") == "Medium"
        assert animal.get("standardized_size") == "Medium"

        age_text = animal.get("age_text", "")
        assert len(age_text) < 100
        assert "Sex:" not in age_text

        desc = animal.get("properties", {}).get("description", "")
        assert "Hi everyone!" in desc
        assert "\u00a9 2025" not in desc
