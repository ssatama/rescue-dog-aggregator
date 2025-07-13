import logging
import time
from contextlib import contextmanager
from datetime import datetime
from typing import Any, List, Optional, Tuple

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from api.database import get_pooled_connection

from .connection import check_railway_connection, railway_session

logger = logging.getLogger(__name__)


def get_local_data_count(table_name: str) -> int:
    """Get count of records in local database table."""
    valid_tables = ["organizations", "animals", "animal_images", "scrape_logs", "service_regions"]

    if table_name not in valid_tables:
        logger.error(f"Invalid table name: {table_name}")
        return 0

    try:
        with get_pooled_connection() as conn:
            with conn.cursor() as cursor:
                # Table name already validated against whitelist above
                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                result = cursor.fetchone()
                return result[0] if result else 0
    except Exception as e:
        logger.error(f"Failed to get local count for {table_name}: {e}")
        return 0


def get_railway_data_count(table_name: str) -> int:
    """Get count of records in Railway database table."""
    # Validate table name against whitelist to prevent SQL injection
    valid_tables = ["organizations", "animals", "animal_images", "scrape_logs", "service_regions"]

    if table_name not in valid_tables:
        logger.error(f"Invalid table name: {table_name}")
        return 0

    try:
        with railway_session() as session:
            # Use SQLAlchemy's identifier() for safe table name handling
            from sqlalchemy import text

            # Build query with validated table name - still using text() but with validation
            query = text(f"SELECT COUNT(*) FROM {table_name}")
            result = session.execute(query)
            count = result.scalar()
            return count if count is not None else 0
    except Exception as e:
        logger.error(f"Failed to get Railway count for {table_name}: {e}")
        return 0


def sync_organizations_to_railway(chunk_size: int = 1000) -> bool:
    """Sync all organizations from local database to Railway using chunked processing."""
    try:
        # Use chunked processing to prevent memory exhaustion
        organizations_processed = 0

        with railway_session() as railway_conn:
            with get_pooled_connection() as local_conn:
                with local_conn.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT name, website_url, description, country, city, logo_url, 
                               created_at, social_media, ships_to, config_id
                        FROM organizations
                        ORDER BY id
                    """
                    )

                    # Process in chunks to prevent memory exhaustion
                    while True:
                        organizations_chunk = cursor.fetchmany(chunk_size)
                        if not organizations_chunk:
                            break

                        # Process this chunk
                        organizations_processed += len(organizations_chunk)

                        # Process organizations in this chunk
                        _process_organizations_chunk(railway_conn, organizations_chunk)

        if organizations_processed == 0:
            logger.info("No organizations to sync")
            return True

        logger.info(f"Successfully synced {organizations_processed} organizations to Railway")
        return True

    except Exception as e:
        logger.error(f"Failed to sync organizations to Railway: {e}")
        return False


def sync_animals_to_railway(batch_size: int = 100) -> bool:
    """Sync all animals from local database to Railway in batches with memory safety warnings."""
    try:
        # Get animals from local database
        animals = []
        with get_pooled_connection() as local_conn:
            with local_conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT name, animal_type, size, age_text, sex, breed, 
                           primary_image_url, organization_id, created_at, updated_at,
                           availability_confidence, last_seen_at, consecutive_scrapes_missing,
                           status, properties, adoption_url, external_id
                    FROM animals
                    ORDER BY id
                """
                )
                animals = cursor.fetchall()

                # Warn about potential memory issues with large datasets
                if len(animals) > 10000:
                    logger.warning(f"Large dataset detected ({len(animals)} animals). Consider implementing chunked processing for production use.")

        if not animals:
            logger.info("No animals to sync")
            return True

        # Process in batches
        total_synced = 0
        with railway_session() as railway_conn:
            insert_sql = text(
                """
                INSERT INTO animals 
                (name, animal_type, size, age_text, sex, breed,
                 primary_image_url, organization_id, created_at, updated_at,
                 availability_confidence, last_seen_at, consecutive_scrapes_missing,
                 status, properties, adoption_url, external_id)
                VALUES 
                (:name, :animal_type, :size, :age_text, :sex, :breed,
                 :primary_image_url, :organization_id, :created_at, :updated_at,
                 :availability_confidence, :last_seen_at, :consecutive_scrapes_missing,
                 :status, :properties, :adoption_url, :external_id)
                ON CONFLICT (external_id, organization_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    animal_type = EXCLUDED.animal_type,
                    size = EXCLUDED.size,
                    age_text = EXCLUDED.age_text,
                    sex = EXCLUDED.sex,
                    breed = EXCLUDED.breed,
                    primary_image_url = EXCLUDED.primary_image_url,
                    updated_at = EXCLUDED.updated_at,
                    availability_confidence = EXCLUDED.availability_confidence,
                    last_seen_at = EXCLUDED.last_seen_at,
                    consecutive_scrapes_missing = EXCLUDED.consecutive_scrapes_missing,
                    status = EXCLUDED.status,
                    properties = EXCLUDED.properties,
                    adoption_url = EXCLUDED.adoption_url
            """
            )

            for i in range(0, len(animals), batch_size):
                batch = animals[i : i + batch_size]

                batch_params = []
                for animal in batch:
                    batch_params.append(
                        {
                            "name": animal[0],
                            "animal_type": animal[1],
                            "size": animal[2],
                            "age_text": animal[3],
                            "sex": animal[4],
                            "breed": animal[5],
                            "primary_image_url": animal[6],
                            "organization_id": animal[7],
                            "created_at": animal[8],
                            "updated_at": animal[9],
                            "availability_confidence": animal[10],
                            "last_seen_at": animal[11],
                            "consecutive_scrapes_missing": animal[12],
                            "status": animal[13],
                            "properties": animal[14],
                            "adoption_url": animal[15],
                            "external_id": animal[16],
                        }
                    )

                railway_conn.execute(insert_sql, batch_params)
                total_synced += len(batch)
                logger.info(f"Synced batch: {total_synced}/{len(animals)} animals")

        logger.info(f"Successfully synced {total_synced} animals to Railway")
        return True

    except Exception as e:
        logger.error(f"Failed to sync animals to Railway: {e}")
        return False


