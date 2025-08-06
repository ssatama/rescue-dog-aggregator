"""
Comprehensive tests for secure utility modules.
Follows CLAUDE.md principles: TDD, immutable data, pure functions.
"""

from unittest.mock import Mock

import pytest

from utils.db_connection import DatabaseConfig
from utils.optimized_standardization import AgeInfo, BreedInfo, StandardizedAnimal, parse_age_text, standardize_animal_data, standardize_breed, standardize_size_value
from utils.organization_sync_service import OrganizationSyncService, SyncResult
from utils.secure_config_scraper_runner import ScraperRunResult, SecureConfigScraperRunner
from utils.secure_file_handler import FileValidationConfig, SecureFileHandler
from utils.secure_scraper_loader import ScraperModuleInfo, SecureScraperLoader


@pytest.mark.security
@pytest.mark.integration
@pytest.mark.slow
class TestDatabaseConfig:
    """Test database configuration validation."""

    def test_valid_config_creation(self):
        """Test creating valid database configuration."""
        config = DatabaseConfig(host="localhost", user="testuser", database="testdb", password="testpass", port=5432)

        assert config.host == "localhost"
        assert config.user == "testuser"
        assert config.database == "testdb"
        assert config.password == "testpass"
        assert config.port == 5432

    def test_invalid_config_validation(self):
        """Test database configuration validation."""
        # Empty host
        with pytest.raises(ValueError, match="Host, user, and database are required"):
            DatabaseConfig(host="", user="testuser", database="testdb")

        # Invalid port
        with pytest.raises(ValueError, match="Port must be between 1 and 65535"):
            DatabaseConfig(host="localhost", user="testuser", database="testdb", port=0)

        with pytest.raises(ValueError, match="Port must be between 1 and 65535"):
            DatabaseConfig(host="localhost", user="testuser", database="testdb", port=70000)

    def test_config_immutability(self):
        """Test that database configuration is immutable."""
        config = DatabaseConfig(host="localhost", user="testuser", database="testdb")

        # Should not be able to modify
        with pytest.raises(AttributeError):
            config.host = "newhost"


class TestSecureScraperLoader:
    """Test secure scraper loader."""

    def setup_method(self):
        """Set up test fixtures."""
        self.loader = SecureScraperLoader()
        self.loader.clear_cache()

    def test_module_path_validation(self):
        """Test module path validation."""
        # Valid module paths
        assert self.loader.validate_module_path("scrapers.pets_turkey.dogs_scraper")
        assert self.loader.validate_module_path("scrapers.base_scraper")

        # Invalid module paths
        assert not self.loader.validate_module_path("malicious.module")
        assert not self.loader.validate_module_path("os.system")
        assert not self.loader.validate_module_path("")

    def test_class_name_validation(self):
        """Test class name validation."""
        # Valid class names
        assert self.loader.validate_class_name("DogsScraper")
        assert self.loader.validate_class_name("PetsTurkeyScraper")

        # Invalid class names
        assert not self.loader.validate_class_name("InvalidClass")  # Doesn't end with Scraper
        assert not self.loader.validate_class_name("123Scraper")  # Starts with number
        assert not self.loader.validate_class_name("")
        assert not self.loader.validate_class_name("Evil-Scraper")  # Contains hyphen

    def test_security_validation(self):
        """Test security validation prevents dangerous imports."""
        # Test that validate_module_path rejects non-whitelisted modules
        assert not self.loader.validate_module_path("scrapers.malicious.module")
        assert not self.loader.validate_module_path("scrapers.evil.scraper")

        # Test that only whitelisted modules are accepted
        assert self.loader.validate_module_path("scrapers.pets_turkey.dogs_scraper")
        assert self.loader.validate_module_path("scrapers.base_scraper")

    def test_module_info_validation(self):
        """Test ScraperModuleInfo validation."""
        # Valid module info
        info = ScraperModuleInfo(module_path="scrapers.pets_turkey.dogs_scraper", class_name="DogsScraper")
        assert info.module_path == "scrapers.pets_turkey.dogs_scraper"
        assert info.class_name == "DogsScraper"

        # Invalid module info
        with pytest.raises(ValueError, match="Module path and class name are required"):
            ScraperModuleInfo(module_path="", class_name="DogsScraper")

        with pytest.raises(ValueError, match="Module path must start with 'scrapers.'"):
            ScraperModuleInfo(module_path="malicious.module", class_name="DogsScraper")


