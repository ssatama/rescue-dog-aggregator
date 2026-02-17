import time
from unittest.mock import MagicMock, Mock, patch

import pytest

from scrapers.daisy_family_rescue.dog_detail_scraper import (
    DaisyFamilyRescueDogDetailScraper,
)
from scrapers.daisy_family_rescue.dogs_scraper import DaisyFamilyRescueScraper


class TestDaisyFamilyRescueScraperMain:
    @pytest.fixture
    def scraper(self):
        with (
            patch("scrapers.base_scraper.create_default_sync_service") as mock_sync,
            patch("scrapers.base_scraper.ConfigLoader") as mock_config_loader,
            patch("scrapers.base_scraper.R2Service"),
        ):
            mock_config = MagicMock()
            mock_config.name = "Daisy Family Rescue e.V."
            mock_config.get_scraper_config_dict.return_value = {
                "rate_limit_delay": 0.1,
                "max_retries": 1,
                "timeout": 5,
                "headless": True,
            }
            mock_config.get_display_name.return_value = "Daisy Family Rescue e.V."
            mock_config.metadata.website_url = "https://daisyfamilyrescue.de"

            mock_config_loader.return_value.load_config.return_value = mock_config
            mock_sync_service = Mock()
            mock_sync_service.sync_single_organization.return_value = Mock(organization_id=12, was_created=True)
            mock_sync.return_value = mock_sync_service

            scraper = DaisyFamilyRescueScraper(config_id="daisyfamilyrescue")
            return scraper

    @pytest.fixture
    def mock_selenium_container(self):
        container = Mock()

        link = Mock()
        link.get_attribute.return_value = "https://daisyfamilyrescue.de/hund-brownie/"
        link.text = "Brownie - in München"

        container.find_elements.return_value = [link]

        container.text = """Brownie - in München
03/2020 • 53cm • 19kg
Deutscher Schäferhund Mischling
weiblich, kastriert"""

        img = Mock()
        img.get_attribute.return_value = "https://daisyfamilyrescue.de/wp-content/uploads/brownie.jpg"
        container.find_element.return_value = img

        return container

    @pytest.mark.unit
    def test_extract_dog_from_container_success(self, scraper, mock_selenium_container):
        result = scraper._extract_dog_from_container(mock_selenium_container, 1)

        assert result is not None
        assert result["name"] == "Brownie"
        assert result["external_id"] == "hund-brownie"
        assert result["adoption_url"] == "https://daisyfamilyrescue.de/hund-brownie/"
        assert result["primary_image_url"] == "https://daisyfamilyrescue.de/wp-content/uploads/brownie.jpg"
        assert result["status"] == "available"
        assert result["animal_type"] == "dog"

        props = result["properties"]
        assert props["source"] == "daisyfamilyrescue.de"
        assert props["country"] == "DE"
        assert props["extraction_method"] == "selenium_listing"
        assert props["language"] == "de"
        assert props["location"] == "München"

        assert result["birth_date"] == "03/2020"
        assert result["height_cm"] == 53
        assert result["weight_kg"] == 19

    @pytest.mark.unit
    def test_extract_dog_from_container_no_link(self, scraper):
        container = Mock()
        container.find_elements.return_value = []
        container.text = "Some non-dog content"

        result = scraper._extract_dog_from_container(container, 1)
        assert result is None

    @pytest.mark.unit
    def test_extract_dog_from_container_invalid_data(self, scraper, mock_selenium_container):
        link = Mock()
        link.get_attribute.return_value = "https://daisyfamilyrescue.de/hund-x/"
        link.text = "X"

        mock_selenium_container.find_elements.return_value = [link]
        mock_selenium_container.text = "X"

        result = scraper._extract_dog_from_container(mock_selenium_container, 1)
        assert result is None

    @pytest.mark.unit
    def test_filter_dogs_by_section_success(self, scraper):
        mock_driver = Mock()

        header1 = Mock()
        header1.text = "Bei einer Pflegestelle in Deutschland"
        header2 = Mock()
        header2.text = "Hündinnen in Nordmazedonien"
        header3 = Mock()
        header3.text = "In medizinischer Behandlung"

        mock_driver.find_elements.side_effect = [
            [header1, header2, header3],
            [Mock(), Mock(), Mock()],
        ]

        mock_driver.execute_script.side_effect = [
            100,
            200,
            300,
            150,
            250,
            350,
        ]

        result = scraper._filter_dogs_by_section(mock_driver)

        assert len(result) == 2

    @pytest.mark.slow
    @pytest.mark.browser
    def test_handle_lazy_loading(self, scraper):
        mock_driver = Mock()
        mock_driver.execute_script.side_effect = [1000, 1000, 1000, 1000, 1000, 1000]

        scraper._handle_lazy_loading(mock_driver)

        assert mock_driver.execute_script.call_count >= 3

    @pytest.mark.unit
    def test_collect_data_selenium_success(self, scraper):
        mock_dogs = [
            {
                "name": "BRUNO",
                "breed": "Deutscher Schäferhund Mischling",
                "sex": "männlich, kastriert",
                "external_id": "hund-bruno",
                "properties": {"language": "de"},
            }
        ]

        with (
            patch.object(scraper, "_extract_with_selenium") as mock_extract,
            patch.object(scraper, "_translate_and_normalize_dogs") as mock_translate,
        ):
            mock_extract.return_value = mock_dogs
            mock_translate.return_value = mock_dogs

            result = scraper.collect_data()

            assert len(result) == 1
            mock_extract.assert_called_once()
            mock_translate.assert_called_once_with(mock_dogs)

    @pytest.mark.unit
    def test_collect_data_selenium_failure(self, scraper):
        with patch.object(scraper, "_extract_with_selenium") as mock_extract:
            mock_extract.side_effect = Exception("WebDriver failed")

            result = scraper.collect_data()

            assert result == []

    @pytest.mark.unit
    def test_collect_data_no_dogs_found(self, scraper):
        with patch.object(scraper, "_extract_with_selenium") as mock_extract:
            mock_extract.return_value = []

            result = scraper.collect_data()

            assert result == []

    @pytest.mark.unit
    def test_extract_with_selenium_chrome_options(self, scraper):
        with patch("scrapers.daisy_family_rescue.dogs_scraper.get_browser_service") as mock_browser_service:
            mock_service = Mock()
            mock_browser_service.return_value = mock_service

            mock_driver = Mock()
            mock_browser_result = Mock()
            mock_browser_result.driver = mock_driver
            mock_service.create_driver.return_value = mock_browser_result
            mock_driver.find_elements.return_value = []

            with (
                patch("scrapers.daisy_family_rescue.dogs_scraper.WebDriverWait") as mock_wait,
                patch.object(scraper, "_handle_lazy_loading"),
                patch.object(scraper, "_filter_dogs_by_section", return_value=[]),
            ):
                mock_wait.return_value.until.return_value = True
                result = scraper._extract_with_selenium()

            mock_browser_service.assert_called_once()
            mock_service.create_driver.assert_called_once()
            assert result == []

    @pytest.mark.unit
    def test_parse_name_and_location(self, scraper):
        test_cases = [
            ("Brownie - in München", ("Brownie", "München")),
            ("Luna - im Berlin", ("Luna", "Berlin")),
            ("Max - Frankfurt", ("Max", "Frankfurt")),
            ("Bella", ("Bella", None)),
            ("", (None, None)),
            ("Rex - in Nordmazedonien", ("Rex", "Nordmazedonien")),
        ]

        for text, expected in test_cases:
            result = scraper._parse_name_and_location(text)
            assert result == expected, f"Failed for input: {text}"

    @pytest.mark.unit
    def test_extract_external_id_from_url(self, scraper):
        test_cases = [
            ("https://daisyfamilyrescue.de/hund-brownie/", "hund-brownie"),
            ("https://daisyfamilyrescue.de/hund-luna-123/", "hund-luna-123"),
            ("/hund-max/", "hund-max"),
            ("invalid-url", None),
        ]

        for url, expected in test_cases:
            result = scraper._extract_external_id_from_url(url)
            if expected is None:
                assert len(result) == 8, f"Expected 8-char hash for invalid URL: {url}"
            else:
                assert result == expected, f"Failed for URL: {url}"

    @pytest.mark.unit
    def test_is_valid_image_url(self, scraper):
        valid_urls = [
            "https://example.com/dog.jpg",
            "https://site.com/image.png",
            "https://daisyfamilyrescue.de/beitragsbild/dog.webp",
            "https://site.com/elementor/thumbs/image.jpeg",
        ]

        invalid_urls = [
            "",
            None,
            "not-an-image-url",
            "https://site.com/document.pdf",
        ]

        for url in valid_urls:
            assert scraper._is_valid_image_url(url), f"Should be valid: {url}"

        for url in invalid_urls:
            assert not scraper._is_valid_image_url(url), f"Should be invalid: {url}"

    @pytest.mark.unit
    def test_extract_additional_info_from_text(self, scraper):
        test_cases = [
            (
                "Dog info 03/2020 • 53cm • 19kg",
                {"birth_date": "03/2020", "height_cm": 53, "weight_kg": 19},
            ),
            ("Luna 45cm tall", {"height_cm": 45}),
            ("Max weighs 12kg", {"weight_kg": 12}),
            ("Born 05/2021", {"birth_date": "05/2021"}),
            ("No pattern here", {}),
        ]

        for text, expected in test_cases:
            result = scraper._extract_additional_info_from_text(text)
            assert result == expected, f"Failed for text: {text}"

    @pytest.mark.unit
    def test_generate_external_id(self, scraper):
        test_cases = [
            ("Bruno", "https://site.com/hund-bruno/", "hund-bruno"),
            ("Müller", "https://site.com/other/", "mueller"),
            ("Test Dog", "https://site.com/page/", "test-dog"),
        ]

        for name, url, expected_start in test_cases:
            result = scraper.generate_external_id(name, url)
            if expected_start == "hund-bruno":
                assert result == expected_start
            else:
                assert result is not None and len(result) >= 3, f"Should generate valid ID, got {result}"

    @pytest.mark.unit
    def test_validate_dog_data_valid(self, scraper):
        valid_data = {
            "name": "Test Dog",
            "external_id": "test-123",
            "adoption_url": "https://example.com/dog",
            "properties": {},
        }

        assert scraper._validate_dog_data(valid_data) is True

    @pytest.mark.unit
    def test_validate_dog_data_invalid(self, scraper):
        invalid_cases = [
            {
                "external_id": "test-123",
                "adoption_url": "https://example.com/dog",
                "properties": {},
            },
            {
                "name": "Test Dog",
                "adoption_url": "https://example.com/dog",
                "properties": {},
            },
            {
                "name": "X",
                "external_id": "test-123",
                "adoption_url": "https://example.com/dog",
                "properties": {},
            },
            {
                "name": "Test Dog",
                "external_id": "xx",
                "adoption_url": "https://example.com/dog",
                "properties": {},
            },
            {
                "name": "Test Dog",
                "external_id": "test-123",
                "adoption_url": "not-a-url",
                "properties": {},
            },
        ]

        for invalid_data in invalid_cases:
            assert scraper._validate_dog_data(invalid_data) is False, f"Should be invalid: {invalid_data}"

    @pytest.mark.unit
    def test_find_container_section(self, scraper):
        section_positions = {
            "Bei einer Pflegestelle in Deutschland": 100,
            "Hündinnen in Nordmazedonien": 200,
            "In medizinischer Behandlung": 300,
            "Wir sind bereits reserviert": 400,
        }

        test_cases = [
            (150, "Bei einer Pflegestelle in Deutschland"),
            (250, "Hündinnen in Nordmazedonien"),
            (350, "In medizinischer Behandlung"),
            (450, "Wir sind bereits reserviert"),
            (50, None),
        ]

        for container_pos, expected in test_cases:
            result = scraper._find_container_section(container_pos, section_positions)
            assert result == expected, f"Container at {container_pos} should be in section: {expected}"

    @pytest.mark.unit
    def test_scraper_initialization(self, scraper):
        assert scraper.base_url == "https://daisyfamilyrescue.de"
        assert scraper.listing_url == "https://daisyfamilyrescue.de/unsere-hunde/"

        assert len(scraper.target_sections) == 3
        assert "Bei einer Pflegestelle in Deutschland" in scraper.target_sections
        assert "Hündinnen in Nordmazedonien" in scraper.target_sections
        assert "Rüden in Nordmazedonien" in scraper.target_sections

        assert len(scraper.skip_sections) == 2
        assert "In medizinischer Behandlung" in scraper.skip_sections
        assert "Wir sind bereits reserviert" in scraper.skip_sections

    @pytest.mark.unit
    def test_section_filtering_includes_male_containers(self, scraper):
        section_positions = {
            "Bei einer Pflegestelle in Deutschland": 100,
            "Hündinnen in Nordmazedonien": 200,
            "Rüden in Nordmazedonien": 300,
            "In medizinischer Behandlung": 400,
            "Wir sind bereits reserviert": 500,
        }

        male_container_positions = [320, 350, 380]

        for container_pos in male_container_positions:
            section = scraper._find_container_section(container_pos, section_positions)
            assert section == "Rüden in Nordmazedonien"

            is_targeted = section in scraper.target_sections
            assert is_targeted, f"Male container at position {container_pos} should be in target sections"

    @pytest.mark.unit
    def test_link_extraction_skips_empty_text_links(self, scraper):
        container = Mock()

        image_link = Mock()
        image_link.get_attribute.side_effect = lambda attr: {
            "href": "https://daisyfamilyrescue.de/hund-brownie/",
        }.get(attr)
        image_link.text = ""

        text_link = Mock()
        text_link.get_attribute.side_effect = lambda attr: {
            "href": "https://daisyfamilyrescue.de/hund-brownie/",
        }.get(attr)
        text_link.text = "Brownie - in München"

        container.find_elements.return_value = [image_link, text_link]
        container.text = "Brownie - in München\n03/2020 • 53cm • 19kg"

        result = scraper._extract_dog_from_container(container, 1)

        assert result is not None, "Should extract dog data from text link"
        assert result["name"] == "Brownie", "Should extract name from text link, not empty image link"
        assert result["properties"]["location"] == "München", "Should extract location from text link"

    @pytest.mark.unit
    def test_link_text_extraction_germany_vs_macedonia_pattern(self, scraper):
        macedonia_container = Mock()
        macedonia_link = Mock()
        macedonia_link.get_attribute.side_effect = lambda attr: {
            "href": "https://daisyfamilyrescue.de/hund-bonnie-2/",
        }.get(attr)
        macedonia_link.text = "Bonnie"
        macedonia_container.find_elements.return_value = [macedonia_link]
        macedonia_container.text = "Bonnie\n03/2025 • im Wachstum"

        macedonia_result = scraper._extract_dog_from_container(macedonia_container, 1)
        assert macedonia_result is not None
        assert macedonia_result["name"] == "Bonnie"

        germany_container = Mock()

        image_link = Mock()
        image_link.get_attribute.side_effect = lambda attr: {
            "href": "https://daisyfamilyrescue.de/hund-brownie/",
        }.get(attr)
        image_link.text = ""

        text_link = Mock()
        text_link.get_attribute.side_effect = lambda attr: {
            "href": "https://daisyfamilyrescue.de/hund-brownie/",
        }.get(attr)
        text_link.text = "Brownie - in München"

        germany_container.find_elements.return_value = [image_link, text_link]
        germany_container.text = "Brownie - in München\n03/2020 • 53cm • 19kg"

        germany_result = scraper._extract_dog_from_container(germany_container, 1)
        assert germany_result is not None, "Should skip empty image link and use text link"
        assert germany_result["name"] == "Brownie", "Should extract name from text link"


