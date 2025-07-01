"""
Visual verification tests for REAN scraper image association.

This test suite provides comprehensive validation of image-to-dog association
accuracy using realistic scenarios and data patterns found on REAN's website.
"""
from unittest.mock import Mock

from scrapers.rean.dogs_scraper import REANScraper


class TestREANVisualVerification:
    """Comprehensive visual verification tests for image association."""

    def test_realistic_header_offset_scenario(self):
        """Test realistic scenario with header image causing offset."""
        scraper = REANScraper()
        scraper.logger = Mock()

        # Realistic scenario: 3 dogs, 4 images with header
        dog_data_list = [
            {"name": "Bella", "age_text": "2 years"},
            {"name": "Charlie", "age_text": "6 months"},
            {"name": "Daisy", "age_text": "4 years"}
        ]

        # Real-world pattern: header image followed by dog images
        image_urls = [
            # Header (filtered)
            "https://img1.wsimg.com/isteam/ip/123/header-banner.jpg",
            "https://img1.wsimg.com/isteam/ip/123/bella-photo.jpg",    # Bella
            "https://img1.wsimg.com/isteam/ip/123/charlie-puppy.jpg",  # Charlie
            "https://img1.wsimg.com/isteam/ip/123/daisy-rescue.jpg"    # Daisy
        ]

        result = scraper.associate_images_with_dogs(dog_data_list, image_urls)

        assert len(result) == 3
        # Verify correct association after header filtering/offset
        assert result[0]["name"] == "Bella"
        # bella-photo.jpg
        assert result[0]["primary_image_url"] == image_urls[1]
        assert result[1]["name"] == "Charlie"
        # charlie-puppy.jpg
        assert result[1]["primary_image_url"] == image_urls[2]
        assert result[2]["name"] == "Daisy"
        # daisy-rescue.jpg
        assert result[2]["primary_image_url"] == image_urls[3]

    def test_multiple_header_footer_images(self):
        """Test scenario with multiple header and footer images."""
        scraper = REANScraper()
        scraper.logger = Mock()

        # 2 dogs with header + footer images
        dog_data_list = [
            {"name": "Max", "age_text": "3 years"},
            {"name": "Luna", "age_text": "1 year"}
        ]

        # Pattern: header, navigation, dog images, footer, social
        image_urls = [
            # Header (filtered)
            "https://img1.wsimg.com/isteam/ip/456/logo-header.jpg",
            # Navigation (filtered)
            "https://img1.wsimg.com/isteam/ip/456/nav-menu.jpg",
            "https://img1.wsimg.com/isteam/ip/456/max-german-shepherd.jpg",  # Max
            "https://img1.wsimg.com/isteam/ip/456/luna-golden-retriever.jpg",  # Luna
            # Footer (filtered)
            "https://img1.wsimg.com/isteam/ip/456/footer-contact.jpg",
            # Social (filtered)
            "https://img1.wsimg.com/isteam/ip/456/social-media.jpg"
        ]

        result = scraper.associate_images_with_dogs(dog_data_list, image_urls)

        assert len(result) == 2
        # Should correctly identify and skip non-dog images
        assert result[0]["name"] == "Max"
        # max-german-shepherd.jpg
        assert result[0]["primary_image_url"] == image_urls[2]
        assert result[1]["name"] == "Luna"
        # luna-golden-retriever.jpg
        assert result[1]["primary_image_url"] == image_urls[3]

    def test_insufficient_images_graceful_handling(self):
        """Test graceful handling when there are fewer images than dogs."""
        scraper = REANScraper()
        scraper.logger = Mock()

        # 4 dogs but only 2 real dog images after filtering
        dog_data_list = [
            {"name": "Rocky", "age_text": "5 years"},
            {"name": "Buddy", "age_text": "2 years"},
            {"name": "Molly", "age_text": "7 months"},
            {"name": "Cooper", "age_text": "3 years"}
        ]

        image_urls = [
            # Header (filtered)
            "https://img1.wsimg.com/isteam/ip/789/header-image.jpg",
            "https://img1.wsimg.com/isteam/ip/789/rocky-photo.jpg",   # Rocky
            "https://img1.wsimg.com/isteam/ip/789/buddy-rescue.jpg",  # Buddy
            # Footer (filtered)
            "https://img1.wsimg.com/isteam/ip/789/footer-logo.jpg"
        ]

        result = scraper.associate_images_with_dogs(dog_data_list, image_urls)

        assert len(result) == 4
        # First two dogs should get images, last two should not
        assert result[0]["name"] == "Rocky"
        # rocky-photo.jpg
        assert result[0]["primary_image_url"] == image_urls[1]
        assert result[1]["name"] == "Buddy"
        # buddy-rescue.jpg
        assert result[1]["primary_image_url"] == image_urls[2]
        assert result[2]["name"] == "Molly"
        assert "primary_image_url" not in result[2]  # No image
        assert result[3]["name"] == "Cooper"
        assert "primary_image_url" not in result[3]  # No image

    def test_perfect_alignment_no_offset_needed(self):
        """Test scenario where images perfectly align with dogs (no offset needed)."""
        scraper = REANScraper()
        scraper.logger = Mock()

        # Perfect 1:1 scenario
        dog_data_list = [
            {"name": "Oscar", "age_text": "4 years"},
            {"name": "Ruby", "age_text": "2 years"}
        ]

        # Clean dog images with no header/footer interference
        image_urls = [
            "https://img1.wsimg.com/isteam/ip/999/oscar-labrador.jpg",  # Oscar
            "https://img1.wsimg.com/isteam/ip/999/ruby-beagle.jpg"      # Ruby
        ]

        result = scraper.associate_images_with_dogs(dog_data_list, image_urls)

        assert len(result) == 2
        # Should work perfectly with no offset
        assert result[0]["name"] == "Oscar"
        # oscar-labrador.jpg
        assert result[0]["primary_image_url"] == image_urls[0]
        assert result[1]["name"] == "Ruby"
        # ruby-beagle.jpg
        assert result[1]["primary_image_url"] == image_urls[1]

    def test_enhanced_filtering_effectiveness(self):
        """Test that enhanced filtering correctly identifies and removes non-dog images."""
        scraper = REANScraper()
        scraper.logger = Mock()

        # Mix of dog and non-dog images
        mixed_image_urls = [
            "https://img1.wsimg.com/isteam/ip/abc/logo-rean.jpg",
            # Logo (should filter)
            # Navigation (should filter)
            "https://img1.wsimg.com/isteam/ip/abc/nav-button.jpg",
            # Dog (should keep)
            "https://img1.wsimg.com/isteam/ip/abc/dog-charlie.jpg",
            # Icon (should filter)
            "https://img1.wsimg.com/isteam/ip/abc/social-icon.jpg",
            # Dog (should keep)
            "https://img1.wsimg.com/isteam/ip/abc/rescue-max.jpg",
            # Footer (should filter)
            "https://img1.wsimg.com/isteam/ip/abc/footer-contact.jpg",
            # Dog (should keep)
            "https://img1.wsimg.com/isteam/ip/abc/puppy-luna.jpg"
        ]

        # Test the filtering method directly
        filtered_images = scraper._filter_non_dog_images(mixed_image_urls)

        # Should keep only the 3 dog images
        expected_dog_images = [
            "https://img1.wsimg.com/isteam/ip/abc/dog-charlie.jpg",
            "https://img1.wsimg.com/isteam/ip/abc/rescue-max.jpg",
            "https://img1.wsimg.com/isteam/ip/abc/puppy-luna.jpg"
        ]

        assert len(filtered_images) == 3
        assert filtered_images == expected_dog_images

    def test_offset_detection_patterns(self):
        """Test offset detection for various image/dog count patterns."""
        scraper = REANScraper()
        scraper.logger = Mock()

        # Test case 1: Exactly one extra image (common header pattern)
        filtered_images_1 = ["img1.jpg", "img2.jpg", "img3.jpg"]  # 3 images
        num_dogs_1 = 2  # 2 dogs
        offset_1 = scraper._detect_image_offset(filtered_images_1, num_dogs_1)
        assert offset_1 == 1  # Should detect single header offset

        # Test case 2: Multiple extra images
        filtered_images_2 = [
            "img1.jpg",
            "img2.jpg",
            "img3.jpg",
            "img4.jpg",
            "img5.jpg"]  # 5 images
        num_dogs_2 = 2  # 2 dogs (ratio > 1.5)
        offset_2 = scraper._detect_image_offset(filtered_images_2, num_dogs_2)
        assert offset_2 == 2  # Should detect multiple header offset

        # Test case 3: Perfect match
        filtered_images_3 = ["img1.jpg", "img2.jpg"]  # 2 images
        num_dogs_3 = 2  # 2 dogs
        offset_3 = scraper._detect_image_offset(filtered_images_3, num_dogs_3)
        assert offset_3 == 0  # No offset needed

        # Test case 4: Fewer images than dogs
        filtered_images_4 = ["img1.jpg"]  # 1 image
        num_dogs_4 = 3  # 3 dogs
        offset_4 = scraper._detect_image_offset(filtered_images_4, num_dogs_4)
        assert offset_4 == 0  # No offset for insufficient images

    def test_end_to_end_realistic_scenario(self):
        """End-to-end test with realistic REAN website data pattern."""
        scraper = REANScraper()
        scraper.logger = Mock()

        # Realistic scenario from actual REAN scraping
        dog_data_list = [
            {
                "name": "Patches",
                "age_text": "3 years",
                "properties": {
                    "source_page": "romania",
                    "current_location": "Romania"
                }
            },
            {
                "name": "Storm",
                "age_text": "8 months",
                "properties": {
                    "source_page": "uk_foster",
                    "current_location": "UK"
                }
            },
            {
                "name": "Honey",
                "age_text": "5 years",
                "properties": {
                    "source_page": "romania",
                    "current_location": "Romania"
                }
            }
        ]

        # Realistic image URL pattern from REAN website
        image_urls = [
            "https://img1.wsimg.com/isteam/ip/rean123/header-logo-main.jpg",     # Header
            "https://img1.wsimg.com/isteam/ip/rean123/nav-donate-button.jpg",   # Navigation
            "https://img1.wsimg.com/isteam/ip/rean123/patches-shepherd-mix.jpg",  # Patches
            "https://img1.wsimg.com/isteam/ip/rean123/storm-rescue-puppy.jpg",   # Storm
            "https://img1.wsimg.com/isteam/ip/rean123/honey-golden-mix.jpg",     # Honey
            "https://img1.wsimg.com/isteam/ip/rean123/footer-social-media.jpg"   # Footer
        ]

        result = scraper.associate_images_with_dogs(dog_data_list, image_urls)

        # Verify end-to-end processing
        assert len(result) == 3

        # Check that all dogs retain their original data
        for i, dog in enumerate(result):
            assert dog["name"] == dog_data_list[i]["name"]
            assert dog["age_text"] == dog_data_list[i]["age_text"]
            assert dog["properties"] == dog_data_list[i]["properties"]

        # Check that image association worked correctly
        assert result[0]["name"] == "Patches"
        # patches-shepherd-mix.jpg
        assert result[0]["primary_image_url"] == image_urls[2]
        assert result[1]["name"] == "Storm"
        # storm-rescue-puppy.jpg
        assert result[1]["primary_image_url"] == image_urls[3]
        assert result[2]["name"] == "Honey"
        # honey-golden-mix.jpg
        assert result[2]["primary_image_url"] == image_urls[4]
