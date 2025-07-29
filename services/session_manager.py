"""
SessionManager - Extracted from BaseScraper for Single Responsibility.

Handles all session management and stale data detection including:
- Session lifecycle (start/end tracking)
- Stale data detection algorithms
- Animal availability confidence management
- Skip existing animals logic

Following CLAUDE.md principles:
- Pure functions, no mutations
- Early returns, no nested conditionals
- Immutable data patterns
- Clear error handling
"""

import logging
from datetime import datetime
from typing import Any, Dict, Optional, Tuple

import psycopg2


class SessionManager:
    """Service for session management and stale data detection extracted from BaseScraper."""

    def __init__(self, db_config: Dict[str, str], organization_id: int, skip_existing_animals: bool = False, logger: Optional[logging.Logger] = None, connection_pool=None):
        """Initialize SessionManager with configuration.

        Args:
            db_config: Database connection configuration
            organization_id: Organization ID for session tracking
            skip_existing_animals: Whether to skip existing animals
            logger: Optional logger instance
            connection_pool: Optional ConnectionPoolService for pooled connections
        """
        self.db_config = db_config
        self.organization_id = organization_id
        self.skip_existing_animals = skip_existing_animals
        self.logger = logger or logging.getLogger(__name__)
        self.connection_pool = connection_pool
        self.conn = None
        self.current_scrape_session: Optional[datetime] = None

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
            self.logger.info(f"SessionManager connected to database: {self.db_config['database']}")
            return True
        except Exception as e:
            self.logger.error(f"SessionManager database connection error: {e}")
            return False

    def close(self) -> None:
        """Close database connection."""
        if self.conn:
            self.conn.close()
            self.conn = None
            self.logger.info("SessionManager database connection closed")

    def start_scrape_session(self) -> bool:
        """Start a new scrape session for tracking stale data.

        Returns:
            True if successful, False otherwise
        """
        try:
            self.current_scrape_session = datetime.now()
            self.logger.info(f"Started scrape session at {self.current_scrape_session}")
            return True
        except Exception as e:
            self.logger.error(f"Error starting scrape session: {e}")
            return False

    def get_current_session(self) -> Optional[datetime]:
        """Get current scrape session timestamp.

        Returns:
            Current session timestamp or None if no active session
        """
        return self.current_scrape_session

    def mark_animal_as_seen(self, animal_id: int) -> bool:
        """Mark an animal as seen in the current scrape session.

        Args:
            animal_id: ID of the animal to mark as seen

        Returns:
            True if successful, False otherwise
        """
        if not self.current_scrape_session:
            self.logger.warning("No active scrape session when marking animal as seen")
            return False

        # Use connection pool if available
        if self.connection_pool:
            try:
                with self.connection_pool.get_connection_context() as conn:
                    cursor = conn.cursor()
                    cursor.execute(
                        """
                        UPDATE animals
                        SET last_seen_at = %s,
                            consecutive_scrapes_missing = 0,
                            availability_confidence = 'high'
                        WHERE id = %s
                        """,
                        (self.current_scrape_session, animal_id),
                    )
                    conn.commit()
                    cursor.close()
                    return True
            except Exception as e:
                self.logger.error(f"Error marking animal as seen: {e}")
                return False

        # Fallback to direct connection
        if not self.conn:
            # Try to establish connection before failing
            if not self.connect():
                self.logger.error("No database connection available for marking animal as seen")
                return False

        try:
            cursor = self.conn.cursor()
            cursor.execute(
                """
                UPDATE animals
                SET last_seen_at = %s,
                    consecutive_scrapes_missing = 0,
                    availability_confidence = 'high'
                WHERE id = %s
                """,
                (self.current_scrape_session, animal_id),
            )
            self.conn.commit()
            cursor.close()
            return True
        except Exception as e:
            self.logger.error(f"Error marking animal as seen: {e}")
            if self.conn:
                self.conn.rollback()
            return False

    def update_stale_data_detection(self) -> bool:
        """Update stale data detection for animals not seen in current scrape.

        Returns:
            True if successful, False otherwise
        """
        if not self.current_scrape_session:
            self.logger.warning("No active scrape session for stale data detection")
            return False

        # Use connection pool if available
        if self.connection_pool:
            try:
                with self.connection_pool.get_connection_context() as conn:
                    cursor = conn.cursor()

                    # Update animals not seen in current scrape
                    # FIXED: Use original consecutive_scrapes_missing value in CASE statements
                    cursor.execute(
                        """
                        UPDATE animals
                        SET consecutive_scrapes_missing = consecutive_scrapes_missing + 1,
                            availability_confidence = CASE
                                WHEN consecutive_scrapes_missing = 0 THEN 'medium'
                                WHEN consecutive_scrapes_missing = 1 THEN 'low'
                                WHEN consecutive_scrapes_missing >= 2 THEN 'low'
                                ELSE availability_confidence
                            END,
                            status = CASE
                                WHEN consecutive_scrapes_missing >= 3 THEN 'unavailable'
                                ELSE status
                            END
                        WHERE organization_id = %s
                        AND (last_seen_at IS NULL OR last_seen_at < %s)
                        """,
                        (self.organization_id, self.current_scrape_session),
                    )

                    rows_affected = cursor.rowcount
                    conn.commit()
                    cursor.close()

                    self.logger.info(f"Updated stale data detection for {rows_affected} animals")
                    return True
            except Exception as e:
                self.logger.error(f"Error updating stale data detection: {e}")
                return False

        # Fallback to direct connection
        if not self.conn:
            # Try to establish connection before failing
            if not self.connect():
                self.logger.error("No database connection available for stale data detection")
                return False

        try:
            cursor = self.conn.cursor()

            # Update animals not seen in current scrape
            # FIXED: Use original consecutive_scrapes_missing value in CASE statements
            cursor.execute(
                """
                UPDATE animals
                SET consecutive_scrapes_missing = consecutive_scrapes_missing + 1,
                    availability_confidence = CASE
                        WHEN consecutive_scrapes_missing = 0 THEN 'medium'
                        WHEN consecutive_scrapes_missing = 1 THEN 'low'
                        WHEN consecutive_scrapes_missing >= 2 THEN 'low'
                        ELSE availability_confidence
                    END,
                    status = CASE
                        WHEN consecutive_scrapes_missing >= 3 THEN 'unavailable'
                        ELSE status
                    END
                WHERE organization_id = %s
                AND (last_seen_at IS NULL OR last_seen_at < %s)
                """,
                (self.organization_id, self.current_scrape_session),
            )

            rows_affected = cursor.rowcount
            self.conn.commit()
            cursor.close()

            self.logger.info(f"Updated stale data detection for {rows_affected} animals")
            return True

        except Exception as e:
            self.logger.error(f"Error updating stale data detection: {e}")
            if self.conn:
                self.conn.rollback()
            return False

    def mark_animals_unavailable(self, threshold: int = 4) -> int:
        """Mark animals as unavailable after consecutive missed scrapes.

        Args:
            threshold: Number of consecutive missed scrapes before marking unavailable

        Returns:
            Number of animals marked as unavailable
        """
        if not self.conn:
            # Try to establish connection before failing
            if not self.connect():
                self.logger.error("No database connection available for marking animals unavailable")
                return 0

        try:
            cursor = self.conn.cursor()

            # Mark animals as unavailable after threshold missed scrapes
            cursor.execute(
                """
                UPDATE animals
                SET status = 'unavailable'
                WHERE organization_id = %s
                AND consecutive_scrapes_missing >= %s
                AND status != 'unavailable'
                """,
                (self.organization_id, threshold),
            )

            rows_affected = cursor.rowcount
            self.conn.commit()
            cursor.close()

            if rows_affected > 0:
                self.logger.info(f"Marked {rows_affected} animals as unavailable after {threshold}+ missed scrapes")

            return rows_affected

        except Exception as e:
            self.logger.error(f"Error marking animals unavailable: {e}")
            if self.conn:
                self.conn.rollback()
            return 0

    def restore_available_animal(self, animal_id: int) -> bool:
        """Restore an animal to available status when it reappears.

        Args:
            animal_id: ID of the animal to restore

        Returns:
            True if successful, False otherwise
        """
        if not self.conn:
            self.logger.error("No database connection available for restoring animal")
            return False

        try:
            cursor = self.conn.cursor()

            # Restore animal to available status with high confidence
            cursor.execute(
                """
                UPDATE animals
                SET status = 'available',
                    consecutive_scrapes_missing = 0,
                    availability_confidence = 'high',
                    last_seen_at = %s,
                    updated_at = %s
                WHERE id = %s
                """,
                (
                    self.current_scrape_session or datetime.now(),
                    datetime.now(),
                    animal_id,
                ),
            )

            self.conn.commit()
            cursor.close()

            self.logger.info(f"Restored animal ID {animal_id} to available status")
            return True

        except Exception as e:
            self.logger.error(f"Error restoring animal availability: {e}")
            if self.conn:
                self.conn.rollback()
            return False

    def mark_skipped_animals_as_seen(self) -> int:
        """Mark animals that were skipped due to skip_existing_animals as seen.

        This method fixes the critical bug where skip_existing_animals=true causes
        existing animals to be incorrectly marked as unavailable after 3 consecutive
        scrapes. The bug occurs because skipped animals never reach update_animal()
        which would update their last_seen_at timestamp.

        Returns:
            Number of animals marked as seen
        """
        if not self.skip_existing_animals or not self.current_scrape_session:
            return 0

        # Use connection pool if available
        if self.connection_pool:
            try:
                with self.connection_pool.get_connection_context() as conn:
                    cursor = conn.cursor()

                    # Mark all existing animals as seen in the current scrape session
                    # This prevents them from being counted as "missing" in stale data detection
                    cursor.execute(
                        """
                        UPDATE animals
                        SET last_seen_at = %s,
                            consecutive_scrapes_missing = 0,
                            availability_confidence = 'high'
                        WHERE organization_id = %s
                        AND status = 'available'
                        """,
                        (self.current_scrape_session, self.organization_id),
                    )

                    rows_affected = cursor.rowcount
                    conn.commit()
                    cursor.close()

                    if rows_affected > 0:
                        self.logger.info(f"Marked {rows_affected} skipped animals as seen in current scrape session")

                    return rows_affected
            except Exception as e:
                self.logger.error(f"Error marking skipped animals as seen: {e}")
                return 0

        # Fallback to direct connection
        if not self.conn:
            # Try to establish connection before failing
            if not self.connect():
                self.logger.error("No database connection available for marking skipped animals")
                return 0

        try:
            cursor = self.conn.cursor()

            # Mark all existing animals as seen in the current scrape session
            # This prevents them from being counted as "missing" in stale data detection
            cursor.execute(
                """
                UPDATE animals
                SET last_seen_at = %s,
                    consecutive_scrapes_missing = 0,
                    availability_confidence = 'high'
                WHERE organization_id = %s
                AND status = 'available'
                """,
                (self.current_scrape_session, self.organization_id),
            )

            rows_affected = cursor.rowcount
            self.conn.commit()
            cursor.close()

            if rows_affected > 0:
                self.logger.info(f"Marked {rows_affected} skipped animals as seen in current scrape session")

            return rows_affected

        except Exception as e:
            self.logger.error(f"Error marking skipped animals as seen: {e}")
            if self.conn:
                self.conn.rollback()
            return 0

    def get_stale_animals_summary(self) -> Dict[Tuple[str, str], int]:
        """Get summary of animals by availability confidence and status.

        Returns:
            Dictionary with (confidence, status) tuples as keys and counts as values
        """
        # Use connection pool if available
        if self.connection_pool:
            try:
                with self.connection_pool.get_connection_context() as conn:
                    cursor = conn.cursor()

                    cursor.execute(
                        """
                        SELECT availability_confidence, status, COUNT(*)
                        FROM animals
                        WHERE organization_id = %s
                        GROUP BY availability_confidence, status
                        ORDER BY availability_confidence, status
                        """,
                        (self.organization_id,),
                    )

                    results = cursor.fetchall()
                    cursor.close()

                    # Convert to dictionary
                    summary = {}
                    for confidence, status, count in results:
                        summary[(confidence, status)] = count

                    return summary
            except Exception as e:
                self.logger.error(f"Error getting stale animals summary: {e}")
                return {}

        # Fallback to direct connection
        if not self.conn:
            self.logger.error("No database connection available for stale animals summary")
            return {}

        try:
            cursor = self.conn.cursor()

            cursor.execute(
                """
                SELECT availability_confidence, status, COUNT(*)
                FROM animals
                WHERE organization_id = %s
                GROUP BY availability_confidence, status
                ORDER BY availability_confidence, status
                """,
                (self.organization_id,),
            )

            results = cursor.fetchall()
            cursor.close()

            # Convert to dictionary
            summary = {}
            for confidence, status, count in results:
                summary[(confidence, status)] = count

            return summary

        except Exception as e:
            self.logger.error(f"Error getting stale animals summary: {e}")
            return {}

    def detect_partial_failure(
        self,
        animals_found: int,
        threshold_percentage: float = 0.5,
        absolute_minimum: int = 3,
        minimum_historical_scrapes: int = 3,
        total_animals_before_filter: int = 0,
        total_animals_skipped: int = 0,
    ) -> bool:
        """Enhanced partial failure detection with absolute minimums and better error handling.

        Args:
            animals_found: Number of animals found in current scrape
            threshold_percentage: Minimum percentage of historical average to consider normal
            absolute_minimum: Absolute minimum count below which failure is assumed
            minimum_historical_scrapes: Minimum historical scrapes needed for reliable comparison
            total_animals_before_filter: Total animals before skip_existing_animals filtering
            total_animals_skipped: Number of animals skipped

        Returns:
            True if potential partial failure detected, False otherwise
        """
        # First check for catastrophic failure
        if self._detect_catastrophic_failure(animals_found, absolute_minimum, total_animals_before_filter, total_animals_skipped):
            return True

        # Use connection pool if available
        if self.connection_pool:
            try:
                with self.connection_pool.get_connection_context() as conn:
                    cursor = conn.cursor()

                    # Get historical average of animals found
                    cursor.execute(
                        """
                        SELECT AVG(dogs_found), COUNT(*)
                        FROM (
                            SELECT dogs_found
                            FROM scrape_logs
                            WHERE organization_id = %s
                            AND status = 'success'
                            AND dogs_found > 0
                            ORDER BY started_at DESC
                            LIMIT %s
                        ) recent_scrapes
                        """,
                        (
                            self.organization_id,
                            minimum_historical_scrapes * 3,
                        ),
                    )

                    result = cursor.fetchone()
                    cursor.close()

                    return self._evaluate_partial_failure(result, animals_found, threshold_percentage, absolute_minimum, minimum_historical_scrapes, total_animals_before_filter, total_animals_skipped)
            except Exception as e:
                self.logger.error(f"Error detecting partial failure: {e}")
                # Default to safe mode - assume potential failure to prevent data loss
                return True

        # Fallback to direct connection
        if not self.conn:
            self.logger.error("No database connection available for failure detection")
            return True  # Assume failure if no connection

        try:
            cursor = self.conn.cursor()

            # Get historical average of animals found
            cursor.execute(
                """
                SELECT AVG(dogs_found), COUNT(*)
                FROM (
                    SELECT dogs_found
                    FROM scrape_logs
                    WHERE organization_id = %s
                    AND status = 'success'
                    AND dogs_found > 0
                    ORDER BY started_at DESC
                    LIMIT %s
                ) recent_scrapes
                """,
                (
                    self.organization_id,
                    minimum_historical_scrapes * 3,
                ),
            )

            result = cursor.fetchone()
            cursor.close()

            return self._evaluate_partial_failure(result, animals_found, threshold_percentage, absolute_minimum, minimum_historical_scrapes, total_animals_before_filter, total_animals_skipped)
        except Exception as e:
            self.logger.error(f"Error detecting partial failure: {e}")
            # Default to safe mode - assume potential failure to prevent data loss
            return True

    def _evaluate_partial_failure(self, result, animals_found, threshold_percentage, absolute_minimum, minimum_historical_scrapes, total_animals_before_filter, total_animals_skipped):
        """Evaluate partial failure based on database query result (pure function).

        Args:
            result: Database query result (avg, count)
            animals_found: Number of animals found in current scrape
            threshold_percentage: Minimum percentage of historical average
            absolute_minimum: Absolute minimum count
            minimum_historical_scrapes: Minimum historical scrapes needed
            total_animals_before_filter: Total animals before filtering
            total_animals_skipped: Number of animals skipped

        Returns:
            True if partial failure detected, False otherwise
        """
        try:
            if not result or not result[0] or (len(result) > 1 and result[1] < minimum_historical_scrapes):
                # No historical data or insufficient data - use absolute minimum
                scrape_count = result[1] if (result and len(result) > 1) else 0
                self.logger.info(f"Insufficient historical data for organization_id {self.organization_id} " f"({scrape_count} scrapes). Using absolute minimum threshold.")

                if animals_found < absolute_minimum:
                    self.logger.warning(f"Potential failure detected: {animals_found} animals found " f"(below absolute minimum of {absolute_minimum}) for new organization")
                    return True
                return False

            historical_average = float(result[0])
            percentage_threshold = historical_average * threshold_percentage

            # Use the higher of percentage threshold or absolute minimum
            effective_threshold = max(percentage_threshold, absolute_minimum)

            # Check if low count is due to skip_existing_animals filtering
            if self.skip_existing_animals and animals_found == 0 and total_animals_before_filter > 0:
                self.logger.info(
                    f"Zero animals after skip_existing_animals filtering is normal behavior "
                    f"({total_animals_before_filter} found before filtering, {total_animals_skipped} skipped). "
                    f"Not considering this a partial failure."
                )
                return False

            is_partial_failure = animals_found < effective_threshold

            if is_partial_failure:
                self.logger.warning(
                    f"Potential partial failure detected: found {animals_found} animals "
                    f"(historical avg: {historical_average:.1f}, percentage threshold: {percentage_threshold:.1f}, "
                    f"absolute minimum: {absolute_minimum}, effective threshold: {effective_threshold:.1f})"
                )

            return is_partial_failure

        except Exception as e:
            self.logger.error(f"Error detecting partial failure: {e}")
            # Default to safe mode - assume potential failure to prevent data loss
            return True

    def _detect_catastrophic_failure(self, animals_found: int, absolute_minimum: int = 3, total_animals_before_filter: int = 0, total_animals_skipped: int = 0) -> bool:
        """Detect catastrophic scraper failures (zero or extremely low animal counts).

        This method detects complete scraper failures or situations where the count
        is so low that it's almost certainly a system error rather than reality.

        IMPORTANT: Considers skip_existing_animals filtering to avoid false positives.

        Args:
            animals_found: Number of animals found in current scrape (after filtering)
            absolute_minimum: Absolute minimum count below which failure is assumed
            total_animals_before_filter: Total animals before filtering
            total_animals_skipped: Number of animals skipped

        Returns:
            True if catastrophic failure detected, False otherwise
        """
        # Handle invalid inputs
        if animals_found < 0:
            self.logger.error(f"Invalid negative animal count: {animals_found} for organization_id {self.organization_id}")
            return True

        # If skip_existing_animals is enabled and we found animals before filtering,
        # then zero animals after filtering is normal behavior, not a failure
        if animals_found == 0 and self.skip_existing_animals and total_animals_before_filter > 0:
            self.logger.info(f"Zero animals to process after skip_existing_animals filtering ({total_animals_skipped} skipped). This is normal behavior, not a failure.")
            return False

        # Zero animals is catastrophic only if we didn't find any before filtering either
        if animals_found == 0:
            if self.skip_existing_animals:
                self.logger.error(
                    f"Catastrophic failure detected: Zero animals found BEFORE filtering for organization_id {self.organization_id}. "
                    f"This indicates complete scraper failure or website unavailability."
                )
            else:
                self.logger.error(
                    f"Catastrophic failure detected: Zero animals found for organization_id {self.organization_id}. " f"This indicates complete scraper failure or website unavailability."
                )
            return True

        # Check against absolute minimum threshold
        if animals_found < absolute_minimum:
            # If we have skip_existing_animals enabled, check before filtering count
            if self.skip_existing_animals and total_animals_before_filter >= absolute_minimum:
                self.logger.info(
                    f"Only {animals_found} animals to process after skip_existing_animals filtering, but {total_animals_before_filter} were found before filtering. This is normal behavior."
                )
                return False

            self.logger.error(
                f"Catastrophic failure detected: Only {animals_found} animals found for organization_id {self.organization_id} "
                f"(below absolute minimum of {absolute_minimum}). This likely indicates scraper malfunction."
            )
            return True

        return False
