# scrapers/pets_in_turkey/text_based_scraper.py

import time
import json
import re
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import os
import sys

# Add the project root directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import the base scraper
from scrapers.base_scraper import BaseScraper

class PetsInTurkeyScraper(BaseScraper):
    """Scraper for Pets in Turkey organization.
    
    This scraper extracts dog data by finding the containers with all dog information
    and parsing the text content to extract attributes.
    """
    
    def __init__(self, organization_id, organization_name="Pets in Turkey"):
        """Initialize the Pets in Turkey scraper."""
        super().__init__(organization_id, organization_name)
        self.base_url = "https://www.petsinturkey.org/dogs"
        self.driver = None
    
    def _setup_selenium(self):
        """Set up Selenium WebDriver for scraping."""
        try:
            # Configure Chrome options
            chrome_options = Options()
            chrome_options.add_argument("--headless")  # Run in headless mode
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            
            # Set up the WebDriver
            service = Service(ChromeDriverManager().install())
            driver = webdriver.Chrome(service=service, options=chrome_options)
            driver.set_page_load_timeout(60)  # Increased timeout
            
            self.logger.info("Selenium WebDriver set up successfully")
            return driver
        except Exception as e:
            self.logger.error(f"Error setting up Selenium: {e}")
            return None
    
    def collect_data(self):
        """Collect dog data from the source."""
        dogs_data = []
        
        try:
            # Set up Selenium
            self.driver = self._setup_selenium()
            if not self.driver:
                self.logger.error("Failed to set up Selenium WebDriver")
                return dogs_data
            
            # Navigate to the dogs page
            self.logger.info(f"Navigating to: {self.base_url}")
            self.driver.get(self.base_url)
            
            # Wait for the page to load
            self.logger.info("Waiting for page to load...")
            WebDriverWait(self.driver, 30).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            
            # Wait longer for dynamic content to load
            time.sleep(10)
            
            # Scroll through the page to ensure all content is loaded
            self.logger.info("Scrolling to load all content...")
            for i in range(5):
                self.driver.execute_script(f"window.scrollTo(0, {i * 1000});")
                time.sleep(2)
            
            # Go back to top
            self.driver.execute_script("window.scrollTo(0, 0);")
            time.sleep(2)
            
            # Find all "Breed" elements as entry points
            breed_elements = self.driver.find_elements(By.XPATH, "//span[text()='Breed' or text()='BREED']")
            self.logger.info(f"Found {len(breed_elements)} 'Breed' elements")
            
            # Process each breed element to find dog containers
            for idx, breed_elem in enumerate(breed_elements):
                try:
                    # Navigate up to find the container with all dog info
                    container = breed_elem
                    container_found = False
                    
                    # Navigate up to level 5 parent
                    for _ in range(5):
                        try:
                            if container.find_element(By.XPATH, ".."):
                                container = container.find_element(By.XPATH, "..")
                            else:
                                break
                        except:
                            break
                    
                    # Extract the container text for analysis
                    container_text = container.text
                    
                    # Check if this is a valid dog container
                    if "I'm " in container_text and "Breed" in container_text and ("Age" in container_text or "Sex" in container_text):
                        # Use the fixed attribute mapping approach
                        dog_data = self._parse_dog_container(container_text)
                        
                        # Find images for this dog
                        image_url = self._find_image_for_container(container)
                        
                        # Create dog data entry
                        if dog_data and dog_data['name']:
                            # Add image and other metadata
                            dog_data['primary_image_url'] = image_url
                            dog_data['adoption_url'] = self.base_url + "#" + dog_data['name'].lower().replace(" ", "-")
                            dog_data['status'] = 'available'
                            
                            # Extract external_id if needed
                            dog_data['external_id'] = f"pit-{dog_data['name'].lower().replace(' ', '-')}"
                            
                            # Add to our collection
                            dogs_data.append(dog_data)
                            self.logger.info(f"Extracted data for dog: {dog_data['name']}")
                    
                except Exception as e:
                    self.logger.error(f"Error processing breed element {idx}: {e}")
            
            self.logger.info(f"Collected data for {len(dogs_data)} dogs")
            
        except Exception as e:
            self.logger.error(f"Error collecting dog data: {e}")
            import traceback
            self.logger.error(traceback.format_exc())
        
        finally:
            # Close the WebDriver
            if self.driver:
                self.driver.quit()
                self.logger.info("Selenium WebDriver closed")
        
        return dogs_data
    
    def _parse_dog_container(self, text):
        """Parse the dog container correctly mapping attributes to values.
        
        Args:
            text: Container text containing dog information
            
        Returns:
            Dictionary containing dog attributes
        """
        try:
            # Split text into lines for easier processing
            lines = [line.strip() for line in text.split('\n') if line.strip()]
            
            # Extract dog name
            dog_data = {}
            if not lines:
                return None
                
            name_match = re.search(r"I'm\s+(\w+)", lines[0])
            if name_match:
                dog_data['name'] = name_match.group(1).strip()
            else:
                return None
            
            # Extract description (text between name and first attribute)
            description = ""
            description_idx = -1
            for i in range(1, len(lines)):
                if lines[i] in ["Breed", "Weight", "Age", "Sex", "Neutered", "Spayed", "Size"]:
                    break
                description += " " + lines[i]
                description_idx = i
            
            dog_data['description'] = description.strip()
            
            # Find where attributes start and values end
            # Attribute section includes all lines with attribute labels
            attr_start_idx = description_idx + 1 if description_idx >= 0 else 1
            
            # Find all the attribute labels in order
            attr_labels = []
            attr_indices = []
            
            for i in range(attr_start_idx, len(lines)):
                if lines[i] in ["Breed", "Weight", "Age", "Sex", "Neutered", "Spayed", "Size"]:
                    attr_labels.append(lines[i])
                    attr_indices.append(i)
            
            # Find where attribute values start (after "Adopt Me" buttons)
            value_start_idx = -1
            for i in range(attr_indices[-1] + 1, len(lines)):
                if lines[i] == "Adopt Me":
                    continue
                value_start_idx = i
                break
            
            if value_start_idx == -1:
                # No values found
                return {
                    'name': dog_data['name'],
                    'breed': 'Unknown',
                    'age_text': 'Unknown',
                    'sex': 'Unknown',
                    'properties': {
                        'description': dog_data['description']
                    }
                }
            
            # Now map each attribute to its exact value
            breed_value = ''
            weight_value = ''
            age_value = ''
            sex_value = ''
            neutered_value = ''
            size_value = ''
            
            # Find the value for each attribute
            for i, label in enumerate(attr_labels):
                value_idx = value_start_idx + i
                if value_idx >= len(lines):
                    break
                
                if label == "Breed":
                    breed_value = lines[value_idx]
                elif label == "Weight":
                    weight_value = lines[value_idx]
                elif label == "Age":
                    age_value = lines[value_idx]
                elif label == "Sex":
                    sex_value = lines[value_idx]
                elif label in ["Neutered", "Spayed"]:
                    neutered_value = lines[value_idx]
                elif label == "Size":
                    size_value = lines[value_idx]
            
            # Handle height information in weight field
            height_value = ''
            if 'height' in weight_value.lower():
                height_match = re.search(r'height:?\s*(\d+\s*cm)', weight_value, re.IGNORECASE)
                if height_match:
                    height_value = height_match.group(1)
                    # Clean up weight value
                    weight_value = re.sub(r'height:?\s*\d+\s*cm', '', weight_value, flags=re.IGNORECASE).strip()
            
            # Build standardized data structure
            return {
                'name': dog_data['name'],
                'breed': breed_value if breed_value else 'Unknown',
                'age_text': age_value if age_value else 'Unknown',
                'sex': sex_value if sex_value else 'Unknown',
                'properties': {
                    'weight': weight_value,
                    'height': height_value,
                    'neutered_spayed': neutered_value,
                    'description': dog_data['description']
                }
            }
        
        except Exception as e:
            self.logger.error(f"Error parsing dog container: {e}")
            return {
                'name': dog_data.get('name', ''),
                'breed': 'Unknown',
                'age_text': 'Unknown',
                'sex': 'Unknown',
                'properties': {
                    'description': dog_data.get('description', '')
                }
            }
    
    def _find_image_for_container(self, container):
        """Find an image URL for a dog container.
        
        Args:
            container: WebElement containing the dog information
            
        Returns:
            Image URL string
        """
        try:
            # Look for img tags in the container
            images = container.find_elements(By.TAG_NAME, "img")
            
            # Filter for valid dog images
            for img in images:
                src = img.get_attribute('src')
                if src and src.startswith('http') and not src.endswith('.svg') and \
                   'icon' not in src.lower() and 'logo' not in src.lower():
                    # Clean up the URL to get the original, non-cropped image
                    pattern = r'(https://static\.wixstatic\.com/media/[^/]+\.[^/]+)'
                    match = re.search(pattern, src)
                    if match:
                        return match.group(1)
                    return src
            
            return None
        except Exception as e:
            self.logger.error(f"Error finding image: {e}")
            return None