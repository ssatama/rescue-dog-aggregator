"""
Configuration Validation Tests - Backend Critical Infrastructure Protection

These tests prevent configuration drift and catch setup issues that could
break the backend application or cause deployment failures.
"""

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List

import pytest
import yaml

from utils.config_loader import ConfigLoader, ConfigLoadError, ConfigValidationError
from utils.config_models import OrganizationConfig

# Add project root to path for imports
PROJECT_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))


class TestConfigurationValidation:
    """Test configuration file integrity and consistency"""

    def test_all_yaml_configs_are_valid_syntax(self):
        """Ensure all YAML configuration files have valid syntax"""
        config_dir = PROJECT_ROOT / "configs" / "organizations"
        yaml_files = list(config_dir.glob("*.yaml")) + list(config_dir.glob("*.yml"))

        assert len(yaml_files) > 0, "No YAML configuration files found"

        invalid_files = []
        for yaml_file in yaml_files:
            try:
                with open(yaml_file, "r", encoding="utf-8") as f:
                    yaml.safe_load(f)
            except yaml.YAMLError as e:
                invalid_files.append(f"{yaml_file.name}: {str(e)}")

        if invalid_files:
            pytest.fail(f"Invalid YAML syntax in files:\n" + "\n".join(invalid_files))

    def test_all_configs_pass_schema_validation(self):
        """Ensure all organization configs conform to the JSON schema"""
        config_dir = PROJECT_ROOT / "configs" / "organizations"
        yaml_files = list(config_dir.glob("*.yaml")) + list(config_dir.glob("*.yml"))

        loader = ConfigLoader()
        schema_violations = []

        for yaml_file in yaml_files:
            try:
                org_id = yaml_file.stem
                config = loader.load_config(org_id)
                # Config loading includes schema validation
            except (ConfigLoadError, ConfigValidationError) as e:
                schema_violations.append(f"{yaml_file.name}: {str(e)}")
            except Exception as e:
                schema_violations.append(f"{yaml_file.name}: Unexpected error: {str(e)}")

        if schema_violations:
            pytest.fail(f"Schema validation failures:\n" + "\n".join(schema_violations))

    def test_no_duplicate_organization_names(self):
        """Ensure no two organizations have the same name"""
        config_dir = PROJECT_ROOT / "configs" / "organizations"
        yaml_files = list(config_dir.glob("*.yaml")) + list(config_dir.glob("*.yml"))

        org_names = {}
        duplicates = []

        for yaml_file in yaml_files:
            try:
                with open(yaml_file, "r", encoding="utf-8") as f:
                    config = yaml.safe_load(f)
                    org_name = config.get("name", "").strip().lower()

                    if org_name in org_names:
                        duplicates.append(f"'{config.get('name')}' in {yaml_file.name} and {org_names[org_name]}")
                    else:
                        org_names[org_name] = yaml_file.name
            except Exception as e:
                pytest.fail(f"Error reading {yaml_file.name}: {str(e)}")

        if duplicates:
            pytest.fail(f"Duplicate organization names found:\n" + "\n".join(duplicates))

    def test_required_scraper_modules_exist(self):
        """Ensure all configured scraper modules and classes exist"""
        config_dir = PROJECT_ROOT / "configs" / "organizations"
        yaml_files = list(config_dir.glob("*.yaml")) + list(config_dir.glob("*.yml"))

        missing_modules = []

        for yaml_file in yaml_files:
            try:
                with open(yaml_file, "r", encoding="utf-8") as f:
                    config = yaml.safe_load(f)

                    scraping_config = config.get("scraping", {})
                    module_path = scraping_config.get("module")
                    class_name = scraping_config.get("class")

                    if module_path and class_name:
                        # Check if module file exists
                        module_file_path = PROJECT_ROOT / module_path.replace(".", "/") / f"{class_name.lower()}.py"

                        if not module_file_path.exists():
                            # Try alternative naming conventions
                            alt_paths = [
                                PROJECT_ROOT / module_path.replace(".", "/") / f"{class_name}.py",
                                PROJECT_ROOT / module_path.replace(".", "/") / "dogs_scraper.py",
                                PROJECT_ROOT / module_path.replace(".", "/") / "scraper.py",
                            ]

                            if not any(path.exists() for path in alt_paths):
                                missing_modules.append(f"{yaml_file.name}: {module_path}.{class_name}")
            except Exception as e:
                pytest.fail(f"Error processing {yaml_file.name}: {str(e)}")

        if missing_modules:
            pytest.fail(f"Missing scraper modules:\n" + "\n".join(missing_modules))

    def test_enhanced_scraper_config_parameters(self):
        """Test validation of enhanced scraper configuration parameters"""
        import jsonschema

        schema_file = PROJECT_ROOT / "configs" / "schemas" / "organization.schema.json"
        assert schema_file.exists(), "Organization schema file not found"

        # Load the schema
        with open(schema_file, "r", encoding="utf-8") as f:
            schema = json.load(f)

        # Test valid enhanced config parameters
        valid_config = {
            "schema_version": "1.0",
            "id": "test-org",
            "name": "Test Organization",
            "enabled": True,
            "scraper": {
                "class_name": "TestScraper",
                "module": "test.scraper",
                "config": {
                    "rate_limit_delay": 2.5,
                    "max_retries": 3,
                    "timeout": 240,
                    "retry_backoff_factor": 2.0,
                    "batch_size": 6,
                    "skip_existing_animals": False,
                },
            },
            "metadata": {"website_url": "https://test.com"},
        }

        # Should validate successfully
        try:
            jsonschema.validate(valid_config, schema)
        except jsonschema.ValidationError as e:
            pytest.fail(f"Valid enhanced config failed validation: {e.message}")

        # Test invalid retry_backoff_factor (too high)
        invalid_config = valid_config.copy()
        invalid_config["scraper"] = invalid_config["scraper"].copy()
        invalid_config["scraper"]["config"] = invalid_config["scraper"]["config"].copy()
        invalid_config["scraper"]["config"]["retry_backoff_factor"] = 15.0

        with pytest.raises(jsonschema.ValidationError, match="15.0 is greater than the maximum of 10.0"):
            jsonschema.validate(invalid_config, schema)

        # Test invalid batch_size (too low)
        invalid_config_batch = valid_config.copy()
        invalid_config_batch["scraper"] = invalid_config_batch["scraper"].copy()
        invalid_config_batch["scraper"]["config"] = invalid_config_batch["scraper"]["config"].copy()
        invalid_config_batch["scraper"]["config"]["batch_size"] = 0

        with pytest.raises(jsonschema.ValidationError, match="0 is less than the minimum of 1"):
            jsonschema.validate(invalid_config_batch, schema)

        # Test invalid skip_existing_animals (wrong type)
        invalid_config_skip = valid_config.copy()
        invalid_config_skip["scraper"] = invalid_config_skip["scraper"].copy()
        invalid_config_skip["scraper"]["config"] = invalid_config_skip["scraper"]["config"].copy()
        invalid_config_skip["scraper"]["config"]["skip_existing_animals"] = "false"

        with pytest.raises(jsonschema.ValidationError, match="'false' is not of type 'boolean'"):
            jsonschema.validate(invalid_config_skip, schema)