def sync_all_data_to_railway() -> bool:
    """Sync all data from local database to Railway with proper transaction boundaries."""
    try:
        logger.info("Starting full data sync to Railway with transaction management")

        # Use a single Railway transaction for all operations to ensure atomicity
        with railway_session() as session:
            try:
                # Sync organizations first (animals reference organizations)
                if not _sync_organizations_to_railway_in_transaction(session):
                    logger.error("Failed to sync organizations")
                    # Transaction will be automatically rolled back
                    return False

                # Sync animals
                if not _sync_animals_to_railway_in_transaction(session):
                    logger.error("Failed to sync animals")
                    # Transaction will be automatically rolled back
                    return False

                # Validate sync integrity before committing
                if not _validate_sync_integrity_in_transaction(session):
                    logger.error("Sync validation failed")
                    # Transaction will be automatically rolled back
                    return False

                # If we reach here, all operations succeeded
                # The transaction will be committed automatically by the context manager
                logger.info("Full data sync to Railway completed successfully")
                return True

            except Exception as e:
                logger.error(f"Error during sync transaction: {e}")
                # Transaction will be automatically rolled back by context manager
                return False

    except Exception as e:
        logger.error(f"Failed to establish Railway connection for sync: {e}")
        return False


def _process_organizations_chunk(session, organizations_chunk):
    """Process a chunk of organizations for Railway sync."""
    # Insert into Railway database using the provided session
    insert_sql = text(
        """
        INSERT INTO organizations 
        (name, website_url, description, country, city, logo_url, 
         created_at, social_media, ships_to, config_id)
        VALUES 
        (:name, :website_url, :description, :country, :city, :logo_url,
         :created_at, :social_media, :ships_to, :config_id)
        ON CONFLICT (name) DO UPDATE SET
            website_url = EXCLUDED.website_url,
            description = EXCLUDED.description,
            country = EXCLUDED.country,
            city = EXCLUDED.city,
            logo_url = EXCLUDED.logo_url,
            social_media = EXCLUDED.social_media,
            ships_to = EXCLUDED.ships_to,
            config_id = EXCLUDED.config_id
    """
    )

    for org in organizations_chunk:
        session.execute(
            insert_sql,
            {
                "name": org[0],
                "website_url": org[1],
                "description": org[2],
                "country": org[3],
                "city": org[4],
                "logo_url": org[5],
                "created_at": org[6],
                "social_media": org[7],
                "ships_to": org[8],
                "config_id": org[9],
            },
        )


