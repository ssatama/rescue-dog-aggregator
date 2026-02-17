from datetime import datetime
from unittest.mock import Mock, patch

import pytest
from bs4 import BeautifulSoup

from scrapers.misis_rescue.detail_parser import MisisRescueDetailParser
from scrapers.misis_rescue.normalizer import (
    calculate_age_years,
    extract_birth_date,
    extract_breed,
    extract_sex,
    normalize_name,
    normalize_size,
)
from scrapers.misis_rescue.normalizer import (
    extract_age_from_text_legacy as extract_age_from_text,
)
from scrapers.misis_rescue.normalizer import (
    extract_breed_from_text_legacy as extract_breed_from_text,
)
from scrapers.misis_rescue.normalizer import (
    extract_sex_from_text_legacy as extract_sex_from_text,
)
from scrapers.misis_rescue.normalizer import (
    extract_weight_kg_legacy as extract_weight_kg,
)
from scrapers.misis_rescue.scraper import MisisRescueScraper
from tests.scrapers.test_scraper_base import ScraperTestBase
from utils.standardization import get_size_from_breed


@pytest.mark.unit
class TestMisisRescueScraper(ScraperTestBase):
    scraper_class = MisisRescueScraper
    config_id = "misisrescue"
    expected_org_name = "MISIs Animal Rescue"
    expected_base_url = "https://www.misisrescue.com"

    def test_skips_reserved_section(self, scraper):
        html_with_reserved = """
        <html><body>
            <div><a href="/post/dog1">Dog 1</a><a href="/post/dog2">Dog 2</a></div>
            <h2>💙⭐Reserved⭐💙</h2>
            <div><a href="/post/reserved-dog">Reserved Dog</a></div>
        </body></html>
        """
        soup = BeautifulSoup(html_with_reserved, "html.parser")
        reserved_heading = soup.find("h2", string=lambda text: text and "reserved" in text.lower())
        assert scraper._is_reserved_section(reserved_heading)
        available_dogs = scraper._extract_dogs_before_reserved(soup)
        assert len(available_dogs) == 2

    def test_extract_dog_urls_from_page(self, scraper):
        mock_html = '<html><main class="PAGES_CONTAINER"><a href="/post/dog-1" class="O16KGI">Dog 1</a><a href="/post/dog-2" class="O16KGI">Dog 2</a></main></html>'
        mock_driver_instance = Mock()
        mock_driver_instance.page_source = mock_html
        mock_driver_instance.quit = Mock()

        with patch.object(scraper, "_setup_selenium_driver", return_value=mock_driver_instance):
            urls = scraper._extract_dog_urls_from_page(1)
            assert len(urls) == 2
            assert all("/post/" in url for url in urls)

    def test_pagination_logic(self, scraper):
        with patch.object(scraper, "_extract_dog_urls_from_page") as mock_extract:
            mock_extract.side_effect = [["url1", "url2"], ["url3"], []]
            all_urls = scraper._get_all_dog_urls()
            assert len(all_urls) == 3
            assert mock_extract.call_count == 3

    def test_external_id_generation(self, scraper):
        test_url = "https://www.misisrescue.com/post/amena-123"
        external_id = scraper._generate_external_id(test_url)
        assert external_id == "mar-amena-123"

    def test_reserved_section_detection_variations(self, scraper):
        test_cases = ["💙⭐Reserved⭐💙", "Reserved", "RESERVED DOGS"]
        for reserved_text in test_cases:
            mock_element = Mock()
            mock_element.get_text.return_value = reserved_text
            assert scraper._is_reserved_section(mock_element)

    def test_detail_page_scraping(self, scraper):
        mock_html = "<html><body><h1>Test Dog</h1><div><ul><li>DOB: 2022</li><li>Mixed breed</li><li>weighs 15kg</li></ul></div></body></html>"
        mock_driver_instance = Mock()
        mock_driver_instance.page_source = mock_html
        mock_driver_instance.title = "Test Dog - MISIs Animal Rescue"
        mock_driver_instance.quit = Mock()

        with patch.object(scraper, "_setup_selenium_driver", return_value=mock_driver_instance):
            dog_data = scraper._scrape_dog_detail("https://example.com/post/test-dog")
            assert dog_data["name"] == "Test Dog"
            assert dog_data["external_id"] == "mar-test-dog"

    def test_no_pagination_loop(self, scraper):
        with patch.object(scraper, "_extract_dog_urls_from_page") as mock_extract:
            mock_extract.side_effect = [
                [
                    "/post/dog1",
                    "/post/dog2",
                    "/post/dog3",
                    "/post/dog4",
                    "/post/dog5",
                    "/post/dog6",
                    "/post/dog7",
                ],
                [],
            ]

            all_urls = scraper._get_all_dog_urls()

            assert len(all_urls) == 7
            assert len(set(all_urls)) == 7
            assert mock_extract.call_count == 2


