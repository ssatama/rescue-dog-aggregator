"""Tests for Galgos del Sol scraper functionality."""

import unittest
from unittest.mock import Mock, patch

import pytest

from scrapers.galgosdelsol.galgosdelsol_scraper import GalgosDelSolScraper


@pytest.mark.unit
@pytest.mark.fast
class TestGalgosDelSolScraper(unittest.TestCase):
    """Test cases for Galgos del Sol scraper."""

    def setUp(self):
        """Set up test fixtures."""
        self.scraper = GalgosDelSolScraper(config_id="galgosdelsol")

    def test_scraper_initialization(self):
        """Test that scraper initializes correctly with config."""
        self.assertEqual(self.scraper.base_url, "https://galgosdelsol.org")
        self.assertEqual(len(self.scraper.listing_urls), 4)
        expected_urls = [
            "https://galgosdelsol.org/adoptables/galgos/",
            "https://galgosdelsol.org/adoptables/podencos/",
            "https://galgosdelsol.org/adoptables/pups-teens/",
            "https://galgosdelsol.org/adoptables/other-dogs/",
        ]
        self.assertEqual(self.scraper.listing_urls, expected_urls)
        self.assertEqual(self.scraper.organization_name, "Galgos del Sol")

    def test_is_available_dog_logic(self):
        """Test the available dog filtering logic."""
        # Available dogs should return True
        self.assertTrue(self.scraper._is_available_dog("ANDRES"))
        self.assertTrue(self.scraper._is_available_dog("BONITA"))

        # Reserved dogs should return False
        self.assertFalse(self.scraper._is_available_dog("ReservedAFRICA"))
        self.assertFalse(self.scraper._is_available_dog("reservedCAMPEON"))
        self.assertFalse(self.scraper._is_available_dog("RESERVEDDOG"))

        # Edge cases
        self.assertTrue(self.scraper._is_available_dog(""))
        self.assertTrue(self.scraper._is_available_dog(None))

    def test_extract_external_id_from_url(self):
        """Test external ID extraction from URLs."""
        test_cases = [
            ("https://galgosdelsol.org/adoptable-dogs/andres-2/", "andres-2"),
            ("https://galgosdelsol.org/adoptable-dogs/bonita-2", "bonita-2"),
            ("https://example.com/path/to/resource/", "resource"),
            ("https://example.com/single", "single"),
        ]

        for url, expected_id in test_cases:
            with self.subTest(url=url):
                result = self.scraper._extract_external_id(url)
                self.assertEqual(result, expected_id)

    def test_clean_dog_name(self):
        """Test dog name cleaning functionality."""
        test_cases = [
            ("ANDRES", "Andres"),
            ("bonita", "Bonita"),
            ("APOLLO / FINLAND", "Apollo"),
            ("CAMPEON / CANADA", "Campeon"),
            ("  SPACED NAME  ", "Spaced Name"),
            ("", ""),
        ]

        for input_name, expected_name in test_cases:
            with self.subTest(input_name=input_name):
                result = self.scraper._clean_dog_name(input_name)
                self.assertEqual(result, expected_name)

    def test_clean_breed(self):
        """Test breed cleaning functionality."""
        # Valid breeds should be preserved
        self.assertEqual(self.scraper._clean_breed("Galgo"), "Galgo")
        self.assertEqual(self.scraper._clean_breed("Podenco"), "Podenco")

        # Age categories should become Mixed Breed
        self.assertEqual(self.scraper._clean_breed("puppy"), "Mixed Breed")
        self.assertEqual(self.scraper._clean_breed("senior"), "Mixed Breed")

        # Generic categories should become Mixed Breed
        self.assertEqual(self.scraper._clean_breed("other"), "Mixed Breed")
        self.assertEqual(self.scraper._clean_breed("mixed"), "Mixed Breed")

        # Empty/None should become Mixed Breed
        self.assertEqual(self.scraper._clean_breed(""), "Mixed Breed")
        self.assertEqual(self.scraper._clean_breed(None), "Mixed Breed")

    def test_scrape_listing_page_basic(self):
        """Test basic listing page scraping functionality."""
        mock_html = """
        <html>
        <body>
            <main>
                <div>
                    <a href="https://galgosdelsol.org/adoptable-dogs/andres-2/">ANDRES</a>
                    <a href="https://galgosdelsol.org/adoptable-dogs/bonita-2/">BONITA</a>
                </div>
            </main>
        </body>
        </html>
        """

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.content = mock_html

        # Mock the session directly on the scraper instance
        self.scraper.session = Mock()
        self.scraper.session.get.return_value = mock_response

        animals = self.scraper._scrape_listing_page("https://galgosdelsol.org/adoptables/galgos/")

        # Should extract 2 dogs
        self.assertEqual(len(animals), 2)

        # Check first dog data
        first_dog = animals[0]
        self.assertEqual(first_dog["name"], "Andres")
        self.assertEqual(first_dog["external_id"], "andres-2")
        self.assertEqual(first_dog["adoption_url"], "https://galgosdelsol.org/adoptable-dogs/andres-2/")
        self.assertEqual(first_dog["animal_type"], "dog")
        self.assertEqual(first_dog["status"], "available")

    def test_scrape_listing_page_filters_reserved(self):
        """Test that listing page scraping filters out reserved dogs."""
        mock_html = """
        <html>
        <body>
            <main>
                <div>
                    <a href="https://galgosdelsol.org/adoptable-dogs/andres-2/">ANDRES</a>
                    <a href="https://galgosdelsol.org/adoptable-dogs/africa/">ReservedAFRICA</a>
                    <a href="https://galgosdelsol.org/adoptable-dogs/bonita-2/">BONITA</a>
                </div>
            </main>
        </body>
        </html>
        """

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.content = mock_html

        # Mock the session directly on the scraper instance
        self.scraper.session = Mock()
        self.scraper.session.get.return_value = mock_response

        animals = self.scraper._scrape_listing_page("https://galgosdelsol.org/adoptables/galgos/")

        # Should only return available dogs (not Reserved ones)
        self.assertEqual(len(animals), 2)

        animal_names = [animal["name"] for animal in animals]
        self.assertIn("Andres", animal_names)
        self.assertIn("Bonita", animal_names)
        self.assertNotIn("Africa", animal_names)

    def test_calculate_age_from_birth_date(self):
        """Test age calculation from various birth date formats."""
        from datetime import datetime

        current_year = datetime.now().year

        # Test valid formats
        self.assertEqual(self.scraper._calculate_age_from_birth_date("2020"), f"{current_year - 2020} years")

        # Test invalid/empty
        self.assertIsNone(self.scraper._calculate_age_from_birth_date(""))
        self.assertIsNone(self.scraper._calculate_age_from_birth_date(None))
        self.assertIsNone(self.scraper._calculate_age_from_birth_date("invalid"))


