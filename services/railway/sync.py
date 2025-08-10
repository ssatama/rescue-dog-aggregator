import json
import logging
import time
from contextlib import contextmanager
from datetime import date, datetime
from enum import Enum
from typing import Dict

from sqlalchemy import text

from api.database import get_pooled_connection

from .connection import check_railway_connection, railway_session

logger = logging.getLogger(__name__)


class SyncMode(Enum):
    """Sync modes for Railway data synchronization."""

    INCREMENTAL = "incremental"  # Default: local_count >= railway_count
    REBUILD = "rebuild"  # Clear railway, push all local data
    FORCE = "force"  # Skip validation (emergency only)


# Safety thresholds for rebuild mode validation
SAFETY_THRESHOLDS: Dict[str, int] = {
    "organizations": 5,  # Must have at least 5 organizations
    "animals": 50,  # Must have at least 50 animals
    "scrape_logs": 10,  # Must have at least 10 logs
    "service_regions": 1,  # Must have at least 1 region
}


def get_local_data_count(table_name: str) -> int:
    """Get count of records in local database table."""
    valid_tables = ["organizations", "animals", "scrape_logs", "service_regions"]

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
    valid_tables = ["organizations", "animals", "scrape_logs", "service_regions"]

    if table_name not in valid_tables:
        logger.error(f"Invalid table name: {table_name}")
        return 0

    try:
        with railway_session() as session:
            # Use SQLAlchemy's identifier() for safe table name handling
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
                        SELECT id, name, website_url, description, country, city, logo_url, active, created_at, updated_at, social_media, config_id, last_config_sync, established_year, ships_to, service_regions, total_dogs, new_this_week, recent_dogs, slug, adoption_fees
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
                    SELECT id, name, organization_id, animal_type, external_id, primary_image_url, adoption_url, status, breed, standardized_breed, age_text, age_min_months, age_max_months, sex, size, standardized_size, language, properties, created_at, updated_at, last_scraped_at, source_last_updated, breed_group, original_image_url, last_seen_at, consecutive_scrapes_missing, availability_confidence, last_session_id, active, slug
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
                (id, name, animal_type, size, age_text, sex, breed,
                 primary_image_url, organization_id, created_at, updated_at,
                 availability_confidence, last_seen_at, consecutive_scrapes_missing,
                 status, properties, adoption_url, external_id, slug)
                VALUES 
                (:id, :name, :animal_type, :size, :age_text, :sex, :breed,
                 :primary_image_url, :organization_id, :created_at, :updated_at,
                 :availability_confidence, :last_seen_at, :consecutive_scrapes_missing,
                 :status, :properties, :adoption_url, :external_id, :slug)
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
                    adoption_url = EXCLUDED.adoption_url,
                slug = EXCLUDED.slug
            """
            )

            for i in range(0, len(animals), batch_size):
                batch = animals[i : i + batch_size]

                batch_params = []
                for animal in batch:
                    batch_params.append(
                        {
                            "id": animal[0],
                            "name": animal[1],
                            "organization_id": animal[2],
                            "animal_type": animal[3],
                            "external_id": animal[4],
                            "primary_image_url": animal[5],
                            "adoption_url": animal[6],
                            "status": animal[7],
                            "breed": animal[8],
                            "standardized_breed": animal[9],
                            "age_text": animal[10],
                            "age_min_months": animal[11],
                            "age_max_months": animal[12],
                            "sex": animal[13],
                            "size": animal[14],
                            "standardized_size": animal[15],
                            "language": animal[16],
                            "properties": json.dumps(animal[17]) if animal[17] is not None else None,
                            "created_at": animal[18],
                            "updated_at": animal[19],
                            "last_scraped_at": animal[20],
                            "source_last_updated": animal[21],
                            "breed_group": animal[22],
                            "original_image_url": animal[23],
                            "last_seen_at": animal[24],
                            "consecutive_scrapes_missing": animal[25],
                            "availability_confidence": animal[26],
                            "last_session_id": animal[27],
                            "active": animal[28],
                            "slug": animal[29],
                            "slug": animal[29],
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


def _validate_table_schemas() -> bool:
    """Validate that local and Railway table schemas match exactly by column name and data type."""
    try:
        tables_to_validate = ["organizations", "animals", "scrape_logs", "service_regions"]

        for table in tables_to_validate:
            # Get local schema
            local_schema = {}
            with get_pooled_connection() as local_conn:
                with local_conn.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT column_name, data_type
                        FROM information_schema.columns 
                        WHERE table_name = %s 
                    """,
                        (table,),
                    )
                    for row in cursor.fetchall():
                        local_schema[row[0]] = row[1]

            # Get Railway schema
            railway_schema = {}
            with railway_session() as session:
                result = session.execute(
                    text(
                        """
                    SELECT column_name, data_type
                    FROM information_schema.columns 
                    WHERE table_name = :table_name 
                """
                    ),
                    {"table_name": table},
                )
                for row in result.fetchall():
                    railway_schema[row[0]] = row[1]

            # Compare schemas by column name (ignore positional order)
            if len(local_schema) != len(railway_schema):
                logger.error(f"Schema mismatch in {table}: different column counts")
                logger.error(f"Local: {len(local_schema)} columns, Railway: {len(railway_schema)} columns")
                return False

            # Check each column exists with correct data type
            for column_name, local_data_type in local_schema.items():
                if column_name not in railway_schema:
                    logger.error(f"Schema mismatch in {table}: column '{column_name}' missing in Railway")
                    return False

                railway_data_type = railway_schema[column_name]
                if local_data_type != railway_data_type:
                    logger.error(f"Schema mismatch in {table}: column '{column_name}' data type differs")
                    logger.error(f"Local: {local_data_type}, Railway: {railway_data_type}")
                    return False

            # Check for extra columns in Railway
            for column_name in railway_schema:
                if column_name not in local_schema:
                    logger.error(f"Schema mismatch in {table}: extra column '{column_name}' in Railway")
                    return False

            logger.info(f"Schema validation passed for {table}: {len(local_schema)} columns match")

        logger.info("All table schemas validated successfully")
        return True

    except Exception as e:
        logger.error(f"Schema validation failed: {e}")
        return False


