from datetime import datetime

import pytest

# Updated imports for legacy functions after consolidation
from scrapers.misis_rescue.normalizer import (
    calculate_age_years,
    extract_birth_date,
    extract_breed,
    extract_sex,
    normalize_name,
    normalize_size,
)
from scrapers.misis_rescue.normalizer import extract_age_from_text_legacy as extract_age_from_text
from scrapers.misis_rescue.normalizer import extract_breed_from_text_legacy as extract_breed_from_text
from scrapers.misis_rescue.normalizer import extract_sex_from_text_legacy as extract_sex_from_text
from scrapers.misis_rescue.normalizer import extract_weight_kg_legacy as extract_weight_kg


@pytest.mark.database
@pytest.mark.integration
@pytest.mark.slow
class TestMisisRescueNormalizer:
    """Test normalization functions for MisisRescue data.

    Test cases based on actual formats seen in screenshots/ folder.
    """

    def test_extract_birth_date_various_formats(self):
        """Test DOB extraction from formats seen in screenshots."""
        # From AMENA screenshot:
        assert extract_birth_date("rough estimate DOB 2021") == "2021"

        # From LEO screenshot:
        assert extract_birth_date("DOB: March 2023") == "March 2023"

        # From Naomi screenshot:
        assert extract_birth_date("DOB: April/May 2024") == "April/May 2024"

        # Edge cases
        assert extract_birth_date("no date info") is None
        assert extract_birth_date("born in 2022") == "2022"
        assert extract_birth_date("birthday: June 2023") == "June 2023"
        assert extract_birth_date("") is None
        assert extract_birth_date(None) is None

    def test_calculate_age_years(self):
        """Test age calculation from DOB text."""
        # Test year only (approximate values based on current year)
        current_year = datetime.now().year
        assert calculate_age_years("2021") == float(current_year - 2021)
        assert calculate_age_years("2023") == float(current_year - 2023)

        # Test month/year formats (approximate)
        march_2023_age = calculate_age_years("March 2023")
        assert march_2023_age is not None
        assert march_2023_age > 0

        april_2024_age = calculate_age_years("April/May 2024")
        assert april_2024_age is not None
        assert april_2024_age > 0

        # Test invalid formats
        assert calculate_age_years("no date") is None
        assert calculate_age_years("") is None
        assert calculate_age_years(None) is None

    def test_extract_breed(self):
        """Test breed extraction from bullet points seen in screenshots."""
        # AMENA example
        bullets = [
            "rough estimate DOB 2021",
            "10kg, height 35 cm, length 55cm",
            "mixed breed",
        ]
        assert extract_breed(bullets) == "Mixed Breed"

        # LEO example
        bullets = ["DOB: March 2023", "Mixed breed", "Currently weighs 2-3kg"]
        assert extract_breed(bullets) == "Mixed Breed"

        # Test various breed formats
        bullets = ["DOB: 2022", "Golden Retriever mix", "loves walks"]
        assert extract_breed(bullets) == "Golden Retriever Mix"

        # Test pure breed
        bullets = ["info here", "Labrador", "more info"]
        assert extract_breed(bullets) == "Labrador"

        # Test no breed info
        bullets = ["DOB: 2022", "weighs 10kg", "friendly dog"]
        assert extract_breed(bullets) is None

        # Test empty/invalid input
        assert extract_breed([]) is None
        assert extract_breed(None) is None

    def test_extract_sex(self):
        """Test sex extraction from various formats in screenshots."""
        # Must return 'Male', 'Female', or None
        # Screenshots show: not tested on cats/kids, neutered status, etc.
        bullets_female = ["she is great with other dogs", "not tested on cats"]
        assert extract_sex(bullets_female) == "Female"

        bullets_male = ["he needs guidance", "castration is mandatory"]
        assert extract_sex(bullets_male) == "Male"

        # Test spayed/neutered indicators
        bullets_spayed = ["spayed female", "good with kids"]
        assert extract_sex(bullets_spayed) == "Female"

        bullets_neutered = ["neutered male", "house trained"]
        assert extract_sex(bullets_neutered) == "Male"

        # Test ambiguous/no gender info
        bullets_unclear = ["loves to play", "good with dogs", "needs training"]
        assert extract_sex(bullets_unclear) is None

        # Test edge cases
        assert extract_sex([]) is None
        assert extract_sex(None) is None

    def test_normalize_size(self):
        """Test size normalization from weight/dimensions."""
        # Based on screenshot examples
        # 10kg should be Small-Medium
        assert normalize_size("10kg") == "Small"

        # 18kg should be Medium
        assert normalize_size("18kg") == "Medium"

        # 21-22kg should be Medium-Large
        assert normalize_size("21-22kg") == "Medium"

        # Large dogs
        assert normalize_size("35kg") == "Large"

        # Very small dogs
        assert normalize_size("2-3kg") == "Tiny"

        # Test invalid input
        assert normalize_size("no weight info") is None
        assert normalize_size("") is None
        assert normalize_size(None) is None

    def test_extract_weight_kg(self):
        """Test weight extraction from various formats."""
        # From screenshots - various weight formats
        assert extract_weight_kg("10kg, height 35 cm, length 55cm") == 10.0
        assert extract_weight_kg("Currently weighs 2-3kg") == 2.5  # average
        assert extract_weight_kg("weighs 18kg") == 18.0
        assert extract_weight_kg("21-22kg") == 21.5  # average

        # Test edge cases
        assert extract_weight_kg("no weight mentioned") is None
        assert extract_weight_kg("") is None
        assert extract_weight_kg(None) is None

        # Test various formats
        assert extract_weight_kg("weight: 15 kg") == 15.0
        assert extract_weight_kg("15-20 kg") == 17.5

    def test_extract_birth_date_comprehensive(self):
        """Test more comprehensive DOB extraction patterns."""
        # Test various DOB formats from screenshots
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

    def test_extract_breed_comprehensive(self):
        """Test comprehensive breed extraction."""
        test_cases = [
            # Mixed breed variations
            (["mixed breed"], "Mixed Breed"),
            (["Mixed breed"], "Mixed Breed"),
            (["mix"], "Mixed Breed"),
            (["crossbreed"], "Mixed Breed"),
            # Pure breeds
            (["Golden Retriever"], "Golden Retriever"),
            (["Labrador"], "Labrador"),
            (["German Shepherd"], "German Shepherd"),
            # Mix combinations
            (["Golden Retriever mix"], "Golden Retriever Mix"),
            (["Lab mix"], "Labrador Mix"),  # Normalizer converts Lab to Labrador
            # No breed info
            (["DOB: 2022", "weighs 10kg"], None),
            ([], None),
        ]

        for bullets, expected in test_cases:
            result = extract_breed(bullets)
            assert result == expected, f"Failed for bullets: {bullets}"

    def test_extract_sex_comprehensive(self):
        """Test comprehensive sex extraction."""
        test_cases = [
            # Female indicators
            (["she loves to play"], "Female"),
            (["her favorite activity"], "Female"),
            (["spayed female"], "Female"),
            (["female dog"], "Female"),
            # Male indicators
            (["he is very friendly"], "Male"),
            (["his best trait"], "Male"),
            (["neutered male"], "Male"),
            (["male dog"], "Male"),
            (["castration is required"], "Male"),
            # No clear indicators
            (["loves to play", "good with kids"], None),
            (["friendly dog"], None),
            ([], None),
        ]

        for bullets, expected in test_cases:
            result = extract_sex(bullets)
            assert result == expected, f"Failed for bullets: {bullets}"

    def test_screenshot_based_examples(self):
        """Test with actual examples from screenshots."""
        # AMENA example from screenshot
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

        # LEO example from screenshot
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

        # Test edge case with multiple weight mentions
        multi_weight_bullets = [
            "DOB: 2022",
            "weighs 18kg, previously 15kg",
            "Golden Retriever mix",
        ]

        # Should pick up first weight mentioned
        assert extract_weight_kg(multi_weight_bullets[1]) == 18.0
        assert normalize_size(multi_weight_bullets[1]) == "Medium"
        assert extract_breed(multi_weight_bullets) == "Golden Retriever Mix"


