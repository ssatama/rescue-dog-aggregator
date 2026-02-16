import re
from unittest.mock import Mock, patch

import pytest

from scrapers.manytearsrescue.manytearsrescue_scraper import ManyTearsRescueScraper


@pytest.mark.slow
@pytest.mark.browser
class TestManyTearsRescueScraper:
    def test_scraper_initialization_with_config(self):
        with (
            patch("scrapers.base_scraper.ConfigLoader"),
            patch("scrapers.base_scraper.create_default_sync_service"),
        ):
            scraper = ManyTearsRescueScraper(config_id="manytearsrescue")
            assert scraper is not None
            assert hasattr(scraper, "collect_data")
            assert hasattr(scraper, "get_animal_list")

    def test_scraper_inherits_from_base_scraper(self):
        from scrapers.base_scraper import BaseScraper

        with (
            patch("scrapers.base_scraper.ConfigLoader"),
            patch("scrapers.base_scraper.create_default_sync_service"),
        ):
            scraper = ManyTearsRescueScraper(config_id="manytearsrescue")
            assert isinstance(scraper, BaseScraper)

    @patch("scrapers.manytearsrescue.manytearsrescue_scraper.get_browser_service")
    def test_selenium_driver_cleanup_on_exception(self, mock_browser_service):
        mock_service = Mock()
        mock_browser_service.return_value = mock_service
        mock_driver = Mock()
        mock_browser_result = Mock()
        mock_browser_result.driver = mock_driver
        mock_service.create_driver.return_value = mock_browser_result
        mock_driver.get.side_effect = Exception("Network error")

        with (
            patch("scrapers.base_scraper.ConfigLoader"),
            patch("scrapers.base_scraper.create_default_sync_service"),
        ):
            scraper = ManyTearsRescueScraper(config_id="manytearsrescue")

            result = scraper.get_animal_list()

            assert isinstance(result, list)
            mock_driver.quit.assert_called_once()

    @patch("scrapers.manytearsrescue.manytearsrescue_scraper.get_browser_service")
    def test_collect_data_follows_template_method_pattern(self, mock_browser_service):
        mock_service = Mock()
        mock_browser_service.return_value = mock_service
        mock_driver = Mock()
        mock_browser_result = Mock()
        mock_browser_result.driver = mock_driver
        mock_service.create_driver.return_value = mock_browser_result
        mock_driver.page_source = "<html><body></body></html>"

        with (
            patch("scrapers.base_scraper.ConfigLoader"),
            patch("scrapers.base_scraper.create_default_sync_service"),
        ):
            scraper = ManyTearsRescueScraper(config_id="manytearsrescue")

            with patch.object(scraper, "get_animal_list", return_value=[]) as mock_get_animals:
                result = scraper.collect_data()

                mock_get_animals.assert_called_once()
                assert isinstance(result, list)

    def test_service_injection_constructor_accepts_optional_services(self):
        from services.null_objects import NullMetricsCollector

        mock_metrics = NullMetricsCollector()

        with (
            patch("scrapers.base_scraper.ConfigLoader"),
            patch("scrapers.base_scraper.create_default_sync_service"),
        ):
            scraper = ManyTearsRescueScraper(config_id="manytearsrescue", metrics_collector=mock_metrics)

            assert scraper is not None
            assert scraper.metrics_collector is not None


