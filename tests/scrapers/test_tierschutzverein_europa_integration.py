from unittest.mock import Mock, patch

import pytest
from bs4 import BeautifulSoup

from scrapers.tierschutzverein_europa.dogs_scraper import TierschutzvereinEuropaScraper
from scrapers.tierschutzverein_europa.translations import (
    normalize_name,
    translate_age,
    translate_breed,
    translate_gender,
)
from utils.standardization import standardize_age, standardize_breed


class TestTranslationFunctions:
    @pytest.mark.unit
    def test_normalize_name(self):
        test_cases = [
            ("SASHA", "Sasha"),
            ("MAX", "Max"),
            ("bella", "Bella"),
            ("Luna (vermittlungshilfe)", "Luna"),
            ("Mo'nique", "Mo'nique"),
        ]

        for text, expected in test_cases:
            result = normalize_name(text)
            assert result == expected, f"Expected {expected}, got {result} for text: {text}"

    @pytest.mark.unit
    def test_translate_age(self):
        test_cases = [
            ("2 Jahre alt", "2 years old"),
            ("6 Monate alt", "6 months old"),
            ("3 Jahre", "3 years"),
            ("1 Jahr alt", "1 year old"),
            ("18 Monate", "18 months"),
            ("05.2025 (3 Monate alt)", "3 months old"),
        ]

        for text, expected in test_cases:
            result = translate_age(text)
            assert result == expected, f"Expected {expected}, got {result} for text: {text}"

    @pytest.mark.unit
    def test_translate_gender(self):
        test_cases = [
            ("Hündin", "Female"),
            ("Rüde", "Male"),
            ("weiblich", "Female"),
            ("männlich", "Male"),
            ("hündin", "Female"),
            ("rüde", "Male"),
        ]

        for text, expected in test_cases:
            result = translate_gender(text)
            assert result == expected, f"Expected {expected}, got {result} for text: {text}"

    @pytest.mark.unit
    def test_translate_breed(self):
        test_cases = [
            ("Deutscher Schäferhund", "German Shepherd"),
            ("Mischling", "Mixed Breed"),
            ("Golden Retriever Mix", "Golden Retriever Mix"),
            ("Labrador", "Labrador"),
            ("Herdenschutz Mix", "Livestock Guardian Mix"),
        ]

        for text, expected in test_cases:
            result = translate_breed(text)
            assert result == expected, f"Expected {expected}, got {result} for text: {text}"

    @pytest.mark.unit
    def test_normalize_name_removes_parenthetical_text(self):
        test_cases = [
            ("Strolch (vermittlungshilfe)", "Strolch"),
            ("Vera (gnadenplatz)", "Vera"),
            ("Moon (genannt coco)", "Moon"),
            ("Yin (jetzt enie)", "Yin"),
            ("Whiskey (gnadenplatz)", "Whiskey"),
            ("Monter (wahrscheinlich älter als angegeben)", "Monter"),
        ]

        for input_name, expected in test_cases:
            result = normalize_name(input_name)
            assert result == expected, f"Expected {expected}, got {result} for: {input_name}"

    @pytest.mark.unit
    def test_normalize_name_handles_quotes(self):
        test_cases = [
            ('Mo\'nique "vermittlungshilfe"', "Mo'nique"),
            ('Bo "vermittlungshilfe"', "Bo"),
            ('Test "some text"', "Test"),
        ]

        for input_name, expected in test_cases:
            result = normalize_name(input_name)
            assert result == expected, f"Expected {expected}, got {result} for: {input_name}"

    @pytest.mark.unit
    def test_normalize_name_handles_ampersand(self):
        assert normalize_name("Benji & dali") == "Benji & Dali"
        assert normalize_name("max & moritz") == "Max & Moritz"

    @pytest.mark.unit
    def test_translate_age_date_patterns(self):
        test_cases = [
            ("01.2024 (1 Jahr alt)", "1 year old"),
            ("09.2020 (4 Jahre alt)", "4 years old"),
            ("06.2025 (2 Monate alt)", "2 months old"),
            ("02.2022 (3 Jahre alt)", "3 years old"),
            ("11.2024 (9 Monate alt)", "9 months old"),
            ("12.2024 (8 Monate alt)", "8 months old"),
        ]

        for text, expected in test_cases:
            result = translate_age(text)
            assert result == expected, f"Expected {expected}, got {result} for: {text}"

    @pytest.mark.unit
    def test_translate_age_simple_patterns(self):
        test_cases = [
            ("1 Monat alt", "1 month old"),
            ("1 Jahr", "1 year"),
            ("5 Monate", "5 months"),
        ]

        for text, expected in test_cases:
            result = translate_age(text)
            assert result == expected, f"Expected {expected}, got {result} for: {text}"

    @pytest.mark.unit
    def test_translate_age_unknown_and_empty(self):
        assert translate_age("Unbekannt") is None
        assert translate_age("unbekannt") is None
        assert translate_age("") is None
        assert translate_age(None) is None

    @pytest.mark.unit
    def test_translate_breed_extended(self):
        test_cases = [
            ("Mischlinge", "Mixed Breed"),
            ("Bodeguero Mix", "Bodeguero Andaluz Mix"),
            ("Mastin", "Spanish Mastiff"),
            ("Spanischer Windhund", "Spanish Greyhound"),
            ("Perdiguero de Burgos", "Burgos Pointer"),
            ("Braco Aleman Mix", "German Shorthaired Pointer Mix"),
            ("Bracken-Mix", "Hound-Mix"),
            ("Schäferhund Mischling", "German Shepherd Mix"),
            ("Herdenschutzhund", "Livestock Guardian Dog"),
            ("Jagdhund Mix", "Hunting Dog Mix"),
            ("Podenco-Mischling", "Podenco Mix"),
        ]

        for text, expected in test_cases:
            result = translate_breed(text)
            assert result == expected, f"Expected {expected}, got {result} for: {text}"

    @pytest.mark.unit
    def test_translate_gender_none_and_empty(self):
        assert translate_gender(None) is None
        assert translate_gender("") is None


