"""
Organization configuration loader for LLM profiling.

Following CLAUDE.md principles:
- Pure functions, no mutations
- Clear data contracts
- Configuration-driven design
"""

import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml

logger = logging.getLogger(__name__)


@dataclass
class PromptTemplate:
    """Prompt template for an organization."""

    system_prompt: str
    user_prompt: str
    examples: List[Dict[str, str]]


@dataclass
class OrganizationConfig:
    """Configuration for an organization's LLM profiling."""

    organization_id: int
    organization_name: str
    prompt_file: str
    source_language: str = "en"
    target_language: str = "en"
    model_preference: str = "google/gemini-3-flash-preview"
    enabled: bool = True

    def __post_init__(self):
        """Post-initialization validation."""
        # Allow environment override for model
        model_override = os.environ.get("LLM_MODEL_OVERRIDE")
        if model_override:
            self.model_preference = model_override


class OrganizationConfigLoader:
    """Loads and manages organization configurations."""

    def __init__(self, config_dir: Optional[str] = None):
        """
        Initialize the config loader.

        Args:
            config_dir: Directory containing configuration files.
                       Defaults to configs/organizations/
        """
        self.config_dir = Path(config_dir or "configs/organizations")
        self.prompt_dir = Path("prompts/organizations")
        self._config_cache: Dict[int, OrganizationConfig] = {}
        self._prompt_cache: Dict[str, PromptTemplate] = {}

    def load_config(self, organization_id: int) -> Optional[OrganizationConfig]:
        """
        Load configuration for a specific organization.

        Args:
            organization_id: The organization ID to load config for

        Returns:
            OrganizationConfig if found, None otherwise
        """
        # Check cache first
        if organization_id in self._config_cache:
            return self._config_cache[organization_id]

        # Load config map
        config_map = self._load_config_map()

        # Find organization config
        org_key = str(organization_id)
        if org_key not in config_map:
            logger.warning(f"No configuration found for organization {organization_id}")
            return None

        org_data = config_map[org_key]

        # Validate required fields
        if "prompt_file" not in org_data:
            raise ValueError(f"Missing prompt_file for organization {organization_id}")

        # Create config object
        config = OrganizationConfig(
            organization_id=organization_id,
            organization_name=org_data.get("name", f"Organization {organization_id}"),
            prompt_file=org_data["prompt_file"],
            source_language=org_data.get("source_language", "en"),
            target_language=org_data.get("target_language", "en"),
            model_preference=org_data.get(
                "model_preference", "google/gemini-3-flash-preview"
            ),
            enabled=org_data.get("enabled", True),
        )

        # Cache and return
        self._config_cache[organization_id] = config
        return config

    def load_all_configs(self) -> List[OrganizationConfig]:
        """
        Load all available organization configurations.

        Returns:
            List of all organization configs
        """
        config_map = self._load_config_map()
        configs = []

        for org_id_str in config_map:
            try:
                org_id = int(org_id_str)
                config = self.load_config(org_id)
                if config:
                    configs.append(config)
            except (ValueError, TypeError) as e:
                logger.error(f"Invalid organization ID {org_id_str}: {e}")

        return configs

    def load_prompt_template(self, prompt_file: str) -> Optional[PromptTemplate]:
        """
        Load prompt template from file.

        Args:
            prompt_file: Name of the prompt file

        Returns:
            PromptTemplate if found, None otherwise
        """
        # Check cache first
        if prompt_file in self._prompt_cache:
            return self._prompt_cache[prompt_file]

        prompt_path = self.prompt_dir / prompt_file

        if not prompt_path.exists():
            logger.warning(f"Prompt file not found: {prompt_path}")
            return None

        try:
            with open(prompt_path, "r") as f:
                data = yaml.safe_load(f)

            template = PromptTemplate(
                system_prompt=data.get("system_prompt", ""),
                user_prompt=data.get("user_prompt", ""),
                examples=data.get("examples", []),
            )

            # Cache and return
            self._prompt_cache[prompt_file] = template
            return template

        except Exception as e:
            logger.error(f"Failed to load prompt template {prompt_file}: {e}")
            return None

    def get_supported_organizations(self) -> List[int]:
        """
        Get list of organization IDs with configurations.

        Returns:
            List of organization IDs
        """
        config_map = self._load_config_map()
        org_ids = []

        for org_id_str in config_map:
            try:
                org_ids.append(int(org_id_str))
            except ValueError:
                continue

        return sorted(org_ids)

    def reload(self) -> None:
        """Force reload of all configurations."""
        self._config_cache.clear()
        self._prompt_cache.clear()
        logger.info("Configuration cache cleared")

    def _load_config_map(self) -> Dict[str, Dict[str, Any]]:
        """
        Load the organization configuration map from YAML file.

        Returns:
            Dictionary mapping organization IDs to their configs

        Raises:
            ValueError: If config file is missing or invalid
        """
        yaml_config_path = Path("configs/llm_organizations.yaml")

        if not yaml_config_path.exists():
            raise ValueError(f"Configuration file not found: {yaml_config_path}")

        try:
            with open(yaml_config_path, "r") as f:
                data = yaml.safe_load(f)

            if not data or "organizations" not in data:
                raise ValueError(
                    "Invalid configuration file: missing 'organizations' key"
                )

            # Convert to expected format
            config_map = {}
            for org_id, org_config in data["organizations"].items():
                # Ensure org_id is string (as expected by current code)
                config_map[str(org_id)] = org_config

            if not config_map:
                raise ValueError("No organizations found in configuration file")

            logger.info(
                f"Loaded {len(config_map)} organization configs from {yaml_config_path}"
            )
            return config_map

        except yaml.YAMLError as e:
            raise ValueError(f"Failed to parse YAML configuration: {e}")
        except Exception as e:
            raise ValueError(f"Failed to load configuration: {e}")


# Singleton instance
_loader_instance: Optional[OrganizationConfigLoader] = None


def get_config_loader() -> OrganizationConfigLoader:
    """Get or create singleton config loader."""
    global _loader_instance

    if _loader_instance is None:
        _loader_instance = OrganizationConfigLoader()

    return _loader_instance
