import json
import logging
from pathlib import Path
from typing import Dict, List, Optional

import jsonschema
import yaml
from jsonschema import validate

from utils.config_models import OrganizationConfig

# Make CONFIG_DIR available as module-level variable for testing
CONFIG_DIR = Path(__file__).parent.parent / "configs"

# Type alias for configuration dictionary
ConfigDict = Dict[str, OrganizationConfig]


class ConfigLoadError(Exception):
    """Raised when config file cannot be loaded."""

    pass


class ConfigValidationError(Exception):
    """Raised when config validation fails."""

    pass


class ConfigLoader:
    """Loads and manages organization configurations."""

    def __init__(self, config_dir: Optional[Path] = None):
        """Initialize the config loader.

        Args:
            config_dir: Path to config directory, uses default if None
        """
        # Use module-level CONFIG_DIR if not specified
        self.config_dir = (config_dir or CONFIG_DIR) / "organizations"
        self.schema_dir = (config_dir or CONFIG_DIR) / "schemas"
        self.logger = logging.getLogger(__name__)
        self._config_cache: ConfigDict = {}
        self._schema_cache: Optional[dict] = None  # Initialize schema cache

    def _load_schema(self) -> dict:
        """Load and cache the JSON schema."""
        if self._schema_cache is None:
            schema_file = self.schema_dir / "organization.schema.json"
            if schema_file.exists():
                with open(schema_file, "r", encoding="utf-8") as f:
                    self._schema_cache = json.load(f)
            else:
                # Fallback: basic schema if file doesn't exist
                self._schema_cache = {
                    "type": "object",
                    "properties": {
                        "schema_version": {"type": "string"},
                        "id": {"type": "string"},
                        "name": {"type": "string"},
                        "enabled": {"type": "boolean"},
                        "scraper": {"type": "object"},
                        "metadata": {"type": "object"},
                    },
                    "required": ["id", "name", "scraper"],
                }
        return self._schema_cache

    def _validate_against_schema(self, config_data: dict, config_file: Path) -> None:
        """Validate config data against JSON schema."""
        try:
            schema = self._load_schema()
            validate(instance=config_data, schema=schema)
            self.logger.debug(f"Schema validation passed for {config_file}")
        except jsonschema.ValidationError as e:
            raise ConfigValidationError(f"Schema validation failed for {config_file}: {e.message}")
        except Exception as e:
            self.logger.warning(f"Schema validation error for {config_file}: {e}")

    def _load_yaml_file(self, file_path: Path) -> dict:
        """Load and parse a YAML configuration file."""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                config_data = yaml.safe_load(f)

            if not isinstance(config_data, dict):
                raise ConfigValidationError(f"Config file {file_path} must contain a YAML object, not {type(config_data)}")

            self.logger.debug(f"Loaded YAML from {file_path}")
            return config_data

        except yaml.YAMLError as e:
            raise ConfigLoadError(f"YAML parsing error in {file_path}: {e}")

    def _validate_config_id(self, config_data: dict, expected_id: str, config_file: Path) -> None:
        """Validate that config ID matches filename."""
        actual_id = config_data.get("id")
        if actual_id != expected_id:
            raise ValueError(f"Config ID '{actual_id}' does not match filename '{expected_id}' in {config_file}")

    def _validate_schema_version(self, config_data: dict, config_file: Path) -> None:
        """Validate schema version is supported."""
        schema_version = config_data.get("schema_version", "1.0")
        supported_versions = ["1.0"]

        if schema_version not in supported_versions:
            raise ValueError(f"Unsupported schema version '{schema_version}' in {config_file}. " f"Supported versions: {supported_versions}")

    def load_config(self, org_id: str) -> OrganizationConfig:
        """Load a single organization configuration by ID.

        Args:
            org_id: Organization ID (should match filename without extension)

        Returns:
            OrganizationConfig object

        Raises:
            ConfigLoadError: If config cannot be loaded
            ConfigValidationError: If config validation fails
        """
        config_file = self.config_dir / f"{org_id}.yaml"

        if not config_file.exists():
            raise ConfigLoadError(f"Config file not found for organization '{org_id}': {config_file}")

        # Load and parse YAML
        config_data = self._load_yaml_file(config_file)

        # Validate schema version first
        self._validate_schema_version(config_data, config_file)

        # Validate against JSON schema
        self._validate_against_schema(config_data, config_file)

        # Validate config ID matches filename
        self._validate_config_id(config_data, org_id, config_file)

        # Create and validate Pydantic model
        try:
            config = OrganizationConfig(**config_data)
            self.logger.info(f"Successfully loaded config for organization '{org_id}'")
            return config
        except Exception as e:
            raise ConfigValidationError(f"Pydantic validation failed for {config_file}: {e}")

    def load_all_configs(self, force_reload: bool = False) -> ConfigDict:
        """Load all organization configurations.

        Args:
            force_reload: If True, reload configs from disk

        Returns:
            Dictionary mapping org_id to OrganizationConfig
        """
        if not force_reload and self._config_cache:
            return self._config_cache

        configs: ConfigDict = {}

        if not self.config_dir.exists():
            self.logger.warning(f"Config directory does not exist: {self.config_dir}")
            return configs

        for config_file in self.config_dir.glob("*.yaml"):
            org_id = config_file.stem
            try:
                config = self.load_config(org_id)
                configs[org_id] = config
            except Exception as e:
                self.logger.error(f"Failed to load config for {org_id}: {e}")
                continue

        self._config_cache = configs
        self.logger.info(f"Loaded {len(configs)} organization configurations")
        return configs

    def get_enabled_orgs(self) -> List[OrganizationConfig]:
        """Get list of enabled organizations.

        Returns:
            List of enabled OrganizationConfig objects
        """
        all_configs = self.load_all_configs()
        enabled = [config for config in all_configs.values() if config.enabled]

        self.logger.info(f"Found {len(enabled)} enabled organizations out of {len(all_configs)} total")
        return enabled

    def reload_config(self, org_id: str) -> OrganizationConfig:
        """Reload a specific configuration from disk.

        Args:
            org_id: Organization ID to reload

        Returns:
            Reloaded OrganizationConfig object
        """
        # Remove from cache
        if org_id in self._config_cache:
            del self._config_cache[org_id]

        # Load fresh from disk
        return self.load_config(org_id)

    def validate_all_configs(self) -> Dict[str, List[str]]:
        """Validate all configurations and return warnings.

        Returns:
            Dictionary mapping org_id to list of warnings
        """
        all_configs = self.load_all_configs()
        validation_results = {}

        for org_id, config in all_configs.items():
            warnings = config.validate_business_rules()
            if warnings:
                validation_results[org_id] = warnings

        return validation_results
