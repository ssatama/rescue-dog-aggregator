import logging
import os
from contextlib import contextmanager
from typing import Optional
from urllib.parse import urlparse

from sqlalchemy import Engine, create_engine, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session, sessionmaker

logger = logging.getLogger(__name__)

# Global engine cache to prevent resource leaks
_railway_engine_cache: Optional[Engine] = None


def get_railway_database_url() -> str:
    url = os.getenv("RAILWAY_DATABASE_URL")
    if not url:
        raise ValueError("RAILWAY_DATABASE_URL environment variable not set")

    if not _is_valid_postgresql_url(url):
        raise ValueError("Invalid database URL format")

    return url


def _is_valid_postgresql_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        return (
            parsed.scheme in ("postgresql", "postgres") and parsed.hostname is not None
        )
    except Exception:
        return False


def get_railway_engine() -> Engine:
    """Get Railway database engine with caching to prevent resource leaks."""
    global _railway_engine_cache

    # Return cached engine if it exists and is still valid
    if _railway_engine_cache is not None:
        try:
            # Test if engine is still valid
            with _railway_engine_cache.connect() as conn:
                conn.execute(text("SELECT 1"))
            return _railway_engine_cache
        except Exception:
            # Engine is no longer valid, dispose and recreate
            _railway_engine_cache.dispose()
            _railway_engine_cache = None

    # Create new engine
    database_url = get_railway_database_url()
    timeout = int(os.getenv("RAILWAY_CONNECTION_TIMEOUT", "30"))

    _railway_engine_cache = create_engine(
        database_url,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=3600,
        connect_args={"connect_timeout": timeout, "options": "-c timezone=UTC"},
        echo=False,
    )

    return _railway_engine_cache


def get_railway_session() -> Session:
    """Get Railway database session using cached engine."""
    engine = get_railway_engine()
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()


def dispose_railway_engine():
    """Dispose of cached engine - useful for testing and cleanup."""
    global _railway_engine_cache
    if _railway_engine_cache is not None:
        _railway_engine_cache.dispose()
        _railway_engine_cache = None


def check_railway_connection() -> bool:
    try:
        engine = get_railway_engine()
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except OperationalError as e:
        logger.error(f"Railway connection failed: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error checking Railway connection: {e}")
        return False


class RailwayConnectionManager:
    def __init__(self):
        self.session: Optional[Session] = None

    def __enter__(self) -> Session:
        self.session = get_railway_session()
        return self.session

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            if exc_type:
                self.session.rollback()
                logger.error(f"Railway session rolled back due to: {exc_val}")
            else:
                self.session.commit()
            self.session.close()


@contextmanager
def railway_session():
    with RailwayConnectionManager() as session:
        yield session
