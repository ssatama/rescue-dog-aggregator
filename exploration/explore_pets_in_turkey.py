import time
import requests
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
import json

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
        driver.set_page_load_timeout(30)  # Set timeout to 30 seconds
        
        print("Selenium WebDriver set up successfully")
        return driver
    except Exception as e:
        print(f"Error setting up Selenium: {e}")
        return None

def explore_website():
    """Explore the Pets in Turkey website structure."""
    driver = setup_selenium()
    if not driver:
        return
    
    try:
        # Navigate to the dogs page
        url = "https://www.petsinturkey.org/dogs"
        print(f"Navigating to: {url}")
        driver.get(url)
        
        # Wait for the page to load
        print("Waiting for page to load...")
        WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        
        # Wait for dynamic content
        time.sleep(5)
        
        # Get the page source
        page_source = driver.page_source
        
        # Save the full page source for analysis
        with open("pets_in_turkey_page.html", "w", encoding="utf-8") as f:
            f.write(page_source)
        print("Saved full page source to pets_in_turkey_page.html")
        
        # Take a screenshot
        driver.save_screenshot("pets_in_turkey_full.png")
        print("Saved screenshot to pets_in_turkey_full.png")
        
        # Find elements with "Breed" text
        breed_elements = driver.find_elements(By.XPATH, "//*[contains(text(), 'Breed')]")
        print(f"Found {len(breed_elements)} elements with 'Breed' text")
        
        # For each breed element, try to find a parent element that might be a dog section
        dog_data = []
        for i, element in enumerate(breed_elements[:5]):  # Limit to first 5 for exploration
            print(f"\nExploring Breed element {i+1}:")
            
            try:
                # Try to get parent elements
                parent = element.find_element(By.XPATH, "./..")
                parent_html = parent.get_attribute("outerHTML")
                print(f"Parent HTML: {parent_html[:200]}...")
                
                # Try to get grandparent
                grandparent = parent.find_element(By.XPATH, "./..")
                grandparent_html = grandparent.get_attribute("outerHTML")
                print(f"Grandparent HTML: {grandparent_html[:200]}...")
                
                # Try to get great-grandparent
                great_grandparent = grandparent.find_element(By.XPATH, "./..")
                great_grandparent_html = great_grandparent.get_attribute("outerHTML")
                print(f"Great-grandparent HTML: {great_grandparent_html[:200]}...")
                
                # Get the text content of each level
                print(f"Element text: {element.text}")
                print(f"Parent text: {parent.text[:100]}...")
                print(f"Grandparent text: {grandparent.text[:100]}...")
                print(f"Great-grandparent text: {great_grandparent.text[:100]}...")
                
                # Look for h1/h2 elements in ancestors
                try:
                    # Find all headings in ancestors
                    headings = great_grandparent.find_elements(By.XPATH, ".//h1 | .//h2")
                    for h in headings:
                        print(f"Found heading: {h.text}")
                except:
                    print("Could not find headings")
                
                # Look for img elements in ancestors
                try:
                    imgs = great_grandparent.find_elements(By.TAG_NAME, "img")
                    for img in imgs:
                        print(f"Found image: {img.get_attribute('src')}")
                except:
                    print("Could not find images")
                
                # Create a dictionary with the full text of each ancestor
                dog_info = {
                    "element_text": element.text,
                    "parent_text": parent.text,
                    "grandparent_text": grandparent.text,
                    "great_grandparent_text": great_grandparent.text
                }
                dog_data.append(dog_info)
                
            except Exception as e:
                print(f"Error exploring element: {e}")
        
        # Save the gathered data to a JSON file for analysis
        with open("dog_sections_data.json", "w", encoding="utf-8") as f:
            json.dump(dog_data, f, indent=2)
        print("\nSaved data from dog sections to dog_sections_data.json")
        
    except Exception as e:
        print(f"Error exploring website: {e}")
    finally:
        # Close the WebDriver
        if driver:
            driver.quit()
            print("Selenium WebDriver closed")

if __name__ == "__main__":
    explore_website()