@pytest.mark.integration
@pytest.mark.slow
class TestGalgosDelSolScraperIntegration(unittest.TestCase):
    """Integration tests for Galgos del Sol scraper."""

    def setUp(self):
        """Set up test fixtures."""
        self.scraper = GalgosDelSolScraper(config_id="galgosdelsol")

    @patch("scrapers.galgosdelsol.galgosdelsol_scraper.time.sleep")  # Speed up tests
    def test_collect_data_integration(self, mock_sleep):
        """Test the main collect_data method integration."""
        # Mock responses for all 4 listing pages
        mock_html = """
        <html>
        <body>
            <main>
                <div>
                    <a href="https://galgosdelsol.org/adoptable-dogs/test-dog/">TEST DOG</a>
                </div>
            </main>
        </body>
        </html>
        """

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.content = mock_html

        # Mock the session directly on the scraper instance
        self.scraper.session = Mock()
        self.scraper.session.get.return_value = mock_response

        # Call collect_data
        data = self.scraper.collect_data()

        # Should have called all 4 listing URLs (plus detail page calls)
        self.assertGreaterEqual(self.scraper.session.get.call_count, 4)

        # Should return data for the test dog (4 times, once per page)
        # But duplicates should be filtered out
        self.assertEqual(len(data), 1)  # Only one unique dog

        dog = data[0]
        self.assertEqual(dog["name"], "Test Dog")
        # Note: organization_id is now handled automatically by BaseScraper template method


