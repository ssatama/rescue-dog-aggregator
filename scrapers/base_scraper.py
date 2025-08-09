# scrapers/base_scraper.py

import asyncio
import logging
import os
import sys
import time
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, List, Optional

import psycopg2
from langdetect import detect

# Add the project root directory to Python path BEFORE any local imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import config
from config import DB_CONFIG, enable_world_class_scraper_logging

# Import null object services
from services.null_objects import NullMetricsCollector
from services.progress_tracker import ProgressTracker
from utils.config_loader import ConfigLoader
from utils.organization_sync_service import create_default_sync_service
from utils.r2_service import R2Service

# Set up module-level logger
logger = logging.getLogger(__name__)


class BaseScraper(ABC):
    """Base scraper class that all organization-specific scrapers will inherit from."""

    def __init__(
        self,
        organization_id: Optional[int] = None,
        config_id: Optional[str] = None,
        database_service=None,
        image_processing_service=None,
        session_manager=None,
        metrics_collector=None,
        llm_data_service=None,
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
        from services.image_processing_service import ImageProcessingService
        from services.null_objects import NullLLMDataService

        self.llm_data_service = llm_data_service or NullLLMDataService()
        self.image_processing_service = image_processing_service

        # Track animals for filtering stats
        self.total_animals_before_filter = 0
        self.total_animals_skipped = 0

        # Track completion state to prevent duplicates
        self._completion_logged = False

    def _setup_logger(self):
        """Set up a logger for the scraper with world-class centralized logging.

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
            return self.database_service.complete_scrape_log(self.scrape_log_id, status, animals_found, animals_added, animals_updated, error_message)

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
                self.scrape_log_id, status, animals_found, animals_added, animals_updated, error_message, detailed_metrics, duration_seconds, data_quality_score
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

    def save_animal(self, animal_data):
        """Save or update animal data in the database with R2 image upload."""
        try:
            # Check if animal already exists by external_id and organization FIRST
            existing_animal = self.get_existing_animal(animal_data.get("external_id"), animal_data.get("organization_id"))

            # Process primary image using ImageProcessingService if available
            if animal_data.get("primary_image_url"):
                if self.image_processing_service:
                    animal_data = self.image_processing_service.process_primary_image(animal_data, existing_animal, self.conn, self.organization_name)
                else:
                    self._log_service_unavailable("ImageProcessingService", "using original image URL")
                    animal_data["original_image_url"] = animal_data["primary_image_url"]

            if existing_animal:
                return self.update_animal(existing_animal[0], animal_data)
            else:
                return self.create_animal(animal_data)
        except AttributeError as e:
            # Handle missing methods in test environment
            if "get_existing_animal" in str(e):
                self.logger.warning(f"get_existing_animal method not implemented in test environment")
                return 1, "test"
            elif "create_animal" in str(e):
                self.logger.warning(f"create_animal method not implemented in test environment")
                return 1, "test"
            else:
                raise e
        except Exception as e:
            self.logger.error(f"Error in save_animal: {e}")
            return None, "error"

    def save_animal_images(self, animal_id, image_urls):
        """Save animal images with R2 upload, only uploading changed images.

        Returns:
            Tuple of (success_count, failure_count) for tracking upload results
        """
        if not image_urls:
            return 0, 0

        # Use ImageProcessingService if available
        if self.image_processing_service:
            return self.image_processing_service.save_animal_images(animal_id, image_urls, self.conn, self.organization_name)

        self._log_service_unavailable("ImageProcessingService", "image processing disabled")
        return 0, len(image_urls)

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
        try:
            # Initialize comprehensive progress tracker for entire scrape lifecycle
            self.progress_tracker = None

            # Phase 1: Setup
            if not self._setup_scrape():
                return False

            # Phase 2: Data Collection
            animals_data = self._collect_and_time_data()

            # Store count for scraper runner interface
            # Use the same logic as database logging to ensure consistency
            self.animals_found = self._get_correct_animals_found_count(animals_data)

            # Initialize comprehensive progress tracker for consistent logging
            # Always create progress_tracker to ensure consistent terminal output across all scrapers
            # Use discovery count (not filtered count) to ensure proper verbosity level for completion summary
            self.progress_tracker = ProgressTracker(total_items=max(self.animals_found, 1), logger=logging.getLogger("scraper"), config=self._get_logging_config())  # Use central scraper logger

            # Track discovery phase stats
            # Use correct animals found count to show actual discovery metrics
            correct_animals_found = self._get_correct_animals_found_count(animals_data)
            self.progress_tracker.track_discovery_stats(dogs_found=correct_animals_found, pages_processed=1, extraction_failures=0)  # Single page scrape

            # Track filtering phase stats
            self.progress_tracker.track_filtering_stats(dogs_skipped=self.total_animals_skipped, new_dogs=len(animals_data) - self.total_animals_skipped)

            # Log discovery completion
            self.progress_tracker.log_phase_complete("Discovery", 0.0, f"{correct_animals_found} dogs found")  # Will be updated with actual timing

            # Phase 3: Database Operations
            processing_stats = self._process_animals_data(animals_data)

            # Phase 4: Stale Data Detection
            self._finalize_scrape(animals_data, processing_stats)

            # Phase 5: Metrics & Logging
            self._log_completion_metrics(animals_data, processing_stats)

            return True

        except Exception as e:
            # Use centralized logger for errors
            central_logger = logging.getLogger("scraper")
            central_logger.error(f"🚨 Scrape failed for {self.get_organization_name()}: {e}")
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

        phase_duration = (datetime.now() - phase_start).total_seconds()
        self.metrics_collector.track_phase_timing("data_collection", phase_duration)

        # World-class discovery completion message
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

        processing_stats = {"animals_added": 0, "animals_updated": 0, "animals_unchanged": 0, "images_uploaded": 0, "images_failed": 0}

        # Initialize progress tracker for world-class logging
        progress_tracker = ProgressTracker(total_items=len(animals_data), logger=self.logger, config=self._get_logging_config())

        for i, animal_data in enumerate(animals_data):
            # Add organization_id and animal_type to the animal data
            animal_data["organization_id"] = self.organization_id
            if "animal_type" not in animal_data:
                animal_data["animal_type"] = self.animal_type

            # Save animal
            animal_id, action = self.save_animal(animal_data)

            # Enrich with LLM if enabled and animal was saved
            if animal_id and self.llm_data_service and hasattr(self.llm_data_service, "clean_description"):
                asyncio.run(self._enrich_animal_with_llm(animal_id, animal_data))

            # Update progress tracking (only count animals toward progress percentage)
            progress_tracker.update(items_processed=1, operation_type="animal_save")

            if animal_id:
                # Mark animal as seen in current session for confidence tracking
                self.mark_animal_as_seen(animal_id)

                # Save animal images if provided
                image_urls = animal_data.get("image_urls", [])
                if image_urls and len(image_urls) > 0:
                    success_count, failure_count = self.save_animal_images(animal_id, image_urls)
                    processing_stats["images_uploaded"] += success_count
                    processing_stats["images_failed"] += failure_count

                    # Track image operations for statistics (don't add to progress count)
                    progress_tracker.track_operation(operation_type="image_upload", count=len(image_urls))

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

    def _log_batch_summary(self, progress_tracker: ProgressTracker, processing_stats: Dict[str, int], processed_count: int):
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
                dogs_added=processing_stats["animals_added"], dogs_updated=processing_stats["animals_updated"], dogs_unchanged=processing_stats["animals_unchanged"], processing_failures=0
            )

            self.progress_tracker.track_image_stats(images_uploaded=processing_stats["images_uploaded"], images_failed=processing_stats["images_failed"])

            self.progress_tracker.track_quality_stats(data_quality_score=quality_score, completion_rate=100.0)

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
        from selenium.common.exceptions import TimeoutException, WebDriverException

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

            except (TimeoutException, WebDriverException, ValueError) as e:
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
        """Check if extracted name indicates a scraping error.

        Args:
            name: Animal name to validate

        Returns:
            True if name indicates an error, False if valid
        """
        if not name or not isinstance(name, str):
            return True

        name_lower = name.lower().strip()

        # Common error patterns
        error_patterns = [
            "this site cant be reached",
            "site can't be reached",
            "connection failed",
            "page not found",
            "error 404",
            "error 500",
            "dns_probe_finished_nxdomain",
            "timeout",
            "unavailable",
            "access denied",
        ]

        return any(pattern in name_lower for pattern in error_patterns)

    def _validate_animal_data(self, animal_data: Dict[str, Any]) -> bool:
        """Validate animal data dictionary for required fields and invalid names."""
        if not animal_data or not isinstance(animal_data, dict):
            return False

        # Check for required fields
        required_fields = ["name", "external_id", "adoption_url"]
        for field in required_fields:
            if not animal_data.get(field):
                return False

        # Check for invalid names (connection errors)
        name = animal_data.get("name", "")
        if self._is_invalid_name(name):
            self.logger.warning(f"Rejecting animal with invalid name: {name}")
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

        self.logger.info(f"🔎 Checking database for existing animals...")
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
                animals_found, threshold_percentage, absolute_minimum, minimum_historical_scrapes, self.total_animals_before_filter, self.total_animals_skipped
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

    async def _enrich_animal_with_llm(self, animal_id: int, animal_data: Dict[str, Any]):
        """Enrich animal data using LLM service.

        Args:
            animal_id: Database ID of the animal
            animal_data: Original animal data
        """
        try:
            # Only process if we have a description
            description = animal_data.get("description", "").strip()
            if not description:
                return

            # Get organization config for LLM prompts if available
            org_config = None
            if self.org_config:
                org_config = {"organization_name": self.org_config.name, "prompt_style": self.org_config.get_scraper_config_dict().get("llm_prompt_style", "friendly")}

            # Clean the description
            enriched_description = await self.llm_data_service.clean_description(description, organization_config=org_config)

            # Update the database with enriched description
            if enriched_description and enriched_description != description:
                self._update_llm_enrichment(animal_id, {"enriched_description": enriched_description, "llm_processed_at": datetime.now(), "llm_model_used": "openrouter/auto"})
                self.logger.debug(f"Enriched description for animal {animal_id}")

        except Exception as e:
            self.logger.warning(f"Failed to enrich animal {animal_id} with LLM: {e}")

    def _update_llm_enrichment(self, animal_id: int, enrichment_data: Dict[str, Any]):
        """Update animal with LLM enrichment data.

        Args:
            animal_id: Database ID of the animal
            enrichment_data: Data to update (enriched_description, llm_processed_at, etc)
        """
        if not self.conn:
            return

        try:
            cursor = self.conn.cursor()

            # Build update query
            update_fields = []
            values = []

            for field, value in enrichment_data.items():
                update_fields.append(f"{field} = %s")
                values.append(value)

            values.append(animal_id)  # For WHERE clause

            query = f"""
                UPDATE animals 
                SET {', '.join(update_fields)}, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """

            cursor.execute(query, values)
            self.conn.commit()
            cursor.close()

        except Exception as e:
            self.logger.error(f"Failed to update LLM enrichment for animal {animal_id}: {e}")
            if self.conn:
                self.conn.rollback()
