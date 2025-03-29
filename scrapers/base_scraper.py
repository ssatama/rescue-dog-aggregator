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
    
    def __init__(self, organization_id, organization_name):
        """Initialize the base scraper.
        
        Args:
            organization_id: ID of the organization in the database
            organization_name: Name of the organization
        """
        self.organization_id = organization_id
        self.organization_name = organization_name
        self.logger = self._setup_logger()
        self.conn = None
        self.scrape_log_id = None
    
    def _setup_logger(self):
        """Set up a logger for the scraper."""
        logger = logging.getLogger(f"scraper.{self.organization_name}")
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
    
    def complete_scrape_log(self, status, dogs_found=0, dogs_added=0, dogs_updated=0, error_message=None):
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
                (datetime.now(), status, dogs_found, dogs_added, dogs_updated, error_message, self.scrape_log_id)
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
    
    def save_dog(self, dog_data):
        """Save a dog to the database.
        
        Args:
            dog_data: Dictionary containing dog information
        
        Returns:
            ID of the dog in the database or None if failed
        """
        try:
            # Prepare the data
            name = dog_data.get('name', 'Unknown')
            primary_image_url = dog_data.get('primary_image_url')
            adoption_url = dog_data.get('adoption_url', '')
            status = dog_data.get('status', 'available')
            breed = dog_data.get('breed')
            age_text = dog_data.get('age_text')
            sex = dog_data.get('sex')
            size = dog_data.get('size')
            external_id = dog_data.get('external_id')
            
            # Detect language from the name and breed
            text_for_detection = f"{name} {breed if breed else ''}"
            language = self.detect_language(text_for_detection)
            
            # Extract core fields and put everything else in properties
            core_fields = {'name', 'organization_id', 'primary_image_url', 'adoption_url', 
                           'status', 'breed', 'age_text', 'sex', 'size', 'external_id', 'language'}
            properties = {k: v for k, v in dog_data.items() if k not in core_fields}
            
            cursor = self.conn.cursor()
            
            # Check if dog with this name and organization already exists
            cursor.execute(
                """
                SELECT id FROM dogs 
                WHERE name = %s AND organization_id = %s
                """,
                (name, self.organization_id)
            )
            existing = cursor.fetchone()
            
            if existing:
                # Update existing dog
                dog_id = existing[0]
                cursor.execute(
                    """
                    UPDATE dogs SET 
                    primary_image_url = %s,
                    adoption_url = %s,
                    status = %s,
                    breed = %s,
                    age_text = %s,
                    sex = %s,
                    size = %s,
                    language = %s,
                    properties = %s,
                    updated_at = %s,
                    last_scraped_at = %s
                    WHERE id = %s
                    """,
                    (primary_image_url, adoption_url, status, breed, age_text, sex, size, 
                     language, json.dumps(properties), datetime.now(), datetime.now(), dog_id)
                )
                self.logger.info(f"Updated dog: {name} (ID: {dog_id})")
                self.conn.commit()
                return dog_id, "updated"
            else:
                # Insert new dog
                cursor.execute(
                    """
                    INSERT INTO dogs
                    (name, organization_id, external_id, primary_image_url, adoption_url, 
                     status, breed, age_text, sex, size, language, properties, 
                     created_at, updated_at, last_scraped_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (name, self.organization_id, external_id, primary_image_url, adoption_url, 
                     status, breed, age_text, sex, size, language, json.dumps(properties),
                     datetime.now(), datetime.now(), datetime.now())
                )
                dog_id = cursor.fetchone()[0]
                self.logger.info(f"Added new dog: {name} (ID: {dog_id})")
                self.conn.commit()
                return dog_id, "added"
        except Exception as e:
            self.logger.error(f"Error saving dog {dog_data.get('name', 'Unknown')}: {e}")
            if self.conn:
                self.conn.rollback()
            return None, None
    
    def save_dog_images(self, dog_id, image_urls, primary_image_index=0):
        """Save dog images to the database.
        
        Args:
            dog_id: ID of the dog in the database
            image_urls: List of image URLs
            primary_image_index: Index of the primary image in the list (default 0)
        
        Returns:
            True if successful, False otherwise
        """
        try:
            cursor = self.conn.cursor()
            
            # First, delete any existing images for this dog
            cursor.execute(
                "DELETE FROM dog_images WHERE dog_id = %s",
                (dog_id,)
            )
            
            # Then insert the new images
            for i, url in enumerate(image_urls):
                is_primary = (i == primary_image_index)
                cursor.execute(
                    """
                    INSERT INTO dog_images (dog_id, image_url, is_primary)
                    VALUES (%s, %s, %s)
                    """,
                    (dog_id, url, is_primary)
                )
            
            self.conn.commit()
            cursor.close()
            self.logger.info(f"Saved {len(image_urls)} images for dog ID: {dog_id}")
            return True
        except Exception as e:
            self.logger.error(f"Error saving images for dog ID {dog_id}: {e}")
            if self.conn:
                self.conn.rollback()
            return False
    
    def run(self):
        """Run the scraper to collect and save dog data."""
        # Connect to database
        if not self.connect_to_database():
            return False
        
        # Start scrape log
        if not self.start_scrape_log():
            return False
        
        try:
            # Collect data using the organization-specific implementation
            self.logger.info(f"Starting scrape for {self.organization_name}")
            dogs_data = self.collect_data()
            self.logger.info(f"Collected data for {len(dogs_data)} dogs")
            
            # Save each dog
            dogs_added = 0
            dogs_updated = 0
            
            for dog_data in dogs_data:
                # Add organization_id to the dog data
                dog_data['organization_id'] = self.organization_id
                
                # Save dog
                dog_id, action = self.save_dog(dog_data)
                
                if dog_id:
                    # Save dog images if provided
                    image_urls = dog_data.get('image_urls', [])
                    if image_urls and len(image_urls) > 0:
                        self.save_dog_images(dog_id, image_urls)
                    
                    # Update counts
                    if action == "added":
                        dogs_added += 1
                    elif action == "updated":
                        dogs_updated += 1
            
            # Complete scrape log
            self.complete_scrape_log(
                status='success',
                dogs_found=len(dogs_data),
                dogs_added=dogs_added,
                dogs_updated=dogs_updated
            )
            
            self.logger.info(f"Scrape completed successfully. Added: {dogs_added}, Updated: {dogs_updated}")
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
        """Collect dog data from the source.
        
        This method should be implemented by each organization-specific scraper.
        
        Returns:
            List of dictionaries, each containing data for one dog
        """
        pass