@pytest.mark.unit
class TestMisisRescueNormalizer:
    def test_extract_birth_date_various_formats(self):
        assert extract_birth_date("rough estimate DOB 2021") == "2021"
        assert extract_birth_date("DOB: March 2023") == "March 2023"
        assert extract_birth_date("DOB: April/May 2024") == "April/May 2024"
        assert extract_birth_date("no date info") is None
        assert extract_birth_date("born in 2022") == "2022"
        assert extract_birth_date("birthday: June 2023") == "June 2023"
        assert extract_birth_date("") is None
        assert extract_birth_date(None) is None

    def test_extract_birth_date_comprehensive(self):
        test_cases = [
            ("rough estimate DOB 2021", "2021"),
            ("DOB: March 2023", "March 2023"),
            ("DOB: April/May 2024", "April/May 2024"),
            ("born in 2022", "2022"),
            ("birthday: June 2023", "June 2023"),
            ("date of birth: 2020", "2020"),
            ("DOB 2019", "2019"),
            ("born: December 2021", "December 2021"),
            ("no date information", None),
            ("just some text", None),
        ]

        for input_text, expected in test_cases:
            result = extract_birth_date(input_text)
            assert result == expected, f"Failed for input: {input_text}"

    def test_extract_birth_date_dob_dash_format(self):
        assert extract_birth_date("DOB- 2023") == "2023"
        assert extract_birth_date("DOB 2022") == "2022"
        assert extract_birth_date("DOB: 2021") == "2021"
        assert extract_birth_date("DOB - october 2022") == "october 2022"
        assert extract_birth_date("born: December 2021") == "December 2021"

    def test_extract_birth_date_dash_before_month_range(self):
        text = "rough estimate DOB -April /May 2024"
        birth_date = extract_birth_date(text)
        assert birth_date == "April /May 2024"

    def test_extract_birth_date_spaces_in_month_range(self):
        test_cases = [
            "DOB -April /May 2024",
            "DOB: April/May 2024",
            "DOB - April / May 2024",
            "DOB:April /May 2024",
        ]

        for text in test_cases:
            birth_date = extract_birth_date(text)
            assert birth_date is not None, f"Failed to extract from: {text}"
            assert "2024" in birth_date, f"Year not found in result from: {text}"

    def test_calculate_age_years(self):
        current_year = datetime.now().year
        assert calculate_age_years("2021") == float(current_year - 2021)
        assert calculate_age_years("2023") == float(current_year - 2023)

        march_2023_age = calculate_age_years("March 2023")
        assert march_2023_age is not None
        assert march_2023_age > 0

        april_2024_age = calculate_age_years("April/May 2024")
        assert april_2024_age is not None
        assert april_2024_age > 0

        assert calculate_age_years("no date") is None
        assert calculate_age_years("") is None
        assert calculate_age_years(None) is None

    def test_extract_breed(self):
        assert extract_breed(["rough estimate DOB 2021", "10kg", "mixed breed"]) == "Mixed Breed"
        assert extract_breed(["DOB: March 2023", "Mixed breed", "weighs 2-3kg"]) == "Mixed Breed"
        assert extract_breed(["DOB: 2022", "Golden Retriever mix", "loves walks"]) == "Golden Retriever Mix"
        assert extract_breed(["info here", "Labrador", "more info"]) == "Labrador"
        assert extract_breed(["DOB: 2022", "weighs 10kg", "friendly dog"]) is None
        assert extract_breed([]) is None
        assert extract_breed(None) is None

    def test_extract_breed_comprehensive(self):
        test_cases = [
            (["mixed breed"], "Mixed Breed"),
            (["Mixed breed"], "Mixed Breed"),
            (["mix"], "Mixed Breed"),
            (["crossbreed"], "Mixed Breed"),
            (["Golden Retriever"], "Golden Retriever"),
            (["Labrador"], "Labrador"),
            (["German Shepherd"], "German Shepherd"),
            (["Golden Retriever mix"], "Golden Retriever Mix"),
            (["Lab mix"], "Labrador Mix"),
            (["DOB: 2022", "weighs 10kg"], None),
            ([], None),
        ]

        for bullets, expected in test_cases:
            result = extract_breed(bullets)
            assert result == expected, f"Failed for bullets: {bullets}"

    def test_extract_breed_with_special_characters(self):
        assert extract_breed(["✔️Mixed breed"]) == "Mixed Breed"
        assert extract_breed(["✔️Posavac Hound mix✔️"]) == "Posavac Hound Mix"
        assert extract_breed(["✔️Husky✔️"]) == "Husky"

    def test_extract_breed_not_size_mix_from_full_size_text(self):
        bullets = [
            "weights around 10kg, should be around 20 kg at full size",
            "mixed breed",
        ]
        assert extract_breed(bullets) == "Mixed Breed"

    def test_extract_breed_with_size_in_context(self):
        test_cases = [
            (["weights around 5kg, should be around 10-12kg at full size", "mixed breed"], "Mixed Breed"),
            (["13-14kg, should be around 17-20kg at full size", "mixed breed"], "Mixed Breed"),
            (["will grow to full size", "mixed breed, probably hound"], "Mixed Breed"),
            (["medium size", "mixed breed"], "Mixed Breed"),
            (["large size dog", "crossbreed"], "Mixed Breed"),
        ]

        for bullets, expected in test_cases:
            assert extract_breed(bullets) == expected, f"Failed for {bullets}"

    def test_extract_breed_english_pointer(self):
        bullets = ["rough estimate DOB 2021", "weights around 23KG", "English Pointer"]
        assert extract_breed(bullets) == "English Pointer"

    def test_extract_breed_generic_pointer(self):
        bullets = ["Pointer", "23kg", "male"]
        assert extract_breed(bullets) == "Pointer"

    def test_extract_breed_hound(self):
        assert extract_breed(["mixed breed, probably hound"]) == "Mixed Breed"
        assert extract_breed(["hound", "20kg"]) == "Hound"

    def test_extract_sex(self):
        assert extract_sex(["she is great with other dogs", "not tested on cats"]) == "Female"
        assert extract_sex(["he needs guidance", "castration is mandatory"]) == "Male"
        assert extract_sex(["spayed female", "good with kids"]) == "Female"
        assert extract_sex(["neutered male", "house trained"]) == "Male"
        assert extract_sex(["loves to play", "good with dogs", "needs training"]) is None
        assert extract_sex([]) is None
        assert extract_sex(None) is None

    def test_extract_sex_comprehensive(self):
        test_cases = [
            (["she loves to play"], "Female"),
            (["her favorite activity"], "Female"),
            (["spayed female"], "Female"),
            (["female dog"], "Female"),
            (["he is very friendly"], "Male"),
            (["his best trait"], "Male"),
            (["neutered male"], "Male"),
            (["male dog"], "Male"),
            (["castration is required"], "Male"),
            (["loves to play", "good with kids"], None),
            (["friendly dog"], None),
            ([], None),
        ]

        for bullets, expected in test_cases:
            result = extract_sex(bullets)
            assert result == expected, f"Failed for bullets: {bullets}"

    def test_normalize_size(self):
        assert normalize_size("10kg") == "Small"
        assert normalize_size("18kg") == "Medium"
        assert normalize_size("21-22kg") == "Medium"
        assert normalize_size("35kg") == "Large"
        assert normalize_size("2-3kg") == "Tiny"
        assert normalize_size("no weight info") is None
        assert normalize_size("") is None
        assert normalize_size(None) is None

    def test_normalize_size_categories(self):
        assert normalize_size("3kg") == "Tiny"
        assert normalize_size("4.5kg") == "Tiny"
        assert normalize_size("5kg") == "Small"
        assert normalize_size("7.5kg") == "Small"
        assert normalize_size("12kg") == "Medium"
        assert normalize_size("15kg") == "Medium"
        assert normalize_size("20kg") == "Medium"
        assert normalize_size("25kg") == "Medium"
        assert normalize_size("26kg") == "Large"
        assert normalize_size("30kg") == "Large"
        assert normalize_size("40kg") == "Large"
        assert normalize_size("41kg") == "XLarge"
        assert normalize_size("50kg") == "XLarge"
        assert normalize_size("60kg") == "XLarge"

    def test_extract_weight_kg(self):
        assert extract_weight_kg("10kg, height 35 cm, length 55cm") == 10.0
        assert extract_weight_kg("Currently weighs 2-3kg") == 2.5
        assert extract_weight_kg("weighs 18kg") == 18.0
        assert extract_weight_kg("21-22kg") == 21.5
        assert extract_weight_kg("no weight mentioned") is None
        assert extract_weight_kg("") is None
        assert extract_weight_kg(None) is None
        assert extract_weight_kg("weight: 15 kg") == 15.0
        assert extract_weight_kg("15-20 kg") == 17.5
        assert extract_weight_kg("✔️weighs around 22-25kg") == 23.5
        assert extract_weight_kg("weighs around 15-18 kg") == 16.5
        assert extract_weight_kg("12kg") == 12.0
        assert extract_weight_kg("10.5kg") == 10.5

    def test_screenshot_based_amena(self):
        amena_bullets = [
            "rough estimate DOB 2021",
            "10kg, height 35 cm, length 55cm",
            "mixed breed",
            "Amena has been where she has her doggie house placed but she goes out to the yard during the day to play with other dogs or do whatever she pleases",
            "not house & toilet trained, she is active and would probably enjoy walks and outdoor environments",
            "she is great with other dogs from the boarding house",
            "not tested on cats",
            "It's crazy how much she loves & trusts people. She can't get enough of the cuddles. So we need someone who will be ready for his cuddle marathons! So far, she is chilled with unfamiliar people!",
        ]

        assert extract_birth_date(amena_bullets[0]) == "2021"
        assert extract_breed(amena_bullets) == "Mixed Breed"
        assert extract_sex(amena_bullets) == "Female"
        assert extract_weight_kg(amena_bullets[1]) == 10.0
        assert normalize_size(amena_bullets[1]) == "Small"

    def test_screenshot_based_leo(self):
        leo_bullets = [
            "DOB: March 2023",
            "Mixed breed",
            "Currently weighs 2-3kg",
            "not tested on kids, chilling, is active and would probably enjoy walks and outdoor environments",
        ]

        assert extract_birth_date(leo_bullets[0]) == "March 2023"
        assert extract_breed(leo_bullets) == "Mixed Breed"
        assert extract_weight_kg(leo_bullets[2]) == 2.5
        assert normalize_size(leo_bullets[2]) == "Tiny"