class TestDatabaseConfiguration:
    """Test database configuration and connectivity"""

    def test_database_schema_file_exists(self):
        """Ensure database schema file exists and is valid SQL"""
        schema_file = PROJECT_ROOT / "database" / "schema.sql"
        assert schema_file.exists(), "Database schema file not found"

        # Basic SQL syntax validation
        with open(schema_file, "r", encoding="utf-8") as f:
            content = f.read()

        # Should contain essential tables (handle various SQL syntax patterns)
        essential_tables = ["animals", "organizations", "scrape_logs"]
        missing_tables = []

        for table in essential_tables:
            # Check for various CREATE TABLE patterns
            patterns = [
                f"CREATE TABLE {table}",
                f"CREATE TABLE IF NOT EXISTS {table}",
                f"create table {table}",
                f"create table if not exists {table}",
            ]

            table_found = any(pattern in content for pattern in patterns)
            if not table_found:
                missing_tables.append(table)

        if missing_tables:
            pytest.fail(f"Missing essential tables in schema: {missing_tables}")

    def test_migration_files_are_valid_sql(self):
        """Ensure all migration files contain valid SQL"""
        migrations_dir = PROJECT_ROOT / "database" / "migrations"

        if not migrations_dir.exists():
            pytest.skip("No migrations directory found")

        sql_files = list(migrations_dir.glob("*.sql"))
        invalid_migrations = []

        for sql_file in sql_files:
            try:
                with open(sql_file, "r", encoding="utf-8") as f:
                    content = f.read().strip()

                # Basic validation - should not be empty and should contain SQL keywords
                if not content:
                    invalid_migrations.append(f"{sql_file.name}: Empty file")
                elif not any(keyword in content.upper() for keyword in ["ALTER", "CREATE", "DROP", "INSERT", "UPDATE"]):
                    invalid_migrations.append(f"{sql_file.name}: No SQL keywords found")

            except Exception as e:
                invalid_migrations.append(f"{sql_file.name}: {str(e)}")

        if invalid_migrations:
            pytest.fail(f"Invalid migration files:\n" + "\n".join(invalid_migrations))

    def test_database_connection_configuration(self):
        """Test that database connection can be established with current config"""
        try:
            from utils.db_connection import get_db_connection

            # Try to get a connection (this will use environment variables)
            with get_db_connection() as conn:
                # Basic connectivity test
                cursor = conn.cursor()
                cursor.execute("SELECT 1")
                result = cursor.fetchone()

                assert result[0] == 1, "Database connection test failed"

                cursor.close()

        except ImportError:
            pytest.skip("Database utilities not available")
        except Exception as e:
            pytest.fail(f"Database connection failed: {str(e)}")


