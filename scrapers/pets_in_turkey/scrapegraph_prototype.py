"""
ScrapegraphAI Integration for Rescue Dog Aggregator
This module provides a drop-in replacement for traditional scrapers using LLM-powered extraction
"""

import logging
import os
from datetime import datetime
from typing import Dict, List, Optional

from dotenv import load_dotenv
from scrapegraphai.graphs import SmartScraperGraph

from scrapers.base_scraper import BaseScraper

# Load environment variables
load_dotenv()


class ScrapegraphBaseScraper(BaseScraper):
    """
    Base class for ScrapegraphAI-powered scrapers.
    Inherits from your existing BaseScraper to maintain compatibility.
    """

    def __init__(self, config_id: str):
        super().__init__(config_id=config_id)

        # Get API key from environment
        self.api_key = os.getenv("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY not found in environment variables")

        # Default LLM configuration
        self.llm_config = {
            "api_key": self.api_key,
            "model": "anthropic/claude-3-7-sonnet-latest",
            "temperature": 0,
            "max_tokens": 8192,
        }

        # Default extraction prompt (can be overridden by subclasses)
        self.extraction_prompt = """
        Extract all animals available for adoption from this page.
        For each animal, extract all available information including:
        - Name
        - Species/Type
        - Breed
        - Age
        - Sex/Gender
        - Size/Weight
        - Health status (neutered/spayed, vaccinated, etc.)
        - Personality description
        - Special needs or requirements
        - Adoption status
        - Photos/Images
        - Any unique identifiers
        
        Return complete information for ALL animals found.
        """

    def collect_data(self) -> List[Dict]:
        """
        Collect animal data using ScrapegraphAI.
        This replaces the traditional Selenium-based scraping.
        """
        try:
            self.logger.info(f"Starting ScrapegraphAI extraction from {self.base_url}")

            # Create graph configuration
            graph_config = {
                "llm": self.llm_config,
                "verbose": True,
                "headless": True,  # Run headless in production
            }

            # Initialize the smart scraper
            smart_scraper = SmartScraperGraph(
                prompt=self.extraction_prompt, source=self.base_url, config=graph_config
            )

            # Run extraction
            self.logger.info("Running LLM-powered extraction...")
            result = smart_scraper.run()

            # Process results through the existing pipeline
            animals_data = self._process_llm_results(result)

            self.logger.info(f"Successfully extracted {len(animals_data)} animals")
            return animals_data

        except Exception as e:
            self.logger.error(f"Error during ScrapegraphAI extraction: {e}")
            return []

    def _process_llm_results(self, result: any) -> List[Dict]:
        """
        Process raw LLM extraction results into standardized format.
        Override this method in subclasses for organization-specific processing.
        """
        animals = []

        # Handle different result formats
        if isinstance(result, list):
            raw_animals = result
        elif isinstance(result, dict):
            # Try common keys
            raw_animals = (
                result.get("animals")
                or result.get("dogs")
                or result.get("cats")
                or result.get("data")
                or result.get("results")
                or [result]
            )
        else:
            raw_animals = []

        # Process each animal
        for animal in raw_animals:
            if isinstance(animal, dict):
                processed = self._normalize_animal_data(animal)
                if processed:
                    animals.append(processed)

        return animals

    def _normalize_animal_data(self, data: Dict) -> Optional[Dict]:
        """
        Normalize animal data to match your database schema.
        Override in subclasses for specific normalization needs.
        """
        # Basic normalization - override for specific organizations
        return {
            "name": data.get("name", "Unknown"),
            "species": data.get("species", "dog"),
            "breed": data.get("breed", "Mixed"),
            "age_text": data.get("age", "Unknown"),
            "sex": data.get("sex", data.get("gender", "Unknown")),
            "size": data.get("size", "Medium"),
            "description": data.get("description", ""),
            "status": "available",
            "external_id": self._generate_external_id(data),
            "primary_image_url": data.get("image_url", data.get("photo", "")),
            "properties": self._extract_properties(data),
            "scraped_at": datetime.now(),
        }

    def _generate_external_id(self, data: Dict) -> str:
        """Generate external ID for the animal"""
        name = data.get("name", "unknown")
        return f"{self.organization_id}-{name.lower().replace(' ', '-')}"

    def _extract_properties(self, data: Dict) -> Dict:
        """Extract additional properties"""
        return {
            "weight": data.get("weight", ""),
            "height": data.get("height", ""),
            "neutered_spayed": data.get(
                "neutered_spayed", data.get("neutered", "Unknown")
            ),
            "vaccinated": data.get("vaccinated", "Unknown"),
            "house_trained": data.get("house_trained", "Unknown"),
            "good_with_kids": data.get("good_with_kids", "Unknown"),
            "good_with_dogs": data.get("good_with_dogs", "Unknown"),
            "good_with_cats": data.get("good_with_cats", "Unknown"),
        }


