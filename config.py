import getpass
import logging
import os
import socket
import sys
from urllib.parse import urlparse

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# === ENVIRONMENT-BASED LOGGING CONFIGURATION ===
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO" if ENVIRONMENT == "development" else "WARNING")

# Configure logging based on environment
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL.upper()),
    format="%(levelname)s:%(name)s:%(message)s",
)

# Disable verbose logging in production
if ENVIRONMENT == "production":
    logging.getLogger("api.dependencies").setLevel(logging.WARNING)
    logging.getLogger("api.database").setLevel(logging.WARNING)
    logging.getLogger("api.database.connection_pool").setLevel(logging.WARNING)


def suppress_service_logging():
    """Suppress verbose operational logging from services for world-class scraper experience.

    This function silences routine operational logs from services (INFO/DEBUG level)
    while preserving error and warning logs. This creates a clean, professional
    logging experience focused on scraper progress and results.
    """
    service_loggers = [
        "services.database_service",
        "services.image_processing_service",
        "services.session_manager",
        "services.connection_pool",
        "services.metrics_collector",
        "utils.secure_scraper_loader",
        "utils.config_loader",
        "utils.organization_sync_service",
        "utils.db_connection",
        "WDM",  # WebDriver Manager
        "selenium",
    ]

    for service_name in service_loggers:
        service_logger = logging.getLogger(service_name)
        service_logger.setLevel(logging.WARNING)

    # Also suppress verbose config logging in scrapers
    config_logger = logging.getLogger(__name__)
    config_logger.setLevel(logging.WARNING)


def enable_world_class_scraper_logging():
    """Enable world-class scraper logging with centralized control.

    This function configures the logging system for an optimal scraper experience:
    - Suppresses verbose service operational logs
    - Preserves error and warning logs from all sources
    - Enables professional progress tracking through ProgressTracker
    """
    suppress_service_logging()

    # Ensure scraper loggers use appropriate levels
    scraper_logger = logging.getLogger("scraper")
    scraper_logger.setLevel(logging.INFO)  # Keep scraper progress logs


logger = logging.getLogger(__name__)

# --- ADD: Safety Check ---
IS_TESTING = os.environ.get("TESTING") == "true"
logger.debug(f"[config.py] TESTING environment variable detected: {IS_TESTING}")
# --- END ADD ---

# Get system username as the likely PostgreSQL user
system_user = getpass.getuser()
logger.debug(f"[config.py] System user detected: {system_user}")


def parse_database_url(url: str) -> dict:
    """Parse a DATABASE_URL into individual connection components.

    Supports both 'postgresql://' and 'postgres://' schemes.
    Returns dict with host, database, user, password, port.
    """
    parsed = urlparse(url)

    if parsed.scheme not in ("postgresql", "postgres"):
        raise ValueError(f"Invalid database URL scheme: {parsed.scheme}")

    return {
        "host": parsed.hostname or "localhost",
        "database": parsed.path.lstrip("/") if parsed.path else "rescue_dogs",
        "user": parsed.username or system_user,
        "password": parsed.password or "",
        "port": parsed.port or 5432,
    }


def get_database_config() -> dict:
    """Get database configuration from environment.

    Priority order:
    1. DATABASE_URL (Railway standard for main app)
    2. Individual DB_* environment variables
    3. Defaults based on TESTING flag

    Note: RAILWAY_DATABASE_URL is NOT used here - it's only for sync commands
    via services/railway/connection.py to avoid local DB pointing to Railway.
    """
    database_url = os.environ.get("DATABASE_URL")

    if database_url:
        logger.debug("[config.py] Using DATABASE_URL for database configuration")
        config = parse_database_url(database_url)
        return {
            "host": config["host"],
            "database": config["database"],
            "user": config["user"],
            "password": config["password"],
            "port": config["port"],
        }

    logger.debug("[config.py] Using individual DB_* environment variables")
    db_host_env = os.environ.get("DB_HOST")
    db_name_env = os.environ.get("DB_NAME")
    db_user_env = os.environ.get("DB_USER")
    db_password_env = os.environ.get("DB_PASSWORD")

    default_db_name = "test_rescue_dogs" if IS_TESTING else "rescue_dogs"

    return {
        "host": db_host_env or "localhost",
        "database": db_name_env or default_db_name,
        "user": db_user_env or ("test_user" if IS_TESTING else system_user),
        "password": db_password_env or ("test_password" if IS_TESTING else ""),
        "port": int(os.environ.get("DB_PORT", 5432)),
    }


# Read environment variables (legacy logging for backwards compatibility)
db_host_env = os.environ.get("DB_HOST")
db_name_env = os.environ.get("DB_NAME")
db_user_env = os.environ.get("DB_USER")
db_password_env = os.environ.get("DB_PASSWORD")

logger.debug("[config.py] Reading environment variables:")
logger.debug(f"[config.py]   DB_HOST from env: {db_host_env}")
logger.debug(f"[config.py]   DB_NAME from env: {db_name_env}")
logger.debug("[config.py]   DB_USER from env: [REDACTED]")
logger.debug(f"[config.py]   DB_PASSWORD from env: {'[SET]' if db_password_env else '[NOT SET]'}")