def _build_organization_id_mapping(session) -> dict:
    """Build organization ID mapping efficiently with single bulk query."""
    try:
        # Get local organization mappings
        local_org_mapping = {}
        with get_pooled_connection() as local_conn:
            with local_conn.cursor() as cursor:
                cursor.execute("SELECT id, config_id FROM organizations WHERE config_id IS NOT NULL")
                for row in cursor.fetchall():
                    local_org_mapping[row[1]] = row[0]  # config_id -> local_id

        # Get Railway organization mappings in bulk
        config_ids = list(local_org_mapping.keys())
        if not config_ids:
            logger.warning("No organizations with config_id found")
            return {}

        # Use IN clause for bulk lookup instead of N+1 queries
        placeholders = ", ".join([f":config_{i}" for i in range(len(config_ids))])
        params = {f"config_{i}": config_id for i, config_id in enumerate(config_ids)}

        result = session.execute(text(f"SELECT id, config_id FROM organizations WHERE config_id IN ({placeholders})"), params)

        # Build final mapping: local_id -> railway_id
        org_id_mapping = {}
        for railway_row in result.fetchall():
            railway_id = railway_row[0]
            config_id = railway_row[1]
            local_id = local_org_mapping.get(config_id)
            if local_id:
                org_id_mapping[local_id] = railway_id

        logger.info(f"Built organization ID mapping for {len(org_id_mapping)} organizations")
        return org_id_mapping

    except Exception as e:
        logger.error(f"Failed to build organization ID mapping: {e}")
        return {}


def sync_all_data_to_railway() -> bool:
    """Sync all data from local database to Railway with independent table transactions."""
    try:
        logger.info("Starting full data sync to Railway with independent transactions")

        # Phase 1: Schema validation (fail fast)
        logger.info("Validating table schemas...")
        if not _validate_table_schemas():
            logger.error("Schema validation failed - aborting sync")
            return False

        # Phase 2: Sync organizations (foundation table)
        logger.info("Syncing organizations...")
        if not _sync_organizations_independently():
            logger.error("Failed to sync organizations - aborting sync")
            return False

        # Phase 3: Build organization ID mapping once
        logger.info("Building organization ID mapping...")
        with railway_session() as session:
            org_id_mapping = _build_organization_id_mapping(session)
            if not org_id_mapping:
                logger.error("Failed to build organization ID mapping - aborting sync")
                return False

        # Phase 4: Sync dependent tables independently
        success_count = 0
        total_tables = 3

        logger.info("Syncing animals...")
        if _sync_animals_independently(org_id_mapping):
            success_count += 1
            logger.info("✅ Animals synced successfully")
        else:
            logger.error("❌ Animals sync failed")

        logger.info("Syncing scrape_logs...")
        if _sync_scrape_logs_independently(org_id_mapping):
            success_count += 1
            logger.info("✅ Scrape logs synced successfully")
        else:
            logger.error("❌ Scrape logs sync failed")

        logger.info("Syncing service_regions...")
        if _sync_service_regions_independently(org_id_mapping):
            success_count += 1
            logger.info("✅ Service regions synced successfully")
        else:
            logger.error("❌ Service regions sync failed")

        # Phase 5: Final validation
        logger.info("Validating final sync integrity...")
        if validate_sync_integrity():
            logger.info(f"✅ Full data sync completed: {success_count + 1}/{total_tables + 1} tables successful")
            return success_count == total_tables  # All dependent tables must succeed
        else:
            logger.error("❌ Final sync validation failed")
            return False

    except Exception as e:
        logger.error(f"Failed to sync data to Railway: {e}")
        return False