class TestScraperCoreFunctions:
    @pytest.fixture
    def scraper(self):
        with patch("scrapers.base_scraper.BaseScraper.__init__", return_value=None):
            scraper = TierschutzvereinEuropaScraper.__new__(TierschutzvereinEuropaScraper)
            scraper.base_url = "https://tierschutzverein-europa.de"
            scraper.listing_url = "https://tierschutzverein-europa.de/tiervermittlung/"
            scraper.logger = Mock()
            scraper.rate_limit_delay = 0
            scraper.batch_size = 2
            scraper.skip_existing_animals = False
            return scraper

    @pytest.fixture
    def listing_html(self):
        return """
        <html>
        <body>
            <article class="tiervermittlung type-tiervermittlung">
                <a href="/tiervermittlung/bonsai-in-spanien-perros-con-alma-zaragoza/">
                    <img src="https://tierschutzverein-europa.de/wp-content/uploads/2025/08/startbild-bonsai-300x300.jpg" alt="Bonsai">
                    <h2>Bonsai</h2>
                </a>
            </article>
            <article class="tiervermittlung type-tiervermittlung">
                <a href="/tiervermittlung/nano-in-spanien-protectora-villena/">
                    <img src="https://tierschutzverein-europa.de/wp-content/uploads/2025/08/nano-profile-300x300.jpg" alt="Nano">
                    <h2>Nano</h2>
                </a>
            </article>
            <article class="tiervermittlung type-tiervermittlung">
                <a href="/tiervermittlung/bacon-in-deutschland-vermittlungshilfe/">
                    <img src="https://tierschutzverein-europa.de/wp-content/uploads/2025/08/bacon-main-300x300.jpg" alt="Bacon">
                    <h2>Bacon</h2>
                </a>
            </article>
        </body>
        </html>
        """

    @pytest.fixture
    def detail_html(self):
        return """
        <html>
        <body>
            <img class="hero-image" src="https://tierschutzverein-europa.de/wp-content/uploads/2025/08/bonsai-hero-600x400.jpg" alt="Bonsai Hero">
            <table class="dog-info">
                <tr><td>Name:</td><td>Bonsai</td></tr>
                <tr><td>Rasse:</td><td>Mischling</td></tr>
                <tr><td>Geschlecht:</td><td>männlich</td></tr>
                <tr><td>Geburtstag:</td><td>05.2025 (3 Monate alt)</td></tr>
                <tr><td>Ungefähre Größe:</td><td>17 cm, im Wachstum, klein bleibend</td></tr>
                <tr><td>Kastriert:</td><td>zu jung</td></tr>
                <tr><td>Katzentest:</td><td>auf Anfrage</td></tr>
                <tr><td>Besonderheiten:</td><td>keine bekannt</td></tr>
                <tr><td>Mittelmeertest:</td><td>zu jung</td></tr>
                <tr><td>Aufenthaltsort:</td><td>Hundepension von Perros con Alma</td></tr>
            </table>
            <h2>Beschreibung</h2>
            <p>Bonsai – Klein, aber voller Lebensfreude</p>
            <p>Auch Bonsai ist einer von 15 Welpen, die ohne ihre Mütter im Tierheim abgegeben wurden.
            Sein Start ins Leben war nicht leicht, aber Bonsai schlägt sich tapfer.</p>
        </body>
        </html>
        """

    @pytest.mark.unit
    def test_extract_external_id_from_url(self, scraper):
        test_cases = [
            (
                "/tiervermittlung/abel-in-spanien-huellas-con-esperanza/",
                "abel-in-spanien-huellas-con-esperanza",
            ),
            (
                "/tiervermittlung/abril-in-spanien-tierheim-ada-canals/",
                "abril-in-spanien-tierheim-ada-canals",
            ),
            (
                "/tiervermittlung/akeno-in-rumaenien-tierheim-odai/",
                "akeno-in-rumaenien-tierheim-odai",
            ),
            (
                "/tiervermittlung/bonsai-in-spanien-perros-con-alma-zaragoza/",
                "bonsai-in-spanien-perros-con-alma-zaragoza",
            ),
            (
                "/tiervermittlung/nano-in-spanien-protectora-villena/",
                "nano-in-spanien-protectora-villena",
            ),
            (
                "/tiervermittlung/bacon-in-deutschland-vermittlungshilfe/",
                "bacon-in-deutschland-vermittlungshilfe",
            ),
            ("/tiervermittlung/luna-rumaenien/", "luna-rumaenien"),
        ]

        for url, expected in test_cases:
            result = scraper._extract_external_id_from_url(url)
            assert result == expected, f"Expected {expected}, got {result} for URL {url}"

    @pytest.mark.unit
    def test_pagination_url_generation(self, scraper):
        base_url = "https://tierschutzverein-europa.de/tiervermittlung/"

        assert scraper.get_page_url(1) == base_url

        for page in range(2, 13):
            result = scraper.get_page_url(page)
            expected = f"{base_url}page/{page}/"
            assert result == expected, f"Expected {expected}, got {result}"

    @pytest.mark.unit
    def test_get_animal_list_extracts_dogs_from_listing(self, scraper, listing_html):
        call_count = [0]

        def mock_get(*args, **kwargs):
            call_count[0] += 1
            mock_response = Mock()
            if call_count[0] == 1:
                mock_response.text = listing_html
            else:
                mock_response.text = "<html><body></body></html>"
            mock_response.raise_for_status = Mock()
            return mock_response

        with patch("requests.get", side_effect=mock_get):
            animals = scraper.get_animal_list()

        assert len(animals) == 3

        assert animals[0]["name"] == "Bonsai"
        assert animals[0]["external_id"] == "bonsai-in-spanien-perros-con-alma-zaragoza"
        assert animals[0]["adoption_url"] == "https://tierschutzverein-europa.de/tiervermittlung/bonsai-in-spanien-perros-con-alma-zaragoza/"

        assert animals[1]["name"] == "Nano"
        assert animals[1]["external_id"] == "nano-in-spanien-protectora-villena"

        assert animals[2]["name"] == "Bacon"
        assert animals[2]["external_id"] == "bacon-in-deutschland-vermittlungshilfe"

    @pytest.mark.unit
    def test_scrape_animal_details_extracts_german_properties(self, scraper, detail_html):
        mock_response = Mock()
        mock_response.text = detail_html
        mock_response.raise_for_status = Mock()

        with patch("requests.get", return_value=mock_response):
            details = scraper._scrape_animal_details("https://tierschutzverein-europa.de/tiervermittlung/bonsai/")

        assert details["primary_image_url"] == "https://tierschutzverein-europa.de/wp-content/uploads/2025/08/bonsai-hero-600x400.jpg"
        assert details["image_urls"] == ["https://tierschutzverein-europa.de/wp-content/uploads/2025/08/bonsai-hero-600x400.jpg"]

        properties = details["properties"]
        assert properties["Name"] == "Bonsai"
        assert properties["Rasse"] == "Mischling"
        assert properties["Geschlecht"] == "männlich"
        assert properties["Geburtstag"] == "05.2025 (3 Monate alt)"
        assert properties["Ungefähre Größe"] == "17 cm, im Wachstum, klein bleibend"
        assert properties["Kastriert"] == "zu jung"
        assert properties["Katzentest"] == "auf Anfrage"
        assert properties["Besonderheiten"] == "keine bekannt"
        assert properties["Mittelmeertest"] == "zu jung"
        assert properties["Aufenthaltsort"] == "Hundepension von Perros con Alma"

        assert "Beschreibung" in properties
        assert "Klein, aber voller Lebensfreude" in properties["Beschreibung"]
        assert "ohne ihre Mütter im Tierheim" in properties["Beschreibung"]

    @pytest.mark.unit
    def test_process_animals_parallel_batching(self, scraper):
        animals = [
            {"name": "Dog1", "adoption_url": "url1", "external_id": "dog1"},
            {"name": "Dog2", "adoption_url": "url2", "external_id": "dog2"},
            {"name": "Dog3", "adoption_url": "url3", "external_id": "dog3"},
            {"name": "Dog4", "adoption_url": "url4", "external_id": "dog4"},
        ]

        call_count = 0

        def mock_scrape_details(url):
            nonlocal call_count
            call_count += 1
            return {"properties": {"test": f"data_{call_count}"}}

        scraper._scrape_animal_details = mock_scrape_details
        scraper.batch_size = 2

        result = scraper._process_animals_parallel(animals)

        assert len(result) == 4
        assert call_count == 4
        for animal in result:
            assert "properties" in animal
            assert "test" in animal["properties"]

    @pytest.mark.unit
    def test_hero_image_extraction_from_detail_page(self, scraper):
        html_with_images = """
        <html>
        <body>
            <img class="wp-post-image" src="https://tierschutzverein-europa.de/wp-content/uploads/2025/08/bonsai-hero.jpg" alt="Bonsai">
            <div class="gallery">
                <img src="https://tierschutzverein-europa.de/wp-content/uploads/2025/08/bonsai-1.jpg" alt="Bonsai 1">
                <img src="https://tierschutzverein-europa.de/wp-content/uploads/2025/08/bonsai-2.jpg" alt="Bonsai 2">
            </div>
        </body>
        </html>
        """

        soup = BeautifulSoup(html_with_images, "html.parser")
        hero_image = scraper._extract_hero_image(soup)

        assert hero_image == "https://tierschutzverein-europa.de/wp-content/uploads/2025/08/bonsai-hero.jpg"

    @pytest.mark.unit
    def test_german_properties_extraction_with_missing_fields(self, scraper):
        html_partial = """
        <html>
        <body>
            <table class="dog-info">
                <tr><td>Name:</td><td>Luna</td></tr>
                <tr><td>Rasse:</td><td>Labrador Mix</td></tr>
                <tr><td>Geschlecht:</td><td>weiblich</td></tr>
            </table>
            <h2>Beschreibung</h2>
            <p>Luna ist eine liebevolle Hündin.</p>
        </body>
        </html>
        """

        soup = BeautifulSoup(html_partial, "html.parser")
        properties = scraper._extract_properties_from_soup(soup)

        assert properties["Name"] == "Luna"
        assert properties["Rasse"] == "Labrador Mix"
        assert properties["Geschlecht"] == "weiblich"

        assert "Beschreibung" in properties
        assert "liebevolle Hündin" in properties["Beschreibung"]

        assert "Geburtstag" not in properties or properties["Geburtstag"] is None