@pytest.mark.unit
class TestNameNormalization:
    def test_removes_emojis(self):
        test_cases = [
            ("🌸🍀 Lucinda 🍀🌸", "Lucinda"),
            ("🐾🍭RASHA🍭🐾", "Rasha"),
            ("❤️ Max ❤️", "Max"),
            ("Bella 🌟", "Bella"),
            ("🌟 Luna 🌟", "Luna"),
            ("Regular Name", "Regular Name"),
            ("🌹💕LUNA💕🌹", "Luna"),
            ("💕Bella💕", "Bella"),
            ("⭐Max⭐", "Max"),
            ("✨Fluffy✨", "Fluffy"),
            ("💙Ronnie💙", "Ronnie"),
        ]

        for input_name, expected in test_cases:
            result = normalize_name(input_name)
            assert result == expected, f"Failed for input: '{input_name}'"

    def test_removes_gender_descriptors(self):
        test_cases = [
            ("Beky He'S A Boy", "Beky"),
            ("Becky hes a boy", "Becky"),
            ("Sarah She's A Girl", "Sarah"),
            ("Max he is male", "Max"),
            ("Luna she is female", "Luna"),
            ("Charlie (male)", "Charlie"),
            ("Bella (female)", "Bella"),
            ("Luna she's a girl", "Luna"),
            ("Max he's a boy", "Max"),
            ("Rocky - male", "Rocky"),
        ]

        for input_name, expected in test_cases:
            result = normalize_name(input_name)
            assert result == expected, f"Failed for input: '{input_name}'"

    def test_removes_location_suffixes(self):
        test_cases = [
            ("X in UK", "X"),
            ("Max in Germany", "Max"),
            ("Bella in Spain", "Bella"),
            ("Luna from Serbia", "Luna"),
            ("Charlie - UK", "Charlie"),
            ("Sandy (Serbia)", "Sandy"),
            ("Luna in UK", "Luna"),
            ("Max from Serbia", "Max"),
            ("Bella - UK", "Bella"),
        ]

        for input_name, expected in test_cases:
            result = normalize_name(input_name)
            assert result == expected, f"Failed for input: '{input_name}'"

    def test_handles_unicode_and_casing(self):
        test_cases = [
            ("CHARLIE", "Charlie"),
            ("bella", "Bella"),
            ("mAx", "Max"),
            ("josé", "José"),
            ("andré", "André"),
            ("françois", "François"),
            ("FLUFFY", "Fluffy"),
            ("fluffy", "Fluffy"),
            ("  Fluffy  ", "Fluffy"),
        ]

        for input_name, expected in test_cases:
            result = normalize_name(input_name)
            assert result == expected, f"Failed for input: '{input_name}'"

    def test_complex_cases(self):
        test_cases = [
            ("🌸 BEKY HE'S A BOY 🌸", "Beky"),
            ("🐾 Max in UK (male) 🐾", "Max"),
            ("❤️ bella she's a girl from serbia ❤️", "Bella"),
            ("CHARLIE 🌟 (male) - Germany", "Charlie"),
            ("🌹💕LUNA💕🌹 she's a girl in UK", "Luna"),
            ("Cookie and Muffin", "Cookie And Muffin"),
            ("Flekica & Juca", "Flekica & Juca"),
        ]

        for input_name, expected in test_cases:
            result = normalize_name(input_name)
            assert result == expected, f"Failed for input: '{input_name}'"

    def test_edge_cases(self):
        test_cases = [
            ("", ""),
            ("   ", ""),
            ("🌸🌸🌸", ""),
            ("(male)", ""),
            ("in UK", ""),
            ("A", "A"),
            ("X", "X"),
        ]

        for input_name, expected in test_cases:
            result = normalize_name(input_name)
            assert result == expected, f"Failed for input: '{input_name}'"

    def test_in_the_uk_suffix(self):
        test_cases = [
            ("COCO 💛 in the UK!", "Coco"),
            ("LARA 💛 in the UK!", "Lara"),
            ("Max in the UK", "Max"),
            ("Bella IN THE UK!", "Bella"),
        ]

        for raw_name, expected in test_cases:
            cleaned = normalize_name(raw_name)
            assert cleaned == expected, f"Failed for '{raw_name}'"

    def test_curly_braces(self):
        test_cases = [
            ("💙 Beky {He's a boy 🤪!}", "Beky"),
            ("Beky {!}", "Beky"),
            ("Max {reserved}", "Max"),
            ("Luna {adopted!}", "Luna"),
        ]

        for raw_name, expected in test_cases:
            cleaned = normalize_name(raw_name)
            assert cleaned == expected, f"Failed for '{raw_name}'"

    def test_special_characters(self):
        assert normalize_name("‍Blacky‍") == "Blacky"
        assert normalize_name("Luna{!}") == "Luna"


