# api/dependencies.py

import os
import sys
from typing import Generator
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import HTTPException

# Remove contextmanager import if no longer needed
# from contextlib import contextmanager
import logging  # Import logging

# Add project root to path so we can import config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import DB_CONFIG

logger = logging.getLogger(__name__)  # Setup logger for this module


# Keep the original get_db_connection if dogs_legacy_router uses it
def get_db_connection() -> Generator:
    """
    Create and yield a database connection for use in API endpoints.
    Connection is automatically closed after use.
    """
    conn = None
    try:
        # Build connection parameters
        conn_params = {
            "host": DB_CONFIG["host"],
            "user": DB_CONFIG["user"],
            "database": DB_CONFIG["database"],
        }
        if DB_CONFIG["password"]:
            conn_params["password"] = DB_CONFIG["password"]
        conn = psycopg2.connect(**conn_params)
        logger.debug(f"DB Connection opened: {id(conn)}")
        yield conn
    except psycopg2.Error as db_err:
        logger.error(f"Database connection error: {db_err}")
        raise HTTPException(
            status_code=500, detail=f"Database connection error: {db_err}"
        )
    except Exception as e:
        logger.exception(f"Internal server error during DB connection: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")
    finally:
        if conn:
            logger.debug(f"DB Connection closing: {id(conn)}")
            conn.close()


def get_db_cursor() -> Generator[RealDictCursor, None, None]:
    """
    Dependency that provides a database cursor (RealDictCursor).
    Manages connection, cursor, and transaction lifecycle.
    """
    conn = None
    cursor = None
    try:
        # Build connection parameters
        conn_params = {
            "host": DB_CONFIG["host"],
            "user": DB_CONFIG["user"],
            "database": DB_CONFIG["database"],
        }
        if DB_CONFIG["password"]:
            conn_params["password"] = DB_CONFIG["password"]

        conn = psycopg2.connect(**conn_params)
        logger.debug(f"Cursor Connection opened: {id(conn)}")
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        logger.debug(f"Cursor created: {id(cursor)} for connection {id(conn)}")
        yield cursor  # Provide the cursor to the endpoint

        # After the endpoint finishes successfully, commit changes
        logger.debug(f"Committing transaction for connection {id(conn)}")
        conn.commit()

    except psycopg2.Error as db_err:
        # Rollback on database error
        logger.error(f"Database error in dependency, rolling back: {db_err}")
        if conn:
            conn.rollback()
        raise HTTPException(
            status_code=500, detail=f"Database dependency error: {db_err}"
        )
    except Exception as e:
        # Rollback on any other error
        logger.exception(f"Unexpected error in dependency, rolling back: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(
            status_code=500, detail=f"Internal server error in dependency: {e}"
        )
    finally:
        # Ensure cursor and connection are closed regardless of success or error
        if cursor:
            logger.debug(f"Cursor closing: {id(cursor)}")
            cursor.close()
        if conn:
            logger.debug(f"Cursor Connection closing: {id(conn)}")
            conn.close()
