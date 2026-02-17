from unittest.mock import MagicMock, Mock, patch
from urllib.parse import urlparse

import pytest
import requests
from selenium.common.exceptions import WebDriverException

from scrapers.rean.dogs_scraper import REANScraper


@pytest.fixture
def scraper():
    with (
        patch("scrapers.base_scraper.create_default_sync_service") as mock_sync,
        patch("scrapers.base_scraper.ConfigLoader") as mock_config_loader,
    ):
        mock_config = MagicMock()
        mock_config.name = "REAN Test"
        mock_config.get_scraper_config_dict.return_value = {
            "rate_limit_delay": 0.1,
            "max_retries": 2,
            "timeout": 10,
        }
        mock_config.metadata.website_url = "https://rean.org.uk"

        mock_config_loader.return_value.load_config.return_value = mock_config
        mock_sync_service = Mock()
        mock_sync_service.sync_single_organization.return_value = Mock(organization_id=1, was_created=True)
        mock_sync.return_value = mock_sync_service

        scraper = REANScraper()
        scraper.logger = Mock()
        return scraper


class TestREANNameExtraction:
    @pytest.mark.unit
    def test_extract_name_standard_patterns(self, scraper):
        assert scraper.extract_name("Bobbie is around 5 months old") == "Bobbie"
        assert scraper.extract_name("Jerry is 4 months old") == "Jerry"
        assert scraper.extract_name("Paloma is around 2 years old") == "Paloma"

    @pytest.mark.unit
    def test_extract_name_descriptive_patterns(self, scraper):
        assert scraper.extract_name("Little friendly Toby is 1.5 years") == "Toby"
        assert scraper.extract_name("Puppy Donald is 20kg") == "Donald"
        assert scraper.extract_name("Sweet boy Max is around 16 kg") == "Max"

    @pytest.mark.unit
    def test_extract_name_edge_cases(self, scraper):
        assert scraper.extract_name("REAN is looking for homes") is None
        assert scraper.extract_name("Reana is a sweet dog") == "Reana"
        assert scraper.extract_name("- Wrexham Nala is 2 years old") == "Nala"
        assert scraper.extract_name("- in Romania Tiny is 6 months old") == "Tiny"

    @pytest.mark.unit
    def test_extract_name_special_characters(self, scraper):
        test_cases = [
            ("D'Artagnan is 2 years old", None),
            ("Jos\u00e9 is 3 years old", "Jos\u00e9"),
            ("Mary-Jane is 1 year old", None),
        ]

        for text, expected in test_cases:
            result = scraper.extract_name(text)
            assert result == expected, f"Expected {expected!r}, got {result!r} for: {text!r}"


class TestREANAgeExtraction:
    @pytest.mark.unit
    @pytest.mark.parametrize(
        "text,expected",
        [
            ("5 months old", "5 months"),
            ("around 5 months old", "5 months"),
            ("1.5 years old", "1.5 years"),
            ("around 2 years old", "2 years"),
            ("no age here", None),
        ],
    )
    def test_extract_age(self, scraper, text, expected):
        assert scraper.extract_age(text) == expected

    @pytest.mark.unit
    def test_extract_age_invalid_formats(self, scraper):
        invalid_ages = [
            "Toby is old",
            "Max is very young",
            "Luna is a puppy",
            "Charlie is years old",
        ]

        for text in invalid_ages:
            assert scraper.extract_age(text) is None

    @pytest.mark.unit
    def test_age_standardization_to_months(self, scraper):
        assert scraper.standardize_age_to_months("5 months") == 5
        assert scraper.standardize_age_to_months("1.5 years") == 18
        assert scraper.standardize_age_to_months("2 years") == 24
        assert scraper.standardize_age_to_months("invalid") is None


class TestREANLocationAndMedical:
    @pytest.mark.unit
    def test_determine_location_romania(self, scraper):
        assert scraper.determine_location("any text", "romania") == "Romania"

    @pytest.mark.unit
    def test_determine_location_uk_cities(self, scraper):
        assert scraper.determine_location("foster in Norfolk", "uk_foster") == "Norfolk"
        assert scraper.determine_location("fostered in Lincolnshire", "uk_foster") == "Lincolnshire"
        assert scraper.determine_location("foster care in Derby", "uk_foster") == "Derby"
        assert scraper.determine_location("no specific location", "uk_foster") == "UK"

    @pytest.mark.unit
    def test_medical_status_extraction(self, scraper):
        test_cases = [
            ("He is vaccinated and chipped", "vaccinated and chipped"),
            ("She is spayed, vaccinated and chipped", "spayed, vaccinated and chipped"),
            ("He is neutered, vaccinated and chipped", "neutered, vaccinated and chipped"),
            ("no medical info", None),
        ]

        for text, expected in test_cases:
            assert scraper.extract_medical_status(text) == expected

    @pytest.mark.unit
    def test_urgency_assessment(self, scraper):
        urgent_keywords = [
            "desperately",
            "urgent",
            "emergency",
            "stuck",
            "ready to travel",
        ]

        for keyword in urgent_keywords:
            assert scraper.assess_urgency(f"Dog {keyword} needs home") == "urgent"

        assert scraper.assess_urgency("Sweet dog looking for family") == "standard"


