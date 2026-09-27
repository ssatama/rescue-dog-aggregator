"""Tests for the modernized Pets in Turkey scraper."""

import re
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
import requests
from bs4 import BeautifulSoup

from scrapers.base_scraper import ListingIncompleteError
from scrapers.pets_in_turkey.petsinturkey_scraper import PetsInTurkeyScraper, pit_external_id

LISTING = Path(__file__).parent.parent / "fixtures" / "pets_in_turkey" / "dogs.html"
ALIZA_PHOTO = "https://static.wixstatic.com/media/3da926_3efcf2b8ff6a4ae4be601a033d8c24de~mv2.jpg"


@pytest.mark.unit
class TestPetsInTurkeyScraper:
    """Test suite for modernized Pets in Turkey scraper."""

    @pytest.fixture
    def scraper(self):
        """Create scraper instance with mocked dependencies."""
        from scrapers.base_scraper import BaseScraper

        with patch("scrapers.pets_in_turkey.petsinturkey_scraper.BaseScraper.__init__") as mock_init:
            mock_init.return_value = None
            scraper = PetsInTurkeyScraper.__new__(PetsInTurkeyScraper)
            scraper.logger = MagicMock()
            scraper.rate_limit_delay = 0.1
            scraper.batch_size = 10
            scraper.skip_existing_animals = False
            scraper.timeout = 30
            scraper.max_retries = 2
            scraper.retry_backoff_factor = 2.0
            scraper.session_manager = None
            scraper.org_config = MagicMock()
            scraper.org_config.metadata.website_url = "https://www.petsinturkey.org"
            scraper.set_filtering_stats = MagicMock()
            # Set up unified standardization attributes
            scraper.use_unified_standardization = False
            scraper.standardizer = None
            # Add the process_animal method from BaseScraper
            scraper.process_animal = BaseScraper.process_animal.__get__(scraper, PetsInTurkeyScraper)
            # Now call __init__ with mocked attributes already set
            scraper.__init__(config_id="pets-in-turkey")
            return scraper

    @pytest.fixture
    def sample_html(self):
        """Sample HTML structure from Pets in Turkey website."""
        return """
        <html>
        <body>
            <div class="container">
                <div class="dog-card">
                    <h4>I'm Nico</h4>
                <img src="https://static.wixstatic.com/media/3da926_5992ee3703454ce1914dda7709e5466b~mv2.jpeg/v1/crop/x_15,y_0,w_763,h_989/fill/w_125,h_162,al_c,q_80.jpeg" />
                <p>Ready to fly on 12/09/2025</p>
                <span>Breed</span>
                <span>Weight</span>
                <span>Age</span>
                <span>Sex</span>
                <span>Neutered</span>
                <a>Adopt Me</a>
                <a>Adopt Me</a>
                <span>Jack Russell</span>
                <span>8 kg</span>
                <span>height:30cm</span>
                <span>2 yo</span>
                <span>Male</span>
                <span>Yes</span>
                </div>
            </div>
            <div class="container">
                <div class="dog-card">
                    <h4>I'm Emily</h4>
                <img src="https://static.wixstatic.com/media/3da926_d53eb15bf9a04793968940c9aeece82f~mv2.jpeg" />
                <p>Ready to fly on 24/09/2025</p>
                <span>Breed</span>
                <span>Weight</span>
                <span>Age</span>
                <span>Sex</span>
                <span>Spayed</span>
                <span>Adopt Me</span>
                <span>Adopt Me</span>
                <span>Terrier</span>
                <span>10kg</span>
                <span>height: 42cm</span>
                <span>1 y/o</span>
                <span>Female</span>
                <span>Yes</span>
                </div>
            </div>
        </body>
        </html>
        """

    def test_scraper_initialization(self, scraper):
        """Test scraper initializes with correct configuration."""
        assert scraper.base_url == "https://www.petsinturkey.org"
        assert scraper.listing_url == "https://www.petsinturkey.org/dogs"
        assert scraper.organization_name == "Pets in Turkey"

    @patch("scrapers.base_scraper.requests.get")
    def test_collect_data_success(self, mock_get, scraper, sample_html):
        """Test successful data collection from website."""
        # Mock response
        mock_response = MagicMock()
        mock_response.text = sample_html
        mock_response.raise_for_status = MagicMock()
        mock_get.return_value = mock_response

        # Collect data
        dogs = scraper.collect_data()

        # Verify
        assert len(dogs) == 2

        # Find dogs by name since order may vary
        nico = next((d for d in dogs if d["name"] == "Nico"), None)
        emily = next((d for d in dogs if d["name"] == "Emily"), None)

        assert nico is not None, "Nico not found in results"
        # The breed standardization happens in process_animal, not in the scraper
        assert nico["breed"] in [
            "Jack Russell",
            "Jack Russell Terrier",
        ]  # Could be either
        assert nico["sex"] == "Male"
        assert nico["external_id"] == "pit-5992ee3703454ce1914dda7709e5466b"
        assert "description" not in nico["properties"]
        assert nico["properties"]["weight"] == "8 kg"
        assert nico["size"] == "Small"  # 8kg = Small

        assert emily is not None, "Emily not found in results"
        assert emily["breed"] in ["Terrier", "Terrier Mix"]  # May get standardized
        assert emily["sex"] == "Female"
        assert emily["external_id"] == "pit-d53eb15bf9a04793968940c9aeece82f"

    def test_extract_dog_data(self, scraper):
        """Test extraction of data from a single dog section."""
        html = """
        <div>
            <h4>I'm Arthur</h4>
            <img src="https://static.wixstatic.com/media/3da926_a6d33cee2ac54fd9b374160d05ce888e~mv2.jpg" />
            <p>Currently in Germany (64686 Lantertal) in his foster home</p>
            <span>Breed</span>
            <span>Weight</span>
            <span>Age</span>
            <span>Sex</span>
            <span>Neutered</span>
            <span>Adopt Me</span>
            <span>Adopt Me</span>
            <span>Terrier mix</span>
            <span>15kg</span>
            <span>height: 40cm</span>
            <span>3 y/o</span>
            <span>Male</span>
            <span>Yes</span>
        </div>
        """
        soup = BeautifulSoup(html, "html.parser")
        section = soup.find("div")

        dog_data = scraper._extract_dog_data(section)

        assert dog_data["name"] == "Arthur"
        assert dog_data["breed"] in [
            "Terrier mix",
            "Terrier Mix",
        ]  # Capitalization may vary
        assert dog_data["sex"] == "Male"
        assert dog_data["size"] == "Medium"  # 15kg = Medium
        assert "description" not in dog_data["properties"]
        assert dog_data["properties"]["neutered_spayed"] == "Yes"
        assert dog_data["properties"]["height"] == "height: 40cm"

    def test_calculate_size_from_weight(self, scraper):
        """Test size calculation from weight."""
        assert scraper._calculate_size_from_weight(3) == "Tiny"
        assert scraper._calculate_size_from_weight(8) == "Small"
        assert scraper._calculate_size_from_weight(20) == "Medium"
        assert scraper._calculate_size_from_weight(35) == "Large"
        assert scraper._calculate_size_from_weight(45) == "XLarge"

    def test_clean_image_url(self, scraper):
        """Test Wix image URL cleaning."""
        # Test Wix URL with transformations
        wix_url = "https://static.wixstatic.com/media/3da926_test.jpg/v1/crop/x_15,y_0,w_763,h_989/fill/w_125,h_162.jpeg"
        cleaned = scraper._clean_image_url(wix_url)
        assert cleaned == "https://static.wixstatic.com/media/3da926_test.jpg"

        # Test regular URL
        regular_url = "https://example.com/image.jpg"
        assert scraper._clean_image_url(regular_url) == regular_url

        # Test relative URL
        relative_url = "/images/dog.jpg"
        assert scraper._clean_image_url(relative_url) == "https://www.petsinturkey.org/images/dog.jpg"

    def test_apply_standardization_leaves_missing_data_out(self, scraper):
        """No "Unknown" name or age, no "Medium" or "Mixed Breed" standing in (#564)."""
        standardized = scraper._apply_standardization({"name": "Mona", "breed": None, "sex": None, "size": None})

        assert standardized["name"] == "Mona"
        assert standardized.get("breed") != "Mixed Breed"
        assert standardized.get("standardized_size") != "Medium"
        assert "gender" not in standardized
        assert standardized.get("age_text") is None
        assert standardized["status"] == "available"
        assert standardized["animal_type"] == "dog"

    def test_a_card_without_weight_or_breed_gets_no_placeholders(self, scraper):
        html = f"""
        <div>
            <h4>I'm Mona</h4>
            <img src="{ALIZA_PHOTO}" />
            <span>Breed</span>
            <span>Adopt Me</span>
        </div>
        """
        dog_data = scraper._extract_dog_data(BeautifulSoup(html, "html.parser").find("div"))

        assert dog_data["breed"] is None
        assert dog_data["sex"] is None
        assert dog_data["size"] is None

    @patch("scrapers.base_scraper.requests.get")
    def test_a_listing_that_fails_to_load_raises_after_retries(self, mock_get, scraper):
        """A listing failure ends the run as an error, never as zero dogs (#559)."""
        mock_get.side_effect = requests.ConnectionError("Network error")

        with pytest.raises(ListingIncompleteError, match="after 3 attempt"):
            scraper.collect_data()

        assert mock_get.call_count == 3

    def test_birth_date_extraction(self, scraper):
        """Test extraction of birth date format."""
        html = """
        <div>
            <h4>I'm Shadow</h4>
            <span>Expected weight</span>
            <span>Born in</span>
            <span>Sex</span>
            <span>Adopt Me</span>
            <span>20kg</span>
            <span>11/12/2020</span>
            <span>Male</span>
        </div>
        """
        soup = BeautifulSoup(html, "html.parser")
        section = soup.find("div")

        dog_data = scraper._extract_dog_data(section)

        assert dog_data["name"] == "Shadow"
        assert dog_data["properties"].get("birth_date") == "11/12/2020"
        assert dog_data["date_of_birth"] == "11/12/2020"  # day-first: 11 December (#561)

    def test_the_id_is_the_photo_and_the_name_is_whole(self, scraper):
        """The ID survives breed and name edits; "I'm Mr Bean" is Mr Bean (#564)."""
        html = f"""
        <div>
            <h4>I'm Mr\xa0 Bean</h4>
            <img src="{ALIZA_PHOTO}/v1/fill/w_180,h_221,al_c,q_80/a.jpg" />
            <span>Breed</span>
            <span>Adopt Me</span>
            <span>Golden Retriever</span>
        </div>
        """
        dog_data = scraper._extract_dog_data(BeautifulSoup(html, "html.parser").find("div"))

        assert dog_data["name"] == "Mr Bean"
        assert dog_data["external_id"] == "pit-3efcf2b8ff6a4ae4be601a033d8c24de"
        assert dog_data["adoption_url"] == "https://www.petsinturkey.org/dogs"

    def test_pit_external_id(self):
        assert pit_external_id(ALIZA_PHOTO) == "pit-3efcf2b8ff6a4ae4be601a033d8c24de"
        assert pit_external_id("https://static.wixstatic.com/media/3da926_test.jpg") is None
        assert pit_external_id(None) is None

    @patch("scrapers.base_scraper.requests.get")
    def test_a_card_without_a_photo_is_skipped(self, mock_get, scraper):
        mock_get.return_value = MagicMock(text="""<div><div><h4>I'm Ghost</h4></div><span>Breed</span><span>Adopt Me</span><span>Mix</span><span>9 kg</span><span>Male</span></div>""")

        assert scraper.collect_data() == []
        scraper.logger.warning.assert_called_once()


