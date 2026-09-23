import unittest
from unittest.mock import Mock, patch

import pytest

from scrapers.santerpawsbulgarianrescue.santerpawsbulgarianrescue_scraper import (
    SanterPawsBulgarianRescueScraper,
)


@pytest.mark.unit
class TestSanterPawsBulgarianRescueScraper(unittest.TestCase):
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

                scraper.filtering_service.get_existing_external_ids = Mock(return_value={"existing"})

                result = scraper._get_filtered_animals()

                # Should only return the new dog
                self.assertEqual(len(result), 1)
                self.assertEqual(result[0]["name"], "New Dog")

                scraper.filtering_service.get_existing_external_ids.assert_called_once_with()

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
                    {"adoption_url": "https://site.com/1/", "external_id": "dog1", "name": "Dog1"},
                    {"adoption_url": "https://site.com/2/", "external_id": "dog2", "name": "Dog2"},
                    {"adoption_url": "https://site.com/3/", "external_id": "dog3", "name": "Dog3"},
                ]
                mock_get_list.return_value = mock_animals

                scraper.filtering_service.get_existing_external_ids = Mock(return_value={"dog1", "dog2"})

                _result = scraper._get_filtered_animals()

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

                scraper.filtering_service.get_existing_external_ids = Mock(return_value={"dog1", "dog2"})

                # Mock detail scraping
                mock_scrape_details.return_value = {
                    "breed": "Mixed Breed",
                    "size": "Medium",
                }

                result = scraper.collect_data()

                # Should return only the 2 non-existing animals
                self.assertEqual(len(result), 2)

                scraper.filtering_service.get_existing_external_ids.assert_called_once()

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

    @patch("requests.get")
    def test_scrape_animal_details_extracts_hero_image(self, mock_get):
        """Test that hero image is correctly extracted from carousel."""
        mock_html = """
        <html>
        <body>
            <div>
                <figure>
                    <img src="https://santerpawsbulgarianrescue.com/wp-content/uploads/2024/anastasia-1.jpg" alt="Anastasia">
                </figure>
                <figure>
                    <img src="https://santerpawsbulgarianrescue.com/wp-content/uploads/2024/anastasia-2.jpg" alt="Anastasia 2">
                </figure>
            </div>
        </body>
        </html>
        """

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = mock_html
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        result = self.scraper._scrape_animal_details("https://santerpawsbulgarianrescue.com/dog/anastasia/")

        self.assertIn("primary_image_url", result)
        self.assertEqual(
            result["primary_image_url"],
            "https://santerpawsbulgarianrescue.com/wp-content/uploads/2024/anastasia-1.jpg",
        )

    @patch("requests.get")
    def test_scrape_animal_details_handles_network_error(self, mock_get):
        """Test that detail scraping network errors are handled gracefully."""
        mock_get.side_effect = Exception("Network error")

        result = self.scraper._scrape_animal_details("https://santerpawsbulgarianrescue.com/dog/test/")

        self.assertEqual(result, {})

    @patch("requests.get")
    def test_scrape_animal_details_handles_completely_missing_sections(self, mock_get):
        """Test handling when both About and Information sections are missing."""
        mock_html = """
        <html>
        <body>
            <h1>Dog Page</h1>
            <div>
                <p>Some random content that is not About or Information.</p>
            </div>
        </body>
        </html>
        """

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = mock_html
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        result = self.scraper._scrape_animal_details("https://santerpawsbulgarianrescue.com/dog/test/")

        # Pinned exactly. The previous form accepted every listed value and
        # then fell back to `else: assertEqual(result, {})`, so any outcome
        # whatsoever passed.
        self.assertIsNone(result.get("description"))
        self.assertEqual(result.get("breed"), "Unknown")
        self.assertEqual(result.get("standardized_size"), "Medium")
        self.assertIsNone(result.get("age"))
        self.assertIsNone(result.get("sex"))

    def test_scrape_animal_details_integrates_with_collect_data(self):
        """Test that detail scraping integrates correctly with collect_data."""
        mock_animal_data = {
            "name": "Test Dog",
            "external_id": "test-dog",
            "adoption_url": "https://santerpawsbulgarianrescue.com/dog/test-dog/",
            "animal_type": "dog",
            "status": "available",
        }

        with (
            patch.object(self.scraper, "get_animal_list") as mock_get_list,
            patch.object(self.scraper, "_scrape_animal_details") as mock_scrape_details,
        ):
            mock_get_list.return_value = [mock_animal_data]
            mock_scrape_details.return_value = {
                "description": "Detailed description from page",
                "age_text": "01/01/2023",
                "sex": "Male",
                "primary_image_url": "https://example.com/image.jpg",
            }

            result = self.scraper.collect_data()

            mock_scrape_details.assert_called_once_with("https://santerpawsbulgarianrescue.com/dog/test-dog/")

            self.assertEqual(len(result), 1)
            dog_data = result[0]

            self.assertEqual(dog_data["name"], "Test Dog")
            self.assertEqual(dog_data["description"], "Detailed description from page")
            self.assertEqual(dog_data["age_text"], "01/01/2023")
            self.assertEqual(dog_data["sex"], "Male")
            self.assertEqual(dog_data["primary_image_url"], "https://example.com/image.jpg")

    def test_clean_dog_name_handles_various_formats(self):
        self.assertEqual(self.scraper._clean_dog_name("pepper"), "Pepper")
        self.assertEqual(self.scraper._clean_dog_name("SUMMER"), "Summer")
        self.assertEqual(self.scraper._clean_dog_name("mixed case"), "Mixed Case")
        self.assertEqual(self.scraper._clean_dog_name("king ii"), "King II")
        self.assertEqual(self.scraper._clean_dog_name("duke iii"), "Duke III")
        self.assertEqual(self.scraper._clean_dog_name("prince iv"), "Prince IV")

    def test_extract_dog_name_from_url_detailed(self):
        self.assertEqual(
            self.scraper._extract_dog_name_from_url("https://santerpawsbulgarianrescue.com/dog/mary-jane-watson/"),
            "Mary Jane Watson",
        )

    @patch("requests.get")
    def test_image_urls_empty_array_when_no_image(self, mock_get):
        mock_html = """
        <html>
        <body>
            <h2>About</h2>
            <div><p>Dog with no image.</p></div>
        </body>
        </html>
        """
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = mock_html
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        result = self.scraper._scrape_animal_details("https://santerpawsbulgarianrescue.com/dog/test/")

        self.assertIn("image_urls", result)
        self.assertEqual(result["image_urls"], [])
        self.assertIsNone(result["primary_image_url"])

    @patch("requests.get")
    def test_image_urls_populated_when_images_exist(self, mock_get):
        mock_html = """
        <html>
        <body>
            <figure>
                <img src="https://santerpawsbulgarianrescue.com/wp-content/uploads/2024/test-dog.jpg" alt="Test Dog">
            </figure>
        </body>
        </html>
        """
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = mock_html
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        result = self.scraper._scrape_animal_details("https://santerpawsbulgarianrescue.com/dog/test/")

        self.assertIn("image_urls", result)
        self.assertEqual(len(result["image_urls"]), 1)
        self.assertEqual(
            result["image_urls"][0],
            "https://santerpawsbulgarianrescue.com/wp-content/uploads/2024/test-dog.jpg",
        )
        self.assertEqual(
            result["primary_image_url"],
            "https://santerpawsbulgarianrescue.com/wp-content/uploads/2024/test-dog.jpg",
        )


