"""The end of a run: stale detection, unless the run looks partial, and
adoption checks (#558). A mixin of BaseScraper (#569)."""

from datetime import datetime

from scrapers.sentry_integration import capture_scraper_error


class StaleDetection:
    """Mark listed dogs seen, then age out the ones no longer listed."""

    # More than this share of found dogs failing to save makes the run a
    # partial failure, which skips stale detection (#558). Found, not collected:
    # with skip_existing_animals only new dogs are collected, and one new dog
    # that fails every run would otherwise be 100%. Validator rejections don't
    # count: they repeat for the same dog every run.
    SAVE_ERROR_PARTIAL_FAILURE_RATE = 0.2

    def _finalize_scrape(self, animals_data, processing_stats):
        """Stale data detection phase: Handle partial failures and update stale data."""
        phase_start = datetime.now()

        # Check for potential partial failure before updating stale data
        correct_animals_found = self.animals_found
        count_dropped = self.detect_partial_failure(correct_animals_found)
        save_errors = processing_stats.save_errors
        too_many_save_errors = correct_animals_found > 0 and save_errors / correct_animals_found > self.SAVE_ERROR_PARTIAL_FAILURE_RATE
        potential_failure = count_dropped or too_many_save_errors
        processing_stats.potential_failure_detected = potential_failure

        if potential_failure:
            self.logger.warning("Potential partial failure detected - skipping stale data update")
            # A note, so the run completes as "warning" in _log_completion_metrics,
            # or keeps saying so if it fails before then
            if count_dropped:
                # Surface to Sentry — log alone doesn't page. Zero-dogs path is
                # handled earlier in run(), so this covers the drop-rate case.
                self._emit_partial_failure_alert(correct_animals_found)
                self._run_notes.append("Potential partial failure - low animal count detected")
            if too_many_save_errors:
                # _report_losses has already warned Sentry (dogs_not_saved)
                self._run_notes.append(f"Potential partial failure - {save_errors} of {correct_animals_found} found dogs failed to save")
        else:
            if self.session_manager:
                # Every dog the site listed is seen, whether it was skipped as
                # existing, rejected or failed to save: a listed dog is not stale (#558)
                if self.session_manager.mark_found_animals_as_seen() is None:
                    # Stale detection now would count listed dogs as missing
                    self.logger.warning("Could not mark found dogs as seen - skipping stale data update")
                    self._run_notes.append("Stale detection skipped - found dogs could not be marked as seen")
                elif not self.session_manager.update_stale_data_detection():
                    self._run_notes.append("Stale detection failed")
            else:
                self._log_service_unavailable("SessionManager", "stale data detection disabled")

            # Phase 2.3: Check for adoptions after stale data detection
            self._check_adoptions_if_enabled()

            # Note: Scrape log completion with detailed metrics happens in _log_completion_metrics phase

        phase_duration = (datetime.now() - phase_start).total_seconds()
        self.metrics_collector.track_phase_timing("stale_data_detection", phase_duration)

    def _record_all_found_external_ids(self, animals_data):
        """Record all external_ids from discovered animals for accurate stale detection.

        This must be called BEFORE any skip_existing_animals filtering happens.
        It records which animals were actually found on the website so that
        mark_found_animals_as_seen() only marks those specific animals as seen,
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

            self.logger.info(f"🔍 Checking for adoptions (threshold: {threshold} missed scrapes)")

            # Initialize service
            service = AdoptionDetectionService()

            # Check adoptions for this organization
            with self.database_service.connection() as conn:
                results = service.batch_check_adoptions(
                    conn,
                    self.organization_id,
                    threshold=threshold,
                    limit=max_checks,
                    dry_run=False,
                )

            if results:
                # Log results
                adopted_count = sum(1 for r in results if r.detected_status == "adopted")
                reserved_count = sum(1 for r in results if r.detected_status == "reserved")

                self.logger.info(f"✅ Adoption check complete: {len(results)} dogs checked, {adopted_count} adopted, {reserved_count} reserved")

                # Track metrics
                self.metrics_collector.track_custom_metric("adoptions_checked", len(results))
                self.metrics_collector.track_custom_metric("adoptions_detected", adopted_count)
                self.metrics_collector.track_custom_metric("reservations_detected", reserved_count)
            else:
                self.logger.info("No dogs eligible for adoption checking")

        except ImportError as e:
            self.logger.warning(f"AdoptionDetectionService not available: {e}")
        except Exception as e:
            # Catch all exceptions but not BaseException (SystemExit, KeyboardInterrupt)
            # Adoption checking is non-critical - log and continue
            self.logger.error(f"Error during adoption checking: {e}")
            capture_scraper_error(
                error=e,
                org_name=self.get_organization_name(),
                org_id=self.organization_id,
                scrape_log_id=getattr(self, "scrape_log_id", None),
                phase="adoption_detection",
            )