@pytest.mark.unit
@pytest.mark.fast
class TestGalgosDelSolScraperConfigCompliance(unittest.TestCase):
    """Test cases for config compliance functionality."""

    def setUp(self):
        """Set up test fixtures."""
        self.scraper = GalgosDelSolScraper(config_id="galgosdelsol")

    def test_skip_existing_animals_enabled_from_config(self):
        """Test that skip_existing_animals is enabled from config."""
        # The galgosdelsol.yaml config has skip_existing_animals: true
        self.assertTrue(self.scraper.skip_existing_animals)

    def test_batch_size_from_config(self):
        """Test that batch_size is loaded from config."""
        # The galgosdelsol.yaml config has batch_size: 6
        self.assertEqual(self.scraper.batch_size, 6)

    @patch.object(GalgosDelSolScraper, "_filter_existing_urls")
    def test_skip_existing_animals_enabled_calls_filter(self, mock_filter):
        """Test that when skip_existing_animals=true, _filter_existing_urls is called."""
        # Setup mock to return filtered URLs
        test_urls = ["https://galgosdelsol.org/adoptable-dogs/andres-2/", "https://galgosdelsol.org/adoptable-dogs/bonita-2/"]
        mock_filter.return_value = ["https://galgosdelsol.org/adoptable-dogs/andres-2/"]

        # Mock the listing page scraping to return test animals
        with patch.object(self.scraper, "_scrape_listing_page") as mock_scrape:
            mock_scrape.return_value = [
                {"name": "Andres", "adoption_url": "https://galgosdelsol.org/adoptable-dogs/andres-2/", "external_id": "andres-2", "animal_type": "dog", "status": "available"},
                {"name": "Bonita", "adoption_url": "https://galgosdelsol.org/adoptable-dogs/bonita-2/", "external_id": "bonita-2", "animal_type": "dog", "status": "available"},
            ]

            # Test method should exist and be called
            try:
                animals = self.scraper._get_filtered_animals()
                # Method exists and filtering was applied
                mock_filter.assert_called_once_with(test_urls)
                self.assertEqual(len(animals), 1)  # One filtered out
            except AttributeError:
                self.fail("_get_filtered_animals method does not exist")

    @patch.object(GalgosDelSolScraper, "set_filtering_stats")
    def test_get_filtered_animals_tracks_filtering_stats(self, mock_stats):
        """Test that _get_filtered_animals tracks filtering statistics."""
        # Mock the listing page scraping
        with patch.object(self.scraper, "_scrape_listing_page") as mock_scrape:
            mock_scrape.return_value = [{"name": "Test Dog", "adoption_url": "https://galgosdelsol.org/adoptable-dogs/test/", "external_id": "test", "animal_type": "dog", "status": "available"}]

            with patch.object(self.scraper, "_filter_existing_urls", return_value=[]):
                try:
                    self.scraper._get_filtered_animals()
                    # Should call set_filtering_stats with total and skipped counts
                    mock_stats.assert_called()
                except AttributeError:
                    self.fail("_get_filtered_animals method does not exist")

    def test_get_filtered_animals_method_exists(self):
        """Test that _get_filtered_animals method exists and returns filtered list."""
        # This should exist as part of modern BaseScraper pattern
        self.assertTrue(hasattr(self.scraper, "_get_filtered_animals"), "_get_filtered_animals method should exist")
        self.assertTrue(callable(getattr(self.scraper, "_get_filtered_animals", None)), "_get_filtered_animals should be callable")

    @patch.object(GalgosDelSolScraper, "_filter_existing_urls")
    def test_skip_existing_animals_disabled_processes_all(self, mock_filter):
        """Test that when skip_existing_animals=false, all URLs processed."""
        # Temporarily override config setting
        original_setting = self.scraper.skip_existing_animals
        self.scraper.skip_existing_animals = False

        try:
            with patch.object(self.scraper, "_scrape_listing_page") as mock_scrape:
                mock_scrape.return_value = [{"name": "Test Dog", "adoption_url": "https://galgosdelsol.org/adoptable-dogs/test/", "external_id": "test", "animal_type": "dog", "status": "available"}]

                try:
                    self.scraper._get_filtered_animals()
                    # _filter_existing_urls should NOT be called when disabled
                    mock_filter.assert_not_called()
                except AttributeError:
                    self.fail("_get_filtered_animals method does not exist")
        finally:
            # Restore original setting
            self.scraper.skip_existing_animals = original_setting


