# scrapers/pets_in_turkey/scraper.py

import time
import re
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import sys
import os

# Add the project root directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import the base scraper
from scrapers.base_scraper import BaseScraper

class PetsInTurkeyScraper(BaseScraper):
    """Scraper for Pets in Turkey organization."""
    
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
            driver.set_page_load_timeout(30)  # Set timeout to 30 seconds
            
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
            
            # Use the dogs URL
            correct_url = "https://www.petsinturkey.org/dogs"
            self.logger.info(f"Navigating to: {correct_url}")
            self.driver.get(correct_url)
            
            # Wait for the page to load
            self.logger.info("Waiting for page to load...")
            WebDriverWait(self.driver, 20).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            
            # Wait longer for dynamic content to load
            time.sleep(5)
            
            # Use JavaScript to find elements with text starting with "I'm"
            script = """
                return Array.from(document.querySelectorAll('*')).filter(el => 
                    el.innerText && el.innerText.trim().startsWith("I'm ")
                ).map(el => {
                    const text = el.innerText.trim();
                    const nameMatch = /I'm ([^\\n]+)/.exec(text);
                    const name = nameMatch ? nameMatch[1].trim() : '';
                    
                    return { 
                        element: el,
                        name: name,
                        text: text
                    };
                }).filter(item => item.name);
            """
            
            dog_elements = self.driver.execute_script(script)
            self.logger.info(f"Found {len(dog_elements)} dog name elements")
            
            # For each dog, find an image and create a basic data entry
            for dog in dog_elements:
                try:
                    dog_name = dog['name']
                    self.logger.info(f"Processing dog: {dog_name}")
                    
                    # Find an image for this dog
                    image_url = self.find_image_for_dog(dog_name)
                    
                    # Create a basic dog entry with default values
                    dog_data = {
                        'name': dog_name,
                        'adoption_url': correct_url + "#" + dog_name.lower().replace(" ", "-"),
                        'status': 'available',
                        'breed': 'Mix',  # Default value
                        'age_text': 'Unknown',
                        'sex': 'Unknown',
                        'size': 'Medium',  # Default value
                        'primary_image_url': image_url
                    }
                    
                    # Add to our list
                    dogs_data.append(dog_data)
                    
                except Exception as e:
                    self.logger.error(f"Error processing dog: {e}")
            
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
    
    def find_image_for_dog(self, dog_name):
        """Find an image URL for a dog by name."""
        try:
            # Use JavaScript to find an image for this specific dog
            script = f"""
                // Find the dog's heading element
                const dogElements = Array.from(document.querySelectorAll('*')).filter(el => 
                    el.innerText && el.innerText.trim().startsWith("I'm {dog_name}")
                );
                
                if (dogElements.length === 0) return null;
                
                // For the first match, look for images in the vicinity
                let currentElement = dogElements[0];
                
                // First, look for images directly inside this element
                let directImages = currentElement.querySelectorAll('img');
                for (let img of directImages) {{
                    if (img.src && 
                        img.src.startsWith('http') && 
                        !img.src.endsWith('.svg') &&
                        img.naturalWidth > 50 && 
                        img.naturalHeight > 50) {{
                        return img.src;
                    }}
                }}
                
                // Look in parent elements for images
                for (let i = 0; i < 5; i++) {{
                    if (!currentElement.parentElement) break;
                    currentElement = currentElement.parentElement;
                    
                    // Look for images in this parent
                    let images = currentElement.querySelectorAll('img');
                    for (let img of images) {{
                        if (img.src && 
                            img.src.startsWith('http') && 
                            !img.src.endsWith('.svg') &&
                            !img.src.includes('icon') &&
                            !img.src.includes('logo') &&
                            (img.naturalWidth > 80 || img.width > 80) &&
                            (img.naturalHeight > 80 || img.height > 80)) {{
                            return img.src;
                        }}
                    }}
                }}
                
                // If we still don't have an image, look for any large images on the page
                const allImages = Array.from(document.querySelectorAll('img')).filter(img => 
                    img.src && 
                    img.src.startsWith('http') && 
                    !img.src.endsWith('.svg') &&
                    !img.src.includes('icon') &&
                    !img.src.includes('logo') &&
                    img.naturalWidth > 100 && 
                    img.naturalHeight > 100
                );
                
                return allImages.length > 0 ? allImages[0].src : null;
            """
            
            image_url = self.driver.execute_script(script)
            
            if image_url:
                # Clean up the URL to get the original, non-cropped image
                # Pattern to match: https://static.wixstatic.com/media/[id]~mv2.jpeg/v1/...
                # We want: https://static.wixstatic.com/media/[id]~mv2.jpeg
                
                # Extract just the base URL up to the image extension
                pattern = r'(https://static\.wixstatic\.com/media/[^/]+\.[^/]+)'
                match = re.search(pattern, image_url)
                if match:
                    image_url = match.group(1)
                
            if not image_url:
                # If we still don't have an image, use a default
                return "https://example.com/no-image.jpg"
                
            return image_url
        except Exception as e:
            self.logger.error(f"Error finding image for dog {dog_name}: {e}")
            return "https://example.com/no-image.jpg"