"""Global Sentry middleware for comprehensive error and performance tracking."""

import logging
import os
import time
from typing import Callable

import sentry_sdk
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

logger = logging.getLogger(__name__)


class SentryPerformanceMiddleware(BaseHTTPMiddleware):
    """Middleware to track ALL endpoint performance and errors."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Wrap every request in a Sentry transaction."""

        # Only track in production
        environment = os.getenv("ENVIRONMENT", "development").lower()
        if environment != "production":
            # Skip Sentry tracking in non-production environments
            return await call_next(request)

        # Start transaction for EVERY endpoint in production
        with sentry_sdk.start_transaction(
            op="http.server",
            name=f"{request.method} {request.url.path}",
            source="route",
        ) as transaction:
            transaction.set_tag("http.method", request.method)
            transaction.set_tag("http.route", request.url.path)
            transaction.set_tag("http.host", request.url.hostname)

            # Track request start time
            start_time = time.time()

            try:
                # Process the request
                response = await call_next(request)

                # Track successful responses
                transaction.set_tag("http.status_code", response.status_code)

                if response.status_code >= 400:
                    transaction.set_status("http_error")

                    # Add breadcrumb for 404s to make them easier to track
                    if response.status_code == 404:
                        sentry_sdk.add_breadcrumb(
                            category="http",
                            message=f"404 Not Found: {request.url.path}",
                            level="warning",
                            data={"url": str(request.url), "method": request.method},
                        )
                else:
                    transaction.set_status("ok")

                return response

            except Exception as e:
                # Capture ALL unhandled exceptions
                transaction.set_status("internal_error")
                sentry_sdk.capture_exception(e)
                raise

            finally:
                # Track request duration
                duration = (time.time() - start_time) * 1000
                transaction.set_measurement(
                    "http.request.duration", duration, "millisecond"
                )

                # Alert on slow requests
                if duration > 3000:  # 3 seconds
                    sentry_sdk.add_breadcrumb(
                        category="performance",
                        message=f"Slow request: {request.url.path}",
                        level="warning",
                        data={
                            "duration_ms": duration,
                            "method": request.method,
                            "path": request.url.path,
                        },
                    )

                    if duration > 10000:  # 10 seconds is critical
                        sentry_sdk.capture_message(
                            f"Critical slow request: {request.method} {request.url.path} took {duration:.0f}ms",
                            level="error",
                        )


class SentryTimeoutMiddleware(BaseHTTPMiddleware):
    """Middleware to detect and report request timeouts."""

    def __init__(self, app: ASGIApp, timeout_seconds: int = 30):
        super().__init__(app)
        self.timeout_seconds = timeout_seconds

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Monitor for request timeouts."""

        # Only track in production
        environment = os.getenv("ENVIRONMENT", "development").lower()
        if environment != "production":
            # Skip timeout tracking in non-production environments
            return await call_next(request)

        import asyncio

        try:
            # Set a timeout for the request
            response = await asyncio.wait_for(
                call_next(request), timeout=self.timeout_seconds
            )
            return response

        except asyncio.TimeoutError:
            # Capture timeout as an error
            error_msg = f"Request timeout: {request.method} {request.url.path} exceeded {self.timeout_seconds}s"

            with sentry_sdk.push_scope() as scope:
                scope.set_tag("error.type", "timeout")
                scope.set_tag("timeout.seconds", self.timeout_seconds)
                scope.set_context(
                    "request",
                    {
                        "method": request.method,
                        "url": str(request.url),
                        "headers": dict(request.headers),
                    },
                )
                sentry_sdk.capture_message(error_msg, level="error")

            # Re-raise to let FastAPI handle it
            raise
