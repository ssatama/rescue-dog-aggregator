"""
ScrapegraphAI API-powered scraper for Pets in Turkey
Uses ScrapegraphAI SmartScraper API for reliable extraction of dogs and images
"""

import logging
import os
import re
from datetime import datetime
from typing import Dict, List, Optional

from dotenv import load_dotenv
from pydantic import BaseModel
from scrapegraph_py import SyncClient
from scrapegraph_py.logger import sgai_logger

from scrapers.base_scraper import BaseScraper

# Load environment variables
load_dotenv()

# Configure ScrapegraphAI logging
sgai_logger.setLevel(logging.INFO)


# Pydantic models for structured extraction
class ImageSchema(BaseModel):
    url: str

class DogSchema(BaseModel):
    name: str
    breed: str  
    age: str
    sex: str
    weight: str
    height: str
    neuteredSpayed: str
    description: str
    primaryImageUrl: str
    imageUrls: List[ImageSchema]

class MainSchema(BaseModel):
    dogs: List[DogSchema]


class PetsInTurkeyScrapegraphScraper(BaseScraper):
    """
    ScrapegraphAI-powered scraper for Pets in Turkey organization.
    Drop-in replacement for the existing PetsInTurkeyScraper.
    """

    def __init__(self, organization_id=None, config_id=None):
        """Initialize the scraper with config-based or legacy mode"""
        # Support both initialization methods for compatibility
        if config_id:
            # New config-based mode
            super().__init__(config_id=config_id)
        elif organization_id:
            # Legacy mode
            super().__init__(organization_id=organization_id)
        else:
            # Default to config-based for PIT
            super().__init__(config_id="pets-in-turkey")

        # Get ScrapegraphAI API key from environment
        self.scrapegraph_api_key = os.getenv("SCRAPEGRAPH_API_KEY")
        if not self.scrapegraph_api_key:
            raise ValueError("SCRAPEGRAPH_API_KEY not found in environment variables")

        # Initialize ScrapegraphAI client with extended timeout
        self.sgai_client = SyncClient(api_key=self.scrapegraph_api_key, timeout=120)

        # Set base URL
        self.base_url = "https://www.petsinturkey.org/dogs"

        # User prompt for ScrapegraphAI API
        self.user_prompt = (
            "Extract detailed information for all dogs, including their name, breed, age, sex, weight, height, "
            "neutered/spayed status, description, primary image URL, and an array of all associated image URLs "
            "from the Pets in Turkey website, ensuring to find all images using standard img tags, CSS background-image "
            "properties, data-src attributes, and Wix media URLs."
        )

        # Output schema using Pydantic models
        self.output_schema = MainSchema

    def collect_data(self) -> List[Dict]:
        """
        Extract dog data using ScrapegraphAI API SmartScraper service.
        Uses structured schema for reliable extraction of both text and images.
        """
        try:
            self.logger.info(f"Starting ScrapegraphAI API extraction from {self.base_url}")

            # Use SmartScraper API with structured schema
            self.logger.info("Running SmartScraper API with structured schema...")
            response = self.sgai_client.smartscraper(
                website_url=self.base_url,
                user_prompt=self.user_prompt,
                output_schema=self.output_schema
            )

            # Log raw result for debugging
            self.logger.info(f"Raw API response type: {type(response)}")
            self.logger.info(f"Response keys: {list(response.keys()) if isinstance(response, dict) else 'N/A'}")
            
            # Extract result from API response
            if isinstance(response, dict) and 'result' in response:
                result = response['result']
                self.logger.info(f"Extracted result type: {type(result)}")
                if isinstance(result, dict):
                    self.logger.info(f"Result keys: {list(result.keys())}")
            else:
                result = response

            # Process results through the processing pipeline
            dogs_data = self._process_api_results(result)

            # Validate results
            self._validate_extraction_results(dogs_data)

            self.logger.info(f"Successfully extracted {len(dogs_data)} dogs")
            return dogs_data

        except Exception as e:
            self.logger.error(f"Error during ScrapegraphAI API extraction: {e}")
            import traceback
            self.logger.error(traceback.format_exc())
            return []

    def _process_api_results(self, result: any) -> List[Dict]:
        """
        Process API extraction results from ScrapegraphAI SmartScraper.
        """
        dogs = []

        # Handle API response format
        if isinstance(result, dict) and "dogs" in result:
            raw_dogs = result["dogs"]
        elif isinstance(result, list):
            raw_dogs = result
        else:
            self.logger.warning(f"Unexpected API response format: {type(result)}")
            raw_dogs = []

        # Process each dog
        for dog in raw_dogs:
            if isinstance(dog, dict):
                processed = self._process_dog_data(dog)
                if processed:
                    dogs.append(processed)

        return dogs

    def _process_dog_data(self, data: Dict) -> Optional[Dict]:
        """
        Process and standardize individual dog data to match database schema.
        """
        # Validate required fields
        if not self._validate_required_fields(data):
            return None

        name = data.get("name", "").strip()

        # Extract and process images from API response
        image_urls = self._extract_api_images(data)
        primary_image = image_urls[0] if image_urls else ""

        processed = {
            "name": name,
            "species": "dog",
            "breed": data.get("breed", "Mixed Breed"),
            "age_text": self._standardize_age_format(data.get("age", "Unknown")),
            "sex": self._normalize_sex(data.get("sex", "")),
            "size": self._determine_size(data),
            "description": self._handle_missing_description(
                data.get("description", "")
            ),
            "status": "available",
            "external_id": self._generate_safe_external_id(name),
            "organization_id": self.organization_id,
            "primary_image_url": primary_image,
            "original_image_url": primary_image,
            "image_urls": image_urls,  # For BaseScraper save_animal_images integration
            "adoption_url": self._build_adoption_url(
                data.get("adoption_url", ""), name
            ),
            "location": "Izmir, Turkey",
            "properties": {
                "weight": self._standardize_weight(data.get("weight", "")),
                "height": self._standardize_height(data.get("height", "")),
                "neutered_spayed": self._standardize_neutered_status(
                    data.get("neuteredSpayed", data.get("neutered_spayed", "Unknown"))
                ),
                "vaccinated": "Yes",  # PIT dogs are typically vaccinated
                "passport_ready": "Yes",  # PIT prepares EU passports
                "adoption_fee": "€450",  # Standard PIT adoption fee
                "description": self._handle_missing_description(
                    data.get("description", "")
                ),
            },
            "scraped_at": datetime.now(),
        }

        return processed

    def _normalize_sex(self, sex: str) -> str:
        """Normalize sex values to standard format"""
        if not sex:
            return "Unknown"

        sex_lower = str(sex).lower()
        if "female" in sex_lower:
            return "Female"
        elif "male" in sex_lower:
            return "Male"
        return "Unknown"

    def _determine_size(self, data: Dict) -> str:
        """Determine size based on weight/height data"""
        weight_str = str(data.get("weight", "")).lower()

        # Extract numeric values
        try:
            if "kg" in weight_str:
                # Extract number before 'kg'
                weight_match = re.search(r"(\d+(?:\.\d+)?)\s*kg", weight_str)
                if weight_match:
                    weight = float(weight_match.group(1))
                    if weight < 10:
                        return "Small"
                    elif weight < 20:
                        return "Medium"
                    else:
                        return "Large"
        except (ValueError, AttributeError):
            pass

        # Default to medium if can't determine
        return "Medium"

    def _clean_image_url(self, url: str) -> str:
        """Clean and validate image URLs, especially Wix URLs"""
        if not url:
            return ""

        # Remove Wix image transformations to get original
        if "static.wixstatic.com" in url:
            # Pattern to extract original image
            match = re.search(
                r"(https://static\.wixstatic\.com/media/[^/]+\.[a-z]+)", url
            )
            if match:
                return match.group(1)

        return url

    def _standardize_age_format(self, age: str) -> str:
        """Standardize age formats from 'yo'/'y/o' to 'years'"""
        if not age or not str(age).strip():
            return "Unknown"

        age_str = str(age).strip()

        # Convert 'yo' and 'y/o' to 'years'
        if " yo" in age_str:
            age_str = age_str.replace(" yo", " years")
        elif " y/o" in age_str:
            age_str = age_str.replace(" y/o", " years")
        elif age_str.endswith("yo"):
            age_str = age_str.replace("yo", " years")
        elif age_str.endswith("y/o"):
            age_str = age_str.replace("y/o", " years")

        return age_str

    def _handle_missing_description(self, description: str) -> str:
        """Enhanced description handling with better validation"""
        if not description or not str(description).strip():
            return "No description available"

        desc_str = str(description).strip()

        # Handle common empty/placeholder indicators
        empty_indicators = ["NA", "N/A", "NONE", "NULL", "friendly dog", "good dog", "nice dog"]
        if desc_str.upper() in [ind.upper() for ind in empty_indicators]:
            return "No description available"

        # Reject overly short descriptions (likely placeholders)
        if len(desc_str) < 10:
            return "No description available"

        return desc_str

    def _generate_safe_external_id(self, name: str) -> str:
        """Generate URL-safe external ID from dog name"""
        if not name:
            return "pit-unknown"

        # Remove/replace special characters
        import unicodedata
        import string

        # Normalize unicode characters
        name_normalized = unicodedata.normalize("NFKD", name)
        name_ascii = name_normalized.encode("ascii", "ignore").decode("ascii")

        # Convert to lowercase and replace special characters
        safe_name = name_ascii.lower()

        # Replace spaces and special characters with hyphens
        allowed_chars = string.ascii_lowercase + string.digits + " -"
        safe_name = "".join(c if c in allowed_chars else "" for c in safe_name)

        # Replace multiple spaces/hyphens with single hyphen
        safe_name = re.sub(r"[-\s]+", "-", safe_name)

        # Remove leading/trailing hyphens
        safe_name = safe_name.strip("-")

        return f"pit-{safe_name}" if safe_name else "pit-unknown"

    def _build_adoption_url(self, url: str, dog_name: str) -> str:
        """Build full adoption URL from various inputs"""
        if url and str(url).strip():
            url_str = str(url).strip()
            if url_str.startswith("http"):
                return url_str
            elif url_str.startswith("/"):
                return f"https://www.petsinturkey.org{url_str}"
            else:
                return f"https://www.petsinturkey.org/{url_str}"

        # Generate from dog name if no URL provided
        safe_name = dog_name.lower().replace(" ", "-") if dog_name else "unknown"
        return f"https://www.petsinturkey.org/dogs#{safe_name}"

    def _validate_required_fields(self, data: Dict) -> bool:
        """Validate that dog data has required fields"""
        name = data.get("name")
        if not name or not str(name).strip():
            self.logger.warning("Dog missing name, skipping")
            return False
        return True

    def _standardize_weight(self, weight: str) -> str:
        """Standardize weight data with proper units"""
        if not weight or not str(weight).strip():
            return ""

        weight_str = str(weight).strip()

        # If it's just a number, add kg unit
        try:
            float(weight_str)
            return f"{weight_str} kg"
        except ValueError:
            # Check if it already has units or is descriptive text
            if "kg" in weight_str.lower():
                return weight_str
            elif weight_str.lower() in ["small", "medium", "large", "heavy", "light"]:
                # Descriptive text - return empty for standardization
                return ""
            else:
                return weight_str

    def _standardize_height(self, height: str) -> str:
        """Standardize height data with proper units"""
        if not height or not str(height).strip():
            return ""

        height_str = str(height).strip()

        # If it's just a number, add cm unit
        try:
            float(height_str)
            return f"{height_str} cm"
        except ValueError:
            # Check if it already has units
            if "cm" in height_str.lower():
                return height_str
            else:
                return height_str

    def _standardize_neutered_status(self, status: str) -> str:
        """Standardize neutered/spayed status to Yes/No/Unknown"""
        if not status:
            return "Unknown"

        status_lower = str(status).lower().strip()

        # Positive indicators
        if status_lower in ["yes", "true", "neutered", "spayed", "y"]:
            return "Yes"
        # Negative indicators
        elif status_lower in ["no", "false", "not neutered", "not spayed", "n"]:
            return "No"
        # Unknown/unclear
        else:
            return "Unknown"

    def _process_image_url(self, url: str) -> str:
        """Process image URL with validation and cleaning"""
        if not url or not str(url).strip():
            return ""

        url_str = str(url).strip()

        # Validate URL format
        if not self._validate_image_url(url_str):
            return ""

        # Clean Wix URLs
        return self._clean_image_url(url_str)

    def _validate_image_url(self, url: str) -> bool:
        """Validate that image URL is valid and safe"""
        if not url:
            return False

        # Basic URL validation
        if not (url.startswith("http://") or url.startswith("https://")):
            return False

        # Block potentially dangerous URLs
        dangerous_schemes = ["javascript:", "data:", "ftp:"]
        for scheme in dangerous_schemes:
            if url.lower().startswith(scheme):
                return False

        return True

    def _extract_api_images(self, data: Dict) -> List[str]:
        """Extract images from API response with proper schema handling"""
        try:
            image_urls = []

            # Primary image from API schema
            primary_image = data.get("primaryImageUrl")
            if primary_image:
                url = self._process_wix_image_url(primary_image)
                if url:
                    image_urls.append(url)

            # Additional images from API schema
            api_image_urls = data.get("imageUrls", [])
            if isinstance(api_image_urls, list):
                for img_data in api_image_urls:
                    if isinstance(img_data, dict) and "url" in img_data:
                        url = self._process_wix_image_url(img_data["url"])
                        if url and url not in image_urls:
                            image_urls.append(url)
                    elif isinstance(img_data, str):
                        # Handle direct URL strings
                        url = self._process_wix_image_url(img_data)
                        if url and url not in image_urls:
                            image_urls.append(url)

            # Fallback: check legacy field names for compatibility
            legacy_fields = ["image_url", "photo", "main_image"]
            for field in legacy_fields:
                if field in data and data[field]:
                    url = self._process_wix_image_url(data[field])
                    if url and url not in image_urls:
                        image_urls.append(url)

            return image_urls

        except Exception as e:
            self.logger.error(f"Error extracting API images: {e}")
            return []

    def _build_full_image_url(self, url: str) -> str:
        """Convert relative URLs to absolute URLs"""
        if not url or not str(url).strip():
            return ""

        url_str = str(url).strip()

        # Already absolute URL
        if url_str.startswith("http"):
            return url_str
        # Relative URL starting with /
        elif url_str.startswith("/"):
            return f"https://www.petsinturkey.org{url_str}"
        # Relative URL without /
        else:
            return f"https://www.petsinturkey.org/{url_str}"

    def _process_wix_image_url(self, url: str) -> str:
        """Enhanced Wix URL processing"""
        if not url:
            return ""

        url_str = str(url).strip()

        # Validate URL format
        if not self._validate_image_url(url_str):
            return ""

        # Convert relative to absolute if needed
        url_str = self._build_full_image_url(url_str)

        # Clean Wix URLs - extract original from transformations
        if "static.wixstatic.com" in url_str:
            # Pattern to get base image without transformations
            import re
            pattern = r"(https://static\.wixstatic\.com/media/[^/]+\.[a-zA-Z0-9]+)"
            match = re.search(pattern, url_str)
            if match:
                return match.group(1)

        return url_str

    def _check_for_pagination(self) -> List[str]:
        """Check if the site has pagination (future-proofing)"""
        # For now, PIT doesn't have pagination
        # This method can be enhanced later when pagination is added
        return [self.base_url]

    def collect_all_pages(self) -> List[Dict]:
        """Collect data from all pages if pagination exists"""
        try:
            all_dogs = []
            pages = self._check_for_pagination()

            for i, page_url in enumerate(pages):
                self.logger.info(f"Scraping page: {page_url}")

                # Collect data from this page
                if page_url == self.base_url:
                    # Use existing collect_data for base URL
                    page_dogs = self.collect_data()
                else:
                    # Use specialized method for other pages
                    page_dogs = self._collect_data_from_url(page_url)

                all_dogs.extend(page_dogs)

                # Rate limit between pages (but not after last page)
                if i < len(pages) - 1:
                    import time

                    time.sleep(self.rate_limit_delay)

            return all_dogs

        except Exception as e:
            self.logger.error(f"Error in collect_all_pages: {e}")
            return []

    def _collect_data_from_url(self, url: str) -> List[Dict]:
        """Collect data from a specific URL (for pagination)"""
        try:
            self.logger.info(f"Starting ScrapegraphAI API extraction from {url}")

            # Use SmartScraper API with structured schema
            self.logger.info("Running SmartScraper API with structured schema...")
            response = self.sgai_client.smartscraper(
                website_url=url,
                user_prompt=self.user_prompt,
                output_schema=self.output_schema
            )

            # Extract result from API response
            if isinstance(response, dict) and 'result' in response:
                result = response['result']
            else:
                result = response

            # Process results through the processing pipeline
            dogs_data = self._process_api_results(result)

            self.logger.info(f"Successfully extracted {len(dogs_data)} dogs from {url}")
            return dogs_data

        except Exception as e:
            self.logger.error(f"Error during ScrapegraphAI API extraction from {url}: {e}")
            return []


    def _validate_extraction_results(self, dogs_data: List[Dict]):
        """Validate extraction quality and provide debugging information"""
        if not dogs_data:
            self.logger.warning("No dogs extracted - possible website loading issue")
            return

        # Check description quality
        real_descriptions = sum(1 for dog in dogs_data 
                              if dog.get('description', '') != 'No description available' 
                              and len(dog.get('description', '')) > 10)

        # Check image extraction
        dogs_with_images = sum(1 for dog in dogs_data 
                              if dog.get('image_urls') and len(dog.get('image_urls', [])) > 0)

        # Check primary image URLs
        dogs_with_primary_images = sum(1 for dog in dogs_data 
                                     if dog.get('primary_image_url') and 
                                     dog.get('primary_image_url', '').strip())

        self.logger.info(f"Quality metrics:")
        self.logger.info(f"  Dogs with real descriptions: {real_descriptions}/{len(dogs_data)}")
        self.logger.info(f"  Dogs with image URLs: {dogs_with_images}/{len(dogs_data)}")
        self.logger.info(f"  Dogs with primary images: {dogs_with_primary_images}/{len(dogs_data)}")

        if real_descriptions == 0:
            self.logger.warning("No real descriptions extracted - check prompt effectiveness")
        if dogs_with_images == 0 and dogs_with_primary_images == 0:
            self.logger.warning("No images extracted - check image URL patterns")

        # Log sample of what we got for debugging
        if dogs_data:
            sample_dog = dogs_data[0]
            self.logger.info(f"Sample dog data:")
            self.logger.info(f"  Name: {sample_dog.get('name', 'MISSING')}")
            self.logger.info(f"  Description length: {len(sample_dog.get('description', ''))}")
            self.logger.info(f"  Primary image: {bool(sample_dog.get('primary_image_url', '').strip())}")
            self.logger.info(f"  Image URLs count: {len(sample_dog.get('image_urls', []))}")