class TestNameNormalization:
    """Test enhanced name normalization functionality."""

    def test_normalize_name_removes_emojis(self):
        """Test that emoji patterns in names are removed."""
        test_cases = [
            ("🌸🍀 Lucinda 🍀🌸", "Lucinda"),
            ("🐾🍭RASHA🍭🐾", "Rasha"),
            ("❤️ Max ❤️", "Max"),
            ("Bella 🌟", "Bella"),
            ("🌟 Luna 🌟", "Luna"),
            ("Regular Name", "Regular Name"),
        ]

        for input_name, expected in test_cases:
            result = normalize_name(input_name)
            assert result == expected, f"Failed for input: '{input_name}'"

    def test_normalize_name_removes_gender_descriptors(self):
        """Test that gender descriptors are removed from names."""
        test_cases = [
            ("Beky He'S A Boy", "Beky"),
            ("Becky hes a boy", "Becky"),
            ("Sarah She's A Girl", "Sarah"),
            ("Max he is male", "Max"),
            ("Luna she is female", "Luna"),
            ("Charlie (male)", "Charlie"),
            ("Bella (female)", "Bella"),
        ]

        for input_name, expected in test_cases:
            result = normalize_name(input_name)
            assert result == expected, f"Failed for input: '{input_name}'"

    def test_normalize_name_removes_location_suffixes(self):
        """Test that location suffixes are removed."""
        test_cases = [
            ("X in UK", "X"),
            ("Max in Germany", "Max"),
            ("Bella in Spain", "Bella"),
            ("Luna from Serbia", "Luna"),
            ("Charlie - UK", "Charlie"),
            ("Sandy (Serbia)", "Sandy"),
        ]

        for input_name, expected in test_cases:
            result = normalize_name(input_name)
            assert result == expected, f"Failed for input: '{input_name}'"

    def test_normalize_name_handles_unicode_and_casing(self):
        """Test unicode handling and proper title casing."""
        test_cases = [
            ("CHARLIE", "Charlie"),
            ("bella", "Bella"),
            ("mAx", "Max"),
            ("josé", "José"),
            ("andré", "André"),
            ("françois", "François"),
        ]

        for input_name, expected in test_cases:
            result = normalize_name(input_name)
            assert result == expected, f"Failed for input: '{input_name}'"

    def test_normalize_name_complex_cases(self):
        """Test complex cases with multiple issues."""
        test_cases = [
            ("🌸 BEKY HE'S A BOY 🌸", "Beky"),
            ("🐾 Max in UK (male) 🐾", "Max"),
            ("❤️ bella she's a girl from serbia ❤️", "Bella"),
            ("CHARLIE 🌟 (male) - Germany", "Charlie"),
        ]

        for input_name, expected in test_cases:
            result = normalize_name(input_name)
            assert result == expected, f"Failed for input: '{input_name}'"

    def test_normalize_name_edge_cases(self):
        """Test edge cases and invalid inputs."""
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