class TestREANWeightAndSize:
    @pytest.mark.unit
    def test_extract_weight(self, scraper):
        assert scraper.extract_weight("Max is around 16 kg") == 16.0
        assert scraper.extract_weight("Donald is 20kg") == 20.0
        assert scraper.extract_weight("22kg big boy") == 22.0
        assert scraper.extract_weight("no weight mentioned") is None

    @pytest.mark.unit
    def test_predict_size_from_weight(self, scraper):
        assert scraper.predict_size_from_weight(10.0) == "Small"
        assert scraper.predict_size_from_weight(20.0) == "Medium"
        assert scraper.predict_size_from_weight(35.0) == "Large"

    @pytest.mark.unit
    def test_predict_size_from_description(self, scraper):
        assert scraper.predict_size_from_description("medium size boy") == "Medium"
        assert scraper.predict_size_from_description("big soft boy") == "Large"
        assert scraper.predict_size_from_description("little friendly dog") == "Small"


class TestREANEntrySplitting:
    @pytest.fixture
    def sample_romania_text(self):
        return """
        Bobbie is around 5 months old, rescued from the local kill shelter. He is vaccinated and chipped.
        This little boy desperately needs a home.
        (Updated 22/4/25)

        Jerry is 4 months old, found on the streets. Vaccinated and chipped.
        Sweet boy looking for his forever family.
        (Updated 22/4/25)

        Paloma is around 2 years old, rescued from terrible conditions. She is vaccinated and chipped.
        This girl is ready to travel and needs urgent adoption.
        (Updated 20/4/25)
        """

    @pytest.fixture
    def sample_uk_text(self):
        return """
        Toby is 1.5 years old, currently in foster in Norfolk. He is neutered, vaccinated and chipped.
        Toby is a medium size boy who loves walks and playing.
        (Updated 22/4/25)

        Little friendly Max is around 16 kg, fostered in Lincolnshire. Spayed, vaccinated and chipped.
        Max is a gentle soul who gets along with other dogs.
        (Updated 21/4/25)

        Donald is 20kg, in foster care in Derby. Neutered, vaccinated and chipped.
        This big soft boy needs a patient family.
        (Updated 20/4/25)
        """

    def test_split_dog_entries_romania(self, scraper, sample_romania_text):
        entries = scraper.split_dog_entries(sample_romania_text, "romania")

        assert len(entries) == 3
        assert "Bobbie" in entries[0]
        assert "Jerry" in entries[1]
        assert "Paloma" in entries[2]

    def test_split_dog_entries_uk(self, scraper, sample_uk_text):
        entries = scraper.split_dog_entries(sample_uk_text, "uk_foster")

        assert len(entries) == 3
        assert "Toby" in entries[0]
        assert "Max" in entries[1]
        assert "Donald" in entries[2]

    @pytest.mark.unit
    def test_split_dog_entries_empty_input(self, scraper):
        entries = scraper.split_dog_entries("", "romania")
        assert len(entries) == 0

    @pytest.mark.unit
    def test_split_dog_entries_no_timestamps(self, scraper):
        text_without_updates = "Bobbie is 5 months old. Jerry is 4 months old."
        entries = scraper.split_dog_entries(text_without_updates, "romania")
        assert len(entries) <= 1

    @pytest.mark.unit
    def test_split_entries_concurrent_without_timestamps(self, scraper):
        text = "Buddy is 2 years old vaccinated. Max is 3 years old neutered. Luna is 1 year old."
        entries = scraper.split_dog_entries(text, "romania")
        assert isinstance(entries, list)

    @pytest.mark.unit
    def test_split_entries_mixed_valid_invalid(self, scraper):
        page_text = """
        Buddy is 2 years old, vaccinated and chipped.
        (Updated 22/4/25)

        This is not a dog entry.

        Max is 3 years old, looking for home.
        (Updated 21/4/25)

        Random text without dog info.

        Luna is 1 year old puppy.
        (Updated 20/4/25)
        """

        entries = scraper.split_dog_entries(page_text, "romania")

        valid_count = sum(1 for entry in entries if "years old" in entry or "months old" in entry)
        assert valid_count >= 2


