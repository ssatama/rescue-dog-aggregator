"""Sentry integration for scraper error tracking and alerting.

This module provides Sentry initialization and error capture functions
specifically designed for the scraper context (no FastAPI/Starlette).
"""

import logging
import os
from contextlib import contextmanager
from typing import Any, Dict, Optional

import sentry_sdk
from sentry_sdk.integrations.logging import LoggingIntegration

logger = logging.getLogger(__name__)

_sentry_initialized = False


def scrub_sensitive_data(event: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Remove sensitive data from Sentry events."""
    if "extra" in event:
        for key in list(event["extra"].keys()):
            if any(sensitive in key.lower() for sensitive in ["password", "token", "secret", "key", "dsn"]):
                event["extra"][key] = "[REDACTED]"

    return event


def init_scraper_sentry(environment: str = "production") -> bool:
    """Initialize Sentry for scraper context.

    Unlike the API initialization, this uses minimal integrations
    suitable for a batch processing context.

    Args:
        environment: Environment name (production, development, etc.)

    Returns:
        True if Sentry was initialized, False otherwise.
    """
    global _sentry_initialized

    if _sentry_initialized:
        logger.debug("Sentry already initialized for scrapers")
        return True

    dsn = os.getenv("SENTRY_DSN_BACKEND")

    if environment != "production":
        logger.info(f"Sentry disabled for {environment} environment - only enabled in production")
        return False

    if not dsn:
        logger.warning("SENTRY_DSN_BACKEND not set for production environment")
        return False

    logger.info("Initializing Sentry for scraper context")

    sentry_sdk.init(
        dsn=dsn,
        environment=environment,
        integrations=[
            LoggingIntegration(level=logging.INFO, event_level=logging.ERROR),
        ],
        traces_sample_rate=1.0,
        attach_stacktrace=True,
        send_default_pii=False,
        before_send=scrub_sensitive_data,
        release=os.getenv("SENTRY_RELEASE", "unknown"),
        server_name=os.getenv("SERVER_NAME", "scraper-cron"),
        max_breadcrumbs=100,
        enable_tracing=True,
    )

    with sentry_sdk.configure_scope() as scope:
        scope.set_tag("service", "scraper-cron")
        scope.set_tag("runtime", "python")
        scope.set_tag("environment", environment)

    _sentry_initialized = True
    return True


def capture_scraper_error(
    error: Exception,
    org_name: str,
    org_id: Optional[int] = None,
    scrape_log_id: Optional[int] = None,
    phase: Optional[str] = None,
) -> None:
    """Capture a scraper exception with organization context.

    Args:
        error: The exception that occurred.
        org_name: Name of the organization being scraped.
        org_id: Database ID of the organization.
        scrape_log_id: ID of the scrape_logs entry.
        phase: Which phase of scraping failed (collection, processing, etc.)
    """
    with sentry_sdk.push_scope() as scope:
        scope.set_tag("scraper.organization", org_name)
        if org_id:
            scope.set_tag("scraper.org_id", str(org_id))
        if scrape_log_id:
            scope.set_tag("scraper.scrape_log_id", str(scrape_log_id))
        if phase:
            scope.set_tag("scraper.phase", phase)

        scope.set_context(
            "scraper",
            {
                "organization": org_name,
                "org_id": org_id,
                "scrape_log_id": scrape_log_id,
                "phase": phase,
                "error_type": type(error).__name__,
            },
        )

        sentry_sdk.capture_exception(error)

    logger.error(f"Captured scraper error for {org_name}: {error}")


def alert_zero_dogs_found(
    org_name: str,
    org_id: Optional[int] = None,
    scrape_log_id: Optional[int] = None,
) -> None:
    """Send a Sentry warning when a scraper finds zero dogs.

    This is treated as a warning because it likely indicates:
    - Website structure changed
    - Site is down or blocking requests
    - Scraper logic needs updating

    Args:
        org_name: Name of the organization being scraped.
        org_id: Database ID of the organization.
        scrape_log_id: ID of the scrape_logs entry.
    """
    with sentry_sdk.push_scope() as scope:
        scope.set_tag("scraper.organization", org_name)
        scope.set_tag("scraper.alert_type", "zero_dogs_found")
        scope.set_level("warning")

        if org_id:
            scope.set_tag("scraper.org_id", str(org_id))
        if scrape_log_id:
            scope.set_tag("scraper.scrape_log_id", str(scrape_log_id))

        scope.set_context(
            "scraper",
            {
                "organization": org_name,
                "org_id": org_id,
                "scrape_log_id": scrape_log_id,
                "dogs_found": 0,
                "alert_reason": "Website may have changed structure or is blocking requests",
            },
        )

        sentry_sdk.capture_message(
            f"Zero dogs found for {org_name} - website may have changed",
            level="warning",
        )

    logger.warning(f"Sent zero-dogs alert for {org_name}")


def alert_partial_failure(
    org_name: str,
    dogs_found: int,
    historical_average: float,
    threshold_percentage: float = 0.5,
    org_id: Optional[int] = None,
    scrape_log_id: Optional[int] = None,
) -> None:
    """Send a Sentry warning when a scraper finds significantly fewer dogs than usual.

    Args:
        org_name: Name of the organization being scraped.
        dogs_found: Number of dogs found in this scrape.
        historical_average: Average number of dogs found in previous scrapes.
        threshold_percentage: Percentage threshold that triggered the alert.
        org_id: Database ID of the organization.
        scrape_log_id: ID of the scrape_logs entry.
    """
    with sentry_sdk.push_scope() as scope:
        scope.set_tag("scraper.organization", org_name)
        scope.set_tag("scraper.alert_type", "partial_failure")
        scope.set_level("warning")

        if org_id:
            scope.set_tag("scraper.org_id", str(org_id))
        if scrape_log_id:
            scope.set_tag("scraper.scrape_log_id", str(scrape_log_id))

        scope.set_context(
            "scraper",
            {
                "organization": org_name,
                "org_id": org_id,
                "scrape_log_id": scrape_log_id,
                "dogs_found": dogs_found,
                "historical_average": historical_average,
                "threshold_percentage": threshold_percentage,
                "percentage_of_expected": dogs_found / historical_average if historical_average > 0 else 0,
            },
        )

        sentry_sdk.capture_message(
            f"Partial failure for {org_name}: found {dogs_found} dogs, expected ~{historical_average:.0f}",
            level="warning",
        )

    logger.warning(f"Sent partial-failure alert for {org_name}: {dogs_found}/{historical_average:.0f}")


def alert_llm_enrichment_failure(
    org_name: str,
    batch_size: int,
    failed_count: int,
    error_message: Optional[str] = None,
    org_id: Optional[int] = None,
) -> None:
    """Send a Sentry warning when LLM enrichment fails for multiple dogs.

    Args:
        org_name: Name of the organization.
        batch_size: Number of dogs in the LLM batch.
        failed_count: Number of dogs that failed LLM enrichment.
        error_message: Optional error message describing the failure.
        org_id: Database ID of the organization.
    """
    with sentry_sdk.push_scope() as scope:
        scope.set_tag("scraper.organization", org_name)
        scope.set_tag("scraper.alert_type", "llm_enrichment_failure")
        scope.set_level("warning")

        if org_id:
            scope.set_tag("scraper.org_id", str(org_id))

        scope.set_context(
            "llm_enrichment",
            {
                "organization": org_name,
                "org_id": org_id,
                "batch_size": batch_size,
                "failed_count": failed_count,
                "success_rate": (batch_size - failed_count) / batch_size if batch_size > 0 else 0,
                "error_message": error_message,
            },
        )

        sentry_sdk.capture_message(
            f"LLM enrichment failed for {failed_count}/{batch_size} dogs in {org_name}",
            level="warning",
        )

    logger.warning(f"Sent LLM failure alert for {org_name}: {failed_count}/{batch_size} failed")


@contextmanager
def scrape_transaction(org_name: str, org_id: Optional[int] = None):
    """Context manager for tracking scrape duration as a Sentry transaction.

    Usage:
        with scrape_transaction("Dogs Trust", org_id=5) as transaction:
            # ... scraping code ...
            transaction.set_data("dogs_found", 150)

    Args:
        org_name: Name of the organization being scraped.
        org_id: Database ID of the organization.

    Yields:
        The Sentry transaction object for adding custom data.
    """
    with sentry_sdk.start_transaction(
        name=f"scrape:{org_name}",
        op="scraper.run",
    ) as transaction:
        transaction.set_tag("scraper.organization", org_name)
        if org_id:
            transaction.set_tag("scraper.org_id", str(org_id))

        try:
            yield transaction
            transaction.set_status("ok")
        except Exception as e:
            transaction.set_status("internal_error")
            transaction.set_data("error", str(e))
            raise


def add_scrape_breadcrumb(
    message: str,
    category: str = "scraper",
    level: str = "info",
    data: Optional[Dict[str, Any]] = None,
) -> None:
    """Add a breadcrumb for scraper debugging context.

    Args:
        message: Description of the event.
        category: Category for grouping (default: scraper).
        level: Severity level (info, warning, error).
        data: Additional data to attach.
    """
    sentry_sdk.add_breadcrumb(
        category=category,
        message=message,
        level=level,
        data=data or {},
    )
