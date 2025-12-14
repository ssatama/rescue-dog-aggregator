import logging
import os
from contextlib import contextmanager
from typing import Any, Dict, Optional

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration

logger = logging.getLogger(__name__)


def scrub_sensitive_data(event: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if "request" in event and "headers" in event["request"]:
        sensitive_headers = ["authorization", "cookie", "x-api-key"]
        for header in sensitive_headers:
            if header in event["request"]["headers"]:
                event["request"]["headers"][header] = "[REDACTED]"

    if "request" in event and "cookies" in event["request"]:
        event["request"]["cookies"] = "[REDACTED]"

    if "extra" in event:
        for key in list(event["extra"].keys()):
            if any(sensitive in key.lower() for sensitive in ["password", "token", "secret", "key"]):
                event["extra"][key] = "[REDACTED]"

    return event


def filter_transactions(event: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Filter out noisy transactions from performance monitoring."""
    transaction_name = event.get("transaction", "")

    # Skip health check and internal monitoring routes
    noisy_endpoints = [
        "/health",
        "/api/monitoring/health",
        "GET /health",
        "GET /api/monitoring/health",
    ]

    if transaction_name in noisy_endpoints:
        return None

    return event


def init_sentry(app_environment: str) -> None:
    dsn = os.getenv("SENTRY_DSN_BACKEND")

    # ONLY initialize Sentry in production
    if app_environment != "production":
        logger.info(f"Sentry disabled for {app_environment} environment - only enabled in production")
        return

    if not dsn:
        logger.warning("SENTRY_DSN_BACKEND not set for production environment")
        return

    logger.info("Initializing Sentry for production environment")

    sentry_sdk.init(
        dsn=dsn,
        environment=app_environment,
        integrations=[
            StarletteIntegration(
                transaction_style="endpoint",
                failed_request_status_codes=set(range(500, 600)),
            ),
            FastApiIntegration(
                transaction_style="endpoint",
                failed_request_status_codes=set(range(500, 600)),
            ),
            SqlalchemyIntegration(),
            LoggingIntegration(level=logging.INFO, event_level=logging.ERROR),
        ],
        traces_sample_rate=1.0,  # 100% sampling in production (low traffic)
        profiles_sample_rate=1.0,  # 100% CPU profiling in production
        profile_lifecycle="trace",
        attach_stacktrace=True,
        send_default_pii=False,
        before_send=scrub_sensitive_data,
        before_send_transaction=filter_transactions,  # Filter noisy transactions
        release=os.getenv("SENTRY_RELEASE", "unknown"),
        server_name=os.getenv("SERVER_NAME", "api"),
        max_breadcrumbs=50,
        enable_tracing=True,
    )

    with sentry_sdk.configure_scope() as scope:
        scope.set_tag("service", "backend-api")
        scope.set_tag("runtime", "python")
        scope.set_tag("environment", "production")


def handle_database_error(error: Exception, operation: str) -> None:
    with sentry_sdk.push_scope() as scope:
        scope.set_tag("database.operation", operation)
        scope.set_context("database", {"operation": operation, "error_type": type(error).__name__})
        sentry_sdk.capture_exception(error)


def handle_api_error(error: Exception, endpoint: str, method: str) -> None:
    with sentry_sdk.push_scope() as scope:
        scope.set_tag("api.endpoint", endpoint)
        scope.set_tag("api.method", method)
        scope.set_context("api", {"endpoint": endpoint, "method": method, "error_type": type(error).__name__})
        sentry_sdk.capture_exception(error)


def track_slow_query(query: str, duration_ms: float, threshold_ms: float = 3000) -> None:
    if duration_ms > threshold_ms:
        sentry_sdk.add_breadcrumb(
            category="database", message=f"Slow query detected: {duration_ms:.0f}ms", level="warning", data={"query": query[:500], "duration_ms": duration_ms, "threshold_ms": threshold_ms}
        )

        with sentry_sdk.push_scope() as scope:
            scope.set_tag("slow_query", "true")
            scope.set_extra("query_duration_ms", duration_ms)
            sentry_sdk.capture_message(f"Slow database query: {duration_ms:.0f}ms", level="warning")


@contextmanager
def create_transaction_span(name: str, op: str):
    with sentry_sdk.start_transaction(name=name, op=op) as transaction:
        yield transaction


@contextmanager
def monitor_endpoint(endpoint: str, method: str = "GET"):
    with sentry_sdk.start_transaction(name=f"{method} {endpoint}", op="http.server") as transaction:
        transaction.set_tag("http.method", method)
        transaction.set_tag("http.route", endpoint)
        try:
            yield transaction
        except Exception as e:
            transaction.set_status("internal_error")
            raise
        else:
            transaction.set_status("ok")
