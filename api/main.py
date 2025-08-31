# api/main.py
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

# Import database initialization
from api.database import initialize_pool

# Import cache headers middleware
from api.middleware.cache_headers import CacheHeadersMiddleware

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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifecycle - startup and shutdown.
    Initialize the connection pool on startup with retry logic.
    """
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


# Enhanced health check is now handled by monitoring routes


# Add CORS middleware with secure configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # Secure: Only allowed domains
    allow_credentials=CORS_ALLOW_CREDENTIALS,  # Configurable
    allow_methods=CORS_ALLOW_METHODS,  # Environment-specific
    allow_headers=CORS_ALLOW_HEADERS,  # Environment-specific
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

        # Add Content Security Policy (CSP) for additional XSS protection
        # Restrictive policy - only allow same-origin resources by default
        csp = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self'; "
            "connect-src 'self'; "
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
app.include_router(animals.router, prefix="/api/animals", tags=["animals"])

# Enhanced animals API for LLM data (router already has /api/animals prefix)
app.include_router(enhanced_animals.router, tags=["enhanced"])

app.include_router(organizations.router, prefix="/api/organizations", tags=["organizations"])

# Include monitoring routes (no prefix for health check compatibility)
app.include_router(monitoring.router, tags=["monitoring"])

# Include LLM routes
app.include_router(llm.router, tags=["llm"])

# Include swipe routes for the swipe feature
app.include_router(swipe.router, prefix="/api/dogs", tags=["swipe"])


@app.get("/", tags=["root"])
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Welcome to the Rescue Dog Aggregator API",
        "version": "0.1.0",
        "documentation": "/docs",
        "environment": ENVIRONMENT,  # Show current environment
    }