class TestREANDogDataExtraction:
    @pytest.mark.unit
    def test_extract_dog_data_romania(self, scraper):
        entry = """
        Bobbie is around 5 months old, rescued from the local kill shelter.
        He is vaccinated and chipped. This little boy desperately needs a home.
        """

        data = scraper.extract_dog_data(entry, "romania")

        assert data["name"] == "Bobbie"
        assert data["age_text"] == "5 months"
        assert data["properties"]["source_page"] == "romania"
        assert data["properties"]["current_location"] == "Romania"
        assert data["properties"]["transport_required"] is True
        assert data["properties"]["medical_status"] == "vaccinated and chipped"
        assert data["properties"]["urgency_level"] == "urgent"

    @pytest.mark.unit
    def test_extract_dog_data_uk(self, scraper):
        entry = """
        Toby is 1.5 years old, currently in foster in Norfolk.
        He is neutered, vaccinated and chipped. Toby is a medium size boy.
        """

        data = scraper.extract_dog_data(entry, "uk_foster")

        assert data["name"] == "Toby"
        assert data["age_text"] == "1.5 years"
        assert data["properties"]["source_page"] == "uk_foster"
        assert data["properties"]["current_location"] == "Norfolk"
        assert data["properties"]["transport_required"] is False
        assert data["properties"]["medical_status"] == "neutered, vaccinated and chipped"
        assert data["properties"]["urgency_level"] == "standard"

    @pytest.mark.unit
    def test_extract_dog_data_romania_with_description_and_timestamp(self, scraper):
        romania_entry = """
        Bobbie is around 5 months old, rescued from the local kill shelter.
        He is vaccinated and chipped. This little boy desperately needs a home.
        (Updated 22/4/25)
        """

        romania_data = scraper.extract_dog_data(romania_entry, "romania")

        assert romania_data["name"] == "Bobbie"
        assert romania_data["age_text"] == "5 months"
        assert romania_data["properties"]["current_location"] == "Romania"
        assert romania_data["properties"]["transport_required"] is True
        assert romania_data["properties"]["medical_status"] == "vaccinated and chipped"
        assert romania_data["properties"]["urgency_level"] == "urgent"
        assert "(Updated 22/4/25)" in romania_data["properties"]["description"]

    @pytest.mark.unit
    def test_extract_dog_data_uk_with_size_prediction(self, scraper):
        uk_entry = """
        Toby is 1.5 years old, currently in foster in Norfolk.
        He is neutered, vaccinated and chipped. Toby is a medium size boy.
        (Updated 21/4/25)
        """

        uk_data = scraper.extract_dog_data(uk_entry, "uk_foster")

        assert uk_data["name"] == "Toby"
        assert uk_data["age_text"] == "1.5 years"
        assert uk_data["properties"]["current_location"] == "Norfolk"
        assert uk_data["properties"]["transport_required"] is False
        assert uk_data["properties"]["medical_status"] == "neutered, vaccinated and chipped"
        assert uk_data["properties"]["size_prediction"] == "Medium"

    @pytest.mark.unit
    def test_extract_dog_data_malformed_entry(self, scraper):
        malformed_entry = "This is not a proper dog entry without name or age"
        data = scraper.extract_dog_data(malformed_entry, "romania")
        assert data is None

    @pytest.mark.unit
    def test_extract_rescue_context(self, scraper):
        stories = [
            ("rescued from the local kill shelter", "rescued from kill shelter"),
            ("found on the streets", "found on streets"),
            ("rescued from terrible conditions", "rescued from terrible conditions"),
            ("currently in foster", "in foster care"),
        ]

        for input_text, expected in stories:
            result = scraper.extract_rescue_context(input_text)
            assert expected in result.lower()


class TestREANDescriptionExtraction:
    @pytest.mark.unit
    def test_description_removes_redundant_prefix(self, scraper):
        text = """
        Lucky - 7 months old
        Lucky is a playful and energetic little pup. He can be transported to the UK
        with all the necessary paperwork. He's currently in foster care and needs
        a loving home. (Updated 22/4/25)
        """

        description = scraper.extract_description_for_about_section(text)

        assert not description.startswith("Lucky - 7 months old")
        assert "(Updated 22/4/25)" in description
        assert "playful and energetic" in description

    @pytest.mark.unit
    def test_description_preserves_long_content(self, scraper):
        long_text = "Lucky is 7 months old. " + ("He loves to play. " * 50) + "(Updated 22/4/25)"

        description = scraper.extract_description_for_about_section(long_text)

        assert len(description) > 300
        assert "(Updated 22/4/25)" in description


