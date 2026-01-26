"""Sentry integration for scraper error tracking and alerting.

This module provides Sentry initialization and error capture functions
specifically designed for the scraper context (no FastAPI/Starlette).
"""

import logging
import os
from contextlib import contextmanager
from typing import Any

import sentry_sdk
from sentry_sdk.integrations.logging import LoggingIntegration

logger = logging.getLogger(__name__)

_sentry_initialized = False


def scrub_sensitive_data(event: dict[str, Any], hint: dict[str, Any]) -> dict[str, Any] | None:
    """Remove sensitive data from Sentry events including breadcrumbs and contexts."""
    sensitive_patterns = ["password", "token", "secret", "key", "dsn", "api_key", "auth"]

    def scrub_dict(d: dict[str, Any]) -> None:
        """Recursively scrub sensitive keys from a dictionary."""
        for key in list(d.keys()):
            if any(pattern in key.lower() for pattern in sensitive_patterns):
                d[key] = "[REDACTED]"
            elif isinstance(d[key], dict):
                scrub_dict(d[key])
            elif isinstance(d[key], list):
                for item in d[key]:
                    if isinstance(item, dict):
                        scrub_dict(item)

    # Scrub extra field
    if "extra" in event:
        scrub_dict(event["extra"])

    # Scrub breadcrumbs
    if "breadcrumbs" in event and "values" in event["breadcrumbs"]:
        for breadcrumb in event["breadcrumbs"]["values"]:
            if "data" in breadcrumb and isinstance(breadcrumb["data"], dict):
                scrub_dict(breadcrumb["data"])

    # Scrub contexts
    if "contexts" in event:
        scrub_dict(event["contexts"])

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
        profiles_sample_rate=1.0,  # Fix 4.2: Add scraper profiling
        attach_stacktrace=True,
        send_default_pii=False,
        before_send=scrub_sensitive_data,
        release=os.getenv("SENTRY_RELEASE", "unknown"),
        server_name=os.getenv("SERVER_NAME", "scraper-cron"),
        max_breadcrumbs=100,
        enable_tracing=True,
    )

    # Use direct API calls instead of deprecated configure_scope()
    sentry_sdk.set_tag("service", "scraper-cron")
    sentry_sdk.set_tag("runtime", "python")
    sentry_sdk.set_tag("environment", environment)

    _sentry_initialized = True
    return True


def _classify_error(error: Exception) -> tuple[str, str]:
    """Classify error by category and severity.

    Returns:
        Tuple of (error_category, error_severity)
    """
    error_type = type(error).__name__
    error_str = str(error).lower()

    # Network errors
    if any(net in error_type.lower() for net in ["connection", "timeout", "network", "http"]):
        return "network", "high"
    if any(net in error_str for net in ["connection", "timeout", "network", "refused"]):
        return "network", "high"

    # Parsing errors
    if any(parse in error_type.lower() for parse in ["parse", "json", "xml", "decode", "attribute"]):
        return "parsing", "medium"
    if "selector" in error_str or "element" in error_str:
        return "parsing", "medium"

    # Database errors
    if any(db in error_type.lower() for db in ["database", "sql", "postgres", "psycopg"]):
        return "database", "critical"

    # Timeout errors
    if "timeout" in error_type.lower() or "timeout" in error_str:
        return "timeout", "high"

    # Default
    return "unknown", "medium"


def capture_scraper_error(
    error: Exception,
    org_name: str,
    org_id: int | None = None,
    scrape_log_id: int | None = None,
    phase: str | None = None,
) -> None:
    """Capture a scraper exception with organization context.

    Args:
        error: The exception that occurred.
        org_name: Name of the organization being scraped.
        org_id: Database ID of the organization.
        scrape_log_id: ID of the scrape_logs entry.
        phase: Which phase of scraping failed (collection, processing, etc.)
    """
    # Classify error for better filtering in Sentry
    error_category, error_severity = _classify_error(error)

    with sentry_sdk.new_scope() as scope:
        scope.set_tag("scraper.organization", org_name)
        scope.set_tag("scraper.error_category", error_category)
        scope.set_tag("scraper.error_severity", error_severity)
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
                "error_category": error_category,
                "error_severity": error_severity,
            },
        )

        # Capture with exc_info=True to preserve stack trace
        sentry_sdk.capture_exception(error, scope=scope)

    logger.error(f"Captured scraper error for {org_name}: {error}", exc_info=True)