class TestEnhancedAgeExtraction:
    """Test enhanced age extraction from detailed text."""

    def test_extract_age_from_text_y_old_patterns(self):
        """Test extraction of 'y old' format patterns."""
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

    def test_extract_age_from_text_years_old_patterns(self):
        """Test extraction of 'years old' patterns."""
        test_cases = [
            ("nearly 2 years old", 2.0),
            ("approximately 3 years old", 3.0),
            ("roughly 4 years old", 4.0),
            ("about 1.5 years old", 1.5),
            ("exactly 2 years old", 2.0),
        ]

        for text, expected in test_cases:
            result = extract_age_from_text(text)
            assert result == expected, f"Failed for text: '{text}'"

    def test_extract_age_from_text_months_patterns(self):
        """Test extraction of months patterns."""
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

    def test_extract_age_from_text_vet_estimates(self):
        """Test extraction from veterinary estimates."""
        test_cases = [
            ("roughly 3 y old (at least that's how the vet estimated her)", 3.0),
            ("vet estimates around 2 years", 2.0),
            ("veterinary assessment: 4 years old", 4.0),
        ]

        for text, expected in test_cases:
            result = extract_age_from_text(text)
            assert result == expected, f"Failed for text: '{text}'"

    def test_extract_age_from_text_no_matches(self):
        """Test cases with no age information."""
        test_cases = [
            ("good with other dogs"),
            ("loves to play"),
            ("mixed breed"),
            ("weighs 20kg"),
            (""),
        ]

        for text in test_cases:
            result = extract_age_from_text(text)
            assert result is None, f"Should return None for text: '{text}'"