class TestREANImageExtraction:
    @pytest.mark.unit
    def test_extract_images_from_html_basic(self, scraper):
        html_content = """
        <div>
            <img src="https://example.com/dog1.jpg" alt="Dog 1" />
            <img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" />
            <img src="https://img1.wsimg.com/image/dog2.jpg" alt="Dog 2" />
        </div>
        """

        images = scraper.extract_images_from_html(html_content)
        assert len(images) == 2
        assert "https://example.com/dog1.jpg" in images
        assert "https://img1.wsimg.com/image/dog2.jpg" in images

    @pytest.mark.unit
    def test_extract_images_wsimg_cdn(self, scraper):
        html_content = """
        <img src="//img1.wsimg.com/isteam/ip/abc123/dog.jpg/:/rs=w:400,h:300" />
        """

        images = scraper.extract_images_from_html(html_content)
        assert len(images) == 1
        expected_url = "https://img1.wsimg.com/isteam/ip/abc123/dog.jpg/:/rs=w:400,h:300"
        assert images[0] == expected_url

    @pytest.mark.unit
    def test_extract_images_with_data_src(self, scraper):
        html_content = """
        <img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
             data-src="https://example.com/lazy-dog.jpg" />
        """

        images = scraper.extract_images_from_html(html_content)
        assert len(images) == 1
        assert images[0] == "https://example.com/lazy-dog.jpg"

    @pytest.mark.unit
    def test_extract_images_background_style(self, scraper):
        html_content = """
        <div style="background-image: url('https://example.com/bg-dog.jpg');">
            <p>Dog content</p>
        </div>
        """

        images = scraper.extract_images_from_html(html_content)
        assert len(images) == 1
        assert images[0] == "https://example.com/bg-dog.jpg"

    @pytest.mark.unit
    def test_extract_images_no_valid_images(self, scraper):
        html_content = """
        <div>
            <img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" />
            <p>No real images here</p>
        </div>
        """

        images = scraper.extract_images_from_html(html_content)
        assert len(images) == 0

    @pytest.mark.unit
    def test_extract_images_from_html_wsimg_only(self, scraper):
        html_content = """
        <div>
            <img src="https://img1.wsimg.com/isteam/ip/abc/dog1.jpg" alt="Dog 1" />
            <img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" />
            <img data-src="https://img1.wsimg.com/isteam/ip/def/dog2.jpg" />
            <div style="background-image: url('https://img1.wsimg.com/isteam/ip/ghi/dog3.jpg');"></div>
        </div>
        """

        images = scraper.extract_images_from_html(html_content)
        assert len(images) == 3
        assert all(urlparse(url).hostname and urlparse(url).hostname.endswith(".wsimg.com") for url in images)

    @pytest.mark.unit
    def test_image_url_validation(self, scraper):
        assert scraper._is_valid_rean_image("https://img1.wsimg.com/isteam/ip/abc/dog.jpg")
        assert scraper._is_valid_rean_image("//img1.wsimg.com/isteam/ip/def/puppy.jpg")

        assert not scraper._is_valid_rean_image("data:image/gif;base64,abc")
        assert not scraper._is_valid_rean_image("https://example.com/dog.jpg")
        assert not scraper._is_valid_rean_image("")
        assert not scraper._is_valid_rean_image(None)

    @pytest.mark.unit
    def test_invalid_image_filtering(self, scraper):
        image_urls = [
            "https://img1.wsimg.com/logo.jpg",
            "https://img1.wsimg.com/icon.png",
            "https://img1.wsimg.com/banner.jpg",
            "https://img1.wsimg.com/dog.jpg",
            "javascript:void(0)",
            "data:image/png;base64,abc",
        ]

        filtered = scraper._filter_non_dog_images(image_urls)

        assert len(filtered) == 1
        assert "dog.jpg" in filtered[0]


class TestREANWsimgUrlCleaning:
    @pytest.mark.unit
    def test_clean_wsimg_url_protocol_relative(self, scraper):
        url = "//img1.wsimg.com/isteam/ip/a820747c-53ff-4d63-a4ae-ca1899d8137c/test.jpg"
        result = scraper._clean_wsimg_url(url)
        expected = "https://img1.wsimg.com/isteam/ip/a820747c-53ff-4d63-a4ae-ca1899d8137c/test.jpg"
        assert result == expected

    @pytest.mark.unit
    def test_clean_wsimg_url_removes_transformations(self, scraper):
        url = "https://img1.wsimg.com/isteam/ip/abc123/dog.jpg/:/rs=w:400,h:300"
        result = scraper._clean_wsimg_url(url)
        expected = "https://img1.wsimg.com/isteam/ip/abc123/dog.jpg"
        assert result == expected

    @pytest.mark.unit
    def test_clean_wsimg_url_protocol_relative_with_transformations(self, scraper):
        url = "//img1.wsimg.com/isteam/ip/abc123/dog.jpg/:/cr=t:12.5%25,l:0%25"
        result = scraper._clean_wsimg_url(url)
        expected = "https://img1.wsimg.com/isteam/ip/abc123/dog.jpg"
        assert result == expected

    @pytest.mark.unit
    def test_clean_wsimg_url_https_unchanged(self, scraper):
        url = "https://img1.wsimg.com/isteam/ip/abc123/dog.jpg"
        result = scraper._clean_wsimg_url(url)
        assert result == url

    @pytest.mark.unit
    def test_clean_wsimg_url_non_wsimg_unchanged(self, scraper):
        url = "https://example.com/image.jpg"
        result = scraper._clean_wsimg_url(url)
        assert result == url

    @pytest.mark.unit
    def test_clean_wsimg_url_with_crop_transformations(self, scraper):
        original = "https://img1.wsimg.com/isteam/ip/abc/dog.jpg/:/cr=t:12.5%25,l:0%25,w:100%25,h:75%25/rs=w:600,h:600,cg:true"
        cleaned = scraper._clean_wsimg_url(original)
        assert cleaned == "https://img1.wsimg.com/isteam/ip/abc/dog.jpg"

    @pytest.mark.unit
    def test_clean_wsimg_url_edge_cases(self, scraper):
        test_cases = [
            (None, None),
            ("", ""),
            ("not-a-wsimg-url.com/image.jpg", "not-a-wsimg-url.com/image.jpg"),
            (
                "https://img1.wsimg.com/image.jpg/::/transform",
                "https://img1.wsimg.com/image.jpg",
            ),
            (
                "https://img1.wsimg.com/image.jpg/://transform",
                "https://img1.wsimg.com/image.jpg",
            ),
        ]

        for input_url, expected in test_cases:
            assert scraper._clean_wsimg_url(input_url) == expected