class TestSecureFileHandler:
    """Test secure file handler."""

    def setup_method(self):
        """Set up test fixtures."""
        self.config = FileValidationConfig(allowed_extensions={".jpg", ".png", ".gif"}, max_file_size=1024 * 1024, allowed_directories={"/tmp/test", "/var/test"})  # 1MB
        self.handler = SecureFileHandler(self.config)

    def test_config_validation(self):
        """Test file validation configuration."""
        # Valid config
        config = FileValidationConfig(allowed_extensions={".jpg"}, max_file_size=1024, allowed_directories={"/tmp"})
        assert config.allowed_extensions == {".jpg"}

        # Invalid config
        with pytest.raises(ValueError, match="At least one allowed extension is required"):
            FileValidationConfig(allowed_extensions=set(), max_file_size=1024, allowed_directories={"/tmp"})

    def test_url_validation(self):
        """Test URL validation."""
        # Valid URLs
        assert self.handler.validate_url("https://example.com/image.jpg")
        assert self.handler.validate_url("http://example.com/image.png")

        # Invalid URLs
        assert not self.handler.validate_url("javascript:alert('xss')")
        assert not self.handler.validate_url("data:image/png;base64,...")
        assert not self.handler.validate_url("file:///etc/passwd")
        assert not self.handler.validate_url("ftp://example.com/file.jpg")
        assert not self.handler.validate_url("")

    def test_filename_sanitization(self):
        """Test filename sanitization."""
        # Valid filenames
        assert self.handler.sanitize_filename("image.jpg") == "image.jpg"
        assert self.handler.sanitize_filename("my_image.png") == "my_image.png"

        # Dangerous filenames
        assert self.handler.sanitize_filename("../../../etc/passwd") == "passwd"
        assert self.handler.sanitize_filename("image<script>.jpg") == "image_script_.jpg"
        assert self.handler.sanitize_filename("file|with|pipes.jpg") == "file_with_pipes.jpg"

        # Empty filename
        assert self.handler.sanitize_filename("") == ""
        assert self.handler.sanitize_filename("   ") == ""