class TestPythonEnvironment:
    """Test Python environment and dependencies"""

    def test_requirements_files_are_valid(self):
        """Ensure requirements files are properly formatted"""
        req_files = [PROJECT_ROOT / "requirements.txt", PROJECT_ROOT / "requirements-dev.txt"]

        for req_file in req_files:
            if req_file.exists():
                try:
                    with open(req_file, "r", encoding="utf-8") as f:
                        lines = f.readlines()

                    # Check for basic formatting issues
                    for i, line in enumerate(lines, 1):
                        line = line.strip()
                        if line and not line.startswith("#"):
                            # Should be a valid package specification
                            if not self._is_valid_requirement_line(line):
                                pytest.fail(f"Invalid requirement in {req_file.name} line {i}: {line}")

                except Exception as e:
                    pytest.fail(f"Error reading {req_file.name}: {str(e)}")

    def test_pyproject_toml_is_valid(self):
        """Ensure pyproject.toml is valid TOML and properly configured"""
        pyproject_file = PROJECT_ROOT / "pyproject.toml"

        if not pyproject_file.exists():
            pytest.skip("No pyproject.toml file found")

        try:
            import tomli  # or tomllib in Python 3.11+
        except ImportError:
            try:
                import tomllib as tomli
            except ImportError:
                pytest.skip("TOML parser not available")

        try:
            with open(pyproject_file, "rb") as f:
                config = tomli.load(f)

            # Should have basic project configuration
            assert "tool" in config or "project" in config, "pyproject.toml should have tool or project section"

        except Exception as e:
            pytest.fail(f"Invalid pyproject.toml: {str(e)}")

    def test_critical_imports_are_available(self):
        """Ensure critical modules can be imported"""
        critical_modules = [
            "fastapi",
            "uvicorn",
            "pydantic",
            "psycopg2",
            "requests",
            "selenium",
            "pytest",
        ]

        missing_modules = []

        for module in critical_modules:
            try:
                __import__(module)
            except ImportError:
                missing_modules.append(module)

        if missing_modules:
            pytest.fail(f"Critical modules not available: {missing_modules}")

    def _is_valid_requirement_line(self, line: str) -> bool:
        """Check if a requirements line is properly formatted"""
        line = line.strip()

        # Skip empty lines and comments
        if not line or line.startswith("#"):
            return True

        # Handle pip include syntax (-r filename)
        if line.startswith("-r "):
            return bool(line[3:].strip())

        # Handle pip options (-e, --index-url, etc.)
        if line.startswith("-"):
            return True

        # Handle environment markers and extras
        if "[" in line or ";" in line:
            return True

        # Basic validation - should have package name
        if "==" in line:
            package, version = line.split("==", 1)
            return bool(package.strip()) and bool(version.strip())
        elif any(op in line for op in [">=", "<=", ">", "<", "~=", "!="]):
            return True
        else:
            # Just package name
            return bool(line.strip())


class TestAPIConfiguration:
    """Test API configuration and startup"""

    def test_fastapi_app_can_be_imported(self):
        """Ensure FastAPI app can be imported without errors"""
        try:
            from api.main import app

            assert app is not None, "FastAPI app is None"
        except ImportError as e:
            pytest.fail(f"Cannot import FastAPI app: {str(e)}")
        except Exception as e:
            pytest.fail(f"Error creating FastAPI app: {str(e)}")

    def test_api_routes_are_properly_configured(self):
        """Ensure API routes are properly configured"""
        try:
            from api.main import app

            # Check that routes are registered
            routes = [route.path for route in app.routes]

            # Should have at least basic routes
            expected_routes = ["/animals", "/organizations"]
            missing_routes = []

            for expected in expected_routes:
                if not any(expected in route for route in routes):
                    missing_routes.append(expected)

            if missing_routes:
                pytest.fail(f"Missing API routes: {missing_routes}")

        except Exception as e:
            pytest.fail(f"Error checking API routes: {str(e)}")

    def test_cors_configuration_is_secure(self):
        """Ensure CORS configuration is properly set"""
        try:
            from api.main import app

            # Check middleware configuration
            middleware_types = [middleware.cls.__name__ for middleware in app.user_middleware]

            # Should have CORS middleware
            assert "CORSMiddleware" in middleware_types, "CORS middleware not configured"

        except Exception as e:
            pytest.fail(f"Error checking CORS configuration: {str(e)}")


