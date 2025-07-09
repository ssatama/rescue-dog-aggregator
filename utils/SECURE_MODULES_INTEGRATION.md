# Secure Modules Integration Guide

This guide shows how to integrate the new secure modules into existing code.

## Summary of Changes

All modules have been refactored to follow CLAUDE.md principles:
- **Immutable data structures** (frozen dataclasses)
- **Pure functions** (no side effects)
- **Context managers** (automatic resource management)
- **Dependency injection** (clean architecture)
- **Early returns** (simplified control flow)
- **Performance optimizations** (caching, connection pooling)

## Updated Modules

### 1. Database Connection (`db_connection.py`)
**Before:**
```python
import psycopg2
conn = psycopg2.connect(**conn_params)  # Security risk
```

**After:**
```python
from utils.db_connection import get_db_cursor, DatabaseConfig

# Secure connection with validation
config = DatabaseConfig(host="localhost", user="user", database="db")
rows = execute_query("SELECT * FROM table WHERE id = %s", (id,))
```

### 2. Scraper Loading (`secure_scraper_loader.py`)
**Before:**
```python
import importlib
module = importlib.import_module(module_path)  # Security risk
```

**After:**
```python
from utils.secure_scraper_loader import SecureScraperLoader, ScraperModuleInfo

loader = SecureScraperLoader()
module_info = ScraperModuleInfo(
    module_path="scrapers.pets_turkey.dogs_scraper",
    class_name="DogsScraper"
)
scraper = loader.create_scraper_instance(module_info, "pets-turkey")
```

### 3. File Handling (`secure_file_handler.py`)
**Before:**
```python
# Path traversal vulnerability
file_path = f"/uploads/{filename}"  # Dangerous
```

**After:**
```python
from utils.secure_file_handler import SecureFileHandler, FileValidationConfig

config = FileValidationConfig(
    allowed_extensions={".jpg", ".png"},
    max_file_size=1024*1024,
    allowed_directories={"/tmp/uploads"}
)
handler = SecureFileHandler(config)
if handler.validate_file_path(file_path):
    # Safe to process
```

### 4. Standardization (`optimized_standardization.py`)
**Before:**
```python
def apply_standardization(data):
    result = data.copy()  # Still mutable
    # ... modify result
    return result
```

**After:**
```python
from utils.optimized_standardization import standardize_animal_data

# Returns immutable StandardizedAnimal
result = standardize_animal_data(data)
dict_result = result.to_dict()  # Convert to dict if needed
```

### 5. Organization Sync (`organization_sync_service.py`)
**Before:**
```python
# Multiple database connections, mixed concerns
def sync_organization():
    conn1 = psycopg2.connect(...)
    conn2 = psycopg2.connect(...)
    # ... complex logic
```

**After:**
```python
from utils.organization_sync_service import OrganizationSyncService

# Clean dependency injection
sync_service = OrganizationSyncService(logo_service)
result = sync_service.sync_single_organization(config)
```

## Migration Strategy

1. **Gradual Migration**: New secure modules are backward compatible
2. **Test Coverage**: Comprehensive tests ensure reliability
3. **Performance**: Caching and connection pooling improve speed
4. **Security**: All vulnerabilities addressed

## Example Usage

```python
# Complete secure workflow
from utils.db_connection import DatabaseConfig
from utils.secure_scraper_loader import SecureScraperLoader
from utils.secure_file_handler import create_image_file_handler
from utils.optimized_standardization import standardize_animal_data
from utils.organization_sync_service import create_default_sync_service

# 1. Secure database config
db_config = DatabaseConfig(
    host="localhost",
    user="rescue_user", 
    database="rescue_dogs"
)

# 2. Secure scraper loading
loader = SecureScraperLoader()
# Only allowed modules can be loaded

# 3. Secure file handling
file_handler = create_image_file_handler()
if file_handler.validate_file_path(image_path):
    # Process image safely

# 4. Immutable standardization
animal_data = {"name": "Buddy", "breed": "labrador"}
standardized = standardize_animal_data(animal_data)
# Original data unchanged, result is immutable

# 5. Clean organization sync
sync_service = create_default_sync_service()
result = sync_service.sync_single_organization(config)
```

## Security Improvements

✅ **SQL Injection Prevention**: Parameterized queries with validation
✅ **Path Traversal Protection**: Sandboxed file operations
✅ **Dynamic Import Security**: Whitelist-based module loading
✅ **XSS Prevention**: URL validation and sanitization
✅ **Connection Pooling**: Prevents resource exhaustion
✅ **Memory Leak Prevention**: Cached regex compilation

## Performance Improvements

✅ **Connection Pooling**: Reuse database connections
✅ **Regex Caching**: Pre-compiled patterns with LRU cache
✅ **Function Caching**: @lru_cache for expensive operations
✅ **Immutable Structures**: Efficient memory usage
✅ **Early Returns**: Reduced computational overhead

All modules are production-ready and follow CLAUDE.md principles strictly.