import re
import time
from typing import Any, Dict, List, Optional

import requests
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

from scrapers.base_scraper import BaseScraper


class REANScraper(BaseScraper):
    """REAN (Rescuing European Animals in Need) scraper for Romania and UK foster dogs."""

    def __init__(self, config_id="rean", organization_id=None):
        """Initialize REAN scraper with configuration."""
        if organization_id is not None:
            # Legacy mode - use organization_id
            super().__init__(organization_id=organization_id)
        else:
            # New mode - use config_id
            super().__init__(config_id=config_id)
        self.base_url = "https://rean.org.uk"
        self.pages = {
            "romania": "/dogs-%26-puppies-in-romania",
            "uk_foster": "/dogs-in-foster-in-the-uk",
        }

    def extract_dog_content_from_html(self, html_content: str) -> List[str]:
        """
        Extract individual dog content blocks from HTML.

        Args:
            html_content: Raw HTML content

        Returns:
            List of text blocks, each containing info about one dog
        """
        try:
            soup = BeautifulSoup(html_content, "html.parser")

            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()

            # Look for elements that might contain dog information
            # Try to find paragraph tags with dog-related content
            dog_blocks = []

            # Approach 1: Look for paragraphs containing age information
            paragraphs = soup.find_all(["p", "div", "span"])
            current_block = []

            for element in paragraphs:
                text = element.get_text().strip()
                if not text:
                    continue

                # Check if this text contains dog-related information
                if any(
                    pattern in text.lower()
                    for pattern in ["months old", "years old", "vaccinated", "chipped"]
                ):
                    current_block.append(text)
                elif "updated" in text.lower() and re.search(r"\d+/\d+/\d+", text):
                    # This is an update timestamp - marks the end of a dog block
                    if current_block:
                        dog_blocks.append(" ".join(current_block))
                        current_block = []
                elif current_block:  # We're in a dog block, collect all text
                    current_block.append(text)

            # Add the last block if it exists
            if current_block:
                dog_blocks.append(" ".join(current_block))

            # If no blocks found, try a different approach
            if not dog_blocks:
                # Get all text and try to parse it with improved patterns
                full_text = soup.get_text()

                # Look for dog name patterns in the full text
                # This is a fallback approach
                name_age_pattern = r"([A-Za-z]+)\s+is\s+(?:around\s+)?(\d+(?:\.\d+)?)\s+(months?|years?)\s+old"
                matches = re.finditer(name_age_pattern, full_text, re.IGNORECASE)

                for match in matches:
                    # Extract surrounding context for each dog
                    start = max(0, match.start() - 100)
                    end = min(len(full_text), match.end() + 300)
                    context = full_text[start:end].strip()
                    if context:
                        dog_blocks.append(context)

            self.logger.info(
                f"Extracted {len(dog_blocks)} dog content blocks from HTML"
            )
            return dog_blocks

        except Exception as e:
            self.logger.error(f"Error extracting dog content from HTML: {e}")
            return []

    def extract_images_from_html(self, html_content: str) -> List[str]:
        """
        Extract image URLs from HTML content.
        
        Args:
            html_content: Raw HTML content
            
        Returns:
            List of image URLs (excluding base64 placeholders)
        """
        try:
            soup = BeautifulSoup(html_content, "html.parser")
            image_urls = []
            
            # Extract from img tags
            for img in soup.find_all("img"):
                # Check src attribute
                src = img.get("src", "")
                if src and not src.startswith("data:"):
                    # Normalize protocol-relative URLs
                    if src.startswith("//"):
                        src = "https:" + src
                    image_urls.append(src)
                
                # Check data-src for lazy loading
                data_src = img.get("data-src", "")
                if data_src and not data_src.startswith("data:"):
                    if data_src.startswith("//"):
                        data_src = "https:" + data_src
                    image_urls.append(data_src)
            
            # Extract from CSS background-image styles
            for element in soup.find_all(attrs={"style": True}):
                style = element.get("style", "")
                # Look for background-image URLs
                bg_matches = re.findall(
                    r"background-image:\s*url\(['\"]?([^'\")\s]+)['\"]?\)", style
                )
                for bg_url in bg_matches:
                    if not bg_url.startswith("data:"):
                        if bg_url.startswith("//"):
                            bg_url = "https:" + bg_url
                        image_urls.append(bg_url)
            
            # Remove duplicates while preserving order
            unique_images = []
            for url in image_urls:
                if url not in unique_images:
                    unique_images.append(url)
            
            self.logger.info(f"Extracted {len(unique_images)} image URLs from HTML")
            return unique_images
            
        except Exception as e:
            self.logger.error(f"Error extracting images from HTML: {e}")
            return []

    def determine_dog_image(self, dog_name: str, available_images: List[str]) -> Optional[str]:
        """
        Determine the best image for a specific dog.
        
        Args:
            dog_name: Name of the dog
            available_images: List of available image URLs from the page
            
        Returns:
            Best image URL for the dog, or None if no suitable image found
        """
        # Filter out known non-dog images (like logos)
        dog_images = []
        for img_url in available_images:
            # Skip obvious logos and icons
            if any(term in img_url.lower() for term in ['logo', 'icon', 'favicon']):
                continue
            dog_images.append(img_url)
        
        # For now, since REAN uses placeholders, we'll return None
        # This allows the system to use default placeholder handling
        # In the future, this method can be enhanced to:
        # 1. Match images to dogs by position/context
        # 2. Use facial recognition or AI to identify dog photos
        # 3. Use external image sources (Facebook, etc.)
        
        if dog_images:
            # Log available images for debugging
            self.logger.info(f"Available images for {dog_name}: {len(dog_images)} found")
            # For now, return None to use system defaults
            # TODO: Implement image-to-dog matching logic
        
        return None

    def extract_images_with_browser(self, url: str) -> List[str]:
        """
        Extract image URLs using Selenium WebDriver to handle JavaScript-loaded images.
        
        This method uses browser automation to:
        1. Load the page and wait for JavaScript execution
        2. Scroll to trigger lazy loading of images
        3. Extract actual image URLs from wsimg.com CDN
        4. Filter out placeholders and non-REAN images
        
        Args:
            url: The URL to scrape for images
            
        Returns:
            List of actual image URLs from REAN's CDN (wsimg.com)
        """
        try:
            # Configure Chrome options for headless operation
            chrome_options = Options()
            chrome_options.add_argument("--headless")  # Run in background
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--window-size=1920,1080")
            chrome_options.add_argument("--user-agent=Mozilla/5.0 (compatible; RescueDogAggregator/1.0)")
            
            # Initialize WebDriver
            self.logger.info(f"Starting browser automation for image extraction: {url}")
            driver = webdriver.Chrome(options=chrome_options)
            
            try:
                # Load the page
                driver.get(url)
                self.logger.info("Page loaded, waiting for JavaScript execution...")
                
                # Wait for initial page load and JavaScript execution
                time.sleep(5)
                
                # Scroll to the bottom to trigger lazy loading of all images
                self.logger.info("Scrolling to trigger lazy loading...")
                driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                time.sleep(3)  # Wait for lazy loading to complete
                
                # Scroll back to top and then slowly down to ensure all images load
                driver.execute_script("window.scrollTo(0, 0);")
                time.sleep(1)
                
                # Progressive scroll to ensure all images are in viewport at some point
                total_height = driver.execute_script("return document.body.scrollHeight")
                current_position = 0
                scroll_increment = 500
                
                while current_position < total_height:
                    driver.execute_script(f"window.scrollTo(0, {current_position});")
                    time.sleep(1)  # Allow images to load
                    current_position += scroll_increment
                
                self.logger.info("Scrolling complete, extracting image URLs...")
                
                # Extract all image elements
                img_elements = driver.find_elements(By.TAG_NAME, "img")
                self.logger.info(f"Found {len(img_elements)} img elements on page")
                
                # Filter for actual REAN CDN images (wsimg.com)
                actual_images = []
                for img in img_elements:
                    src = img.get_attribute("src")
                    if src and self._is_valid_rean_image(src):
                        # Clean the URL to remove problematic transformations
                        cleaned_src = self._clean_wsimg_url(src)
                        actual_images.append(cleaned_src)
                        self.logger.debug(f"Found valid REAN image: {cleaned_src[:80]}...")
                
                self.logger.info(f"Extracted {len(actual_images)} valid REAN images from {url}")
                return actual_images
                
            finally:
                # Always clean up the browser
                driver.quit()
                
        except Exception as e:
            self.logger.error(f"Error during browser-based image extraction: {e}")
            return []

    def _is_valid_rean_image(self, src: str) -> bool:
        """
        Check if an image URL is a valid REAN dog image.
        
        Args:
            src: Image source URL
            
        Returns:
            True if this appears to be a valid REAN dog image
        """
        if not src:
            return False
            
        # Skip placeholder images
        if src.startswith("data:"):
            return False
            
        # Must be from REAN's CDN (GoDaddy Website Builder uses wsimg.com)
        if "wsimg.com" not in src:
            return False
            
        # Skip obvious non-dog images
        exclude_patterns = [
            "logo", "icon", "favicon", "header", "footer", 
            "background", "banner", "button", "arrow"
        ]
        
        src_lower = src.lower()
        for pattern in exclude_patterns:
            if pattern in src_lower:
                return False
                
        return True

    def _clean_wsimg_url(self, wsimg_url: str) -> str:
        """
        Clean wsimg.com URLs to remove problematic transformations for Cloudinary.
        
        Args:
            wsimg_url: Original wsimg.com URL with transformations
            
        Returns:
            Cleaned URL that Cloudinary can process
        """
        if not wsimg_url or "wsimg.com" not in wsimg_url:
            return wsimg_url
            
        # Remove transformation parameters that cause issues with Cloudinary
        # Example: .../image.jpg/:/cr=t:12.5%25,l:0%25,w:100%25,h:75%25/rs=w:600,h:600,cg:true
        # We want: .../image.jpg
        
        try:
            # Split on '/:/'' which marks the start of transformations
            if '/::/' in wsimg_url:
                # Handle double colon format
                clean_url = wsimg_url.split('/::/')[0]
            elif '/:/' in wsimg_url:
                # Handle single colon format (more common)
                clean_url = wsimg_url.split('/:/')[0]
            else:
                # No transformations found, return as-is
                clean_url = wsimg_url
                
            self.logger.debug(f"Cleaned wsimg URL: {wsimg_url[:80]}... -> {clean_url[:80]}...")
            return clean_url
            
        except Exception as e:
            self.logger.warning(f"Error cleaning wsimg URL {wsimg_url[:50]}...: {e}")
            return wsimg_url

    def associate_images_with_dogs(self, dog_data_list: List[Dict[str, Any]], image_urls: List[str]) -> List[Dict[str, Any]]:
        """
        Associate extracted images with specific dogs using position-based matching.
        
        Since REAN's website presents dogs and images in order, we use positional
        association as the primary strategy. This is the most reliable method
        for GoDaddy Website Builder pages.
        
        Args:
            dog_data_list: List of dog data dictionaries
            image_urls: List of image URLs extracted from the page
            
        Returns:
            List of dog data with associated primary_image_url where available
        """
        if not dog_data_list:
            return []
            
        self.logger.info(f"Associating {len(image_urls)} images with {len(dog_data_list)} dogs")
        
        # Create a copy of the dog data to avoid modifying the original
        enriched_dogs = []
        
        for i, dog_data in enumerate(dog_data_list):
            enriched_dog = dog_data.copy()
            
            # Position-based association: match by index
            if i < len(image_urls):
                enriched_dog["primary_image_url"] = image_urls[i]
                self.logger.debug(f"Associated image {i+1} with dog '{dog_data.get('name', 'Unknown')}'")
            else:
                # No image available for this dog
                self.logger.debug(f"No image available for dog '{dog_data.get('name', 'Unknown')}'")
                
            enriched_dogs.append(enriched_dog)
        
        # Log summary
        dogs_with_images = sum(1 for dog in enriched_dogs if "primary_image_url" in dog)
        self.logger.info(f"Successfully associated images with {dogs_with_images}/{len(dog_data_list)} dogs")
        
        return enriched_dogs

    def scrape_animals(self) -> List[Dict[str, Any]]:
        """
        Main scraping method that processes both Romania and UK pages.

        Returns:
            List of standardized animal data dictionaries
        """
        all_animals = []

        try:
            self.start_scrape_session()

            for page_type, page_path in self.pages.items():
                self.logger.info(f"Scraping {page_type} page: {page_path}")

                # Scrape the page
                html_content = self.scrape_page(f"{self.base_url}{page_path}")
                if not html_content:
                    self.logger.warning(f"Failed to scrape {page_type} page")
                    continue

                # Extract dog content blocks from HTML
                dog_blocks = self.extract_dog_content_from_html(html_content)
                self.logger.info(
                    f"Found {len(dog_blocks)} dog content blocks on {page_type} page"
                )
                
                # Extract actual images using browser automation
                page_url = f"{self.base_url}{page_path}"
                available_images = self.extract_images_with_browser(page_url)
                self.logger.info(
                    f"Found {len(available_images)} real images on {page_type} page via browser"
                )

                # Process dog entries and extract basic data
                dog_data_list = []
                for entry in dog_blocks:
                    try:
                        dog_data = self.extract_dog_data(entry, page_type)
                        if dog_data and dog_data.get("name"):
                            dog_data_list.append(dog_data)
                        else:
                            self.logger.warning(
                                f"Skipping entry with no valid name: {entry[:100]}..."
                            )
                    except Exception as e:
                        self.logger.error(f"Error processing dog entry: {e}")
                        continue

                # Associate images with dogs using position-based matching
                enriched_dog_data_list = self.associate_images_with_dogs(dog_data_list, available_images)
                
                # Convert to standardized format and add to results
                for dog_data in enriched_dog_data_list:
                    try:
                        standardized_data = self.standardize_animal_data(dog_data, page_type)
                        
                        # Save animal and get the database ID
                        animal_id, operation = self.save_animal(standardized_data)
                        if animal_id:
                            # Mark the animal as seen using the database ID
                            self.mark_animal_as_seen(animal_id)
                            all_animals.append(standardized_data)
                        else:
                            self.logger.error(f"Failed to save animal: {standardized_data.get('name')}")
                    except Exception as e:
                        self.logger.error(f"Error processing dog entry: {e}")
                        continue

                # Rate limiting between pages
                if page_type != list(self.pages.keys())[-1]:  # Not the last page
                    time.sleep(self.rate_limit_delay)

            self.logger.info(f"Successfully scraped {len(all_animals)} dogs total")
            return all_animals

        except Exception as e:
            self.logger.error(f"Critical error during scraping: {e}")
            self.handle_scraper_failure(str(e))
            return []
        finally:
            self.update_stale_data_detection()

    def scrape_page(self, url: str) -> Optional[str]:
        """
        Scrape a single page with error handling and retries.

        Args:
            url: The URL to scrape

        Returns:
            Page content as string or None if failed
        """
        for attempt in range(self.max_retries + 1):
            try:
                self.logger.info(f"Attempting to scrape {url} (attempt {attempt + 1})")

                response = requests.get(
                    url,
                    timeout=self.timeout,
                    headers={
                        "User-Agent": "Mozilla/5.0 (compatible; RescueDogAggregator/1.0)"
                    },
                )
                response.raise_for_status()

                return response.text

            except Exception as e:
                self.logger.warning(f"Attempt {attempt + 1} failed for {url}: {e}")
                if attempt < self.max_retries:
                    time.sleep(2**attempt)  # Exponential backoff
                else:
                    self.logger.error(f"All attempts failed for {url}")
                    return None

    def split_dog_entries(self, page_text: str, page_type: str) -> List[str]:
        """
        Split page text into individual dog entries using update timestamps.

        Args:
            page_text: Raw page content
            page_type: Type of page (romania/uk_foster)

        Returns:
            List of individual dog entry texts
        """
        if not page_text or not page_text.strip():
            return []

        # Split by update timestamps: (Updated DD/MM/YY)
        # This will split the text and remove the timestamps
        parts = re.split(r"\(Updated \d{1,2}/\d{1,2}/\d{2,4}\)", page_text)

        # Clean and filter entries
        cleaned_entries = []
        for part in parts:
            part = part.strip()
            # Only keep substantial entries that likely contain dog information
            # Look for key indicators like age mentions or vaccination status
            if (
                part
                and len(part) > 50
                and any(
                    word in part.lower()
                    for word in ["months", "years", "old", "vaccinated", "chipped"]
                )
            ):
                cleaned_entries.append(part)

        # If no timestamp-based splitting worked, try alternative approaches
        if not cleaned_entries and page_text.strip():
            # Fallback: split by paragraph breaks and filter
            paragraphs = page_text.split("\n\n")
            for paragraph in paragraphs:
                paragraph = paragraph.strip()
                if len(paragraph) > 50 and any(
                    word in paragraph.lower()
                    for word in ["months", "years", "old", "vaccinated"]
                ):
                    cleaned_entries.append(paragraph)

        return cleaned_entries

    def extract_name(self, text: str) -> Optional[str]:
        """
        Extract dog name from text entry.

        Args:
            text: Dog entry text

        Returns:
            Extracted name or None
        """
        if not text:
            return None

        # Pattern 1: "Name is X years/months old"
        name_pattern = r"^([A-Za-z]+(?:\s+[A-Za-z]+)*?)\s+is\s+(?:around\s+)?\d"
        match = re.search(name_pattern, text.strip())
        if match:
            name = match.group(1).strip()
            # Filter out descriptive words to get the actual name
            descriptive_words = ["little", "friendly", "sweet", "puppy", "big", "soft"]
            name_words = name.split()
            actual_name = []
            for word in name_words:
                if word.lower() not in descriptive_words:
                    actual_name.append(word)
            if actual_name:
                return actual_name[-1]  # Take the last non-descriptive word as the name

        # Pattern 2: Look for capitalized words at the beginning
        words = text.strip().split()[:5]  # Check first 5 words
        for word in words:
            if word[0].isupper() and word.isalpha() and len(word) > 2:
                if word.lower() not in ["little", "sweet", "puppy", "this", "the"]:
                    return word

        return None

    def extract_age(self, text: str) -> Optional[str]:
        """
        Extract age information from text.

        Args:
            text: Dog entry text

        Returns:
            Age string (e.g., "5 months", "1.5 years")
        """
        if not text:
            return None

        # Pattern: "around X months/years old" or "X months/years old"
        age_patterns = [
            r"(?:around\s+)?(\d+(?:\.\d+)?)\s+(months?)\s+old",
            r"(?:around\s+)?(\d+(?:\.\d+)?)\s+(years?)\s+old",
        ]

        for pattern in age_patterns:
            match = re.search(pattern, text.lower())
            if match:
                number = match.group(1)
                unit = match.group(2)
                return f"{number} {unit}"

        return None

    def determine_location(self, text: str, page_type: str) -> str:
        """
        Determine current location of the dog.

        Args:
            text: Dog entry text
            page_type: Type of page (romania/uk_foster)

        Returns:
            Location string
        """
        if page_type == "romania":
            return "Romania"

        # For UK foster dogs, extract specific location
        uk_locations = [
            "Norfolk",
            "Lincolnshire",
            "Derby",
            "London",
            "Manchester",
            "Birmingham",
        ]
        text_lower = text.lower()

        for location in uk_locations:
            if location.lower() in text_lower:
                return location

        # Default for UK if no specific location found
        return "UK"

    def extract_medical_status(self, text: str) -> Optional[str]:
        """
        Extract medical/vaccination status.

        Args:
            text: Dog entry text

        Returns:
            Medical status string
        """
        if not text:
            return None

        text_lower = text.lower()

        # Common patterns
        medical_patterns = [
            r"(spayed,?\s+vaccinated\s+and\s+chipped)",
            r"(neutered,?\s+vaccinated\s+and\s+chipped)",
            r"(vaccinated\s+and\s+chipped)",
        ]

        for pattern in medical_patterns:
            match = re.search(pattern, text_lower)
            if match:
                return match.group(1)

        return None

    def assess_urgency(self, text: str) -> str:
        """
        Assess urgency level based on text content.

        Args:
            text: Dog entry text

        Returns:
            Urgency level: "urgent" or "standard"
        """
        if not text:
            return "standard"

        text_lower = text.lower()
        urgent_keywords = [
            "desperately",
            "urgent",
            "emergency",
            "stuck",
            "dire",
            "ready to travel",
            "needs urgent",
            "critical",
        ]

        for keyword in urgent_keywords:
            if keyword in text_lower:
                return "urgent"

        return "standard"

    def extract_weight(self, text: str) -> Optional[float]:
        """
        Extract weight in kg from text.

        Args:
            text: Dog entry text

        Returns:
            Weight in kg or None
        """
        if not text:
            return None

        # Pattern: "X kg" or "Xkg"
        weight_pattern = r"(\d+(?:\.\d+)?)\s*kg"
        match = re.search(weight_pattern, text.lower())

        if match:
            try:
                return float(match.group(1))
            except ValueError:
                return None

        return None

    def predict_size_from_weight(self, weight_kg: float) -> str:
        """
        Predict size category from weight.

        Args:
            weight_kg: Weight in kilograms

        Returns:
            Size category
        """
        if weight_kg < 15:
            return "Small"
        elif weight_kg < 30:
            return "Medium"
        else:
            return "Large"

    def predict_size_from_description(self, text: str) -> Optional[str]:
        """
        Predict size from descriptive text.

        Args:
            text: Dog entry text

        Returns:
            Size category or None
        """
        if not text:
            return None

        text_lower = text.lower()

        if any(word in text_lower for word in ["little", "small", "tiny"]):
            return "Small"
        elif any(word in text_lower for word in ["medium", "mid-size"]):
            return "Medium"
        elif any(word in text_lower for word in ["big", "large", "huge"]):
            return "Large"

        return None

    def extract_rescue_context(self, text: str) -> str:
        """
        Extract rescue story/context from text.

        Args:
            text: Dog entry text

        Returns:
            Rescue context summary
        """
        if not text:
            return ""

        text_lower = text.lower()
        contexts = []

        # Common rescue contexts
        if "kill shelter" in text_lower:
            contexts.append("rescued from kill shelter")
        elif "shelter" in text_lower:
            contexts.append("rescued from shelter")

        if "streets" in text_lower or "street" in text_lower:
            contexts.append("found on streets")

        if "terrible conditions" in text_lower:
            contexts.append("rescued from terrible conditions")

        if "foster" in text_lower:
            contexts.append("in foster care")

        if contexts:
            return ", ".join(contexts)

        # Extract first sentence as context if no specific patterns found
        sentences = text.split(".")
        if sentences and len(sentences[0]) > 10:
            return sentences[0].strip()

        return "rescue story available"

    def extract_description_for_about_section(self, text: str) -> str:
        """
        Extract a clean description suitable for the About section.
        
        This processes the raw text to create a user-friendly description
        that will be displayed in the frontend's About section.

        Args:
            text: Dog entry text

        Returns:
            Clean description for About section
        """
        if not text:
            return ""

        # Clean up the text
        text = text.strip()
        
        # Remove update timestamps that might be at the end
        text = re.sub(r'\(Updated \d{1,2}/\d{1,2}/\d{2,4}\)$', '', text).strip()
        
        # Try to extract the story part (usually after name and age info)
        # Look for narrative content that comes after basic info
        sentences = text.split('.')
        
        # Find where the actual story begins (skip name/age info)
        story_sentences = []
        found_story_start = False
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
                
            # Skip sentences that are just basic info
            if any(pattern in sentence.lower() for pattern in [
                'months old', 'years old', 'vaccinated', 'chipped', 'spayed', 'neutered'
            ]) and not found_story_start:
                continue
            
            # This looks like story content
            if len(sentence) > 20:
                found_story_start = True
                story_sentences.append(sentence)
        
        if story_sentences:
            # Join the story sentences and limit length for About section
            description = '. '.join(story_sentences[:3])  # Take first 3 story sentences
            if not description.endswith('.'):
                description += '.'
            
            # Limit length to reasonable size for About section
            if len(description) > 300:
                description = description[:297] + '...'
            
            return description
        
        # Fallback: use first part of text if no story structure found
        if len(text) > 50:
            # Take first sentence or reasonable chunk
            first_part = text[:200]
            if '.' in first_part:
                first_part = first_part[:first_part.rfind('.') + 1]
            else:
                first_part += '...'
            return first_part
        
        return text

    def extract_dog_data(
        self, entry_text: str, page_type: str
    ) -> Optional[Dict[str, Any]]:
        """
        Extract structured data from a dog entry.

        Args:
            entry_text: Raw text for one dog
            page_type: Type of page (romania/uk_foster)

        Returns:
            Dictionary with extracted dog data
        """
        if not entry_text or len(entry_text.strip()) < 20:
            return None

        try:
            name = self.extract_name(entry_text)
            if not name:
                return None

            age_text = self.extract_age(entry_text)
            weight_kg = self.extract_weight(entry_text)

            # Determine size
            size_prediction = None
            if weight_kg:
                size_prediction = self.predict_size_from_weight(weight_kg)
            else:
                size_prediction = self.predict_size_from_description(entry_text)

            # Extract description for About section
            about_description = self.extract_description_for_about_section(entry_text)
            
            dog_data = {
                "name": name,
                "age_text": age_text,
                "properties": {
                    "source_page": page_type,
                    "current_location": self.determine_location(entry_text, page_type),
                    "transport_required": page_type == "romania",
                    "medical_status": self.extract_medical_status(entry_text),
                    "rescue_context": self.extract_rescue_context(entry_text),
                    "urgency_level": self.assess_urgency(entry_text),
                    "origin_country": "Romania",
                    "raw_text": entry_text.strip()[:500],  # Store sample for debugging
                    "description": about_description,  # Add description for About section
                },
            }

            # Add weight and size if available
            if weight_kg:
                dog_data["properties"]["weight_kg"] = weight_kg
            if size_prediction:
                dog_data["properties"]["size_prediction"] = size_prediction

            return dog_data

        except Exception as e:
            self.logger.error(f"Error extracting dog data from entry: {e}")
            return None

    def standardize_animal_data(
        self, dog_data: Dict[str, Any], page_type: str
    ) -> Dict[str, Any]:
        """
        Convert extracted data to standardized format for database.

        Args:
            dog_data: Raw extracted dog data
            page_type: Type of page (romania/uk_foster)

        Returns:
            Standardized animal data dictionary
        """
        name = dog_data.get("name", "Unknown")

        # Create external ID from name and page type
        external_id = f"rean-{page_type}-{name.lower().replace(' ', '-')}"

        # Build adoption URL (link to organization contact)
        if self.org_config:
            adoption_url = self.org_config.metadata.website_url
        else:
            # Fallback for legacy mode
            adoption_url = "https://rean.org.uk"

        standardized_data = {
            "external_id": external_id,
            "name": name,
            "organization_id": self.organization_id,  # Add organization_id
            "adoption_url": adoption_url,
            "animal_type": "dog",
            "age_text": dog_data.get("age_text"),
            "language": "en",
            "properties": dog_data.get("properties", {}),
        }
        
        # Add image URL if available
        if dog_data.get("primary_image_url"):
            standardized_data["primary_image_url"] = dog_data["primary_image_url"]

        # Standardize age if available
        if dog_data.get("age_text"):
            try:
                age_months = self.standardize_age_to_months(dog_data["age_text"])
                if age_months:
                    standardized_data["age_min_months"] = age_months
                    standardized_data["age_max_months"] = age_months
            except Exception as e:
                self.logger.warning(
                    f"Could not standardize age '{dog_data['age_text']}': {e}"
                )

        # Set size if predicted
        size_prediction = dog_data.get("properties", {}).get("size_prediction")
        if size_prediction:
            standardized_data["size"] = size_prediction
            standardized_data["standardized_size"] = size_prediction

        return standardized_data

    def standardize_age_to_months(self, age_text: str) -> Optional[int]:
        """
        Convert age text to months.

        Args:
            age_text: Age string like "5 months" or "1.5 years"

        Returns:
            Age in months or None
        """
        if not age_text:
            return None

        try:
            # Extract number and unit
            match = re.search(r"(\d+(?:\.\d+)?)\s+(months?|years?)", age_text.lower())
            if not match:
                return None

            number = float(match.group(1))
            unit = match.group(2)

            if "month" in unit:
                return int(number)
            elif "year" in unit:
                return int(number * 12)

        except (ValueError, AttributeError):
            pass

        return None

    def collect_data(self) -> List[Dict[str, Any]]:
        """
        Collect animal data from REAN website.

        This is the abstract method required by BaseScraper.

        Returns:
            List of dictionaries, each containing data for one animal
        """
        return self.scrape_animals()