@pytest.mark.unit
class TestPetsInTurkeySavedListing:
    """The /dogs page as saved on 2026-09-27: 33 dogs, then an adoption-forms repeater."""

    @pytest.fixture
    def dogs(self, stub_clock):
        scraper = PetsInTurkeyScraper()
        scraper.session_manager = None
        with patch.object(scraper, "get_listing_page", return_value=MagicMock(text=LISTING.read_text())):
            dogs = scraper.collect_data()
        assert stub_clock.calls == []  # one page, no per-dog sleep (#564)
        return {dog["name"]: dog for dog in dogs}

    def test_every_dog_once_with_its_own_photo_id(self, dogs):
        assert len(dogs) == 33
        ids = [dog["external_id"] for dog in dogs.values()]
        assert len(set(ids)) == 33
        assert all(re.fullmatch(r"pit-[0-9a-f]{32}", external_id) for external_id in ids)

    def test_a_dog(self, dogs):
        aliza = dogs["Aliza"]

        assert aliza["external_id"] == "pit-3efcf2b8ff6a4ae4be601a033d8c24de"
        assert aliza["primary_image_url"] == ALIZA_PHOTO
        assert aliza["adoption_url"] == "https://www.petsinturkey.org/dogs"
        assert aliza["breed_raw"] == "Labrador"
        assert aliza["sex"] == "Female"
        assert aliza["size"] == "Large"  # 32 kg
        assert aliza["age_text"] == "1 years"
        assert aliza["properties"]["neutered_spayed"] == "Yes"
        assert "description" not in aliza["properties"]

    def test_a_puppy_by_date_of_birth(self, dogs):
        assert dogs["Shadow"]["date_of_birth"] == "11/12/2020"