class TestREANImageAssociation:
    def test_associate_images_basic(self, scraper):
        dog_data_list = [
            {"name": "Toby", "age_text": "1.5 years"},
            {"name": "Max", "age_text": "16 months"},
            {"name": "Donald", "age_text": "2 years"},
        ]

        image_urls = [
            "https://img1.wsimg.com/isteam/ip/abc123/dog1.jpg",
            "https://img1.wsimg.com/isteam/ip/def456/dog2.jpg",
            "https://img1.wsimg.com/isteam/ip/ghi789/dog3.jpg",
        ]

        result = scraper.associate_images_with_dogs(dog_data_list, image_urls)

        assert len(result) == 3
        assert result[0]["name"] == "Toby"
        assert result[0]["primary_image_url"] == image_urls[0]
        assert result[1]["name"] == "Max"
        assert result[1]["primary_image_url"] == image_urls[1]
        assert result[2]["name"] == "Donald"
        assert result[2]["primary_image_url"] == image_urls[2]

    def test_associate_images_fewer_images_than_dogs(self, scraper):
        dog_data_list = [
            {"name": "Toby", "age_text": "1.5 years"},
            {"name": "Max", "age_text": "16 months"},
            {"name": "Donald", "age_text": "2 years"},
        ]

        image_urls = ["https://img1.wsimg.com/isteam/ip/abc123/dog1.jpg"]

        result = scraper.associate_images_with_dogs(dog_data_list, image_urls)

        assert len(result) == 3
        assert result[0]["primary_image_url"] == "https://img1.wsimg.com/isteam/ip/abc123/dog1.jpg"
        assert "primary_image_url" not in result[1]
        assert "primary_image_url" not in result[2]

    def test_associate_images_more_images_than_dogs(self, scraper):
        dog_data_list = [{"name": "Toby", "age_text": "1.5 years"}]

        image_urls = [
            "https://img1.wsimg.com/isteam/ip/abc123/dog1.jpg",
            "https://img1.wsimg.com/isteam/ip/def456/dog2.jpg",
            "https://img1.wsimg.com/isteam/ip/ghi789/dog3.jpg",
        ]

        result = scraper.associate_images_with_dogs(dog_data_list, image_urls)

        assert len(result) == 1
        assert result[0]["primary_image_url"] == "https://img1.wsimg.com/isteam/ip/ghi789/dog3.jpg"

    def test_associate_images_no_images(self, scraper):
        dog_data_list = [
            {"name": "Toby", "age_text": "1.5 years"},
            {"name": "Max", "age_text": "16 months"},
        ]

        result = scraper.associate_images_with_dogs(dog_data_list, [])

        assert len(result) == 2
        assert "primary_image_url" not in result[0]
        assert "primary_image_url" not in result[1]

    @pytest.mark.unit
    def test_associate_images_with_offset_detection(self, scraper):
        dog_data_list = [
            {"name": "Bella", "age_text": "2 years"},
            {"name": "Charlie", "age_text": "6 months"},
            {"name": "Daisy", "age_text": "4 years"},
        ]

        image_urls = [
            "https://img1.wsimg.com/isteam/ip/123/header.jpg",
            "https://img1.wsimg.com/isteam/ip/123/bella.jpg",
            "https://img1.wsimg.com/isteam/ip/123/charlie.jpg",
            "https://img1.wsimg.com/isteam/ip/123/daisy.jpg",
        ]

        result = scraper.associate_images_with_dogs(dog_data_list, image_urls)

        assert result[0]["primary_image_url"] == image_urls[1]
        assert result[1]["primary_image_url"] == image_urls[2]
        assert result[2]["primary_image_url"] == image_urls[3]

    @pytest.mark.unit
    def test_associate_images_edge_cases(self, scraper):
        assert scraper.associate_images_with_dogs([], ["img1.jpg"]) == []

        dogs = [{"name": "Buddy"}]
        result = scraper.associate_images_with_dogs(dogs, [])
        assert len(result) == 1
        assert "primary_image_url" not in result[0]

        assert scraper.associate_images_with_dogs(None, ["img1.jpg"]) == []


