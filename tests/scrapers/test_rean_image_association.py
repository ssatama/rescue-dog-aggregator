"""
Tests for REAN scraper image-to-dog association logic.

This test file addresses the issue where images are being associated with the wrong dogs
(off by one or more positions).
"""

from unittest.mock import Mock

from scrapers.rean.dogs_scraper import REANScraper


class TestREANImageAssociation:
    """Test suite for REAN image association logic."""

    def test_perfect_image_dog_alignment(self):
        """Test image association when there's perfect 1:1 alignment."""
        scraper = REANScraper()
        scraper.logger = Mock()

        # Perfect scenario: 3 dogs, 3 images
        dog_data_list = [{"name": "Buddy", "age_text": "2 years"}, {"name": "Max", "age_text": "3 years"}, {"name": "Luna", "age_text": "1 year"}]

        image_urls = ["https://img1.wsimg.com/isteam/ip/abc/buddy.jpg", "https://img1.wsimg.com/isteam/ip/abc/max.jpg", "https://img1.wsimg.com/isteam/ip/abc/luna.jpg"]

        result = scraper.associate_images_with_dogs(dog_data_list, image_urls)

        assert len(result) == 3
        assert result[0]["name"] == "Buddy"
        assert result[0]["primary_image_url"] == image_urls[0]
        assert result[1]["name"] == "Max"
        assert result[1]["primary_image_url"] == image_urls[1]
        assert result[2]["name"] == "Luna"
        assert result[2]["primary_image_url"] == image_urls[2]

    def test_more_images_than_dogs_improved(self):
        """Test improved handling when there are more images than dogs."""
        scraper = REANScraper()
        scraper.logger = Mock()

        # 2 dogs but 4 images (includes header/navigation images)
        dog_data_list = [{"name": "Buddy", "age_text": "2 years"}, {"name": "Max", "age_text": "3 years"}]

        # Realistic scenario: header image should be filtered out or
        # offset-corrected
        image_urls = [
            # Header image (should be filtered)
            "https://img1.wsimg.com/isteam/ip/abc/header-logo.jpg",
            "https://img1.wsimg.com/isteam/ip/abc/buddy.jpg",  # Buddy's image
            "https://img1.wsimg.com/isteam/ip/abc/max.jpg",  # Max's image
            "https://img1.wsimg.com/isteam/ip/abc/footer.jpg",  # Footer image
        ]

        # With improved implementation:
        result = scraper.associate_images_with_dogs(dog_data_list, image_urls)

        assert len(result) == 2
        # Improved implementation should associate correctly:
        # - Header image filtered out or offset applied
        # - Buddy gets buddy.jpg, Max gets max.jpg
        # Buddy gets buddy.jpg
        assert result[0]["primary_image_url"] == image_urls[1]
        # Max gets max.jpg
        assert result[1]["primary_image_url"] == image_urls[2]

    def test_more_dogs_than_images(self):
        """Test when there are more dogs than images."""
        scraper = REANScraper()
        scraper.logger = Mock()

        # 3 dogs but only 2 images
        dog_data_list = [{"name": "Buddy", "age_text": "2 years"}, {"name": "Max", "age_text": "3 years"}, {"name": "Luna", "age_text": "1 year"}]

        image_urls = ["https://img1.wsimg.com/isteam/ip/abc/buddy.jpg", "https://img1.wsimg.com/isteam/ip/abc/max.jpg"]

        result = scraper.associate_images_with_dogs(dog_data_list, image_urls)

        assert len(result) == 3
        assert result[0]["primary_image_url"] == image_urls[0]
        assert result[1]["primary_image_url"] == image_urls[1]
        assert "primary_image_url" not in result[2]  # Luna has no image

    def test_empty_lists(self):
        """Test edge case with empty lists."""
        scraper = REANScraper()
        scraper.logger = Mock()

        # Test empty dog list
        result = scraper.associate_images_with_dogs([], ["img1.jpg", "img2.jpg"])
        assert result == []

        # Test empty image list
        dog_data_list = [{"name": "Buddy", "age_text": "2 years"}]
        result = scraper.associate_images_with_dogs(dog_data_list, [])
        assert len(result) == 1
        assert "primary_image_url" not in result[0]

    def test_improved_association_with_content_matching(self):
        """Test improved association logic that matches images to content correctly."""
        scraper = REANScraper()
        scraper.logger = Mock()

        # Scenario: Dogs extracted in order, but images include header image
        # first
        dog_data_list = [{"name": "Buddy", "age_text": "2 years"}, {"name": "Max", "age_text": "3 years"}]

        image_urls = [
            "https://img1.wsimg.com/isteam/ip/abc/header-logo.jpg",  # Should be filtered out
            "https://img1.wsimg.com/isteam/ip/abc/dog1.jpg",  # Should go to Buddy
            "https://img1.wsimg.com/isteam/ip/abc/dog2.jpg",  # Should go to Max
        ]

        # Test the improved implementation
        result = scraper.associate_images_with_dogs(dog_data_list, image_urls)

        assert len(result) == 2
        # With improved filtering and offset detection:
        # - Header image should be filtered out by enhanced filtering
        # - Remaining images should be correctly associated
        # Buddy gets dog1.jpg
        assert result[0]["primary_image_url"] == image_urls[1]
        # Max gets dog2.jpg
        assert result[1]["primary_image_url"] == image_urls[2]

    def test_image_filtering_effectiveness(self):
        """Test that image filtering removes non-dog images effectively."""
        scraper = REANScraper()

        # Test URLs that should be filtered out
        should_be_filtered = [
            "https://img1.wsimg.com/isteam/ip/abc/logo.jpg",
            "https://img1.wsimg.com/isteam/ip/abc/header-icon.jpg",
            "https://img1.wsimg.com/isteam/ip/abc/footer-background.jpg",
            "https://img1.wsimg.com/isteam/ip/abc/banner-image.jpg",
            "data:image/svg+xml;base64,abc123",  # Placeholder
            "https://other-cdn.com/image.jpg",  # Wrong CDN
        ]

        for url in should_be_filtered:
            assert not scraper._is_valid_rean_image(url), f"Should filter out: {url}"

        # Test URLs that should pass
        should_pass = ["https://img1.wsimg.com/isteam/ip/abc/dog-photo.jpg", "https://img1.wsimg.com/isteam/ip/abc/puppy.jpg", "https://img1.wsimg.com/isteam/ip/abc/rescue-dog.jpg"]

        for url in should_pass:
            assert scraper._is_valid_rean_image(url), f"Should pass: {url}"

    def test_wsimg_url_cleaning(self):
        """Test that wsimg URLs are cleaned properly for Cloudinary."""
        scraper = REANScraper()

        # Test URL with transformations that need cleaning
        dirty_url = "https://img1.wsimg.com/isteam/ip/abc/dog.jpg/:/cr=t:12.5%25,l:0%25,w:100%25,h:75%25/rs=w:600,h:600,cg:true"
        clean_url = scraper._clean_wsimg_url(dirty_url)

        expected = "https://img1.wsimg.com/isteam/ip/abc/dog.jpg"
        assert clean_url == expected

        # Test URL without transformations
        simple_url = "https://img1.wsimg.com/isteam/ip/abc/dog.jpg"
        assert scraper._clean_wsimg_url(simple_url) == simple_url

        # Test double colon format
        double_colon = "https://img1.wsimg.com/isteam/ip/abc/dog.jpg/::transformations"
        clean_double = scraper._clean_wsimg_url(double_colon)
        assert clean_double == "https://img1.wsimg.com/isteam/ip/abc/dog.jpg"
