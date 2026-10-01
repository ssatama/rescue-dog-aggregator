# scrapers/base_scraper.py

import asyncio
import logging
import os
import threading
from abc import ABC, abstractmethod
from collections.abc import Awaitable, Callable
from datetime import datetime
from typing import Any

# Import config
# Import services and utilities
from scrapers.browser_manager import ScraperBrowserManager
from scrapers.dog_saving import DogSaving
from scrapers.enrichment.llm_handler import LLMEnrichmentHandler
from scrapers.filtering.filtering_service import FilteringService
from scrapers.request_pacing import DetailPageError, ListingIncompleteError, RequestPacing
from scrapers.run_reporting import RunReporting
from scrapers.scrape_stats import ScrapeStats

# Import Sentry integration for error tracking
from scrapers.sentry_integration import (
    add_scrape_breadcrumb,
    alert_llm_enrichment_failure,
    alert_zero_dogs_found,
    capture_scraper_error,
    scrape_transaction,
)
from scrapers.stale_detection import StaleDetection
from scrapers.validation.animal_validator import AnimalValidator
from services.null_objects import NullMetricsCollector
from services.progress_tracker import ProgressTracker
from utils.config_loader import ConfigLoader
from utils.config_models import OrganizationConfig
from utils.r2_service import R2Service
from utils.unified_standardization import UnifiedStandardizer

# Set up module-level logger
logger = logging.getLogger(__name__)

# Imported from here by scrapers and tests
__all__ = ["BaseScraper", "DetailPageError", "ListingIncompleteError", "force_rescrape_enabled"]

FORCE_RESCRAPE_VALUES = ("true", "1", "yes")


def force_rescrape_enabled() -> bool:
    """Whether this run should re-scrape animals it would normally skip.

    Set FORCE_RESCRAPE when a scraper fix has changed what the source pages
    yield and the existing rows need refreshing; orgs configured with
    skip_existing_animals would otherwise keep their stale text indefinitely.
    """
    return os.environ.get("FORCE_RESCRAPE", "").strip().lower() in FORCE_RESCRAPE_VALUES