def _sync_organizations_independently() -> bool:
    """Sync organizations to Railway in independent transaction."""
    try:
        with railway_session() as session:
            return _sync_organizations_to_railway_in_transaction(session)
    except Exception as e:
        logger.error(f"Failed to sync organizations independently: {e}")
        return False


def _sync_animals_independently(org_id_mapping: dict) -> bool:
    """Sync animals to Railway in independent transaction using pre-built mapping."""
    try:
        with railway_session() as session:
            return _sync_animals_with_mapping(session, org_id_mapping)
    except Exception as e:
        logger.error(f"Failed to sync animals independently: {e}")
        return False


def _sync_scrape_logs_independently(org_id_mapping: dict) -> bool:
    """Sync scrape_logs to Railway in independent transaction."""
    try:
        with railway_session() as session:
            return _sync_scrape_logs_with_mapping(session, org_id_mapping)
    except Exception as e:
        logger.error(f"Failed to sync scrape_logs independently: {e}")
        return False


def _sync_service_regions_independently(org_id_mapping: dict) -> bool:
    """Sync service_regions to Railway in independent transaction."""
    try:
        with railway_session() as session:
            return _sync_service_regions_with_mapping(session, org_id_mapping)
    except Exception as e:
        logger.error(f"Failed to sync service_regions independently: {e}")
        return False


