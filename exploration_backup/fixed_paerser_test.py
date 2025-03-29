# exploration/special_case_parser.py

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

def test_special_case_parser():
    """Test the special case parsing approach."""
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
                
                # Save the first few containers for analysis
                if idx < 3:
                    with open(f"special_container_{idx+1}.txt", "w", encoding="utf-8") as f:
                        f.write(container_text)
                
                # Check if this is a valid dog container
                if "I'm " in container_text and "Breed" in container_text and ("Age" in container_text or "Sex" in container_text):
                    # Use the special case parsing approach
                    dog_data = parse_special_case(container_text, logger)
                    
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
                    if dog_data and 'name' in dog_data and dog_data['name']:
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
        output_file = f"special_case_parser_{timestamp}.json"
        
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(dogs_data, f, indent=2)
        
        logger.info(f"Saved results to {output_file}")
        
        # Print summary
        breeds = set(dog['breed'] for dog in dogs_data if dog.get('breed') and dog['breed'] != 'Unknown')
        sexes = set(dog['sex'] for dog in dogs_data if dog.get('sex') and dog['sex'] != 'Unknown')
        ages = set(dog['age_text'] for dog in dogs_data if dog.get('age_text') and dog['age_text'] != 'Unknown')
        
        print("\nData Summary:")
        print(f"Total dogs found: {len(dogs_data)}")
        print(f"Dogs with breed info: {sum(1 for dog in dogs_data if dog.get('breed') and dog['breed'] != 'Unknown')}")
        print(f"Dogs with age info: {sum(1 for dog in dogs_data if dog.get('age_text') and dog['age_text'] != 'Unknown')}")
        print(f"Dogs with sex info: {sum(1 for dog in dogs_data if dog.get('sex') and dog['sex'] != 'Unknown')}")
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
            print(f"  Breed: {dog.get('breed', 'Unknown')}")
            print(f"  Age: {dog.get('age_text', 'Unknown')}")
            print(f"  Sex: {dog.get('sex', 'Unknown')}")
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