class TestEnhancedSexDetection:
    """Test enhanced sex detection with confidence scoring."""

    def test_extract_sex_from_text_pronoun_detection(self):
        """Test sex detection from pronouns in text."""
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

    def test_extract_sex_from_text_medical_terms(self):
        """Test sex detection from medical/spay/neuter terms."""
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

    def test_extract_sex_from_text_mixed_signals(self):
        """Test handling of mixed or conflicting signals."""
        test_cases = [
            ("she is a good boy", "Male"),  # "boy" is stronger indicator than "she"
            ("he and she are both available", None),  # Multiple dogs
            ("good with male and female dogs", None),  # Not about the dog
        ]

        for text, expected in test_cases:
            result = extract_sex_from_text(text)
            assert result == expected, f"Failed for text: '{text}'"

    def test_extract_sex_from_text_confidence_scoring(self):
        """Test that strong indicators override weak ones."""
        test_cases = [
            ("spayed female but he is good with kids", "Female"),  # Medical term wins
            ("he is neutered and she loves other dogs", "Male"),  # Medical term wins
            ("she she she loves to play", "Female"),  # Multiple instances
            ("his his his favorite toy", "Male"),  # Multiple instances
        ]

        for text, expected in test_cases:
            result = extract_sex_from_text(text)
            assert result == expected, f"Failed for text: '{text}'"


class TestEnhancedBreedDetection:
    """Test enhanced breed detection from detailed text."""

    def test_extract_breed_from_text_crossbreed_variations(self):
        """Test detection of crossbreed variations."""
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

    def test_extract_breed_from_text_specific_breeds(self):
        """Test detection of specific breed mentions."""
        test_cases = [
            ("possibly husky cross", "Husky Mix"),
            ("looks like german shepherd mix", "German Shepherd Mix"),
            ("might be labrador retriever", "Labrador Retriever"),
            ("appears to be terrier mix", "Terrier Mix"),
        ]

        for text, expected in test_cases:
            result = extract_breed_from_text(text)
            assert result == expected, f"Failed for text: '{text}'"

    def test_extract_breed_from_text_no_breed_info(self):
        """Test cases with no breed information."""
        test_cases = [
            ("loves to play and is friendly"),
            ("good with other dogs"),
            ("weighs about 20kg"),
            ("needs training"),
        ]

        for text in test_cases:
            result = extract_breed_from_text(text)
            assert result is None, f"Should return None for text: '{text}'"


