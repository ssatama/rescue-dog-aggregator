"""
File System Integrity Tests - Cross-Platform File Structure Validation

These tests validate the integrity of the file system structure across
both frontend and backend, catching configuration drift and missing files.
"""

import os
from pathlib import Path
from typing import Dict, List

import pytest

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent.parent
FRONTEND_ROOT = PROJECT_ROOT / "frontend"


@pytest.mark.api
@pytest.mark.database
@pytest.mark.filesystem
@pytest.mark.integration
@pytest.mark.security
@pytest.mark.slow
class TestProjectStructureIntegrity:
    """Test overall project structure and organization"""

    def test_project_has_required_top_level_structure(self):
        """Ensure project has all required top-level directories"""
        required_dirs = [
            "api",  # Backend API
            "frontend",  # Next.js frontend
            "configs",  # Configuration files
            "database",  # Database scripts and migrations
            "scrapers",  # Web scrapers
            "utils",  # Shared utilities
            "tests",  # Backend tests
            "docs",  # Documentation
        ]

        missing_dirs = []
        for dir_name in required_dirs:
            dir_path = PROJECT_ROOT / dir_name
            if not dir_path.exists():
                missing_dirs.append(dir_name)

        if missing_dirs:
            pytest.fail(f"Missing required top-level directories: {missing_dirs}")

    def test_documentation_files_exist(self):
        """Ensure critical documentation files exist"""
        required_docs = ["README.md", "CLAUDE.md", "TESTING.md"]  # AI assistant instructions  # Testing documentation

        missing_docs = []
        for doc in required_docs:
            doc_path = PROJECT_ROOT / doc
            if not doc_path.exists():
                missing_docs.append(doc)

        if missing_docs:
            pytest.fail(f"Missing required documentation: {missing_docs}")

    def test_configuration_directory_structure(self):
        """Validate configuration directory structure"""
        configs_dir = PROJECT_ROOT / "configs"

        # Should have organizations and schemas subdirectories
        required_subdirs = ["organizations", "schemas"]
        missing_subdirs = []

        for subdir in required_subdirs:
            subdir_path = configs_dir / subdir
            if not subdir_path.exists():
                missing_subdirs.append(subdir)

        if missing_subdirs:
            pytest.fail(f"Missing config subdirectories: {missing_subdirs}")

        # Should have at least one organization config
        org_configs = list((configs_dir / "organizations").glob("*.yaml"))
        assert len(org_configs) > 0, "No organization config files found"

        # Should have schema file
        schema_file = configs_dir / "schemas" / "organization.schema.json"
        assert schema_file.exists(), "Organization schema file missing"


class TestBackendFileIntegrity:
    """Test backend file structure and integrity"""

    def test_api_directory_structure(self):
        """Validate API directory structure"""
        api_dir = PROJECT_ROOT / "api"

        required_files = ["main.py", "dependencies.py"]  # FastAPI main application  # Dependency injection

        required_dirs = ["models", "routes"]  # Pydantic models  # API route handlers

        missing_files = []
        for file_name in required_files:
            file_path = api_dir / file_name
            if not file_path.exists():
                missing_files.append(f"api/{file_name}")

        missing_dirs = []
        for dir_name in required_dirs:
            dir_path = api_dir / dir_name
            if not dir_path.exists():
                missing_dirs.append(f"api/{dir_name}")

        all_missing = missing_files + missing_dirs
        if all_missing:
            pytest.fail(f"Missing API structure: {all_missing}")

    def test_database_directory_structure(self):
        """Validate database directory structure"""
        db_dir = PROJECT_ROOT / "database"

        required_files = ["schema.sql", "db_setup.py"]  # Database schema  # Database setup script

        optional_dirs = ["migrations", "archive"]  # Database migrations  # Archived database scripts

        missing_files = []
        for file_name in required_files:
            file_path = db_dir / file_name
            if not file_path.exists():
                missing_files.append(f"database/{file_name}")

        if missing_files:
            pytest.fail(f"Missing database files: {missing_files}")

    def test_scrapers_directory_structure(self):
        """Validate scrapers directory structure"""
        scrapers_dir = PROJECT_ROOT / "scrapers"

        # Should have base_scraper.py
        base_scraper = scrapers_dir / "base_scraper.py"
        assert base_scraper.exists(), "base_scraper.py missing"

        # Should have at least one scraper subdirectory (exclude development artifacts)
        excluded_dirs = {"__pycache__", ".pytest_cache", ".git", "node_modules", ".DS_Store"}
        scraper_dirs = [d for d in scrapers_dir.iterdir() if d.is_dir() and not d.name.startswith(".") and d.name not in excluded_dirs]

        assert len(scraper_dirs) > 0, "No scraper implementations found"

        # Each scraper directory should have required files
        for scraper_dir in scraper_dirs:
            required_files = ["__init__.py"]

            # Should have a scraper implementation
            scraper_files = list(scraper_dir.glob("*scraper*.py"))
            if len(scraper_files) == 0:
                pytest.fail(f"No scraper implementation in {scraper_dir.name}")

    def test_utils_directory_structure(self):
        """Validate utils directory structure"""
        utils_dir = PROJECT_ROOT / "utils"

        critical_utils = ["db_connection.py", "config_loader.py"]  # Database utilities  # Configuration loading

        missing_utils = []
        for util_file in critical_utils:
            util_path = utils_dir / util_file
            if not util_path.exists():
                missing_utils.append(f"utils/{util_file}")

        if missing_utils:
            pytest.fail(f"Missing critical utilities: {missing_utils}")

    def test_tests_directory_structure(self):
        """Validate tests directory structure"""
        tests_dir = PROJECT_ROOT / "tests"

        # Should mirror main application structure
        expected_test_dirs = ["api", "config", "database", "scrapers", "utils"]

        missing_test_dirs = []
        for test_dir in expected_test_dirs:
            test_dir_path = tests_dir / test_dir
            if not test_dir_path.exists():
                missing_test_dirs.append(f"tests/{test_dir}")

        if missing_test_dirs:
            pytest.fail(f"Missing test directories: {missing_test_dirs}")