def alert_zero_dogs_found(
    org_name: str,
    org_id: int | None = None,
    scrape_log_id: int | None = None,
) -> None:
    """Send a Sentry ERROR when a scraper finds zero dogs.

    This is treated as an ERROR because it likely indicates:
    - Website structure changed
    - Site is down or blocking requests
    - Scraper logic needs updating

    Args:
        org_name: Name of the organization being scraped.
        org_id: Database ID of the organization.
        scrape_log_id: ID of the scrape_logs entry.
    """
    with sentry_sdk.new_scope() as scope:
        scope.set_tag("scraper.organization", org_name)
        scope.set_tag("scraper.alert_type", "zero_dogs_found")
        scope.set_tag("scraper.error_severity", "critical")
        scope.set_level("error")  # Use ERROR level for zero dogs

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
            level="error",  # Use ERROR level
            scope=scope,
        )

    logger.error(f"Sent zero-dogs alert for {org_name}")


def alert_partial_failure(
    org_name: str,
    dogs_found: int,
    historical_average: float,
    threshold_percentage: float = 0.5,
    org_id: int | None = None,
    scrape_log_id: int | None = None,
) -> None:
    """Send a Sentry alert when a scraper finds significantly fewer dogs than usual.

    Args:
        org_name: Name of the organization being scraped.
        dogs_found: Number of dogs found in this scrape.
        historical_average: Average number of dogs found in previous scrapes.
        threshold_percentage: Percentage threshold that triggered the alert.
        org_id: Database ID of the organization.
        scrape_log_id: ID of the scrape_logs entry.
    """
    # Determine severity based on how far below expected
    percentage_of_expected = dogs_found / historical_average if historical_average > 0 else 0

    if percentage_of_expected < 0.1:  # Less than 10% of expected
        severity = "critical"
        level = "error"
    elif percentage_of_expected < 0.3:  # Less than 30% of expected
        severity = "high"
        level = "error"
    elif percentage_of_expected < 0.5:  # Less than 50% of expected
        severity = "medium"
        level = "warning"
    else:
        severity = "low"
        level = "warning"

    with sentry_sdk.new_scope() as scope:
        scope.set_tag("scraper.organization", org_name)
        scope.set_tag("scraper.alert_type", "partial_failure")
        scope.set_tag("scraper.error_severity", severity)
        scope.set_level(level)

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
                "percentage_of_expected": percentage_of_expected,
                "severity": severity,
            },
        )

        sentry_sdk.capture_message(
            f"Partial failure for {org_name}: found {dogs_found} dogs, expected ~{historical_average:.0f}",
            level=level,
            scope=scope,
        )

    log_func = logger.error if level == "error" else logger.warning
    log_func(f"Sent partial-failure alert for {org_name}: {dogs_found}/{historical_average:.0f} ({severity})")


def alert_llm_enrichment_failure(
    org_name: str,
    batch_size: int,
    failed_count: int,
    error_message: str | None = None,
    org_id: int | None = None,
) -> None:
    """Send a Sentry warning when LLM enrichment fails for multiple dogs.

    Args:
        org_name: Name of the organization.
        batch_size: Number of dogs in the LLM batch.
        failed_count: Number of dogs that failed LLM enrichment.
        error_message: Optional error message describing the failure.
        org_id: Database ID of the organization.
    """
    with sentry_sdk.new_scope() as scope:
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
            scope=scope,
        )

    logger.warning(f"Sent LLM failure alert for {org_name}: {failed_count}/{batch_size} failed")


@contextmanager
def scrape_transaction(org_name: str, org_id: int | None = None):
    """Context manager for tracking scrape duration as a Sentry transaction.

    Usage:
        with scrape_transaction("Dogs Trust", org_id=5) as transaction:
            # ... scraping code ...
            transaction.set_data("dogs_found", 150)
            # If partial failure occurred:
            transaction.set_data("had_alerts", True)

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
            # Set status to "ok" - partial failures are tracked via separate alerts
            # (Removed internal _data access that was fragile and SDK-version dependent)
            transaction.set_status("ok")
        except Exception as e:
            transaction.set_status("internal_error")
            transaction.set_data("error", str(e))
            raise


def add_scrape_breadcrumb(
    message: str,
    category: str = "scraper",
    level: str = "info",
    data: dict[str, Any] | None = None,
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