@pytest.mark.unit
class TestEnhancedAgeExtraction:
    def test_y_old_patterns(self):
        test_cases = [
            ("4 y old", 4.0),
            ("roughly 3 y old", 3.0),
            ("approximately 2 y old", 2.0),
            ("about 5 y old", 5.0),
            ("1.5 y old", 1.5),
        ]

        for text, expected in test_cases:
            result = extract_age_from_text(text)
            assert result == expected, f"Failed for text: '{text}'"

    def test_years_old_patterns(self):
        test_cases = [
            ("nearly 2 years old", 2.0),
            ("approximately 3 years old", 3.0),
            ("roughly 4 years old", 4.0),
            ("about 1.5 years old", 1.5),
            ("exactly 2 years old", 2.0),
            ("She is 2 years old", 2.0),
            ("nearly 4 years old", 4.0),
        ]

        for text, expected in test_cases:
            result = extract_age_from_text(text)
            assert result == expected, f"Failed for text: '{text}'"

    def test_months_patterns(self):
        test_cases = [
            ("6 months old", 0.5),
            ("18 months old", 1.5),
            ("24 months old", 2.0),
            ("3 months", 0.25),
            ("12 months", 1.0),
        ]

        for text, expected in test_cases:
            result = extract_age_from_text(text)
            assert result == expected, f"Failed for text: '{text}'"

    def test_vet_estimates(self):
        test_cases = [
            ("roughly 3 y old (at least that's how the vet estimated her)", 3.0),
            ("vet estimates around 2 years", 2.0),
            ("veterinary assessment: 4 years old", 4.0),
        ]

        for text, expected in test_cases:
            result = extract_age_from_text(text)
            assert result == expected, f"Failed for text: '{text}'"

    def test_no_matches(self):
        test_cases = [
            "good with other dogs",
            "loves to play",
            "mixed breed",
            "weighs 20kg",
            "",
        ]

        for text in test_cases:
            result = extract_age_from_text(text)
            assert result is None, f"Should return None for text: '{text}'"


@pytest.mark.unit
class TestEnhancedSexDetection:
    def test_pronoun_detection(self):
        test_cases = [
            ("she is very friendly and loves to play", "Female"),
            ("he needs more training but is a good dog", "Male"),
            ("her favorite activity is running", "Female"),
            ("his best quality is loyalty", "Male"),
            ("she gets along well with other dogs", "Female"),
            ("he is neutered and ready for adoption", "Male"),
        ]

        for text, expected in test_cases:
            result = extract_sex_from_text(text)
            assert result == expected, f"Failed for text: '{text}'"

    def test_medical_terms(self):
        test_cases = [
            ("spayed female ready for adoption", "Female"),
            ("neutered male looking for home", "Male"),
            ("castrated and vaccinated", "Male"),
            ("spayed and microchipped", "Female"),
            ("fully vaccinated and castrated", "Male"),
        ]

        for text, expected in test_cases:
            result = extract_sex_from_text(text)
            assert result == expected, f"Failed for text: '{text}'"

    def test_mixed_signals(self):
        test_cases = [
            ("she is a good boy", "Male"),
            ("he and she are both available", None),
            ("good with male and female dogs", None),
        ]

        for text, expected in test_cases:
            result = extract_sex_from_text(text)
            assert result == expected, f"Failed for text: '{text}'"

    def test_confidence_scoring(self):
        test_cases = [
            ("spayed female but he is good with kids", "Female"),
            ("he is neutered and she loves other dogs", "Male"),
            ("she she she loves to play", "Female"),
            ("his his his favorite toy", "Male"),
        ]

        for text, expected in test_cases:
            result = extract_sex_from_text(text)
            assert result == expected, f"Failed for text: '{text}'"


@pytest.mark.unit
class TestEnhancedBreedDetection:
    def test_crossbreed_variations(self):
        test_cases = [
            ("crossbreed with good temperament", "Mixed Breed"),
            ("Cross breed mix", "Mixed Breed"),
            ("cross-breed dog", "Mixed Breed"),
            ("possibly husky cross", "Husky Mix"),
            ("labrador crossbreed", "Labrador Mix"),
        ]

        for text, expected in test_cases:
            result = extract_breed_from_text(text)
            assert result == expected, f"Failed for text: '{text}'"

    def test_specific_breeds(self):
        test_cases = [
            ("possibly husky cross", "Husky Mix"),
            ("looks like german shepherd mix", "German Shepherd Mix"),
            ("might be labrador retriever", "Labrador Retriever"),
            ("appears to be terrier mix", "Terrier Mix"),
        ]

        for text, expected in test_cases:
            result = extract_breed_from_text(text)
            assert result == expected, f"Failed for text: '{text}'"

    def test_no_breed_info(self):
        test_cases = [
            "loves to play and is friendly",
            "good with other dogs",
            "weighs about 20kg",
            "needs training",
        ]

        for text in test_cases:
            result = extract_breed_from_text(text)
            assert result is None, f"Should return None for text: '{text}'"


