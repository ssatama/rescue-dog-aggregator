import logging
import os
import time
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Dict

import psycopg2
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

# Import database initialization
from api.database import initialize_pool
from api.dependencies import get_database_connection

# Import middleware
from api.middleware.cache_headers import CacheHeadersMiddleware
from api.middleware.sentry_middleware import SentryTimeoutMiddleware  # Only keep timeout middleware

# Import Sentry monitoring
from api.monitoring import init_sentry

# Import routes
from api.routes import animals, enhanced_animals, llm, monitoring, organizations, swipe

# Import CORS configuration
from config import (
    ALLOWED_ORIGINS,
    CORS_ALLOW_CREDENTIALS,
    CORS_ALLOW_HEADERS,
    CORS_ALLOW_METHODS,
    CORS_MAX_AGE,
    ENVIRONMENT,
)

# Configure logging
logger = logging.getLogger(__name__)

# Initialize Sentry before creating the app
init_sentry(ENVIRONMENT)

# Verify Sentry initialization in production
if ENVIRONMENT == "production":
    import sentry_sdk

    if sentry_sdk.get_client().is_active():  # Fixed: Use modern API instead of deprecated Hub
        logger.info("✅ Sentry initialized successfully")
        # Only send test message if debug mode is enabled
        if os.getenv("SENTRY_DEBUG", "false").lower() == "true":
            sentry_sdk.capture_message("Backend API started - Sentry connection verified", level="info")
    else:
        logger.critical("❌ CRITICAL: Sentry initialization FAILED in production!")
        logger.critical("Continuing without Sentry - errors will only be logged locally")
        # Don't crash production - continue with local logging only
        # Consider setting a global flag to disable Sentry calls if needed


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifecycle - startup and shutdown.
    Initialize the connection pool on startup with retry logic.
    """
    import os
    import sys

    # Skip pool initialization for unit tests
    is_pytest = "pytest" in sys.modules
    is_unit_test = os.environ.get("PYTEST_CURRENT_TEST", "").find("unit") != -1 or os.environ.get("PYTEST_CURRENT_TEST", "").find("fast") != -1
    skip_pool = is_pytest and is_unit_test

    if skip_pool:
        logger.info("Skipping database pool initialization for unit tests")
        yield
        return

    # Startup
    logger.info("Starting application - initializing database connection pool")
    try:
        # Initialize the connection pool with retries
        initialize_pool(max_retries=3)
        logger.info("Database connection pool initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database connection pool: {e}")
        # Allow the app to start but log the error prominently
        # The pool will return proper error messages when accessed
        logger.warning("Application starting without database connection pool - database operations will fail")

    yield

    # Shutdown
    logger.info("Shutting down application - closing database connections")
    try:
        from api.database import get_connection_pool

        pool = get_connection_pool()
        pool.close_all()
        logger.info("Database connections closed successfully")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")


# Create FastAPI app with lifespan handler
app = FastAPI(
    title="Rescue Dog Aggregator API",
    description="API for accessing rescue dog data from various organizations",
    version="0.1.0",
    lifespan=lifespan,
)


# Add global exception handlers for comprehensive error tracking
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Capture ALL unhandled exceptions in Sentry."""
    import sentry_sdk

    # Capture the exception in Sentry
    sentry_sdk.capture_exception(exc)

    # Log it
    logger.error(f"Unhandled exception: {exc}", exc_info=True)

    # For test endpoints in non-production, preserve the original error message
    from fastapi.responses import JSONResponse

    # Check if this is a test endpoint and we're not in production
    if ENVIRONMENT != "production" and "/sentry-test/" in str(request.url):
        # Preserve the original error message for test endpoints
        return JSONResponse(status_code=500, content={"detail": str(exc)})

    # Return a generic error response for production and non-test endpoints
    return JSONResponse(status_code=500, content={"detail": "Internal server error occurred"})


# Sentry performance tracking is handled by FastApiIntegration - no need for custom middleware
# Only add timeout detection middleware for custom timeout handling
app.add_middleware(SentryTimeoutMiddleware, timeout_seconds=30)