def _process_organizations_chunk(session, organizations_chunk):
    """Process a chunk of organizations for Railway sync."""
    # Insert into Railway database using the provided session
    insert_sql = text(
        """
        INSERT INTO organizations 
        (id, name, website_url, description, country, city, logo_url, active,
         created_at, updated_at, social_media, config_id, last_config_sync, 
         established_year, ships_to, service_regions, total_dogs, new_this_week, recent_dogs, slug, adoption_fees)
        VALUES 
        (:id, :name, :website_url, :description, :country, :city, :logo_url, :active,
         :created_at, :updated_at, :social_media, :config_id, :last_config_sync,
         :established_year, :ships_to, :service_regions, :total_dogs, :new_this_week, :recent_dogs, :slug, :adoption_fees)
        ON CONFLICT (config_id) DO UPDATE SET
            name = EXCLUDED.name,
            website_url = EXCLUDED.website_url,
            description = EXCLUDED.description,
            country = EXCLUDED.country,
            city = EXCLUDED.city,
            logo_url = EXCLUDED.logo_url,
            active = EXCLUDED.active,
            updated_at = EXCLUDED.updated_at,
            social_media = EXCLUDED.social_media,
            last_config_sync = EXCLUDED.last_config_sync,
            established_year = EXCLUDED.established_year,
            ships_to = EXCLUDED.ships_to,
            service_regions = EXCLUDED.service_regions,
            total_dogs = EXCLUDED.total_dogs,
            new_this_week = EXCLUDED.new_this_week,
            recent_dogs = EXCLUDED.recent_dogs,
            slug = EXCLUDED.slug,
            adoption_fees = EXCLUDED.adoption_fees
    """
    )

    def safe_json_serialize(value):
        """Safely serialize value to JSON, handling datetime objects."""
        if value is None:
            return None
        if isinstance(value, (dict, list)):

            def json_serializer(obj):
                if isinstance(obj, (datetime, date)):
                    return obj.isoformat()
                raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

            return json.dumps(value, default=json_serializer)
        return value

    for org in organizations_chunk:
        # Map all 21 columns: id, name, website_url, description, country, city, logo_url, active, created_at, updated_at, social_media, config_id, last_config_sync, established_year, ships_to, service_regions, total_dogs, new_this_week, recent_dogs, slug, adoption_fees
        session.execute(
            insert_sql,
            {
                "id": org[0],
                "name": org[1],
                "website_url": org[2],
                "description": org[3],
                "country": org[4],
                "city": org[5],
                "logo_url": org[6],
                "active": org[7],
                "created_at": org[8],
                "updated_at": org[9],
                "social_media": safe_json_serialize(org[10]),
                "config_id": org[11],
                "last_config_sync": org[12],
                "established_year": org[13],
                "ships_to": safe_json_serialize(org[14]),
                "service_regions": safe_json_serialize(org[15]),
                "total_dogs": org[16],
                "new_this_week": org[17],
                "recent_dogs": safe_json_serialize(org[18]),
                "slug": org[19],
                "adoption_fees": safe_json_serialize(org[20]),
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
                    SELECT id, name, website_url, description, country, city, logo_url, active, created_at, updated_at, social_media, config_id, last_config_sync, established_year, ships_to, service_regions, total_dogs, new_this_week, recent_dogs, slug, adoption_fees
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


def _sync_animals_with_mapping(session, org_id_mapping: dict, batch_size: int = 100) -> bool:
    """Sync animals to Railway using pre-built organization ID mapping."""
    try:
        # Get animals from local database
        animals = []
        with get_pooled_connection() as local_conn:
            with local_conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, name, organization_id, animal_type, external_id, primary_image_url, adoption_url, status, breed, standardized_breed, age_text, age_min_months, age_max_months, sex, size, standardized_size, language, properties, created_at, updated_at, last_scraped_at, source_last_updated, breed_group, original_image_url, last_seen_at, consecutive_scrapes_missing, availability_confidence, last_session_id, active, slug
                    FROM animals
                    ORDER BY id
                """
                )
                animals = cursor.fetchall()

        if not animals:
            logger.info("No animals to sync")
            return True

        # Process in batches using the provided mapping
        total_synced = 0
        insert_sql = text(
            """
            INSERT INTO animals 
            (id, name, organization_id, animal_type, external_id, primary_image_url, adoption_url, status, breed, standardized_breed, age_text, age_min_months, age_max_months, sex, size, standardized_size, language, properties, created_at, updated_at, last_scraped_at, source_last_updated, breed_group, original_image_url, last_seen_at, consecutive_scrapes_missing, availability_confidence, last_session_id, active, slug)
            VALUES 
            (:id, :name, :organization_id, :animal_type, :external_id, :primary_image_url, :adoption_url, :status, :breed, :standardized_breed, :age_text, :age_min_months, :age_max_months, :sex, :size, :standardized_size, :language, :properties, :created_at, :updated_at, :last_scraped_at, :source_last_updated, :breed_group, :original_image_url, :last_seen_at, :consecutive_scrapes_missing, :availability_confidence, :last_session_id, :active, :slug)
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
                adoption_url = EXCLUDED.adoption_url,
                slug = EXCLUDED.slug
        """
        )

        for i in range(0, len(animals), batch_size):
            batch = animals[i : i + batch_size]

            batch_params = []
            for animal in batch:
                local_org_id = animal[2]
                railway_org_id = org_id_mapping.get(local_org_id)

                if railway_org_id is None:
                    logger.warning(f"Skipping animal {animal[1]} - no Railway organization found for local org ID {local_org_id}")
                    continue

                batch_params.append(
                    {
                        "id": animal[0],
                        "name": animal[1],
                        "organization_id": railway_org_id,  # Use pre-built mapping
                        "animal_type": animal[3],
                        "external_id": animal[4],
                        "primary_image_url": animal[5],
                        "adoption_url": animal[6],
                        "status": animal[7],
                        "breed": animal[8],
                        "standardized_breed": animal[9],
                        "age_text": animal[10],
                        "age_min_months": animal[11],
                        "age_max_months": animal[12],
                        "sex": animal[13],
                        "size": animal[14],
                        "standardized_size": animal[15],
                        "language": animal[16],
                        "properties": json.dumps(animal[17]) if animal[17] is not None else None,
                        "created_at": animal[18],
                        "updated_at": animal[19],
                        "last_scraped_at": animal[20],
                        "source_last_updated": animal[21],
                        "breed_group": animal[22],
                        "original_image_url": animal[23],
                        "last_seen_at": animal[24],
                        "consecutive_scrapes_missing": animal[25],
                        "availability_confidence": animal[26],
                        "last_session_id": animal[27],
                        "active": animal[28],
                        "slug": animal[29],
                    }
                )

            if batch_params:
                session.execute(insert_sql, batch_params)
                total_synced += len(batch_params)

            logger.info(f"Synced batch: {total_synced}/{len(animals)} animals")

        logger.info(f"Successfully synced {total_synced} animals to Railway")
        return True

    except Exception as e:
        logger.error(f"Failed to sync animals with mapping: {e}")
        return False


def _sync_animals_to_railway_in_transaction(session, batch_size: int = 100) -> bool:
    """Sync animals to Railway within an existing transaction."""
    try:
        # First, create a mapping of local organization IDs to Railway organization IDs using config_id
        org_id_mapping = {}

        # Get local organization ID to config_id mapping
        with get_pooled_connection() as local_conn:
            with local_conn.cursor() as cursor:
                cursor.execute("SELECT id, config_id FROM organizations WHERE config_id IS NOT NULL")
                local_org_mapping = {row[0]: row[1] for row in cursor.fetchall()}

        # Get Railway config_id to ID mapping
        for local_id, config_id in local_org_mapping.items():
            result = session.execute(text("SELECT id FROM organizations WHERE config_id = :config_id"), {"config_id": config_id})
            railway_row = result.fetchone()
            if railway_row:
                org_id_mapping[local_id] = railway_row[0]

        logger.info(f"Created organization ID mapping for {len(org_id_mapping)} organizations")

        # Get animals from local database
        animals = []
        with get_pooled_connection() as local_conn:
            with local_conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, name, organization_id, animal_type, external_id, primary_image_url, adoption_url, status, breed, standardized_breed, age_text, age_min_months, age_max_months, sex, size, standardized_size, language, properties, created_at, updated_at, last_scraped_at, source_last_updated, breed_group, original_image_url, last_seen_at, consecutive_scrapes_missing, availability_confidence, last_session_id, active, slug
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
            (id, name, organization_id, animal_type, external_id, primary_image_url, adoption_url, status, breed, standardized_breed, age_text, age_min_months, age_max_months, sex, size, standardized_size, language, properties, created_at, updated_at, last_scraped_at, source_last_updated, breed_group, original_image_url, last_seen_at, consecutive_scrapes_missing, availability_confidence, last_session_id, active, slug)
            VALUES 
            (:id, :name, :organization_id, :animal_type, :external_id, :primary_image_url, :adoption_url, :status, :breed, :standardized_breed, :age_text, :age_min_months, :age_max_months, :sex, :size, :standardized_size, :language, :properties, :created_at, :updated_at, :last_scraped_at, :source_last_updated, :breed_group, :original_image_url, :last_seen_at, :consecutive_scrapes_missing, :availability_confidence, :last_session_id, :active, :slug)
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
                adoption_url = EXCLUDED.adoption_url,
                slug = EXCLUDED.slug
        """
        )

        for i in range(0, len(animals), batch_size):
            batch = animals[i : i + batch_size]

            batch_params = []
            for animal in batch:
                local_org_id = animal[2]
                railway_org_id = org_id_mapping.get(local_org_id)

                if railway_org_id is None:
                    logger.warning(f"Skipping animal {animal[1]} - no Railway organization found for local org ID {local_org_id}")
                    continue

                batch_params.append(
                    {
                        "id": animal[0],
                        "name": animal[1],
                        "organization_id": railway_org_id,  # Use mapped Railway org ID
                        "animal_type": animal[3],
                        "external_id": animal[4],
                        "primary_image_url": animal[5],
                        "adoption_url": animal[6],
                        "status": animal[7],
                        "breed": animal[8],
                        "standardized_breed": animal[9],
                        "age_text": animal[10],
                        "age_min_months": animal[11],
                        "age_max_months": animal[12],
                        "sex": animal[13],
                        "size": animal[14],
                        "standardized_size": animal[15],
                        "language": animal[16],
                        "properties": json.dumps(animal[17]) if animal[17] is not None else None,
                        "created_at": animal[18],
                        "updated_at": animal[19],
                        "last_scraped_at": animal[20],
                        "source_last_updated": animal[21],
                        "breed_group": animal[22],
                        "original_image_url": animal[23],
                        "last_seen_at": animal[24],
                        "consecutive_scrapes_missing": animal[25],
                        "availability_confidence": animal[26],
                        "last_session_id": animal[27],
                        "active": animal[28],
                        "slug": animal[29],
                    }
                )

            if batch_params:  # Only execute if there are valid animals to sync
                session.execute(insert_sql, batch_params)
                total_synced += len(batch_params)  # Count actual synced animals, not batch size

            logger.info(f"Prepared batch: {total_synced}/{len(animals)} animals for Railway sync")

        logger.info(f"Successfully prepared {total_synced} animals for Railway sync")
        return True

    except Exception as e:
        logger.error(f"Failed to sync animals to Railway in transaction: {e}")
        return False


def _sync_scrape_logs_with_mapping(session, org_id_mapping: dict, batch_size: int = 100) -> bool:
    """Sync scrape_logs to Railway using pre-built organization ID mapping."""
    try:
        # Get scrape_logs from local database
        with get_pooled_connection() as local_conn:
            with local_conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, organization_id, started_at, completed_at, dogs_found, dogs_added,
                           dogs_updated, status, error_message, created_at, detailed_metrics,
                           duration_seconds, data_quality_score
                    FROM scrape_logs
                    ORDER BY id
                    """
                )
                logs = cursor.fetchall()

        if not logs:
            logger.info("No scrape_logs to sync")
            return True

        # Process in batches
        total_synced = 0
        insert_sql = text(
            """
            INSERT INTO scrape_logs 
            (id, organization_id, started_at, completed_at, dogs_found, dogs_added,
             dogs_updated, status, error_message, created_at, detailed_metrics,
             duration_seconds, data_quality_score)
            VALUES 
            (:id, :organization_id, :started_at, :completed_at, :dogs_found, :dogs_added,
             :dogs_updated, :status, :error_message, :created_at, :detailed_metrics,
             :duration_seconds, :data_quality_score)
            ON CONFLICT (id) DO UPDATE SET
                organization_id = EXCLUDED.organization_id,
                started_at = EXCLUDED.started_at,
                completed_at = EXCLUDED.completed_at,
                dogs_found = EXCLUDED.dogs_found,
                dogs_added = EXCLUDED.dogs_added,
                dogs_updated = EXCLUDED.dogs_updated,
                status = EXCLUDED.status,
                error_message = EXCLUDED.error_message,
                detailed_metrics = EXCLUDED.detailed_metrics,
                duration_seconds = EXCLUDED.duration_seconds,
                data_quality_score = EXCLUDED.data_quality_score
            """
        )

        for i in range(0, len(logs), batch_size):
            batch = logs[i : i + batch_size]

            batch_params = []
            for log in batch:
                local_org_id = log[1]
                railway_org_id = org_id_mapping.get(local_org_id)

                if railway_org_id is None:
                    logger.warning(f"Skipping scrape_log - no Railway organization found for local org ID {local_org_id}")
                    continue

                batch_params.append(
                    {
                        "id": log[0],
                        "organization_id": railway_org_id,
                        "started_at": log[2],
                        "completed_at": log[3],
                        "dogs_found": log[4],
                        "dogs_added": log[5],
                        "dogs_updated": log[6],
                        "status": log[7],
                        "error_message": log[8],
                        "created_at": log[9],
                        "detailed_metrics": json.dumps(log[10]) if log[10] is not None else None,
                        "duration_seconds": log[11],
                        "data_quality_score": log[12],
                    }
                )

            if batch_params:
                session.execute(insert_sql, batch_params)
                total_synced += len(batch_params)

            logger.info(f"Synced batch: {total_synced}/{len(logs)} scrape_logs")

        logger.info(f"Successfully synced {total_synced} scrape_logs to Railway")
        return True

    except Exception as e:
        logger.error(f"Failed to sync scrape_logs with mapping: {e}")
        return False


def _sync_service_regions_with_mapping(session, org_id_mapping: dict, batch_size: int = 100) -> bool:
    """Sync service_regions to Railway using pre-built organization ID mapping."""
    try:
        # Get service_regions from local database
        with get_pooled_connection() as local_conn:
            with local_conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, organization_id, country, active, notes, created_at, updated_at, region
                    FROM service_regions
                    ORDER BY id
                    """
                )
                regions = cursor.fetchall()

        if not regions:
            logger.info("No service_regions to sync")
            return True

        # Process in batches
        total_synced = 0
        insert_sql = text(
            """
            INSERT INTO service_regions 
            (id, organization_id, country, active, notes, created_at, updated_at, region)
            VALUES 
            (:id, :organization_id, :country, :active, :notes, :created_at, :updated_at, :region)
            ON CONFLICT (organization_id, country) DO UPDATE SET
                active = EXCLUDED.active,
                notes = EXCLUDED.notes,
                updated_at = EXCLUDED.updated_at
            """
        )

        for i in range(0, len(regions), batch_size):
            batch = regions[i : i + batch_size]

            batch_params = []
            for region in batch:
                local_org_id = region[1]
                railway_org_id = org_id_mapping.get(local_org_id)

                if railway_org_id is None:
                    logger.warning(f"Skipping service_region - no Railway organization found for local org ID {local_org_id}")
                    continue

                batch_params.append(
                    {
                        "id": region[0],
                        "organization_id": railway_org_id,
                        "country": region[2],
                        "active": region[3],
                        "notes": region[4],
                        "created_at": region[5],
                        "updated_at": region[6],
                        "region": region[7],
                    }
                )

            if batch_params:
                session.execute(insert_sql, batch_params)
                total_synced += len(batch_params)

            logger.info(f"Synced batch: {total_synced}/{len(regions)} service_regions")

        logger.info(f"Successfully synced {total_synced} service_regions to Railway")
        return True

    except Exception as e:
        logger.error(f"Failed to sync service_regions with mapping: {e}")
        return False


