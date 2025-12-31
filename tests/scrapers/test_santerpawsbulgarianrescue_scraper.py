"""Tests for Santer Paws Bulgarian Rescue scraper functionality."""

import unittest
from unittest.mock import Mock, patch

import pytest

from scrapers.santerpawsbulgarianrescue.santerpawsbulgarianrescue_scraper import (
    SanterPawsBulgarianRescueScraper,
)


@pytest.mark.unit
@pytest.mark.fast
class TestSanterPawsBulgarianRescueScraper(unittest.TestCase):
    """Test cases for Santer Paws Bulgarian Rescue scraper."""

    def setUp(self):
        """Set up test fixtures."""
        self.scraper = SanterPawsBulgarianRescueScraper(config_id="santerpawsbulgarianrescue")

    def test_scraper_initialization(self):
        """Test that scraper initializes correctly with config."""
        self.assertEqual(self.scraper.base_url, "https://santerpawsbulgarianrescue.com")
        self.assertEqual(self.scraper.listing_url, "https://santerpawsbulgarianrescue.com/adopt/")
        self.assertEqual(self.scraper.organization_name, "Santer Paws Bulgarian Rescue")

    def test_extract_dog_name_from_url(self):
        """Test extracting dog name from adoption URL."""
        test_cases = [
            ("https://santerpawsbulgarianrescue.com/dog/pepper/", "Pepper"),
            ("https://santerpawsbulgarianrescue.com/dog/daisy/", "Daisy"),
            (
                "https://santerpawsbulgarianrescue.com/dog/summer-breeze/",
                "Summer Breeze",
            ),
            ("https://santerpawsbulgarianrescue.com/dog/ruby-red/", "Ruby Red"),
        ]

        for url, expected_name in test_cases:
            with self.subTest(url=url):
                result = self.scraper._extract_dog_name_from_url(url)
                self.assertEqual(result, expected_name)

    def test_extract_external_id_from_url(self):
        """Test external ID extraction from URLs."""
        test_cases = [
            ("https://santerpawsbulgarianrescue.com/dog/pepper/", "spbr-pepper"),
            ("https://santerpawsbulgarianrescue.com/dog/daisy/", "spbr-daisy"),
            (
                "https://santerpawsbulgarianrescue.com/dog/summer-breeze/",
                "spbr-summer-breeze",
            ),
            ("https://santerpawsbulgarianrescue.com/dog/ruby-red/", "spbr-ruby-red"),
        ]

        for url, expected_id in test_cases:
            with self.subTest(url=url):
                result = self.scraper._extract_external_id(url)
                self.assertEqual(result, expected_id)

    @patch("requests.get")
    def test_get_animal_list_pagination_request(self, mock_get):
        """Test that get_animal_list makes paginated GET requests."""
        # Mock response for page 1 with dogs
        mock_response_page1 = Mock()
        mock_response_page1.status_code = 200
        mock_response_page1.text = """
        <html><body>
            <article class="bde-loop-item"><a href="/dog/dog1/">Dog1</a></article>
        </body></html>
        """
        mock_response_page1.raise_for_status = Mock()

        # Mock response for page 2 with no dogs (stop pagination)
        mock_response_page2 = Mock()
        mock_response_page2.status_code = 200
        mock_response_page2.text = "<html><body></body></html>"
        mock_response_page2.raise_for_status = Mock()

        mock_get.side_effect = [mock_response_page1, mock_response_page2]

        self.scraper.get_animal_list()

        # Verify GET requests were made for pages 1 and 2
        self.assertEqual(mock_get.call_count, 2)

        # Check first call (page 1)
        first_call_args = mock_get.call_args_list[0]
        self.assertEqual(first_call_args[0][0], "https://santerpawsbulgarianrescue.com/adopt/")

        # Check second call (page 2)
        second_call_args = mock_get.call_args_list[1]
        self.assertEqual(
            second_call_args[0][0],
            "https://santerpawsbulgarianrescue.com/adopt/page/2/",
        )

    @patch("requests.get")
    def test_get_animal_list_parses_dogs(self, mock_get):
        """Test that get_animal_list correctly parses dog information."""
        # Mock HTML response with sample dog cards for page 1
        mock_html_page1 = """
        <html>
        <body>
            <article class="bde-loop-item ee-post">
                <div class="breakdance">
                    <a class="bde-container-link" href="https://santerpawsbulgarianrescue.com/dog/pepper/">
                        <div>Pepper</div>
                    </a>
                </div>
            </article>
            <article class="bde-loop-item ee-post">
                <div class="breakdance">
                    <a class="bde-container-link" href="https://santerpawsbulgarianrescue.com/dog/daisy/">
                        <div>Daisy</div>
                    </a>
                </div>
            </article>
            <article class="bde-loop-item ee-post">
                <div class="breakdance">
                    <a class="bde-container-link" href="https://santerpawsbulgarianrescue.com/dog/summer-breeze/">
                        <div>Summer Breeze</div>
                    </a>
                </div>
            </article>
        </body>
        </html>
        """

        # Mock empty page 2 to stop pagination
        mock_html_page2 = "<html><body></body></html>"

        mock_response_page1 = Mock()
        mock_response_page1.status_code = 200
        mock_response_page1.text = mock_html_page1
        mock_response_page1.raise_for_status = Mock()

        mock_response_page2 = Mock()
        mock_response_page2.status_code = 200
        mock_response_page2.text = mock_html_page2
        mock_response_page2.raise_for_status = Mock()

        mock_get.side_effect = [mock_response_page1, mock_response_page2]

        animals = self.scraper.get_animal_list()

        # Should return 3 dogs
        self.assertEqual(len(animals), 3)

        # Check first dog
        self.assertEqual(animals[0]["name"], "Pepper")
        self.assertEqual(animals[0]["external_id"], "spbr-pepper")
        self.assertEqual(
            animals[0]["adoption_url"],
            "https://santerpawsbulgarianrescue.com/dog/pepper/",
        )
        self.assertEqual(animals[0]["animal_type"], "dog")
        self.assertEqual(animals[0]["status"], "available")

        # Check second dog
        self.assertEqual(animals[1]["name"], "Daisy")
        self.assertEqual(animals[1]["external_id"], "spbr-daisy")
        self.assertEqual(
            animals[1]["adoption_url"],
            "https://santerpawsbulgarianrescue.com/dog/daisy/",
        )

        # Check third dog with hyphenated name
        self.assertEqual(animals[2]["name"], "Summer Breeze")
        self.assertEqual(animals[2]["external_id"], "spbr-summer-breeze")
        self.assertEqual(
            animals[2]["adoption_url"],
            "https://santerpawsbulgarianrescue.com/dog/summer-breeze/",
        )

    @patch("requests.get")
    def test_get_animal_list_handles_empty_response(self, mock_get):
        """Test that get_animal_list handles empty response gracefully."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = "<html><body></body></html>"
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        animals = self.scraper.get_animal_list()

        # Should return empty list
        self.assertEqual(len(animals), 0)

    @patch("requests.get")
    def test_get_animal_list_handles_network_error(self, mock_get):
        """Test that get_animal_list handles network errors gracefully."""
        mock_get.side_effect = Exception("Network error")

        animals = self.scraper.get_animal_list()

        # Should return empty list on error
        self.assertEqual(len(animals), 0)

    @patch("requests.get")
    def test_all_scraped_dogs_marked_available(self, mock_get):
        """Test that all scraped dogs are marked as available."""
        # Mock page 1 with one dog
        mock_html = """
        <html>
        <body>
            <article class="bde-loop-item ee-post">
                <a href="https://santerpawsbulgarianrescue.com/dog/available-dog/">
                    Available Dog
                </a>
            </article>
        </body>
        </html>
        """
        mock_response_page1 = Mock()
        mock_response_page1.status_code = 200
        mock_response_page1.text = mock_html
        mock_response_page1.raise_for_status = Mock()

        # Mock empty page 2
        mock_response_page2 = Mock()
        mock_response_page2.status_code = 200
        mock_response_page2.text = "<html><body></body></html>"
        mock_response_page2.raise_for_status = Mock()

        mock_get.side_effect = [mock_response_page1, mock_response_page2]

        animals = self.scraper.get_animal_list()

        # All returned dogs should be marked as available
        for animal in animals:
            self.assertEqual(animal["status"], "available")

    def test_config_properties_loaded(self):
        """Test that configuration properties are loaded from config file."""
        # Test that scraper has config properties from BaseScraper
        # Don't check specific values as they can change - just verify they exist
        assert hasattr(self.scraper, "rate_limit_delay")
        assert hasattr(self.scraper, "batch_size")
        assert hasattr(self.scraper, "skip_existing_animals")
        assert hasattr(self.scraper, "max_retries")
        assert hasattr(self.scraper, "timeout")

        # Verify the properties have valid types
        assert isinstance(self.scraper.rate_limit_delay, (int, float))
        assert isinstance(self.scraper.batch_size, int)
        assert isinstance(self.scraper.skip_existing_animals, bool)
        assert isinstance(self.scraper.max_retries, int)
        assert isinstance(self.scraper.timeout, (int, float))

    @patch("time.sleep")
    def test_rate_limiting_uses_config_delay(self, mock_sleep):
        """Test that rate limiting uses config-defined delay, not hardcoded value."""
        # Mock the animal list to have one animal
        with (
            patch.object(self.scraper, "get_animal_list") as mock_get_list,
            patch.object(self.scraper, "_scrape_animal_details") as mock_scrape_details,
        ):
            mock_get_list.return_value = [
                {
                    "name": "Test Dog",
                    "external_id": "test-dog",
                    "adoption_url": "https://santerpawsbulgarianrescue.com/dog/test-dog/",
                    "animal_type": "dog",
                    "status": "available",
                }
            ]

            mock_scrape_details.return_value = {"breed": "Mixed Breed"}

            self.scraper.collect_data()

            # Should use config rate_limit_delay (2.5) not hardcoded (3)
            mock_sleep.assert_called_with(2.5)

    def test_get_filtered_animals_basic(self):
        """Test that _get_filtered_animals method returns same animals as get_animal_list when skip_existing_animals=False."""
        with patch.object(self.scraper, "get_animal_list") as mock_get_list:
            mock_animals = [
                {
                    "name": "Test Dog 1",
                    "external_id": "test-dog-1",
                    "adoption_url": "https://santerpawsbulgarianrescue.com/dog/test-dog-1/",
                    "animal_type": "dog",
                    "status": "available",
                },
                {
                    "name": "Test Dog 2",
                    "external_id": "test-dog-2",
                    "adoption_url": "https://santerpawsbulgarianrescue.com/dog/test-dog-2/",
                    "animal_type": "dog",
                    "status": "available",
                },
            ]
            mock_get_list.return_value = mock_animals

            # With skip_existing_animals=False (default), should return all animals
            result = self.scraper._get_filtered_animals()

            self.assertEqual(len(result), 2)
            self.assertEqual(result, mock_animals)

    def test_url_filtering_with_skip_existing(self):
        """Test URL filtering integration when skip_existing_animals=True."""
        # Create scraper instance with skip_existing_animals=True
        with patch("utils.config_loader.ConfigLoader.load_config") as mock_load_config:
            # Mock config to have skip_existing_animals=True
            mock_config = Mock()
            mock_config.get_scraper_config_dict.return_value = {
                "rate_limit_delay": 2.5,
                "batch_size": 6,
                "skip_existing_animals": True,
                "max_retries": 3,
                "timeout": 240,
            }
            mock_config.name = "Santer Paws Bulgarian Rescue"
            mock_load_config.return_value = mock_config

            scraper = SanterPawsBulgarianRescueScraper(config_id="santerpawsbulgarianrescue")

            with patch.object(scraper, "get_animal_list") as mock_get_list:
                mock_animals = [
                    {
                        "name": "Existing Dog",
                        "adoption_url": "https://santerpawsbulgarianrescue.com/dog/existing/",
                        "external_id": "existing",
                    },
                    {
                        "name": "New Dog",
                        "adoption_url": "https://santerpawsbulgarianrescue.com/dog/new/",
                        "external_id": "new",
                    },
                ]
                mock_get_list.return_value = mock_animals

                # Mock filtering_service to return only "new" URL
                scraper.filtering_service.filter_existing_urls = Mock(return_value=["https://santerpawsbulgarianrescue.com/dog/new/"])

                result = scraper._get_filtered_animals()

                # Should only return the new dog
                self.assertEqual(len(result), 1)
                self.assertEqual(result[0]["name"], "New Dog")

                # Verify filtering_service was called with correct URLs
                expected_urls = [
                    "https://santerpawsbulgarianrescue.com/dog/existing/",
                    "https://santerpawsbulgarianrescue.com/dog/new/",
                ]
                scraper.filtering_service.filter_existing_urls.assert_called_once_with(expected_urls)

    def test_filtering_stats_tracked(self):
        """Test that filtering statistics are properly tracked and logged."""
        # Create scraper instance with skip_existing_animals=True
        with patch("utils.config_loader.ConfigLoader.load_config") as mock_load_config:
            mock_config = Mock()
            mock_config.get_scraper_config_dict.return_value = {
                "rate_limit_delay": 2.5,
                "batch_size": 6,
                "skip_existing_animals": True,
                "max_retries": 3,
                "timeout": 240,
            }
            mock_config.name = "Santer Paws Bulgarian Rescue"
            mock_load_config.return_value = mock_config

            scraper = SanterPawsBulgarianRescueScraper(config_id="santerpawsbulgarianrescue")

            with patch.object(scraper, "get_animal_list") as mock_get_list:
                # Mock 3 animals total
                mock_animals = [
                    {"adoption_url": "https://site.com/1/", "name": "Dog1"},
                    {"adoption_url": "https://site.com/2/", "name": "Dog2"},
                    {"adoption_url": "https://site.com/3/", "name": "Dog3"},
                ]
                mock_get_list.return_value = mock_animals

                # Mock filtering_service to return only 1 URL (2 filtered out)
                scraper.filtering_service.filter_existing_urls = Mock(return_value=["https://site.com/3/"])

                result = scraper._get_filtered_animals()

                # Verify filtering stats are tracked via filtering_service
                self.assertEqual(scraper.filtering_service.total_animals_before_filter, 3)
                self.assertEqual(scraper.filtering_service.total_animals_skipped, 2)

    def test_collect_data_deduplicates_by_url(self):
        """Test that collect_data removes duplicate dogs by URL."""
        with patch.object(self.scraper, "get_animal_list") as mock_get_list:
            # Return list with duplicates
            mock_get_list.return_value = [
                {
                    "name": "Pepper",
                    "external_id": "spbr-pepper",
                    "adoption_url": "https://santerpawsbulgarianrescue.com/dog/pepper/",
                    "animal_type": "dog",
                    "status": "available",
                },
                {
                    "name": "Daisy",
                    "external_id": "daisy",
                    "adoption_url": "https://santerpawsbulgarianrescue.com/dog/daisy/",
                    "animal_type": "dog",
                    "status": "available",
                },
                {
                    "name": "Pepper",  # Duplicate
                    "external_id": "spbr-pepper",
                    "adoption_url": "https://santerpawsbulgarianrescue.com/dog/pepper/",
                    "animal_type": "dog",
                    "status": "available",
                },
            ]

            result = self.scraper.collect_data()

            # Should deduplicate to 2 unique dogs
            self.assertEqual(len(result), 2)
            urls = [dog["adoption_url"] for dog in result]
            self.assertEqual(len(urls), len(set(urls)))  # All URLs should be unique

    def test_process_animals_parallel_single_threaded_fallback(self):
        """Test that _process_animals_parallel uses single-threaded processing for small batches."""
        # Test with batch_size=6, animals=3 (should use single-threaded)
        with patch.object(self.scraper, "_scrape_animal_details") as mock_scrape_details:
            mock_animals = [
                {
                    "name": "Dog1",
                    "adoption_url": "https://santerpawsbulgarianrescue.com/dog/dog1/",
                    "external_id": "dog1",
                },
                {
                    "name": "Dog2",
                    "adoption_url": "https://santerpawsbulgarianrescue.com/dog/dog2/",
                    "external_id": "dog2",
                },
            ]

            mock_scrape_details.return_value = {
                "breed": "Mixed Breed",
                "size": "Medium",
            }

            result = self.scraper._process_animals_parallel(mock_animals)

            # Should process all animals
            self.assertEqual(len(result), 2)
            self.assertEqual(result[0]["name"], "Dog1")
            self.assertEqual(result[1]["name"], "Dog2")

            # Should call _scrape_animal_details for each animal
            self.assertEqual(mock_scrape_details.call_count, 2)

    def test_process_animals_parallel_batch_processing(self):
        """Test that _process_animals_parallel correctly splits into batches for parallel processing."""
        # Create scraper with batch_size=2 to force parallel processing
        with patch("utils.config_loader.ConfigLoader.load_config") as mock_load_config:
            mock_config = Mock()
            mock_config.get_scraper_config_dict.return_value = {
                "rate_limit_delay": 0.1,  # Short delay for testing
                "batch_size": 2,  # Force parallel processing
                "skip_existing_animals": False,
                "max_retries": 3,
                "timeout": 240,
            }
            mock_config.name = "Santer Paws Bulgarian Rescue"
            mock_load_config.return_value = mock_config

            scraper = SanterPawsBulgarianRescueScraper(config_id="santerpawsbulgarianrescue")

            with patch.object(scraper, "_scrape_animal_details") as mock_scrape_details:
                # Create 5 animals to trigger parallel processing (more than batch_size=2)
                mock_animals = [
                    {
                        "name": f"Dog{i}",
                        "adoption_url": f"https://site.com/dog{i}/",
                        "external_id": f"dog{i}",
                    }
                    for i in range(1, 6)
                ]

                mock_scrape_details.return_value = {
                    "breed": "Mixed Breed",
                    "size": "Medium",
                }

                result = scraper._process_animals_parallel(mock_animals)

                # Should process all 5 animals
                self.assertEqual(len(result), 5)

                # Should call _scrape_animal_details for each animal
                self.assertEqual(mock_scrape_details.call_count, 5)

    def test_process_animals_parallel_respects_rate_limiting(self):
        """Test that parallel processing respects rate limiting configuration."""

        # Test with rate_limit_delay from config (2.5 seconds)
        with patch("time.sleep") as mock_sleep:
            with patch.object(self.scraper, "_scrape_animal_details") as mock_scrape_details:
                mock_animals = [
                    {
                        "name": "Dog1",
                        "adoption_url": "https://site.com/dog1/",
                        "external_id": "dog1",
                    }
                ]

                mock_scrape_details.return_value = {"breed": "Mixed Breed"}

                result = self.scraper._process_animals_parallel(mock_animals)

                # Should have called sleep with rate_limit_delay (2.5 from config)
                mock_sleep.assert_called_with(2.5)
                self.assertEqual(len(result), 1)

    def test_process_animals_parallel_handles_errors(self):
        """Test that parallel processing handles errors gracefully and continues processing."""
        with patch.object(self.scraper, "_scrape_animal_details") as mock_scrape_details:
            mock_animals = [
                {
                    "name": "GoodDog",
                    "adoption_url": "https://site.com/good/",
                    "external_id": "good",
                },
                {
                    "name": "BadDog",
                    "adoption_url": "https://site.com/bad/",
                    "external_id": "bad",
                },
            ]

            # Make second call raise exception
            mock_scrape_details.side_effect = [
                {"breed": "Mixed Breed"},
                Exception("Network error"),
            ]  # First call succeeds  # Second call fails

            result = self.scraper._process_animals_parallel(mock_animals)

            # Should still return both animals (error doesn't stop processing)
            self.assertEqual(len(result), 2)
            self.assertEqual(result[0]["name"], "GoodDog")
            self.assertEqual(result[1]["name"], "BadDog")

    def test_collect_data_integration_with_parallel_processing(self):
        """Test full collect_data integration with parallel processing and filtering."""
        # Create scraper with batch_size=2 to trigger parallel processing
        with patch("utils.config_loader.ConfigLoader.load_config") as mock_load_config:
            mock_config = Mock()
            mock_config.get_scraper_config_dict.return_value = {
                "rate_limit_delay": 0.1,  # Short delay for testing
                "batch_size": 2,  # Force parallel processing
                "skip_existing_animals": True,
                "max_retries": 3,
                "timeout": 240,
            }
            mock_config.name = "Santer Paws Bulgarian Rescue"
            mock_load_config.return_value = mock_config

            scraper = SanterPawsBulgarianRescueScraper(config_id="santerpawsbulgarianrescue")

            with (
                patch.object(scraper, "get_animal_list") as mock_get_list,
                patch.object(scraper, "_scrape_animal_details") as mock_scrape_details,
            ):
                # Mock 4 animals from listing
                mock_animals = [
                    {
                        "name": f"Dog{i}",
                        "adoption_url": f"https://site.com/dog{i}/",
                        "external_id": f"dog{i}",
                    }
                    for i in range(1, 5)
                ]  # 4 animals total
                mock_get_list.return_value = mock_animals

                # Mock filtering_service to filter out 2 animals (2 remain)
                scraper.filtering_service.filter_existing_urls = Mock(
                    return_value=[
                        "https://site.com/dog3/",
                        "https://site.com/dog4/",
                    ]
                )

                # Mock detail scraping
                mock_scrape_details.return_value = {
                    "breed": "Mixed Breed",
                    "size": "Medium",
                }

                result = scraper.collect_data()

                # Should return only the 2 non-existing animals
                self.assertEqual(len(result), 2)

                # Should have called filtering_service
                scraper.filtering_service.filter_existing_urls.assert_called_once()

                # Should have called detail scraping for remaining animals
                self.assertEqual(mock_scrape_details.call_count, 2)

    def test_collect_data_integration_single_threaded_with_skip_disabled(self):
        """Test collect_data integration with skip_existing_animals=False and single-threaded processing."""
        # Use default scraper (batch_size=6, skip_existing_animals=False)
        with (
            patch.object(self.scraper, "get_animal_list") as mock_get_list,
            patch.object(self.scraper, "_scrape_animal_details") as mock_scrape_details,
        ):
            # Mock 3 animals (less than batch_size=6, so single-threaded)
            mock_animals = [
                {
                    "name": f"Dog{i}",
                    "adoption_url": f"https://site.com/dog{i}/",
                    "external_id": f"dog{i}",
                }
                for i in range(1, 4)
            ]
            mock_get_list.return_value = mock_animals
            mock_scrape_details.return_value = {
                "breed": "Mixed Breed",
                "size": "Medium",
            }

            result = self.scraper.collect_data()

            # Should process all animals (no filtering)
            self.assertEqual(len(result), 3)

            # Should call detail scraping for each animal
            self.assertEqual(mock_scrape_details.call_count, 3)

    def test_collect_data_handles_empty_animal_list(self):
        """Test that collect_data handles empty animal list gracefully."""
        with patch.object(self.scraper, "get_animal_list") as mock_get_list:
            mock_get_list.return_value = []

            result = self.scraper.collect_data()

            # Should return empty list
            self.assertEqual(len(result), 0)

    def test_collect_data_error_handling(self):
        """Test that collect_data handles exceptions gracefully."""
        with patch.object(self.scraper, "_get_filtered_animals") as mock_get_filtered:
            mock_get_filtered.side_effect = Exception("Network error")

            result = self.scraper.collect_data()

            # Should return empty list on error
            self.assertEqual(len(result), 0)
