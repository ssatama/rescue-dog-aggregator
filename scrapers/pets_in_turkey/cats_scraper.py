# scrapers/pets_in_turkey/cats_scraper.py

import time
import json
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

class PetsInTurkeyCatsScraper(BaseScraper):
    """Scraper for Pets in Turkey organization cats.
    
    This scraper is designed to extract cat listings from the Pets in Turkey website.
    It specifically targets the cats page and extracts information for the known
    cat names. The scraper handles both available and adopted cats, extracting
    details like breed, age, sex, and ready-to-fly status.
    """
    
    def __init__(self, organization_id, organization_name="Pets in Turkey"):
        """Initialize the Pets in Turkey cats scraper.
        
        Args:
            organization_id: Database ID of the organization
            organization_name: Name of the organization
        """
        super().__init__(organization_id, organization_name, animal_type="cat")
        self.base_url = "https://www.petsinturkey.org/cats"
        self.driver = None
        
        # Known cat names (from the website)
        # These are the specific cats we want to extract
        self.known_cat_names = ["Shirin", "Puri", "Trooper", "Boncuk", "Sütlach", "Atlas", "Milka"]
        
        # Words that are definitely not cat names (for filtering)
        # This helps avoid false positives from page elements
        self.non_cat_words = [
            "comment", "weight", "age", "sex", "neutered", "spayed", "adopt", "me", 
            "kg", "download", "home", "mission", "team", "partners", "events", "contact", 
            "info", "petsinturkey", "subscribe", "join", "y/o", "yes", "no", "male", 
            "female", "our", "rescue", "cats", "ready", "fly", "in", "may", "blind", 
            "legged", "smokin", "tabby", "colored", "shorthair", "application", "form", 
            "support", "us", "adopted", "lives", "berlin", "london", "geneva"
        ]
    
    def _setup_selenium(self):
        """Set up Selenium WebDriver for scraping.
        
        Returns:
            WebDriver instance or None if setup fails
        """
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
        """Collect cat data from the source.
        
        This method navigates to the cats page, scrolls to load all content,
        and extracts data for each of the known cats.
        
        Returns:
            List of dictionaries with cat data
        """
        cats_data = []
        
        try:
            # Set up Selenium
            self.driver = self._setup_selenium()
            if not self.driver:
                self.logger.error("Failed to set up Selenium WebDriver")
                return cats_data
            
            # Navigate to the cats page
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
                time.sleep(1)
            
            # Go back to top
            self.driver.execute_script("window.scrollTo(0, 0);")
            time.sleep(2)
            
            processed_cats = set()  # Keep track of cats we've already processed
            
            # Process only the known cat names we're specifically looking for
            for cat_name in self.known_cat_names:
                # First try an exact match
                cat_elements = self.driver.find_elements(By.XPATH, f"//*[text()='{cat_name}']")
                
                if cat_elements:
                    self.logger.info(f"Found cat with exact match: {cat_name}")
                    self._process_cat(cat_elements[0], cat_name, cats_data, processed_cats)
                else:
                    # Try a more relaxed search if exact match fails
                    cat_elements = self.driver.find_elements(By.XPATH, f"//*[contains(text(), '{cat_name}')]")
                    if cat_elements:
                        self.logger.info(f"Found cat with partial match: {cat_name}")
                        self._process_cat(cat_elements[0], cat_name, cats_data, processed_cats)
                    else:
                        self.logger.warning(f"Could not find cat: {cat_name}")
            
            self.logger.info(f"Collected data for {len(cats_data)} cats")
            
        except Exception as e:
            self.logger.error(f"Error collecting cat data: {e}")
            import traceback
            self.logger.error(traceback.format_exc())
        
        finally:
            # Close the WebDriver
            if self.driver:
                self.driver.quit()
                self.logger.info("Selenium WebDriver closed")
        
        return cats_data
    
    def _process_cat(self, element, cat_name, cats_data, processed_cats):
        """Process a cat element and extract information.
        
        This method extracts all relevant information for a cat based on its
        name element. It navigates the DOM to find the container with all
        cat information and parses it.
        
        Args:
            element: WebElement containing the cat name
            cat_name: Name of the cat
            cats_data: List to append the extracted cat data to
            processed_cats: Set of cat names that have already been processed
        """
        try:
            # Skip if we've already processed this cat
            if cat_name in processed_cats:
                return
                
            processed_cats.add(cat_name)
            
            # Find the cat section container
            section = None
            elem = element
            
            # Navigate up to find the container with all information
            for _ in range(6):
                try:
                    parent = elem.find_element(By.XPATH, "..")
                    if parent:
                        elem = parent
                        # Check if this looks like a main container
                        section_text = elem.text
                        if (cat_name in section_text and
                            ("Weight" in section_text or "Comment" in section_text) and 
                            ("Age" in section_text or "Sex" in section_text)):
                            section = elem
                            self.logger.info(f"Found main section for {cat_name}")
                            break
                except:
                    break
            
            if not section:
                self.logger.warning(f"Could not find main section for {cat_name}")
                return
            
            # Get section text and display it for debugging
            section_text = section.text
            self.logger.info(f"Section text for {cat_name}: {section_text}")
            
            # Create base cat data
            cat_data = {
                'name': cat_name,
                'animal_type': 'cat',
                'external_id': f"pit-cat-{cat_name.lower().replace(' ', '-')}",
                'status': 'available',
                'adoption_url': self.base_url + "#" + cat_name.lower().replace(" ", "-"),
                'properties': {}
            }
            
            # Check if this cat is adopted
            if "Adopted" in section_text:
                self.logger.info(f"Cat {cat_name} is already adopted")
                cat_data['status'] = 'adopted'
                
                # Try to extract location information for adopted cats
                adopted_match = re.search(r"Adopted[,!\s]+(?:he|she|they|it)?\s+lives?\s+in\s+([^\n]+)", section_text)
                if adopted_match:
                    cat_data['properties']['adopted_location'] = adopted_match.group(1).strip()
                    self.logger.info(f"Adopted location: {cat_data['properties']['adopted_location']}")
            
            # Extract "Ready to fly" information if present
            if "Ready to fly" in section_text:
                ready_match = re.search(r"Ready to fly([^\n]+)?", section_text)
                if ready_match and ready_match.group(1):
                    cat_data['properties']['ready_to_fly'] = ready_match.group(1).strip()
                    self.logger.info(f"Ready to fly: {cat_data['properties']['ready_to_fly']}")
                else:
                    cat_data['properties']['ready_to_fly'] = "Yes"
                    self.logger.info("Ready to fly: Yes")
            
            # Find image for this cat
            found_image = False
            
            # First try in the section container
            try:
                images = section.find_elements(By.TAG_NAME, "img")
                for img in images:
                    src = img.get_attribute('src')
                    if src and src.startswith('http') and not src.endswith('.svg') and \
                       'icon' not in src.lower() and 'logo' not in src.lower():
                        cat_data['primary_image_url'] = src
                        self.logger.info(f"Found image for {cat_name}: {src}")
                        found_image = True
                        break
            except Exception as e:
                self.logger.warning(f"Error finding image in section: {e}")
            
            # If we didn't find an image in the section, try looking in parent containers
            if not found_image:
                container = section
                for _ in range(3):  # Look up a few more levels
                    try:
                        parent = container.find_element(By.XPATH, "..")
                        if parent:
                            container = parent
                            images = container.find_elements(By.TAG_NAME, "img")
                            for img in images:
                                src = img.get_attribute('src')
                                if src and src.startswith('http') and not src.endswith('.svg') and \
                                   'icon' not in src.lower() and 'logo' not in src.lower():
                                    cat_data['primary_image_url'] = src
                                    self.logger.info(f"Found image for {cat_name} in parent: {src}")
                                    found_image = True
                                    break
                            if found_image:
                                break
                    except:
                        break
            
            # Parse the section text into lines
            lines = section_text.split('\n')
            
            # Find where the labels and values are
            label_indices = {}
            for i, line in enumerate(lines):
                if line in ["Comment", "Weight", "Age", "Sex", "Neutered", "Spayed", "Blind"]:
                    label_indices[line] = i
            
            # Find where the "Adopt Me" buttons are (they appear before values)
            adopt_me_indices = []
            for i, line in enumerate(lines):
                if line == "Adopt Me":
                    adopt_me_indices.append(i)
            
            # Determine where values start (after the last Adopt Me)
            if adopt_me_indices and label_indices:
                values_start = max(adopt_me_indices) + 1
                
                # Make sure values_start is valid
                if values_start < len(lines):
                    # Extract values
                    values = lines[values_start:values_start + len(label_indices)]
                    
                    # Based on the structure in the cats listings,
                    # the first value corresponds to Comment, second to Weight, etc.
                    if len(values) >= 1 and "Comment" in label_indices:
                        cat_data['breed'] = values[0]
                        self.logger.info(f"Breed (from Comment): {values[0]}")
                    
                    if len(values) >= 2 and "Weight" in label_indices:
                        cat_data['properties']['weight'] = values[1]
                        self.logger.info(f"Weight: {values[1]}")
                    
                    if len(values) >= 3 and "Age" in label_indices:
                        cat_data['age_text'] = values[2]
                        self.logger.info(f"Age: {values[2]}")
                        
                        # Convert age to months for filtering
                        age_text = values[2].lower()
                        if 'y/o' in age_text:
                            # Handle European format with comma
                            age_text = age_text.replace(',', '.')
                            years_match = re.search(r'(\d+(?:\.\d+)?)', age_text)
                            if years_match:
                                years = float(years_match.group(1))
                                cat_data['age_min_months'] = int(years * 12)
                                cat_data['age_max_months'] = int(years * 12 + 12)
                    
                    if len(values) >= 4 and "Sex" in label_indices:
                        cat_data['sex'] = values[3]
                        self.logger.info(f"Sex: {values[3]}")
                    
                    if len(values) >= 5 and ("Neutered" in label_indices or "Spayed" in label_indices or "Blind" in label_indices):
                        status_key = "Neutered" if "Neutered" in label_indices else "Spayed" if "Spayed" in label_indices else "Blind"
                        status_value = values[4]
                        
                        if status_key == "Blind":
                            cat_data['properties']['blind'] = status_value
                            self.logger.info(f"Blind: {status_value}")
                        else:
                            cat_data['properties']['neutered_spayed'] = status_value
                            self.logger.info(f"Neutered/Spayed: {status_value}")
            
            # Alternative parsing for when standard parsing doesn't work
            if 'breed' not in cat_data and section_text:
                # Look for patterns in the text
                if "Breed" in section_text or "Comment" in section_text:
                    # Try to extract breed/comment
                    comment_match = re.search(r"Comment\s+([^\n]+)", section_text)
                    if comment_match:
                        cat_data['breed'] = comment_match.group(1).strip()
                        self.logger.info(f"Breed (from Comment pattern): {cat_data['breed']}")
                
                if "Weight" in section_text:
                    # Try to extract weight
                    weight_match = re.search(r"Weight\s+([^\n]+)", section_text)
                    if weight_match:
                        cat_data['properties']['weight'] = weight_match.group(1).strip()
                        self.logger.info(f"Weight (from pattern): {cat_data['properties']['weight']}")
                
                if "Age" in section_text:
                    # Try to extract age
                    age_match = re.search(r"Age\s+([^\n]+)", section_text)
                    if age_match:
                        cat_data['age_text'] = age_match.group(1).strip()
                        self.logger.info(f"Age (from pattern): {cat_data['age_text']}")
                
                if "Sex" in section_text:
                    # Try to extract sex
                    sex_match = re.search(r"Sex\s+([^\n]+)", section_text)
                    if sex_match:
                        cat_data['sex'] = sex_match.group(1).strip()
                        self.logger.info(f"Sex (from pattern): {cat_data['sex']}")
                
                if "Neutered" in section_text:
                    # Try to extract neutered status
                    neutered_match = re.search(r"Neutered\s+([^\n]+)", section_text)
                    if neutered_match:
                        cat_data['properties']['neutered_spayed'] = neutered_match.group(1).strip()
                        self.logger.info(f"Neutered (from pattern): {cat_data['properties']['neutered_spayed']}")
                elif "Spayed" in section_text:
                    # Try to extract spayed status
                    spayed_match = re.search(r"Spayed\s+([^\n]+)", section_text)
                    if spayed_match:
                        cat_data['properties']['neutered_spayed'] = spayed_match.group(1).strip()
                        self.logger.info(f"Spayed (from pattern): {cat_data['properties']['neutered_spayed']}")
            
            # If we have at least the name, add the cat
            if cat_data['name']:
                # If we didn't find an image, use a placeholder
                if 'primary_image_url' not in cat_data:
                    cat_data['primary_image_url'] = "https://via.placeholder.com/300x200?text=No+Image+Available"
                    self.logger.warning(f"Using placeholder image for {cat_name}")
                
                # Add to our collection
                cats_data.append(cat_data)
                self.logger.info(f"Added cat: {cat_name}")
            else:
                self.logger.warning(f"Insufficient data for cat {cat_name}, skipping")
                
        except Exception as e:
            self.logger.error(f"Error processing cat {cat_name}: {e}")
            import traceback
            self.logger.error(traceback.format_exc())
    
    def _find_image_for_container(self, container):
        """Find an image URL for a cat container.
        
        Args:
            container: WebElement containing the cat information
            
        Returns:
            Image URL string or None if no image found
        """
        try:
            # Look for img tags in the container
            images = container.find_elements(By.TAG_NAME, "img")
            
            # Filter for valid cat images
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