# Determine default database name based on TESTING flag
default_db_name = "test_rescue_dogs" if IS_TESTING else "rescue_dogs"
logger.info(f"[config.py] Default DB name based on TESTING flag: {default_db_name}")

# Database configuration - now supports DATABASE_URL for Railway
DB_CONFIG = get_database_config()

# --- ADD: Final Safety Check ---
final_db_name = DB_CONFIG["database"]
logger.info(f"[config.py] Final DB_CONFIG constructed with database: {final_db_name}")

if IS_TESTING and final_db_name != "test_rescue_dogs":
    logger.error(f"CRITICAL SAFETY ERROR: TESTING is true but DB_CONFIG is set to '{final_db_name}' instead of 'test_rescue_dogs'. Aborting.")
    sys.exit("CRITICAL SAFETY ERROR: Test environment configured to use non-test database.")

if not IS_TESTING and final_db_name == "test_rescue_dogs":
    logger.warning(f"SAFETY WARNING: TESTING is false but DB_CONFIG is set to the test database '{final_db_name}'. Check environment.")

# --- END ADD ---

# Log final config (excluding sensitive data for security)
logger.debug("[config.py] Final DB_CONFIG details:")
logger.debug(f"[config.py]   host: {DB_CONFIG['host']}")
logger.debug(f"[config.py]   database: {DB_CONFIG['database']}")
logger.debug("[config.py]   user: [REDACTED]")
logger.debug(f"[config.py]   password: {'[SET]' if DB_CONFIG['password'] else '[NOT SET]'}")

# === CORS Security Configuration ===
# ENVIRONMENT already defined above


def parse_cors_origins() -> list[str]:
    """Parse and validate ALLOWED_ORIGINS from environment variable."""
    origins_env = os.getenv("ALLOWED_ORIGINS", "")

    # Default origins based on environment
    if not origins_env:
        if ENVIRONMENT == "development":
            default_origins = [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:3001",  # Alternative port
            ]
            logger.warning(f"No ALLOWED_ORIGINS set in development. Using defaults: {default_origins}")
            return default_origins
        else:
            # Production requires explicit configuration
            raise ValueError("ALLOWED_ORIGINS must be set in production environment. Example: ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com")

    # Parse comma-separated origins
    origins = [origin.strip() for origin in origins_env.split(",") if origin.strip()]

    # Validate each origin
    validated_origins = []
    for origin in origins:
        if not (origin.startswith("http://") or origin.startswith("https://")):
            logger.error(f"Invalid origin format: {origin}. Must start with http:// or https://")
            continue

        # Warn about http:// in production
        if ENVIRONMENT == "production" and origin.startswith("http://"):
            logger.warning(f"HTTP origin in production is insecure: {origin}")

        validated_origins.append(origin)

    if not validated_origins:
        raise ValueError("No valid origins found in ALLOWED_ORIGINS")

    return validated_origins


# Parse CORS configuration
def get_local_ip():
    """Get the local network IP address."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return "localhost"


def get_dynamic_cors_origins():
    """Get CORS origins including dynamic local IP."""
    # Get base origins from environment
    base_origins = parse_cors_origins()

    # In development, add local network IP automatically
    if ENVIRONMENT == "development":
        local_ip = get_local_ip()
        logger.info(f"[config.py] Detected local IP: {local_ip}")

        network_origins = [
            f"http://{local_ip}:3000",
        ]

        # Add network origins if not already present
        for origin in network_origins:
            if origin not in base_origins:
                base_origins.append(origin)
                logger.info(f"[config.py] Added dynamic CORS origin: {origin}")
            else:
                logger.info(f"[config.py] CORS origin already exists: {origin}")

    logger.info(f"[config.py] Final CORS origins: {base_origins}")
    return base_origins


# Parse CORS configuration with dynamic IP support
ALLOWED_ORIGINS = get_dynamic_cors_origins()
CORS_ALLOW_CREDENTIALS = os.getenv("CORS_ALLOW_CREDENTIALS", "false").lower() == "true"

# CORS settings for different environments
if ENVIRONMENT == "production":
    # Stricter settings for production
    CORS_ALLOW_METHODS = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    CORS_ALLOW_HEADERS = [
        "Content-Type",
        "Authorization",
        "Accept",
        "Origin",
        "X-Requested-With",
        "sentry-trace",  # Enable Sentry distributed tracing
        "baggage",  # Enable Sentry trace context propagation
    ]
    CORS_MAX_AGE = 3600  # Cache preflight for 1 hour
else:
    # More permissive for development
    CORS_ALLOW_METHODS = ["*"]
    CORS_ALLOW_HEADERS = ["*"]
    CORS_MAX_AGE = 86400  # Cache preflight for 24 hours

# === Cloudinary Configuration (REMOVED - Using R2 instead) ===

# Log CORS configuration on startup (but not sensitive data)
logger.info(f"[config.py] Environment: {ENVIRONMENT}")
logger.info(f"[config.py] CORS allowed origins: {ALLOWED_ORIGINS}")
logger.info(f"[config.py] CORS credentials allowed: {CORS_ALLOW_CREDENTIALS}")
logger.info(f"[config.py] CORS methods: {CORS_ALLOW_METHODS}")