@pytest.mark.unit
@pytest.mark.fast
class TestGalgosDelSolScraperBatchProcessing(unittest.TestCase):
    """Test cases for batch processing functionality."""

    def setUp(self):
        """Set up test fixtures."""
        self.scraper = GalgosDelSolScraper(config_id="galgosdelsol")

    def test_batch_size_from_config_loaded_correctly(self):
        """Test that batch_size is correctly loaded from config."""
        # The galgosdelsol.yaml config has batch_size: 6
        self.assertEqual(self.scraper.batch_size, 6)

    @patch.object(GalgosDelSolScraper, "_scrape_detail_page")
    @patch.object(GalgosDelSolScraper, "_get_filtered_animals")
    def test_collect_data_respects_batch_size_when_processing_animals(self, mock_get_filtered, mock_detail):
        """Test that collect_data processes animals in batches when batch_size is configured."""
        # Create test animals - more than batch_size to test batching
        test_animals = []
        for i in range(8):  # More than batch_size of 6
            test_animals.append({"name": f"Dog {i}", "adoption_url": f"https://galgosdelsol.org/adoptable-dogs/dog-{i}/", "external_id": f"dog-{i}", "animal_type": "dog", "status": "available"})

        mock_get_filtered.return_value = test_animals
        mock_detail.return_value = {"description": "Test description"}

        result = self.scraper.collect_data()

        # Should process all animals
        self.assertEqual(len(result), 8)
        # _scrape_detail_page should be called for each animal
        self.assertEqual(mock_detail.call_count, 8)

    @patch.object(GalgosDelSolScraper, "_process_animals_in_batches")
    @patch.object(GalgosDelSolScraper, "_get_filtered_animals")
    def test_collect_data_calls_batch_processing_method(self, mock_get_filtered, mock_process_batches):
        """Test that collect_data calls the batch processing method when animals exist."""
        test_animals = [{"name": "Test Dog", "adoption_url": "https://galgosdelsol.org/adoptable-dogs/test/", "external_id": "test", "animal_type": "dog", "status": "available"}]

        mock_get_filtered.return_value = test_animals
        mock_process_batches.return_value = test_animals  # Return processed animals

        result = self.scraper.collect_data()

        # Should call the batch processing method
        mock_process_batches.assert_called_once_with(test_animals)
        self.assertEqual(result, test_animals)

    def test_process_animals_in_batches_method_exists(self):
        """Test that _process_animals_in_batches method exists and is callable."""
        self.assertTrue(hasattr(self.scraper, "_process_animals_in_batches"), "_process_animals_in_batches method should exist")
        self.assertTrue(callable(getattr(self.scraper, "_process_animals_in_batches", None)), "_process_animals_in_batches should be callable")

    @patch.object(GalgosDelSolScraper, "_scrape_detail_page")
    def test_process_animals_in_batches_handles_batch_size_correctly(self, mock_detail):
        """Test that _process_animals_in_batches splits animals into correct batch sizes."""
        # Create exactly 12 animals (2 batches of 6)
        test_animals = []
        for i in range(12):
            test_animals.append({"name": f"Dog {i}", "adoption_url": f"https://galgosdelsol.org/adoptable-dogs/dog-{i}/", "external_id": f"dog-{i}", "animal_type": "dog", "status": "available"})

        mock_detail.return_value = {"description": "Test description"}

        try:
            result = self.scraper._process_animals_in_batches(test_animals)

            # Should return all processed animals
            self.assertEqual(len(result), 12)
            # Each animal should have been processed
            self.assertEqual(mock_detail.call_count, 12)

        except AttributeError:
            self.fail("_process_animals_in_batches method does not exist")

    @patch("time.sleep")  # Mock sleep to speed up tests
    @patch.object(GalgosDelSolScraper, "_scrape_detail_page")
    def test_process_animals_in_batches_respects_rate_limiting(self, mock_detail, mock_sleep):
        """Test that batch processing respects rate limiting between batches."""
        test_animals = [{"name": "Test Dog", "adoption_url": "https://galgosdelsol.org/adoptable-dogs/test/", "external_id": "test", "animal_type": "dog", "status": "available"}]

        mock_detail.return_value = {"description": "Test description"}

        try:
            self.scraper._process_animals_in_batches(test_animals)
            # Should call sleep for rate limiting (config has rate_limit_delay: 2.5)
            mock_sleep.assert_called()
        except AttributeError:
            self.fail("_process_animals_in_batches method does not exist")