class TestFrontendFileIntegrity:
    """Test frontend file structure and integrity"""

    def test_frontend_directory_exists(self):
        """Ensure frontend directory exists"""
        assert FRONTEND_ROOT.exists(), "Frontend directory missing"

    def test_nextjs_configuration_files(self):
        """Validate Next.js configuration files"""
        required_config_files = [
            "package.json",  # Node.js dependencies
            "next.config.js",  # Next.js configuration
            "tailwind.config.js",  # Tailwind CSS configuration
            "tsconfig.json",  # TypeScript configuration
        ]

        missing_configs = []
        for config_file in required_config_files:
            config_path = FRONTEND_ROOT / config_file
            if not config_path.exists():
                missing_configs.append(config_file)

        if missing_configs:
            pytest.fail(f"Missing frontend config files: {missing_configs}")

    def test_nextjs_app_directory_structure(self):
        """Validate Next.js App Router directory structure"""
        app_dir = FRONTEND_ROOT / "src" / "app"

        if not app_dir.exists():
            pytest.fail("Next.js app directory missing")

        # Should have root layout and page
        # Note: we removed page.js duplicate
        required_root_files = ["layout.js", "page.jsx"]

        missing_root_files = []
        for file_name in required_root_files:
            file_path = app_dir / file_name
            if not file_path.exists():
                # Check for alternative extensions
                alternatives = [
                    app_dir / f"{file_name.split('.')[0]}.js",
                    app_dir / f"{file_name.split('.')[0]}.jsx",
                    app_dir / f"{file_name.split('.')[0]}.ts",
                    app_dir / f"{file_name.split('.')[0]}.tsx",
                ]

                if not any(alt.exists() for alt in alternatives):
                    missing_root_files.append(file_name)

        if missing_root_files:
            pytest.fail(f"Missing root app files: {missing_root_files}")

    def test_components_directory_structure(self):
        """Validate components directory structure"""
        components_dir = FRONTEND_ROOT / "src" / "components"

        if not components_dir.exists():
            pytest.fail("Components directory missing")

        # Should have organized subdirectories
        expected_component_dirs = ["ui", "layout", "dogs", "error"]  # UI components  # Layout components  # Dog-related components  # Error handling components

        missing_component_dirs = []
        for comp_dir in expected_component_dirs:
            comp_dir_path = components_dir / comp_dir
            if not comp_dir_path.exists():
                missing_component_dirs.append(f"components/{comp_dir}")

        if missing_component_dirs:
            pytest.fail(f"Missing component directories: {missing_component_dirs}")

    def test_services_and_utils_structure(self):
        """Validate services and utilities structure"""
        src_dir = FRONTEND_ROOT / "src"

        required_dirs = ["services", "utils"]  # API service layer  # Utility functions

        missing_dirs = []
        for dir_name in required_dirs:
            dir_path = src_dir / dir_name
            if not dir_path.exists():
                missing_dirs.append(f"src/{dir_name}")

        if missing_dirs:
            pytest.fail(f"Missing frontend directories: {missing_dirs}")

    def test_frontend_tests_structure(self):
        """Validate frontend test structure"""
        tests_dir = FRONTEND_ROOT / "src" / "__tests__"

        if not tests_dir.exists():
            pytest.fail("Frontend tests directory missing")

        # Should have organized test categories
        expected_test_dirs = [
            "build",  # Build validation tests (NEW)
            "integration",  # Integration tests
            "security",  # Security tests
            "performance",  # Performance tests
            "accessibility",  # Accessibility tests
        ]

        missing_test_dirs = []
        for test_dir in expected_test_dirs:
            test_dir_path = tests_dir / test_dir
            if not test_dir_path.exists():
                missing_test_dirs.append(f"__tests__/{test_dir}")

        # In CI environment, some directories may not exist due to different build process
        import os

        if os.environ.get("CI") and missing_test_dirs == ["__tests__/build"]:
            pytest.skip("Skipping build directory check in CI environment")

        if missing_test_dirs:
            pytest.fail(f"Missing frontend test directories: {missing_test_dirs}")


