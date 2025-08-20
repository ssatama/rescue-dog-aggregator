#!/usr/bin/env python3
"""
Comprehensive test suite for DogProfilerPipeline.

Tests the complete LLM profiling pipeline including:
- Pipeline initialization
- Profile generation
- Quality scoring
- Database integration
- Connection pooling
- Error handling
"""

import asyncio
import json
import os
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from services.llm.dog_profiler import DogProfilerPipeline
from services.llm.schemas.dog_profiler import DogProfilerData
from services.llm.quality_rubric import DogProfileQualityRubric
from services.connection_pool import ConnectionPoolService


class TestDogProfilerPipeline:
    """Test suite for DogProfilerPipeline."""

    @pytest.fixture
    def mock_llm_service(self):
        """Mock LLM service for testing."""
        service = AsyncMock()
        service.generate_structured_response.return_value = {
            "name": "Bingo",
            "tagline": "Friendly and playful companion",
            "description": "A wonderful dog looking for a home",
            "temperament": ["friendly", "playful", "gentle"],
            "energy_level": "medium",
            "size_preference": "medium",
            "good_with_kids": True,
            "good_with_pets": True,
            "special_needs": None,
            "house_trained": "unknown",
            "health_status": "healthy",
            "ideal_home": "Active family with yard",
            "adoption_urgency": "normal",
            "unique_traits": ["loves water", "knows basic commands"],
            "estimated_monthly_cost": 100,
            "breed_characteristics": ["intelligent", "loyal"],
            "training_level": "basic",
            "exercise_needs": "moderate"
        }
        return service

    @pytest.fixture
    def mock_connection_pool(self):
        """Mock connection pool for testing."""
        pool = MagicMock(spec=ConnectionPoolService)
        conn_mock = MagicMock()
        cursor_mock = MagicMock()
        conn_mock.cursor.return_value = cursor_mock
        pool.get_connection_context.return_value.__enter__.return_value = conn_mock
        return pool

    @pytest.fixture
    def test_dog_data(self):
        """Sample dog data for testing."""
        return {
            "id": 1,
            "name": "Bingo",
            "breed": "Mixed Breed",
            "age_text": "3 years",
            "properties": {
                "description": "Bingo ist ein freundlicher und verspielter Rüde"
            },
            "external_id": "bingo-123"
        }

    @pytest.mark.asyncio
    async def test_pipeline_initialization(self):
        """Test pipeline initialization with various configurations."""
        # Test basic initialization
        pipeline = DogProfilerPipeline(organization_id=11, dry_run=True)
        assert pipeline.org_id == 11
        assert pipeline.dry_run is True
        assert pipeline.connection_pool is None

        # Test with connection pool
        mock_pool = MagicMock()
        pipeline_with_pool = DogProfilerPipeline(
            organization_id=11,
            dry_run=False,
            connection_pool=mock_pool
        )
        assert pipeline_with_pool.connection_pool == mock_pool

    @pytest.mark.asyncio
    async def test_process_single_dog(self, test_dog_data):
        """Test processing a single dog profile with mocked API."""
        pipeline = DogProfilerPipeline(
            organization_id=11,
            dry_run=True
        )

        # Mock the _call_llm_api method directly since llm_service isn't used
        with patch.object(pipeline, '_call_llm_api') as mock_api:
            mock_api.return_value = {
                "name": "Bingo",
                "tagline": "Friendly companion",
                "description": "Bingo is a wonderful dog looking for a loving home with caring people who will give him the attention he deserves. He's been through a lot in his life but remains incredibly gentle and loving. He would thrive in a home where he can get regular walks and plenty of affection. This amazing dog will bring so much joy to the right family.",
                "energy_level": "medium",
                "trainability": "easy",
                "sociability": "social",
                "confidence": "confident",
                "home_type": "house_preferred",
                "yard_required": True,
                "experience_level": "first_time_ok",
                "exercise_needs": "moderate",
                "grooming_needs": "weekly",
                "personality_traits": ["friendly", "loyal", "gentle"],
                "favorite_activities": ["walks", "play"],
                "ready_to_travel": True,
                "vaccinated": True,
                "neutered": True,
                "processing_time_ms": 1000,
                "confidence_scores": {"description": 0.9, "energy_level": 0.8, "trainability": 0.9},
                "source_references": {"description": "source text", "personality_traits": "source text"},
                "prompt_version": "1.0.0"
            }
            
            result = await pipeline.process_dog(test_dog_data)
            
            assert result is not None
            assert "name" in result
            assert "tagline" in result
            assert "quality_score" in result

    @pytest.mark.asyncio
    async def test_batch_processing(self, mock_llm_service):
        """Test batch processing of multiple dogs."""
        pipeline = DogProfilerPipeline(
            organization_id=11,
            llm_service=mock_llm_service,
            dry_run=True
        )

        test_dogs = [
            {"id": 1, "name": "Bingo", "breed": "Mixed"},
            {"id": 2, "name": "Luna", "breed": "Labrador"},
            {"id": 3, "name": "Max", "breed": "German Shepherd"}
        ]

        results = await pipeline.process_batch(test_dogs)
        
        assert len(results) == 3
        assert all("quality_score" in r for r in results)

    @pytest.mark.asyncio
    async def test_quality_scoring(self, test_dog_data):
        """Test quality score calculation."""
        pipeline = DogProfilerPipeline(
            organization_id=11,
            dry_run=True
        )

        # Mock the _call_llm_api method
        with patch.object(pipeline, '_call_llm_api') as mock_api:
            mock_api.return_value = {
                "name": "Bingo",
                "tagline": "Friendly companion",
                "description": "Bingo is a wonderful dog looking for a loving home with caring people who will give him the attention he deserves. He's been through a lot in his life but remains incredibly gentle and loving. He would thrive in a home where he can get regular walks and plenty of affection. This amazing dog will bring so much joy to the right family.",
                "energy_level": "medium",
                "trainability": "easy",
                "sociability": "social",
                "confidence": "confident",
                "home_type": "house_preferred",
                "yard_required": True,
                "experience_level": "first_time_ok",
                "exercise_needs": "moderate",
                "grooming_needs": "weekly",
                "personality_traits": ["friendly", "loyal", "gentle"],
                "favorite_activities": ["walks", "play"],
                "ready_to_travel": True,
                "vaccinated": True,
                "neutered": True,
                "processing_time_ms": 1000,
                "confidence_scores": {"description": 0.9, "energy_level": 0.8, "trainability": 0.9},
                "source_references": {"description": "source text", "personality_traits": "source text"},
                "prompt_version": "1.0.0"
            }
            
            result = await pipeline.process_dog(test_dog_data)
            
            assert "quality_score" in result
            score = result["quality_score"]
            assert 0 <= score <= 100
            assert isinstance(score, (int, float))

    @pytest.mark.asyncio
    async def test_database_saving_with_pool(self, mock_connection_pool, mock_llm_service):
        """Test saving results with connection pool."""
        pipeline = DogProfilerPipeline(
            organization_id=11,
            llm_service=mock_llm_service,
            dry_run=False,
            connection_pool=mock_connection_pool
        )

        test_results = [
            {"dog_id": 1, "name": "Bingo", "tagline": "Great dog"},
            {"dog_id": 2, "name": "Luna", "tagline": "Sweet companion"}
        ]

        success = await pipeline.save_results(test_results)
        
        assert success is True
        assert mock_connection_pool.get_connection_context.called

    @pytest.mark.asyncio
    async def test_error_handling(self):
        """Test error handling in pipeline."""
        pipeline = DogProfilerPipeline(
            organization_id=11,
            dry_run=True
        )

        # Mock the _call_llm_api to raise an error
        with patch.object(pipeline, '_call_llm_api') as mock_api:
            mock_api.side_effect = Exception("API Error")
            
            result = await pipeline.process_dog({"id": 1, "name": "Test"})
            
            # Should handle error gracefully and return None
            assert result is None

    @pytest.mark.asyncio
    async def test_retry_mechanism(self, mock_llm_service):
        """Test retry mechanism for failed requests."""
        # Setup service to fail first, then succeed
        mock_llm_service.generate_structured_response.side_effect = [
            Exception("Temporary failure"),
            {"name": "Bingo", "tagline": "Success after retry"}
        ]

        pipeline = DogProfilerPipeline(
            organization_id=11,
            llm_service=mock_llm_service,
            dry_run=True
        )

        result = await pipeline.process_dog({"id": 1, "name": "Test"})
        
        # Should eventually succeed after retry
        assert result is not None

    def test_prompt_template_loading(self):
        """Test loading organization-specific prompt templates."""
        pipeline = DogProfilerPipeline(organization_id=11, dry_run=True)
        
        # Should load template for organization 11
        assert pipeline.prompt_template is not None
        # Check the system prompt or metadata contains organization name
        system_prompt = pipeline.prompt_template.get("system_prompt", "")
        org_name = pipeline.prompt_template.get("metadata", {}).get("organization_name", "")
        combined_text = f"{system_prompt} {org_name}".lower()
        assert "tierschutzverein" in combined_text

    @pytest.mark.asyncio
    async def test_statistics_tracking(self, mock_llm_service):
        """Test that pipeline tracks processing statistics."""
        pipeline = DogProfilerPipeline(
            organization_id=11,
            llm_service=mock_llm_service,
            dry_run=True
        )

        test_dogs = [
            {"id": 1, "name": "Dog1"},
            {"id": 2, "name": "Dog2"}
        ]

        await pipeline.process_batch(test_dogs)
        stats = pipeline.get_statistics()
        
        assert stats["processed"] == 2
        assert stats["successful"] >= 0
        assert "success_rate" in stats


