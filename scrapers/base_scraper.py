# scrapers/base_scraper.py

import html
import logging
import os
import re
import sys
import time
import unicodedata
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, List, Optional

import psycopg2
from langdetect import detect

# Import config
from config import DB_CONFIG, enable_world_class_scraper_logging

# Import Sentry integration for error tracking
from scrapers.sentry_integration import (
    add_scrape_breadcrumb,
    alert_llm_enrichment_failure,
    alert_zero_dogs_found,
    capture_scraper_error,
    scrape_transaction,
)

# Import services and utilities
from services.null_objects import NullMetricsCollector
from services.progress_tracker import ProgressTracker
from utils.config_loader import ConfigLoader
from utils.config_models import OrganizationConfig
from utils.organization_sync_service import create_default_sync_service
from utils.r2_service import R2Service
from utils.unified_standardization import UnifiedStandardizer

# Add the project root directory to Python path BEFORE any local imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up module-level logger
logger = logging.getLogger(__name__)


class BaseScraper(ABC):
    """Base scraper class that all organization-specific scrapers will inherit from."""

    # Batch processing configuration constants
    SMALL_BATCH_THRESHOLD = 3
    CONCURRENT_UPLOAD_THRESHOLD = 10
    MAX_R2_FAILURE_RATE = 50

    # Type annotations for instance variables
    org_config: Optional[OrganizationConfig]

    def __init__(
        self,
        organization_id: Optional[int] = None,
        config_id: Optional[str] = None,
        database_service=None,
        image_processing_service=None,
        session_manager=None,
        metrics_collector=None,
    ):
        """Initialize the scraper with organization ID or config and optional service injection."""
        # Handle both legacy and config-based initialization
        if config_id:
            # New config-based mode
            self.config_loader = ConfigLoader()
            self.org_config = self.config_loader.load_config(config_id)

            # Skip organization sync during most tests, but allow specific tests to validate sync behavior
            if sys.modules.get("pytest") is not None and not os.environ.get("TESTING_VALIDATE_SYNC"):
                # Test environment - use mock values (most tests)
                self.organization_id = 1  # Default test organization ID
                logger.info(f"Test mode: Skipping organization sync for {config_id}")
            else:
                # Production environment - ensure organization exists in database
                sync_manager = create_default_sync_service()
                try:
                    sync_result = sync_manager.sync_single_organization(self.org_config)
                    if not sync_result or not sync_result.success:
                        raise ValueError(f"Organization sync failed for {self.org_config.id}. Halting scraper.")
                    self.organization_id = sync_result.organization_id
                except Exception as e:
                    logger.error(f"Failed to sync organization {self.org_config.id}: {e}")
                    raise ValueError(f"Could not initialize scraper due to organization sync failure for {self.org_config.id}") from e

            # Use config for scraper settings
            scraper_config = self.org_config.get_scraper_config_dict()
            self.rate_limit_delay = scraper_config.get("rate_limit_delay", 1.0)
            self.max_retries = scraper_config.get("max_retries", 3)
            self.timeout = scraper_config.get("timeout", 30)

            # New retry and batch processing settings
            self.retry_backoff_factor = scraper_config.get("retry_backoff_factor", 2.0)
            self.batch_size = scraper_config.get("batch_size", 6)
            self.skip_existing_animals = scraper_config.get("skip_existing_animals", False)

            # Set organization name from config
            self.organization_name = self.org_config.name

        elif organization_id:
            # Legacy mode - direct database ID
            self.organization_id = organization_id
            self.org_config = None

            # Default scraper settings
            self.rate_limit_delay = 1.0
            self.max_retries = 3
            self.timeout = 30

            # New retry and batch processing settings (defaults)
            self.retry_backoff_factor = 2.0
            self.batch_size = 6
            self.skip_existing_animals = False

            # For legacy mode, use a default organization name
            self.organization_name = f"Organization ID {organization_id}"

        else:
            raise ValueError("Either organization_id or config_id must be provided")

        self.animal_type = "dog"  # Default animal type, can be overridden
        self.logger = self._setup_logger()
        self.conn = None
        self.scrape_log_id = None
        self.animals_found = 0  # Track count for scraper runner interface
        self.current_scrape_session = None
        self.scrape_start_time = None
        self.r2_service = R2Service()

        # Initialize services (dependency injection)
        self.database_service = database_service
        self.session_manager = session_manager
        self.metrics_collector = metrics_collector or NullMetricsCollector()

        # Import here to avoid circular dependency

        self.image_processing_service = image_processing_service

        # Track animals for filtering stats
        self.total_animals_before_filter = 0
        self.total_animals_skipped = 0

        # Track animals for LLM enrichment
        self.animals_for_llm_enrichment = []

        # Track completion state to prevent duplicates
        self._completion_logged = False

        # Initialize UnifiedStandardizer for breed standardization
        self.standardizer = UnifiedStandardizer()
        self.use_unified_standardization = True  # Feature flag for gradual rollout

    def _setup_logger(self):
        """Set up a logger for the scraper.

        Individual scrapers now use silent loggers while BaseScraper provides
        all progress updates through the ProgressTracker system.
        """
        # Enable world-class logging configuration
        enable_world_class_scraper_logging()

        # Create a silent logger for this individual scraper
        # All progress will be handled by ProgressTracker
        logger = logging.getLogger(f"scraper.{self.get_organization_name()}.{self.animal_type}")
        logger.setLevel(logging.WARNING)  # Only show warnings and errors

        # Check if handler already exists to prevent duplication
        if not logger.handlers:
            # Create handlers only if none exist
            c_handler = logging.StreamHandler()

            # Create formatters
            formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
            c_handler.setFormatter(formatter)

            # Add handlers to logger
            logger.addHandler(c_handler)

        return logger

    def _log_service_unavailable(self, service_name: str, operation: str):
        """Log service unavailable warning with consistent format."""
        self.logger.warning(f"No {service_name} available - {operation}")

    def connect_to_database(self):
        """Connect to the PostgreSQL database."""
        try:
            # Build connection parameters, handling empty password
            conn_params = {
                "host": DB_CONFIG["host"],
                "user": DB_CONFIG["user"],
                "database": DB_CONFIG["database"],
                "port": DB_CONFIG.get("port", 5432),
            }

            # Only add password if it's not empty
            if DB_CONFIG["password"]:
                conn_params["password"] = DB_CONFIG["password"]

            self.conn = psycopg2.connect(**conn_params)
            self.logger.info(f"Connected to database: {DB_CONFIG['database']}")
            return True
        except Exception as e:
            self.logger.error(f"Database connection error: {e}")
            return False

    def __enter__(self):
        """Context manager entry - establish database connection."""
        if not self.connect_to_database():
            raise ConnectionError("Failed to connect to database")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - ensure database connection is closed."""
        if self.conn:
            self.conn.close()
            self.logger.info("Database connection closed")

        # Clean up injected services if they exist
        if hasattr(self, "_injected_services"):
            for service in self._injected_services:
                if hasattr(service, "close"):
                    service.close()
            self.logger.info("Injected services closed")

        # Don't suppress exceptions
        return False

    def start_scrape_log(self):
        """Create a new entry in the scrape_logs table."""
        # Use injected DatabaseService if available
        if self.database_service:
            self.scrape_log_id = self.database_service.create_scrape_log(self.organization_id)
            return self.scrape_log_id is not None

        self._log_service_unavailable("DatabaseService", "scrape logging disabled")
        return True  # Continue scraping without logging

    def complete_scrape_log(
        self,
        status,
        animals_found=0,
        animals_added=0,
        animals_updated=0,
        error_message=None,
    ):
        """Update the scrape log with completion information."""
        # Prevent duplicate completions
        if self._completion_logged:
            self.logger.debug(f"Scrape completion already logged, skipping duplicate call (status: {status})")
            return True

        self._completion_logged = True

        # Use injected DatabaseService if available
        if self.database_service:
            return self.database_service.complete_scrape_log(
                self.scrape_log_id,
                status,
                animals_found,
                animals_added,
                animals_updated,
                error_message,
            )

        self.logger.info(f"Scrape completed with status: {status}, animals: {animals_found}")
        return True

    def complete_scrape_log_with_metrics(
        self,
        status,
        animals_found=0,
        animals_added=0,
        animals_updated=0,
        error_message=None,
        detailed_metrics=None,
        duration_seconds=None,
        data_quality_score=None,
    ):
        """Update the scrape log with completion information and detailed metrics."""
        # Prevent duplicate completions
        if self._completion_logged:
            self.logger.debug(f"Scrape completion already logged, skipping duplicate call (status: {status})")
            return True

        self._completion_logged = True

        # Use injected DatabaseService if available
        if self.database_service:
            return self.database_service.complete_scrape_log(
                self.scrape_log_id,
                status,
                animals_found,
                animals_added,
                animals_updated,
                error_message,
                detailed_metrics,
                duration_seconds,
                data_quality_score,
            )

        self.logger.info(f"Scrape completed with status: {status}, animals: {animals_found}")
        return True

    def detect_language(self, text):
        """Detect the language of the text.

        Args:
            text: Text to detect language for

        Returns:
            ISO 639-1 language code (e.g., 'en' for English, 'de' for German)
        """
        try:
            if not text or len(text.strip()) < 10:
                return "en"  # Default to English for very short or empty text

            return detect(text)
        except Exception as e:
            self.logger.warning(f"Language detection error: {e}. Defaulting to English.")
            return "en"

    def validate_external_id(self, external_id):
        """Validate that external_id follows organization prefix pattern.

        Args:
            external_id: The external_id to validate

        Raises:
            ValueError: If external_id doesn't follow the required pattern
        """
        if not external_id:
            return  # Some scrapers may not have external_id yet

        # Known organization prefixes (collision-safe patterns)
        known_prefixes = [
            "arb-",  # Animal Rescue Bosnia
            "spbr-",  # Santer Paws Bulgarian Rescue
            "gds-",  # Galgos del Sol
            "mar-",  # MISIs Animal Rescue
            "tud-",  # The Underdog
            "wp-",  # Woof Project
            "fri-",  # Furry Rescue Italy
            "pit-",  # Pets in Turkey
            "rean-",  # REAN
            "hund-",  # Daisy Family Rescue
            "dt-",  # Dogs Trust
            "mtr-",  # Many Tears Rescue (uses numeric but may change)
            "tve-",  # Tierschutzverein Europa
        ]

        # Check if external_id starts with any known prefix or is numeric
        has_prefix = any(external_id.startswith(prefix) for prefix in known_prefixes)
        is_numeric = external_id.isdigit()

        # Special case: Tierschutzverein Europa uses slug format like "yara-in-rumaenien-tierheim"
        # This is their established pattern and is acceptable
        is_tierschutzverein_pattern = (
            self.org_config and self.org_config.id == "tierschutzverein-europa" and "-" in external_id and len(external_id) > 10  # Their IDs are typically longer descriptive slugs
        )

        if not has_prefix and not is_numeric and not is_tierschutzverein_pattern:
            self.logger.warning(
                f"External ID '{external_id}' does not follow organization prefix pattern. "
                f"This may cause collisions with other organizations. "
                f"Consider using a prefix like 'org-' to ensure uniqueness."
            )

    def process_animal(self, animal_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process animal data through standardization if enabled.

        Args:
            animal_data: Raw animal data dictionary

        Returns:
            Processed animal data with standardized breed fields if enabled
        """
        if not self.use_unified_standardization:
            # Feature flag disabled - return data unchanged
            return animal_data

        # Make a copy to avoid modifying the original
        processed_data = animal_data.copy()

        try:
            # Apply field normalization first (trimming, boolean conversion, defaults)
            processed_data = self.standardizer.apply_field_normalization(processed_data)

            # Log standardization for breed if present
            original_breed = animal_data.get("breed")
            if original_breed:
                self.logger.info(f"Standardizing breed: {original_breed}")

            # Apply full standardization (handles breed, age, size)
            standardized = self.standardizer.apply_full_standardization(
                breed=processed_data.get("breed"),
                age=processed_data.get("age"),
                size=processed_data.get("size"),
            )

            # Update processed_data with standardized fields (now returned flattened)
            processed_data.update(standardized)

            # Log the result if breed changed
            new_breed = processed_data.get("breed")
            if original_breed and new_breed != original_breed:
                confidence = processed_data.get("standardization_confidence", 0)
                self.logger.info(f"Breed standardized: '{original_breed}' -> '{new_breed}' " f"(confidence: {confidence:.2f})")

        except Exception as e:
            # If standardization fails, log the error and return the original data
            self.logger.warning(f"Standardization failed: {e}, using raw data")
            # Return the original data so scraping can continue
            return animal_data

        return processed_data

    def save_animal(self, animal_data):
        """Save or update animal data in the database with R2 image upload."""
        try:
            # Process animal data through standardization if enabled
            animal_data = self.process_animal(animal_data)

            # Validate external_id pattern to prevent collisions
            if animal_data.get("external_id"):
                self.validate_external_id(animal_data["external_id"])

            # Check if animal already exists by external_id and organization FIRST
            existing_animal = self.get_existing_animal(animal_data.get("external_id"), animal_data.get("organization_id"))

            # Process primary image using ImageProcessingService if available
            # Skip if already processed (has original_image_url set from batch processing)
            if animal_data.get("primary_image_url") and not animal_data.get("original_image_url"):
                if self.image_processing_service:
                    animal_data = self.image_processing_service.process_primary_image(animal_data, existing_animal, self.conn, self.organization_name)
                else:
                    self._log_service_unavailable("ImageProcessingService", "using original image URL")
                    animal_data["original_image_url"] = animal_data["primary_image_url"]

            if existing_animal:
                animal_id, action = self.update_animal(existing_animal[0], animal_data)
                # Don't enrich updates - only new animals get LLM profiling
                # This avoids unnecessary API calls for unchanged data
                return animal_id, action
            else:
                animal_id, action = self.create_animal(animal_data)
                # New animals always get profiled
                if animal_id:
                    self.animals_for_llm_enrichment.append({"id": animal_id, "data": animal_data, "action": "create"})
                return animal_id, action
        except AttributeError as e:
            # Handle missing methods in test environment
            if "get_existing_animal" in str(e):
                self.logger.warning("get_existing_animal method not implemented in test environment")
                return 1, "test"
            elif "create_animal" in str(e):
                self.logger.warning("create_animal method not implemented in test environment")
                return 1, "test"
            else:
                raise e
        except Exception as e:
            self.logger.error(f"Error in save_animal: {e}")
            return None, "error"

    def run(self):
        """Run the scraper to collect and save animal data."""
        try:
            # Use context manager to ensure proper database connection handling
            with self:
                return self._run_with_connection()
        except ConnectionError as e:
            self.logger.error(f"Database connection failed: {e}")
            return False
        except Exception as e:
            self.logger.error(f"Unexpected error during scrape setup: {e}")
            return False

    def _run_with_connection(self):
        """Template method orchestrating the scrape lifecycle with world-class logging."""
        # Wrap entire scrape in Sentry transaction for performance monitoring
        with scrape_transaction(self.get_organization_name(), self.organization_id) as transaction:
            try:
                # Initialize comprehensive progress tracker for entire scrape lifecycle
                self.progress_tracker = None

                # Phase 1: Setup
                add_scrape_breadcrumb(
                    "Starting setup phase",
                    data={"org_name": self.get_organization_name()},
                )
                if not self._setup_scrape():
                    return False

                # Phase 2: Data Collection
                add_scrape_breadcrumb("Starting data collection phase")
                animals_data = self._collect_and_time_data()

                # Store count for scraper runner interface
                # Use the same logic as database logging to ensure consistency
                self.animals_found = self._get_correct_animals_found_count(animals_data)

                # Alert if zero dogs found - likely indicates website change
                if self.animals_found == 0:
                    alert_zero_dogs_found(
                        org_name=self.get_organization_name(),
                        org_id=self.organization_id,
                        scrape_log_id=getattr(self, "scrape_log_id", None),
                    )

                # Set transaction data for Sentry performance view
                transaction.set_data("dogs_found", self.animals_found)

                # Initialize comprehensive progress tracker for consistent logging
                # Always create progress_tracker to ensure consistent terminal output across all scrapers
                # Use discovery count (not filtered count) to ensure proper verbosity level for completion summary
                self.progress_tracker = ProgressTracker(
                    total_items=max(self.animals_found, 1),
                    logger=logging.getLogger("scraper"),
                    config=self._get_logging_config(),
                )  # Use central scraper logger

                # Track discovery phase stats
                # Use correct animals found count to show actual discovery metrics
                correct_animals_found = self._get_correct_animals_found_count(animals_data)
                self.progress_tracker.track_discovery_stats(
                    dogs_found=correct_animals_found,
                    pages_processed=1,
                    extraction_failures=0,
                )  # Single page scrape

                # Track filtering phase stats
                # Note: animals_data already contains only NEW dogs (after filtering in collect_data)
                self.progress_tracker.track_filtering_stats(
                    dogs_skipped=self.total_animals_skipped,
                    new_dogs=len(animals_data),
                )

                # Log discovery completion
                self.progress_tracker.log_phase_complete("Discovery", 0.0, f"{correct_animals_found} dogs found")  # Will be updated with actual timing

                # Phase 3: Database Operations
                add_scrape_breadcrumb(
                    "Starting database operations phase",
                    data={"animals_count": len(animals_data)},
                )
                processing_stats = self._process_animals_data(animals_data)

                # Phase 4: Stale Data Detection
                add_scrape_breadcrumb("Starting stale data detection phase")
                self._finalize_scrape(animals_data, processing_stats)

                # Phase 5: LLM Enrichment (if enabled)
                add_scrape_breadcrumb("Starting LLM enrichment phase")
                self._post_process_llm_enrichment()

                # Phase 6: Metrics & Logging
                self._log_completion_metrics(animals_data, processing_stats)

                # Set final transaction data
                transaction.set_data("dogs_added", processing_stats.get("animals_added", 0))
                transaction.set_data("dogs_updated", processing_stats.get("animals_updated", 0))

                return True

            except Exception as e:
                # Use centralized logger for errors
                central_logger = logging.getLogger("scraper")
                central_logger.error(f"🚨 Scrape failed for {self.get_organization_name()}: {e}")

                # Capture exception to Sentry with context
                capture_scraper_error(
                    error=e,
                    org_name=self.get_organization_name(),
                    org_id=self.organization_id,
                    scrape_log_id=getattr(self, "scrape_log_id", None),
                    phase="run_with_connection",
                )

                self.handle_scraper_failure(str(e))
                return False

    def _setup_scrape(self):
        """Setup phase: Initialize scrape log, session, and timing with world-class logging."""
        # Use centralized logger for setup phase
        central_logger = logging.getLogger("scraper")
        central_logger.info(f"🚀 Starting scrape for {self.get_organization_name()}")

        # Start scrape log - must succeed for proper tracking
        if not self.start_scrape_log():
            central_logger.error("❌ Failed to create scrape log entry")
            return False

        # Start scrape session for stale data tracking
        if not self.start_scrape_session():
            central_logger.error("❌ Failed to start scrape session")
            # Still continue with scraping, but log the issue
            self.complete_scrape_log(
                status="warning",
                error_message="Failed to start scrape session, continuing without session tracking",
                animals_found=0,
                animals_added=0,
                animals_updated=0,
            )

        # Track scrape start time for metrics
        self.scrape_start_time = datetime.now()
        return True

    def _collect_and_time_data(self):
        """Data collection phase: Collect animal data with timing and world-class logging."""
        phase_start = datetime.now()
        central_logger = logging.getLogger("scraper")
        central_logger.info(f"🔍 Discovering {self.animal_type}s on {self.get_organization_name()} website...")

        animals_data = self.collect_data()

        # Record all found external_ids for accurate stale detection
        # NOTE: Scrapers using _filter_existing_animals() already record external_ids
        # during filtering. This call is kept for backward compatibility with scrapers
        # that don't use the new method (duplicate calls are harmless - uses a set).
        self._record_all_found_external_ids(animals_data)

        phase_duration = (datetime.now() - phase_start).total_seconds()
        self.metrics_collector.track_phase_timing("data_collection", phase_duration)

        # discovery completion message
        # Use the same logic as _get_correct_animals_found_count to avoid misleading warnings
        # when skip_existing_animals causes filtering
        actual_animals_found = self._get_correct_animals_found_count(animals_data)
        if actual_animals_found > 0:
            central_logger.info(f"✅ Discovery complete: {actual_animals_found} {self.animal_type}s found ({phase_duration:.1f}s)")
        else:
            central_logger.warning(f"⚠️  No {self.animal_type}s found - check website status")

        return animals_data

    def _get_logging_config(self) -> Dict[str, Any]:
        """Get logging configuration from scraper config or defaults.

        Returns:
            Dictionary with logging configuration settings
        """
        if self.org_config:
            logging_config = self.org_config.get_scraper_config_dict().get("logging", {})
        else:
            logging_config = {}

        # Set defaults - Force detailed verbosity for consistent completion banners
        return {
            "batch_size": logging_config.get("batch_size", 10),
            "show_progress_bar": logging_config.get("show_progress_bar", True),
            "show_throughput": logging_config.get("show_throughput", True),
            "eta_enabled": logging_config.get("eta_enabled", True),
            "verbosity_level": logging_config.get("verbosity_level", "comprehensive"),  # Force comprehensive for consistent terminal output
        }

    def _process_animals_data(self, animals_data):
        """Database operations phase: Process and save animal data with progress tracking."""
        phase_start = datetime.now()

        processing_stats = {
            "animals_added": 0,
            "animals_updated": 0,
            "animals_unchanged": 0,
            "images_uploaded": 0,
            "images_failed": 0,
        }

        # Initialize progress tracker for world-class logging
        progress_tracker = ProgressTracker(
            total_items=len(animals_data),
            logger=self.logger,
            config=self._get_logging_config(),
        )

        # ALWAYS use batch image processing for ALL scrapers when ImageProcessingService is available
        # This ensures consistent batch uploading behavior across all organizations
        if self.image_processing_service and len(animals_data) > 0:
            # Check R2 health before batch processing
            health = self.r2_service.get_health_status()
            if health.get("failure_rate", 0) < self.MAX_R2_FAILURE_RATE:  # Only batch process if failure rate is reasonable
                self.logger.info(f"🚀 Using batch image processing for {len(animals_data)} animals")
                try:
                    # Always use batch processing for better performance and consistency
                    # Use smaller batch size for small datasets, adaptive for larger ones
                    batch_size = min(self.SMALL_BATCH_THRESHOLD, len(animals_data)) if len(animals_data) <= self.SMALL_BATCH_THRESHOLD else self.r2_service.get_adaptive_batch_size()
                    animals_data = self.image_processing_service.batch_process_images(
                        animals_data,
                        self.organization_name,
                        batch_size=batch_size,
                        use_concurrent=len(animals_data) > self.CONCURRENT_UPLOAD_THRESHOLD,
                        database_connection=self.conn,
                    )
                    # Count images uploaded
                    for animal in animals_data:
                        if animal.get("original_image_url") and animal.get("primary_image_url"):
                            if "images.rescuedogs.me" in animal["primary_image_url"]:
                                processing_stats["images_uploaded"] += 1
                except Exception as e:
                    self.logger.warning(f"Batch image processing failed, falling back to individual: {e}")

        for i, animal_data in enumerate(animals_data):
            # Add organization_id and animal_type to the animal data
            animal_data["organization_id"] = self.organization_id
            if "animal_type" not in animal_data:
                animal_data["animal_type"] = self.animal_type

            # CRITICAL: Validate animal data before saving to prevent invalid data in database
            if not self._validate_animal_data(animal_data):
                self.logger.warning(f"Skipping invalid animal: {animal_data.get('name', 'Unknown')} - validation failed")
                continue

            # Save animal
            animal_id, action = self.save_animal(animal_data)

            # Update progress tracking (only count animals toward progress percentage)
            progress_tracker.update(items_processed=1, operation_type="animal_save")

            if animal_id:
                # Mark animal as seen in current session for confidence tracking
                self.mark_animal_as_seen(animal_id)

                # Update counts
                if action == "added":
                    processing_stats["animals_added"] += 1
                elif action == "updated":
                    processing_stats["animals_updated"] += 1
                elif action == "no_change":
                    processing_stats["animals_unchanged"] += 1

            # Log progress if needed (world-class progress tracking)
            if progress_tracker.should_log_progress():
                progress_message = progress_tracker.get_progress_message()
                self.logger.info(progress_message)

                # Log batch summary with processing stats
                self._log_batch_summary(progress_tracker, processing_stats, i + 1)

                # Mark progress as logged
                progress_tracker.log_batch_progress()

        # Log final completion
        if len(animals_data) > 0:
            final_message = progress_tracker.get_progress_message()
            self.logger.info(f"🎯 Processing complete: {final_message}")

        phase_duration = (datetime.now() - phase_start).total_seconds()
        self.metrics_collector.track_phase_timing("database_operations", phase_duration)

        return processing_stats

    def _log_batch_summary(
        self,
        progress_tracker: ProgressTracker,
        processing_stats: Dict[str, int],
        processed_count: int,
    ):
        """Log batch summary with processing statistics.

        Args:
            progress_tracker: Progress tracker instance
            processing_stats: Current processing statistics
            processed_count: Number of animals processed so far
        """
        # Generate batch summary based on verbosity level
        if progress_tracker.verbosity_level.value in ["detailed", "comprehensive"]:
            summary = (
                f"✅ Batch summary ({processed_count} processed): "
                f"Added: {processing_stats['animals_added']}, "
                f"Updated: {processing_stats['animals_updated']}, "
                f"Images: {processing_stats['images_uploaded']} uploaded"
            )

            if processing_stats["images_failed"] > 0:
                summary += f", {processing_stats['images_failed']} failed"

            self.logger.info(summary)

    def _finalize_scrape(self, animals_data, processing_stats):
        """Stale data detection phase: Handle partial failures and update stale data."""
        phase_start = datetime.now()

        # Check for potential partial failure before updating stale data
        potential_failure = self.detect_partial_failure(self._get_correct_animals_found_count(animals_data))
        processing_stats["potential_failure_detected"] = potential_failure

        if potential_failure:
            self.logger.warning("Potential partial failure detected - skipping stale data update")
            # Complete scrape log with warning status
            self.complete_scrape_log(
                status="warning",
                animals_found=self._get_correct_animals_found_count(animals_data),
                animals_added=processing_stats["animals_added"],
                animals_updated=processing_stats["animals_updated"],
                error_message="Potential partial failure - low animal count detected",
            )
        else:
            # Fix for skip_existing_animals bug: Mark skipped animals as seen
            # before running stale data detection to prevent them from being
            # incorrectly marked as unavailable
            if self.skip_existing_animals:
                self.mark_skipped_animals_as_seen()

            # Update stale data detection for animals not seen in this scrape
            self.update_stale_data_detection()

            # Phase 2.3: Check for adoptions after stale data detection
            self._check_adoptions_if_enabled()

            # Note: Scrape log completion with detailed metrics happens in _log_completion_metrics phase

        phase_duration = (datetime.now() - phase_start).total_seconds()
        self.metrics_collector.track_phase_timing("stale_data_detection", phase_duration)

    def _log_completion_metrics(self, animals_data, processing_stats):
        """Metrics & logging phase: Calculate and log comprehensive metrics with world-class summary."""
        # Calculate metrics for detailed logging
        scrape_end_time = datetime.now()
        duration = self.metrics_collector.calculate_scrape_duration(self.scrape_start_time, scrape_end_time)
        quality_score = self.metrics_collector.assess_data_quality(animals_data)

        # Log detailed metrics
        correct_animals_found = self._get_correct_animals_found_count(animals_data)
        detailed_metrics = self.metrics_collector.generate_comprehensive_metrics(
            animals_found=correct_animals_found,
            animals_added=processing_stats["animals_added"],
            animals_updated=processing_stats["animals_updated"],
            animals_unchanged=processing_stats["animals_unchanged"],
            images_uploaded=processing_stats["images_uploaded"],
            images_failed=processing_stats["images_failed"],
            duration_seconds=duration,
            quality_score=quality_score,
            potential_failure_detected=processing_stats["potential_failure_detected"],
            skip_existing_animals=self.skip_existing_animals,
            batch_size=self.batch_size,
            rate_limit_delay=self.rate_limit_delay,
        )
        self.metrics_collector.log_detailed_metrics(detailed_metrics)

        # Update database with detailed metrics (only for successful scrapes)
        if not processing_stats.get("potential_failure_detected", False):
            self.complete_scrape_log_with_metrics(
                status="success",
                animals_found=correct_animals_found,
                animals_added=processing_stats["animals_added"],
                animals_updated=processing_stats["animals_updated"],
                error_message=None,
                detailed_metrics=detailed_metrics,
                duration_seconds=duration,
                data_quality_score=quality_score,
            )

        # World-class completion summary via ProgressTracker
        if hasattr(self, "progress_tracker") and self.progress_tracker:
            # Update final stats
            self.progress_tracker.track_processing_stats(
                dogs_added=processing_stats["animals_added"],
                dogs_updated=processing_stats["animals_updated"],
                dogs_unchanged=processing_stats["animals_unchanged"],
                processing_failures=0,
            )

            self.progress_tracker.track_image_stats(
                images_uploaded=processing_stats["images_uploaded"],
                images_failed=processing_stats["images_failed"],
            )

            self.progress_tracker.track_quality_stats(data_quality_score=quality_score, completion_rate=100.0)

            self.progress_tracker.track_performance_stats(total_duration=duration)

            # Log comprehensive completion summary
            self.progress_tracker.log_completion_summary()
        else:
            # Fallback to basic logging if no ProgressTracker
            central_logger = logging.getLogger("scraper")
            central_logger.info(
                f"✅ Scrape completed: {processing_stats['animals_added']} added, " f"{processing_stats['animals_updated']} updated, Quality: {quality_score:.2f}, " f"Duration: {duration:.1f}s"
            )

    @abstractmethod
    def collect_data(self):
        """Collect animal data from the source.

        This method should be implemented by each organization-specific scraper.

        Returns:
            List of dictionaries, each containing data for one animal
        """
        pass

    def _scrape_with_retry(self, scrape_method, *args, **kwargs):
        """Execute scraping method with retry logic for connection errors.

        Args:
            scrape_method: Method to call for scraping
            *args, **kwargs: Arguments to pass to scrape_method

        Returns:
            Result from scrape_method or None if all retries exhausted
        """
        # Import browser-specific exceptions based on USE_PLAYWRIGHT flag
        use_playwright = os.environ.get("USE_PLAYWRIGHT", "false").lower() == "true"

        if use_playwright:
            # For Playwright, we catch generic exceptions since async errors
            # are already handled in the Playwright methods themselves
            browser_exceptions = (Exception,)
        else:
            from selenium.common.exceptions import TimeoutException, WebDriverException

            browser_exceptions = (TimeoutException, WebDriverException, ValueError)

        for attempt in range(self.max_retries):
            try:
                result = scrape_method(*args, **kwargs)

                # Validate result doesn't contain error data
                if result and isinstance(result, dict):
                    name = result.get("name", "")
                    if self._is_invalid_name(name):
                        self.logger.warning(f"Invalid name detected: {name}, treating as failure")
                        raise ValueError(f"Invalid animal name: {name}")

                # Track successful retry if this wasn't the first attempt
                if attempt > 0:
                    self.metrics_collector.track_retry(success=True)

                return result

            except browser_exceptions as e:
                self.metrics_collector.track_retry(success=False)
                self.logger.warning(f"Scraping attempt {attempt + 1}/{self.max_retries} failed: {e}")

                if attempt < self.max_retries - 1:  # Not the last attempt
                    # Exponential backoff
                    delay = self.rate_limit_delay * (self.retry_backoff_factor**attempt)
                    self.logger.info(f"Retrying in {delay}s...")
                    time.sleep(delay)
                else:
                    self.logger.error(f"All {self.max_retries} attempts failed for {args}")

        return None

    def _is_invalid_name(self, name: str) -> bool:
        """Check if extracted name indicates a scraping error or invalid data.

        Args:
            name: Animal name to validate

        Returns:
            True if name indicates an error or is invalid, False if valid
        """
        if not name or not isinstance(name, str):
            return True

        # Reject pure numeric names (likely extraction errors)
        # Allow names with numbers (e.g., "Max 2") but reject pure digits
        if name.strip().isdigit():
            return True

        # Reject names with excessive digits (>60% of characters are digits)
        # This catches cases like "251abc" or "123dog456"
        digit_count = sum(c.isdigit() for c in name)
        alpha_count = sum(c.isalpha() for c in name)
        if digit_count > 0 and alpha_count > 0:
            digit_ratio = digit_count / len(name)
            if digit_ratio > 0.6:
                return True

        # Reject names that are too short (< 2 chars) after normalization
        # This catches single-char names or whitespace-only
        if len(name.strip()) < 2:
            return True

        # Normalize the name for checking - remove apostrophes and special chars
        name_normalized = name.lower().strip()
        # Replace various apostrophe types with empty string
        name_normalized = name_normalized.replace("'", "").replace("'", "").replace("`", "")

        # Common error patterns (normalized without apostrophes)
        error_patterns = [
            "this site cant be reached",
            "site cant be reached",
            "site can t be reached",  # Handle spaces around t
            "connection failed",
            "page not found",
            "error 404",
            "error 500",
            "dns_probe_finished",
            "err_name_not_resolved",
            "err_connection",
            "timeout",
            "unavailable",
            "access denied",
        ]

        if any(pattern in name_normalized for pattern in error_patterns):
            return True

        # Gift card and promotional patterns (not dog names)
        gift_card_patterns = [
            "gift card",
            "giftcard",
            "gift certificate",
            "voucher",
            "coupon",
            "promo code",
            "discount",
        ]

        if any(pattern in name_normalized for pattern in gift_card_patterns):
            return True

        # URL patterns (extraction error - got URL instead of name)
        if "http://" in name_normalized or "https://" in name_normalized or "www." in name_normalized:
            return True

        # Price patterns (e.g., "$50", "€100", "£25", "50€")
        price_pattern = re.compile(r"[$€£¥₹]\s*\d+|\d+\s*[$€£¥₹]")
        if price_pattern.search(name):
            return True

        # Product SKU patterns (e.g., "ABC-123-XYZ", "DOG123ABC")
        sku_pattern = re.compile(r"^[A-Z]{2,4}-?\d{3,}-?[A-Z]{2,4}$", re.IGNORECASE)
        if sku_pattern.match(name.strip()):
            return True

        # Promo codes with known marketing keywords (SAVE20, FREE100, GET50OFF, etc.)
        # Using specific keywords to avoid false positives on dog names like MAX3, REX2
        promo_keywords = r"^(SAVE|GET|CODE|FREE|SALE|DEAL|BUY|WIN|DISCOUNT|OFF)\d+"
        promo_pattern = re.compile(promo_keywords, re.IGNORECASE)
        if promo_pattern.match(name.strip()):
            return True

        return False

    def _normalize_animal_name(self, name: str) -> str:
        """Normalize animal name by fixing encoding issues and HTML entities.

        Args:
            name: Raw animal name

        Returns:
            Normalized name with fixed encoding and decoded HTML entities
        """
        if not name or not isinstance(name, str):
            return name

        # Step 1: Decode HTML entities (&amp; → &, &quot; → ")
        name = html.unescape(name)

        # Step 2: Fix UTF-8 double-encoding (Ã« → ë)
        # Common issue: UTF-8 bytes interpreted as Latin-1 then re-encoded
        try:
            # Check if name contains mojibake patterns
            if "Ã" in name:
                # Try to fix by encoding as Latin-1 and decoding as UTF-8
                name = name.encode("latin1").decode("utf-8")
        except (UnicodeDecodeError, UnicodeEncodeError):
            # If fix fails, keep original (better than crashing)
            pass

        # Step 3: Normalize Unicode (é → é, combining chars)
        name = unicodedata.normalize("NFC", name)

        # Step 4: Strip whitespace
        name = name.strip()

        return name

    def _validate_animal_data(self, animal_data: Dict[str, Any]) -> bool:
        """Validate animal data dictionary for required fields and invalid names."""
        if not animal_data or not isinstance(animal_data, dict):
            return False

        # Check for required fields
        required_fields = ["name", "external_id", "adoption_url"]
        for field in required_fields:
            if not animal_data.get(field):
                return False

        # Normalize name before validation
        name = animal_data.get("name", "")
        normalized_name = self._normalize_animal_name(name)

        # Check for invalid names (connection errors, numeric-only, etc.)
        if self._is_invalid_name(normalized_name):
            self.logger.warning(f"Rejecting animal with invalid name: {name}")
            return False

        # Update animal_data with normalized name
        animal_data["name"] = normalized_name

        # Check for invalid image URLs (empty strings are not valid URLs)
        primary_image_url = animal_data.get("primary_image_url")
        if primary_image_url == "":
            self.logger.error(f"Rejecting animal '{normalized_name}' (ID: {animal_data.get('external_id')}) with empty image URL")
            return False

        # Check for missing image URLs (None is not valid)
        if primary_image_url is None:
            self.logger.warning(f"Skipping animal '{normalized_name}' (ID: {animal_data.get('external_id')}) - no valid image URL found")
            return False

        return True

    def _get_existing_animal_urls(self) -> set:
        """Get set of existing animal URLs for this organization."""
        if self.database_service:
            return self.database_service.get_existing_animal_urls(self.organization_id)

        self._log_service_unavailable("DatabaseService", "cannot check existing animals")
        return set()

    def _filter_existing_urls(self, all_urls: List[str]) -> List[str]:
        """Filter out existing URLs if skip_existing_animals is enabled."""
        if not self.skip_existing_animals:
            self.logger.debug(f"skip_existing_animals is False, returning all {len(all_urls)} URLs")
            return all_urls

        self.logger.info("🔎 Checking database for existing animals...")
        existing_urls = self._get_existing_animal_urls()

        if not existing_urls:
            self.logger.info(f"📊 No existing animals found in database, processing all {len(all_urls)} URLs")
            return all_urls

        # Filter out existing URLs
        filtered_urls = [url for url in all_urls if url not in existing_urls]

        skipped_count = len(all_urls) - len(filtered_urls)
        self.logger.info(f"🚫 Found {len(existing_urls)} existing animals in database")
        self.logger.info(f"✅ Filtered results: Skipped {skipped_count} existing, will process {len(filtered_urls)} new animals")

        # Debug logging for URL matching issues
        if skipped_count == 0 and len(existing_urls) > 0:
            self.logger.warning("⚠️ No URLs were filtered despite having existing animals - possible URL mismatch!")

        return filtered_urls

    def _filter_existing_animals(self, animals: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Filter existing animals and record ALL found external_ids for stale detection.

        CRITICAL: Records all external_ids BEFORE filtering so mark_skipped_animals_as_seen()
        knows which dogs were actually found on the website.

        This method should be used by scrapers that implement _get_filtered_animals()
        to ensure external_ids are recorded before filtering discards existing animals.

        Args:
            animals: List of animal data dicts, each containing 'external_id' and 'adoption_url'

        Returns:
            Filtered list of animals (only new ones if skip_existing_animals is True)
        """
        if not animals:
            return []

        # Record ALL external_ids BEFORE filtering for accurate stale detection
        recorded_count = 0
        for animal in animals:
            external_id = animal.get("external_id")
            if external_id and self.session_manager:
                self.session_manager.record_found_animal(external_id)
                recorded_count += 1

        if recorded_count > 0:
            self.logger.info(f"📝 Recorded {recorded_count} external IDs for stale detection")

        # If skip_existing_animals is disabled, return all animals
        if not self.skip_existing_animals:
            self.logger.info(f"Processing all {len(animals)} animals")
            return animals

        # Filter based on adoption_url
        all_urls = [animal.get("adoption_url", "") for animal in animals]
        filtered_urls = self._filter_existing_urls(all_urls)

        # Set filtering stats
        skipped_count = len(all_urls) - len(filtered_urls)
        self.set_filtering_stats(len(all_urls), skipped_count)

        # Return only animals whose URLs passed the filter
        url_to_animal = {animal.get("adoption_url", ""): animal for animal in animals}
        filtered_animals = [url_to_animal[url] for url in filtered_urls if url in url_to_animal]

        self.logger.info(f"🔍 Filtering: {skipped_count} existing (skipped), {len(filtered_animals)} new " f"({skipped_count / len(all_urls) * 100:.1f}% skip rate)")

        return filtered_animals

    def set_filtering_stats(self, total_before_filter: int, total_skipped: int):
        """Set statistics about skip_existing_animals filtering."""
        self.total_animals_before_filter = total_before_filter
        self.total_animals_skipped = total_skipped
        self.logger.info(f"📊 Filtering stats: {total_before_filter} found, {total_skipped} skipped, {total_before_filter - total_skipped} to process")

    def _get_correct_animals_found_count(self, animals_data: list) -> int:
        """Get correct animals_found count for logging.

        Returns total_animals_before_filter if filtering was applied and stats were set,
        otherwise returns the length of animals_data.

        This ensures dogs_found shows total animals found on website (e.g., 35),
        not the filtered count (e.g., 0) when skip_existing_animals=true.
        """
        if self.skip_existing_animals and hasattr(self, "total_animals_before_filter") and self.total_animals_before_filter > 0:
            return self.total_animals_before_filter
        return len(animals_data)

    def get_organization_name(self) -> str:
        """Get organization name for logging."""
        if self.org_config:
            return self.org_config.get_display_name()
        else:
            # Fallback for legacy mode
            return f"Organization ID {self.organization_id}"

    def get_rate_limit_delay(self) -> float:
        """Get rate limit delay from config or default."""
        return float(self.rate_limit_delay)

    # Add method to respect rate limiting
    def respect_rate_limit(self):
        """Sleep for the configured rate limit delay."""
        if self.rate_limit_delay > 0:
            time.sleep(self.rate_limit_delay)

    def get_existing_animal(self, external_id, organization_id):
        """Check if an animal already exists in the database."""
        # Use injected DatabaseService if available
        if self.database_service:
            return self.database_service.get_existing_animal(external_id, organization_id)

        self._log_service_unavailable("DatabaseService", "cannot check existing animals")
        return None

    def create_animal(self, animal_data):
        """Create a new animal in the database."""
        # Use injected DatabaseService if available
        if self.database_service:
            return self.database_service.create_animal(animal_data)

        self._log_service_unavailable("DatabaseService", "cannot create animals")
        return None, "error"

    def update_animal(self, animal_id, animal_data):
        """Update an existing animal in the database."""
        # Use injected DatabaseService if available
        if self.database_service:
            return self.database_service.update_animal(animal_id, animal_data)

        self._log_service_unavailable("DatabaseService", "cannot update animals")
        return None, "error"

    def start_scrape_session(self):
        """Start a new scrape session for tracking stale data."""
        # Use injected SessionManager if available
        if self.session_manager:
            result = self.session_manager.start_scrape_session()
            if result:
                self.current_scrape_session = self.session_manager.get_current_session()
            return result

        self.current_scrape_session = datetime.now()
        self._log_service_unavailable("SessionManager", "using basic session tracking")
        return True

    def mark_animal_as_seen(self, animal_id):
        """Mark an animal as seen in the current scrape session."""
        if self.session_manager:
            return self.session_manager.mark_animal_as_seen(animal_id)

        self._log_service_unavailable("SessionManager", "mark animal as seen disabled")
        return False

    def update_stale_data_detection(self):
        """Update stale data detection for animals not seen in current scrape."""
        # Use injected SessionManager if available
        if self.session_manager:
            return self.session_manager.update_stale_data_detection()

        self._log_service_unavailable("SessionManager", "stale data detection disabled")
        return False

    def mark_animals_unavailable(self, threshold=4):
        """Mark animals as unavailable after consecutive missed scrapes."""
        if self.session_manager:
            return self.session_manager.mark_animals_unavailable(threshold)

        self._log_service_unavailable("SessionManager", "mark animals unavailable disabled")
        return 0

    def restore_available_animal(self, animal_id):
        """Restore an animal to available status when it reappears."""
        if self.session_manager:
            return self.session_manager.restore_available_animal(animal_id)

        self._log_service_unavailable("SessionManager", "restore animal disabled")
        return False

    def mark_skipped_animals_as_seen(self):
        """Mark animals that were skipped due to skip_existing_animals as seen."""
        # Use injected SessionManager if available
        if self.session_manager:
            return self.session_manager.mark_skipped_animals_as_seen()

        self._log_service_unavailable("SessionManager", "skipped animals marking disabled")
        return 0

    def _record_all_found_external_ids(self, animals_data):
        """Record all external_ids from discovered animals for accurate stale detection.

        This must be called BEFORE any skip_existing_animals filtering happens.
        It records which animals were actually found on the website so that
        mark_skipped_animals_as_seen() only marks those specific animals as seen,
        not ALL available animals in the database.

        Args:
            animals_data: List of animal data dictionaries from collect_data()
        """
        if not self.session_manager:
            return

        recorded_count = 0
        for animal_data in animals_data:
            external_id = animal_data.get("external_id")
            if external_id:
                self.session_manager.record_found_animal(external_id)
                recorded_count += 1

        if recorded_count > 0:
            self.logger.debug(f"Recorded {recorded_count} external IDs as found for stale detection")

    def get_stale_animals_summary(self):
        """Get summary of animals by availability confidence and status."""
        if self.session_manager:
            return self.session_manager.get_stale_animals_summary()

        self._log_service_unavailable("SessionManager", "stale animals summary disabled")
        return {}

    def detect_catastrophic_failure(self, animals_found, absolute_minimum=3):
        """Detect catastrophic scraper failures (zero or extremely low animal counts).

        This method detects complete scraper failures or situations where the count
        is so low that it's almost certainly a system error rather than reality.

        IMPORTANT: Considers skip_existing_animals filtering to avoid false positives.

        Args:
            animals_found: Number of animals found in current scrape (after filtering)
            absolute_minimum: Absolute minimum count below which failure is assumed

        Returns:
            True if catastrophic failure detected, False otherwise
        """
        # Simple catastrophic failure check - basic threshold only
        return animals_found == 0 or animals_found < absolute_minimum

    def detect_partial_failure(
        self,
        animals_found,
        threshold_percentage=0.5,
        absolute_minimum=3,
        minimum_historical_scrapes=3,
    ):
        """Enhanced partial failure detection with absolute minimums and better error handling.

        Args:
            animals_found: Number of animals found in current scrape
            threshold_percentage: Minimum percentage of historical average to consider normal
            absolute_minimum: Absolute minimum count below which failure is assumed
            minimum_historical_scrapes: Minimum historical scrapes needed for reliable comparison

        Returns:
            True if potential partial failure detected, False otherwise
        """
        # Use injected SessionManager if available
        if self.session_manager:
            return self.session_manager.detect_partial_failure(
                animals_found,
                threshold_percentage,
                absolute_minimum,
                minimum_historical_scrapes,
                self.total_animals_before_filter,
                self.total_animals_skipped,
            )

        self._log_service_unavailable("SessionManager", "partial failure detection disabled")
        return animals_found < absolute_minimum  # Basic check only

    def detect_scraper_failure(self, animals_found, threshold_percentage=0.5, absolute_minimum=3):
        """Combined failure detection method that checks both catastrophic and partial failures.

        Args:
            animals_found: Number of animals found in current scrape
            threshold_percentage: Minimum percentage of historical average to consider normal
            absolute_minimum: Absolute minimum count below which failure is assumed

        Returns:
            True if any type of failure detected, False otherwise
        """
        return self.detect_partial_failure(animals_found, threshold_percentage, absolute_minimum)

    def handle_scraper_failure(self, error_message):
        """Handle scraper failure without affecting animal availability.

        Args:
            error_message: Error message describing the failure

        Returns:
            True if handled successfully, False otherwise
        """
        try:
            self.logger.error(f"Scraper failure detected: {error_message}")

            # Log the failure but do NOT update stale data detection
            # This prevents marking animals as stale due to scraper issues

            # Complete scrape log with failure status
            if self.scrape_log_id:
                self.complete_scrape_log(
                    status="error",
                    error_message=error_message,
                    animals_found=0,
                    animals_added=0,
                    animals_updated=0,
                )

            # Reset scrape session to prevent stale data updates
            self.current_scrape_session = None

            return True
        except Exception as e:
            self.logger.error(f"Error handling scraper failure: {e}")
            # Capture the handler error to Sentry as well
            capture_scraper_error(
                error=e,
                org_name=self.get_organization_name(),
                org_id=self.organization_id,
                scrape_log_id=getattr(self, "scrape_log_id", None),
                phase="handle_failure",
            )
            return False

    def log_detailed_metrics(self, metrics: Dict[str, Any]):
        """Log detailed metrics to the scrape log.

        Args:
            metrics: Dictionary containing detailed metrics

        Returns:
            True if successful, False otherwise
        """
        self.metrics_collector.log_detailed_metrics(metrics)
        return True

    def _is_significant_update(self, existing_animal):
        """Determine if an update is significant enough to warrant re-profiling.

        Args:
            existing_animal: Tuple from database with existing animal data

        Returns:
            bool: True if update is significant
        """
        # Since get_existing_animal only returns (id, name, updated_at),
        # we can't compare old values directly. For now, we'll consider
        # all updates as potentially significant to ensure LLM profiles
        # stay current. The LLM pipeline itself can handle deduplication.

        # In the future, we could enhance get_existing_animal to return
        # more fields for proper change detection.

        # For now, always return True to ensure updates get profiled
        # This is safer than missing important updates due to incomplete data
        return True

    def _post_process_llm_enrichment(self):
        """Post-process animals with LLM enrichment if enabled.

        This method runs after all animals are saved and handles batch LLM profiling
        for organizations that have it enabled.
        """
        # Check if LLM profiling is enabled in config
        if not hasattr(self, "org_config") or not self.org_config:
            return

        scraper_config = self.org_config.get_scraper_config_dict()
        if not scraper_config.get("enable_llm_profiling", False):
            return

        # Check if we have animals to enrich
        if not self.animals_for_llm_enrichment:
            self.logger.info("No animals need LLM enrichment")
            return

        # Get LLM organization ID (might be different from scraper org ID)
        llm_org_id = scraper_config.get("llm_organization_id", self.organization_id)

        try:
            import asyncio

            from services.llm.dog_profiler import DogProfilerPipeline
            from services.llm.organization_config_loader import get_config_loader

            # Check if organization has LLM config
            loader = get_config_loader()
            org_config = loader.load_config(llm_org_id)

            if not org_config:
                self.logger.warning(f"No LLM configuration found for organization {llm_org_id}")
                return

            # Check if prompt template exists
            from pathlib import Path

            template_path = Path("prompts/organizations") / org_config.prompt_file
            if not template_path.exists():
                self.logger.warning(f"Prompt template not found for organization {llm_org_id}: {org_config.prompt_file}")
                return

            self.logger.info(f"Starting LLM enrichment for {len(self.animals_for_llm_enrichment)} animals")

            # Prepare data for pipeline
            dogs_to_profile = []
            for item in self.animals_for_llm_enrichment:
                animal_data = item["data"]
                dog_data = {
                    "id": item["id"],
                    "name": animal_data.get("name", "Unknown"),
                    "breed": animal_data.get("breed", "Mixed Breed"),
                    "age_text": animal_data.get("age_text", "Unknown"),
                    "properties": animal_data.get("properties", {}),
                }

                # Add description if available
                description = animal_data.get("description", "")
                if not description and "properties" in animal_data:
                    description = animal_data["properties"].get("description", "")
                if description:
                    dog_data["properties"]["description"] = description

                dogs_to_profile.append(dog_data)

            # Initialize pipeline
            pipeline = DogProfilerPipeline(organization_id=llm_org_id, dry_run=False)

            # Process batch
            self.logger.info(f"Processing {len(dogs_to_profile)} dogs with LLM profiler...")
            results = asyncio.run(pipeline.process_batch(dogs_to_profile, batch_size=5))

            if results:
                # Save results
                success = asyncio.run(pipeline.save_results(results))
                if success:
                    self.logger.info(f"Successfully enriched {len(results)} animals with LLM profiles")
                else:
                    self.logger.warning("Failed to save some LLM enrichment results")

            # Get statistics
            stats = pipeline.get_statistics()
            if stats:
                self.logger.info(
                    f"LLM enrichment stats - Success rate: {stats.get('success_rate', 0):.1f}%, " f"Processed: {stats.get('total_processed', 0)}, " f"Failed: {stats.get('total_failed', 0)}"
                )
                failed_count = stats.get("total_failed", 0)
                if failed_count > 0:
                    alert_llm_enrichment_failure(
                        org_name=self.organization_name,
                        batch_size=stats.get("total_processed", 0) + failed_count,
                        failed_count=failed_count,
                        error_message=f"Partial LLM enrichment failure - {stats.get('success_rate', 0):.1f}% success rate",
                        org_id=self.organization_id,
                    )

        except ImportError as e:
            self.logger.warning(f"LLM profiler modules not available: {e}")
        except Exception as e:
            self.logger.error(f"Error during LLM enrichment post-processing: {e}")
            alert_llm_enrichment_failure(
                org_name=self.organization_name,
                batch_size=len(self.animals_for_llm_enrichment),
                failed_count=len(self.animals_for_llm_enrichment),
                error_message=str(e),
                org_id=self.organization_id,
            )

    def _check_adoptions_if_enabled(self):
        """Check for dog adoptions if enabled in organization config.

        This integrates with the AdoptionDetectionService to check dogs
        that have been missing for multiple scrapes.
        """
        # Check if adoption checking is enabled in config
        if not hasattr(self, "org_config") or not self.org_config:
            return

        # Get adoption checking configuration
        adoption_config = self.org_config.get_adoption_check_config()
        if not adoption_config or not adoption_config.get("enabled", False):
            return

        try:
            # Import here to avoid circular dependency
            from services.adoption_detection import AdoptionDetectionService

            # Get threshold and limits from config
            threshold = adoption_config.get("threshold", 3)
            max_checks = adoption_config.get("max_checks_per_run", 50)
            check_interval_hours = adoption_config.get("check_interval_hours", 24)

            self.logger.info(f"🔍 Checking for adoptions (threshold: {threshold} missed scrapes)")

            # Initialize service
            service = AdoptionDetectionService()

            # Check adoptions for this organization
            results = service.batch_check_adoptions(
                self.conn,
                self.organization_id,
                threshold=threshold,
                limit=max_checks,
                dry_run=False,
            )

            if results:
                # Log results
                adopted_count = sum(1 for r in results if r.detected_status == "adopted")
                reserved_count = sum(1 for r in results if r.detected_status == "reserved")

                self.logger.info(f"✅ Adoption check complete: {len(results)} dogs checked, " f"{adopted_count} adopted, {reserved_count} reserved")

                # Track metrics
                self.metrics_collector.track_custom_metric("adoptions_checked", len(results))
                self.metrics_collector.track_custom_metric("adoptions_detected", adopted_count)
                self.metrics_collector.track_custom_metric("reservations_detected", reserved_count)
            else:
                self.logger.info("No dogs eligible for adoption checking")

        except ImportError as e:
            self.logger.warning(f"AdoptionDetectionService not available: {e}")
        except Exception as e:
            self.logger.error(f"Error during adoption checking: {e}")
            # Don't fail the scrape if adoption checking fails
            pass