class BaseScraper(DogSaving, StaleDetection, RunReporting, RequestPacing, ABC):
    """Base scraper class that all organization-specific scrapers will inherit from."""

    # Type annotations for instance variables
    org_config: OrganizationConfig | None

    def __init__(
        self,
        organization_id: int | None = None,
        config_id: str | None = None,
        database_service=None,
        image_processing_service=None,
        session_manager=None,
        metrics_collector=None,
        animal_validator=None,
        filtering_service=None,
        llm_handler=None,
    ):
        """Initialize the scraper with organization ID or config and optional service injection."""
        # Handle both legacy and config-based initialization
        if config_id:
            # New config-based mode
            self.config_loader = ConfigLoader()
            self.org_config = self.config_loader.load_config(config_id)

            # Construction does no I/O (#569): the loader syncs the
            # organization row and passes its id to attach()
            self.organization_id = organization_id

            # Use config for scraper settings
            scraper_config = self.org_config.get_scraper_config_dict()
            self.rate_limit_delay = scraper_config.get("rate_limit_delay", 1.0)
            self.max_retries = scraper_config.get("max_retries", 3)
            self.timeout = scraper_config.get("timeout", 30)

            # New retry and batch processing settings
            self.retry_backoff_factor = scraper_config.get("retry_backoff_factor", 2.0)
            self.batch_size = scraper_config.get("batch_size", 6)
            self.skip_existing_animals = False if force_rescrape_enabled() else scraper_config.get("skip_existing_animals", False)
            # Photos from the rescue's own site at its request rate, a share per run (#692)
            self.pace_photo_downloads = scraper_config.get("pace_photo_downloads", False)

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
        self.scrape_log_id = None
        self.animals_found = 0  # Track count for scraper runner interface
        self.scrape_start_time = None
        self.r2_service = R2Service()

        # Initialize services (dependency injection)
        self.database_service = database_service
        self.session_manager = session_manager
        self.metrics_collector = metrics_collector or NullMetricsCollector()
        metadata = self.org_config.metadata if self.org_config else None
        self.animal_validator = animal_validator or AnimalValidator(
            logger=self.logger,
            service_regions=metadata.service_regions if metadata else None,
            base_country=metadata.location.country if metadata else None,
        )
        self.filtering_service = filtering_service or FilteringService(
            database_service=database_service,
            session_manager=session_manager,
            organization_id=self.organization_id,
            skip_existing_animals=self.skip_existing_animals,
            logger=self.logger,
        )
        self.llm_handler = llm_handler or LLMEnrichmentHandler(
            organization_id=self.organization_id,
            organization_name=self.organization_name,
            org_config=getattr(self, "org_config", None),
            alert_callback=alert_llm_enrichment_failure,
            logger=self.logger,
        )

        self.image_processing_service = image_processing_service

        # One request-start clock per scraper, shared by every worker (#567)
        self._request_slot_lock = threading.Lock()
        self._next_request_at = 0.0
        self.detail_failures: list[str] = []
        self._unknown_keys_logged: set[str] = set()

        # Browser retry manager (extracted from BaseScraper)
        self.browser_manager = ScraperBrowserManager(logger=self.logger)

        # Track animals for LLM enrichment
        self.animals_for_llm_enrichment = []

        # Scraper-specific counts for this run's scrape_logs.detailed_metrics
        self.run_metrics: dict[str, int] = {}

        # Track animals changed this run, to scope frontend cache invalidation
        self._changed_animal_ids: list[int] = []

        # Track completion state to prevent duplicates
        self._completion_logged = False
        # Things worth recording that don't end the run; they go into the final log
        self._run_notes: list[str] = []
        # This run's save counts, once the database phase has started
        self._processing_stats: ScrapeStats | None = None
        # The arguments of a completion write that failed, tried once more at the end of the run
        self._unwritten_completion: tuple | None = None

        # Initialize UnifiedStandardizer for breed standardization
        self.standardizer = UnifiedStandardizer()

    def attach(
        self,
        organization_id: int,
        *,
        database_service,
        session_manager,
        image_processing_service=None,
        metrics_collector=None,
    ) -> None:
        """Bind the scraper to its organization row and the run's services.

        Construction is pure (#569), so the loader syncs the organization and
        builds the services first, then attaches them here, before run().
        """
        self.organization_id = organization_id
        self.database_service = database_service
        self.session_manager = session_manager
        self.image_processing_service = image_processing_service
        if metrics_collector is not None:
            self.metrics_collector = metrics_collector
        self.filtering_service.organization_id = organization_id
        self.filtering_service.database_service = database_service
        self.filtering_service.session_manager = session_manager
        self.llm_handler.organization_id = organization_id

    def _setup_logger(self):
        """The scraper's logger. Its level and handlers are the runner's (#569)."""
        return logging.getLogger(f"scraper.{self.get_organization_name()}.{self.animal_type}")

    def _log_service_unavailable(self, service_name: str, operation: str):
        """Log service unavailable warning with consistent format."""
        self.logger.warning(f"No {service_name} available - {operation}")

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Close the services the loader attached."""
        # Clean up injected services if they exist
        if hasattr(self, "_injected_services"):
            for service in self._injected_services:
                if hasattr(service, "close"):
                    service.close()
            self.logger.info("Injected services closed")

        # Don't suppress exceptions
        return False

    def run(self):
        """Run the scraper to collect and save animal data."""
        try:
            # The context closes the attached services
            with self:
                return self._run_with_connection()
        except Exception as e:
            self.logger.error(f"Unexpected error during scrape setup: {e}")
            return False

    def _run_with_connection(self):
        """Template method orchestrating the scrape lifecycle with world-class logging."""
        # Wrap entire scrape in Sentry transaction for performance monitoring
        with scrape_transaction(self.get_organization_name(), self.organization_id) as transaction:
            interrupted = None
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
                discovery_start = datetime.now()
                animals_data = self._collect_and_time_data()
                discovery_duration = (datetime.now() - discovery_start).total_seconds()

                # _collect_and_time_data set self.animals_found; every later phase reads it

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
                self.progress_tracker.track_discovery_stats(
                    dogs_found=self.animals_found,
                    pages_processed=1,
                    extraction_failures=len(self.detail_failures),
                )  # Single page scrape
                if self.detail_failures:
                    # A note makes the run a "warning" and puts the count in scrape_logs (#567)
                    self._run_notes.append(f"{len(self.detail_failures)} detail page(s) failed; those dogs were skipped")
                    self._alert_detail_failures()

                # Track filtering phase stats
                # Note: animals_data contents depend on scraper implementation -
                # may contain all dogs or only new dogs based on skip_existing_animals setting
                self.progress_tracker.track_filtering_stats(
                    dogs_skipped=self.total_animals_skipped,
                    new_dogs=len(animals_data),
                )

                # Log discovery completion with actual timing
                self.progress_tracker.log_phase_complete("Discovery", discovery_duration, f"{self.animals_found} dogs found")

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
                llm_start = datetime.now()
                self.llm_handler.enrich_animals(self.animals_for_llm_enrichment + self._profiling_backlog())
                self.metrics_collector.track_phase_timing("llm_enrichment", (datetime.now() - llm_start).total_seconds())

                # Phase 6: Metrics & Logging
                self._log_completion_metrics(animals_data, processing_stats)

                # Set final transaction data
                transaction.set_data("dogs_added", processing_stats.animals_added)
                transaction.set_data("dogs_updated", processing_stats.animals_updated)

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

            except BaseException as e:
                interrupted = e
                raise

            finally:
                # KeyboardInterrupt and SystemExit are not Exceptions and used to
                # leave the log "running"; so did a completion write that failed,
                # which is written once more here.
                # The cron's SIGTERM handler only sets a flag, and its timeout kill
                # is a SIGKILL that no finally survives: close_timed_out_scrape_log
                # in management/railway_scraper_cron.py closes that row instead.
                if self.scrape_log_id and not self._completion_logged:
                    try:
                        if self._unwritten_completion:
                            # The same status, message and metrics, on a fresh pool connection;
                            # the first attempt has already purged the cache
                            self._completion_logged = bool(self.database_service.complete_scrape_log(*self._unwritten_completion))
                        else:
                            reason = type(interrupted).__name__ if interrupted else "no completion"
                            self.complete_scrape_log(
                                status="error",
                                error_message=f"Run ended without completing ({reason})",
                                **self._counts_so_far(),
                            )
                    except Exception as e:
                        # Must not replace the KeyboardInterrupt or SystemExit in flight
                        self.logger.error(f"Could not close scrape log {self.scrape_log_id}: {e}")

    def _setup_scrape(self):
        """Setup phase: Initialize scrape log, session, and timing with world-class logging."""
        # Use centralized logger for setup phase
        central_logger = logging.getLogger("scraper")
        central_logger.info(f"🚀 Starting scrape for {self.get_organization_name()}")
        # A reused instance (not a production path: the cron runs each org in a
        # fresh process) must not close or re-profile the last run's things
        self.scrape_log_id = None
        self._completion_logged = False
        self._unwritten_completion = None
        self._run_notes = []
        self._processing_stats = None
        self.animals_found = 0
        self.filtering_service.reset_stats()
        self.animals_for_llm_enrichment = []
        self.run_metrics = {}
        self.detail_failures = []
        self._detail_attempted = 0
        self._unknown_keys_logged = set()

        # Ask the source site for permission before fetching anything from it.
        if not self._check_robots_permission():
            central_logger.error("❌ Scrape blocked by the site's robots.txt")
            # "skipped", not "error": this is the site exercising an opt-out,
            # not a malfunction. Recording it as an error would have the
            # monitoring endpoints report the organization as a permanently
            # unhealthy scraper.
            if self.start_scrape_log():
                self.complete_scrape_log(
                    status="skipped",
                    error_message="Scrape skipped: the organization's robots.txt disallows it",
                    animals_found=0,
                    animals_added=0,
                    animals_updated=0,
                )
            else:
                central_logger.error("❌ Could not record the robots.txt skip in the scrape log")
            return False

        # Start scrape log - must succeed for proper tracking
        if not self.start_scrape_log():
            central_logger.error("❌ Failed to create scrape log entry")
            return False

        # Start scrape session for stale data tracking
        session_started = False
        if self.session_manager:
            session_started = self.session_manager.start_scrape_session()
        else:
            self._log_service_unavailable("SessionManager", "using basic session tracking")
            session_started = True
        if not session_started:
            central_logger.error("❌ Failed to start scrape session")
            # Continue without session tracking; the note goes into the final log.
            self._run_notes.append("Failed to start scrape session, continued without session tracking")

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

        # Counted once per run (#569): dogs listed, before skip_existing_animals filtering
        self.animals_found = self._get_correct_animals_found_count(animals_data)
        if self.animals_found > 0:
            central_logger.info(f"✅ Discovery complete: {self.animals_found} {self.animal_type}s found ({phase_duration:.1f}s)")
        else:
            central_logger.warning(f"⚠️  No {self.animal_type}s found - check website status")

        return animals_data

    def _get_logging_config(self) -> dict[str, Any]:
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

    @abstractmethod
    def collect_data(self):
        """Collect animal data from the source.

        This method should be implemented by each organization-specific scraper.

        Returns:
            List of dictionaries, each containing data for one animal
        """
        pass

    # filter_existing_animals keeps these up to date (#569)
    @property
    def total_animals_before_filter(self) -> int:
        return self.filtering_service.total_animals_before_filter

    @property
    def total_animals_skipped(self) -> int:
        return self.filtering_service.total_animals_skipped

    def _get_correct_animals_found_count(self, animals_data: list) -> int:
        """Dogs the site listed: before skip_existing_animals filtering, when it ran."""
        return self.filtering_service.get_correct_animals_found_count(animals_data)

    def get_organization_name(self) -> str:
        """Get organization name for logging."""
        if self.org_config:
            return self.org_config.get_display_name()
        else:
            # Fallback for legacy mode
            return f"Organization ID {self.organization_id}"

    async def fetch_details_async(
        self,
        items: list,
        fetch_one: Callable[[Any], Awaitable[Any]],
        *,
        url: Callable[[Any], str] = lambda item: item["adoption_url"],
        attempts: int = 1,
    ) -> list:
        """``fetch_details`` for coroutine fetches, one at a time on the running loop.

        Each fetch is cut off after the org's ``timeout``. Like ``fetch_details``,
        only transient errors (a timeout among them) are retried (#571).
        """
        self._after_listing()
        results = []
        unique = self._unique_by_url(items, url)
        self._detail_attempted += len(unique)
        for item in unique:
            for attempt in range(1, max(1, attempts) + 1):
                wait = self._claim_request_slot()
                if wait > 0:
                    await asyncio.sleep(wait)
                try:
                    result = await asyncio.wait_for(fetch_one(item), self.timeout)
                except Exception as e:
                    self._back_off_after(e, attempt)
                    if attempt < attempts and self._is_transient(e):
                        self.metrics_collector.track_retry(success=False)
                        self.logger.warning(f"Detail page {url(item)} failed (attempt {attempt} of {attempts}), retrying: {e}")
                        continue
                    self._detail_failed(url(item), e)
                    break
                if attempt > 1:
                    self.metrics_collector.track_retry(success=True)
                if result is not None:
                    results.append(result)
                break
        return results