def _sync_organizations_to_railway_in_transaction(session, chunk_size: int = 1000) -> bool:
    """Sync organizations to Railway within an existing transaction using chunked processing."""
    try:
        # Use chunked processing to prevent memory exhaustion
        organizations_processed = 0

        with get_pooled_connection() as local_conn:
            with local_conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT name, website_url, description, country, city, logo_url, 
                           created_at, social_media, ships_to, config_id
                    FROM organizations
                    ORDER BY id
                """
                )

                # Process in chunks to prevent memory exhaustion
                while True:
                    organizations_chunk = cursor.fetchmany(chunk_size)
                    if not organizations_chunk:
                        break

                    # Process this chunk
                    organizations_processed += len(organizations_chunk)

                    # Process organizations in this chunk
                    _process_organizations_chunk(session, organizations_chunk)

        if organizations_processed == 0:
            logger.info("No organizations to sync")
            return True

        logger.info(f"Successfully processed {organizations_processed} organizations for Railway sync")
        return True

    except Exception as e:
        logger.error(f"Failed to sync organizations to Railway in transaction: {e}")
        return False


def _sync_animals_to_railway_in_transaction(session, batch_size: int = 100) -> bool:
    """Sync animals to Railway within an existing transaction."""
    try:
        # Get animals from local database
        animals = []
        with get_pooled_connection() as local_conn:
            with local_conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT name, animal_type, size, age_text, sex, breed, 
                           primary_image_url, organization_id, created_at, updated_at,
                           availability_confidence, last_seen_at, consecutive_scrapes_missing,
                           status, properties, adoption_url, external_id
                    FROM animals
                    ORDER BY id
                """
                )
                animals = cursor.fetchall()

                # Warn about potential memory issues with large datasets
                if len(animals) > 10000:
                    logger.warning(f"Large dataset detected ({len(animals)} animals). Consider implementing chunked processing for production use.")

        if not animals:
            logger.info("No animals to sync")
            return True

        # Process in batches using the provided session
        total_synced = 0
        insert_sql = text(
            """
            INSERT INTO animals 
            (name, animal_type, size, age_text, sex, breed,
             primary_image_url, organization_id, created_at, updated_at,
             availability_confidence, last_seen_at, consecutive_scrapes_missing,
             status, properties, adoption_url, external_id)
            VALUES 
            (:name, :animal_type, :size, :age_text, :sex, :breed,
             :primary_image_url, :organization_id, :created_at, :updated_at,
             :availability_confidence, :last_seen_at, :consecutive_scrapes_missing,
             :status, :properties, :adoption_url, :external_id)
            ON CONFLICT (external_id, organization_id) DO UPDATE SET
                name = EXCLUDED.name,
                animal_type = EXCLUDED.animal_type,
                size = EXCLUDED.size,
                age_text = EXCLUDED.age_text,
                sex = EXCLUDED.sex,
                breed = EXCLUDED.breed,
                primary_image_url = EXCLUDED.primary_image_url,
                updated_at = EXCLUDED.updated_at,
                availability_confidence = EXCLUDED.availability_confidence,
                last_seen_at = EXCLUDED.last_seen_at,
                consecutive_scrapes_missing = EXCLUDED.consecutive_scrapes_missing,
                status = EXCLUDED.status,
                properties = EXCLUDED.properties,
                adoption_url = EXCLUDED.adoption_url
        """
        )

        for i in range(0, len(animals), batch_size):
            batch = animals[i : i + batch_size]

            batch_params = []
            for animal in batch:
                batch_params.append(
                    {
                        "name": animal[0],
                        "animal_type": animal[1],
                        "size": animal[2],
                        "age_text": animal[3],
                        "sex": animal[4],
                        "breed": animal[5],
                        "primary_image_url": animal[6],
                        "organization_id": animal[7],
                        "created_at": animal[8],
                        "updated_at": animal[9],
                        "availability_confidence": animal[10],
                        "last_seen_at": animal[11],
                        "consecutive_scrapes_missing": animal[12],
                        "status": animal[13],
                        "properties": animal[14],
                        "adoption_url": animal[15],
                        "external_id": animal[16],
                    }
                )

            session.execute(insert_sql, batch_params)
            total_synced += len(batch)
            logger.info(f"Prepared batch: {total_synced}/{len(animals)} animals for Railway sync")

        logger.info(f"Successfully prepared {total_synced} animals for Railway sync")
        return True

    except Exception as e:
        logger.error(f"Failed to sync animals to Railway in transaction: {e}")
        return False


