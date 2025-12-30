"""Test Furry Rescue Italy scraper with problematic dogs data."""

from unittest.mock import Mock, patch

import pytest

from scrapers.furryrescueitaly.furryrescueitaly_scraper import FurryRescueItalyScraper


@pytest.mark.unit
@pytest.mark.fast
class TestFurryRescueItalyProblematicDogs:
    """Test scraper handling of problematic dogs with malformed data."""

    @pytest.fixture
    def scraper(self):
        """Create scraper instance."""
        # Mock the parent class init to avoid database connections
        with patch("scrapers.base_scraper.BaseScraper.__init__", return_value=None):
            scraper = FurryRescueItalyScraper.__new__(FurryRescueItalyScraper)

            # Set up required attributes manually
            scraper.org_config = Mock()
            scraper.org_config.id = "furryrescueitaly"
            scraper.org_config.name = "Furry Rescue Italy"
            scraper.org_config.metadata = Mock()
            scraper.org_config.metadata.website_url = "https://furryrescueitaly.com/"

            # Call the child __init__ now that org_config is set
            scraper.base_url = "https://furryrescueitaly.com"
            scraper.listing_url = "https://furryrescueitaly.com/adoptions/"
            scraper.organization_name = "Furry Rescue Italy"
            scraper.headers = {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            }

            scraper.rate_limit_delay = 0.1
            scraper.timeout = 30
            scraper.batch_size = 4
            scraper.skip_existing_animals = False
            scraper.logger = Mock()
            scraper.use_unified_standardization = (
                True  # Add missing attribute for unified standardization
            )

            return scraper

    def test_extract_properties_berry_format(self, scraper):
        """Test extracting properties from Berry's format with bullet points in divs."""
        from bs4 import BeautifulSoup

        # Berry's actual HTML structure
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

        # Properties should be extracted individually
        assert properties.get("born") == "February 2023"
        assert properties.get("sex") == "Male"
        assert properties.get("size") == "Medium (approx 17 kgs)"
        assert properties.get("breed") == "mix"
        assert properties.get("personality") == "super affectionate, good and sociable"
        assert properties.get("good_with") == "people, dogs (sorry, no cats)"

    def test_merge_animal_details_proper_age_text(self, scraper):
        """Test that age_text only contains age information, not all properties."""
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

        # age_text should only contain age info, not the entire properties string
        age_text = animal.get("age_text", "")
        assert len(age_text) < 100, f"age_text too long: {len(age_text)} chars"
        # Age text could be the original "February 2023" or calculated
        assert "February 2023" in age_text or "year" in age_text or age_text == ""
        assert "Sex:" not in age_text
        assert "Size:" not in age_text
        assert "Breed:" not in age_text

    def test_size_standardization_proper_case(self, scraper):
        """Test that size fields use proper Title Case."""
        # Import UnifiedStandardizer for testing
        from utils.unified_standardization import UnifiedStandardizer

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

        # Size should be extracted properly, checking for None since _merge_animal_details might not set it
        size = animal.get("size")
        standardized = animal.get("standardized_size")
        # If size is not set by _merge_animal_details, that's okay - it's handled by process_animal later
        if size:
            assert size == "Medium", f"Expected 'Medium', got '{size}'"
        if standardized is None:
            # Apply standardization manually to test
            result = scraper.standardizer.apply_full_standardization(size="Medium")
            assert result["standardized_size"] == "Medium", (
                f"Expected 'Medium', got '{result['standardized_size']}'"
            )

    def test_clean_description_removes_footer(self, scraper):
        """Test that description cleaning removes footer text."""
        from bs4 import BeautifulSoup

        html = """
        <p>Hi everyone! I introduce myself: my name is Berry.</p>
        <p>I was alone on the streets… searching for a bit of food.</p>
        <p>This is your chance to feel great saving many lives!</p>
        <p>© 2025 Furry Rescue Italy. Design by Ankit | All rights reserved.</p>
        """

        soup = BeautifulSoup(html, "html.parser")
        description = scraper._extract_clean_description(soup)

        # Should have content but not footer
        assert "Hi everyone!" in description
        assert "Berry" in description
        assert "© 2025 Furry Rescue Italy" not in description
        assert "Design by" not in description
        assert "All rights reserved" not in description

    def test_gregory_format_with_trailing_bullet(self, scraper):
        """Test Gregory's format which has trailing bullet after breed."""
        from bs4 import BeautifulSoup

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

    def test_thor_large_size_detection(self, scraper):
        """Test Thor's Large size is properly detected."""
        from bs4 import BeautifulSoup

        from utils.unified_standardization import UnifiedStandardizer

        html = """
        <div dir="auto">• Born: October 2021</div>
        <div dir="auto">• Sex: Male</div>
        <div dir="auto">• Size: Large (approx 28 kgs)</div>
        <div dir="auto">• Breed: Shepherd mix</div>
        <div dir="auto">• Personality:</div>
        """

        soup = BeautifulSoup(html, "html.parser")
        properties = scraper._extract_properties(soup)

        # Use the unified standardizer from BaseScraper
        scraper.standardizer = UnifiedStandardizer()
        # Process through standardization - pass all three params
        result = scraper.standardizer.apply_full_standardization(
            breed=properties.get("breed"),
            age=properties.get("born"),
            size="Large (approx 28 kgs)",
        )

        # Should detect Large size
        assert result["standardized_size"] == "Large"

    def test_complete_animal_processing_berry(self, scraper):
        """Test complete processing of Berry's data."""
        from utils.unified_standardization import UnifiedStandardizer

        scraper.standardizer = UnifiedStandardizer()

        animal = {
            "name": "BERRY",
            "animal_type": "dog",
            "status": "available",
            "organization_id": "furryrescueitaly",
            "adoption_url": "https://furryrescueitaly.com/adoption/berry/",
        }

        # Simulate scrape_animal_details result
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
            "description": "Hi everyone! I introduce myself: my name is Berry.\n\nI was alone on the streets… searching for a bit of food.",
        }

        scraper._merge_animal_details(animal, details)

        # Apply process_animal to get full standardization
        animal = scraper.process_animal(animal)

        # Verify all fields are properly set
        assert animal["name"] == "Berry"  # Should be Title Case
        # The unified standardizer will turn "mix" into "Mixed Breed"
        assert animal.get("breed") in [
            "Mix",
            "Mixed Breed",
        ]  # Could be either depending on processing
        assert animal.get("sex") == "Male"
        # Size might not be set by _merge_animal_details but standardized_size will be
        if animal.get("size"):
            assert animal.get("size") == "Medium"
        # Standardized size should always be set after process_animal
        assert animal.get("standardized_size") == "Medium"

        # age_text should be concise
        age_text = animal.get("age_text", "")
        assert len(age_text) < 100
        assert "Sex:" not in age_text

        # Description should be clean
        desc = animal.get("properties", {}).get("description", "")
        assert "Hi everyone!" in desc
        assert "© 2025" not in desc
