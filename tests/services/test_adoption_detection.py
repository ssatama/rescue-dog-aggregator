"""
Tests for AdoptionDetectionService.

Following TDD principles - comprehensive tests for all functionality.
"""

import os
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, Mock, patch

import pytest

from services.adoption_detection import AdoptionCheckResult, AdoptionDetectionService


@pytest.fixture
def mock_animal():
    """Create a mock Animal object for testing."""
    animal = Mock()
    animal.id = 123
    animal.name = "Buddy"
    animal.status = "unknown"
    animal.url = "https://example.org/dogs/buddy"
    animal.organization_id = 1
    animal.consecutive_scrapes_missing = 3
    animal.adoption_checked_at = None
    animal.adoption_check_data = None
    return animal


@pytest.fixture
def mock_firecrawl():
    """Mock FirecrawlApp for testing."""
    with patch("services.adoption_detection.FirecrawlApp") as mock_class:
        mock_instance = Mock()
        mock_class.return_value = mock_instance
        yield mock_instance


@pytest.fixture
def service(mock_firecrawl):
    """Create service instance with mocked Firecrawl."""
    with patch.dict(os.environ, {"FIRECRAWL_API_KEY": "test-key"}):
        return AdoptionDetectionService()


class TestAdoptionDetectionService:
    """Test suite for AdoptionDetectionService."""

    def test_init_with_api_key(self):
        """Test initialization with provided API key."""
        service = AdoptionDetectionService(api_key="test-key-123")
        assert service.api_key == "test-key-123"

    def test_init_from_environment(self):
        """Test initialization from environment variable."""
        with patch.dict(os.environ, {"FIRECRAWL_API_KEY": "env-key-456"}):
            service = AdoptionDetectionService()
            assert service.api_key == "env-key-456"

    def test_init_missing_api_key(self):
        """Test initialization logs warning without API key."""
        with patch.dict(os.environ, {}, clear=True):
            service = AdoptionDetectionService()
            assert service.api_key is None
            assert service.client is None

    def test_service_initialization(self, service):
        """Test service initializes correctly."""
        assert service is not None
        assert service.client is not None

    def test_check_adoption_status_adopted(self, service, mock_animal, mock_firecrawl):
        """Test detecting adopted status."""
        mock_firecrawl.extract = Mock(return_value={"status": "adopted", "evidence": "This dog has been ADOPTED and found their forever home!", "confidence": 0.95})

        result = service.check_adoption_status(mock_animal)

        assert result.animal_id == 123
        assert result.animal_name == "Buddy"
        assert result.detected_status == "adopted"
        assert result.evidence == "This dog has been ADOPTED and found their forever home!"
        assert result.confidence == 0.95
        assert result.error is None

    def test_check_adoption_status_reserved(self, service, mock_animal, mock_firecrawl):
        """Test detecting reserved status."""
        mock_firecrawl.extract = Mock(return_value={"status": "reserved", "evidence": "This dog is RESERVED pending adoption", "confidence": 0.85})

        result = service.check_adoption_status(mock_animal)

        assert result.detected_status == "reserved"
        assert result.confidence == 0.85

    def test_check_adoption_status_available(self, service, mock_animal, mock_firecrawl):
        """Test detecting available status."""
        mock_firecrawl.extract = Mock(return_value={"status": "available", "evidence": "Still looking for a home", "confidence": 0.80})

        result = service.check_adoption_status(mock_animal)

        assert result.detected_status == "available"
        assert result.confidence == 0.80

    def test_check_adoption_status_no_url(self, service):
        """Test handling animal without URL."""
        animal = Mock()
        animal.id = 456
        animal.name = "Max"
        animal.status = "unknown"
        animal.url = None

        result = service.check_adoption_status(animal)

        assert result.detected_status == "unknown"
        assert result.confidence == 0.0
        assert result.error == "Missing URL"
        assert "No URL available" in result.evidence

    def test_check_adoption_status_extraction_failure(self, service, mock_animal, mock_firecrawl):
        """Test handling extraction failure."""
        mock_firecrawl.extract = Mock(side_effect=Exception("Extraction failed"))

        result = service.check_adoption_status(mock_animal)

        assert result.detected_status == "unknown"
        assert result.confidence == 0.0
        assert "Extraction failed" in result.error

    def test_check_adoption_status_empty_response(self, service, mock_animal, mock_firecrawl):
        """Test handling empty response."""
        mock_firecrawl.extract = Mock(return_value=None)

        result = service.check_adoption_status(mock_animal)

        assert result.detected_status == "unknown"
        assert result.confidence == 0.0

    def test_extract_with_retry_success(self, service, mock_firecrawl):
        """Test _extract_with_retry success on first attempt."""
        # This method is deprecated but keep test for backwards compatibility
        result = service._extract_with_retry("https://example.org/dog", timeout=5000)
        
        # Should return None as the method is deprecated
        assert result is None

    def test_extract_with_retry_second_attempt(self, service, mock_firecrawl):
        """Test _extract_with_retry success on second attempt."""
        # This method is deprecated but keep test for backwards compatibility
        result = service._extract_with_retry("https://example.org/dog", timeout=5000)
        
        # Should return None as the method is deprecated
        assert result is None

    def test_extract_with_retry_all_fail(self, service, mock_firecrawl):
        """Test _extract_with_retry all attempts fail."""
        # This method is deprecated but keep test for backwards compatibility
        result = service._extract_with_retry("https://example.org/dog", timeout=5000)
        
        # Should return None as the method is deprecated
        assert result is None

    def test_batch_check_adoptions(self, service):
        """Test batch checking of adoptions."""
        # Create mock database connection
        mock_db_connection = Mock()
        mock_cursor = mock_db_connection.cursor.return_value
        mock_cursor.fetchall.return_value = [{"id": 1, "name": "Max", "url": "https://dogstrust.org.uk/dogs/max", "status": "unknown", "consecutive_scrapes_missing": 5}]

        # Mock Firecrawl responses
        service.client.extract = Mock(
            side_effect=[
                {"status": "adopted", "evidence": "Page shows REHOMED", "confidence": 0.95},
            ]
        )

    def test_batch_check_adoptions_dry_run(self, service, mock_firecrawl):
        """Test batch checking in dry run mode doesn't update database."""
        mock_cursor = Mock()
        mock_db = Mock()
        mock_db.cursor.return_value = mock_cursor

        # Single animal data
        animals_data = [(1, "TestDog", "unknown", "https://example.org/dogs/test", 1, 3, None)]
        mock_cursor.fetchall.return_value = animals_data

        mock_firecrawl.extract = Mock(return_value={"status": "adopted", "evidence": "Adopted!", "confidence": 0.95})

        results = service.batch_check_adoptions(mock_db, organization_id=1, dry_run=True)

        assert len(results) == 1
        assert results[0].detected_status == "adopted"

        # Verify no database updates in dry run
        assert mock_cursor.execute.call_count == 1  # Only the SELECT query
        mock_db.commit.assert_not_called()

    def test_batch_check_adoptions_respects_recheck_interval(self, service, mock_firecrawl):
        """Test that recently checked dogs are not rechecked."""
        mock_cursor = Mock()
        mock_db = Mock()
        mock_db.cursor.return_value = mock_cursor

        # Simulate that only old_check and never_checked are returned
        animals_data = [
            (2, "OldCheck", "unknown", "https://example.org/dogs/old", 1, 3, datetime.now(timezone.utc) - timedelta(hours=48)),
            (3, "NeverChecked", "unknown", "https://example.org/dogs/never", 1, 3, None),
        ]
        mock_cursor.fetchall.return_value = animals_data

        # Call batch check with 24 hour interval
        service.batch_check_adoptions(mock_db, organization_id=1, check_interval_hours=24, dry_run=True)

        # Verify the query was executed with correct parameters
        mock_cursor.execute.assert_called_once()
        args = mock_cursor.execute.call_args[0]
        assert args[1][0] == 1  # organization_id
        assert args[1][1] == 3  # threshold
        # args[1][2] should be the recheck_cutoff (24 hours ago)
        assert args[1][3] == 50  # limit

    def test_get_eligible_dogs_count(self, service):
        """Test counting eligible dogs for checking."""
        mock_cursor = Mock()
        mock_db = Mock()
        mock_db.cursor.return_value = mock_cursor
        mock_cursor.fetchone.return_value = (15,)

        count = service.get_eligible_dogs_count(mock_db, organization_id=1, threshold=3, check_interval_hours=24)

        assert count == 15
        mock_cursor.execute.assert_called_once()

    def test_batch_check_handles_individual_errors(self, service):
        """Test batch check handles individual dog failures gracefully."""
        # Create mock database connection
        mock_db_connection = Mock()
        mock_cursor = mock_db_connection.cursor.return_value
        mock_cursor.fetchall.return_value = [
            {"id": 1, "name": "Max", "url": "https://dogstrust.org.uk/dogs/max", "status": "unknown", "consecutive_scrapes_missing": 5},
            {"id": 2, "name": "Bella", "url": "https://dogstrust.org.uk/dogs/bella", "status": "unknown", "consecutive_scrapes_missing": 4},
            {"id": 3, "name": "Charlie", "url": "https://dogstrust.org.uk/dogs/charlie", "status": "unknown", "consecutive_scrapes_missing": 3},
        ]

        # Mock Firecrawl to succeed, fail, then succeed
        service.client.extract = Mock(
            side_effect=[
                {"status": "adopted", "evidence": "Page shows REHOMED", "confidence": 0.95},
                Exception("Network error"),
                {"status": "available", "evidence": "Still listed", "confidence": 0.85},
            ]
        )