@pytest.mark.unit
@pytest.mark.fast
class TestGalgosDelSolScraperArchitectureModernization(unittest.TestCase):
    """Test cases for modern architecture patterns."""

    def setUp(self):
        """Set up test fixtures."""
        self.scraper = GalgosDelSolScraper(config_id="galgosdelsol")

    def test_base_url_comes_from_config_not_hardcoded(self):
        """Test that base_url is loaded from org_config.metadata.website_url, not hardcoded."""
        # Should use config value from galgosdelsol.yaml: website_url: "https://galgosdelsol.org/"
        config_website_url = getattr(self.scraper.org_config.metadata, "website_url", None)
        self.assertIsNotNone(config_website_url, "Config should have website_url")
        
        expected_base_url = str(config_website_url).rstrip("/")
        self.assertEqual(self.scraper.base_url, expected_base_url)

        # Verify it's using config, not hardcoded - base_url should match config
        self.assertTrue(hasattr(self.scraper, "org_config"))
        self.assertIsNotNone(self.scraper.org_config)

    def test_organization_name_comes_from_config(self):
        """Test that organization_name comes from org_config.name, not hardcoded."""
        # Should use config value from galgosdelsol.yaml: name: "Galgos del Sol"
        expected_name = "Galgos del Sol"
        self.assertEqual(self.scraper.organization_name, expected_name)
        self.assertEqual(self.scraper.organization_name, self.scraper.org_config.name)

    def test_listing_urls_are_config_driven_not_hardcoded(self):
        """Test that listing URLs are built from config base_url, not hardcoded."""
        # Current hardcoded URLs should be replaced with config-driven approach
        expected_base = "https://galgosdelsol.org"

        # All listing URLs should start with the config-driven base_url
        for listing_url in self.scraper.listing_urls:
            self.assertTrue(listing_url.startswith(expected_base), f"Listing URL {listing_url} should start with config base_url {expected_base}")

    def test_modern_initialization_pattern_like_manytearsrescue(self):
        """Test that initialization follows modern pattern similar to manytearsrescue."""
        # Should have similar structure to manytearsrescue initialization
        self.assertTrue(hasattr(self.scraper, "base_url"))
        self.assertTrue(hasattr(self.scraper, "listing_urls"))
        self.assertTrue(hasattr(self.scraper, "organization_name"))

        # Base URL should be stripped of trailing slash
        self.assertFalse(self.scraper.base_url.endswith("/"))

    def test_rate_limit_delay_comes_from_config(self):
        """Test that rate_limit_delay comes from config, not hardcoded."""
        # Should use config value from galgosdelsol.yaml: rate_limit_delay: 2.5
        expected_delay = 2.5
        self.assertEqual(self.scraper.rate_limit_delay, expected_delay)

    def test_config_driven_architecture_consistency(self):
        """Test overall consistency of config-driven architecture."""
        # Verify all critical values come from config
        config_base_url = getattr(self.scraper.org_config.metadata, "website_url", None)
        self.assertIsNotNone(config_base_url, "Config should have website_url")

        # Base URL should be derived from config
        expected_base = str(config_base_url).rstrip("/") if config_base_url else None
        self.assertEqual(self.scraper.base_url, expected_base)


