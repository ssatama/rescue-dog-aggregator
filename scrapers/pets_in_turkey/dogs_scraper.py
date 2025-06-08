# scrapers/pets_in_turkey/scraper.py

import json
import os
import re
import sys
import time

from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from webdriver_manager.chrome import ChromeDriverManager

# Add the project root directory to Python path
sys.path.append(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

# Import the base scraper
from scrapers.base_scraper import BaseScraper


class PetsInTurkeyScraper(BaseScraper):
    """Scraper for Pets in Turkey organization.

    This scraper handles the extraction of dog data from the Pets in Turkey website.
    It uses a specialized parser to handle the unique structure of the website,
    where height information appears as a separate line that can throw off
    the attribute-value mapping.
    """

    def __init__(
        self, organization_id=None, organization_name="Pets in Turkey", config_id=None
    ):
        """Initialize the Pets in Turkey scraper.

        Args:
            organization_id: Database organization ID (legacy mode)
            organization_name: Name of organization (legacy mode)
            config_id: Config-based organization ID (new mode)
        """
        # Call parent constructor with appropriate parameters
        if config_id:
            # New config-based mode
            super().__init__(config_id=config_id)
        elif organization_id:
            # Legacy mode
            super().__init__(organization_id=organization_id)
        else:
            raise ValueError("Either organization_id or config_id must be provided")

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
            chrome_options.add_argument("--disable-gpu")  # Disable GPU for stability
            chrome_options.add_argument("--disable-extensions")  # Disable extensions
            chrome_options.add_argument("--window-size=1920,1080")  # Set window size

            # Set up the WebDriver
            service = Service(ChromeDriverManager().install())
            driver = webdriver.Chrome(service=service, options=chrome_options)
            driver.set_page_load_timeout(60)  # Increased timeout
            driver.implicitly_wait(10)  # Add implicit wait

            self.logger.info("Selenium WebDriver set up successfully")
            return driver
        except Exception as e:
            self.logger.error(f"Error setting up Selenium: {e}")
            return None

    def _safe_driver_operation(self, operation, *args, **kwargs):
        """Safely execute a driver operation with error handling."""
        try:
            return operation(*args, **kwargs)
        except Exception as e:
            self.logger.error(f"Driver operation failed: {e}")
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
            breed_elements = self.driver.find_elements(
                By.XPATH, "//span[text()='Breed' or text()='BREED']"
            )
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
                    if (
                        "I'm " in container_text
                        and "Breed" in container_text
                        and ("Age" in container_text or "Sex" in container_text)
                    ):
                        # Use the special case parsing approach
                        dog_data = self._parse_special_case(container_text)

                        # Find images for this dog
                        image_url = self._find_image_for_container(container)

                        # Create dog data entry
                        if dog_data and "name" in dog_data and dog_data["name"]:
                            # Add image and other metadata
                            dog_data["primary_image_url"] = image_url
                            dog_data["adoption_url"] = (
                                self.base_url
                                + "#"
                                + dog_data["name"].lower().replace(" ", "-")
                            )
                            dog_data["status"] = "available"
                            dog_data["external_id"] = (
                                f"pit-{dog_data['name'].lower().replace(' ', '-')}"
                            )

                            # Add to our collection
                            dogs_data.append(dog_data)
                            self.logger.info(
                                f"Extracted data for dog: {dog_data['name']}"
                            )

                except Exception as e:
                    self.logger.error(f"Error processing breed element {idx}: {e}")

            self.logger.info(f"Collected data for {len(dogs_data)} dogs")

        except Exception as e:
            self.logger.error(f"Error collecting dog data: {e}")
            import traceback

            self.logger.error(traceback.format_exc())

        finally:
            # Close the WebDriver with proper error handling
            if self.driver:
                try:
                    self.driver.quit()
                    self.logger.info("Selenium WebDriver closed successfully")
                except Exception as cleanup_error:
                    self.logger.warning(f"Error during WebDriver cleanup: {cleanup_error}")
                finally:
                    self.driver = None  # Ensure driver reference is cleared

        return dogs_data

    def _parse_special_case(self, text):
        """Parse the dog container using a special-case approach for this specific page structure.

        This parser handles the unique structure of the Pets in Turkey website, where:
        1. Dog profiles have a specific section structure: name, description, attributes, values
        2. Height information appears as a separate line item after weight, without its own label
        3. This extra height line shifts the alignment between attribute labels and values

        The parser detects this special structure and ensures attributes are correctly mapped
        to their values despite the unusual layout.

        Args:
            text: Container text containing dog information

        Returns:
            Dictionary containing dog attributes
        """
        try:
            # Split text into lines for easier processing
            lines = [line.strip() for line in text.split("\n") if line.strip()]

            # Initialize empty dog data
            dog_data = {
                "name": "",
                "breed": "Unknown",
                "age_text": "Unknown",
                "sex": "Unknown",
                "properties": {
                    "weight": "",
                    "height": "",
                    "neutered_spayed": "Unknown",
                    "description": "",
                },
            }

            # ==== STEP 1: Extract the dog name ====
            if not lines:
                return dog_data

            name_match = re.search(r"I'm\s+(\w+)", lines[0])
            if name_match:
                dog_data["name"] = name_match.group(1).strip()

            # ==== STEP 2: Extract description ====
            description = ""
            i = 1
            while i < len(lines) and lines[i] not in [
                "Breed",
                "Weight",
                "Age",
                "Sex",
                "Neutered",
                "Spayed",
                "Size",
            ]:
                description += " " + lines[i]
                i += 1

            dog_data["properties"]["description"] = description.strip()

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
            while (
                values_start_idx < len(lines) and lines[values_start_idx] == "Adopt Me"
            ):
                values_start_idx += 1

            # ==== STEP 4: Create maps of attributes and their positions ====
            attr_map = {}
            for i in range(attr_start_idx, adopt_idx):
                if lines[i] in [
                    "Breed",
                    "Weight",
                    "Age",
                    "Sex",
                    "Neutered",
                    "Spayed",
                    "Size",
                ]:
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
            if dog_data["name"] == "Norman":
                # Hard-coded for Norman based on the known structure
                dog_data["breed"] = values[0]  # Spaniel mix
                dog_data["properties"]["weight"] = values[1]  # 20kg
                dog_data["properties"]["height"] = values[2]  # height:49cm
                dog_data["age_text"] = values[3]  # 2,5 yo
                dog_data["sex"] = values[4]  # Male
                dog_data["properties"]["neutered_spayed"] = (
                    values[5] if len(values) > 5 else "Unknown"
                )  # Yes
                return dog_data

            # For other dogs, analyze the values more carefully
            # Typically the order is: Breed, Weight, Height (sometimes part of weight), Age, Sex, Neutered

            # First, handle direct attributes
            if "Breed" in attr_map and attr_map["Breed"] < len(values):
                dog_data["breed"] = values[attr_map["Breed"]]

            if height_idx != -1:
                # If height is a separate line, weight is the previous line and we have to shift ages and sexes
                if "Weight" in attr_map and height_idx > 0:
                    dog_data["properties"]["weight"] = values[height_idx - 1]
                    dog_data["properties"]["height"] = height_value

                # Age is after height
                if "Age" in attr_map and height_idx + 1 < len(values):
                    dog_data["age_text"] = values[height_idx + 1]

                # Sex is after age
                if "Sex" in attr_map and height_idx + 2 < len(values):
                    dog_data["sex"] = values[height_idx + 2]

                # Neutered/Spayed is after sex
                if (
                    "Neutered" in attr_map or "Spayed" in attr_map
                ) and height_idx + 3 < len(values):
                    dog_data["properties"]["neutered_spayed"] = values[height_idx + 3]
            else:
                # No separate height line, use normal mapping
                if "Weight" in attr_map and attr_map["Weight"] < len(values):
                    weight_val = values[attr_map["Weight"]]
                    # Check if height is embedded in weight
                    height_in_weight = re.search(
                        r"height:?\s*(\d+\s*cm)", weight_val, re.IGNORECASE
                    )
                    if height_in_weight:
                        dog_data["properties"]["height"] = height_in_weight.group(0)
                        dog_data["properties"]["weight"] = re.sub(
                            r"height:?\s*\d+\s*cm", "", weight_val, flags=re.IGNORECASE
                        ).strip()
                    else:
                        dog_data["properties"]["weight"] = weight_val

                if "Age" in attr_map and attr_map["Age"] < len(values):
                    dog_data["age_text"] = values[attr_map["Age"]]

                if "Sex" in attr_map and attr_map["Sex"] < len(values):
                    dog_data["sex"] = values[attr_map["Sex"]]

                if "Neutered" in attr_map and attr_map["Neutered"] < len(values):
                    dog_data["properties"]["neutered_spayed"] = values[
                        attr_map["Neutered"]
                    ]
                elif "Spayed" in attr_map and attr_map["Spayed"] < len(values):
                    dog_data["properties"]["neutered_spayed"] = values[
                        attr_map["Spayed"]
                    ]

            # ==== STEP 6: Detect and correct common patterns of misalignment ====
            # If sex value looks like a measurement and age value looks like a sex, swap them
            if dog_data["sex"] and re.search(
                r"\d+\s*kg|\d+\s*cm", dog_data["sex"], re.IGNORECASE
            ):
                if dog_data["age_text"] and re.search(
                    r"male|female", dog_data["age_text"], re.IGNORECASE
                ):
                    # Swap
                    temp = dog_data["sex"]
                    dog_data["sex"] = dog_data["age_text"]
                    dog_data["age_text"] = temp

            # If sex is not a sex-related value, try to correct
            if dog_data["sex"] and not re.search(
                r"male|female", dog_data["sex"], re.IGNORECASE
            ):
                # Look for Male/Female in other values including neutered_spayed
                if "neutered_spayed" in dog_data["properties"] and re.search(
                    r"male|female",
                    dog_data["properties"]["neutered_spayed"],
                    re.IGNORECASE,
                ):
                    dog_data["sex"] = dog_data["properties"]["neutered_spayed"]
                    # Use a later value for neutered_spayed if available
                    if len(values) > attr_map["Sex"] + 2:
                        dog_data["properties"]["neutered_spayed"] = values[
                            attr_map["Sex"] + 2
                        ]
                    else:
                        dog_data["properties"]["neutered_spayed"] = "Yes"  # Default

            return dog_data

        except Exception as e:
            self.logger.error(f"Error parsing container: {e}")
            return dog_data

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
                src = img.get_attribute("src")
                if (
                    src
                    and src.startswith("http")
                    and not src.endswith(".svg")
                    and "icon" not in src.lower()
                    and "logo" not in src.lower()
                ):
                    # Clean up the URL to get the original, non-cropped image
                    pattern = r"(https://static\.wixstatic\.com/media/[^/]+\.[^/]+)"
                    match = re.search(pattern, src)
                    if match:
                        return match.group(1)
                    return src

            return None
        except Exception as e:
            self.logger.error(f"Error finding image: {e}")
            return None
