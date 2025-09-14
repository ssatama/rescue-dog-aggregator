"""
Tests for AdoptionDetectionService.

Following TDD principles - comprehensive tests for all functionality.
"""

import os
import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch, AsyncMock, MagicMock

from services.adoption_detection import AdoptionDetectionService, AdoptionCheckResult


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
    with patch('services.adoption_detection.FirecrawlApp') as mock_class:
        mock_instance = Mock()
        mock_class.return_value = mock_instance
        yield mock_instance


@pytest.fixture
def service(mock_firecrawl):
    """Create service instance with mocked Firecrawl."""
    with patch.dict(os.environ, {'FIRECRAWL_API_KEY': 'test-key'}):
        return AdoptionDetectionService()


class TestAdoptionDetectionService:
    """Test suite for AdoptionDetectionService."""
    
    def test_init_with_api_key(self):
        """Test initialization with provided API key."""
        service = AdoptionDetectionService(api_key='test-key-123')
        assert service.api_key == 'test-key-123'
    
    def test_init_from_environment(self):
        """Test initialization from environment variable."""
        with patch.dict(os.environ, {'FIRECRAWL_API_KEY': 'env-key-456'}):
            service = AdoptionDetectionService()
            assert service.api_key == 'env-key-456'
    
    def test_init_missing_api_key(self):
        """Test initialization fails without API key."""
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ValueError, match="FIRECRAWL_API_KEY not found"):
                AdoptionDetectionService()
    
    def test_create_detection_prompt(self, service):
        """Test prompt creation for Firecrawl."""
        prompt = service._create_detection_prompt()
        assert "Adopted" in prompt
        assert "Reserved" in prompt
        assert "Available" in prompt
        assert "return 'adopted'" in prompt
        assert "return 'reserved'" in prompt
        assert "return 'available'" in prompt
        assert "return 'unknown'" in prompt
    
    def test_create_extraction_schema(self, service):
        """Test schema creation for structured extraction."""
        schema = service._create_extraction_schema()
        assert schema["type"] == "object"
        assert "status" in schema["properties"]
        assert "evidence" in schema["properties"]
        assert "confidence" in schema["properties"]
        assert schema["properties"]["status"]["enum"] == ["adopted", "reserved", "available", "unknown"]
    
    def test_check_adoption_status_adopted(self, service, mock_animal, mock_firecrawl):
        """Test detecting adopted status."""
        mock_firecrawl.extract = Mock(return_value={
            'data': [{
                'status': 'adopted',
                'evidence': 'This dog has been ADOPTED and found their forever home!',
                'confidence': 0.95
            }]
        })
        
        result = service.check_adoption_status(mock_animal)
        
        assert result.animal_id == 123
        assert result.animal_name == "Buddy"
        assert result.previous_status == "unknown"
        assert result.detected_status == "adopted"
        assert result.confidence == 0.95
        assert "ADOPTED" in result.evidence
        assert result.error is None
    
    def test_check_adoption_status_reserved(self, service, mock_animal, mock_firecrawl):
        """Test detecting reserved status."""
        mock_firecrawl.extract = Mock(return_value={
            'data': [{
                'status': 'reserved',
                'evidence': 'This dog is RESERVED pending adoption',
                'confidence': 0.85
            }]
        })
        
        result = service.check_adoption_status(mock_animal)
        
        assert result.detected_status == "reserved"
        assert result.confidence == 0.85
        assert "RESERVED" in result.evidence
    
    def test_check_adoption_status_available(self, service, mock_animal, mock_firecrawl):
        """Test detecting available status."""
        mock_firecrawl.extract = Mock(return_value={
            'data': [{
                'status': 'available',
                'evidence': 'Buddy is still looking for a home',
                'confidence': 0.90
            }]
        })
        
        result = service.check_adoption_status(mock_animal)
        
        assert result.detected_status == "available"
        assert result.confidence == 0.90
        assert "looking for a home" in result.evidence
    
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
        mock_firecrawl.extract = Mock(side_effect=Exception("API error"))
        
        result = service.check_adoption_status(mock_animal)
        
        assert result.detected_status == "unknown"
        assert result.confidence == 0.0
        assert "API error" in result.error
    
    def test_check_adoption_status_empty_response(self, service, mock_animal, mock_firecrawl):
        """Test handling empty extraction response."""
        mock_firecrawl.extract = Mock(return_value={})
        
        result = service.check_adoption_status(mock_animal)
        
        assert result.detected_status == "unknown"
        assert result.confidence == 0.0
    
    def test_extract_with_retry_success(self, service, mock_firecrawl):
        """Test successful extraction on first attempt."""
        mock_firecrawl.extract = Mock(return_value={
            'data': [{'status': 'adopted', 'evidence': 'Adopted!', 'confidence': 0.9}]
        })
        
        result = service._extract_with_retry("https://example.org/dog", 5000)
        
        assert result is not None
        assert 'data' in result
        mock_firecrawl.extract.assert_called_once()
    
    def test_extract_with_retry_second_attempt(self, service, mock_firecrawl):
        """Test successful extraction on retry."""
        mock_firecrawl.extract = Mock(side_effect=[
            Exception("Temporary error"),
            {'data': [{'status': 'adopted', 'evidence': 'Adopted!', 'confidence': 0.9}]}
        ])
        
        result = service._extract_with_retry("https://example.org/dog", 5000, max_retries=2)
        
        assert result is not None
        assert mock_firecrawl.extract.call_count == 2
    
    def test_extract_with_retry_all_fail(self, service, mock_firecrawl):
        """Test extraction failure after all retries."""
        mock_firecrawl.extract = Mock(side_effect=Exception("Persistent error"))
        
        with pytest.raises(Exception, match="Persistent error"):
            service._extract_with_retry("https://example.org/dog", 5000, max_retries=2)
        
        assert mock_firecrawl.extract.call_count == 3  # Initial + 2 retries
    
    def test_batch_check_adoptions(self, service, mock_firecrawl):
        """Test batch checking of multiple dogs."""
        # Mock database connection
        mock_cursor = Mock()
        mock_db = Mock()
        mock_db.cursor.return_value = mock_cursor
        
        # Create mock animals data as tuples (like SQL results)
        animals_data = [
            (1, "Dog1", "unknown", "https://example.org/dogs/dog1", 1, 3, None),
            (2, "Dog2", "unknown", "https://example.org/dogs/dog2", 1, 3, None),
            (3, "Dog3", "unknown", "https://example.org/dogs/dog3", 1, 3, None)
        ]
        
        mock_cursor.fetchall.return_value = animals_data
        
        # Mock Firecrawl responses
        mock_firecrawl.extract = Mock(side_effect=[
            {'data': [{'status': 'adopted', 'evidence': 'Adopted!', 'confidence': 0.95}]},
            {'data': [{'status': 'reserved', 'evidence': 'Reserved!', 'confidence': 0.85}]},
            {'data': [{'status': 'available', 'evidence': 'Available!', 'confidence': 0.90}]}
        ])
        
        results = service.batch_check_adoptions(
            mock_db, 
            organization_id=1,
            threshold=3,
            limit=50,
            dry_run=False
        )
        
        assert len(results) == 3
        assert results[0].detected_status == "adopted"
        assert results[1].detected_status == "reserved"
        assert results[2].detected_status == "available"
        
        # Verify database updates were attempted
        assert mock_cursor.execute.call_count >= 4  # 1 SELECT + 3 UPDATEs
        mock_db.commit.assert_called_once()
    
    def test_batch_check_adoptions_dry_run(self, service, mock_firecrawl):
        """Test batch checking in dry run mode doesn't update database."""
        mock_cursor = Mock()
        mock_db = Mock()
        mock_db.cursor.return_value = mock_cursor
        
        # Single animal data
        animals_data = [(1, "TestDog", "unknown", "https://example.org/dogs/test", 1, 3, None)]
        mock_cursor.fetchall.return_value = animals_data
        
        mock_firecrawl.extract = Mock(return_value={
            'data': [{'status': 'adopted', 'evidence': 'Adopted!', 'confidence': 0.95}]
        })
        
        results = service.batch_check_adoptions(
            mock_db, 
            organization_id=1,
            dry_run=True
        )
        
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
            (2, "OldCheck", "unknown", "https://example.org/dogs/old", 1, 3, 
             datetime.now(timezone.utc) - timedelta(hours=48)),
            (3, "NeverChecked", "unknown", "https://example.org/dogs/never", 1, 3, None)
        ]
        mock_cursor.fetchall.return_value = animals_data
        
        # Call batch check with 24 hour interval
        service.batch_check_adoptions(
            mock_db,
            organization_id=1,
            check_interval_hours=24,
            dry_run=True
        )
        
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
        
        count = service.get_eligible_dogs_count(
            mock_db,
            organization_id=1,
            threshold=3,
            check_interval_hours=24
        )
        
        assert count == 15
        mock_cursor.execute.assert_called_once()
    
    def test_batch_check_handles_individual_errors(self, service, mock_firecrawl):
        """Test that batch processing continues even if individual checks fail."""
        mock_cursor = Mock()
        mock_db = Mock()
        mock_db.cursor.return_value = mock_cursor
        
        # Create mock animals data
        animals_data = [
            (1, "Dog1", "unknown", "https://example.org/dogs/dog1", 1, 3, None),
            (2, "Dog2", "unknown", "https://example.org/dogs/dog2", 1, 3, None),
            (3, "Dog3", "unknown", "https://example.org/dogs/dog3", 1, 3, None)
        ]
        mock_cursor.fetchall.return_value = animals_data
        
        # Mock Firecrawl with one failure
        # Note: The service retries failed extractions, so we need multiple failures for Dog2
        mock_firecrawl.extract = Mock(side_effect=[
            {'data': [{'status': 'adopted', 'evidence': 'Adopted!', 'confidence': 0.95}]},  # Dog1
            Exception("API Error"),  # Dog2 attempt 1
            Exception("API Error"),  # Dog2 attempt 2  
            Exception("API Error"),  # Dog2 attempt 3 (final)
            {'data': [{'status': 'available', 'evidence': 'Available!', 'confidence': 0.90}]}  # Dog3
        ])
        
        results = service.batch_check_adoptions(
            mock_db, 
            organization_id=1,
            dry_run=False
        )
        
        assert len(results) == 3
        assert results[0].detected_status == "adopted"
        assert results[1].detected_status == "unknown"  # Failed check
        assert results[1].error is not None
        assert results[2].detected_status == "available"
        
        # First and third should have update queries, second should not
        # 1 SELECT + 2 UPDATEs (not 3 because one failed)
        assert mock_cursor.execute.call_count == 3
        mock_db.commit.assert_called_once()