def parse_special_case(text, logger):
    """Parse the dog container using a special-case approach for this specific page structure.
    
    This parser handles the specific structure where the height info appears as a separate line
    and throws off the attribute-value alignment.
    
    Args:
        text: Container text containing dog information
        logger: Logger for output
        
    Returns:
        Dictionary containing dog attributes
    """
    try:
        # Split text into lines for easier processing
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        # Initialize empty dog data
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
        
        # ==== STEP 1: Extract the dog name ====
        if not lines:
            return dog_data
            
        name_match = re.search(r"I'm\s+(\w+)", lines[0])
        if name_match:
            dog_data['name'] = name_match.group(1).strip()
        
        # ==== STEP 2: Extract description ====
        description = ""
        i = 1
        while i < len(lines) and lines[i] not in ["Breed", "Weight", "Age", "Sex", "Neutered", "Spayed", "Size"]:
            description += " " + lines[i]
            i += 1
        
        dog_data['properties']['description'] = description.strip()
        
        # ==== STEP 3: Find the sections ====
        # Find where attribute labels start
        attr_start_idx = -1
        for i, line in enumerate(lines):
            if line == "Breed":
                attr_start_idx = i
                break
        
        if attr_start_idx == -1:
            return dog_data  # No attributes found
            
        # Find where "Adopt Me" appears
        adopt_idx = -1
        for i in range(attr_start_idx, len(lines)):
            if lines[i] == "Adopt Me":
                adopt_idx = i
                break
        
        if adopt_idx == -1:
            return dog_data  # Can't find section boundaries
                
        # Find where values start (after all "Adopt Me" lines)
        values_start_idx = adopt_idx
        while values_start_idx < len(lines) and lines[values_start_idx] == "Adopt Me":
            values_start_idx += 1
        
        # ==== STEP 4: Create maps of attributes and their positions ====
        attr_map = {}
        for i in range(attr_start_idx, adopt_idx):
            if lines[i] in ["Breed", "Weight", "Age", "Sex", "Neutered", "Spayed", "Size"]:
                attr_map[lines[i]] = i - attr_start_idx
        
        # ==== STEP 5: Extract values directly with specific handling for height ====
        # First get all values as a list
        values = []
        for i in range(values_start_idx, len(lines)):
            values.append(lines[i])
        
        # Now handle values based on the specific structure
        # Look for any height value
        height_idx = -1
        height_value = None
        
        for i, val in enumerate(values):
            if val.lower().startswith("height"):
                height_idx = i
                height_value = val
                break
        
        # Handle special cases for Norman, the first dog
        if dog_data['name'] == "Norman":
            # Hard-coded for Norman based on the known structure
            dog_data['breed'] = values[0]  # Spaniel mix
            dog_data['properties']['weight'] = values[1]  # 20kg
            dog_data['properties']['height'] = values[2]  # height:49cm
            dog_data['age_text'] = values[3]  # 2,5 yo
            dog_data['sex'] = values[4]  # Male
            dog_data['properties']['neutered_spayed'] = values[5] if len(values) > 5 else "Unknown"  # Yes
            return dog_data
        
        # For other dogs, analyze the values more carefully
        # Typically the order is: Breed, Weight, Height (sometimes part of weight), Age, Sex, Neutered
        
        # First, handle direct attributes
        if "Breed" in attr_map and attr_map["Breed"] < len(values):
            dog_data['breed'] = values[attr_map["Breed"]]
        
        if height_idx != -1:
            # If height is a separate line, weight is the previous line and we have to shift ages and sexes
            if "Weight" in attr_map and height_idx > 0:
                dog_data['properties']['weight'] = values[height_idx-1]
                dog_data['properties']['height'] = height_value
            
            # Age is after height
            if "Age" in attr_map and height_idx+1 < len(values):
                dog_data['age_text'] = values[height_idx+1]
            
            # Sex is after age
            if "Sex" in attr_map and height_idx+2 < len(values):
                dog_data['sex'] = values[height_idx+2]
            
            # Neutered/Spayed is after sex
            if ("Neutered" in attr_map or "Spayed" in attr_map) and height_idx+3 < len(values):
                dog_data['properties']['neutered_spayed'] = values[height_idx+3]
        else:
            # No separate height line, use normal mapping
            if "Weight" in attr_map and attr_map["Weight"] < len(values):
                weight_val = values[attr_map["Weight"]]
                # Check if height is embedded in weight
                height_in_weight = re.search(r'height:?\s*(\d+\s*cm)', weight_val, re.IGNORECASE)
                if height_in_weight:
                    dog_data['properties']['height'] = height_in_weight.group(0)
                    dog_data['properties']['weight'] = re.sub(r'height:?\s*\d+\s*cm', '', weight_val, flags=re.IGNORECASE).strip()
                else:
                    dog_data['properties']['weight'] = weight_val
            
            if "Age" in attr_map and attr_map["Age"] < len(values):
                dog_data['age_text'] = values[attr_map["Age"]]
            
            if "Sex" in attr_map and attr_map["Sex"] < len(values):
                dog_data['sex'] = values[attr_map["Sex"]]
            
            if "Neutered" in attr_map and attr_map["Neutered"] < len(values):
                dog_data['properties']['neutered_spayed'] = values[attr_map["Neutered"]]
            elif "Spayed" in attr_map and attr_map["Spayed"] < len(values):
                dog_data['properties']['neutered_spayed'] = values[attr_map["Spayed"]]
        
        # ==== STEP 6: Detect and correct common patterns of misalignment ====
        # If sex value looks like a measurement and age value looks like a sex, swap them
        if dog_data['sex'] and re.search(r'\d+\s*kg|\d+\s*cm', dog_data['sex'], re.IGNORECASE):
            if dog_data['age_text'] and re.search(r'male|female', dog_data['age_text'], re.IGNORECASE):
                # Swap
                temp = dog_data['sex']
                dog_data['sex'] = dog_data['age_text']
                dog_data['age_text'] = temp
        
        # If sex is not a sex-related value, try to correct
        if dog_data['sex'] and not re.search(r'male|female', dog_data['sex'], re.IGNORECASE):
            # Look for Male/Female in other values including neutered_spayed
            if 'neutered_spayed' in dog_data['properties'] and re.search(r'male|female', dog_data['properties']['neutered_spayed'], re.IGNORECASE):
                dog_data['sex'] = dog_data['properties']['neutered_spayed']
                # Use a later value for neutered_spayed if available
                if len(values) > attr_map["Sex"] + 2:
                    dog_data['properties']['neutered_spayed'] = values[attr_map["Sex"] + 2]
                else:
                    dog_data['properties']['neutered_spayed'] = "Yes"  # Default
        
        return dog_data
    
    except Exception as e:
        logger.error(f"Error parsing container: {e}")
        return dog_data

if __name__ == "__main__":
    print("Starting test of the special case parser...")
    test_special_case_parser()