class TestOptimizedStandardization:
    """Test optimized standardization with caching."""

    def test_breed_standardization_caching(self):
        """Test breed standardization with caching."""
        # Clear cache first
        standardize_breed.cache_clear()

        # First call should miss cache
        result1 = standardize_breed("labrador")
        assert result1.standardized_name == "Labrador Retriever"
        assert result1.breed_group == "Sporting"
        assert result1.size_estimate == "Large"

        # Second call should hit cache
        result2 = standardize_breed("labrador")
        assert result2 == result1

        # Check cache stats
        cache_info = standardize_breed.cache_info()
        assert cache_info.hits >= 1
        assert cache_info.misses >= 1

    def test_age_parsing_caching(self):
        """Test age parsing with caching."""
        # Clear cache first
        parse_age_text.cache_clear()

        # Test various age formats
        result1 = parse_age_text("2 years")
        assert result1.category == "Young"
        assert result1.min_months == 24
        assert result1.max_months == 36

        result2 = parse_age_text("6 months")
        assert result2.category == "Puppy"
        assert result2.min_months == 6
        assert result2.max_months == 8

        result3 = parse_age_text("puppy")
        assert result3.category == "Puppy"
        assert result3.min_months == 2
        assert result3.max_months == 10

        # Check cache is working
        cache_info = parse_age_text.cache_info()
        assert cache_info.misses >= 3

    def test_size_standardization_caching(self):
        """Test size standardization with caching."""
        # Clear cache first
        standardize_size_value.cache_clear()

        # Test size standardization
        assert standardize_size_value("large") == "Large"
        assert standardize_size_value("MEDIUM") == "Medium"
        assert standardize_size_value("small") == "Small"
        assert standardize_size_value("xl") == "XLarge"

        # Test hyphenated sizes
        assert standardize_size_value("medium-large") == "Large"

        # Check cache stats
        cache_info = standardize_size_value.cache_info()
        assert cache_info.misses >= 4

    def test_immutable_data_structures(self):
        """Test that data structures are immutable."""
        breed_info = BreedInfo("Labrador", "Sporting", "Large")

        # Should not be able to modify
        with pytest.raises(AttributeError):
            breed_info.standardized_name = "NewName"

        age_info = AgeInfo("Young", 12, 36)

        # Should not be able to modify
        with pytest.raises(AttributeError):
            age_info.category = "Adult"

    def test_standardized_animal_immutability(self):
        """Test StandardizedAnimal immutability."""
        animal = StandardizedAnimal(name="Buddy", breed="labrador", standardized_breed="Labrador Retriever", breed_group="Sporting")

        # Should not be able to modify
        with pytest.raises(AttributeError):
            animal.name = "NewName"

        # Should be able to convert to dict
        animal_dict = animal.to_dict()
        assert animal_dict["name"] == "Buddy"
        assert animal_dict["standardized_breed"] == "Labrador Retriever"

    def test_standardize_animal_data_immutability(self):
        """Test that standardize_animal_data returns immutable results."""
        input_data = {"name": "Buddy", "breed": "labrador", "age_text": "2 years", "size": "large"}

        result = standardize_animal_data(input_data)

        # Should be immutable
        assert isinstance(result, StandardizedAnimal)
        assert result.name == "Buddy"
        assert result.standardized_breed == "Labrador Retriever"
        assert result.breed_group == "Sporting"
        assert result.age_category == "Young"
        assert result.standardized_size == "Large"

        # Original data should not be modified
        assert input_data == {"name": "Buddy", "breed": "labrador", "age_text": "2 years", "size": "large"}


class TestOrganizationSyncService:
    """Test organization sync service."""

    def setup_method(self):
        """Set up test fixtures."""
        self.mock_logo_service = Mock()
        self.sync_service = OrganizationSyncService(self.mock_logo_service)

    def test_sync_result_immutability(self):
        """Test SyncResult immutability."""
        result = SyncResult(organization_id=1, config_id="test-org", was_created=True, success=True)

        # Should not be able to modify
        with pytest.raises(AttributeError):
            result.success = False

        assert result.organization_id == 1
        assert result.config_id == "test-org"
        assert result.was_created is True
        assert result.success is True

    def test_social_media_dict_building(self):
        """Test social media dictionary building."""
        # Mock config
        mock_config = Mock()
        mock_config.metadata.social_media.facebook = "https://facebook.com/test"
        mock_config.metadata.social_media.instagram = "https://instagram.com/test"
        mock_config.metadata.social_media.twitter = None
        mock_config.metadata.social_media.youtube = None
        mock_config.metadata.social_media.linkedin = None
        mock_config.metadata.website_url = "https://test.com"

        result = self.sync_service._build_social_media_dict(mock_config)

        expected = {"facebook": "https://facebook.com/test", "instagram": "https://instagram.com/test", "website": "https://test.com"}

        assert result == expected

    def test_should_update_organization_logic(self):
        """Test organization update logic."""
        from utils.organization_sync_service import OrganizationRecord

        # Mock organization record
        db_org = OrganizationRecord(id=1, name="Test Org", website_url="https://old.com")

        # Mock config
        mock_config = Mock()
        mock_config.name = "Test Org"
        mock_config.metadata.website_url = "https://new.com"
        mock_config.metadata.description = "Test Description"
        mock_config.metadata.established_year = 2020
        mock_config.metadata.ships_to = ["US", "CA"]
        mock_config.metadata.social_media = Mock()
        mock_config.metadata.social_media.facebook = None
        mock_config.metadata.social_media.instagram = None
        mock_config.metadata.social_media.twitter = None
        mock_config.metadata.social_media.youtube = None
        mock_config.metadata.social_media.linkedin = None
        mock_config.metadata.logo_url = None
        # Ensure adoption_fees attribute doesn't exist to return empty dict
        mock_config.metadata.adoption_fees = None

        # Should update if website URL changed
        assert self.sync_service.should_update_organization(db_org, mock_config) is True

        # Should not update if all fields match
        db_org_matching = OrganizationRecord(
            id=1,
            name="Test Org",
            website_url="https://new.com",
            description="Test Description",
            established_year=2020,
            ships_to=["US", "CA"],
            social_media={"website": "https://new.com"},  # Expected social media dict
            logo_url=None,
            adoption_fees={},  # Empty dict to match _build_adoption_fees_dict return
        )

        assert self.sync_service.should_update_organization(db_org_matching, mock_config) is False