class TestIntegratedNormalization:
    """Test integration of all normalization functions."""

    def test_comprehensive_normalization_pipeline(self):
        """Test that all normalization functions work together."""
        from scrapers.misis_rescue.normalizer import extract_age_from_text_legacy as extract_age_from_text
        from scrapers.misis_rescue.normalizer import extract_breed_from_text_legacy as extract_breed_from_text
        from scrapers.misis_rescue.normalizer import extract_sex_from_text_legacy as extract_sex_from_text
        from scrapers.misis_rescue.normalizer import extract_weight_kg_legacy as extract_weight_kg
        from scrapers.misis_rescue.normalizer import (
            normalize_name,
            normalize_size,
        )

        # Test data based on real database patterns
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
            # Test name normalization
            name_result = normalize_name(case["raw_name"])
            assert name_result == case["expected"]["name"], f"Name failed for {case['raw_name']}"

            # Test age extraction from text (with fallback logic like the parser does)
            age_result = extract_age_from_text(case["page_text"])
            if age_result is None and case["bullet_points"]:
                # Simulate bullet point fallback if page text doesn't have age
                for bullet in case["bullet_points"]:
                    if "year" in bullet or "old" in bullet:
                        # Simple extraction for test purposes
                        import re

                        match = re.search(r"(\d+)\s*year", bullet)
                        if match:
                            age_result = float(match.group(1))
                            break
            assert age_result == case["expected"]["age"], f"Age failed for {case['page_text']} and bullets {case['bullet_points']}"

            # Test sex extraction from text
            sex_result = extract_sex_from_text(case["page_text"])
            assert sex_result == case["expected"]["sex"], f"Sex failed for {case['page_text']}"

            # Test breed extraction from text (with fallback logic)
            breed_result = extract_breed_from_text(case["page_text"])
            if breed_result is None and case["bullet_points"]:
                # Fallback to bullet points for breed (simulate extract_breed function)
                from scrapers.misis_rescue.normalizer import extract_breed

                breed_result = extract_breed(case["bullet_points"])
            assert breed_result == case["expected"]["breed"], f"Breed failed for {case['page_text']} and bullets {case['bullet_points']}"

            # Test weight and size calculation (with fallback logic)
            weight_result = extract_weight_kg(case["page_text"])
            if weight_result is None and case["bullet_points"]:
                # Try bullet points
                for bullet in case["bullet_points"]:
                    weight_result = extract_weight_kg(bullet)
                    if weight_result:
                        break
            assert weight_result == case["expected"]["weight"], f"Weight failed for {case['page_text']} and bullets {case['bullet_points']}"

            size_result = normalize_size(f"{weight_result}kg" if weight_result else "")
            assert size_result == case["expected"]["size"], f"Size failed for weight {weight_result}"

    def test_size_calculation_from_breed_fallback(self):
        """Test size calculation using breed when weight unavailable."""
        from utils.standardization import get_size_from_breed

        test_cases = [
            ("Labrador Retriever", "Large"),
            ("Mixed Breed", "Medium"),  # Mixed breed has default Medium size
            ("Chihuahua", "Tiny"),
            ("German Shepherd", "Large"),
            ("Unknown", None),
        ]

        for breed, expected_size in test_cases:
            result = get_size_from_breed(breed)
            assert result == expected_size, f"Size from breed failed for {breed}"

    def test_size_calculation_priority_weight_over_breed(self):
        """Test that weight-based size calculation takes priority over breed-based."""
        from scrapers.misis_rescue.normalizer import normalize_size
        from utils.standardization import get_size_from_breed

        # Weight should override breed estimate
        test_cases = [
            {
                "weight_text": "5kg",
                "breed": "Labrador Retriever",  # Typically Large
                "expected_size": "Small",  # But weight says Small
            },
            {
                "weight_text": "35kg",
                "breed": "Chihuahua",  # Typically Tiny
                "expected_size": "Large",  # But weight says Large
            },
            {
                "weight_text": "15kg",
                "breed": "Mixed Breed",  # Also Medium size from breed
                "expected_size": "Medium",  # Weight and breed agree
            },
        ]

        for case in test_cases:
            # Weight-based size should be used
            weight_size = normalize_size(case["weight_text"])
            assert weight_size == case["expected_size"], f"Weight size failed for {case['weight_text']}"

            # Breed-based size would be different (except for Mixed Breed where they agree)
            breed_size = get_size_from_breed(case["breed"])
            if case["breed"] != "Mixed Breed":
                # For non-mixed breeds, weight should override breed estimate
                assert breed_size != case["expected_size"], f"Test case invalid - breed and weight give same size for {case['breed']}"
            else:
                # For Mixed Breed, weight and breed estimates can agree
                assert breed_size == case["expected_size"], "Mixed Breed should have Medium size from both weight and breed"

    def test_data_quality_improvements_real_cases(self):
        """Test with actual problematic cases from database."""
        from scrapers.misis_rescue.normalizer import extract_age_from_text_legacy as extract_age_from_text
        from scrapers.misis_rescue.normalizer import extract_sex_from_text_legacy as extract_sex_from_text
        from scrapers.misis_rescue.normalizer import (
            normalize_name,
        )

        # Real problematic cases from database analysis
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
                result = normalize_name(case["name"])
                assert result == case["expected_name"]

            if "text" in case:
                if "expected_age" in case:
                    age_result = extract_age_from_text(case["text"])
                    assert age_result == case["expected_age"]

                if "expected_sex" in case:
                    sex_result = extract_sex_from_text(case["text"])
                    assert sex_result == case["expected_sex"]