def _validate_sync_integrity_in_transaction(session) -> bool:
    """Validate sync integrity within an existing transaction."""
    try:
        tables_to_check = ["organizations", "animals"]

        for table in tables_to_check:
            local_count = get_local_data_count(table)

            # Get Railway count using the existing session
            # Validate table name against whitelist to prevent SQL injection
            valid_tables = ["organizations", "animals", "animal_images", "scrape_logs", "service_regions"]

            if table not in valid_tables:
                logger.error(f"Invalid table name: {table}")
                return False

            try:
                # Build query with validated table name
                query = text(f"SELECT COUNT(*) FROM {table}")
                result = session.execute(query)
                railway_count = result.scalar()
                railway_count = railway_count if railway_count is not None else 0
            except Exception as e:
                logger.error(f"Failed to get Railway count for {table}: {e}")
                return False

            if local_count != railway_count:
                logger.error(f"Sync validation failed for {table}: " f"local={local_count}, railway={railway_count}")
                return False

            logger.info(f"Sync validation passed for {table}: {local_count} records")

        return True

    except Exception as e:
        logger.error(f"Sync validation error in transaction: {e}")
        return False


def validate_sync_integrity() -> bool:
    """Validate that sync was successful by comparing record counts."""
    try:
        tables_to_check = ["organizations", "animals"]

        for table in tables_to_check:
            local_count = get_local_data_count(table)
            railway_count = get_railway_data_count(table)

            if local_count != railway_count:
                logger.error(f"Sync validation failed for {table}: " f"local={local_count}, railway={railway_count}")
                return False

            logger.info(f"Sync validation passed for {table}: {local_count} records")

        return True

    except Exception as e:
        logger.error(f"Sync validation error: {e}")
        return False


class RailwayDataSyncer:
    """Manages data synchronization operations between local and Railway databases."""

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def perform_full_sync(self, dry_run: bool = False, validate_after: bool = True, max_retries: int = 3) -> bool:
        """Perform complete data synchronization to Railway with retry logic and transaction boundaries."""
        try:
            # Check Railway connection first
            if not check_railway_connection():
                self.logger.error("Railway database connection failed")
                return False

            if dry_run:
                return self._perform_dry_run()

            # Perform actual sync with retry mechanism
            self.logger.info("Starting full data synchronization to Railway with transaction boundaries")

            # Retry logic for transient failures
            for attempt in range(max_retries):
                try:
                    if not sync_all_data_to_railway():
                        if attempt < max_retries - 1:
                            wait_time = 2**attempt  # Exponential backoff
                            self.logger.warning(f"Data synchronization failed (attempt {attempt + 1}/{max_retries}), retrying in {wait_time}s...")
                            time.sleep(wait_time)
                            continue
                        else:
                            self.logger.error(f"Data synchronization failed after {max_retries} attempts")
                            return False

                    # Sync succeeded, break out of retry loop
                    break

                except Exception as e:
                    if attempt < max_retries - 1:
                        wait_time = 2**attempt  # Exponential backoff
                        self.logger.warning(f"Sync error (attempt {attempt + 1}/{max_retries}): {e}, retrying in {wait_time}s...")
                        time.sleep(wait_time)
                        continue
                    else:
                        self.logger.error(f"Data synchronization failed after {max_retries} attempts with error: {e}")
                        return False

            # Final validation (not retried as it should be deterministic)
            if validate_after and not validate_sync_integrity():
                self.logger.error("Post-sync validation failed")
                return False

            self.logger.info("Full data synchronization completed successfully with transaction boundaries")
            return True

        except Exception as e:
            self.logger.error(f"Data sync operation failed: {e}")
            return False

    def _perform_dry_run(self) -> bool:
        """Perform dry run to show what would be synced."""
        try:
            self.logger.info("Performing dry run - no data will be modified")

            # Check local data counts
            local_orgs = get_local_data_count("organizations")
            local_animals = get_local_data_count("animals")

            # Check Railway data counts
            railway_orgs = get_railway_data_count("organizations")
            railway_animals = get_railway_data_count("animals")

            self.logger.info(f"Local database: {local_orgs} organizations, {local_animals} animals")
            self.logger.info(f"Railway database: {railway_orgs} organizations, {railway_animals} animals")

            if local_orgs > railway_orgs or local_animals > railway_animals:
                self.logger.info("Data sync would transfer new records to Railway")
            elif local_orgs == railway_orgs and local_animals == railway_animals:
                self.logger.info("Databases appear to be in sync")
            else:
                self.logger.warning("Railway database has more records than local - this is unexpected")

            return True

        except Exception as e:
            self.logger.error(f"Dry run failed: {e}")
            return False


@contextmanager
def get_db_connection():
    """Context manager for local database connections (for compatibility with existing code)."""
    with get_pooled_connection() as conn:
        yield conn