class TestREANDataStandardization:
    @pytest.mark.unit
    def test_standardize_animal_data(self, scraper):
        dog_data = {
            "name": "Lucky",
            "age_text": "7 months",
            "properties": {
                "current_location": "Romania",
                "medical_status": "vaccinated and chipped",
                "size_prediction": "Small",
                "description": "Sweet puppy looking for home",
            },
            "primary_image_url": "https://img1.wsimg.com/dog.jpg",
        }

        standardized = scraper.standardize_animal_data(dog_data, "romania")

        assert standardized["name"] == "Lucky"
        assert standardized["animal_type"] == "dog"
        assert standardized["age_min_months"] == 7
        assert standardized["age_max_months"] == 9
        assert standardized["size"] == "Small"
        assert standardized["language"] == "en"
        assert "external_id" in standardized
        assert standardized["primary_image_url"] == dog_data["primary_image_url"]
        assert standardized["original_image_url"] == dog_data["primary_image_url"]


class TestREANEdgeCases:
    @pytest.mark.unit
    def test_malformed_input_handling(self, scraper):
        malformed_inputs = [
            None,
            "",
            "   ",
            "123456789",
            "!@#$%^&*()",
            "Short",
        ]

        for input_text in malformed_inputs:
            result = scraper.extract_dog_data(input_text, "romania")
            assert result is None or result.get("name") is None

    @pytest.mark.unit
    def test_empty_page_handling(self, scraper):
        assert scraper.extract_dog_content_from_html("") == []
        assert scraper.extract_dog_content_from_html("<html></html>") == []

        html = "<html><body><p>Contact us</p></body></html>"
        assert scraper.extract_dog_content_from_html(html) == []

    @pytest.mark.unit
    def test_missing_required_fields(self, scraper):
        no_name = "is 2 years old and looking for a home"
        assert scraper.extract_dog_data(no_name, "romania") is None

        no_age = "Buddy is looking for a forever home"
        result = scraper.extract_dog_data(no_age, "romania")
        if result:
            assert result.get("age_text") is None

    @pytest.mark.unit
    def test_corrupted_properties_handling(self, scraper):
        result = scraper.standardize_animal_data({"name": None}, "test")
        assert isinstance(result, dict)
        assert result.get("name") == "Unknown"

        result = scraper.standardize_animal_data({"name": ""}, "test")
        assert isinstance(result, dict)
        assert result.get("name") is None

        result = scraper.standardize_animal_data({"name": "Valid", "properties": "not-a-dict"}, "test")
        assert isinstance(result, dict)
        assert result.get("name") == "Valid"

        result = scraper.standardize_animal_data({"name": "Valid", "properties": None}, "test")
        assert isinstance(result, dict)
        assert result.get("name") == "Valid"

    @pytest.mark.unit
    def test_extreme_text_lengths(self, scraper):
        long_text = "Buddy is 2 years old. " + ("He loves to play. " * 1000)
        result = scraper.extract_dog_data(long_text, "romania")
        if result:
            assert result["name"] == "Buddy"
            desc = result["properties"]["description"]
            assert len(desc) < 2500

        short_text = "A"
        assert scraper.extract_dog_data(short_text, "romania") is None


class TestREANNetworkOperations:
    @patch("requests.get")
    def test_scrape_page_success(self, mock_get, scraper):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = "Sample page content"
        mock_get.return_value = mock_response

        result = scraper.scrape_page("https://rean.org.uk/test")
        assert result == "Sample page content"

    @pytest.mark.slow
    @pytest.mark.external
    @patch("requests.get")
    def test_scrape_page_failure(self, mock_get, scraper):
        mock_get.side_effect = Exception("Network error")

        result = scraper.scrape_page("https://rean.org.uk/test")
        assert result is None

    @pytest.mark.slow
    @pytest.mark.external
    @patch("requests.get")
    @patch("time.sleep")
    def test_scrape_page_with_retries(self, mock_sleep, mock_get, scraper):
        mock_get.side_effect = [
            requests.exceptions.Timeout("Timeout"),
            MagicMock(status_code=200, text="Success"),
        ]

        result = scraper.scrape_page("https://rean.org.uk/dogs")

        assert result == "Success"
        assert mock_get.call_count == 2

    @pytest.mark.slow
    @pytest.mark.external
    @patch("requests.get")
    @patch("time.sleep")
    def test_network_timeout_handling(self, mock_sleep, mock_get, scraper):
        mock_get.side_effect = requests.exceptions.Timeout("Request timed out")

        result = scraper.scrape_page("https://rean.org.uk/test")

        assert result is None
        assert mock_get.call_count <= scraper.max_retries + 1

    @pytest.mark.slow
    @pytest.mark.external
    @patch("requests.get")
    def test_http_error_codes(self, mock_get, scraper):
        error_codes = [404, 500, 503]

        for code in error_codes:
            mock_response = Mock()
            mock_response.raise_for_status.side_effect = requests.exceptions.HTTPError(f"{code} Error")
            mock_get.return_value = mock_response

            result = scraper.scrape_page("https://rean.org.uk/test")
            assert result is None