class PetsInTurkeyScrapegraphScraper(ScrapegraphBaseScraper):
    """
    ScrapegraphAI implementation for Pets in Turkey.
    Drop-in replacement for the existing PetsInTurkeyScraper.
    """

    def __init__(self, config_id: str = "pets-in-turkey"):
        super().__init__(config_id=config_id)

        # Customize for Pets in Turkey
        self.base_url = "https://www.petsinturkey.org/dogs"

        # Specific extraction prompt for PIT website structure
        self.extraction_prompt = """
        Extract ALL dogs available for adoption from this Pets in Turkey page.
        
        For each dog section that starts with "I'm [Name]", extract:
        - Name (from the "I'm [Name]" pattern)
        - Breed (listed after name)
        - Age (in years or months)
        - Sex (Male or Female)
        - Weight (in kg)
        - Height at shoulder (in cm)
        - Neutered/Spayed status
        - Full description of personality and needs
        - Main photo URL
        - Any special requirements or medical needs
        
        Important: 
        - Make sure to capture EVERY dog on the page
        - The height often appears on a separate line after weight
        - Some dogs may have limited information - extract what's available
        
        Return as a structured list with all available information for each dog.
        """

    def _normalize_animal_data(self, data: Dict) -> Optional[Dict]:
        """Normalize data specifically for Pets in Turkey format"""

        # Skip if no name
        if not data.get("name"):
            return None

        normalized = {
            "name": data.get("name"),
            "species": "dog",
            "breed": data.get("breed", "Mixed Breed"),
            "age_text": data.get("age", "Unknown"),
            "sex": self._normalize_sex(data.get("sex", "")),
            "size": self._determine_size(data),
            "description": data.get("description", ""),
            "status": "available",
            "external_id": f"pit-{data.get('name', '').lower().replace(' ', '-')}",
            "primary_image_url": self._clean_image_url(
                data.get("photo", data.get("image_url", ""))
            ),
            "location": "Izmir, Turkey",
            "properties": {
                "weight": data.get("weight", ""),
                "height": data.get("height", ""),
                "neutered_spayed": data.get(
                    "neutered_spayed", data.get("neutered", "Unknown")
                ),
                "vaccinated": "Yes",  # PIT dogs are typically vaccinated
                "passport_ready": "Yes",  # PIT prepares EU passports
                "adoption_fee": "€450",  # Standard PIT adoption fee
            },
            "scraped_at": datetime.now(),
        }

        return normalized

    def _normalize_sex(self, sex: str) -> str:
        """Normalize sex values"""
        sex_lower = sex.lower()
        if "female" in sex_lower:
            return "Female"
        elif "male" in sex_lower:
            return "Male"
        return "Unknown"

    def _determine_size(self, data: Dict) -> str:
        """Determine size based on weight/height"""
        weight_str = str(data.get("weight", "")).lower()
        height_str = str(data.get("height", "")).lower()

        # Extract numeric values
        try:
            if "kg" in weight_str:
                weight = float(weight_str.replace("kg", "").strip())
                if weight < 10:
                    return "Small"
                elif weight < 25:
                    return "Medium"
                else:
                    return "Large"
        except:
            pass

        # Default to medium if can't determine
        return "Medium"

    def _clean_image_url(self, url: str) -> str:
        """Clean and validate image URLs"""
        if not url:
            return ""

        # Remove Wix image transformations to get original
        if "static.wixstatic.com" in url:
            # Pattern to extract original image
            import re

            match = re.search(
                r"(https://static\.wixstatic\.com/media/[^/]+\.[a-z]+)", url
            )
            if match:
                return match.group(1)

        return url


# Usage example
if __name__ == "__main__":
    # Example of how to use the new scraper
    logging.basicConfig(level=logging.INFO)

    # Create scraper instance
    scraper = PetsInTurkeyScrapegraphScraper()

    # Run extraction
    dogs = scraper.collect_data()

    # Display results
    print(f"\nExtracted {len(dogs)} dogs from Pets in Turkey")
    for dog in dogs[:3]:  # Show first 3
        print(f"\n- {dog['name']} ({dog['breed']})")
        print(f"  Age: {dog['age_text']}, Sex: {dog['sex']}")
        print(f"  {dog['description'][:100]}...")
