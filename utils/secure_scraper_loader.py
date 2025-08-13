"""
Secure scraper loader with validated imports and dependency injection.
Follows CLAUDE.md principles: immutable data, pure functions, dependency injection.
"""

import importlib
import logging
import sys
from dataclasses import dataclass
from typing import Dict, Optional, Protocol, Set, Type

logger = logging.getLogger(__name__)


class ScraperProtocol(Protocol):
    """Protocol defining the expected scraper interface."""

    def __init__(self, config_id: str) -> None: ...

    def run(self) -> bool: ...


@dataclass(frozen=True)
class ScraperModuleInfo:
    """Immutable scraper module information."""

    module_path: str
    class_name: str

    def __post_init__(self):
        """Validate module info."""
        if not self.module_path or not self.class_name:
            raise ValueError("Module path and class name are required")

        if not self.module_path.startswith("scrapers."):
            raise ValueError("Module path must start with 'scrapers.'")


class SecureScraperLoader:
    """Secure scraper loader with import validation."""

    # Whitelist of allowed scraper modules
    ALLOWED_MODULES: Set[str] = {
        "scrapers.pets_turkey.dogs_scraper",
        "scrapers.happy_tails.dogs_scraper",
        "scrapers.base_scraper",
        "scrapers.animalrescuebosnia.animalrescuebosnia_scraper",
        "scrapers.daisy_family_rescue.dogs_scraper",
        "scrapers.misis_rescue.scraper",
        "scrapers.pets_in_turkey.dogs_scraper",
        "scrapers.pets_in_turkey.petsinturkey_scraper",
        "scrapers.rean.dogs_scraper",
        "scrapers.theunderdog.theunderdog_scraper",
        "scrapers.tierschutzverein_europa.dogs_scraper",
        "scrapers.woof_project.dogs_scraper",
        "scrapers.galgosdelsol.galgosdelsol_scraper",
        "scrapers.santerpawsbulgarianrescue.santerpawsbulgarianrescue_scraper",
        "scrapers.manytearsrescue.manytearsrescue_scraper",
        "scrapers.dogstrust.dogstrust_scraper",
        "scrapers.furryrescueitaly.furryrescueitaly_scraper",
        # Add new modules here as needed
    }

    def __init__(self, allowed_modules: Optional[Set[str]] = None):
        """Initialize with optional custom allowed modules."""
        self.allowed_modules = allowed_modules or self.ALLOWED_MODULES
        self._module_cache: Dict[str, Type] = {}

    def validate_module_path(self, module_path: str) -> bool:
        """Validate module path against whitelist."""
        if not module_path:
            return False

        if module_path not in self.allowed_modules:
            logger.warning(f"Module not in whitelist: {module_path}")
            return False

        return True

    def validate_class_name(self, class_name: str) -> bool:
        """Validate class name format."""
        if not class_name:
            return False

        if not class_name.isidentifier():
            logger.warning(f"Invalid class name format: {class_name}")
            return False

        # Additional validation: class name should end with "Scraper"
        if not class_name.endswith("Scraper"):
            logger.warning(f"Class name should end with 'Scraper': {class_name}")
            return False

        return True

    def load_scraper_class(self, module_info: ScraperModuleInfo) -> Type[ScraperProtocol]:
        """Load and validate scraper class."""
        # Check cache first
        cache_key = f"{module_info.module_path}.{module_info.class_name}"
        if cache_key in self._module_cache:
            return self._module_cache[cache_key]

        # Validate module path
        if not self.validate_module_path(module_info.module_path):
            raise SecurityError(f"Module not allowed: {module_info.module_path}")

        # Validate class name
        if not self.validate_class_name(module_info.class_name):
            raise ValueError(f"Invalid class name: {module_info.class_name}")

        try:
            # Ensure project root is in Python path before importing
            self._ensure_project_path()

            # Import module
            module = importlib.import_module(module_info.module_path)

            # Get class
            if not hasattr(module, module_info.class_name):
                raise AttributeError(f"Class '{module_info.class_name}' not found in module '{module_info.module_path}'")

            scraper_class = getattr(module, module_info.class_name)

            # Validate class implements expected interface
            if not self._validate_scraper_interface(scraper_class):
                raise TypeError(f"Class '{module_info.class_name}' does not implement expected scraper interface")

            # Cache the class
            self._module_cache[cache_key] = scraper_class

            logger.info(f"Successfully loaded scraper: {module_info.class_name} from {module_info.module_path}")
            return scraper_class

        except ImportError as e:
            logger.error(f"Failed to import module '{module_info.module_path}': {e}")
            raise
        except AttributeError as e:
            logger.error(f"Class '{module_info.class_name}' not found in module '{module_info.module_path}': {e}")
            raise

    def _validate_scraper_interface(self, scraper_class: Type) -> bool:
        """Validate that class implements expected scraper interface."""
        # Check if class has required methods
        required_methods = ["__init__", "run"]

        for method_name in required_methods:
            if not hasattr(scraper_class, method_name):
                logger.warning(f"Scraper class missing required method: {method_name}")
                return False

        return True

    def create_scraper_instance(self, module_info: ScraperModuleInfo, config_id: str) -> ScraperProtocol:
        """Create scraper instance with dependency injection."""
        scraper_class = self.load_scraper_class(module_info)

        try:
            # Create instance with config_id first
            instance = scraper_class(config_id=config_id)

            # Then inject the services after organization_id is known
            self._inject_services(instance)

            logger.info(f"Created scraper instance: {module_info.class_name} with config_id: {config_id}")
            return instance

        except Exception as e:
            logger.error(f"Failed to create scraper instance: {e}")
            raise

    def _inject_services(self, scraper_instance):
        """Inject services into scraper instance after organization_id is established."""
        try:
            from config import DB_CONFIG

            # CRITICAL FIX: Initialize global database pool FIRST with validation
            try:
                from utils.db_connection import create_database_config_from_env, initialize_database_pool

                db_config = create_database_config_from_env()
                global_pool = initialize_database_pool(db_config)
                if global_pool is None:
                    raise RuntimeError("Global database pool validation failed")
                logger.info("Global database pool initialized and validated successfully")
            except Exception as e:
                logger.error(f"CRITICAL: Global database pool initialization failed: {e}")
                raise RuntimeError(f"Global database pool validation failed: {e}") from e

            from services.connection_pool import ConnectionPoolService
            from services.database_service import DatabaseService
            from services.image_processing_service import ImageProcessingService
            from services.metrics_collector import MetricsCollector
            from services.session_manager import SessionManager

            # Create connection pool for shared database access
            connection_pool = None
            try:
                connection_pool = ConnectionPoolService(DB_CONFIG, min_connections=2, max_connections=25)
                logger.info("Service connection pool created successfully")
            except Exception as e:
                logger.error(f"CRITICAL: Connection pool creation failed: {e}")
                raise RuntimeError(f"Connection pool creation failed: {e}") from e

            # Create DatabaseService with connection pool
            database_service = DatabaseService(DB_CONFIG, connection_pool=connection_pool)
            if not connection_pool and not database_service.connect():
                logger.error("CRITICAL: DatabaseService connection failed")
                raise RuntimeError("DatabaseService connection failed - scraper cannot operate without database access")

            # Create ImageProcessingService (doesn't need DB_CONFIG - uses R2Service)
            image_processing_service = ImageProcessingService()

            # Create MetricsCollector (no dependencies)
            metrics_collector = MetricsCollector()

            # Create SessionManager with connection pool
            session_manager = SessionManager(DB_CONFIG, scraper_instance.organization_id, scraper_instance.skip_existing_animals, connection_pool=connection_pool)

            # Establish connection for SessionManager only if no connection pool
            if not connection_pool and not session_manager.connect():
                logger.error("CRITICAL: SessionManager connection failed")
                database_service.close()  # Clean up successful connection
                raise RuntimeError("SessionManager connection failed - scraper cannot track stale data without session management")

            # Store services for cleanup
            services_to_store = [database_service, session_manager]
            if connection_pool:
                services_to_store.append(connection_pool)
            scraper_instance._injected_services = services_to_store

            # Inject services into the scraper instance
            scraper_instance.database_service = database_service
            scraper_instance.image_processing_service = image_processing_service
            scraper_instance.session_manager = session_manager
            scraper_instance.metrics_collector = metrics_collector

            logger.info(f"Services successfully injected and connected for scraper instance (pool: {'enabled' if connection_pool else 'disabled'})")

        except Exception as e:
            logger.error(f"CRITICAL: Service injection failed: {e}")
            raise RuntimeError(f"Scraper cannot operate without database services: {e}") from e

    def get_allowed_modules(self) -> Set[str]:
        """Get copy of allowed modules (immutable)."""
        return self.allowed_modules.copy()

    def clear_cache(self):
        """Clear module cache (for testing)."""
        self._module_cache.clear()

    def _ensure_project_path(self):
        """Ensure project root is in Python path for module imports."""
        import os
        import sys

        # Calculate project root relative to this file
        current_file = os.path.abspath(__file__)
        utils_dir = os.path.dirname(current_file)
        project_root = os.path.dirname(utils_dir)

        # Always ensure project root is at the beginning of sys.path for proper import resolution
        if project_root in sys.path:
            # Remove it from its current position
            sys.path.remove(project_root)

        # Insert at the beginning
        sys.path.insert(0, project_root)
        logger.debug(f"Ensured project root is at beginning of Python path: {project_root}")


class SecurityError(Exception):
    """Raised when security validation fails."""

    pass


# Default global loader instance
_default_loader: Optional[SecureScraperLoader] = None


def get_scraper_loader() -> SecureScraperLoader:
    """Get global scraper loader instance."""
    global _default_loader
    if _default_loader is None:
        _default_loader = SecureScraperLoader()
    return _default_loader


def load_scraper_securely(module_path: str, class_name: str, config_id: str) -> ScraperProtocol:
    """Load scraper securely with validation."""
    loader = get_scraper_loader()
    module_info = ScraperModuleInfo(module_path, class_name)
    return loader.create_scraper_instance(module_info, config_id)


def add_allowed_module(module_path: str):
    """Add module to allowed list (for testing/development)."""
    loader = get_scraper_loader()
    loader.allowed_modules.add(module_path)
    logger.info(f"Added module to allowed list: {module_path}")
