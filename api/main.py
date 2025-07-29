# api/main.py
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

# Import routes
from api.routes import animals, monitoring, organizations

# Import CORS configuration
from config import (
    ALLOWED_ORIGINS,
    CORS_ALLOW_CREDENTIALS,
    CORS_ALLOW_HEADERS,
    CORS_ALLOW_METHODS,
    CORS_MAX_AGE,
    ENVIRONMENT,
)

# Create FastAPI app
app = FastAPI(
    title="Rescue Dog Aggregator API",
    description="API for accessing rescue dog data from various organizations",
    version="0.1.0",
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
        return response


# Add security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

# Log CORS configuration on startup
logger = logging.getLogger(__name__)
logger.info(f"CORS configured for {ENVIRONMENT} environment:")
logger.info(f"  Allowed origins: {ALLOWED_ORIGINS}")
logger.info(f"  Allow credentials: {CORS_ALLOW_CREDENTIALS}")
logger.info(f"  Allowed methods: {CORS_ALLOW_METHODS}")

# Include routers
app.include_router(animals.router, prefix="/api/animals", tags=["animals"])

app.include_router(organizations.router, prefix="/api/organizations", tags=["organizations"])

# Include monitoring routes (no prefix for health check compatibility)
app.include_router(monitoring.router, tags=["monitoring"])


@app.get("/", tags=["root"])
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Welcome to the Rescue Dog Aggregator API",
        "version": "0.1.0",
        "documentation": "/docs",
        "environment": ENVIRONMENT,  # Show current environment
    }
