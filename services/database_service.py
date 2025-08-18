"""
DatabaseService - Extracted from BaseScraper for Single Responsibility.

Handles all database operations including:
- Animal CRUD operations
- Scrape log management
- Connection management
- Transaction handling

Following CLAUDE.md principles:
- Pure functions, no mutations
- Early returns, no nested conditionals
- Immutable data patterns
- Clear error handling
"""

import json
import logging
import time
from datetime import datetime
from typing import Any, Dict, Optional, Tuple

import psycopg2

from utils.optimized_standardization import parse_age_text, standardize_size_value
from utils.standardization import standardize_breed
from utils.slug_generator import generate_unique_animal_slug


class DatabaseService:
    """Service for all database operations extracted from BaseScraper."""

    def __init__(self, db_config: Dict[str, str], logger: Optional[logging.Logger] = None, connection_pool=None):
        """Initialize DatabaseService with configuration.

        Args:
            db_config: Database connection configuration
            logger: Optional logger instance
            connection_pool: Optional ConnectionPoolService for pooled connections
        """
        self.db_config = db_config
        self.logger = logger or logging.getLogger(__name__)
        self.connection_pool = connection_pool
        self.conn = None

    def connect(self) -> bool:
        """Establish database connection.

        Returns:
            True if connection successful, False otherwise
        """
        try:
            # Build connection parameters, handling empty password
            conn_params = {
                "host": self.db_config["host"],
                "user": self.db_config["user"],
                "database": self.db_config["database"],
            }

            # Only add password if it's not empty
            if self.db_config.get("password"):
                conn_params["password"] = self.db_config["password"]

            self.conn = psycopg2.connect(**conn_params)
            self.logger.info(f"Connected to database: {self.db_config['database']}")
            return True
        except Exception as e:
            self.logger.error(f"Database connection error: {e}")
            return False

    def close(self) -> None:
        """Close database connection."""
        if self.conn:
            self.conn.close()
            self.conn = None
            self.logger.info("Database connection closed")

    def get_existing_animal(self, external_id: str, organization_id: int) -> Optional[Tuple]:
        """Check if an animal already exists in the database.

        Args:
            external_id: External ID of the animal
            organization_id: Organization ID

        Returns:
            Tuple of (id, name, updated_at) if found, None otherwise
        """
        # Use connection pool if available
        if self.connection_pool:
            try:
                with self.connection_pool.get_connection_context() as conn:
                    cursor = conn.cursor()
                    cursor.execute(
                        "SELECT id, name, updated_at FROM animals WHERE external_id = %s AND organization_id = %s",
                        (external_id, organization_id),
                    )
                    result = cursor.fetchone()
                    cursor.close()
                    return result
            except Exception as e:
                self.logger.error(f"Error checking existing animal: {e}")
                return None

        # Fallback to direct connection
        if not self.conn:
            # Try to establish connection before failing
            if not self.connect():
                self.logger.error("No database connection available")
                return None

        try:
            cursor = self.conn.cursor()
            cursor.execute(
                "SELECT id, name, updated_at FROM animals WHERE external_id = %s AND organization_id = %s",
                (external_id, organization_id),
            )
            result = cursor.fetchone()
            cursor.close()
            return result
        except Exception as e:
            self.logger.error(f"Error checking existing animal: {e}")
            if self.conn:
                self.conn.rollback()
            return None

    def create_animal(self, animal_data: Dict[str, Any]) -> Tuple[Optional[int], str]:
        """Create a new animal in the database.

        Args:
            animal_data: Dictionary containing animal information

        Returns:
            Tuple of (animal_id, "added") if successful, (None, "error") if failed
        """
        # Use connection pool if available
        if self.connection_pool:
            try:
                with self.connection_pool.get_connection_context() as conn:
                    return self._create_animal_with_connection(conn, animal_data)
            except Exception as e:
                self.logger.error(f"Error creating animal: {e}")
                return None, "error"

        # Fallback to direct connection
        if not self.conn:
            # Try to establish connection before failing
            if not self.connect():
                self.logger.error("No database connection available")
                return None, "error"

        try:
            return self._create_animal_with_connection(self.conn, animal_data)
        except Exception as e:
            self.logger.error(f"Error creating animal: {e}")
            if self.conn:
                self.conn.rollback()
            return None, "error"

    def _create_animal_with_connection(self, conn, animal_data: Dict[str, Any]) -> Tuple[Optional[int], str]:
        """Create animal using provided connection (pure function).

        Args:
            conn: Database connection to use
            animal_data: Dictionary containing animal information

        Returns:
            Tuple of (animal_id, "added") if successful, (None, "error") if failed
        """
        cursor = conn.cursor()

        # Detect language from animal data
        description_text = f"{animal_data.get('name', '')} {animal_data.get('breed', '')} {animal_data.get('age_text', '')}"
        language = self._detect_language(description_text)

        # Apply standardization
        standardized_breed, breed_group, size_estimate = standardize_breed(animal_data.get("breed", ""))

        # Use pre-calculated age values if available (from scraper standardization)
        # Otherwise fall back to parsing age_text
        if "age_min_months" in animal_data and "age_max_months" in animal_data:
            age_months_min = animal_data.get("age_min_months")
            age_months_max = animal_data.get("age_max_months")
        else:
            age_info = parse_age_text(animal_data.get("age_text", ""))
            age_months_min = age_info.min_months
            age_months_max = age_info.max_months

        # Use size estimate if no size provided
        final_size = animal_data.get("size") or animal_data.get("standardized_size")
        final_standardized_size = animal_data.get("standardized_size") or size_estimate or standardize_size_value(animal_data.get("size"))

        # Generate temporary unique slug for animal (Phase 1: before ID is available)
        try:
            temp_slug = generate_unique_animal_slug(
                name=animal_data.get("name"), breed=animal_data.get("breed"), standardized_breed=standardized_breed, animal_id=None, connection=conn  # ID not available during creation
            )
            # Add temp suffix to distinguish from final slug
            animal_slug = f"{temp_slug}-temp"
        except Exception as e:
            self.logger.error(f"Failed to generate temp slug for animal: {e}")
            # Use a fallback slug based on external_id or timestamp
            fallback_slug = f"animal-{animal_data.get('external_id', str(int(time.time())))}-temp"
            animal_slug = fallback_slug[:250]  # Ensure it fits in database

        # Prepare values for insertion
        current_time = datetime.now()

        cursor.execute(
            """
            INSERT INTO animals (
                name, organization_id, animal_type, external_id,
                primary_image_url, original_image_url, adoption_url, status,
                breed, standardized_breed, breed_group, age_text, age_min_months, age_max_months,
                sex, size, standardized_size, language, properties, slug,
                created_at, updated_at, last_scraped_at, last_seen_at,
                consecutive_scrapes_missing, availability_confidence
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s
            )
            RETURNING id
            """,
            (
                animal_data.get("name"),
                animal_data.get("organization_id"),
                animal_data.get("animal_type", "dog"),
                animal_data.get("external_id"),
                animal_data.get("primary_image_url"),
                animal_data.get("original_image_url"),
                animal_data.get("adoption_url"),
                animal_data.get("status", "available"),
                animal_data.get("breed"),
                standardized_breed,
                breed_group,
                animal_data.get("age_text"),
                age_months_min,
                age_months_max,
                animal_data.get("sex"),
                final_size,
                final_standardized_size,
                language,
                (json.dumps(animal_data.get("properties")) if animal_data.get("properties") else None),
                animal_slug,  # slug
                current_time,  # created_at
                current_time,  # updated_at
                current_time,  # last_scraped_at
                current_time,  # last_seen_at
                0,  # consecutive_scrapes_missing
                "high",  # availability_confidence
            ),
        )

        animal_id = cursor.fetchone()[0]

        # Phase 2: Generate final slug with animal ID and update
        try:
            final_slug = generate_unique_animal_slug(
                name=animal_data.get("name"), breed=animal_data.get("breed"), standardized_breed=standardized_breed, animal_id=animal_id, connection=conn  # ID now available
            )

            # Update the animal with the final slug containing ID
            cursor.execute("UPDATE animals SET slug = %s WHERE id = %s", (final_slug, animal_id))

            self.logger.debug(f"Updated animal {animal_id} slug from temp to final: {final_slug}")

        except Exception as e:
            self.logger.warning(f"Failed to update final slug for animal {animal_id}: {e}")
            # Continue with temp slug rather than failing the entire operation

        conn.commit()
        cursor.close()

        self.logger.info(f"Created new animal with ID {animal_id}: {animal_data.get('name')}")
        return animal_id, "added"

    def update_animal(self, animal_id: int, animal_data: Dict[str, Any]) -> Tuple[Optional[int], str]:
        """Update an existing animal in the database.

        Args:
            animal_id: ID of the animal to update
            animal_data: Dictionary containing new animal information

        Returns:
            Tuple of (animal_id, action) where action is "updated" or "no_change"
        """
        if not self.conn:
            # Try to establish connection before failing
            if not self.connect():
                self.logger.error("No database connection available")
                return None, "error"

        try:
            cursor = self.conn.cursor()

            # Get current animal data to check for changes
            cursor.execute(
                """
                SELECT name, breed, age_text, sex, primary_image_url, status,
                       standardized_breed, age_min_months, age_max_months, standardized_size, properties
                FROM animals WHERE id = %s
                """,
                (animal_id,),
            )
            current_data = cursor.fetchone()

            if not current_data:
                cursor.close()
                return None, "error"

            # Apply standardization to new data
            new_standardized_breed, new_breed_group, new_size_estimate = standardize_breed(animal_data.get("breed", ""))
            new_age_info = parse_age_text(animal_data.get("age_text", ""))
            # parse_age_text returns AgeInfo object with attributes
            new_age_min_months = new_age_info.min_months
            new_age_max_months = new_age_info.max_months

            # Use size estimate if no size provided
            new_final_standardized_size = animal_data.get("standardized_size") or new_size_estimate or standardize_size_value(animal_data.get("size"))

            # Check for changes (simplified comparison)
            current_properties_json = current_data[10] if current_data[10] else "{}"
            new_properties_json = json.dumps(animal_data.get("properties")) if animal_data.get("properties") else "{}"

            has_changes = self._detect_animal_changes(
                current_data,
                animal_data,
                new_standardized_breed,
                new_age_min_months,
                new_age_max_months,
                new_final_standardized_size,
                new_properties_json,
                current_properties_json,
            )

            if not has_changes:
                cursor.close()
                return animal_id, "no_change"

            # Perform update
            current_time = datetime.now()
            language = self._detect_language(f"{animal_data.get('name', '')} {animal_data.get('breed', '')} {animal_data.get('age_text', '')}")
            final_size = animal_data.get("size") or animal_data.get("standardized_size")

            cursor.execute(
                """
                UPDATE animals SET
                    name = %s, breed = %s, standardized_breed = %s, breed_group = %s,
                    age_text = %s, age_min_months = %s, age_max_months = %s,
                    sex = %s, size = %s, standardized_size = %s, language = %s,
                    primary_image_url = %s, original_image_url = %s,
                    adoption_url = %s, status = %s, properties = %s,
                    updated_at = %s, last_scraped_at = %s
                WHERE id = %s
                """,
                (
                    animal_data.get("name"),
                    animal_data.get("breed"),
                    new_standardized_breed,
                    new_breed_group,
                    animal_data.get("age_text"),
                    new_age_min_months,
                    new_age_max_months,
                    animal_data.get("sex"),
                    final_size,
                    new_final_standardized_size,
                    language,
                    animal_data.get("primary_image_url"),
                    animal_data.get("original_image_url"),
                    animal_data.get("adoption_url"),
                    animal_data.get("status", "available"),
                    new_properties_json if new_properties_json != "{}" else None,
                    current_time,  # updated_at
                    current_time,  # last_scraped_at
                    animal_id,
                ),
            )

            self.conn.commit()
            cursor.close()

            self.logger.info(f"Updated animal ID {animal_id}: {animal_data.get('name')}")
            return animal_id, "updated"

        except Exception as e:
            self.logger.error(f"Error updating animal: {e}")
            if self.conn:
                self.conn.rollback()
            return None, "error"

    def create_scrape_log(self, organization_id: int) -> Optional[int]:
        """Create a new entry in the scrape_logs table.

        Args:
            organization_id: Organization ID for the scrape

        Returns:
            Scrape log ID if successful, None if failed
        """
        # Use connection pool if available
        if self.connection_pool:
            try:
                with self.connection_pool.get_connection_context() as conn:
                    cursor = conn.cursor()
                    cursor.execute(
                        """
                        INSERT INTO scrape_logs
                        (organization_id, started_at, status)
                        VALUES (%s, %s, %s)
                        RETURNING id
                        """,
                        (organization_id, datetime.now(), "running"),
                    )
                    scrape_log_id = cursor.fetchone()[0]
                    conn.commit()
                    cursor.close()
                    self.logger.info(f"Created scrape log with ID: {scrape_log_id}")
                    return scrape_log_id
            except Exception as e:
                self.logger.error(f"Error creating scrape log: {e}")
                return None

        # Fallback to direct connection
        if not self.conn:
            # Try to establish connection before failing
            if not self.connect():
                self.logger.error("No database connection available")
                return None

        try:
            cursor = self.conn.cursor()
            cursor.execute(
                """
                INSERT INTO scrape_logs
                (organization_id, started_at, status)
                VALUES (%s, %s, %s)
                RETURNING id
                """,
                (organization_id, datetime.now(), "running"),
            )
            scrape_log_id = cursor.fetchone()[0]
            self.conn.commit()
            cursor.close()
            self.logger.info(f"Created scrape log with ID: {scrape_log_id}")
            return scrape_log_id
        except Exception as e:
            self.logger.error(f"Error creating scrape log: {e}")
            if self.conn:
                self.conn.rollback()
            return None

    def complete_scrape_log(
        self,
        scrape_log_id: int,
        status: str,
        animals_found: int = 0,
        animals_added: int = 0,
        animals_updated: int = 0,
        error_message: Optional[str] = None,
        detailed_metrics: Optional[Dict[str, Any]] = None,
        duration_seconds: Optional[float] = None,
        data_quality_score: Optional[float] = None,
    ) -> bool:
        """Update the scrape log with completion information.

        Args:
            scrape_log_id: ID of the scrape log to update
            status: Final status of the scrape
            animals_found: Number of animals found
            animals_added: Number of animals added
            animals_updated: Number of animals updated
            error_message: Optional error message
            detailed_metrics: Optional detailed metrics as JSONB
            duration_seconds: Optional scrape duration in seconds
            data_quality_score: Optional data quality score (0.0-1.0)

        Returns:
            True if successful, False otherwise
        """
        if not self.conn:
            # Try to establish connection before failing
            if not self.connect():
                self.logger.error("No database connection available")
                return False

        try:
            cursor = self.conn.cursor()
            cursor.execute(
                """
                UPDATE scrape_logs
                SET completed_at = %s, status = %s,
                    dogs_found = %s, dogs_added = %s, dogs_updated = %s,
                    error_message = %s, detailed_metrics = %s,
                    duration_seconds = %s, data_quality_score = %s
                WHERE id = %s
                """,
                (
                    datetime.now(),
                    status,
                    animals_found,
                    animals_added,
                    animals_updated,
                    error_message,
                    json.dumps(detailed_metrics) if detailed_metrics else None,
                    duration_seconds,
                    data_quality_score,
                    scrape_log_id,
                ),
            )
            self.conn.commit()
            cursor.close()
            self.logger.info(f"Updated scrape log {scrape_log_id} with status: {status}")
            return True
        except Exception as e:
            self.logger.error(f"Error updating scrape log: {e}")
            if self.conn:
                self.conn.rollback()
            return False

    def _detect_language(self, text: str) -> str:
        """Detect language of text (simplified implementation).

        Args:
            text: Text to analyze

        Returns:
            Language code
        """
        # Import here to avoid dependency issues in tests
        try:
            from langdetect import detect

            if not text or len(text.strip()) < 10:
                return "en"
            return detect(text)
        except Exception:
            return "en"

    def get_existing_animal_urls(self, organization_id: int) -> set:
        """Get set of existing animal URLs for this organization.

        Args:
            organization_id: Organization ID

        Returns:
            Set of existing animal URLs
        """
        if not self.conn:
            # Try to establish connection before failing
            if not self.connect():
                self.logger.error("No database connection available")
                return set()

        try:
            cursor = self.conn.cursor()
            cursor.execute(
                "SELECT adoption_url FROM animals WHERE organization_id = %s AND status = 'available'",
                (organization_id,),
            )
            results = cursor.fetchall()
            cursor.close()

            return {url[0] for url in results if url[0]}
        except Exception as e:
            self.logger.error(f"Error getting existing animal URLs: {e}")
            return set()

    def _detect_animal_changes(
        self,
        current_data: Tuple,
        animal_data: Dict[str, Any],
        new_standardized_breed: str,
        new_age_min_months: Optional[int],
        new_age_max_months: Optional[int],
        new_final_standardized_size: Optional[str],
        new_properties_json: str,
        current_properties_json: str,
    ) -> bool:
        """Detect if animal data has changes (pure function).

        Args:
            current_data: Current animal data from database
            animal_data: New animal data
            new_standardized_breed: New standardized breed
            new_age_min_months: New age minimum months
            new_age_max_months: New age maximum months
            new_final_standardized_size: New standardized size
            new_properties_json: New properties as JSON
            current_properties_json: Current properties as JSON

        Returns:
            True if changes detected, False otherwise
        """
        (
            current_name,
            current_breed,
            current_age,
            current_sex,
            current_image,
            current_status,
            current_standardized_breed,
            current_age_min_months,
            current_age_max_months,
            current_standardized_size,
            _,
        ) = current_data

        return (
            animal_data.get("name") != current_name
            or animal_data.get("breed") != current_breed
            or animal_data.get("age_text") != current_age
            or animal_data.get("sex") != current_sex
            or animal_data.get("primary_image_url") != current_image
            or animal_data.get("status") != current_status
            or new_properties_json != current_properties_json
            or new_standardized_breed != current_standardized_breed
            or new_age_min_months != current_age_min_months
            or new_age_max_months != current_age_max_months
            or new_final_standardized_size != current_standardized_size
        )