class TestREANBrowserExtraction:
    @pytest.mark.slow
    @pytest.mark.browser
    @patch("scrapers.rean.dogs_scraper.get_browser_service")
    def test_extract_images_with_browser_basic(self, mock_browser_service, scraper):
        mock_service = MagicMock()
        mock_browser_service.return_value = mock_service
        mock_driver = MagicMock()
        mock_browser_result = MagicMock()
        mock_browser_result.driver = mock_driver
        mock_service.create_driver.return_value = mock_browser_result

        mock_driver.execute_script.side_effect = lambda script: 1000 if "scrollHeight" in script else None

        mock_img1 = MagicMock()
        mock_img1.get_attribute.return_value = "https://img1.wsimg.com/isteam/ip/abc123/dog1.jpg"

        mock_img2 = MagicMock()
        mock_img2.get_attribute.return_value = "https://img1.wsimg.com/isteam/ip/def456/dog2.jpg"

        mock_placeholder = MagicMock()
        mock_placeholder.get_attribute.return_value = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="

        mock_driver.find_elements.return_value = [mock_img1, mock_img2, mock_placeholder]

        images = scraper.extract_images_with_browser("https://rean.org.uk/test")

        mock_service.create_driver.assert_called_once()
        mock_driver.get.assert_called_once_with("https://rean.org.uk/test")
        mock_driver.quit.assert_called_once()

        assert len(images) == 2
        assert "https://img1.wsimg.com/isteam/ip/abc123/dog1.jpg" in images
        assert "https://img1.wsimg.com/isteam/ip/def456/dog2.jpg" in images

    @pytest.mark.slow
    @pytest.mark.browser
    @patch("scrapers.rean.dogs_scraper.get_browser_service")
    @patch("scrapers.rean.dogs_scraper.time.sleep")
    def test_extract_images_with_browser_waits_for_loading(self, mock_sleep, mock_browser_service, scraper):
        mock_service = MagicMock()
        mock_browser_service.return_value = mock_service
        mock_driver = MagicMock()
        mock_browser_result = MagicMock()
        mock_browser_result.driver = mock_driver
        mock_service.create_driver.return_value = mock_browser_result
        mock_driver.find_elements.return_value = []
        mock_driver.execute_script.side_effect = lambda script: 1000 if "scrollHeight" in script else None

        scraper.extract_images_with_browser("https://rean.org.uk/test")

        assert mock_sleep.call_count >= 1

        mock_driver.execute_script.assert_called()
        scroll_calls = [call for call in mock_driver.execute_script.call_args_list if "scrollTo" in str(call)]
        assert len(scroll_calls) > 0

    @pytest.mark.slow
    @pytest.mark.browser
    @patch("scrapers.rean.dogs_scraper.get_browser_service")
    def test_extract_images_with_browser_filters_wsimg_only(self, mock_browser_service, scraper):
        mock_service = MagicMock()
        mock_browser_service.return_value = mock_service
        mock_driver = MagicMock()
        mock_browser_result = MagicMock()
        mock_browser_result.driver = mock_driver
        mock_service.create_driver.return_value = mock_browser_result
        mock_driver.execute_script.side_effect = lambda script: 1000 if "scrollHeight" in script else None

        mock_images = []

        mock_img1 = MagicMock()
        mock_img1.get_attribute.return_value = "https://img1.wsimg.com/isteam/ip/abc123/dog.jpg"
        mock_images.append(mock_img1)

        mock_img2 = MagicMock()
        mock_img2.get_attribute.return_value = "https://example.com/random.jpg"
        mock_images.append(mock_img2)

        mock_img3 = MagicMock()
        mock_img3.get_attribute.return_value = "data:image/gif;base64,abc123"
        mock_images.append(mock_img3)

        mock_img4 = MagicMock()
        mock_img4.get_attribute.return_value = ""
        mock_images.append(mock_img4)

        mock_driver.find_elements.return_value = mock_images

        images = scraper.extract_images_with_browser("https://rean.org.uk/test")

        assert len(images) == 1
        assert images[0] == "https://img1.wsimg.com/isteam/ip/abc123/dog.jpg"

    @patch("scrapers.rean.dogs_scraper.get_browser_service")
    def test_extract_images_with_browser_handles_errors(self, mock_browser_service, scraper):
        mock_service = MagicMock()
        mock_browser_service.return_value = mock_service
        mock_service.create_driver.side_effect = Exception("WebDriver failed to start")

        images = scraper.extract_images_with_browser("https://rean.org.uk/test")

        assert images == []

    @pytest.mark.slow
    @pytest.mark.browser
    @patch("scrapers.rean.dogs_scraper.get_browser_service")
    def test_extract_images_with_browser_configuration(self, mock_browser_service, scraper):
        mock_service = MagicMock()
        mock_browser_service.return_value = mock_service
        mock_driver = MagicMock()
        mock_browser_result = MagicMock()
        mock_browser_result.driver = mock_driver
        mock_service.create_driver.return_value = mock_browser_result
        mock_driver.find_elements.return_value = []
        mock_driver.execute_script.side_effect = lambda script: 1000 if "scrollHeight" in script else None

        scraper.extract_images_with_browser("https://rean.org.uk/test")

        mock_service.create_driver.assert_called_once()

    @pytest.mark.slow
    @pytest.mark.browser
    @patch("selenium.webdriver.Chrome")
    def test_extract_images_browser_webdriver_failure(self, mock_chrome, scraper):
        mock_chrome.side_effect = WebDriverException("Chrome failed to start")

        result = scraper.extract_images_with_browser("https://rean.org.uk/dogs")

        assert result == []

    @pytest.mark.slow
    @pytest.mark.browser
    @patch("selenium.webdriver.Chrome")
    def test_browser_element_not_found(self, mock_chrome, scraper):
        mock_driver = Mock()
        mock_chrome.return_value = mock_driver

        mock_driver.find_elements.return_value = []
        scraper._find_dog_containers = Mock(return_value=[])

        result = scraper.extract_dogs_with_images_unified("https://rean.org.uk/dogs", "romania")

        assert isinstance(result, list)