@pytest.mark.integration
@pytest.mark.slow
class TestGalgosDelSolScraperIntegrationPerformance(unittest.TestCase):
    """Integration and performance tests for Galgos del Sol scraper."""

    def setUp(self):
        """Set up test fixtures."""
        self.scraper = GalgosDelSolScraper(config_id="galgosdelsol")

    @patch("time.sleep")  # Speed up tests by mocking sleep
    @patch.object(GalgosDelSolScraper, "_scrape_detail_page")
    @patch.object(GalgosDelSolScraper, "_scrape_listing_page")
    def test_full_end_to_end_flow_with_config_compliance(self, mock_listing, mock_detail, mock_sleep):
        """Test complete scraping flow with skip_existing_animals and batch_size."""
        # Mock listing page to return multiple animals (more than batch_size=6)
        test_animals = []
        for i in range(10):  # More than batch_size to test batching
            test_animals.append(
                {"name": f"Test Dog {i}", "adoption_url": f"https://galgosdelsol.org/adoptable-dogs/test-dog-{i}/", "external_id": f"test-dog-{i}", "animal_type": "dog", "status": "available"}
            )

        mock_listing.return_value = test_animals

        # Mock detail page to return enriched data
        def mock_detail_side_effect(url):
            dog_id = url.split("/")[-2]
            return {"description": f"Test description for {dog_id}", "breed": "Galgo", "sex": "Male", "age_text": "3 years", "properties": {"breed": "Galgo", "sex": "Male", "age_text": "3 years"}}

        mock_detail.side_effect = mock_detail_side_effect

        # Mock skip_existing_animals to simulate filtering
        with patch.object(self.scraper, "_filter_existing_urls") as mock_filter:
            # Simulate 3 animals being filtered out (existing)
            filtered_urls = [animal["adoption_url"] for animal in test_animals[:7]]  # Keep 7 out of 10
            mock_filter.return_value = filtered_urls

            # Run complete flow
            result = self.scraper.collect_data()

            # Verify config compliance features were used
            self.assertEqual(len(result), 7)  # 7 animals after filtering
            mock_filter.assert_called_once()  # skip_existing_animals was applied

            # Verify batch processing - should process 7 animals in 2 batches (6 + 1)
            self.assertEqual(mock_detail.call_count, 7)  # All filtered animals processed

            # Verify all animals have enriched data
            for animal in result:
                self.assertIn("description", animal)
                self.assertIn("breed", animal)
                self.assertIn("sex", animal)
                self.assertIn("age_text", animal)

    @patch("time.sleep")  # Speed up tests by mocking sleep
    @patch.object(GalgosDelSolScraper, "_scrape_detail_page")
    @patch.object(GalgosDelSolScraper, "_scrape_listing_page")
    def test_performance_with_large_batch_size(self, mock_listing, mock_detail, mock_sleep):
        """Test performance and batch processing with larger dataset."""
        # Create a large dataset to test batching performance
        large_dataset = []
        for i in range(25):  # 25 animals = 5 batches of 6 (batch_size from config)
            large_dataset.append(
                {
                    "name": f"Performance Test Dog {i}",
                    "adoption_url": f"https://galgosdelsol.org/adoptable-dogs/perf-dog-{i}/",
                    "external_id": f"perf-dog-{i}",
                    "animal_type": "dog",
                    "status": "available",
                }
            )

        mock_listing.return_value = large_dataset
        mock_detail.return_value = {"description": "Performance test description"}

        # Track timing (mock sleep so we're measuring processing time)
        import time

        start_time = time.time()

        result = self.scraper.collect_data()

        end_time = time.time()
        processing_time = end_time - start_time

        # Verify all animals were processed
        self.assertEqual(len(result), 25)

        # Verify batching occurred (should be called 25 times for details)
        self.assertEqual(mock_detail.call_count, 25)

        # Performance assertion - processing should complete reasonably quickly
        # (with mocked sleep, should be sub-second for 25 animals)
        self.assertLess(processing_time, 5.0, "Processing took too long even with mocked delays")

    @patch.object(GalgosDelSolScraper, "_scrape_detail_page")
    @patch.object(GalgosDelSolScraper, "_scrape_listing_page")
    def test_error_recovery_and_resilience(self, mock_listing, mock_detail):
        """Test error handling and resilience during batch processing."""
        # Setup test data
        test_animals = [
            {"name": "Good Dog 1", "adoption_url": "https://galgosdelsol.org/adoptable-dogs/good-1/", "external_id": "good-1", "animal_type": "dog", "status": "available"},
            {"name": "Bad Dog", "adoption_url": "https://galgosdelsol.org/adoptable-dogs/bad/", "external_id": "bad", "animal_type": "dog", "status": "available"},
            {"name": "Good Dog 2", "adoption_url": "https://galgosdelsol.org/adoptable-dogs/good-2/", "external_id": "good-2", "animal_type": "dog", "status": "available"},
        ]

        mock_listing.return_value = test_animals

        # Make detail scraping fail for one animal
        def detail_side_effect(url):
            if "bad" in url:
                raise Exception("Network timeout for bad dog")
            return {"description": "Success", "breed": "Galgo"}

        mock_detail.side_effect = detail_side_effect

        # Run scraping - should continue despite one failure
        result = self.scraper.collect_data()

        # Should return all 3 animals (including the one that failed detail scraping)
        self.assertEqual(len(result), 3)

        # Verify failed animal still has basic data
        bad_animal = next((animal for animal in result if animal["name"] == "Bad Dog"), None)
        self.assertIsNotNone(bad_animal)
        self.assertEqual(bad_animal["external_id"], "bad")

        # Verify successful animals have enriched data
        good_animals = [animal for animal in result if "Good Dog" in animal["name"]]
        self.assertEqual(len(good_animals), 2)
        for animal in good_animals:
            self.assertIn("description", animal)

    @patch("time.sleep")  # Speed up tests
    @patch.object(GalgosDelSolScraper, "_scrape_listing_page")
    def test_skip_existing_animals_statistics_tracking(self, mock_listing, mock_sleep):
        """Test that filtering statistics are properly tracked and reported."""
        # Setup test data
        test_animals = []
        for i in range(8):
            test_animals.append(
                {"name": f"Stats Test Dog {i}", "adoption_url": f"https://galgosdelsol.org/adoptable-dogs/stats-{i}/", "external_id": f"stats-{i}", "animal_type": "dog", "status": "available"}
            )

        mock_listing.return_value = test_animals

        # Mock filtering to simulate some animals being skipped
        with patch.object(self.scraper, "_filter_existing_urls") as mock_filter:
            # Simulate 3 animals being filtered out (keep 5 out of 8)
            kept_urls = [animal["adoption_url"] for animal in test_animals[:5]]
            mock_filter.return_value = kept_urls

            # Mock set_filtering_stats to verify it's called with correct values
            with patch.object(self.scraper, "set_filtering_stats") as mock_stats:
                result = self.scraper.collect_data()

                # Verify statistics tracking
                mock_stats.assert_called()
                # Should be called with total=8, skipped=3
                calls = mock_stats.call_args_list
                final_call = calls[-1]  # Get the final call with actual stats
                total_count, skipped_count = final_call[0]
                self.assertEqual(total_count, 8)
                self.assertEqual(skipped_count, 3)

                # Verify correct number of animals returned
                self.assertEqual(len(result), 5)

    @patch("time.sleep")  # Speed up tests
    @patch.object(GalgosDelSolScraper, "_scrape_detail_page")
    @patch.object(GalgosDelSolScraper, "_scrape_listing_page")
    def test_batch_processing_with_various_batch_sizes(self, mock_listing, mock_detail, mock_sleep):
        """Test batch processing behavior with different batch sizes."""
        # Setup test data
        test_animals = []
        for i in range(13):  # Prime number to test various batch scenarios
            test_animals.append(
                {"name": f"Batch Test Dog {i}", "adoption_url": f"https://galgosdelsol.org/adoptable-dogs/batch-{i}/", "external_id": f"batch-{i}", "animal_type": "dog", "status": "available"}
            )

        mock_listing.return_value = test_animals
        mock_detail.return_value = {"description": "Batch test description"}

        # Test with default batch_size=6 (from config)
        result = self.scraper.collect_data()

        # Should process all 13 animals in 3 batches (6 + 6 + 1)
        self.assertEqual(len(result), 13)
        self.assertEqual(mock_detail.call_count, 13)

        # Reset mock for next test
        mock_detail.reset_mock()

        # Test with different batch size by temporarily modifying
        original_batch_size = self.scraper.batch_size
        try:
            self.scraper.batch_size = 4  # Override to test different batch size
            result2 = self.scraper.collect_data()

            # Should still process all 13 animals, now in 4 batches (4 + 4 + 4 + 1)
            self.assertEqual(len(result2), 13)
            self.assertEqual(mock_detail.call_count, 13)
        finally:
            # Restore original batch size
            self.scraper.batch_size = original_batch_size

    def test_configuration_values_loaded_correctly(self):
        """Test that all configuration values are loaded correctly from config."""
        # Verify config-driven values are properly loaded
        self.assertEqual(self.scraper.batch_size, 6)  # From galgosdelsol.yaml
        self.assertTrue(self.scraper.skip_existing_animals)  # From galgosdelsol.yaml
        self.assertEqual(self.scraper.rate_limit_delay, 2.5)  # From galgosdelsol.yaml

        # Verify derived values
        self.assertEqual(self.scraper.base_url, "https://galgosdelsol.org")
        self.assertEqual(self.scraper.organization_name, "Galgos del Sol")
        self.assertEqual(len(self.scraper.listing_urls), 4)