class TestSecureConfigScraperRunner:
    """Test secure config scraper runner."""

    def setup_method(self):
        """Set up test fixtures."""
        self.mock_config_loader = Mock()
        self.mock_scraper_loader = Mock()
        self.mock_sync_service = Mock()

        self.runner = SecureConfigScraperRunner(self.mock_config_loader, self.mock_scraper_loader, self.mock_sync_service)

    def test_scraper_run_result_immutability(self):
        """Test ScraperRunResult immutability."""
        result = ScraperRunResult(config_id="test-org", success=True, organization="Test Org", animals_found=5)

        # Should not be able to modify
        with pytest.raises(AttributeError):
            result.success = False

        assert result.config_id == "test-org"
        assert result.success is True
        assert result.organization == "Test Org"
        assert result.animals_found == 5

    def test_validate_scraper_config_early_return(self):
        """Test early return pattern in config validation."""
        # Mock disabled config
        mock_config = Mock()
        mock_config.is_enabled_for_scraping.return_value = False
        mock_config.get_display_name.return_value = "Test Org"

        self.mock_config_loader.load_config.return_value = mock_config

        # Should return early with disabled error
        is_valid, error = self.runner.validate_scraper_config("test-org")

        assert is_valid is False
        assert "disabled" in error

        # Should not call scraper loader validation
        self.mock_scraper_loader.validate_module_path.assert_not_called()

    def test_run_scraper_error_handling(self):
        """Test scraper run error handling."""
        # Mock config that raises exception
        self.mock_config_loader.load_config.side_effect = Exception("Config error")

        result = self.runner.run_scraper("test-org")

        assert result.success is False
        assert "Config error" in result.error
        assert result.config_id == "test-org"


# Integration tests
class TestIntegration:
    """Integration tests for secure modules."""

    def test_end_to_end_standardization(self):
        """Test end-to-end standardization process."""
        # Test data that would come from scrapers
        raw_data = {"name": "Buddy", "breed": "lab mix", "age_text": "Born 03/2021", "size": "large"}

        # Apply standardization
        standardized = standardize_animal_data(raw_data)

        # Verify results
        assert standardized.name == "Buddy"
        assert standardized.standardized_breed == "Labrador Retriever Mix"
        assert standardized.breed_group == "Mixed"
        assert standardized.age_category in ["Young", "Adult"]  # Depends on current date
        assert standardized.standardized_size == "Large"

        # Verify original data preserved
        assert standardized.breed == "lab mix"
        assert standardized.age_text == "Born 03/2021"
        assert standardized.size == "large"

    def test_backward_compatibility(self):
        """Test backward compatibility with existing code."""
        from utils.optimized_standardization import apply_standardization

        # Test data in old format
        old_data = {"name": "Buddy", "breed": "labrador", "age_text": "2 years", "size": "large"}

        # Should work with old function
        result = apply_standardization(old_data)

        # Should return dictionary (not dataclass)
        assert isinstance(result, dict)
        assert result["name"] == "Buddy"
        assert result["standardized_breed"] == "Labrador Retriever"
        assert result["breed_group"] == "Sporting"
        assert result["standardized_size"] == "Large"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