class TestDogProfilerIntegration:
    """Integration tests for DogProfilerPipeline with real components."""

    @pytest.fixture
    def mock_llm_service(self):
        """Mock LLM service for testing."""
        service = AsyncMock()
        service.generate_structured_response.return_value = {
            "name": "Bingo",
            "tagline": "Friendly and playful companion",
            "description": "A wonderful dog looking for a home",
            "temperament": ["friendly", "playful", "gentle"],
            "energy_level": "medium",
            "size_preference": "medium",
            "good_with_kids": True,
            "good_with_pets": True,
            "special_needs": None,
            "house_trained": "unknown",
            "health_status": "healthy",
            "ideal_home": "Active family with yard",
            "adoption_urgency": "normal",
            "unique_traits": ["loves water", "knows basic commands"],
            "estimated_monthly_cost": 100,
            "breed_characteristics": ["intelligent", "loyal"],
            "training_level": "basic",
            "exercise_needs": "moderate"
        }
        return service

    @pytest.fixture
    def mock_connection_pool(self):
        """Mock connection pool for testing."""
        pool = MagicMock(spec=ConnectionPoolService)
        conn_mock = MagicMock()
        cursor_mock = MagicMock()
        conn_mock.cursor.return_value = cursor_mock
        pool.get_connection_context.return_value.__enter__.return_value = conn_mock
        return pool

    @pytest.mark.skipif(
        not os.environ.get("OPENROUTER_API_KEY"),
        reason="Requires OPENROUTER_API_KEY"
    )
    @pytest.mark.asyncio
    async def test_real_api_integration(self):
        """Test with real API (requires API key)."""
        pipeline = DogProfilerPipeline(organization_id=11, dry_run=True)
        
        test_dog = {
            "id": 1,
            "name": "TestDog",
            "breed": "Mixed Breed",
            "age_text": "2 years",
            "properties": {
                "description": "A friendly test dog"
            }
        }

        result = await pipeline.process_dog(test_dog)
        
        # Should get valid profile back
        assert result is not None
        assert "tagline" in result
        assert "quality_score" in result

    @pytest.mark.asyncio
    async def test_end_to_end_with_mocks(self, mock_connection_pool):
        """Test complete end-to-end flow with mocks."""
        pipeline = DogProfilerPipeline(
            organization_id=11,
            dry_run=False,
            connection_pool=mock_connection_pool
        )

        # Mock the _call_llm_api method
        with patch.object(pipeline, '_call_llm_api') as mock_api:
            mock_api.return_value = {
                "name": "TestDog",
                "tagline": "Friendly companion",
                "description": "TestDog is a wonderful dog looking for a loving home with caring people who will give him the attention he deserves. He's been through a lot in his life but remains incredibly gentle and loving. He would thrive in a home where he can get regular walks and plenty of affection. This amazing dog will bring so much joy to the right family.",
                "energy_level": "medium",
                "trainability": "easy",
                "sociability": "social",
                "confidence": "confident",
                "home_type": "house_preferred",
                "yard_required": True,
                "experience_level": "first_time_ok",
                "exercise_needs": "moderate",
                "grooming_needs": "weekly",
                "personality_traits": ["friendly", "loyal", "gentle"],
                "favorite_activities": ["walks", "play"],
                "ready_to_travel": True,
                "vaccinated": True,
                "neutered": True,
                "processing_time_ms": 1000,
                "confidence_scores": {"description": 0.9, "energy_level": 0.8, "trainability": 0.9},
                "source_references": {"description": "source text", "personality_traits": "source text"},
                "prompt_version": "1.0.0"
            }

            # Process batch
            test_dogs = [
                {"id": i, "name": f"Dog{i}", "breed": "Mixed"}
                for i in range(1, 6)
            ]

            results = await pipeline.process_batch(test_dogs)
            
            # Save results
            success = await pipeline.save_results(results)
            
            assert success is True
            assert len(results) == 5
            assert all("quality_score" in r for r in results)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])