def _sync_scrape_logs_to_railway_in_transaction(session, batch_size: int = 100) -> bool:
    """Sync scrape_logs to Railway within an existing transaction."""
    try:
        # Create organization ID mapping
        org_id_mapping = {}
        with get_pooled_connection() as local_conn:
            with local_conn.cursor() as cursor:
                cursor.execute("SELECT id, config_id FROM organizations WHERE config_id IS NOT NULL")
                for row in cursor.fetchall():
                    local_id = row[0]
                    config_id = row[1]
                    result = session.execute(text("SELECT id FROM organizations WHERE config_id = :config_id"), {"config_id": config_id})
                    railway_row = result.fetchone()
                    if railway_row:
                        org_id_mapping[local_id] = railway_row[0]

        # Get scrape_logs from local database
        with get_pooled_connection() as local_conn:
            with local_conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, organization_id, started_at, completed_at, dogs_found, dogs_added,
                           dogs_updated, status, error_message, created_at, detailed_metrics,
                           duration_seconds, data_quality_score
                    FROM scrape_logs
                    ORDER BY id
                    """
                )
                logs = cursor.fetchall()

        if not logs:
            logger.info("No scrape_logs to sync")
            return True

        # Process in batches
        total_synced = 0
        insert_sql = text(
            """
            INSERT INTO scrape_logs 
            (id, organization_id, started_at, completed_at, dogs_found, dogs_added,
             dogs_updated, status, error_message, created_at, detailed_metrics,
             duration_seconds, data_quality_score)
            VALUES 
            (:id, :organization_id, :started_at, :completed_at, :dogs_found, :dogs_added,
             :dogs_updated, :status, :error_message, :created_at, :detailed_metrics,
             :duration_seconds, :data_quality_score)
            """
        )

        for i in range(0, len(logs), batch_size):
            batch = logs[i : i + batch_size]

            batch_params = []
            for log in batch:
                local_org_id = log[1]
                railway_org_id = org_id_mapping.get(local_org_id)

                if railway_org_id is None:
                    logger.warning(f"Skipping scrape_log - no Railway organization found for local org ID {local_org_id}")
                    continue

                batch_params.append(
                    {
                        "id": log[0],
                        "organization_id": railway_org_id,
                        "started_at": log[2],
                        "completed_at": log[3],
                        "dogs_found": log[4],
                        "dogs_added": log[5],
                        "dogs_updated": log[6],
                        "status": log[7],
                        "error_message": log[8],
                        "created_at": log[9],
                        "detailed_metrics": json.dumps(log[10]) if log[10] is not None else None,
                        "duration_seconds": log[11],
                        "data_quality_score": log[12],
                    }
                )

            if batch_params:
                session.execute(insert_sql, batch_params)
                total_synced += len(batch_params)

            logger.info(f"Prepared batch: {total_synced}/{len(logs)} scrape_logs for Railway sync")

        logger.info(f"Successfully prepared {total_synced} scrape_logs for Railway sync")
        return True

    except Exception as e:
        logger.error(f"Failed to sync scrape_logs to Railway in transaction: {e}")
        return False


def _sync_service_regions_to_railway_in_transaction(session, batch_size: int = 100) -> bool:
    """Sync service_regions to Railway within an existing transaction."""
    try:
        # Create organization ID mapping
        org_id_mapping = {}
        with get_pooled_connection() as local_conn:
            with local_conn.cursor() as cursor:
                cursor.execute("SELECT id, config_id FROM organizations WHERE config_id IS NOT NULL")
                for row in cursor.fetchall():
                    local_id = row[0]
                    config_id = row[1]
                    result = session.execute(text("SELECT id FROM organizations WHERE config_id = :config_id"), {"config_id": config_id})
                    railway_row = result.fetchone()
                    if railway_row:
                        org_id_mapping[local_id] = railway_row[0]

        # Get service_regions from local database
        with get_pooled_connection() as local_conn:
            with local_conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, organization_id, country, active, notes, created_at, updated_at, region
                    FROM service_regions
                    ORDER BY id
                    """
                )
                regions = cursor.fetchall()

        if not regions:
            logger.info("No service_regions to sync")
            return True

        # Process in batches
        total_synced = 0
        insert_sql = text(
            """
            INSERT INTO service_regions 
            (id, organization_id, country, active, notes, created_at, updated_at, region)
            VALUES 
            (:id, :organization_id, :country, :active, :notes, :created_at, :updated_at, :region)
            ON CONFLICT (organization_id, country) DO UPDATE SET
                active = EXCLUDED.active,
                notes = EXCLUDED.notes,
                updated_at = EXCLUDED.updated_at
            """
        )

        for i in range(0, len(regions), batch_size):
            batch = regions[i : i + batch_size]

            batch_params = []
            for region in batch:
                local_org_id = region[1]
                railway_org_id = org_id_mapping.get(local_org_id)

                if railway_org_id is None:
                    logger.warning(f"Skipping service_region - no Railway organization found for local org ID {local_org_id}")
                    continue

                batch_params.append(
                    {
                        "id": region[0],
                        "organization_id": railway_org_id,
                        "country": region[2],
                        "active": region[3],
                        "notes": region[4],
                        "created_at": region[5],
                        "updated_at": region[6],
                        "region": region[7],
                    }
                )

            if batch_params:
                session.execute(insert_sql, batch_params)
                total_synced += len(batch_params)

            logger.info(f"Prepared batch: {total_synced}/{len(regions)} service_regions for Railway sync")

        logger.info(f"Successfully prepared {total_synced} service_regions for Railway sync")
        return True

    except Exception as e:
        logger.error(f"Failed to sync service_regions to Railway in transaction: {e}")
        return False


