# analyze_dogs_structure.py

import time
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import os

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

def analyze_page():
    """Analyze the dogs page structure."""
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
        
        # Save the entire page source
        with open("dogs_page.html", "w", encoding="utf-8") as f:
            f.write(page_source)
        print("Saved page source to dogs_page.html")
        
        # Take a screenshot
        driver.save_screenshot("dogs_page.png")
        print("Saved screenshot to dogs_page.png")
        
        # Use JavaScript to find elements with "I'm" in the text
        script = """
        return Array.from(document.querySelectorAll('*')).filter(el => 
            el.innerText && el.innerText.trim().startsWith("I'm ")
        );
        """
        dog_elements = driver.execute_script(script)
        print(f"Found {len(dog_elements)} dog name elements")
        
        for i, element in enumerate(dog_elements[:3]):  # Process first 3 dogs for example
            try:
                dog_name = element.text.replace("I'm ", "").strip()
                if '\n' in dog_name:
                    dog_name = dog_name.split('\n')[0].strip()
                
                print(f"Dog {i+1}: {dog_name}")
                
                # Get the element's HTML
                element_html = element.get_attribute('outerHTML')
                
                # Save the HTML
                with open(f"dog_{i+1}_{dog_name}_element.html", "w", encoding="utf-8") as f:
                    f.write(element_html)
                
                # Save the element text
                with open(f"dog_{i+1}_{dog_name}_element.txt", "w", encoding="utf-8") as f:
                    f.write(element.text)
                
                # Find parent containing breed info using JavaScript
                script = """
                function findParentWithBreed(element, maxLevels) {
                    let current = element;
                    for (let i = 0; i < maxLevels; i++) {
                        if (!current.parentElement) {
                            return null;
                        }
                        current = current.parentElement;
                        if (current.innerText && 
                            current.innerText.includes('Breed') && 
                            current.innerText.includes('Sex')) {
                            return current;
                        }
                    }
                    return null;
                }
                return findParentWithBreed(arguments[0], 6);
                """
                
                breed_parent = driver.execute_script(script, element)
                
                if breed_parent:
                    print(f"Found parent with breed info for {dog_name}")
                    parent_html = breed_parent.get_attribute('outerHTML')
                    parent_text = breed_parent.text
                    
                    # Save the parent HTML
                    with open(f"dog_{i+1}_{dog_name}_parent.html", "w", encoding="utf-8") as f:
                        f.write(parent_html)
                        
                    # Save the parent text
                    with open(f"dog_{i+1}_{dog_name}_parent.txt", "w", encoding="utf-8") as f:
                        f.write(parent_text)
                else:
                    print(f"Could not find parent with breed info for {dog_name}")
            except Exception as e:
                print(f"Error processing dog element {i+1}: {e}")
                import traceback
                print(traceback.format_exc())
        
    except Exception as e:
        print(f"Error analyzing page: {e}")
        import traceback
        print(traceback.format_exc())
    finally:
        # Close the WebDriver
        if driver:
            driver.quit()
            print("Selenium WebDriver closed")

if __name__ == "__main__":
    analyze_page()