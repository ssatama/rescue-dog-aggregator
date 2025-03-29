# exploration/basic_visible_scraper.py

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

def setup_visible_selenium():
    """Set up Selenium WebDriver in visible mode."""
    try:
        # Configure Chrome options - NOT headless
        chrome_options = Options()
        # Uncomment this if you need headless mode
        # chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--start-maximized")  # Start maximized
        
        # Set up the WebDriver
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        driver.set_page_load_timeout(60)  # Extended timeout
        
        print("Visible Selenium WebDriver set up successfully")
        return driver
    except Exception as e:
        print(f"Error setting up Selenium: {e}")
        return None

def basic_dog_extraction():
    """Extract dog data using a very basic visible approach."""
    driver = setup_visible_selenium()
    if not driver:
        return
    
    try:
        # Navigate to the dogs page
        url = "https://www.petsinturkey.org/dogs"
        print(f"Navigating to: {url}")
        driver.get(url)
        
        # Take an initial screenshot
        driver.save_screenshot("initial_load.png")
        print("Saved initial screenshot to initial_load.png")
        
        # Wait a long time for page load - this site might be slow
        print("Waiting for full page load (10 seconds)...")
        time.sleep(10)
        
        # Take another screenshot after waiting
        driver.save_screenshot("after_wait.png")
        print("Saved screenshot after waiting to after_wait.png")
        
        # Scroll down the page to trigger any lazy loading
        print("Scrolling through page to trigger content loading...")
        for i in range(5):
            driver.execute_script(f"window.scrollTo(0, {i * 1000});")
            time.sleep(1)  # Wait a bit after each scroll
            driver.save_screenshot(f"scroll_{i+1}.png")
        
        # Go back to top
        driver.execute_script("window.scrollTo(0, 0);")
        time.sleep(2)
        
        # Save the entire page source for analysis
        page_source = driver.page_source
        with open("full_page_source.html", "w", encoding="utf-8") as f:
            f.write(page_source)
        print("Saved full page source to full_page_source.html")
        
        # Try multiple approaches to find dog data
        
        print("\nApproach 1: Looking for dog names using simple string search")
        # Look for text that might contain dog names in a simple way
        page_text = driver.find_element(By.TAG_NAME, "body").text
        
        # Save the entire page text to a file
        with open("page_text.txt", "w", encoding="utf-8") as f:
            f.write(page_text)
        print("Saved full page text to page_text.txt")
        
        # Simple pattern match for "I'm [Name]"
        name_matches = re.findall(r"I[''']m\s+(\w+)", page_text)
        print(f"Found {len(name_matches)} potential dog names using text search:")
        for name in name_matches[:10]:  # Show first 10
            print(f"- {name}")
        
        print("\nApproach 2: Using CSS selectors to find elements")
        
        # Try to find headers or elements that might contain dog names
        potential_headers = driver.find_elements(By.CSS_SELECTOR, 
                                               "h1, h2, h3, h4, h5, h6, span.font_0, span.font_1, div.font_0, div.font_1")
        
        dog_names_from_headers = []
        for header in potential_headers:
            try:
                text = header.text
                if text and "I'm" in text:
                    match = re.search(r"I[''']m\s+(\w+)", text)
                    if match:
                        dog_names_from_headers.append(match.group(1))
            except:
                continue
        
        print(f"Found {len(dog_names_from_headers)} potential dog names from headers:")
        for name in dog_names_from_headers[:10]:  # Show first 10
            print(f"- {name}")
        
        print("\nApproach 3: Looking for elements with Breed, Age, Sex text")
        
        # Try to find elements with exactly "Breed", "Age", "Sex" text
        breed_elements = driver.find_elements(By.XPATH, "//span[text()='Breed' or text()='BREED']")
        age_elements = driver.find_elements(By.XPATH, "//span[text()='Age' or text()='AGE']")
        sex_elements = driver.find_elements(By.XPATH, "//span[text()='Sex' or text()='SEX']")
        
        print(f"Found {len(breed_elements)} elements with 'Breed' text")
        print(f"Found {len(age_elements)} elements with 'Age' text")
        print(f"Found {len(sex_elements)} elements with 'Sex' text")
        
        # If we found breed elements, try to analyze the first few
        if breed_elements:
            print("\nAnalyzing 'Breed' elements:")
            for i, elem in enumerate(breed_elements[:3]):  # First 3
                try:
                    # Get the element's parent
                    parent = elem.find_element(By.XPATH, "./..")
                    parent_text = parent.text
                    
                    # Get a screenshot of this element
                    driver.execute_script("arguments[0].scrollIntoView(true);", elem)
                    time.sleep(1)
                    elem.screenshot(f"breed_element_{i+1}.png")
                    
                    print(f"Breed element #{i+1}:")
                    print(f"  Text: {elem.text}")
                    print(f"  Parent text: {parent_text}")
                    print(f"  Tag name: {elem.tag_name}")
                    print(f"  Class: {elem.get_attribute('class')}")
                    print(f"  Saved screenshot to breed_element_{i+1}.png")
                    
                    # Try to find the parent container with dog info
                    container = elem
                    for j in range(5):
                        if not container.find_element(By.XPATH, ".."):
                            break
                        container = container.find_element(By.XPATH, "..")
                        container_text = container.text
                        if "I'm" in container_text and "Breed" in container_text and "Age" in container_text:
                            print(f"  Found potential dog container at level {j+1}")
                            print(f"  Container text preview: {container_text[:100]}...")
                            # Save this container
                            with open(f"dog_container_{i+1}.txt", "w", encoding="utf-8") as f:
                                f.write(container_text)
                            try:
                                container.screenshot(f"dog_container_{i+1}.png")
                                print(f"  Saved container screenshot to dog_container_{i+1}.png")
                            except:
                                print("  Could not take container screenshot")
                            break
                except Exception as e:
                    print(f"  Error analyzing breed element: {e}")
        
        print("\nScript completed. Please check the output files and screenshots.")
        
    except Exception as e:
        print(f"Error during extraction: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Wait before closing to let you see the browser
        print("\nWaiting 10 seconds before closing browser...")
        time.sleep(10)
        
        # Close the WebDriver
        if driver:
            driver.quit()
            print("Selenium WebDriver closed")

if __name__ == "__main__":
    print("Starting basic visible browser extraction...")
    basic_dog_extraction()