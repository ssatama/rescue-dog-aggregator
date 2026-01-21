"""
Secure file handling with path validation and sandboxing.
Follows CLAUDE.md principles: immutable data, pure functions, early returns.
"""

import logging
import os
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class FileValidationConfig:
    """Immutable file validation configuration."""

    allowed_extensions: set[str]
    max_file_size: int  # in bytes
    allowed_directories: set[str]

    def __post_init__(self):
        """Validate configuration."""
        if not self.allowed_extensions:
            raise ValueError("At least one allowed extension is required")

        if self.max_file_size <= 0:
            raise ValueError("Max file size must be positive")

        if not self.allowed_directories:
            raise ValueError("At least one allowed directory is required")


class SecureFileHandler:
    """Secure file handler with path validation and sandboxing."""

    def __init__(self, config: FileValidationConfig):
        self.config = config
        self._normalized_allowed_dirs = self._normalize_directories(config.allowed_directories)

    def _normalize_directories(self, directories: set[str]) -> set[Path]:
        """Normalize and resolve allowed directories."""
        normalized = set()

        for dir_path in directories:
            try:
                normalized_path = Path(dir_path).resolve()
                if normalized_path.exists() and normalized_path.is_dir():
                    normalized.add(normalized_path)
                else:
                    logger.warning(f"Directory does not exist or is not a directory: {dir_path}")
            except Exception as e:
                logger.warning(f"Failed to normalize directory path {dir_path}: {e}")

        return normalized

    def validate_file_path(self, file_path: str | Path) -> bool:
        """Validate file path against security rules."""
        if not file_path:
            return False

        try:
            # Convert to Path object and resolve
            path = Path(file_path).resolve()

            # Check if file exists
            if not path.exists():
                logger.warning(f"File does not exist: {file_path}")
                return False

            # Check if it's a file (not directory)
            if not path.is_file():
                logger.warning(f"Path is not a file: {file_path}")
                return False

            # Check file extension
            if path.suffix.lower() not in self.config.allowed_extensions:
                logger.warning(f"File extension not allowed: {path.suffix}")
                return False

            # Check file size
            if path.stat().st_size > self.config.max_file_size:
                logger.warning(f"File too large: {path.stat().st_size} bytes")
                return False

            # Check if file is within allowed directories
            if not self._is_path_in_allowed_directory(path):
                logger.warning(f"File not in allowed directory: {file_path}")
                return False

            return True

        except Exception as e:
            logger.error(f"Error validating file path {file_path}: {e}")
            return False

    def _is_path_in_allowed_directory(self, path: Path) -> bool:
        """Check if path is within allowed directories."""
        try:
            for allowed_dir in self._normalized_allowed_dirs:
                if path.is_relative_to(allowed_dir):
                    return True
            return False
        except Exception:
            return False

    def validate_url(self, url: str) -> bool:
        """Validate URL format and scheme."""
        if not url:
            return False

        try:
            parsed = urlparse(url)

            # Check scheme
            if parsed.scheme not in {"http", "https"}:
                logger.warning(f"Invalid URL scheme: {parsed.scheme}")
                return False

            # Check netloc (domain)
            if not parsed.netloc:
                logger.warning("URL missing domain")
                return False

            # Basic validation against common attack patterns
            if any(pattern in url.lower() for pattern in ["javascript:", "data:", "file:"]):
                logger.warning(f"Potentially dangerous URL pattern detected: {url}")
                return False

            return True

        except Exception as e:
            logger.error(f"Error validating URL {url}: {e}")
            return False

    def sanitize_filename(self, filename: str) -> str:
        """Sanitize filename to prevent path traversal."""
        if not filename:
            return ""

        # Remove path components
        filename = os.path.basename(filename)

        # Remove dangerous characters
        dangerous_chars = ["<", ">", ":", '"', "/", "\\", "|", "?", "*", "\0"]
        for char in dangerous_chars:
            filename = filename.replace(char, "_")

        # Remove leading/trailing dots and spaces
        filename = filename.strip(". ")

        # Limit length
        if len(filename) > 255:
            name, ext = os.path.splitext(filename)
            filename = name[: 255 - len(ext)] + ext

        return filename

    def get_secure_upload_path(self, base_dir: str, filename: str) -> Path | None:
        """Get secure path for file upload."""
        if not filename:
            return None

        try:
            # Normalize base directory
            base_path = Path(base_dir).resolve()

            # Check if base directory is allowed
            if base_path not in self._normalized_allowed_dirs:
                logger.warning(f"Base directory not allowed: {base_dir}")
                return None

            # Sanitize filename
            safe_filename = self.sanitize_filename(filename)
            if not safe_filename:
                logger.warning(f"Filename could not be sanitized: {filename}")
                return None

            # Create full path
            full_path = base_path / safe_filename

            # Ensure the path is still within the base directory after normalization
            if not full_path.resolve().is_relative_to(base_path):
                logger.warning(f"Path traversal attempt detected: {filename}")
                return None

            return full_path

        except Exception as e:
            logger.error(f"Error creating secure upload path: {e}")
            return None


# Pre-configured handlers for common use cases
def create_image_file_handler() -> SecureFileHandler:
    """Create file handler for image uploads."""
    config = FileValidationConfig(
        allowed_extensions={".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"},
        max_file_size=10 * 1024 * 1024,  # 10MB
        allowed_directories={
            "/tmp/uploads",
            "/var/uploads",
            str(Path.home() / "uploads"),
        },
    )
    return SecureFileHandler(config)


def create_config_file_handler() -> SecureFileHandler:
    """Create file handler for configuration files."""
    config = FileValidationConfig(
        allowed_extensions={".yaml", ".yml", ".json"},
        max_file_size=1024 * 1024,  # 1MB
        allowed_directories={
            str(Path(__file__).parent.parent / "configs"),
        },
    )
    return SecureFileHandler(config)


def validate_image_path(file_path: str) -> bool:
    """Validate image file path."""
    handler = create_image_file_handler()
    return handler.validate_file_path(file_path)


def validate_config_path(file_path: str) -> bool:
    """Validate configuration file path."""
    handler = create_config_file_handler()
    return handler.validate_file_path(file_path)


def validate_url_format(url: str) -> bool:
    """Validate URL format."""
    handler = create_image_file_handler()  # URL validation is same for all handlers
    return handler.validate_url(url)


class FileValidationError(Exception):
    """Raised when file validation fails."""

    pass