class TestCriticalFileConflicts:
    """Test for file conflicts that could cause build issues"""

    def test_no_duplicate_page_files(self):
        """Ensure no duplicate page files exist (the issue we just fixed)"""
        app_dir = FRONTEND_ROOT / "src" / "app"

        if not app_dir.exists():
            pytest.skip("Frontend app directory not found")

        conflicts = self._find_page_file_conflicts(app_dir)

        if conflicts:
            conflict_descriptions = []
            for route, files in conflicts.items():
                conflict_descriptions.append(f"Route '{route}': {', '.join(files)}")

            pytest.fail(f"Duplicate page file conflicts found:\n" + "\n".join(conflict_descriptions))

    def test_no_conflicting_extensions(self):
        """Ensure no conflicting file extensions in critical directories"""
        critical_dirs = [FRONTEND_ROOT / "src" / "app", FRONTEND_ROOT / "src" / "components", PROJECT_ROOT / "api", PROJECT_ROOT / "utils"]

        conflicts = []
        for dir_path in critical_dirs:
            if dir_path.exists():
                dir_conflicts = self._find_extension_conflicts(dir_path)
                conflicts.extend(dir_conflicts)

        if conflicts:
            conflict_descriptions = [f"{c['path']}: {', '.join(c['extensions'])}" for c in conflicts]
            pytest.fail(f"File extension conflicts found:\n" + "\n".join(conflict_descriptions))

    def test_no_python_import_conflicts(self):
        """Ensure no Python import conflicts in backend"""
        python_dirs = [PROJECT_ROOT / "api", PROJECT_ROOT / "utils", PROJECT_ROOT / "scrapers"]

        conflicts = []
        for dir_path in python_dirs:
            if dir_path.exists():
                conflicts.extend(self._find_python_name_conflicts(dir_path))

        if conflicts:
            pytest.fail(f"Python import conflicts found: {conflicts}")

    def _find_page_file_conflicts(self, app_dir: Path) -> Dict[str, List[str]]:
        """Find conflicting page files in Next.js app directory"""
        conflicts = {}

        def scan_directory(current_dir: Path, route_path: str = ""):
            try:
                entries = list(current_dir.iterdir())
            except (PermissionError, OSError):
                return

            page_files = []
            for entry in entries:
                # Use Path methods for cross-platform compatibility
                if entry.is_file() and entry.name.startswith("page."):
                    page_files.append(entry.name)
                elif entry.is_dir() and not entry.name.startswith("."):
                    child_route = f"{route_path}/{entry.name}" if route_path else entry.name
                    scan_directory(entry, child_route)

            if len(page_files) > 1:
                route = route_path if route_path else "/"
                conflicts[route] = page_files

        scan_directory(app_dir)
        return conflicts

    def _find_extension_conflicts(self, directory: Path) -> List[Dict]:
        """Find files with conflicting extensions"""
        conflicts = []
        file_basenames = {}

        for file_path in directory.rglob("*"):
            if file_path.is_file() and not file_path.name.startswith("."):
                basename = file_path.stem
                extension = file_path.suffix
                relative_dir = file_path.parent.relative_to(directory)

                key = (relative_dir, basename)
                if key not in file_basenames:
                    file_basenames[key] = []
                file_basenames[key].append(extension)

        # Find conflicts
        for (rel_dir, basename), extensions in file_basenames.items():
            if len(extensions) > 1:
                # Check for problematic conflicts
                problematic = False
                if ".js" in extensions and ".jsx" in extensions:
                    problematic = True
                elif ".ts" in extensions and ".tsx" in extensions:
                    problematic = True

                if problematic:
                    conflicts.append({"path": str(rel_dir / basename), "extensions": extensions})

        return conflicts

    def _find_python_name_conflicts(self, directory: Path) -> List[str]:
        """Find Python module name conflicts within the same namespace"""
        conflicts = []
        # Track modules by their namespace (directory)
        namespace_modules = {}

        # Exclude development artifact directories
        excluded_dirs = {"__pycache__", ".pytest_cache", ".git", "node_modules", "venv", "htmlcov"}

        for py_file in directory.rglob("*.py"):
            # Skip development artifacts and __init__.py files
            if py_file.name == "__init__.py":
                continue

            # Skip if in excluded directories
            if any(excluded in py_file.parts for excluded in excluded_dirs):
                continue

            # Get the namespace (immediate parent directory)
            namespace = py_file.parent
            module_name = py_file.stem

            if namespace not in namespace_modules:
                namespace_modules[namespace] = set()

            if module_name in namespace_modules[namespace]:
                conflicts.append(f"Duplicate module name '{module_name}' in {namespace}")
            else:
                namespace_modules[namespace].add(module_name)

        return conflicts


# Test markers for pytest
pytestmark = pytest.mark.filesystem
