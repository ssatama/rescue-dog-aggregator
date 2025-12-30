"""
Prompt builder for LLM dog profiling.

Following CLAUDE.md principles:
- Single responsibility (prompt construction)
- Pure functions (no side effects)
- Immutable data (no mutations)
- Small file (<200 lines)
"""

import json
from pathlib import Path
from typing import Any, Dict

import yaml


class PromptBuilder:
    """Builder for constructing LLM prompts from dog data and templates."""

    def __init__(self, organization_id: int):
        """
        Initialize prompt builder with organization-specific template.

        Args:
            organization_id: Organization ID for template selection

        Raises:
            ValueError: If no template found for organization or org not enabled
            FileNotFoundError: If template file doesn't exist
        """
        self.organization_id = organization_id
        self.prompt_template = self._load_prompt_template(organization_id)

    def _load_prompt_template(self, org_id: int) -> Dict[str, Any]:
        """
        Load organization-specific prompt template from YAML using OrganizationConfigLoader.

        Args:
            org_id: Organization ID

        Returns:
            Prompt template dictionary

        Raises:
            ValueError: If no template found for organization or org not enabled
            FileNotFoundError: If template file doesn't exist
        """
        from services.llm.organization_config_loader import get_config_loader

        # Get config loader
        loader = get_config_loader()

        # Load organization config
        org_config = loader.load_config(org_id)
        if not org_config:
            raise ValueError(f"No configuration found for organization {org_id}")

        # Check if enabled (if the config has that field)
        template_path = (
            Path(__file__).parent.parent.parent
            / "prompts"
            / "organizations"
            / org_config.prompt_file
        )

        if not template_path.exists():
            raise FileNotFoundError(
                f"Prompt template not found: {template_path}. Organization {org_id} ({org_config.organization_name}) needs a prompt template to be created."
            )

        with open(template_path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)

    def build_prompt(self, dog_data: Dict[str, Any]) -> str:
        """
        Construct prompt with dog data.

        Args:
            dog_data: Dog information dictionary

        Returns:
            Formatted prompt string
        """
        # Extract properties as JSON string
        properties = dog_data.get("properties", {})
        if isinstance(properties, dict):
            properties_str = json.dumps(properties, ensure_ascii=False, indent=2)
        else:
            properties_str = str(properties)

        # Format the extraction prompt with dog data
        prompt = self.prompt_template["extraction_prompt"].format(
            name=dog_data.get("name", "Unknown"),
            breed=dog_data.get("breed", "Mixed Breed"),
            age_text=dog_data.get("age_text", "Unknown age"),
            properties=properties_str,
        )

        return prompt

    def build_messages(
        self, dog_data: Dict[str, Any], prompt_adjustment: str = ""
    ) -> list:
        """
        Build message list for LLM API call.

        Args:
            dog_data: Dog information dictionary
            prompt_adjustment: Optional prompt adjustment for retries

        Returns:
            List of message dictionaries for LLM API
        """
        # Build the base prompt
        prompt = self.build_prompt(dog_data)

        # Add adjustment to prompt if specified (for retries)
        if prompt_adjustment:
            prompt = f"{prompt}\n\n{prompt_adjustment}"

        return [
            {"role": "system", "content": self.prompt_template["system_prompt"]},
            {"role": "user", "content": prompt},
        ]

    def get_prompt_version(self) -> str:
        """
        Get the version of the loaded prompt template.

        Returns:
            Prompt template version string
        """
        return self.prompt_template["metadata"]["version"]

    def get_system_prompt(self) -> str:
        """
        Get the system prompt from the template.

        Returns:
            System prompt string
        """
        return self.prompt_template["system_prompt"]
