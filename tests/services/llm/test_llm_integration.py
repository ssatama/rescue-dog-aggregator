"""
Integration tests for LLM profiling system.

Following CLAUDE.md principles:
- TDD approach
- Integration testing
- Real component interactions
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
import json
from datetime import datetime

from services.llm.async_database_pool import AsyncDatabasePool, PoolConfig
from services.llm.dog_profiler_service import DogProfilerService
from services.llm.profile_normalizer import ProfileNormalizer
from services.llm.organization_config_loader import OrganizationConfigLoader
# from api.routes.profiler import router  # TODO: Create this route when API integration is needed


class TestLLMIntegration:
    """Integration tests for LLM profiling components."""
    
    @pytest.fixture
    def pool_config(self):
        """Create test pool configuration."""
        return PoolConfig(
            host="localhost",
            database="test_db",
            user="test",
            password="test",
            min_connections=1,
            max_connections=5
        )
    
    @pytest.fixture
    def mock_llm_response(self):
        """Mock LLM response data."""
        return {
            "description": "This is a wonderful, energetic dog who loves to play and explore. Very friendly with people.",
            "tagline": "Your energetic adventure companion",
            "energy_level": "very_energetic",
            "trainability": "easily_trainable",
            "good_with_children": "yes",
            "good_with_cats": "selective",
            "good_with_dogs": "yes",
            "personality_traits": ["friendly", "playful", "energetic", "curious"],
            "favorite_activities": ["fetch", "walks", "swimming"],
            "exercise_needs": "high",
            "grooming_needs": "weekly",
            "yard_required": True,
            "adoption_fee_euros": 350,
            "vaccinated": True,
            "neutered": True,
            "confidence_scores": {
                "description": 0.95,
                "energy_level": 0.9,
                "trainability": 0.85
            }
        }
    
    @pytest.mark.asyncio
    async def test_full_profiling_pipeline(self, pool_config, mock_llm_response):
        """Test complete profiling pipeline from request to database."""
        # Setup components
        with patch('asyncpg.create_pool', new_callable=AsyncMock) as mock_create:
            mock_pool_instance = AsyncMock()
            mock_create.return_value = mock_pool_instance
            
            # Initialize pool
            pool = AsyncDatabasePool(pool_config)
            await pool.initialize()
            
            # Mock LLM client
            mock_llm = AsyncMock()
            mock_llm.generate.return_value = mock_llm_response
            
            # Create service
            service = DogProfilerService(pool=pool, llm_client=mock_llm)
            
            # Profile a dog
            from services.llm.dog_profiler_service import ProfileRequest
            request = ProfileRequest(
                dog_id=123,
                dog_data={
                    "name": "Buddy",
                    "age": "2 years",
                    "breed": "German Shepherd Mix"
                },
                organization_id=11
            )
            
            result = await service.profile_dog(request)
            
            # Verify result
            assert result.success is True
            assert result.profile is not None
            assert result.profile["energy_level"] == "very_high"  # Normalized
            assert result.profile["trainability"] == "easy"  # Normalized
            assert len(result.profile["personality_traits"]) == 4
            assert result.profile["vaccinated"] is True
    
    @pytest.mark.asyncio
    async def test_batch_processing_with_concurrency(self):
        """Test batch processing respects concurrency limits."""
        # Setup
        dogs = [
            {"id": i, "name": f"Dog{i}", "properties": {}}
            for i in range(20)
        ]
        
        # Mock components
        mock_pool = AsyncMock()
        mock_llm = AsyncMock()
        
        # Track concurrent calls
        concurrent_count = 0
        max_concurrent_seen = 0
        
        async def mock_generate(*args, **kwargs):
            nonlocal concurrent_count, max_concurrent_seen
            concurrent_count += 1
            max_concurrent_seen = max(max_concurrent_seen, concurrent_count)
            await asyncio.sleep(0.05)  # Simulate processing
            concurrent_count -= 1
            return {
                "description": "Test dog description",
                "tagline": "Test tagline",
                "energy_level": "medium"
            }
        
        mock_llm.generate.side_effect = mock_generate
        
        # Create service with low concurrency
        service = DogProfilerService(
            pool=mock_pool,
            llm_client=mock_llm,
            max_concurrent=3
        )
        
        # Process batch
        result = await service.profile_batch(dogs, organization_id=11)
        
        # Verify
        assert result["success"] == 20
        assert result["failed"] == 0
        assert max_concurrent_seen <= 3  # Respected concurrency limit
    
    @pytest.mark.asyncio
    async def test_normalization_integration(self):
        """Test normalization integrates correctly with service."""
        # Setup raw LLM output with issues
        raw_output = {
            "description": "Short",  # Too short - should fail validation
            "tagline": "Test",
            "energy_level": "moderate",  # Needs mapping
            "personality_traits": ["friendly"],  # Too few
            "adoption_fee_euros": "null",  # String null
            "vaccinated": "yes"  # String boolean
        }
        
        # Mock components
        mock_pool = AsyncMock()
        mock_llm = AsyncMock()
        mock_llm.generate.return_value = raw_output
        
        # Create service
        service = DogProfilerService(pool=mock_pool, llm_client=mock_llm)
        
        # Attempt profile
        from services.llm.dog_profiler_service import ProfileRequest
        request = ProfileRequest(
            dog_id=1,
            dog_data={"name": "Test"},
            organization_id=11
        )
        
        result = await service.profile_dog(request)
        
        # Should fail validation due to short description
        assert result.success is False
        assert "validation" in result.error.lower()
    
    @pytest.mark.asyncio
    async def test_config_loader_integration(self):
        """Test config loader integrates with service."""
        # Setup
        mock_pool = AsyncMock()
        mock_llm = AsyncMock()
        mock_llm.generate.return_value = {
            "description": "This is a wonderful test dog profile",
            "tagline": "Great companion",
            "energy_level": "medium"
        }
        
        # Create custom config loader
        loader = OrganizationConfigLoader()
        
        # Create service with custom loader
        service = DogProfilerService(
            pool=mock_pool,
            llm_client=mock_llm,
            config_loader=loader
        )
        
        # Profile dog for different organizations
        from services.llm.dog_profiler_service import ProfileRequest
        
        # Organization 11 (German)
        request1 = ProfileRequest(
            dog_id=1,
            dog_data={"name": "Hund"},
            organization_id=11
        )
        result1 = await service.profile_dog(request1)
        
        # Organization 25 (English)
        request2 = ProfileRequest(
            dog_id=2,
            dog_data={"name": "Dog"},
            organization_id=25
        )
        result2 = await service.profile_dog(request2)
        
        # Both should succeed with different configs
        assert result1.success is True
        assert result2.success is True
    
    @pytest.mark.asyncio
    async def test_error_handling_cascade(self):
        """Test error handling across components."""
        # Test database error
        mock_pool = AsyncMock()
        mock_pool.fetch.side_effect = Exception("Database connection lost")
        
        mock_llm = AsyncMock()
        
        service = DogProfilerService(pool=mock_pool, llm_client=mock_llm)
        
        # Try to get unprofiled dogs
        with pytest.raises(Exception, match="Database connection lost"):
            await service.get_unprofiled_dogs(organization_id=11)
        
        # Test LLM error with retry
        mock_pool2 = AsyncMock()
        mock_llm2 = AsyncMock()
        mock_llm2.generate.side_effect = [
            Exception("API rate limit"),
            Exception("API still limited")
        ]
        
        service2 = DogProfilerService(
            pool=mock_pool2,
            llm_client=mock_llm2,
            enable_retry=True
        )
        
        from services.llm.dog_profiler_service import ProfileRequest
        request = ProfileRequest(
            dog_id=1,
            dog_data={"name": "Test"},
            organization_id=11
        )
        
        result = await service2.profile_dog(request)
        assert result.success is False
        assert "API still limited" in result.error
    
    @pytest.mark.asyncio
    async def test_database_pool_lifecycle(self, pool_config):
        """Test database pool initialization and cleanup."""
        with patch('asyncpg.create_pool', new_callable=AsyncMock) as mock_create:
            mock_pool_instance = AsyncMock()
            mock_connection = AsyncMock()
            
            # Setup mock pool acquire context manager
            mock_pool_instance.acquire.return_value.__aenter__.return_value = mock_connection
            mock_pool_instance.acquire.return_value.__aexit__.return_value = None
            mock_connection.fetch.return_value = []
            
            mock_create.return_value = mock_pool_instance
            
            # Initialize
            pool = AsyncDatabasePool(pool_config)
            await pool.initialize()
            
            mock_create.assert_called_once()
            assert pool.pool is not None
            
            # Use pool
            result = await pool.fetch("SELECT 1")
            assert result == []
            mock_connection.fetch.assert_called_once()
            
            # Close
            await pool.close()
            mock_pool_instance.close.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_service_with_real_normalizer(self):
        """Test service with real normalizer component."""
        # Setup
        mock_pool = AsyncMock()
        mock_llm = AsyncMock()
        
        # Return raw data that needs normalization
        mock_llm.generate.return_value = {
            "description": "This is a great family dog with lots of energy",
            "tagline": "Perfect family companion",
            "energy_level": "very_energetic",  # Needs mapping
            "trainability": "easily_trainable",  # Needs mapping
            "personality_traits": ["friendly", "loyal"],  # Needs padding
            "adoption_fee_euros": "450",  # String number
            "vaccinated": "true"  # String boolean
        }
        
        # Use real normalizer
        normalizer = ProfileNormalizer()
        service = DogProfilerService(
            pool=mock_pool,
            llm_client=mock_llm,
            normalizer=normalizer
        )
        
        # Profile dog
        from services.llm.dog_profiler_service import ProfileRequest
        request = ProfileRequest(
            dog_id=1,
            dog_data={"name": "Max"},
            organization_id=11
        )
        
        result = await service.profile_dog(request)
        
        # Verify normalization happened
        assert result.success is True
        assert result.profile["energy_level"] == "very_high"
        assert result.profile["trainability"] == "easy"
        assert len(result.profile["personality_traits"]) >= 3
        assert result.profile["adoption_fee_euros"] == 450
        assert result.profile["vaccinated"] is True


class TestComponentInteractions:
    """Test interactions between components."""
    
    def test_normalizer_with_custom_rules(self):
        """Test normalizer can use custom rules."""
        from services.llm.profile_normalizer import NormalizationRules
        
        custom_rules = NormalizationRules(
            energy_mappings={"super_high": "very_high"},
            default_values={"energy_level": "low"}
        )
        
        normalizer = ProfileNormalizer(rules=custom_rules)
        
        # Test custom mapping
        assert normalizer.normalize_energy_level("super_high") == "very_high"
        assert normalizer.normalize_energy_level("unknown") == "low"
    
    def test_config_loader_caching(self):
        """Test config loader caches properly."""
        loader = OrganizationConfigLoader()
        
        # Load twice
        config1 = loader.load_config(11)
        config2 = loader.load_config(11)
        
        # Should be same instance (cached)
        assert config1 is config2
        
        # Clear cache
        loader.reload()
        
        # Load again
        config3 = loader.load_config(11)
        
        # Should be different instance (cache cleared)
        assert config1 is not config3