def _validate_sync_integrity_in_transaction(session) -> bool:
    """Validate sync integrity within an existing transaction."""
    try:
        tables_to_check = ["organizations", "animals", "scrape_logs", "service_regions"]

        for table in tables_to_check:
            local_count = get_local_data_count(table)

            # Get Railway count using the existing session
            # Validate table name against whitelist to prevent SQL injection
            valid_tables = ["organizations", "animals", "scrape_logs", "service_regions"]

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


def validate_sync_by_mode(mode: SyncMode, table: str, local_count: int, railway_count: int) -> bool:
    """Validate sync counts based on the specified mode."""
    # Validate table name first
    valid_tables = ["organizations", "animals", "scrape_logs", "service_regions"]
    if table not in valid_tables:
        logger.error(f"validate_sync_by_mode: Invalid table name: {table}")
        return False

    if mode == SyncMode.INCREMENTAL:
        # Incremental mode: local count should be >= railway count
        return local_count >= railway_count
    elif mode == SyncMode.REBUILD:
        # Rebuild mode: check if local count meets safety threshold
        threshold = SAFETY_THRESHOLDS.get(table, 0)
        return local_count >= threshold
    elif mode == SyncMode.FORCE:
        # Force mode: skip all validation
        return True
    else:
        logger.error(f"validate_sync_by_mode: Unknown sync mode: {mode}")
        return False