class TestREANIntegration:
    @pytest.mark.slow
    @pytest.mark.browser
    @patch("selenium.webdriver.Chrome")
    @patch("time.sleep")
    def test_unified_extraction_with_dom(self, mock_sleep, mock_chrome, scraper):
        mock_driver = Mock()
        mock_chrome.return_value = mock_driver

        mock_container = Mock()
        mock_container.text = """
        Toby - 4 months old - in Romania
        Little friendly Toby is looking sad in the shelter.
        Vaccinated and chipped.
        (Updated 22/4/25)
        """

        mock_img = Mock()
        mock_img.get_attribute.return_value = "https://img1.wsimg.com/isteam/ip/abc/toby.jpg"
        mock_container.find_elements.return_value = [mock_img]

        scraper._find_dog_containers = Mock(return_value=[mock_container])

        result = scraper.extract_dogs_with_images_unified("https://rean.org.uk/dogs", "romania")

        assert len(result) == 1
        assert result[0]["name"] == "Toby"
        assert result[0]["age_text"] == "4 months"
        assert result[0]["primary_image_url"] == "https://img1.wsimg.com/isteam/ip/abc/toby.jpg"

    @pytest.mark.slow
    @pytest.mark.browser
    @patch("selenium.webdriver.Chrome")
    def test_unified_extraction_fallback(self, mock_chrome, scraper):
        mock_chrome.side_effect = WebDriverException("Failed")

        scraper._extract_dogs_legacy_fallback = Mock(return_value=[])

        result = scraper.extract_dogs_with_images_unified("https://rean.org.uk/dogs", "romania")

        assert result == []
        scraper._extract_dogs_legacy_fallback.assert_called_once()

    @pytest.mark.slow
    @pytest.mark.external
    @patch("requests.get")
    @patch("selenium.webdriver.Chrome")
    @patch("time.sleep")
    def test_full_scraping_workflow(self, mock_sleep, mock_chrome, mock_get, scraper):
        page_html = """
        <html><body>
        <div class="dog-entry">
            Buddy is 2 years old, rescued from streets.
            He is vaccinated and chipped.
            (Updated 22/4/25)
        </div>
        </body></html>
        """

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = page_html
        mock_get.return_value = mock_response

        mock_driver = Mock()
        mock_chrome.return_value = mock_driver

        mock_container = Mock()
        mock_container.text = "Buddy is 2 years old, rescued from streets. He is vaccinated and chipped. (Updated 22/4/25)"

        mock_img = Mock()
        mock_img.get_attribute.return_value = "https://img1.wsimg.com/isteam/ip/abc/buddy.jpg"
        mock_container.find_elements.return_value = [mock_img]

        scraper._find_dog_containers = Mock(return_value=[mock_container])

        result = scraper.scrape_animals()

        assert len(result) > 0
        dog = result[0]
        assert dog["name"] == "Buddy"
        assert dog["animal_type"] == "dog"
        assert "external_id" in dog

    @pytest.mark.slow
    @pytest.mark.external
    def test_rate_limiting_between_pages(self, scraper):
        with patch("time.sleep") as mock_sleep, patch("requests.get") as mock_get:
            mock_get.return_value = MagicMock(status_code=200, text="")

            scraper.extract_dogs_with_images_unified = Mock(return_value=[])

            scraper.scrape_animals()

            assert mock_sleep.called
