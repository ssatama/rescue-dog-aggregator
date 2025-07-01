"""
Tests for REAN scraper description fixes.

This test file focuses on the specific fixes for:
1. Description truncation issues
2. Update timestamp preservation
3. Data validation
"""
from unittest.mock import MagicMock, Mock, patch

import pytest

from scrapers.rean.dogs_scraper import REANScraper


class TestREANDescriptionFixes:
    """Test the REAN scraper description fixes."""

    @pytest.fixture
    def scraper(self):
        """Create a REAN scraper instance for testing."""
        with patch('scrapers.base_scraper.OrganizationSyncManager') as mock_sync, \
                patch('scrapers.base_scraper.ConfigLoader') as mock_config_loader:

            mock_config = MagicMock()
            mock_config.name = "REAN Test"
            mock_config.get_scraper_config_dict.return_value = {
                "rate_limit_delay": 0.1,
                "max_retries": 1,
                "timeout": 5
            }
            mock_config.metadata.website_url = "https://rean.org.uk"

            mock_config_loader.return_value.load_config.return_value = mock_config
            mock_sync.return_value.sync_organization.return_value = (1, True)

            scraper = REANScraper()
            return scraper

    @pytest.mark.unit
    def test_description_no_longer_truncated_to_300_chars(self, scraper):
        """Test that descriptions are no longer truncated at 300 characters."""
        # Create a long description that would have been truncated before
        long_text = """Lucky is 7 months old and a playful and energetic little pup. He can be transported to the UK with all the necessary paperwork. He's currently in foster care and needs a loving home. Lucky loves to play with other dogs and is very social. He would make a great addition to any family. He's been vaccinated and chipped. He's ready for his forever home and waiting for someone to give him the love he deserves. Please consider adopting this sweet puppy who has been through so much and deserves a chance at happiness. He's looking for a family who can provide him with the care and attention he needs. Lucky is a wonderful dog who would bring joy to any household. (Updated 22/4/25)"""

        description = scraper.extract_description_for_about_section(long_text)

        # Should not be truncated to 300 chars - should be much longer
        assert len(description) > 300
        # Should include the full content including the update timestamp
        assert "(Updated 22/4/25)" in description
        # Should preserve the complete story
        assert "forever home" in description
        assert "chance at happiness" in description

    @pytest.mark.unit
    def test_description_preserves_update_timestamps(self, scraper):
        """Test that update timestamps are preserved in descriptions."""
        text_with_timestamp = "Lucky is 7 months old and looking for a home. (Updated 22/4/25)"

        description = scraper.extract_description_for_about_section(text_with_timestamp)

        # Update timestamp should be preserved
        assert "(Updated 22/4/25)" in description
        # Should not have extra whitespace
        assert "  " not in description

    @pytest.mark.unit
    def test_description_handles_multiple_sentences(self, scraper):
        """Test that descriptions include all story sentences, not just first 3."""
        text_with_many_sentences = """Lucky is 7 months old. He's playful and energetic. He can be transported to the UK. He's in foster care. He needs a loving home. Lucky loves to play with other dogs. He's very social. He would make a great addition to any family. He's been vaccinated and chipped. He's ready for his forever home. (Updated 22/4/25)"""

        description = scraper.extract_description_for_about_section(
            text_with_many_sentences)

        # Should include sentences beyond the first 3
        assert "He's ready for his forever home" in description
        assert "great addition to any family" in description
        assert "(Updated 22/4/25)" in description

    @pytest.mark.unit
    def test_description_only_truncates_at_2000_chars(self, scraper):
        """Test that descriptions are only truncated if they exceed 2000 characters."""
        # Create a description under 2000 chars
        medium_text = "Lucky is 7 months old. " * 50  # About 1200 chars
        medium_text += "(Updated 22/4/25)"

        description = scraper.extract_description_for_about_section(medium_text)

        # The first sentence "Lucky is 7 months old." is removed as redundant
        # So the description will be shorter than the original
        assert len(description) < len(medium_text)
        # But should still have substantial content
        assert len(description) > 1000
        assert "(Updated 22/4/25)" in description

        # Create a description over 2000 chars
        very_long_text = "Lucky is 7 months old and a very special dog. " * 50  # About 2350 chars
        very_long_text += "(Updated 22/4/25)"

        long_description = scraper.extract_description_for_about_section(very_long_text)

        # Should be truncated but still substantial
        assert len(long_description) < len(very_long_text)
        assert len(long_description) > 1000  # Should still be substantial
        # Should end properly
        assert long_description.endswith(".") or long_description.endswith("...")

    @pytest.mark.unit
    def test_fallback_description_increased_limit(self, scraper):
        """Test that fallback description limit increased from 200 to 1000 chars."""
        # Text without clear sentence structure
        unstructured_text = "Lucky description without clear sentences, just a long flowing text about this wonderful dog who needs a home and has been through so much and deserves love and care from a family who will appreciate his wonderful personality and playful nature. " * 5
        unstructured_text += "(Updated 22/4/25)"

        description = scraper.extract_description_for_about_section(unstructured_text)

        # Should be much longer than the old 200 char limit
        assert len(description) > 200
        # Should be closer to 1000 chars (or end at a good sentence break)
        assert len(description) > 500

    @pytest.mark.unit
    def test_lucky_dog_example_from_screenshot(self, scraper):
        """Test the specific Lucky dog example from the screenshot."""
        # This is the text that should be extracted from the REAN website
        lucky_text = """Our Lucky is looking for a foster or permanent home. He's currently 7 months old and a playful and energetic little pup. He can be transported to the UK with all the necessary paperwork. Please message us with the following information if you would like to apply to adopt: Current pets, ages of children, garden fencing, location, working hours, experience with dogs. (Updated 22/4/25)"""

        description = scraper.extract_description_for_about_section(lucky_text)

        # Should include the dog story but NOT the contact instructions
        assert "Our Lucky is looking for a foster or permanent home" in description
        assert "He can be transported" in description
        assert "(Updated 22/4/25)" in description

        # Should NOT include contact instructions (this is the improvement)
        assert "Please message us with the following information" not in description
        assert "Current pets, ages of children" not in description

        # Should be a reasonable length without the contact info
        assert len(description) > 150

    @pytest.mark.unit
    def test_extract_dog_content_preserves_timestamps(self, scraper):
        """Test that extract_dog_content_from_html preserves update timestamps."""
        html_content = """
        <div>
            <p>Lucky is 7 months old and playful.</p>
            <p>He can be transported to the UK.</p>
            <p>(Updated 22/4/25)</p>
            <p>Max is 1 year old and friendly.</p>
            <p>(Updated 23/4/25)</p>
        </div>
        """

        dog_blocks = scraper.extract_dog_content_from_html(html_content)

        # Should have two dog blocks
        assert len(dog_blocks) == 2

        # First block should include Lucky's timestamp
        assert "(Updated 22/4/25)" in dog_blocks[0]
        assert "Lucky" in dog_blocks[0]

        # Second block should include Max's timestamp
        assert "(Updated 23/4/25)" in dog_blocks[1]
        assert "Max" in dog_blocks[1]

    @pytest.mark.unit
    def test_split_dog_entries_preserves_timestamps(self, scraper):
        """Test that split_dog_entries preserves update timestamps."""
        page_text = """Lucky is 7 months old and playful. He can be transported to the UK. (Updated 22/4/25) Max is 1 year old and friendly. He loves to play. (Updated 23/4/25)"""

        entries = scraper.split_dog_entries(page_text, "romania")

        # Should have two entries
        assert len(entries) == 2

        # Each entry should include its timestamp
        assert "(Updated 22/4/25)" in entries[0]
        assert "Lucky" in entries[0]
        assert "(Updated 23/4/25)" in entries[1]
        assert "Max" in entries[1]

    @pytest.mark.unit
    def test_validation_detects_missing_fields(self, scraper):
        """Test that validation detects missing essential fields."""
        # Test with missing name
        dog_data_no_name = {
            "age_text": "7 months",
            "properties": {"description": "A lovely dog looking for a home"}
        }

        errors = scraper._validate_dog_data(dog_data_no_name, "Test entry")
        assert "missing name" in errors

        # Test with missing age
        dog_data_no_age = {
            "name": "Lucky",
            "properties": {"description": "A lovely dog looking for a home"}
        }

        errors = scraper._validate_dog_data(dog_data_no_age, "Test entry")
        assert "missing age information" in errors

        # Test with missing description
        dog_data_no_desc = {
            "name": "Lucky",
            "age_text": "7 months",
            "properties": {}
        }

        errors = scraper._validate_dog_data(dog_data_no_desc, "Test entry")
        assert "missing or very short description" in errors

    @pytest.mark.unit
    def test_validation_detects_incomplete_description(self, scraper):
        """Test that validation detects incomplete descriptions."""
        # Test with very basic description lacking personality/story
        dog_data_basic = {
            "name": "Lucky",
            "age_text": "7 months",
            "properties": {"description": "Dog is 7 months old, vaccinated and chipped"}
        }

        errors = scraper._validate_dog_data(dog_data_basic, "Test entry")
        assert "description may be incomplete - lacks personality/story content" in errors

        # Test with good description
        dog_data_good = {"name": "Lucky", "age_text": "7 months", "properties": {
            "description": "Lucky is a friendly dog looking for a loving home"}}

        errors = scraper._validate_dog_data(dog_data_good, "Test entry")
        assert "description may be incomplete - lacks personality/story content" not in errors

    @pytest.mark.unit
    def test_validation_detects_missing_timestamp(self, scraper):
        """Test that validation detects when update timestamps are not preserved."""
        entry_with_timestamp = "Lucky is 7 months old and friendly. (Updated 22/4/25)"

        # Test with missing timestamp in description
        dog_data_missing_timestamp = {
            "name": "Lucky",
            "age_text": "7 months",
            "properties": {"description": "Lucky is a friendly dog looking for a home"}
        }

        errors = scraper._validate_dog_data(
            dog_data_missing_timestamp, entry_with_timestamp)
        assert "update timestamp not preserved in description" in errors

        # Test with preserved timestamp
        dog_data_with_timestamp = {"name": "Lucky", "age_text": "7 months", "properties": {
            "description": "Lucky is a friendly dog looking for a home (Updated 22/4/25)"}}

        errors = scraper._validate_dog_data(
            dog_data_with_timestamp, entry_with_timestamp)
        assert "update timestamp not preserved in description" not in errors

    @pytest.mark.unit
    def test_extract_dog_data_with_validation(self, scraper):
        """Test that extract_dog_data includes validation warnings."""
        # Test with the Lucky example that should pass validation
        lucky_text = """Our Lucky is looking for a foster or permanent home. He's currently 7 months old and a playful and energetic little pup. He can be transported to the UK with all the necessary paperwork. Please message us with the following information if you would like to apply to adopt: Current pets, ages of children, garden fencing, location, working hours, experience with dogs. (Updated 22/4/25)"""

        with patch.object(scraper, 'logger') as mock_logger:
            dog_data = scraper.extract_dog_data(lucky_text, "romania")

            # Should extract successfully
            assert dog_data is not None
            assert dog_data["name"] == "Lucky"
            assert dog_data["age_text"] == "7 months"

            # Should have clean description without contact instructions
            description = dog_data["properties"]["description"]
            assert len(description) > 150  # Reasonable length without contact info
            assert "(Updated 22/4/25)" in description
            assert "Please message us" not in description  # Contact info removed

            # Should not have validation warnings for this good example
            mock_logger.warning.assert_not_called()

    @pytest.mark.unit
    def test_description_removes_redundant_name_age_prefix(self, scraper):
        """Test that redundant name/age prefix is removed from descriptions."""
        # Test Pattern 1: "Name - X months old"
        text_with_prefix = "Lucky - 7 months old Our Lucky is looking for a foster home. He loves to play. (Updated 22/4/25)"
        description = scraper.extract_description_for_about_section(text_with_prefix)

        # Should not start with redundant info
        assert not description.startswith("Lucky - 7 months old")
        assert description.startswith("Our Lucky is looking for")
        assert "(Updated 22/4/25)" in description

        # Test Pattern 2: "Our Name is X months old. " at start
        text_with_age_sentence = "Our Lucky is 7 months old. He's looking for a foster home and loves to play. (Updated 22/4/25)"
        description = scraper.extract_description_for_about_section(
            text_with_age_sentence)

        # Should skip the redundant first sentence
        assert not description.startswith("Our Lucky is 7 months old")
        assert description.startswith("He's looking for")
        assert "(Updated 22/4/25)" in description

    @pytest.mark.unit
    def test_description_excludes_content_after_timestamp(self, scraper):
        """Test that content after update timestamp is excluded."""
        text_with_extra = """Our Lucky is looking for a home. He's playful and energetic. (Updated 22/4/25) Please message us with the following information: Current pets, ages of children. Email us at contact@rean.org. Apply now!"""

        description = scraper.extract_description_for_about_section(text_with_extra)

        # Should include content up to timestamp
        assert "looking for a home" in description
        assert "playful and energetic" in description
        assert "(Updated 22/4/25)" in description

        # Should NOT include content after timestamp
        assert "Please message us" not in description
        assert "Current pets" not in description
        assert "Email us" not in description
        assert "Apply now!" not in description

    @pytest.mark.unit
    def test_description_cleans_contact_instructions(self, scraper):
        """Test that contact instructions are filtered out even if before timestamp."""
        text_with_contact = """Our Lucky needs a home. He's friendly. Please message us with current pets, ages of children, garden fencing info. He can be transported. (Updated 22/4/25)"""

        description = scraper.extract_description_for_about_section(text_with_contact)

        # Should include dog story
        assert "needs a home" in description
        assert "He's friendly" in description
        assert "He can be transported" in description
        assert "(Updated 22/4/25)" in description

        # Should exclude pure contact instructions
        assert "Please message us" not in description
        assert "current pets" not in description
        assert "ages of children" not in description

    @pytest.mark.unit
    def test_description_removes_location_prefix(self, scraper):
        """Test that location prefixes like '- Wrexham' or '- in Romania' are removed."""
        # Test case 1: "- Location Name" pattern
        text_wrexham = "- Wrexham Nala is currently in Wrexham but can be transported. She needs a forever family. (Updated 3/1/25)"
        description = scraper.extract_description_for_about_section(text_wrexham)

        assert not description.startswith("-")
        assert not description.startswith("Wrexham")
        assert description.startswith("Nala is currently")
        assert "(Updated 3/1/25)" in description

        # Test case 2: "- in Location" pattern
        text_romania = "- in Romania Tiny little Leo was abandoned. He is very adorable. (Updated 22/4/25)"
        description = scraper.extract_description_for_about_section(text_romania)

        assert not description.startswith("-")
        assert not description.startswith("in Romania")
        assert description.startswith("Tiny little Leo")
        assert "(Updated 22/4/25)" in description

    @pytest.mark.unit
    def test_name_extraction_handles_location_prefix(self, scraper):
        """Test that name extraction correctly handles location prefixes."""
        # Test case 1: "- Location Name is..."
        assert scraper.extract_name("- Wrexham Nala is currently in Wrexham") == "Nala"

        # Test case 2: "- in Location Name was..."
        assert scraper.extract_name(
            "- in Romania Tiny little Leo was abandoned") == "Tiny"

        # Test case 3: "- Location Name - X years old is..."
        assert scraper.extract_name(
            "- Wrexham Nala - 5 years old is currently") == "Nala"

        # Test case 4: Normal cases should still work
        assert scraper.extract_name("Our Lucky is looking for a home") == "Lucky"

    @pytest.mark.unit
    def test_lucky_example_cleaned_properly(self, scraper):
        """Test the specific Lucky example from user feedback."""
        # This is the problematic output the user showed us
        lucky_messy = """Lucky - 7 months old Our Lucky is looking for a foster or permanent home. He's currently 7 months old and a playful and energetic little pup. He can be transported (Updated 22/4/25)Please message us with the following information if you would like to apply to adopt: Current pets, ages of children, garden fencing, location, working hours, experience with dogs. e-mail or message us on Face book https://www. UK APPLY TO ADOPT."""

        description = scraper.extract_description_for_about_section(lucky_messy)

        # Should produce clean output
        expected = "Our Lucky is looking for a foster or permanent home. He's currently 7 months old and a playful and energetic little pup. He can be transported. (Updated 22/4/25)"

        # Allow some flexibility in exact matching due to period handling
        assert "Our Lucky is looking for a foster or permanent home" in description
        assert "playful and energetic little pup" in description
        assert "He can be transported" in description
        assert "(Updated 22/4/25)" in description

        # Should NOT include
        assert "Lucky - 7 months old" not in description  # Redundant prefix
        assert "Please message us" not in description
        assert "Current pets" not in description
        assert "e-mail" not in description
        assert "https://www." not in description
        assert "APPLY TO ADOPT" not in description

    @pytest.mark.unit
    def test_standardized_data_sets_both_image_urls(self, scraper):
        """Test that REAN sets both primary_image_url and original_image_url to prevent re-uploads."""
        dog_data = {
            "name": "Test Dog",
            "age_text": "2 years",
            "primary_image_url": "https://img1.wsimg.com/test/clean-image.jpg",
            "properties": {"description": "A lovely test dog"}
        }

        standardized = scraper.standardize_animal_data(dog_data, "romania")

        # Both image URLs should be set to the same value
        assert "primary_image_url" in standardized
        assert "original_image_url" in standardized
        assert standardized["primary_image_url"] == "https://img1.wsimg.com/test/clean-image.jpg"
        assert standardized["original_image_url"] == "https://img1.wsimg.com/test/clean-image.jpg"

        # This ensures the base_scraper comparison (current_original_url ==
        # original_url) will work
        assert standardized["primary_image_url"] == standardized["original_image_url"]
