#!/usr/bin/env python3
"""
Integration module for adding LLM profiling to scrapers.
Follows existing patterns from BaseScraper for seamless integration.
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List

from services.llm.dog_profiler import DogProfilerPipeline


logger = logging.getLogger(__name__)


class ScraperLLMIntegration:
    """
    Add LLM profiling capabilities to any scraper.
    Designed to work with existing BaseScraper pattern.
    """
    
    def __init__(self, organization_id: int, enabled: bool = True):
        """
        Initialize LLM integration for a scraper.
        
        Args:
            organization_id: Organization ID for scraper
            enabled: Whether LLM profiling is enabled
        """
        self.organization_id = organization_id
        self.enabled = enabled
        self.pipeline = None
        
        if self.enabled:
            try:
                self.pipeline = DogProfilerPipeline(
                    organization_id=organization_id,
                    dry_run=False
                )
                logger.info(f"LLM profiling enabled for organization {organization_id}")
            except Exception as e:
                logger.warning(f"Failed to initialize LLM pipeline: {e}")
                self.enabled = False
    
    def should_profile(self, animal_data: Dict[str, Any]) -> bool:
        """
        Determine if an animal should be profiled.
        
        Args:
            animal_data: Animal data dictionary
            
        Returns:
            True if animal should be profiled
        """
        if not self.enabled or not self.pipeline:
            return False
        
        # Don't profile if already has profiler data
        if animal_data.get('dog_profiler_data'):
            return False
        
        # Only profile dogs (not cats, etc.)
        animal_type = animal_data.get('animal_type', 'dog').lower()
        if animal_type != 'dog':
            return False
        
        # Need at least name and some properties
        if not animal_data.get('name'):
            return False
        
        # Check if we have meaningful content to profile
        properties = animal_data.get('properties', {})
        if not properties or not isinstance(properties, dict):
            return False
        
        # Check for description in properties
        has_content = any(
            key in properties and properties[key]
            for key in ['description', 'Beschreibung', 'details', 'info']
        )
        
        return has_content
    
    async def profile_animal(self, animal_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Profile a single animal using LLM.
        
        Args:
            animal_data: Animal data dictionary
            
        Returns:
            Profile data or None if failed
        """
        if not self.should_profile(animal_data):
            return None
        
        try:
            # Prepare data for profiler
            profile_input = {
                'id': animal_data.get('id'),
                'name': animal_data.get('name'),
                'breed': animal_data.get('breed', 'Mixed Breed'),
                'age_text': animal_data.get('age_text', 'Unknown'),
                'properties': animal_data.get('properties', {}),
                'external_id': animal_data.get('external_id')
            }
            
            # Call profiler pipeline
            profile_data = await self.pipeline.process_dog(profile_input)
            
            if profile_data:
                logger.info(f"Successfully profiled: {animal_data.get('name')}")
                return profile_data
            else:
                logger.warning(f"Failed to profile: {animal_data.get('name')}")
                return None
                
        except Exception as e:
            logger.error(f"Error profiling {animal_data.get('name')}: {e}")
            return None
    
    def profile_batch(self, animals: List[Dict[str, Any]], max_batch: int = 5) -> List[Dict[str, Any]]:
        """
        Profile a batch of animals synchronously.
        
        Args:
            animals: List of animal data dictionaries
            max_batch: Maximum batch size for concurrent processing
            
        Returns:
            List of animals with profile data added
        """
        if not self.enabled or not self.pipeline:
            return animals
        
        # Filter animals that need profiling
        to_profile = [a for a in animals if self.should_profile(a)]
        
        if not to_profile:
            logger.info("No animals need profiling")
            return animals
        
        logger.info(f"Profiling {len(to_profile)} animals")
        
        # Process in batches
        async def process_batch():
            results = []
            for i in range(0, len(to_profile), max_batch):
                batch = to_profile[i:i + max_batch]
                tasks = [self.profile_animal(animal) for animal in batch]
                batch_results = await asyncio.gather(*tasks)
                results.extend(zip(batch, batch_results))
            return results
        
        # Run async processing
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            profiled_results = loop.run_until_complete(process_batch())
        finally:
            loop.close()
        
        # Update animals with profile data
        profile_map = {}
        for animal, profile in profiled_results:
            if profile:
                profile_map[animal.get('external_id', animal.get('name'))] = profile
        
        # Add profile data to animals
        for animal in animals:
            key = animal.get('external_id', animal.get('name'))
            if key in profile_map:
                animal['dog_profiler_data'] = profile_map[key]
        
        success_count = len(profile_map)
        logger.info(f"Successfully profiled {success_count}/{len(to_profile)} animals")
        
        return animals
    
    def integrate_with_scraper(self, scraper_instance):
        """
        Monkey-patch a scraper instance to add LLM profiling.
        
        Args:
            scraper_instance: Instance of a scraper (must have save_animal method)
        """
        # Store original save_animal method
        original_save = scraper_instance.save_animal
        
        # Create wrapped version
        def save_with_profiling(animal_data):
            # Profile if needed (run synchronously)
            if self.should_profile(animal_data):
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    profile = loop.run_until_complete(self.profile_animal(animal_data))
                    if profile:
                        animal_data['dog_profiler_data'] = profile
                finally:
                    loop.close()
            
            # Call original save method
            return original_save(animal_data)
        
        # Replace method
        scraper_instance.save_animal = save_with_profiling
        logger.info(f"Integrated LLM profiling with {scraper_instance.__class__.__name__}")


def add_llm_profiling_to_scraper(scraper_class):
    """
    Class decorator to add LLM profiling to a scraper class.
    
    Usage:
        @add_llm_profiling_to_scraper
        class MyScraper(BaseScraper):
            ...
    """
    original_init = scraper_class.__init__
    original_collect = scraper_class.collect_data
    
    def new_init(self, *args, **kwargs):
        original_init(self, *args, **kwargs)
        # Add LLM integration
        org_id = getattr(self, 'organization_id', None)
        if org_id:
            self.llm_integration = ScraperLLMIntegration(
                organization_id=org_id,
                enabled=kwargs.get('enable_llm_profiling', False)
            )
        else:
            self.llm_integration = None
    
    def new_collect(self):
        # Get original data
        animals = original_collect(self)
        
        # Add LLM profiling if enabled
        if self.llm_integration and self.llm_integration.enabled:
            animals = self.llm_integration.profile_batch(animals)
        
        return animals
    
    scraper_class.__init__ = new_init
    scraper_class.collect_data = new_collect
    
    return scraper_class