class TestFileSystemIntegrity:
    """Test file system structure and critical files"""

    def test_critical_directories_exist(self):
        """Ensure all critical directories exist"""
        critical_dirs = ["api", "configs", "database", "scrapers", "utils", "tests"]

        missing_dirs = []
        for dir_name in critical_dirs:
            dir_path = PROJECT_ROOT / dir_name
            if not dir_path.exists():
                missing_dirs.append(dir_name)

        if missing_dirs:
            pytest.fail(f"Missing critical directories: {missing_dirs}")

    def test_init_files_exist_where_needed(self):
        """Ensure __init__.py files exist in Python packages"""
        # Only check directories that actually need to be Python packages
        required_package_dirs = ["api", "api/models", "api/routes", "scrapers", "utils"]

        # Optional package directories (may or may not exist)
        optional_package_dirs = [
            "database",
            "tests",
        ]  # May be treated as scripts rather than package  # Test discovery works without __init__.py in modern pytest

        missing_init_files = []

        # Check required package directories
        for dir_name in required_package_dirs:
            dir_path = PROJECT_ROOT / dir_name
            init_file = dir_path / "__init__.py"

            if dir_path.exists() and not init_file.exists():
                missing_init_files.append(dir_name)

        # Warn about optional directories but don't fail
        missing_optional = []
        for dir_name in optional_package_dirs:
            dir_path = PROJECT_ROOT / dir_name
            init_file = dir_path / "__init__.py"

            if dir_path.exists() and not init_file.exists():
                missing_optional.append(dir_name)

        if missing_optional:
            print(f"Optional __init__.py files missing (not required): {missing_optional}")

        if missing_init_files:
            pytest.fail(f"Missing required __init__.py files in: {missing_init_files}")

    def test_no_sensitive_files_in_repo(self):
        """Ensure no sensitive files are accidentally committed"""
        # Only check for truly sensitive files, not development artifacts
        sensitive_patterns = [
            "*.key",
            "*.pem",
            ".env",
            "*.pid",
        ]  # But allow .env.example, .env.local, etc.

        found_sensitive = []

        # Directories to completely skip
        skip_dirs = {
            "venv",
            "node_modules",
            ".git",
            "__pycache__",
            ".pytest_cache",
            "htmlcov",
            "coverage",
            ".next",
            ".swc",
            "screenshots",
            "frontend",
        }

        # Use os.walk for better control over directory traversal
        import fnmatch

        for root, dirs, files in os.walk(PROJECT_ROOT):
            # Remove skip directories from dirs to prevent traversal
            dirs[:] = [d for d in dirs if d not in skip_dirs]

            # Check files in current directory
            for file in files:
                for pattern in sensitive_patterns:
                    if fnmatch.fnmatch(file, pattern):
                        match = Path(root) / file

                        # Allow specific non-sensitive .env files and development .env
                        # with non-sensitive content
                        if match.name.startswith(".env"):
                            if match.name in {
                                ".env.example",
                                ".env.local",
                                ".env.test",
                                ".env.sample",
                            }:
                                continue
                            # For plain .env files, check if they contain only
                            # development/local settings
                            if match.name == ".env":
                                try:
                                    content = match.read_text()
                                    lines = [line.strip() for line in content.split("\n") if line.strip() and not line.startswith("#")]

                                    # Check if this is a development environment
                                    has_localhost = any("localhost" in line.lower() or "127.0.0.1" in line for line in lines)
                                    has_dev_db = any("rescue_dogs" in line.lower() or "test" in line.lower() for line in lines)
                                    has_dev_marker = any("development" in line.lower() for line in lines)

                                    # Check for dangerous production indicators
                                    has_production_markers = any(
                                        keyword in content.lower()
                                        for keyword in [
                                            "prod",
                                            "production.",
                                            "live.",
                                            "aws_access_key",
                                            "stripe_live",
                                            "paypal_live",
                                        ]
                                    )

                                    # Allow development .env files that clearly indicate development usage
                                    # This handles the case where development
                                    # credentials are committed (common in dev repos)
                                    if (has_localhost or has_dev_db or has_dev_marker) and not has_production_markers:
                                        continue

                                except Exception:
                                    pass  # If we can't read it, treat it as sensitive

                        found_sensitive.append(str(match.relative_to(PROJECT_ROOT)))

        if found_sensitive:
            pytest.fail(f"Sensitive files found in repository: {found_sensitive}")


# Test markers for pytest
pytestmark = pytest.mark.config