def _dog_page(fields: dict[str, str], paragraphs: list[str], story_html: str | None = None) -> str:
    """The detail-page layout Santer Paws has served since its early-2026 redesign.

    The dog's own column holds the <h1>, the story and a grid of label/value
    pairs; the "Meet more of our dogs" cards below repeat the same field shape
    for other dogs and must not leak into this dog's properties.
    """
    story = story_html if story_html is not None else "".join(f"<p>{text}</p>" for text in paragraphs)
    grid = "".join(f'<div class="bde-div"><div class="bde-text">{label}</div><div class="bde-text">{value}</div></div>' for label, value in fields.items())
    return f"""
    <html><body>
      <section class="bde-section"><div class="section-container"><div class="bde-columns">
        <div class="bde-column">
          <h1 class="bde-heading">Kevin</h1>
          <div class="bde-text">{story}</div>
          <div class="bde-grid">{grid}</div>
        </div>
        <div class="bde-column"><figure><img src="https://santerpawsbulgarianrescue.com/wp-content/uploads/kevin.webp"></figure></div>
      </div></div></section>
      <h2>Could Kevin be part of your family?</h2>
      <p>Adopting a rescue dog is a big decision.</p>
      <h2>Meet more of our dogs</h2>
      <div class="bde-column"><div class="bde-grid">
        <div class="bde-div"><div class="bde-text">Sex</div><div class="bde-text">Female</div></div>
        <div class="bde-div"><div class="bde-text">Breed</div><div class="bde-text">Mix</div></div>
      </div></div>
    </body></html>
    """


