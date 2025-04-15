import os
import getpass
import logging
import sys  # <<< Import sys

# Configure basic logging if not already set up elsewhere
logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")
logger = logging.getLogger(__name__)  # Get logger for this module

# --- ADD: Safety Check ---
IS_TESTING = os.environ.get("TESTING") == "true"
logger.info(f"[config.py] TESTING environment variable detected: {IS_TESTING}")
# --- END ADD ---

# Get system username as the likely PostgreSQL user
system_user = getpass.getuser()
logger.info(f"[config.py] System user detected: {system_user}")

# Read environment variables
db_host_env = os.environ.get("DB_HOST")
db_name_env = os.environ.get("DB_NAME")
db_user_env = os.environ.get("DB_USER")
db_password_env = os.environ.get("DB_PASSWORD")

logger.info(f"[config.py] Reading environment variables:")
logger.info(f"[config.py]   DB_HOST from env: {db_host_env}")
logger.info(f"[config.py]   DB_NAME from env: {db_name_env}")
logger.info(f"[config.py]   DB_USER from env: {db_user_env}")
logger.info(
    f"[config.py]   DB_PASSWORD from env: {'******' if db_password_env else None}"
)

# Determine default database name based on TESTING flag
default_db_name = "test_rescue_dogs" if IS_TESTING else "rescue_dogs"
logger.info(f"[config.py] Default DB name based on TESTING flag: {default_db_name}")

# Database configuration
DB_CONFIG = {
    "host": db_host_env or "localhost",
    "database": db_name_env or default_db_name,  # <<< Use default_db_name
    "user": db_user_env
    or (
        "test_user" if IS_TESTING else system_user
    ),  # <<< Default user based on TESTING
    "password": db_password_env
    or ("test_password" if IS_TESTING else ""),  # <<< Default password based on TESTING
}

# --- ADD: Final Safety Check ---
# If TESTING is true, ensure the final database name is the test database.
# If TESTING is false, ensure the final database name is NOT the test database.
final_db_name = DB_CONFIG["database"]
logger.info(f"[config.py] Final DB_CONFIG constructed with database: {final_db_name}")

if IS_TESTING and final_db_name != "test_rescue_dogs":
    logger.error(
        f"CRITICAL SAFETY ERROR: TESTING is true but DB_CONFIG is set to '{final_db_name}' instead of 'test_rescue_dogs'. Aborting."
    )
    sys.exit(
        "CRITICAL SAFETY ERROR: Test environment configured to use non-test database."
    )  # Hard exit

if not IS_TESTING and final_db_name == "test_rescue_dogs":
    logger.warning(
        f"SAFETY WARNING: TESTING is false but DB_CONFIG is set to the test database '{final_db_name}'. Check environment."
    )
    # Allow non-test environment to connect to test DB if explicitly configured via env vars, but log warning.

# --- END ADD ---

# Log final config (excluding password for safety)
logger.info(f"[config.py] Final DB_CONFIG details:")
logger.info(f"[config.py]   host: {DB_CONFIG['host']}")
logger.info(f"[config.py]   database: {DB_CONFIG['database']}")
logger.info(f"[config.py]   user: {DB_CONFIG['user']}")
logger.info(f"[config.py]   password: {'******' if DB_CONFIG['password'] else 'None'}")
