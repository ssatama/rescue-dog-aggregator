# scrapers/base_scraper.py

import os
import json
import logging
from abc import ABC, abstractmethod
from datetime import datetime
import psycopg2
from langdetect import detect

# Import config
from config import DB_CONFIG

class BaseScraper(ABC):
    """Base scraper class that all organization-specific scrapers will inherit from."""
    
    def __init__(self, organization_id, organization_name, animal_type="dog"):
        """Initialize the base scraper.
        
        Args:
            organization_id: ID of the organization in the database
            organization_name: Name of the organization
            animal_type: Type of animal (dog, cat)
        """
        self.organization_id = organization_id
        self.organization_name = organization_name
        self.animal_type = animal_type.lower()  # Normalize to lowercase
        self.logger = self._setup_logger()
        self.conn = None
        self.scrape_log_id = None
    
    def _setup_logger(self):
        """Set up a logger for the scraper."""
        logger = logging.getLogger(f"scraper.{self.organization_name}.{self.animal_type}")
        logger.setLevel(logging.INFO)
        
        # Create handlers
        c_handler = logging.StreamHandler()
        
        # Create formatters
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        c_handler.setFormatter(formatter)
        
        # Add handlers to logger
        logger.addHandler(c_handler)
        
        return logger
    
    def connect_to_database(self):
        """Connect to the PostgreSQL database."""
        try:
            # Build connection parameters, handling empty password
            conn_params = {
                'host': DB_CONFIG['host'],
                'user': DB_CONFIG['user'],
                'database': DB_CONFIG['database'],
            }
            
            # Only add password if it's not empty
            if DB_CONFIG['password']:
                conn_params['password'] = DB_CONFIG['password']
            
            self.conn = psycopg2.connect(**conn_params)
            self.logger.info(f"Connected to database: {DB_CONFIG['database']}")
            return True
        except Exception as e:
            self.logger.error(f"Database connection error: {e}")
            return False
    
    def start_scrape_log(self):
        """Create a new entry in the scrape_logs table."""
        try:
            cursor = self.conn.cursor()
            cursor.execute(
                """
                INSERT INTO scrape_logs 
                (organization_id, started_at, status) 
                VALUES (%s, %s, %s)
                RETURNING id
                """,
                (self.organization_id, datetime.now(), 'running')
            )
            self.scrape_log_id = cursor.fetchone()[0]
            self.conn.commit()
            cursor.close()
            self.logger.info(f"Created scrape log with ID: {self.scrape_log_id}")
            return True
        except Exception as e:
            self.logger.error(f"Error creating scrape log: {e}")
            if self.conn:
                self.conn.rollback()
            return False
    
    def complete_scrape_log(self, status, animals_found=0, animals_added=0, animals_updated=0, error_message=None):
        """Update the scrape log with completion information."""
        try:
            cursor = self.conn.cursor()
            cursor.execute(
                """
                UPDATE scrape_logs 
                SET completed_at = %s, status = %s, 
                    dogs_found = %s, dogs_added = %s, dogs_updated = %s,
                    error_message = %s
                WHERE id = %s
                """,
                (datetime.now(), status, animals_found, animals_added, animals_updated, error_message, self.scrape_log_id)
            )
            self.conn.commit()
            cursor.close()
            self.logger.info(f"Updated scrape log {self.scrape_log_id} with status: {status}")
            return True
        except Exception as e:
            self.logger.error(f"Error updating scrape log: {e}")
            if self.conn:
                self.conn.rollback()
            return False
    
    def detect_language(self, text):
        """Detect the language of the text.
        
        Args:
            text: Text to detect language for
        
        Returns:
            ISO 639-1 language code (e.g., 'en' for English, 'de' for German)
        """
        try:
            if not text or len(text.strip()) < 10:
                return 'en'  # Default to English for very short or empty text
            
            return detect(text)
        except Exception as e:
            self.logger.warning(f"Language detection error: {e}. Defaulting to English.")
            return 'en'
    
    def save_animal(self, animal_data):
        """Save an animal to the database.
        
        Args:
            animal_data: Dictionary containing animal information
        
        Returns:
            ID of the animal in the database or None if failed
        """
        try:
            # Prepare the data
            name = animal_data.get('name', 'Unknown')
            primary_image_url = animal_data.get('primary_image_url')
            adoption_url = animal_data.get('adoption_url', '')
            status = animal_data.get('status', 'available')
            breed = animal_data.get('breed')
            standardized_breed = animal_data.get('standardized_breed')
            age_text = animal_data.get('age_text')
            age_min_months = animal_data.get('age_min_months')
            age_max_months = animal_data.get('age_max_months')
            sex = animal_data.get('sex')
            size = animal_data.get('size')
            standardized_size = animal_data.get('standardized_size')
            external_id = animal_data.get('external_id')
            animal_type = animal_data.get('animal_type', self.animal_type)
            
            # Detect language from the name and breed
            text_for_detection = f"{name} {breed if breed else ''}"
            language = self.detect_language(text_for_detection)
            
            # Extract core fields and put everything else in properties
            core_fields = {'name', 'organization_id', 'primary_image_url', 'adoption_url', 
                           'status', 'breed', 'standardized_breed', 'age_text', 'age_min_months', 
                           'age_max_months', 'sex', 'size', 'standardized_size', 'external_id', 
                           'language', 'animal_type'}
            properties = {k: v for k, v in animal_data.items() if k not in core_fields}
            
            cursor = self.conn.cursor()
            
            # Check if animal with this name and organization already exists
            cursor.execute(
                """
                SELECT id FROM animals 
                WHERE name = %s AND organization_id = %s AND animal_type = %s
                """,
                (name, self.organization_id, animal_type)
            )
            existing = cursor.fetchone()
            
            if existing:
                # Update existing animal
                animal_id = existing[0]
                cursor.execute(
                    """
                    UPDATE animals SET 
                    primary_image_url = %s,
                    adoption_url = %s,
                    status = %s,
                    breed = %s,
                    standardized_breed = %s,
                    age_text = %s,
                    age_min_months = %s,
                    age_max_months = %s,
                    sex = %s,
                    size = %s,
                    standardized_size = %s,
                    language = %s,
                    properties = %s,
                    updated_at = %s,
                    last_scraped_at = %s
                    WHERE id = %s
                    """,
                    (primary_image_url, adoption_url, status, breed, standardized_breed, 
                     age_text, age_min_months, age_max_months, sex, size, standardized_size, 
                     language, json.dumps(properties), datetime.now(), datetime.now(), animal_id)
                )
                self.logger.info(f"Updated {animal_type}: {name} (ID: {animal_id})")
                self.conn.commit()
                return animal_id, "updated"
            else:
                # Insert new animal
                cursor.execute(
                    """
                    INSERT INTO animals
                    (name, organization_id, animal_type, external_id, primary_image_url, adoption_url, 
                     status, breed, standardized_breed, age_text, age_min_months, age_max_months, 
                     sex, size, standardized_size, language, properties, 
                     created_at, updated_at, last_scraped_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (name, self.organization_id, animal_type, external_id, primary_image_url, adoption_url, 
                     status, breed, standardized_breed, age_text, age_min_months, age_max_months, 
                     sex, size, standardized_size, language, json.dumps(properties),
                     datetime.now(), datetime.now(), datetime.now())
                )
                animal_id = cursor.fetchone()[0]
                self.logger.info(f"Added new {animal_type}: {name} (ID: {animal_id})")
                self.conn.commit()
                return animal_id, "added"
        except Exception as e:
            self.logger.error(f"Error saving {self.animal_type} {animal_data.get('name', 'Unknown')}: {e}")
            if self.conn:
                self.conn.rollback()
            return None, None
    
    def save_animal_images(self, animal_id, image_urls, primary_image_index=0):
        """Save animal images to the database.
        
        Args:
            animal_id: ID of the animal in the database
            image_urls: List of image URLs
            primary_image_index: Index of the primary image in the list (default 0)
        
        Returns:
            True if successful, False otherwise
        """
        try:
            cursor = self.conn.cursor()
            
            # First, delete any existing images for this animal
            cursor.execute(
                "DELETE FROM animal_images WHERE animal_id = %s",
                (animal_id,)
            )
            
            # Then insert the new images
            for i, url in enumerate(image_urls):
                is_primary = (i == primary_image_index)
                cursor.execute(
                    """
                    INSERT INTO animal_images (animal_id, image_url, is_primary)
                    VALUES (%s, %s, %s)
                    """,
                    (animal_id, url, is_primary)
                )
            
            self.conn.commit()
            cursor.close()
            self.logger.info(f"Saved {len(image_urls)} images for {self.animal_type} ID: {animal_id}")
            return True
        except Exception as e:
            self.logger.error(f"Error saving images for {self.animal_type} ID {animal_id}: {e}")
            if self.conn:
                self.conn.rollback()
            return False
    
    def run(self):
        """Run the scraper to collect and save animal data."""
        # Connect to database
        if not self.connect_to_database():
            return False
        
        # Start scrape log
        if not self.start_scrape_log():
            return False
        
        try:
            # Collect data using the organization-specific implementation
            self.logger.info(f"Starting scrape for {self.organization_name} {self.animal_type}s")
            animals_data = self.collect_data()
            self.logger.info(f"Collected data for {len(animals_data)} {self.animal_type}s")
            
            # Save each animal
            animals_added = 0
            animals_updated = 0
            
            for animal_data in animals_data:
                # Add organization_id and animal_type to the animal data
                animal_data['organization_id'] = self.organization_id
                if 'animal_type' not in animal_data:
                    animal_data['animal_type'] = self.animal_type
                
                # Save animal
                animal_id, action = self.save_animal(animal_data)
                
                if animal_id:
                    # Save animal images if provided
                    image_urls = animal_data.get('image_urls', [])
                    if image_urls and len(image_urls) > 0:
                        self.save_animal_images(animal_id, image_urls)
                    
                    # Update counts
                    if action == "added":
                        animals_added += 1
                    elif action == "updated":
                        animals_updated += 1
            
            # Complete scrape log
            self.complete_scrape_log(
                status='success',
                animals_found=len(animals_data),
                animals_added=animals_added,
                animals_updated=animals_updated
            )
            
            self.logger.info(f"Scrape completed successfully. Added: {animals_added}, Updated: {animals_updated}")
            return True
        except Exception as e:
            self.logger.error(f"Error during scrape: {e}")
            self.complete_scrape_log(
                status='error',
                error_message=str(e)
            )
            return False
        finally:
            # Close database connection
            if self.conn:
                self.conn.close()
                self.logger.info("Database connection closed")
    
    @abstractmethod
    def collect_data(self):
        """Collect animal data from the source.
        
        This method should be implemented by each organization-specific scraper.
        
        Returns:
            List of dictionaries, each containing data for one animal
        """
        pass