KEVIN_FIELDS = {
    "D.O.B": "04/04/2022",
    "Sex": "Male",
    "Breed": "English Setter",
    "Size": "Large",
    "Location": "Bulgaria",
    "Status": "Available",
}


@pytest.mark.unit
class TestSanterPawsDetailPageLayout:
    """Every Santer Paws dog added since the redesign was stored with empty
    properties - no breed, sex, age or description - because the scraper looked
    for "Information" and "About" <h2> headings the new pages no longer have.
    The LLM then profiled 79 dogs from no source text at all.
    """

    @pytest.fixture
    def scraper(self):
        return SanterPawsBulgarianRescueScraper(config_id="santerpawsbulgarianrescue")

    @pytest.fixture
    def serve(self):
        with patch("requests.get") as get:

            def _serve(html: str) -> None:
                get.return_value = Mock(status_code=200, text=html, raise_for_status=Mock())

            yield _serve

    def test_reads_every_field_from_the_dog_grid(self, scraper, serve):
        serve(_dog_page(KEVIN_FIELDS, ["Kevin is a gentle English Setter."]))

        result = scraper._scrape_animal_details("https://santerpawsbulgarianrescue.com/dog/kevin/")

        assert result["properties"]["breed"] == "English Setter"
        assert result["sex"] == "Male"
        assert result["standardized_size"] == "Large"
        assert result["properties"]["age_text"] == "04/04/2022"
        assert result["properties"]["age_category"] == "Adult", result["properties"]

    def test_joins_the_story_paragraphs_with_readable_spacing(self, scraper, serve):
        serve(_dog_page(KEVIN_FIELDS, ["Kevin is a stunning young <strong>English Setter</strong>, purebred.", "He is wonderful with other dogs and cats."]))

        result = scraper._scrape_animal_details("https://santerpawsbulgarianrescue.com/dog/kevin/")

        expected = "Kevin is a stunning young English Setter, purebred. He is wonderful with other dogs and cats."
        assert result["description"] == expected
        assert result["properties"]["description"] == expected

    def test_ignores_the_other_dogs_cards_and_adoption_blurb(self, scraper, serve):
        serve(_dog_page({"Sex": "Male", "Breed": "English Setter"}, ["Kevin's own story."]))

        result = scraper._scrape_animal_details("https://santerpawsbulgarianrescue.com/dog/kevin/")

        assert result["sex"] == "Male"
        assert result["properties"]["breed"] == "English Setter"
        assert "Adopting a rescue dog" not in result["description"]

    def test_reserved_status_is_detected(self, scraper, serve):
        serve(_dog_page({**KEVIN_FIELDS, "Status": "Reserved"}, ["Kevin."]))

        result = scraper._scrape_animal_details("https://santerpawsbulgarianrescue.com/dog/kevin/")

        assert result["status"] == "reserved"

    def test_a_blank_breed_falls_back_to_mixed_breed(self, scraper, serve):
        serve(_dog_page({**KEVIN_FIELDS, "Breed": ""}, ["Kevin."]))

        result = scraper._scrape_animal_details("https://santerpawsbulgarianrescue.com/dog/kevin/")

        assert result["breed"] == "Mixed Breed"

    def test_page_without_a_story_leaves_description_absent(self, scraper, serve):
        serve(_dog_page(KEVIN_FIELDS, []))

        result = scraper._scrape_animal_details("https://santerpawsbulgarianrescue.com/dog/kevin/")

        assert not result.get("description")
        assert result["properties"]["breed"] == "English Setter"

    def test_reads_a_story_pasted_in_div_blocks(self, scraper, serve):
        """harvey, jerry, obie, pellet and summer-breeze: Facebook-pasted stories in <div>s beside empty <p>s."""
        serve(_dog_page(KEVIN_FIELDS, [], story_html="<p></p><div>Harvey came to us from a village shelter.</div><div>He loves every dog he meets.</div>"))

        result = scraper._scrape_animal_details("https://santerpawsbulgarianrescue.com/dog/harvey/")

        assert result["description"] == "Harvey came to us from a village shelter. He loves every dog he meets."

    def test_keeps_list_items_as_separate_sentences(self, scraper, serve):
        """via and bamboo keep their home requirements in <ul><li>."""
        serve(_dog_page(KEVIN_FIELDS, [], story_html="<p>Bamboo needs:</p><ul><li>Older children only</li><li>A secure garden</li></ul>"))

        result = scraper._scrape_animal_details("https://santerpawsbulgarianrescue.com/dog/bamboo/")

        assert result["description"] == "Bamboo needs: Older children only A secure garden"

    def test_a_blank_date_of_birth_leaves_age_absent(self, scraper, serve):
        """#349 removed the "Unknown" age placeholder; 11 live dogs have a blank D.O.B. cell."""
        serve(_dog_page({**KEVIN_FIELDS, "D.O.B": ""}, ["Nanny."]))

        result = scraper._scrape_animal_details("https://santerpawsbulgarianrescue.com/dog/nanny/")

        assert "age_text" not in result["properties"]
        assert result.get("age") is None

    def test_story_without_a_field_grid_leaves_sex_and_age_absent(self, scraper, serve):
        serve(_dog_page({}, ["Only a story, no fields yet."]))

        result = scraper._scrape_animal_details("https://santerpawsbulgarianrescue.com/dog/kevin/")

        assert result["description"] == "Only a story, no fields yet."
        assert result.get("sex") is None
        assert result.get("age") is None

    def test_sex_uses_the_key_the_database_column_is_written_from(self, scraper, serve):
        """DatabaseService writes animals.sex from animal_data["sex"]. The scraper
        set "gender", which nothing maps, so every Santer Paws dog had a NULL sex."""
        serve(_dog_page({**KEVIN_FIELDS, "Sex": "Female"}, ["Kevin."]))

        result = scraper._scrape_animal_details("https://santerpawsbulgarianrescue.com/dog/kevin/")

        assert result["sex"] == "Female"
        assert "gender" not in result

    def test_keeps_a_title_that_sits_beside_the_story_blocks(self, scraper, serve):
        """marley, hiltz and skilo open with an <h2>/<strong> title next to the <p>s, which only innermost blocks missed."""
        story = "<div><p> </p><h2>🐾 <strong>Meet Marley</strong> 🐾</h2><p>Born <strong>9th March 2025</strong>, little Marley came into rescue.</p></div>"
        serve(_dog_page(KEVIN_FIELDS, [], story_html=story))

        result = scraper._scrape_animal_details("https://santerpawsbulgarianrescue.com/adoption/marley/")

        assert result["description"] == "🐾 Meet Marley 🐾 Born 9th March 2025, little Marley came into rescue."

    def test_keeps_a_bare_strong_title_outside_any_block(self, scraper, serve):
        serve(_dog_page(KEVIN_FIELDS, [], story_html="<strong>Hiltz, our collie boy</strong><p>Hiltz walks beautifully on the lead.</p>"))

        result = scraper._scrape_animal_details("https://santerpawsbulgarianrescue.com/dog/hiltz/")

        assert result["description"] == "Hiltz, our collie boy Hiltz walks beautifully on the lead."

    def test_a_blank_sex_leaves_sex_absent(self, scraper, serve):
        """Same placeholder class #349 removed for age: "Unknown" would read as scraped."""
        serve(_dog_page({**KEVIN_FIELDS, "Sex": ""}, ["Kevin."]))

        result = scraper._scrape_animal_details("https://santerpawsbulgarianrescue.com/dog/kevin/")

        assert "sex" not in result["properties"]
        assert result.get("sex") is None

    def test_comments_and_styles_beside_the_story_stay_out(self, scraper, serve):
        story = "<!-- wp:paragraph --><style>.x{color:red}</style><h2>Meet Marley</h2><p>Marley loves people.</p><script>track()</script>"
        serve(_dog_page(KEVIN_FIELDS, [], story_html=story))

        result = scraper._scrape_animal_details("https://santerpawsbulgarianrescue.com/adoption/marley/")

        assert result["description"] == "Meet Marley Marley loves people."
