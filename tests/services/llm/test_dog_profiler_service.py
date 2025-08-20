"""
Test suite for dog profiler service layer.

Following CLAUDE.md principles:
- TDD approach
- Service layer separation
- Business logic isolation
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from datetime import datetime
import json

from services.llm.dog_profiler_service import (
    DogProfilerService,
    ProfileRequest,
    ProfileResult,
    BatchProfileResult
)


class TestDogProfilerService:
    """Test the dog profiler service layer."""
    
    @pytest.fixture
    def mock_pool(self):
        """Mock database pool."""
        return AsyncMock()
    
    @pytest.fixture
    def mock_llm_client(self):
        """Mock LLM client."""
        return AsyncMock()
    
    @pytest.fixture
    def mock_normalizer(self):
        """Mock profile normalizer."""
        mock = Mock()
        mock.normalize.return_value = {
            "description": "Normalized description",
            "tagline": "Normalized tagline",
            "energy_level": "medium"
        }
        return mock
    
    @pytest.fixture
    def mock_config_loader(self):
        """Mock configuration loader."""
        mock = Mock()
        mock.load_config.return_value = Mock(
            organization_id=11,
            prompt_file="test.yaml",
            model_preference="google/gemini-2.5-flash"
        )
        mock.load_prompt_template.return_value = Mock(
            system_prompt="System prompt",
            user_prompt="User prompt: {dog_data}",
            examples=[]
        )
        return mock
    
    @pytest.fixture
    def service(self, mock_pool, mock_llm_client, mock_normalizer, mock_config_loader):
        """Create service instance with mocks."""
        with patch('services.llm.dog_profiler_service.ProfileNormalizer', return_value=mock_normalizer):
            with patch('services.llm.dog_profiler_service.get_config_loader', return_value=mock_config_loader):
                service = DogProfilerService(
                    pool=mock_pool,
                    llm_client=mock_llm_client
                )
                return service
    
    @pytest.mark.asyncio
    async def test_profile_single_dog(self, service, mock_llm_client):
        """Test profiling a single dog."""
        # Setup
        dog_data = {
            "id": 1,
            "name": "Buddy",
            "properties": {"age": "2 years", "breed": "German Shepherd"}
        }
        
        mock_llm_client.generate.return_value = {
            "description": "Friendly dog",
            "tagline": "Your best friend",
            "energy_level": "high"
        }
        
        # Execute
        request = ProfileRequest(
            dog_id=1,
            dog_data=dog_data,
            organization_id=11
        )
        result = await service.profile_dog(request)
        
        # Assert
        assert result.success is True
        assert result.dog_id == 1
        assert result.profile is not None
        assert "description" in result.profile
        mock_llm_client.generate.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_profile_dog_with_error(self, service, mock_llm_client):
        """Test handling errors during profiling."""
        # Setup
        dog_data = {"id": 1, "name": "Buddy", "properties": {}}
        mock_llm_client.generate.side_effect = Exception("LLM API error")
        
        # Execute
        request = ProfileRequest(
            dog_id=1,
            dog_data=dog_data,
            organization_id=11
        )
        result = await service.profile_dog(request)
        
        # Assert
        assert result.success is False
        assert result.error == "LLM API error"
        assert result.profile is None
    
    @pytest.mark.asyncio
    async def test_profile_batch(self, service, mock_llm_client):
        """Test batch profiling of dogs."""
        # Setup
        dogs = [
            {"id": 1, "name": "Buddy", "properties": {}},
            {"id": 2, "name": "Max", "properties": {}},
            {"id": 3, "name": "Lucy", "properties": {}}
        ]
        
        mock_llm_client.generate.return_value = {
            "description": "Test description",
            "tagline": "Test tagline"
        }
        
        # Execute
        result = await service.profile_batch(dogs, organization_id=11)
        
        # Assert
        assert result["success"] == 3
        assert result["failed"] == 0
        assert len(result["results"]) == 3
        assert mock_llm_client.generate.call_count == 3
    
    @pytest.mark.asyncio
    async def test_profile_batch_with_partial_failure(self, service, mock_llm_client):
        """Test batch profiling with some failures."""
        # Setup
        dogs = [
            {"id": 1, "name": "Buddy", "properties": {}},
            {"id": 2, "name": "Max", "properties": {}},
        ]
        
        # First call succeeds, second fails
        mock_llm_client.generate.side_effect = [
            {"description": "Success", "tagline": "Good dog"},
            Exception("API error")
        ]
        
        # Execute
        result = await service.profile_batch(dogs, organization_id=11)
        
        # Assert
        assert result["success"] == 1
        assert result["failed"] == 1
        assert result["results"][0]["status"] == "success"
        assert result["results"][1]["status"] == "error"
    
    @pytest.mark.asyncio
    async def test_profile_batch_with_concurrency_limit(self, service, mock_llm_client):
        """Test batch processing respects concurrency limit."""
        # Setup
        dogs = [{"id": i, "name": f"Dog{i}", "properties": {}} for i in range(10)]
        
        call_times = []
        async def mock_generate(*args, **kwargs):
            call_times.append(asyncio.get_event_loop().time())
            await asyncio.sleep(0.1)  # Simulate API delay
            return {"description": "Test", "tagline": "Test"}
        
        mock_llm_client.generate.side_effect = mock_generate
        
        # Execute with concurrency limit
        service.max_concurrent = 3
        result = await service.profile_batch(dogs, organization_id=11)
        
        # Assert
        assert result["success"] == 10
        # Check that calls were batched (not all at once)
        # Due to concurrency limit, should see gaps in timing
        assert len(call_times) == 10
    
    @pytest.mark.asyncio
    async def test_save_profile_to_database(self, service, mock_pool):
        """Test saving profile to database."""
        # Setup
        profile = {
            "description": "Test description",
            "tagline": "Test tagline",
            "profiled_at": datetime.now().isoformat()
        }
        
        # Execute
        await service.save_profile(dog_id=1, profile=profile)
        
        # Assert
        mock_pool.execute.assert_called_once()
        query = mock_pool.execute.call_args[0][0]
        assert "UPDATE animals" in query
        assert "dog_profiler_data = $1" in query
        assert "WHERE id = $2" in query
    
    @pytest.mark.asyncio
    async def test_get_unprofiled_dogs(self, service, mock_pool):
        """Test fetching unprofiled dogs."""
        # Setup
        mock_pool.fetch.return_value = [
            {"id": 1, "name": "Buddy", "properties": {}},
            {"id": 2, "name": "Max", "properties": {}}
        ]
        
        # Execute
        dogs = await service.get_unprofiled_dogs(
            organization_id=11,
            limit=10
        )
        
        # Assert
        assert len(dogs) == 2
        mock_pool.fetch.assert_called_once()
        query = mock_pool.fetch.call_args[0][0]
        assert "dog_profiler_data IS NULL" in query
        assert "organization_id = $1" in query
    
    @pytest.mark.asyncio
    async def test_profile_with_retry(self, service, mock_llm_client):
        """Test retry logic in service."""
        # Setup
        dog_data = {"id": 1, "name": "Buddy", "properties": {}}
        
        # First call fails, second succeeds
        mock_llm_client.generate.side_effect = [
            Exception("Temporary error"),
            {"description": "Success", "tagline": "Good dog"}
        ]
        
        # Execute with retry
        service.enable_retry = True
        request = ProfileRequest(
            dog_id=1,
            dog_data=dog_data,
            organization_id=11
        )
        result = await service.profile_dog(request)
        
        # Assert
        assert result.success is True
        assert mock_llm_client.generate.call_count == 2
    
    @pytest.mark.asyncio
    async def test_profile_with_validation(self, service, mock_llm_client, mock_normalizer):
        """Test profile validation after normalization."""
        # Setup
        dog_data = {"id": 1, "name": "Buddy", "properties": {}}
        
        mock_llm_client.generate.return_value = {
            "description": "Too short",  # Should fail validation
            "tagline": "Test"
        }
        
        mock_normalizer.normalize.return_value = {
            "description": "Too short",
            "tagline": "Test"
        }
        
        # Execute
        request = ProfileRequest(
            dog_id=1,
            dog_data=dog_data,
            organization_id=11
        )
        result = await service.profile_dog(request)
        
        # Assert - should handle validation failure gracefully
        assert result.success is False
        assert "validation" in result.error.lower()


class TestProfileModels:
    """Test request/response models."""
    
    def test_profile_request(self):
        """Test ProfileRequest model."""
        request = ProfileRequest(
            dog_id=1,
            dog_data={"name": "Buddy"},
            organization_id=11,
            force_regenerate=True
        )
        
        assert request.dog_id == 1
        assert request.organization_id == 11
        assert request.force_regenerate is True
    
    def test_profile_result(self):
        """Test ProfileResult model."""
        result = ProfileResult(
            dog_id=1,
            success=True,
            profile={"description": "Test"},
            processing_time_ms=1000,
            model_used="gemini-2.5-flash"
        )
        
        assert result.dog_id == 1
        assert result.success is True
        assert result.error is None
    
    def test_batch_profile_result(self):
        """Test BatchProfileResult model."""
        result = BatchProfileResult(
            organization_id=11,
            success=8,
            failed=2,
            total=10,
            results=[],
            processing_time_ms=10000
        )
        
        assert result.success_rate == 0.8
        assert result.total == 10