@pytest.mark.unit
class TestDetailParser:
    @pytest.fixture
    def parser(self):
        return MisisRescueDetailParser()

    @pytest.fixture
    def amena_detail_html(self):
        return """
        <html>
        <body>
            <h1>AMENA</h1>
            <div class="things-section">
                <h2>Things you should know about AMENA</h2>
                <ul>
                    <li>rough estimate DOB 2021</li>
                    <li>10kg, height 35 cm, length 55cm</li>
                    <li>mixed breed</li>
                    <li>Amena lives in a pen where she has her doggie house placed but she goes out to the yard during the day to play with other dogs or do whatever she pleases</li>
                    <li>not house & toilet trained, will need some practice</li>
                    <li>she is great with other dogs from the boarding house</li>
                    <li>not tested on cats</li>
                    <li>It's crazy how much she loves & trusts people. She can't get enough of the cuddles. So we need someone who will be ready for his cuddle marathons! So far, she is chilled with unfamiliar people!</li>
                </ul>
            </div>
        </body>
        </html>
        """

    @pytest.fixture
    def leo_detail_html(self):
        return """
        <html>
        <body>
            <h1>LEO</h1>
            <div class="things-section">
                <h2>Things you should know about LEO</h2>
                <ul>
                    <li>DOB: March 2023</li>
                    <li>Mixed breed</li>
                    <li>Currently weighs 2-3kg; expected to be around 5-8 kg when fully grown-maybe 10kg if he surprises us!</li>
                    <li>Playful and full of energy, loves playing with siblings and grown-up dogs</li>
                    <li>Adores cats and is happy around them (thanks to his dog-savvy feline friends)</li>
                    <li>not tested on kids, chilling, is active and would probably enjoy walks and outdoor environments</li>
                </ul>
            </div>
        </body>
        </html>
        """

    @pytest.fixture
    def naomi_detail_html(self):
        return """
        <html>
        <body>
            <h1>Naomi</h1>
            <div class="things-section">
                <h2>Things you should know about Naomi</h2>
                <ul>
                    <li>DOB: April/May 2024</li>
                    <li>German Shepherd mix</li>
                    <li>Currently weighs 21-22kg</li>
                    <li>she is very energetic and needs lots of exercise</li>
                    <li>good with children and other dogs</li>
                    <li>needs experienced handlers</li>
                </ul>
            </div>
        </body>
        </html>
        """

    def test_parse_amena_page(self, parser, amena_detail_html):
        soup = BeautifulSoup(amena_detail_html, "html.parser")
        result = parser.parse_detail_page(soup)

        assert result["name"] == "Amena"
        assert result["age_text"] is not None
        assert "year" in result["age_text"]
        assert result["breed"] == "Mixed Breed"
        assert result["size"] == "Small"
        assert result["sex"] == "Female"
        assert result["properties"]["weight"] == "10.0kg"
        assert "bullet_points" in result
        assert len(result["bullet_points"]) == 8

    def test_parse_leo_page(self, parser, leo_detail_html):
        soup = BeautifulSoup(leo_detail_html, "html.parser")
        result = parser.parse_detail_page(soup)

        assert result["name"] == "Leo"
        assert result["breed"] == "Mixed Breed"
        assert result["properties"]["weight"] == "2.5kg"
        assert result["size"] == "Tiny"
        assert result["age_text"] is not None
        assert "month" in result["age_text"] or "year" in result["age_text"]
        assert "bullet_points" in result
        assert len(result["bullet_points"]) == 6

    def test_parse_naomi_page(self, parser, naomi_detail_html):
        soup = BeautifulSoup(naomi_detail_html, "html.parser")
        result = parser.parse_detail_page(soup)

        assert result["name"] == "Naomi"
        assert result["breed"] == "German Shepherd Mix"
        assert result["properties"]["weight"] == "21.5kg"
        assert result["size"] == "Medium"
        assert result["sex"] == "Female"
        assert "bullet_points" in result
        assert len(result["bullet_points"]) == 6

    def test_extract_dog_name(self, parser):
        html_h1 = "<html><body><h1>Bella</h1></body></html>"
        soup = BeautifulSoup(html_h1, "html.parser")
        assert parser._extract_dog_name(soup) == "Bella"

        html_title = "<html><head><title>Max - Available for Adoption</title></head><body></body></html>"
        soup = BeautifulSoup(html_title, "html.parser")
        assert parser._extract_dog_name(soup) == "Max"

        html_no_name = "<html><body><p>Some content</p></body></html>"
        soup = BeautifulSoup(html_no_name, "html.parser")
        assert parser._extract_dog_name(soup) is None

    def test_extract_bullet_points(self, parser, amena_detail_html):
        soup = BeautifulSoup(amena_detail_html, "html.parser")
        bullets = parser._extract_bullet_points(soup)

        assert len(bullets) == 8
        assert bullets[0] == "rough estimate DOB 2021"
        assert bullets[1] == "10kg, height 35 cm, length 55cm"
        assert bullets[2] == "mixed breed"
        assert "she is great with other dogs" in bullets[5]

    def test_missing_things_section(self, parser):
        html_no_section = """
        <html>
        <body>
            <h1>Mystery Dog</h1>
            <p>Some description text</p>
        </body>
        </html>
        """
        soup = BeautifulSoup(html_no_section, "html.parser")
        result = parser.parse_detail_page(soup)

        assert result["name"] == "Mystery Dog"
        assert result["bullet_points"] == []
        assert result.get("breed") is None
        assert result.get("sex") is None
        assert result.get("age_text") is None

    def test_empty_bullet_points(self, parser):
        html_empty_bullets = """
        <html>
        <body>
            <h1>Empty Dog</h1>
            <div class="things-section">
                <h2>Things you should know about Empty Dog</h2>
                <ul>
                    <li></li>
                    <li>   </li>
                    <li>Some real content</li>
                    <li></li>
                </ul>
            </div>
        </body>
        </html>
        """
        soup = BeautifulSoup(html_empty_bullets, "html.parser")
        bullets = parser._extract_bullet_points(soup)

        assert len(bullets) == 1
        assert bullets[0] == "Some real content"

    def test_alternative_html_structures(self, parser):
        html_p_tags = """
        <html>
        <body>
            <h1>Alternative Dog</h1>
            <div>
                <h2>Things you should know about Alternative Dog</h2>
                <p>DOB: 2022</p>
                <p>Labrador mix</p>
                <p>weighs 15kg</p>
                <p>he loves to play</p>
            </div>
        </body>
        </html>
        """
        soup = BeautifulSoup(html_p_tags, "html.parser")
        result = parser.parse_detail_page(soup)

        assert result["name"] == "Alternative Dog"
        assert result["breed"] == "Labrador Mix"
        assert result["properties"]["weight"] == "15.0kg"
        assert result["sex"] == "Male"

    def test_malformed_html(self, parser):
        malformed_html = """
        <html>
        <body>
            <h1>Broken Dog</h1>
            <div>
                <h2>Things you should know about Broken Dog
                <ul>
                    <li>DOB: 2023
                    <li>Mixed breed</li>
                    <li>weighs 5kg
                </ul>
            </div>
        </body>
        </html>
        """
        soup = BeautifulSoup(malformed_html, "html.parser")
        result = parser.parse_detail_page(soup)

        assert result["name"] == "Broken Dog"
        assert len(result["bullet_points"]) >= 2
        assert result["breed"] == "Mixed Breed"

    def test_multiple_things_sections(self, parser):
        html_multiple = """
        <html>
        <body>
            <h1>Multiple Dog</h1>
            <div>
                <h2>Things you should know about Multiple Dog</h2>
                <ul>
                    <li>DOB: 2022</li>
                    <li>First section breed</li>
                </ul>
            </div>
            <div>
                <h2>Things you should know about care</h2>
                <ul>
                    <li>Different info</li>
                    <li>Care instructions</li>
                </ul>
            </div>
        </body>
        </html>
        """
        soup = BeautifulSoup(html_multiple, "html.parser")
        result = parser.parse_detail_page(soup)

        assert result["name"] == "Multiple Dog"
        assert len(result["bullet_points"]) >= 2
        assert "DOB: 2022" in result["bullet_points"]

    def test_case_insensitive_section_matching(self, parser):
        html_case = """
        <html>
        <body>
            <h1>Case Dog</h1>
            <div>
                <h3>THINGS YOU SHOULD KNOW ABOUT CASE DOG</h3>
                <ul>
                    <li>dob: january 2023</li>
                    <li>labrador mix</li>
                    <li>weighs 20kg</li>
                </ul>
            </div>
        </body>
        </html>
        """
        soup = BeautifulSoup(html_case, "html.parser")
        result = parser.parse_detail_page(soup)

        assert result["name"] == "Case Dog"
        assert len(result["bullet_points"]) == 3
        assert result["breed"] == "Labrador Mix"
        assert result["properties"]["weight"] == "20.0kg"

    def test_whitespace_handling(self, parser):
        html_whitespace = """
        <html>
        <body>
            <h1>   Whitespace Dog   </h1>
            <div>
                <h2>Things you should know about   Whitespace Dog</h2>
                <ul>
                    <li>   DOB:    2023   </li>
                    <li>
                        Mixed    breed
                    </li>
                    <li>Currently   weighs   15kg   </li>
                </ul>
            </div>
        </body>
        </html>
        """
        soup = BeautifulSoup(html_whitespace, "html.parser")
        result = parser.parse_detail_page(soup)

        assert result["name"] == "Whitespace Dog"
        assert len(result["bullet_points"]) == 3
        assert "DOB: 2023" in result["bullet_points"][0]
        assert result["breed"] == "Mixed Breed"
        assert result["properties"]["weight"] == "15.0kg"

    def test_special_characters_in_name(self, parser):
        html_special = """
        <html>
        <body>
            <h1>Luna❤️🐕</h1>
            <div>
                <h2>Things you should know about Luna❤️🐕</h2>
                <ul>
                    <li>DOB: 2022</li>
                    <li>Golden Retriever</li>
                    <li>she loves everyone</li>
                </ul>
            </div>
        </body>
        </html>
        """
        soup = BeautifulSoup(html_special, "html.parser")
        result = parser.parse_detail_page(soup)

        assert result["name"] == "Luna"
        assert result["breed"] == "Golden Retriever"
        assert result["sex"] == "Female"

    def test_nested_html_structures(self, parser):
        html_nested = """
        <html>
        <body>
            <h1>Nested Dog</h1>
            <div class="content">
                <div class="section">
                    <h2>Things you should know about Nested Dog</h2>
                    <div class="bullet-container">
                        <ul class="bullets">
                            <li><span>DOB: <strong>2023</strong></span></li>
                            <li><em>Mixed</em> <u>breed</u></li>
                            <li>Currently weighs <b>8kg</b></li>
                            <li>He is <i>very</i> playful</li>
                        </ul>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        soup = BeautifulSoup(html_nested, "html.parser")
        result = parser.parse_detail_page(soup)

        assert result["name"] == "Nested Dog"
        assert len(result["bullet_points"]) == 4
        assert result["breed"] == "Mixed Breed"
        assert result["properties"]["weight"] == "8.0kg"
        assert result["sex"] == "Male"

    def test_no_structured_data(self, parser):
        html_no_data = """
        <html>
        <body>
            <h1>Minimal Dog</h1>
            <div>
                <h2>Things you should know about Minimal Dog</h2>
                <ul>
                    <li>Very friendly</li>
                    <li>Loves walks</li>
                    <li>Good with children</li>
                </ul>
            </div>
        </body>
        </html>
        """
        soup = BeautifulSoup(html_no_data, "html.parser")
        result = parser.parse_detail_page(soup)

        assert result["name"] == "Minimal Dog"
        assert len(result["bullet_points"]) == 3
        assert result["breed"] is None
        assert result["age_text"] is None
        assert result.get("properties", {}).get("weight") is None
        assert result["sex"] is None

    def test_size_categories_via_parser(self):
        parser = MisisRescueDetailParser()

        test_cases = [
            (3, "Tiny"),
            (5.5, "Small"),
            (15, "Medium"),
            (30, "Large"),
            (45, "XLarge"),
        ]

        for weight, expected_size in test_cases:
            html = f"""
            <html><body>
            <h1>Test Dog</h1>
            <h2>Things you should know</h2>
            <ul><li>Weighs {weight}kg</li></ul>
            </body></html>
            """

            soup = BeautifulSoup(html, "html.parser")
            result = parser.parse_detail_page(soup)

            assert result["size"] == expected_size, f"Weight {weight}kg should be {expected_size}"
            assert result["properties"]["standardized_size"] == expected_size

    def test_standardized_size_in_properties(self):
        parser = MisisRescueDetailParser()

        html = """
        <html>
        <body>
            <h1>Tiny Tim</h1>
            <h2>Things you should know</h2>
            <ul>
                <li>DOB- 2024</li>
                <li>Weighs 4.5kg</li>
            </ul>
        </body>
        </html>
        """

        soup = BeautifulSoup(html, "html.parser")
        result = parser.parse_detail_page(soup)

        assert result["name"] == "Tiny Tim"
        assert result["size"] == "Tiny"
        assert result["properties"]["standardized_size"] == "Tiny"
        assert result["properties"]["weight"] == "4.5kg"

    def test_normalizer_integration(self, parser, amena_detail_html):
        soup = BeautifulSoup(amena_detail_html, "html.parser")
        result = parser.parse_detail_page(soup)

        from utils.shared_extraction_patterns import extract_weight_from_text

        bullets = result["bullet_points"]

        assert extract_birth_date(bullets[0]) == "2021"
        assert extract_breed(bullets) == "Mixed Breed"
        assert extract_sex(bullets) == "Female"
        assert extract_weight_from_text(bullets[1]) == 10.0
        assert normalize_size(bullets[1]) == "Small"

        age = calculate_age_years("2021")
        assert age is not None
        assert age > 0


@pytest.mark.unit
class TestIntegratedNormalization:
    def test_comprehensive_normalization_pipeline(self):
        import re

        test_cases = [
            {
                "raw_name": "🌸🍀 Lucinda 🍀🌸",
                "bullet_points": ["DOB 2022", "Crossbreed", "18-19kg"],
                "page_text": "roughly 3 y old (at least that's how the vet estimated her) she is spayed",
                "expected": {
                    "name": "Lucinda",
                    "age": 3.0,
                    "sex": "Female",
                    "breed": "Mixed Breed",
                    "weight": 18.5,
                    "size": "Medium",
                },
            },
            {
                "raw_name": "Beky He'S A Boy",
                "bullet_points": ["1 year old", "Mixed breed", "15kg"],
                "page_text": "he is castrated and friendly with other dogs",
                "expected": {
                    "name": "Beky",
                    "age": 1.0,
                    "sex": "Male",
                    "breed": "Mixed Breed",
                    "weight": 15.0,
                    "size": "Medium",
                },
            },
            {
                "raw_name": "X in UK",
                "bullet_points": [],
                "page_text": "roughly 2 y old, possibly husky cross, weighs around 22kg, spayed female",
                "expected": {
                    "name": "X",
                    "age": 2.0,
                    "sex": "Female",
                    "breed": "Husky Mix",
                    "weight": 22.0,
                    "size": "Medium",
                },
            },
        ]

        for case in test_cases:
            name_result = normalize_name(case["raw_name"])
            assert name_result == case["expected"]["name"], f"Name failed for {case['raw_name']}"

            age_result = extract_age_from_text(case["page_text"])
            if age_result is None and case["bullet_points"]:
                for bullet in case["bullet_points"]:
                    if "year" in bullet or "old" in bullet:
                        match = re.search(r"(\d+)\s*year", bullet)
                        if match:
                            age_result = float(match.group(1))
                            break
            assert age_result == case["expected"]["age"], f"Age failed for {case['page_text']}"

            sex_result = extract_sex_from_text(case["page_text"])
            assert sex_result == case["expected"]["sex"], f"Sex failed for {case['page_text']}"

            breed_result = extract_breed_from_text(case["page_text"])
            if breed_result is None and case["bullet_points"]:
                breed_result = extract_breed(case["bullet_points"])
            assert breed_result == case["expected"]["breed"], f"Breed failed for {case['page_text']}"

            weight_result = extract_weight_kg(case["page_text"])
            if weight_result is None and case["bullet_points"]:
                for bullet in case["bullet_points"]:
                    weight_result = extract_weight_kg(bullet)
                    if weight_result:
                        break
            assert weight_result == case["expected"]["weight"], f"Weight failed for {case['page_text']}"

            size_result = normalize_size(f"{weight_result}kg" if weight_result else "")
            assert size_result == case["expected"]["size"], f"Size failed for weight {weight_result}"

    def test_size_from_breed_fallback(self):
        test_cases = [
            ("Labrador Retriever", "Large"),
            ("Mixed Breed", "Medium"),
            ("Chihuahua", "Tiny"),
            ("German Shepherd", "Large"),
            ("Unknown", None),
        ]

        for breed, expected_size in test_cases:
            result = get_size_from_breed(breed)
            assert result == expected_size, f"Size from breed failed for {breed}"

    def test_weight_based_size_overrides_breed(self):
        test_cases = [
            {"weight_text": "5kg", "breed": "Labrador Retriever", "expected_size": "Small"},
            {"weight_text": "35kg", "breed": "Chihuahua", "expected_size": "Large"},
            {"weight_text": "15kg", "breed": "Mixed Breed", "expected_size": "Medium"},
        ]

        for case in test_cases:
            weight_size = normalize_size(case["weight_text"])
            assert weight_size == case["expected_size"], f"Weight size failed for {case['weight_text']}"

            breed_size = get_size_from_breed(case["breed"])
            if case["breed"] != "Mixed Breed":
                assert breed_size != case["expected_size"]
            else:
                assert breed_size == case["expected_size"]

    def test_real_database_cases(self):
        real_cases = [
            {"name": "🐾🍭RASHA🍭🐾", "expected_name": "Rasha"},
            {"text": "nearly 2 years old", "expected_age": 2.0},
            {"text": "4 y old", "expected_age": 4.0},
            {
                "text": "roughly 3 y old (at least that's how the vet estimated her)",
                "expected_age": 3.0,
                "expected_sex": "Female",
            },
            {"text": "he is castrated and ready for adoption", "expected_sex": "Male"},
        ]

        for case in real_cases:
            if "name" in case:
                assert normalize_name(case["name"]) == case["expected_name"]

            if "text" in case:
                if "expected_age" in case:
                    assert extract_age_from_text(case["text"]) == case["expected_age"]
                if "expected_sex" in case:
                    assert extract_sex_from_text(case["text"]) == case["expected_sex"]

    def test_real_dog_size_scenarios(self):
        test_cases = [
            ("5.5kg", 5.5, "Small"),
            ("10.0kg", 10.0, "Small"),
            ("12kg", 12.0, "Medium"),
            ("30kg", 30.0, "Large"),
        ]

        for weight_text, expected_weight, expected_size in test_cases:
            assert extract_weight_kg(weight_text) == expected_weight
            assert normalize_size(weight_text) == expected_size

    def test_megi_age_from_dob_2023(self):
        dob = extract_birth_date("DOB- 2023")
        assert dob == "2023"
        age = calculate_age_years(dob)
        assert age is not None
        assert age >= 0


@pytest.mark.browser
@pytest.mark.integration
@pytest.mark.slow
class TestErrorPageDetection:
    @patch("scrapers.misis_rescue.scraper.get_browser_service")
    def test_error_page_detected_in_title(self, mock_browser_service):
        scraper = MisisRescueScraper(config_id="misisrescue")

        mock_service = Mock()
        mock_browser_service.return_value = mock_service
        mock_driver = Mock()
        mock_browser_result = Mock()
        mock_browser_result.driver = mock_driver
        mock_service.create_driver.return_value = mock_browser_result
        mock_driver.title = "This site can't be reached"
        mock_driver.page_source = "<html><body>Error</body></html>"

        with patch("scrapers.misis_rescue.scraper.WebDriverWait"):
            result = scraper._scrape_dog_detail("https://test.com/dog")

        assert result is None
        mock_driver.quit.assert_called_once()

    @patch("scrapers.misis_rescue.scraper.get_browser_service")
    def test_error_page_detected_with_apostrophe_variation(self, mock_browser_service):
        scraper = MisisRescueScraper(config_id="misisrescue")

        mock_service = Mock()
        mock_browser_service.return_value = mock_service
        mock_driver = Mock()
        mock_browser_result = Mock()
        mock_browser_result.driver = mock_driver
        mock_service.create_driver.return_value = mock_browser_result
        mock_driver.title = "This Site Can\u2019T Be Reached"
        mock_driver.page_source = "<html><body>Error</body></html>"

        with patch("scrapers.misis_rescue.scraper.WebDriverWait"):
            result = scraper._scrape_dog_detail("https://test.com/dog")

        assert result is None

    @patch("scrapers.misis_rescue.scraper.requests.get")
    def test_fast_scraper_detects_error_pages(self, mock_get):
        scraper = MisisRescueScraper(config_id="misisrescue")

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = "<html><head><title>This site can't be reached</title></head></html>"
        mock_get.return_value = mock_response

        result = scraper._scrape_dog_detail_fast("https://test.com/dog")

        assert result is None


@pytest.mark.integration
class TestPerformanceOptimization:
    @patch("scrapers.misis_rescue.scraper.requests.get")
    def test_fast_scraper_processes_valid_pages(self, mock_get):
        scraper = MisisRescueScraper(config_id="misisrescue")

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = """
        <html>
        <head><title>Fluffy - Adorable Puppy</title></head>
        <body>
            <h1>Fluffy</h1>
            <h2>Things you should know</h2>
            <ul>
                <li>DOB- 2023</li>
                <li>Mixed breed</li>
                <li>Weighs 5.5kg</li>
            </ul>
            <img src="https://static.wixstatic.com/media/dog.jpg">
        </body>
        </html>
        """
        mock_get.return_value = mock_response

        with patch.object(scraper.detail_parser, "parse_detail_page") as mock_parse:
            mock_parse.return_value = {
                "name": "Fluffy",
                "size": "Small",
                "properties": {"standardized_size": "Small"},
            }

            result = scraper._scrape_dog_detail_fast("https://test.com/fluffy")

        assert result is not None
        assert result["name"] == "Fluffy"
        assert result["standardized_size"] == "Small"
        assert "adoption_url" in result
        assert "external_id" in result

    @patch("scrapers.misis_rescue.scraper.requests.get")
    def test_complete_flow(self, mock_get):
        scraper = MisisRescueScraper(config_id="misisrescue")

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = """
        <html>
        <head><title>Fluffy - Adorable Puppy</title></head>
        <body>
            <h1>Fluffy</h1>
            <h2>Things you should know about Fluffy</h2>
            <ul>
                <li>DOB- December 2024</li>
                <li>Mixed breed</li>
                <li>9kg</li>
            </ul>
            <img src="https://static.wixstatic.com/media/dog.jpg">
        </body>
        </html>
        """
        mock_get.return_value = mock_response

        result = scraper._scrape_dog_detail_fast("https://www.misisrescue.com/post/fluffy-2")

        assert result is not None
        assert result["name"] == "Fluffy"
        assert result["standardized_size"] == "Small"
        assert result["adoption_url"] == "https://www.misisrescue.com/post/fluffy-2"
        assert result["external_id"] == "mar-fluffy-2"
        assert result["organization_id"] is not None
        assert len(result.get("image_urls", [])) > 0


@pytest.mark.slow
@pytest.mark.integration
@pytest.mark.external
class TestListingExtraction:
    @pytest.fixture
    def scraper(self):
        with (
            patch("scrapers.base_scraper.create_default_sync_service") as mock_sync,
            patch("scrapers.base_scraper.ConfigLoader") as mock_loader,
            patch("scrapers.base_scraper.R2Service"),
        ):
            mock_sync_instance = Mock()
            mock_sync_instance.sync_single_organization.return_value = Mock(organization_id=13, was_created=True)
            mock_sync.return_value = mock_sync_instance

            mock_config = Mock()
            mock_config.get_scraper_config_dict.return_value = {
                "rate_limit_delay": 0.1,
                "max_retries": 1,
                "timeout": 10,
            }
            mock_config.name = "MisisRescue"
            mock_loader.return_value.load_config.return_value = mock_config

            return MisisRescueScraper(config_id="misisrescue")

    def test_extract_dogs_with_images_from_listing(self, scraper):
        listing_html = """
        <html>
        <body>
            <div class="dog-grid">
                <a href="/post/leila" class="dog-card">
                    <img src="https://static.wixstatic.com/media/dog1.jpg" alt="Leila">
                    <span>Leila</span>
                </a>
                <a href="/post/__leo-2" class="dog-card">
                    <img src="https://static.wixstatic.com/media/dog2.jpg" alt="LEO">
                    <span>LEO</span>
                </a>
                <a href="/post/aisha" class="dog-card">
                    <img src="https://static.wixstatic.com/media/dog3.jpg" alt="Aisha">
                    <span>Aisha❣️🌷</span>
                </a>
            </div>
        </body>
        </html>
        """

        soup = BeautifulSoup(listing_html, "html.parser")
        dogs = scraper._extract_dogs_before_reserved(soup)
        scraper._assign_images_to_dogs(dogs, soup)

        assert len(dogs) == 3
        assert dogs[0]["name"] == "Leila"
        assert dogs[0]["url"] == "/post/leila"
        assert dogs[0]["image_url"] is not None

        assert dogs[1]["name"] == "LEO"
        assert dogs[1]["url"] == "/post/__leo-2"
        assert dogs[1]["image_url"] is not None

    def test_collect_data_with_images(self, scraper):
        mock_dogs_with_images = [
            {
                "name": "Leila",
                "url": "/post/leila",
                "image_url": "https://example.com/leila.jpg",
            },
            {
                "name": "LEO",
                "url": "/post/__leo-2",
                "image_url": "https://example.com/leo.jpg",
            },
        ]

        mock_detail_data = {
            "name": "Test Dog",
            "breed": "Mixed Breed",
            "sex": "Female",
            "size": "Medium",
            "age_text": "3 years",
            "properties": {"weight": "15.0kg"},
            "external_id": "test-dog",
            "adoption_url": "https://www.misisrescue.com/post/test-dog",
            "organization_id": 13,
            "image_urls": ["https://example.com/image.jpg"],
            "primary_image_url": "https://example.com/image.jpg",
        }

        with (
            patch.object(scraper, "_get_all_dogs_from_listing") as mock_listing,
            patch.object(scraper, "_scrape_dog_detail_fast") as mock_detail_fast,
            patch.object(scraper, "_scrape_dog_detail") as mock_detail,
        ):
            mock_listing.return_value = mock_dogs_with_images
            mock_detail_fast.return_value = mock_detail_data
            mock_detail.return_value = mock_detail_data

            dogs = scraper.collect_data()

            assert len(dogs) == 2
            for dog in dogs:
                assert dog["breed"] == "Mixed Breed"
                assert dog["sex"] == "Female"
                assert dog["primary_image_url"] is not None
