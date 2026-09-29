"""What a run reports: its scrape_logs row, cache invalidation and search
engine pings for changed dogs, loss and partial-failure alerts, completion
metrics. A mixin of BaseScraper (#569)."""

import logging
from datetime import datetime

from scrapers.scrape_stats import ScrapeStats
from scrapers.sentry_integration import (
    alert_dogs_not_saved,
    alert_partial_failure,
    capture_scraper_error,
)
from services.progress_tracker import ProgressTracker


class RunReporting:
    """The run's log row, alerts and metrics."""

    # Sentry is warned when more than this share of collected dogs is not saved.
    LOSS_ALERT_RATE = 0.1
    # How many rejected or failed external_ids a run's log line lists.
    LOST_IDS_LOG_CAP = 20

    def start_scrape_log(self):
        """Create a new entry in the scrape_logs table."""
        # Use injected DatabaseService if available
        if self.database_service:
            self.scrape_log_id = self.database_service.create_scrape_log(self.organization_id)
            return self.scrape_log_id is not None

        # Refuse rather than degrade. Without a DatabaseService every
        # save_animal returns ("error", None), so the scrape would complete a
        # full run, persist nothing, and report success - the counts simply
        # stay at zero and nothing says the dogs never reached the database.
        # Production always injects via utils/secure_scraper_loader.py, so this
        # only fires on a misconfiguration, which is exactly when it must.
        self.logger.error("No DatabaseService available - refusing to scrape, as nothing could be persisted")
        return False

    def complete_scrape_log(
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
        """The one way a run completes: the scrape-log write, its metrics and cache invalidation.

        The first written completion wins; later calls are logged and ignored.
        A write that fails leaves the run open, and the ``finally`` in
        ``_run_with_connection`` writes the same completion once more, through
        the pool, rather than leaving it "running". Notes gathered during the run go
        into error_message and turn a success into a warning, since each one
        means part of the run didn't happen (a session that failed to start
        skips stale detection). The cache is purged after the write, so a slow
        purge can't keep the log open: on success, and on any status when a dog
        was added or updated, so a warning run's changed dogs don't keep stale
        pages.
        """
        if self._completion_logged:
            self.logger.warning(f"Scrape completion already logged, ignoring a second completion (status: {status}, error: {error_message})")
            return True

        if self._run_notes and status == "success":
            status = "warning"
        message = "; ".join(part for part in [error_message, *self._run_notes] if part) or None

        write = (self.scrape_log_id, status, animals_found, animals_added, animals_updated, message, detailed_metrics, duration_seconds, data_quality_score)
        try:
            if self.database_service:
                written = self.database_service.complete_scrape_log(*write)
            else:
                self.logger.info(f"Scrape completed with status: {status}, animals: {animals_found}")
                written = True
            self._completion_logged = bool(written)
            self._unwritten_completion = None if written else write
        finally:
            # After the write, even one that raised: the changed dogs are saved either way
            if status == "success" or self._changed_animal_ids:
                try:
                    self._invalidate_frontend_cache()
                except Exception as e:
                    # Never let the purge replace the exception a failed run is raising
                    self.logger.error(f"Cache invalidation failed: {e}")

        return written

    def _purge_if_reactivated(self, animal_id: int) -> None:
        """Invalidate a dog that has just come back from inactive.

        Its cached detail page carries a noindex and a "no longer listed"
        banner. A dog that reappears with identical data takes the "no_change"
        branch, which purges nothing, so without this the page keeps
        contradicting reality for the whole revalidate window.
        """
        reactivated = getattr(self.session_manager, "reactivated_animal_ids", None)
        if isinstance(reactivated, list) and animal_id in reactivated:
            self.mark_animal_changed(animal_id)

    def mark_animal_changed(self, animal_id: int) -> None:
        """Record that an animal was added or updated in this run.

        Drives scoped cache invalidation — only the detail pages for these
        animals get purged on completion.
        """
        if animal_id not in self._changed_animal_ids:
            self._changed_animal_ids.append(animal_id)

    def _changed_animal_slug_tags(self) -> list[str]:
        """Resolve changed animal IDs to per-page cache tags.

        The frontend tags each dog-detail fetch ``["animal", slug]``, so one
        slug tag purges exactly one page. Returns empty on any failure — the
        aggregate listing tags still fire, and the stale detail pages expire
        on their own ``revalidate`` window.
        """
        if not self._changed_animal_ids:
            return []

        if not self.database_service:
            self._log_service_unavailable("DatabaseService", "cannot scope cache invalidation")
            return []

        try:
            return self.database_service.get_slugs_for_animals(self._changed_animal_ids)
        except Exception as e:
            self.logger.warning("Could not resolve changed slugs for cache invalidation: %s", e)
            return []

    def _invalidate_frontend_cache(self) -> None:
        """Fire cache invalidation for the Next.js frontend.

        Sends the aggregate listing tags plus one tag per changed dog. It
        deliberately does NOT send the bare ``animal``/``enhanced`` tags:
        those are attached to every dog-detail fetch, so purging them
        invalidates all ~1,300 detail pages at once. With 13 orgs scraping
        3x/week that produced ~150 full-site purges per month and exceeded
        the Vercel ISR write budget by 3.5x.

        Fire-and-forget. ``invalidate_sync`` already swallows network and
        HTTP errors internally, so the outer ``try`` only guards against
        ``ImportError`` if the module is somehow missing — any other
        exception is a bug worth surfacing through the inner handler.
        """
        try:
            from services.revalidation_client import invalidate_sync
        except ImportError as e:
            self.logger.warning("Cache invalidation hook unavailable: %s", e)
            return

        slug_tags = self._changed_animal_slug_tags()
        self._changed_animal_ids = []

        invalidate_sync(
            tags=[
                "animals",
                "statistics",
                "country-stats",
                "age-stats",
                "filter-counts",
                "breed-stats",
                "breed-images",
                "organizations-enhanced",
                *slug_tags,
            ]
        )
        self.logger.info("Cache invalidation: listings + %d changed dog page(s)", len(slug_tags))
        self._notify_search_engines(slug_tags)

    def _notify_search_engines(self, slugs: list[str]) -> None:
        """Push the changed dog pages to IndexNow (Bing, DuckDuckGo's main source) (#440).

        Imported lazily behind an ImportError guard like the cache hook above: the cron
        container has failed to import new modules before, and a missing module must
        cost a log line, not the scrape.
        """
        if not slugs:
            return
        try:
            from services.indexnow_client import submit_dog_urls_sync
        except ImportError as e:
            self.logger.warning("IndexNow hook unavailable: %s", e)
            return

        submit_dog_urls_sync(slugs)

    def _alert_detail_failures(self) -> None:
        """Sentry hears when more than LOSS_ALERT_RATE of the detail pages failed: new dogs would stop arriving quietly."""
        attempted = max(self._detail_attempted, len(self.detail_failures))
        if len(self.detail_failures) / attempted <= self.LOSS_ALERT_RATE:
            return
        try:
            capture_scraper_error(
                error=RuntimeError(f"{len(self.detail_failures)} of {attempted} detail pages failed, e.g. {self.detail_failures[: self.LOST_IDS_LOG_CAP]}"),
                org_name=self.get_organization_name(),
                org_id=self.organization_id,
                scrape_log_id=getattr(self, "scrape_log_id", None),
                phase="detail_pages",
            )
        except Exception as e:
            self.logger.error(f"Failed to emit detail-failure Sentry alert: {e}")

    def _report_losses(self, animals_count: int, processing_stats: ScrapeStats) -> None:
        """Log the dogs this run collected but did not save, and warn Sentry when they exceed LOSS_ALERT_RATE."""
        lost = processing_stats.lost
        if not lost:
            return
        cap = self.LOST_IDS_LOG_CAP
        self.logger.warning(
            f"{self.get_organization_name()}: {animals_count} collected, {lost} not saved - "
            f"rejected {processing_stats.rejected} {processing_stats.rejected_ids[:cap]}, "
            f"save errors {processing_stats.save_errors} {processing_stats.save_error_ids[:cap]}"
        )
        if animals_count and lost / animals_count > self.LOSS_ALERT_RATE:
            try:
                alert_dogs_not_saved(
                    org_name=self.get_organization_name(),
                    dogs_collected=animals_count,
                    rejected=processing_stats.rejected,
                    save_errors=processing_stats.save_errors,
                    org_id=self.organization_id,
                    scrape_log_id=getattr(self, "scrape_log_id", None),
                )
            except Exception as e:
                self.logger.error(f"Failed to emit dogs-not-saved Sentry alert: {e}")

    @staticmethod
    def _completion_rate(animals_data: list, processing_stats: ScrapeStats) -> float:
        """Percentage of the collected dogs that were saved."""
        if not animals_data:
            return 100.0
        lost = processing_stats.lost
        return round(100.0 * (len(animals_data) - lost) / len(animals_data), 1)

    def _log_batch_summary(
        self,
        progress_tracker: ProgressTracker,
        processing_stats: ScrapeStats,
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
                f"Added: {processing_stats.animals_added}, "
                f"Updated: {processing_stats.animals_updated}, "
                f"Images: {processing_stats.images_uploaded} uploaded"
            )

            if processing_stats.images_failed > 0:
                summary += f", {processing_stats.images_failed} failed"

            self.logger.info(summary)

    def _log_completion_metrics(self, animals_data, processing_stats):
        """Metrics & logging phase: Calculate and log comprehensive metrics with world-class summary."""
        # Calculate metrics for detailed logging
        scrape_end_time = datetime.now()
        duration = self.metrics_collector.calculate_scrape_duration(self.scrape_start_time, scrape_end_time)
        quality_score = self.metrics_collector.assess_data_quality(animals_data)

        # Log detailed metrics
        correct_animals_found = self.animals_found
        detailed_metrics = self.metrics_collector.generate_comprehensive_metrics(
            animals_found=correct_animals_found,
            animals_added=processing_stats.animals_added,
            animals_updated=processing_stats.animals_updated,
            animals_unchanged=processing_stats.animals_unchanged,
            images_uploaded=processing_stats.images_uploaded,
            images_failed=processing_stats.images_failed,
            duration_seconds=duration,
            quality_score=quality_score,
            images_reused=processing_stats.images_reused,
            animals_rejected=processing_stats.animals_rejected,
            rejected=processing_stats.rejected,
            save_errors=processing_stats.save_errors,
            potential_failure_detected=processing_stats.potential_failure_detected,
            skip_existing_animals=self.skip_existing_animals,
            batch_size=self.batch_size,
            rate_limit_delay=self.rate_limit_delay,
            **self.run_metrics,
        )
        self.metrics_collector.log_detailed_metrics(detailed_metrics)

        # A partial failure left a run note, which makes this a "warning"
        self.complete_scrape_log(
            status="success",
            animals_found=correct_animals_found,
            animals_added=processing_stats.animals_added,
            animals_updated=processing_stats.animals_updated,
            detailed_metrics=detailed_metrics,
            duration_seconds=duration,
            data_quality_score=quality_score,
        )

        # World-class completion summary via ProgressTracker
        if hasattr(self, "progress_tracker") and self.progress_tracker:
            # Update final stats
            self.progress_tracker.track_processing_stats(
                dogs_added=processing_stats.animals_added,
                dogs_updated=processing_stats.animals_updated,
                dogs_unchanged=processing_stats.animals_unchanged,
                processing_failures=processing_stats.lost,
            )

            self.progress_tracker.track_image_stats(
                images_uploaded=processing_stats.images_uploaded,
                images_failed=processing_stats.images_failed,
                images_reused=processing_stats.images_reused,
            )

            self.progress_tracker.track_quality_stats(data_quality_score=quality_score, completion_rate=self._completion_rate(animals_data, processing_stats))

            self.progress_tracker.track_performance_stats(total_duration=duration)

            # Log comprehensive completion summary
            self.progress_tracker.log_completion_summary()
        else:
            # Fallback to basic logging if no ProgressTracker
            central_logger = logging.getLogger("scraper")
            central_logger.info(f"✅ Scrape completed: {processing_stats.animals_added} added, {processing_stats.animals_updated} updated, Quality: {quality_score:.2f}, Duration: {duration:.1f}s")

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

    def _emit_partial_failure_alert(self, animals_found: int) -> None:
        """Emit a Sentry partial-failure alert when the current run is a drop
        against the historical average.

        Zero-dogs case is handled separately by alert_zero_dogs_found earlier
        in run(), so we skip when animals_found is 0. Missing baseline also
        skips — we can't call it a drop without one. Sentry transport errors
        are swallowed: observability plumbing must never abort a scrape
        mid-flight, or stale detection and the run's warning completion with
        its metrics never happen.
        """
        if animals_found <= 0:
            return
        if not self.session_manager:
            return

        historical_avg = self.session_manager.get_historical_average_dogs_found()
        if historical_avg is None or historical_avg <= 0:
            return

        try:
            alert_partial_failure(
                org_name=self.get_organization_name(),
                dogs_found=animals_found,
                historical_average=historical_avg,
                org_id=self.organization_id,
                scrape_log_id=getattr(self, "scrape_log_id", None),
            )
        except Exception as e:
            self.logger.error(f"Failed to emit partial-failure Sentry alert: {e}")

    def _counts_so_far(self) -> dict[str, int]:
        """Found, added and updated counts for a run that ends early.

        Dogs saved before the failure are in the database and get purged, so the
        error row must say so rather than 0/0/0.
        """
        stats = self._processing_stats or ScrapeStats()
        return {
            "animals_found": self.animals_found,
            "animals_added": stats.animals_added,
            "animals_updated": stats.animals_updated,
        }

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

            # Complete scrape log with failure status, keeping what the run already saved
            if self.scrape_log_id:
                self.complete_scrape_log(status="error", error_message=error_message, **self._counts_so_far())

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