def validate_sync_integrity() -> bool:
    """Validate that sync was successful by comparing record counts."""
    try:
        tables_to_check = ["organizations", "animals", "scrape_logs", "service_regions"]

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

    def perform_full_sync(self, dry_run: bool = False, validate_after: bool = True, max_retries: int = 3, sync_mode: str = "incremental") -> bool:
        """Perform complete data synchronization to Railway with retry logic and transaction boundaries."""
        try:
            # Check Railway connection first
            if not check_railway_connection():
                self.logger.error("Railway database connection failed")
                return False

            if dry_run:
                return self._perform_dry_run()

            # Convert string to SyncMode enum for validation
            try:
                mode_enum = SyncMode(sync_mode)
            except ValueError:
                self.logger.error(f"Invalid sync mode: {sync_mode}")
                return False

            # Perform sync mode validation (skip for force mode)
            if mode_enum != SyncMode.FORCE:
                if not self._validate_sync_mode(mode_enum):
                    self.logger.error(f"Sync mode validation failed for mode: {sync_mode}")
                    return False

            # Clear Railway tables if in rebuild mode
            if mode_enum == SyncMode.REBUILD:
                if not self._clear_railway_tables():
                    self.logger.error("Failed to clear Railway tables for rebuild mode")
                    return False

            # Perform actual sync with retry mechanism
            self.logger.info(f"Starting full data synchronization to Railway with sync mode: {sync_mode}")

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
            # Skip validation in force mode
            if validate_after and mode_enum != SyncMode.FORCE and not validate_sync_integrity():
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

    def _validate_sync_mode(self, mode: SyncMode) -> bool:
        """Validate sync operation based on the specified mode."""
        try:
            tables = ["organizations", "animals", "scrape_logs", "service_regions"]

            for table in tables:
                local_count = get_local_data_count(table)
                railway_count = get_railway_data_count(table)

                if not validate_sync_by_mode(mode, table, local_count, railway_count):
                    self.logger.error(f"Sync validation failed for table {table}: local={local_count}, railway={railway_count}, mode={mode.value}")
                    return False

            self.logger.info(f"Sync mode validation passed for all tables: {mode.value}")
            return True

        except Exception as e:
            self.logger.error(f"Sync mode validation error: {e}")
            return False

    def _clear_railway_tables(self) -> bool:
        """Clear all Railway tables for rebuild mode."""
        try:
            tables = ["animals", "scrape_logs", "service_regions", "organizations"]  # Order matters for FK constraints

            with railway_session() as session:
                for table in tables:
                    self.logger.info(f"Clearing Railway table: {table}")
                    result = session.execute(text(f"DELETE FROM {table}"))
                    self.logger.info(f"Cleared {result.rowcount} rows from {table}")

                session.commit()
                self.logger.info("Successfully cleared all Railway tables")
                return True

        except Exception as e:
            self.logger.error(f"Failed to clear Railway tables: {e}")
            return False


@contextmanager
def get_db_connection():
    """Context manager for local database connections (for compatibility with existing code)."""
    with get_pooled_connection() as conn:
        yield conn
