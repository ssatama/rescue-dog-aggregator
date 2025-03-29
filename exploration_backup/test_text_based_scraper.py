# exploration/final_correct_parser.py

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

# Create a simple logger
class SimpleLogger:
    def info(self, msg):
        print(f"INFO: {msg}")
    
    def error(self, msg):
        print(f"ERROR: {msg}")
    
    def warning(self, msg):
        print(f"WARNING: {msg}")

def setup_selenium():
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
        
        print("Selenium WebDriver set up successfully")
        return driver
    except Exception as e:
        print(f"Error setting up Selenium: {e}")
        return None

def test_final_correct_parser():
    """Test the final correct parsing approach."""
    logger = SimpleLogger()
    driver = setup_selenium()
    dogs_data = []
    
    try:
        # Navigate to the dogs page
        url = "https://www.petsinturkey.org/dogs"
        logger.info(f"Navigating to: {url}")
        driver.get(url)
        
        # Wait for the page to load
        logger.info("Waiting for page to load...")
        WebDriverWait(driver, 30).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        
        # Wait longer for dynamic content to load
        time.sleep(10)
        
        # Scroll through the page to ensure all content is loaded
        logger.info("Scrolling to load all content...")
        for i in range(5):
            driver.execute_script(f"window.scrollTo(0, {i * 1000});")
            time.sleep(2)
        
        # Go back to top
        driver.execute_script("window.scrollTo(0, 0);")
        time.sleep(2)
        
        # Find all "Breed" elements as entry points
        breed_elements = driver.find_elements(By.XPATH, "//span[text()='Breed' or text()='BREED']")
        logger.info(f"Found {len(breed_elements)} 'Breed' elements")
        
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
                    # Save the first few containers for analysis
                    if idx < 3:
                        with open(f"container_{idx+1}_final.txt", "w", encoding="utf-8") as f:
                            f.write(container_text)
                    
                    # Use the correctly aligned parsing approach
                    dog_data = parse_container_correctly(container_text, logger)
                    
                    # Find images for this dog
                    images = container.find_elements(By.TAG_NAME, "img")
                    image_url = None
                    
                    # Filter for valid images
                    for img in images:
                        src = img.get_attribute('src')
                        if src and src.startswith('http') and not src.endswith('.svg'):
                            image_url = src
                            # Clean up the URL
                            pattern = r'(https://static\.wixstatic\.com/media/[^/]+\.[^/]+)'
                            match = re.search(pattern, image_url)
                            if match:
                                image_url = match.group(1)
                            break
                    
                    # Create dog data entry
                    if dog_data and dog_data['name']:
                        # Add image and other metadata
                        dog_data['primary_image_url'] = image_url
                        dog_data['adoption_url'] = url + "#" + dog_data['name'].lower().replace(" ", "-")
                        dog_data['status'] = 'available'
                        dog_data['external_id'] = f"pit-{dog_data['name'].lower().replace(' ', '-')}"
                        
                        # Add to our collection
                        dogs_data.append(dog_data)
                        logger.info(f"Extracted data for dog: {dog_data['name']}")
            
            except Exception as e:
                logger.error(f"Error processing breed element {idx}: {e}")
        
        logger.info(f"Collected data for {len(dogs_data)} dogs")
        
        # Save the collected data to a JSON file
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        output_file = f"final_correct_parser_{timestamp}.json"
        
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(dogs_data, f, indent=2)
        
        logger.info(f"Saved results to {output_file}")
        
        # Print summary
        breeds = set(dog['breed'] for dog in dogs_data if dog['breed'] != 'Unknown')
        sexes = set(dog['sex'] for dog in dogs_data if dog['sex'] != 'Unknown')
        ages = set(dog['age_text'] for dog in dogs_data if dog['age_text'] != 'Unknown')
        
        print("\nData Summary:")
        print(f"Total dogs found: {len(dogs_data)}")
        print(f"Dogs with breed info: {sum(1 for dog in dogs_data if dog['breed'] != 'Unknown')}")
        print(f"Dogs with age info: {sum(1 for dog in dogs_data if dog['age_text'] != 'Unknown')}")
        print(f"Dogs with sex info: {sum(1 for dog in dogs_data if dog['sex'] != 'Unknown')}")
        print(f"Dogs with images: {sum(1 for dog in dogs_data if dog.get('primary_image_url'))}")
        
        print("\nBreeds found (sample):")
        for breed in list(breeds)[:5]:  # Show first 5
            print(f"- {breed}")
        
        print("\nSexes found (sample):")
        for sex in list(sexes)[:3]:  # Show first 3
            print(f"- {sex}")
            
        print("\nAges found (sample):")
        for age in list(ages)[:3]:  # Show first 3
            print(f"- {age}")
        
        # Print sample of first 3 dogs
        print("\nSample of extracted data:")
        for i, dog in enumerate(dogs_data[:3]):
            print(f"\nDog #{i+1}: {dog['name']}")
            print(f"  Breed: {dog['breed']}")
            print(f"  Age: {dog['age_text']}")
            print(f"  Sex: {dog['sex']}")
            if 'properties' in dog:
                if 'weight' in dog['properties']:
                    print(f"  Weight: {dog['properties']['weight']}")
                if 'height' in dog['properties']:
                    print(f"  Height: {dog['properties']['height']}")
                if 'description' in dog['properties']:
                    print(f"  Description: {dog['properties']['description']}")
            print(f"  Image: {dog.get('primary_image_url', 'None')}")
        
    except Exception as e:
        logger.error(f"Error during test: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Close the WebDriver
        if driver:
            driver.quit()
            logger.info("Selenium WebDriver closed")

def parse_container_correctly(text, logger):
    """Parse the dog container with correct attribute mapping.
    
    This parser accurately handles the exact structure of the container text.
    
    Args:
        text: Container text containing dog information
        logger: Logger for output
        
    Returns:
        Dictionary containing dog attributes
    """
    try:
        # Split text into lines for easier processing
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        # Initialize dog data
        dog_data = {
            'name': '',
            'breed': 'Unknown',
            'age_text': 'Unknown',
            'sex': 'Unknown',
            'properties': {
                'weight': '',
                'height': '',
                'neutered_spayed': 'Unknown',
                'description': ''
            }
        }
        
        # Extract dog name from the first line
        if not lines:
            return dog_data
            
        name_match = re.search(r"I'm\s+(\w+)", lines[0])
        if name_match:
            dog_data['name'] = name_match.group(1).strip()
        
        # Extract description (any lines between name and first attribute)
        description = ""
        desc_end_idx = -1
        
        for i in range(1, len(lines)):
            if lines[i] in ["Breed", "Weight", "Age", "Sex", "Neutered", "Spayed", "Size"]:
                desc_end_idx = i
                break
            description += " " + lines[i]
        
        dog_data['properties']['description'] = description.strip()
        
        if desc_end_idx == -1:
            return dog_data  # No attributes found
        
        # Find the start and end of attribute labels section
        attr_start_idx = desc_end_idx
        attr_end_idx = -1
        
        for i in range(attr_start_idx, len(lines)):
            if lines[i] == "Adopt Me":
                attr_end_idx = i
                break
        
        if attr_end_idx == -1:
            return dog_data  # Couldn't find attribute section end
        
        # Get all attribute labels
        attr_labels = []
        for i in range(attr_start_idx, attr_end_idx):
            if lines[i] in ["Breed", "Weight", "Age", "Sex", "Neutered", "Spayed", "Size"]:
                attr_labels.append(lines[i])
        
        # Skip all "Adopt Me" lines to find where values start
        value_start_idx = attr_end_idx
        while value_start_idx < len(lines) and lines[value_start_idx] == "Adopt Me":
            value_start_idx += 1
        
        # We now have the following indices:
        # - attr_start_idx: where attributes start
        # - attr_end_idx: where attributes end
        # - value_start_idx: where values start
        
        # Create a list of attribute values
        attr_values = []
        for i in range(value_start_idx, min(value_start_idx + len(attr_labels), len(lines))):
            attr_values.append(lines[i])
        
        # Now we have two parallel lists: attr_labels and attr_values
        # Map them correctly
        for i, label in enumerate(attr_labels):
            if i < len(attr_values):
                value = attr_values[i]
                
                if label == "Breed":
                    dog_data['breed'] = value
                elif label == "Age":
                    dog_data['age_text'] = value
                elif label == "Sex":
                    dog_data['sex'] = value
                elif label == "Weight":
                    # Extract height information if present
                    height_match = re.search(r'height:?\s*(\d+\s*cm)', value, re.IGNORECASE)
                    if height_match:
                        dog_data['properties']['height'] = height_match.group(1)
                    dog_data['properties']['weight'] = value
                elif label in ["Neutered", "Spayed"]:
                    dog_data['properties']['neutered_spayed'] = value
                elif label == "Size":
                    dog_data['properties']['size'] = value
        
        return dog_data
    
    except Exception as e:
        logger.error(f"Error parsing container: {e}")
        return dog_data

if __name__ == "__main__":
    print("Starting test of the final correct parser...")
    test_final_correct_parser()