@pytest.mark.slow
@pytest.mark.browser
@pytest.mark.external
class TestManyTearsRescueDetailExtraction:
    @pytest.fixture
    def scraper(self):
        return ManyTearsRescueScraper(config_id="manytearsrescue")

    def test_extract_dog_details_all_five_dogs(self, scraper):
        pytest.skip("Dogs in test have been adopted - test needs updating with new dogs")
        test_dogs = [
            {
                "url": "https://www.manytearsrescue.org/adopt/dogs/3114/",
                "expected": {
                    "name": "Taz",
                    "age_pattern": r"\d+ (weeks?|months?)",
                    "sex": "Male",
                    "breed": "Labrador Retriever",
                    "location": "Many Tears, Llanelli, Carmarthenshire",
                    "description_contains": [
                        "Taz is a friendly, affectionate pup",
                        "neurological issues",
                        "happy and bouncy little puppy",
                        "loves other dogs",
                        "sweet, cuddly boy who thrives on human affection",
                    ],
                    "requirements": {
                        "human_family_requirements": "I can be homed with older dog-savvy teens who understand me!",
                        "other_pet_requirements": "I would like another dog in my new home to be my friend.",
                        "house_garden_requirements": "I am active for my age and would love a garden to let off steam.",
                        "out_about_requirements": "I would love plenty of adventures once I have settled and am fully vaccinated!",
                        "training_needs": "I am just a puppy! Please be patient with me while I learn the basics!",
                        "medical_issues": "Please read below for more information about my health!",
                    },
                },
            },
            {
                "url": "https://www.manytearsrescue.org/adopt/dogs/4492/",
                "expected": {
                    "name": "Otaya",
                    "age_text": "10 years",
                    "sex": "Female",
                    "breed": "Shepherd",
                    "location": "Many Tears, Llanelli, Carmarthenshire",
                    "description_contains": [
                        "rescued from a home in heartbreaking conditions",
                        "beautiful, gentle soul",
                        "soft sparkle in her eye",
                        "Cambrian Shepherd",
                        "quiet, affectionate nature",
                    ],
                    "requirements": {
                        "human_family_requirements": "I need a quiet home where I won't be overwhelmed while I settle in at my own pace.",
                        "other_pet_requirements": "I need a doggy friend in my new home. I've never met cats so I'm unsure!",
                        "house_garden_requirements": "I would like a secure garden, with tall fences to spend time in.",
                        "out_about_requirements": "I am learning new surroundings and will need assistance while I get comfortable",
                        "training_needs": "I am learning to walk on a harness, and will need help mastering house training.",
                        "medical_issues": "Please read below for more information about my health!",
                    },
                },
            },
            {
                "url": "https://www.manytearsrescue.org/adopt/dogs/3438/",
                "expected": {
                    "name": "Simon",
                    "age_text": "1 year",
                    "sex": "Male",
                    "breed": "Maltese",
                    "location": "In Foster: Yeovil, Somerset",
                    "description_contains": [
                        "came to us from a breeder",
                        "frightened and unsure",
                        "beginning to realise that he is finally safe",
                        "gently asking for strokes",
                        "picture of joy",
                    ],
                    "requirements": {
                        "human_family_requirements": "I could live with dog-savvy teens who understand my needs.",
                        "other_pet_requirements": "I will need a kind resident dog to take me under their wing. I have never met cats.",
                        "house_garden_requirements": "I would like a secure garden to spend time in.",
                        "out_about_requirements": "I haven't tried walks just yet and will find this a bit overwhelming at the moment.",
                        "training_needs": "I have never lived in a home so I will need help to learn house training.",
                        "medical_issues": "I am neutered and ready to find my forever home!",
                    },
                },
            },
            {
                "url": "https://www.manytearsrescue.org/adopt/dogs/2354/",
                "expected": {
                    "name": "Oreo",
                    "age_text": "1 year",
                    "sex": "Male",
                    "breed": "Mixed Breed",
                    "location": "In Foster: Llanelli, Carmarthenshire",
                    "description_contains": [
                        "Australian Shepherd/Doodle cross",
                        "truly blossomed",
                        "happy, sociable and affectionate boy",
                        "walking beautifully on the lead",
                        "cuddlebug and a joy to live with",
                    ],
                    "requirements": {
                        "human_family_requirements": "I need an active home where I get plenty of exercise",
                        "other_pet_requirements": "I can be an only dog or live with other & cats as long as they are dog savvy!",
                        "house_garden_requirements": "I would love a large, secure garden to let off steam.",
                        "out_about_requirements": "I have lots of energy and would love to go on plenty of walks.",
                        "training_needs": "I am looking for an experienced home. Please read below for more information!",
                        "medical_issues": "I am ready for my forever home!",
                    },
                },
            },
        ]

        failures = []
        skipped_dogs = []
        for dog_test in test_dogs:
            result = scraper._scrape_animal_details(dog_test["url"])

            if not result or result.get("name") == "Unknown":
                skipped_dogs.append(dog_test["expected"]["name"])
                continue

            assert result.get("name") == dog_test["expected"]["name"]

            age_text = result.get("age_text", "")
            if "age_pattern" in dog_test["expected"]:
                pattern = dog_test["expected"]["age_pattern"]
                if not re.match(pattern, age_text):
                    failures.append(f"{dog_test['expected']['name']}: Age doesn't match pattern - got '{age_text}', expected pattern '{pattern}'")
            else:
                expected_age = dog_test["expected"]["age_text"]
                if age_text != expected_age and age_text != "Unknown":
                    failures.append(f"{dog_test['expected']['name']}: Age mismatch - got '{age_text}', expected '{expected_age}'")

            sex = result.get("sex", "")
            if sex != dog_test["expected"]["sex"] and sex != "Unknown":
                failures.append(f"{dog_test['expected']['name']}: Sex mismatch - got '{sex}', expected '{dog_test['expected']['sex']}'")

            breed = result.get("breed", "")
            if breed != dog_test["expected"]["breed"] and breed != "Mixed Breed":
                failures.append(f"{dog_test['expected']['name']}: Breed mismatch - got '{breed}', expected '{dog_test['expected']['breed']}'")

            properties = result.get("properties", {})
            description = result.get("description", "")
            properties_description = properties.get("description", "")

            if not description:
                failures.append(f"{dog_test['expected']['name']}: MISSING DESCRIPTION!")
            elif not properties_description:
                failures.append(f"{dog_test['expected']['name']}: MISSING DESCRIPTION IN PROPERTIES!")
            else:
                for expected_phrase in dog_test["expected"]["description_contains"]:
                    if expected_phrase.lower() not in description.lower():
                        expected_cleaned = expected_phrase.replace(" ", "").lower()
                        description_cleaned = description.replace(" ", "").lower()
                        if expected_cleaned not in description_cleaned:
                            failures.append(f"{dog_test['expected']['name']}: Description missing expected phrase: '{expected_phrase}'")

            for req_key, _expected_value in dog_test["expected"]["requirements"].items():
                actual_value = properties.get(req_key, "")
                if not actual_value:
                    failures.append(f"{dog_test['expected']['name']}: Missing requirement '{req_key}'")

            primary_image = result.get("primary_image_url", "")
            if not primary_image:
                failures.append(f"{dog_test['expected']['name']}: Missing primary image URL")

        if failures:
            pytest.fail(f"\n{len(failures)} issues found across the tested dogs")

        tested_count = len(test_dogs) - len(skipped_dogs)
        if tested_count < 3:
            pytest.fail(f"Too many dogs have been adopted. Only {tested_count} dogs could be tested (minimum 3 required)")