# Add CORS middleware with secure configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # Secure: Only allowed domains
    allow_credentials=CORS_ALLOW_CREDENTIALS,  # Configurable
    allow_methods=CORS_ALLOW_METHODS,  # Environment-specific
    allow_headers=CORS_ALLOW_HEADERS,  # Environment-specific
    expose_headers=["sentry-trace", "baggage"],  # Enable distributed tracing
    max_age=CORS_MAX_AGE,  # Preflight cache duration
)


# Security Headers Middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(self, request, call_next):
        response = await call_next(request)
        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Build CSP with specific Sentry domain from environment
        sentry_connect_src = "'self'"
        sentry_dsn = os.getenv("SENTRY_DSN_BACKEND")
        if sentry_dsn and ENVIRONMENT == "production":
            try:
                # Extract the specific ingest domain from the DSN
                # DSN format: https://key@o12345.ingest.sentry.io/project_id
                from urllib.parse import urlparse

                parsed_dsn = urlparse(sentry_dsn)
                if parsed_dsn.hostname:
                    sentry_connect_src = f"'self' https://{parsed_dsn.hostname}"
            except Exception:
                # Fallback to wildcards if parsing fails
                sentry_connect_src = "'self' *.sentry.io *.ingest.sentry.io"

        # Add Content Security Policy (CSP) for additional XSS protection
        # Restrictive policy - only allow same-origin resources by default
        csp = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self'; "
            f"connect-src {sentry_connect_src}; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
        response.headers["Content-Security-Policy"] = csp

        return response


# Add security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

# Add cache headers middleware for intelligent caching
app.add_middleware(CacheHeadersMiddleware)

# Log CORS configuration on startup
logger = logging.getLogger(__name__)
logger.info(f"CORS configured for {ENVIRONMENT} environment:")
logger.info(f"  Allowed origins: {ALLOWED_ORIGINS}")
logger.info(f"  Allow credentials: {CORS_ALLOW_CREDENTIALS}")
logger.info(f"  Allowed methods: {CORS_ALLOW_METHODS}")

# Include routers
app.include_router(animals.router, prefix="/api/animals")
app.include_router(enhanced_animals.router, prefix="/api/animals")
app.include_router(organizations.router, prefix="/api/organizations")
app.include_router(swipe.router, prefix="/api/dogs")
app.include_router(llm.router, prefix="/api/llm")
app.include_router(monitoring.router, prefix="/api/monitoring")

# Include Sentry test endpoints (only in non-production environments)
if ENVIRONMENT != "production":
    from api.routes import sentry_test

    app.include_router(sentry_test.router, tags=["sentry-test"])
    logger.info(f"Sentry test endpoints enabled for {ENVIRONMENT} environment")


@app.get("/", tags=["root"])
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Welcome to the Rescue Dog Aggregator API",
        "version": "0.1.0",
        "documentation": "/docs",
        "environment": ENVIRONMENT,  # Show current environment
    }


@app.get("/health", tags=["health"])
async def health_check(db_conn=Depends(get_database_connection)):
    """
    Basic health check endpoint for load balancers and monitoring systems.

    Returns overall system health including database connectivity.
    This endpoint is public and does not require authentication.
    """
    try:
        # Test database connection
        db_start = time.time()
        cursor = db_conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        cursor.close()
        db_response_time = (time.time() - db_start) * 1000  # Convert to milliseconds

        db_status = {
            "status": "connected",
            "response_time_ms": round(db_response_time, 2),
        }

        # Determine overall health
        overall_status = "healthy"
        if db_response_time > 1000:  # More than 1 second
            overall_status = "degraded"

    except psycopg2.Error as db_err:
        logger.error(f"Health check database error: {db_err}")
        db_status = {"status": "error", "error": str(db_err), "response_time_ms": None}
        overall_status = "unhealthy"
    except Exception as e:
        logger.error(f"Health check unexpected error: {e}")
        db_status = {"status": "error", "error": str(e), "response_time_ms": None}
        overall_status = "unhealthy"

    return {
        "status": overall_status,
        "timestamp": datetime.now(),
        "version": "1.0.0",
        "database": db_status,
    }
