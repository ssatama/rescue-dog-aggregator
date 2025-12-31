"""Modernized scraper implementation for Pets in Turkey organization."""

import re
import time
from typing import Any, Dict, List
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

from scrapers.base_scraper import BaseScraper


class PetsInTurkeyScraper(BaseScraper):
    """Modernized scraper for Pets in Turkey organization.

    This scraper uses requests/BeautifulSoup for efficient extraction from
    the single-page dogs listing. Follows modern BaseScraper patterns.
    """

    def __init__(
        self,
        config_id: str = "pets-in-turkey",
        metrics_collector=None,
        session_manager=None,
        database_service=None,
    ):
        """Initialize Pets in Turkey scraper.

        Args:
            config_id: Configuration ID for Pets in Turkey
            metrics_collector: Optional metrics collector service
            session_manager: Optional session manager service
            database_service: Optional database service
        """
        super().__init__(
            config_id=config_id,
            metrics_collector=metrics_collector,
            session_manager=session_manager,
            database_service=database_service,
        )

        # Use config-driven URLs
        self.base_url = self.org_config.metadata.website_url.rstrip("/")
        self.listing_url = f"{self.base_url}/dogs"
        self.organization_name = "Pets in Turkey"

        # Log configuration values
        self.logger.info(f"Initialized with config: rate_limit_delay={self.rate_limit_delay}, " f"batch_size={self.batch_size}, skip_existing_animals={self.skip_existing_animals}")

    def collect_data(self) -> List[Dict[str, Any]]:
        """Collect dog data from the Pets in Turkey website.

        Returns:
            List of dog dictionaries with standardized data
        """
        dogs_data = []

        try:
            # Fetch the page with proper headers
            headers = {
                "User-Agent": "Mozilla/5.0 (compatible; RescueDogAggregator/1.0)",
                "Accept": "text/html,application/xhtml+xml",
                "Accept-Language": "en-US,en;q=0.9",
            }

            self.logger.info(f"Fetching dogs from {self.listing_url}")
            response = requests.get(self.listing_url, headers=headers, timeout=30)
            response.raise_for_status()

            # Parse with BeautifulSoup
            soup = BeautifulSoup(response.text, "html.parser")

            # Find all dog containers - they have "I'm" in the heading
            # Container is 2 levels up from the heading
            dog_sections = []
            for heading in soup.find_all(["h4", "h3", "h2"]):
                if "I'm " in heading.text:
                    # Go up 2 levels to get the container with all data
                    container = heading.parent
                    if container:
                        container = container.parent
                        if container:
                            # Verify this container has dog data
                            text = container.get_text()
                            # Check for ANY data indicator (more flexible)
                            if any(
                                marker in text
                                for marker in [
                                    "Breed",
                                    "Weight",
                                    "kg",
                                    "yo",
                                    "Male",
                                    "Female",
                                ]
                            ):
                                # Also check it's not too large (full page)
                                if len(text) < 1500:
                                    dog_sections.append(container)

            self.logger.info(f"Found {len(dog_sections)} dogs to process")

            # Process each dog section
            for idx, section in enumerate(dog_sections):
                try:
                    # Apply rate limiting
                    if idx > 0:
                        time.sleep(self.rate_limit_delay)

                    dog_data = self._extract_dog_data(section)
                    if dog_data and dog_data.get("name"):
                        # Apply standardization
                        dog_data = self._apply_standardization(dog_data)
                        dogs_data.append(dog_data)
                        self.logger.debug(f"Extracted dog {idx + 1}: {dog_data.get('name')}")

                except Exception as e:
                    self.logger.error(f"Error processing dog {idx + 1}: {e}")
                    continue

            self.logger.info(f"Successfully extracted {len(dogs_data)} dogs")

            # Record external IDs for stale detection before setting filtering stats
            for dog in dogs_data:
                if dog.get("external_id") and self.session_manager:
                    self.session_manager.record_found_animal(dog["external_id"])

            # Set filtering stats
            self.set_filtering_stats(len(dog_sections), len(dog_sections) - len(dogs_data))

        except Exception as e:
            self.logger.error(f"Error collecting dog data: {e}")
            import traceback

            self.logger.error(traceback.format_exc())

        return dogs_data

    def _extract_dog_data(self, section) -> Dict[str, Any]:
        """Extract data for a single dog from its section.

        Args:
            section: BeautifulSoup element containing dog information

        Returns:
            Dictionary with dog data
        """
        dog_data = {
            "name": "",
            "breed": "Mixed Breed",
            "age": "Unknown",
            "sex": "Unknown",
            "size": "Medium",
            "status": "available",
            "animal_type": "dog",
            "properties": {},
        }

        try:
            # Extract all text elements separately to preserve structure
            all_texts = []
            for element in section.descendants:
                if isinstance(element, str):
                    text = element.strip()
                    if text and text not in all_texts:
                        all_texts.append(text)

            # Extract name from "I'm X" pattern
            for text in all_texts:
                if text.startswith("I'm "):
                    name_match = re.search(r"I'm\s+(\w+)", text)
                    if name_match:
                        dog_data["name"] = name_match.group(1).strip()
                        break

            # Extract image
            img = section.find("img")
            if img and img.get("src"):
                dog_data["primary_image_url"] = self._clean_image_url(img["src"])

            # Extract "Ready to fly" or "Currently in" info as description
            for text in all_texts:
                if "Ready to fly" in text or "Currently in" in text:
                    dog_data["properties"]["description"] = text.strip()
                    break

            # Find the labels and values pattern
            # Labels are: Breed, Weight, Age, Sex, Neutered
            # Values come after "Adopt Me"
            adopt_me_index = -1
            breed_label_index = -1

            for i, text in enumerate(all_texts):
                if text == "Breed":
                    breed_label_index = i
                elif text == "Adopt Me":
                    adopt_me_index = i
                    break

            # If we found the pattern, extract values after "Adopt Me"
            if adopt_me_index > 0 and breed_label_index > 0:
                # Values typically start right after "Adopt Me"
                value_start = adopt_me_index + 1

                # Map values based on their position relative to labels
                # The order is: Breed, Weight, Age, Sex, Neutered
                if value_start < len(all_texts):
                    # Breed is first value after Adopt Me
                    breed_text = all_texts[value_start] if value_start < len(all_texts) else ""
                    if breed_text and breed_text.lower() not in [
                        "yes",
                        "no",
                        "male",
                        "female",
                    ]:
                        dog_data["breed"] = breed_text

                    # Weight is next (look for kg pattern)
                    for i in range(value_start + 1, min(value_start + 5, len(all_texts))):
                        if "kg" in all_texts[i]:
                            # Handle complex formats like "8 kg height:30cm" or "15kg"
                            weight_match = re.search(r"(\d+(?:\.\d+)?)\s*kg", all_texts[i])
                            if weight_match:
                                weight_text = f"{weight_match.group(1)} kg"
                                dog_data["properties"]["weight"] = weight_text
                                weight_kg = float(weight_match.group(1))
                                dog_data["size"] = self._calculate_size_from_weight(weight_kg)

                                # Extract height if present in same text
                                height_match = re.search(r"height:\s*(\d+)\s*cm", all_texts[i])
                                if height_match:
                                    dog_data["properties"]["height"] = f"{height_match.group(1)} cm"
                            break

                    # Height might be with weight
                    for i in range(value_start + 1, min(value_start + 5, len(all_texts))):
                        if "height:" in all_texts[i].lower():
                            dog_data["properties"]["height"] = all_texts[i]
                            break

                    # Age (look for yo/years pattern)
                    age_found = False
                    for i in range(value_start + 1, min(value_start + 10, len(all_texts))):
                        text = all_texts[i]

                        # Comprehensive age pattern matching
                        age_patterns = [
                            (
                                r"(\d+(?:[,\.]\d+)?)\s*yo?(?:\s|$)",
                                "years",
                            ),  # "2 yo", "3,5 y"
                            (
                                r"(\d+(?:[,\.]\d+)?)\s*y/o(?:\s|$)",
                                "years",
                            ),  # "1 y/o", "3,5 y/o"
                            (r"(\d+)\s*mnths?\s*old", "months"),  # "8 mnths old"
                            (r"(\d+)\s*months?\s*old", "months"),  # "9 months old"
                            (r"(\d+)\s*years?\s*old", "years"),  # "2 years old"
                        ]

                        for pattern, unit in age_patterns:
                            match = re.search(pattern, text, re.IGNORECASE)
                            if match:
                                age_value = match.group(1).replace(",", ".")  # Handle "3,5" format
                                if unit == "years":
                                    age_text = f"{age_value} years"
                                else:
                                    age_text = f"{age_value} months"

                                dog_data["age"] = age_text.strip()
                                age_found = True
                                break

                        if age_found:
                            break

                    # Sex (Male/Female) - check broader range
                    for i in range(value_start, min(value_start + 10, len(all_texts))):
                        if all_texts[i] in ["Male", "Female"]:
                            dog_data["sex"] = all_texts[i]
                            break

                    # Neutered status (Yes/No/Soon) - usually last
                    for i in range(value_start + 1, len(all_texts)):
                        if all_texts[i] in ["Yes", "No", "Soon"]:
                            if all_texts[i] == "Yes":
                                dog_data["properties"]["neutered_spayed"] = "Yes"
                            elif all_texts[i] == "Soon":
                                dog_data["properties"]["neutered_spayed"] = "Scheduled"
                            else:
                                dog_data["properties"]["neutered_spayed"] = "No"
                            break

            # Alternative pattern for puppies with "Born in" date
            for i, text in enumerate(all_texts):
                if "Born in" in text:
                    # Look for date pattern in current text or next few elements
                    birth_match = None
                    for j in range(i, min(i + 5, len(all_texts))):
                        birth_match = re.search(r"(\d{1,2}/\d{1,2}/\d{4})", all_texts[j])
                        if birth_match:
                            break

                    if birth_match:
                        dog_data["properties"]["birth_date"] = birth_match.group(1)
                        # Calculate age from birth date
                        from datetime import datetime

                        try:
                            birth = datetime.strptime(birth_match.group(1), "%d/%m/%Y")
                            age_months = (datetime.now() - birth).days // 30
                            if age_months < 12:
                                dog_data["age"] = f"{age_months} months"
                            else:
                                dog_data["age"] = f"{age_months // 12} years"
                        except:
                            pass
                    break

                if "Expected weight" in text:
                    exp_weight_match = re.search(r"(\d+\s*kg)", text)
                    if exp_weight_match:
                        dog_data["properties"]["expected_weight"] = exp_weight_match.group(1)

        except Exception as e:
            self.logger.error(f"Error extracting dog data: {e}")
            import traceback

            self.logger.error(traceback.format_exc())

        # Always set external_id and adoption_url (even if extraction had issues)
        name_slug = dog_data.get("name", "unknown").lower().replace(" ", "-")
        breed_slug = dog_data.get("breed", "unknown").lower().replace(" ", "-")
        external_id = f"pit-{name_slug}-{breed_slug}"
        dog_data["external_id"] = re.sub(r"[^a-z0-9-]", "", external_id)

        # Set adoption URL
        dog_data["adoption_url"] = f"{self.base_url}/adoption#{name_slug}"

        return dog_data

    def _calculate_size_from_weight(self, weight_kg: float) -> str:
        """Calculate size category from weight.

        Args:
            weight_kg: Weight in kilograms

        Returns:
            Size category string
        """
        if weight_kg < 5:
            return "Tiny"
        elif weight_kg < 12:
            return "Small"
        elif weight_kg < 25:
            return "Medium"
        elif weight_kg < 40:
            return "Large"
        else:
            return "XLarge"

    def _clean_image_url(self, url: str) -> str:
        """Clean and optimize Wix image URLs.

        Args:
            url: Raw image URL

        Returns:
            Cleaned image URL
        """
        if not url:
            return ""

        # Remove Wix transformations to get original image
        pattern = r"(https://static\.wixstatic\.com/media/[^/]+\.[^/]+)"
        match = re.search(pattern, url)
        if match:
            return match.group(1)

        # Return as-is if not a Wix URL
        if url.startswith("http"):
            return url

        # Make relative URLs absolute
        return urljoin(self.base_url, url)

    def _apply_standardization(self, dog_data: Dict[str, Any]) -> Dict[str, Any]:
        """Apply standardization utilities to dog data.

        Args:
            dog_data: Raw dog data

        Returns:
            Standardized dog data
        """
        # Make a copy to avoid modifying original
        data = dog_data.copy()

        # Trim the name field before processing
        if data.get("name"):
            data["name"] = data["name"].strip()

        # Use unified standardization through base scraper
        standardized = self.process_animal(data)

        # Ensure required fields have defaults
        standardized["name"] = (standardized.get("name") or "Unknown").strip()

        # Handle breed standardization properly
        if self.use_unified_standardization and "breed" in standardized:
            # breed is already handled by process_animal
            pass
        else:
            standardized["breed"] = standardized.get("breed") or "Mixed Breed"
        standardized.setdefault("standardized_size", standardized.get("size") or "Medium")
        standardized.setdefault(
            "gender",
            standardized.get("sex", "Unknown").lower() if standardized.get("sex") else "unknown",
        )
        # Don't override age_text if it was processed from age data
        if not standardized.get("age_text") and standardized.get("age"):
            standardized["age_text"] = standardized["age"]
        standardized.setdefault("age_text", "Unknown")
        standardized.setdefault("status", "available")
        standardized.setdefault("animal_type", "dog")

        # Handle neutered/spayed field standardization
        neutered_value = dog_data.get("properties", {}).get("neutered_spayed", "")
        if neutered_value:
            standardized.setdefault("neutered", neutered_value.lower() == "yes")

        return standardized