class TestDaisyFamilyRescueScraperIntegration:
    @pytest.fixture
    def scraper(self):
        with (
            patch("scrapers.base_scraper.create_default_sync_service") as mock_sync,
            patch("scrapers.base_scraper.ConfigLoader") as mock_config_loader,
            patch("scrapers.base_scraper.R2Service"),
            patch.dict("os.environ", {"TESTING_VALIDATE_SYNC": "true"}),
        ):
            mock_config = MagicMock()
            mock_config.name = "Daisy Family Rescue e.V."
            mock_config.get_scraper_config_dict.return_value = {
                "rate_limit_delay": 0.1,
                "max_retries": 1,
                "timeout": 5,
                "headless": True,
            }
            mock_config.get_display_name.return_value = "Daisy Family Rescue e.V."

            mock_config_loader.return_value.load_config.return_value = mock_config
            mock_sync_service = Mock()
            mock_sync_service.sync_single_organization.return_value = Mock(organization_id=12, was_created=True)
            mock_sync.return_value = mock_sync_service

            scraper = DaisyFamilyRescueScraper(config_id="daisyfamilyrescue")
            return scraper

    @pytest.mark.integration
    def test_end_to_end_data_flow_mock(self, scraper):
        with patch.object(scraper, "_extract_with_selenium") as mock_extract:
            raw_dog_data = [
                {
                    "name": "LUNA",
                    "external_id": "hund-luna",
                    "adoption_url": "https://daisyfamilyrescue.de/hund-luna/",
                    "primary_image_url": "https://example.com/luna.jpg",
                    "status": "available",
                    "animal_type": "dog",
                    "birth_date": "03/2020",
                    "height_cm": 45,
                    "weight_kg": 15,
                    "properties": {
                        "source": "daisyfamilyrescue.de",
                        "country": "DE",
                        "extraction_method": "selenium_listing",
                        "language": "de",
                        "location": "München",
                    },
                }
            ]

            mock_extract.return_value = raw_dog_data

            result = scraper.collect_data()

            assert len(result) == 1
            dog = result[0]

            assert dog["name"] == "Luna"
            assert dog["external_id"] == "hund-luna"
            assert dog["birth_date"] == "03/2020"
            assert dog["height_cm"] == 45
            assert dog["weight_kg"] == 15

            props = dog["properties"]
            assert props["language"] == "en"
            assert props["original_language"] == "de"
            assert props["location"] == "München"

    @pytest.mark.integration
    def test_translation_and_normalization_integration(self, scraper):
        raw_dogs = [
            {
                "name": "BRUNO",
                "breed": "Deutscher Schäferhund Mischling",
                "sex": "männlich, kastriert",
                "age_text": "03/2020",
                "external_id": "hund-bruno",
                "adoption_url": "https://daisyfamilyrescue.de/hund-bruno/",
                "primary_image_url": "https://example.com/bruno.jpg",
                "properties": {
                    "character_german": "menschenbezogen, verschmust, liebevoll",
                    "origin": "Nordmazedonien",
                    "current_location": "München",
                    "language": "de",
                },
            }
        ]

        translated_dogs = scraper._translate_and_normalize_dogs(raw_dogs)

        assert len(translated_dogs) == 1
        dog = translated_dogs[0]

        assert dog["name"] == "Bruno"
        assert dog["breed"] == "German Shepherd Mixed Breed"
        assert dog["sex"] == "Male"
        assert dog["age_text"] == "Born 03/2020"

        props = dog["properties"]
        assert props["language"] == "en"
        assert props["original_language"] == "de"
        assert props["translation_service"] == "daisy_family_rescue"
        assert "character" in props
        assert "people-oriented" in props["character"]
        assert "origin_translated" in props
        assert "North Macedonia" in props["origin_translated"]

    @pytest.mark.integration
    def test_detail_scraper_integration(self, scraper):
        basic_dog_data = {
            "name": "Test Dog",
            "external_id": "hund-test",
            "adoption_url": "https://daisyfamilyrescue.de/hund-test/",
            "properties": {"source": "daisyfamilyrescue.de"},
        }

        mock_detailed_data = {
            "breed": "Mischling",
            "sex": "weiblich, kastriert",
            "age_text": "2 Jahre",
            "properties": {
                "character_german": "freundlich, verspielt",
                "origin": "Nordmazedonien",
                "weight_kg": 15,
                "height_cm": 45,
            },
        }

        with patch.object(DaisyFamilyRescueDogDetailScraper, "extract_dog_details") as mock_extract:
            mock_extract.return_value = mock_detailed_data

            enhanced_data = scraper._enhance_with_detail_page(basic_dog_data)

            assert enhanced_data["name"] == "Test Dog"
            assert enhanced_data["breed"] == "Mischling"
            assert enhanced_data["sex"] == "weiblich, kastriert"

            props = enhanced_data["properties"]
            assert props["source"] == "daisyfamilyrescue.de"
            assert props["character_german"] == "freundlich, verspielt"
            assert props["weight_kg"] == 15
            assert props["height_cm"] == 45

    @pytest.mark.integration
    def test_detail_scraper_error_handling(self, scraper):
        basic_dog_data = {
            "name": "Test Dog",
            "external_id": "hund-test",
            "adoption_url": "https://daisyfamilyrescue.de/hund-test/",
            "properties": {"source": "daisyfamilyrescue.de"},
        }

        with patch.object(DaisyFamilyRescueDogDetailScraper, "extract_dog_details") as mock_extract:
            mock_extract.side_effect = Exception("Connection error")

            result = scraper._enhance_with_detail_page(basic_dog_data)
            assert result == basic_dog_data

    @pytest.mark.integration
    def test_translation_error_handling(self, scraper):
        problematic_dogs = [
            {
                "name": "Test",
                "breed": None,
                "sex": "",
                "properties": {
                    "character_german": None,
                },
            }
        ]

        result = scraper._translate_and_normalize_dogs(problematic_dogs)
        assert len(result) == 1
        assert result[0]["name"] == "Test"

    @pytest.mark.integration
    def test_rate_limiting_integration(self, scraper):
        start_time = time.time()
        scraper.respect_rate_limit()
        elapsed = time.time() - start_time

        assert elapsed >= 0.09, f"Rate limit not respected: {elapsed} seconds"

    @pytest.mark.integration
    def test_basescraper_method_integration(self, scraper):
        org_name = scraper.get_organization_name()
        assert "Daisy Family Rescue" in org_name

        rate_delay = scraper.get_rate_limit_delay()
        assert rate_delay == 0.1

    @pytest.mark.integration
    def test_configuration_driven_initialization(self):
        with (
            patch("scrapers.base_scraper.create_default_sync_service") as mock_sync,
            patch("scrapers.base_scraper.ConfigLoader") as mock_config_loader,
            patch("scrapers.base_scraper.R2Service"),
            patch.dict("os.environ", {"TESTING_VALIDATE_SYNC": "true"}),
        ):
            mock_config = MagicMock()
            mock_config.name = "Daisy Family Rescue e.V."
            mock_config.get_scraper_config_dict.return_value = {
                "rate_limit_delay": 2.5,
                "max_retries": 3,
                "timeout": 30,
            }
            mock_config.get_display_name.return_value = "Daisy Family Rescue e.V."

            mock_config_loader.return_value.load_config.return_value = mock_config
            mock_sync_service = Mock()
            mock_sync_service.sync_single_organization.return_value = Mock(organization_id=12, was_created=True)
            mock_sync.return_value = mock_sync_service

            scraper = DaisyFamilyRescueScraper(config_id="daisyfamilyrescue")

            assert scraper.rate_limit_delay == 2.5
            assert scraper.max_retries == 3
            assert scraper.timeout == 30
            assert scraper.organization_id == 12

    @pytest.mark.integration
    def test_legacy_initialization_compatibility(self):
        with (
            patch("scrapers.base_scraper.create_default_sync_service"),
            patch("scrapers.base_scraper.ConfigLoader"),
            patch("scrapers.base_scraper.R2Service"),
        ):
            scraper = DaisyFamilyRescueScraper(organization_id=12)

            assert scraper.organization_id == 12
            assert scraper.org_config is None
            assert scraper.rate_limit_delay == 1.0
            assert scraper.max_retries == 3
            assert scraper.timeout == 30