@pytest.mark.database
@pytest.mark.integration
@pytest.mark.browser
@pytest.mark.slow
class TestTierschutzvereinEuropaIntegration:
    def test_scraper_base_scraper_integration(self):
        scraper = TierschutzvereinEuropaScraper(config_id="tierschutzverein-europa")

        german_dogs = [
            {
                "name": "BELLA",
                "sex": "Hündin",
                "age_text": "3 Jahre",
                "breed": "Deutscher Schäferhund",
                "external_id": "bella-123",
                "adoption_url": "https://tierschutzverein-europa.de/tiervermittlung/bella-123/",
                "properties": {
                    "source": "tierschutzverein-europa.de",
                    "country": "DE",
                    "language": "de",
                },
            },
            {
                "name": "MAX",
                "sex": "Rüde",
                "age_text": "1 Jahre",
                "breed": "Mischling",
                "external_id": "max-456",
                "adoption_url": "https://tierschutzverein-europa.de/tiervermittlung/max-456/",
                "properties": {
                    "source": "tierschutzverein-europa.de",
                    "country": "DE",
                    "language": "de",
                },
            },
        ]

        with (
            patch.object(scraper, "get_animal_list", return_value=german_dogs),
            patch.object(scraper, "_process_animals_parallel", return_value=german_dogs),
        ):
            english_dogs = scraper.collect_data()

        assert len(english_dogs) == 2

        bella = english_dogs[0]
        assert bella["name"] == "Bella"
        assert bella["sex"] == "Female"
        assert bella["age_text"] == "3 years"
        assert bella["breed"] == "German Shepherd"
        assert bella["properties"]["language"] == "en"
        assert bella["properties"]["original_language"] == "de"

        max_dog = english_dogs[1]
        assert max_dog["name"] == "Max"
        assert max_dog["sex"] == "Male"
        assert max_dog["age_text"] == "1 year"
        assert max_dog["breed"] == "Mixed Breed"

        for dog in english_dogs:
            breed_info = standardize_breed(dog["breed"])
            assert breed_info is not None, f"Breed standardization failed for {dog['breed']}"
            standardized_breed, breed_group, size_estimate = breed_info
            assert standardized_breed is not None, f"No standardized breed for {dog['breed']}"

            age_info = standardize_age(dog["age_text"])
            assert age_info is not None, f"Age standardization failed for {dog['age_text']}"
            assert "age_min_months" in age_info, f"Missing age_min_months for {dog['age_text']}"
            assert "age_max_months" in age_info, f"Missing age_max_months for {dog['age_text']}"

    def test_translation_preserves_semantic_meaning(self):
        scraper = TierschutzvereinEuropaScraper(config_id="tierschutzverein-europa")

        test_dogs = [
            {
                "name": "YOUNG_DOG",
                "sex": "Hündin",
                "age_text": "1 Jahre",
                "breed": "Mischling",
                "external_id": "young-123",
            },
            {
                "name": "OLD_DOG",
                "sex": "Rüde",
                "age_text": "12 Jahre",
                "breed": "Deutscher Schäferhund",
                "external_id": "old-456",
            },
        ]

        with patch.object(scraper, "_process_animals_parallel", return_value=test_dogs):
            translated_dogs = scraper.collect_data()

        young_dog = translated_dogs[0]
        age_info = standardize_age(young_dog["age_text"])
        assert age_info["age_min_months"] <= 12, "Young dog not categorized as young"

        old_dog = translated_dogs[1]
        age_info = standardize_age(old_dog["age_text"])
        assert age_info["age_min_months"] >= 120, "Old dog not categorized as senior"

    def test_breed_translation_enables_size_estimation(self):
        scraper = TierschutzvereinEuropaScraper(config_id="tierschutzverein-europa")

        test_dogs = [
            {
                "name": "SHEPHERD_DOG",
                "sex": "Rüde",
                "age_text": "5 Jahre",
                "breed": "Deutscher Schäferhund",
                "external_id": "shepherd-123",
            }
        ]

        with patch.object(scraper, "_process_animals_parallel", return_value=test_dogs):
            translated_dogs = scraper.collect_data()

        dog = translated_dogs[0]

        assert "German Shepherd" in dog["breed"]

        standardized_breed, breed_group, size_estimate = standardize_breed(dog["breed"])

        assert "Shepherd" in standardized_breed or "German Shepherd" in standardized_breed
        assert size_estimate in ["Medium", "Large", "XLarge"] or size_estimate is None

    def test_error_handling_in_translation(self):
        scraper = TierschutzvereinEuropaScraper(config_id="tierschutzverein-europa")

        problematic_dogs = [
            {
                "name": None,
                "sex": "Invalid",
                "age_text": "",
                "breed": "",
                "external_id": "problem-123",
            },
            {
                "name": "GOOD_DOG",
                "sex": "Hündin",
                "age_text": "2 Jahre",
                "breed": "Mischling",
                "external_id": "good-456",
            },
        ]

        with patch.object(scraper, "_process_animals_parallel", return_value=problematic_dogs):
            translated_dogs = scraper.collect_data()

        assert len(translated_dogs) == 2

        good_dog = next(dog for dog in translated_dogs if dog.get("external_id") == "good-456")
        assert good_dog["name"] == "Good_dog"
        assert good_dog["sex"] == "Female"
        assert good_dog["age_text"] == "2 years"
        assert good_dog["breed"] == "Mixed Breed"

    def test_fallback_extraction_methods_include_translation(self):
        scraper = TierschutzvereinEuropaScraper(config_id="tierschutzverein-europa")

        german_dog = [
            {
                "name": "TEST_DOG",
                "sex": "Rüde",
                "age_text": "4 Jahre",
                "breed": "Mischling",
                "external_id": "test-123",
                "adoption_url": "https://test.com/test-123",
            }
        ]

        with (
            patch.object(scraper, "get_animal_list", return_value=german_dog),
            patch.object(scraper, "_process_animals_parallel", return_value=german_dog),
        ):
            translated_dogs = scraper.collect_data()

        assert len(translated_dogs) == 1
        dog = translated_dogs[0]
        assert dog["name"] == "Test_dog"
        assert dog["sex"] == "Male"
        assert dog["age_text"] == "4 years"
        assert dog["breed"] == "Mixed Breed"

    def test_actual_database_patterns_work_with_pipeline(self):
        scraper = TierschutzvereinEuropaScraper(config_id="tierschutzverein-europa")

        real_dogs = [
            {
                "name": "ASHANTI",
                "sex": "Hündin",
                "age_text": "3 Jahre",
                "breed": "Podenco-Mischling",
                "external_id": "ashanti-real",
            },
            {
                "name": "DEXTER",
                "sex": "Rüde",
                "age_text": "7 Jahre",
                "breed": "Schäferhund Mischling",
                "external_id": "dexter-real",
            },
        ]

        with patch.object(scraper, "_process_animals_parallel", return_value=real_dogs):
            translated_dogs = scraper.collect_data()

        for dog in translated_dogs:
            assert dog["name"] not in ["ASHANTI", "DEXTER"]
            assert dog["sex"] in ["Male", "Female"]
            assert "years" in dog["age_text"]

            age_info = standardize_age(dog["age_text"])
            assert age_info is not None
            assert age_info["age_min_months"] > 0

            breed_info = standardize_breed(dog["breed"])
            assert breed_info is not None

    def test_exact_example_from_requirements(self):
        scraper = TierschutzvereinEuropaScraper(config_id="tierschutzverein-europa")

        german_dogs = [
            {
                "name": "BELLA",
                "sex": "Hündin",
                "age_text": "3 Jahre",
                "breed": "Deutscher Schäferhund",
                "external_id": "bella-123",
                "adoption_url": "https://tierschutzverein-europa.de/bella-123",
            }
        ]

        with (
            patch.object(scraper, "get_animal_list", return_value=german_dogs),
            patch.object(scraper, "_process_animals_parallel", return_value=german_dogs),
        ):
            english_dogs = scraper.collect_data()

        dog = english_dogs[0]
        assert dog["name"] == "Bella"
        assert dog["sex"] == "Female"
        assert dog["age_text"] == "3 years"
        assert dog["breed"] == "German Shepherd"

        breed_info = standardize_breed(dog["breed"])
        assert breed_info[0] == "German Shepherd Dog"

        age_info = standardize_age(dog["age_text"])
        assert age_info["age_min_months"] == 36
