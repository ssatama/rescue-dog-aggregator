"""
Test suite for organization configuration loader.

Following CLAUDE.md principles:
- TDD approach
- Test all edge cases
- Pure functions
"""

from pathlib import Path
from unittest.mock import mock_open, patch

import pytest
import yaml

from services.llm.organization_config_loader import (
    OrganizationConfig,
    OrganizationConfigLoader,
    PromptTemplate,
)


@pytest.mark.file_io
@pytest.mark.services
@pytest.mark.slow
class TestOrganizationConfig:
    """Test organization configuration model."""

    def test_config_creation(self):
        """Test creating organization config."""
        config = OrganizationConfig(
            organization_id=11,
            organization_name="Tierschutzverein Europa",
            prompt_file="tierschutzverein_europa.yaml",
            source_language="de",
            target_language="en",
            model_preference="google/gemini-2.5-flash",
        )

        assert config.organization_id == 11
        assert config.source_language == "de"
        assert config.model_preference == "google/gemini-2.5-flash"

    def test_config_defaults(self):
        """Test default values."""
        config = OrganizationConfig(
            organization_id=1, organization_name="Test Org", prompt_file="test.yaml"
        )

        assert config.source_language == "en"
        assert config.target_language == "en"
        assert config.model_preference == "google/gemini-3-flash-preview"

    def test_prompt_template(self):
        """Test prompt template structure."""
        template = PromptTemplate(
            system_prompt="You are a helpful assistant",
            user_prompt="Translate this: {text}",
            examples=[
                {"input": "Hund", "output": "Dog"},
                {"input": "Katze", "output": "Cat"},
            ],
        )

        assert template.system_prompt == "You are a helpful assistant"
        assert len(template.examples) == 2
        assert template.examples[0]["output"] == "Dog"


class TestOrganizationConfigLoader:
    """Test organization configuration loader."""

    @pytest.fixture
    def loader(self):
        """Create loader instance."""
        return OrganizationConfigLoader()

    @pytest.fixture
    def mock_config_data(self):
        """Mock configuration data."""
        return {
            "11": {
                "name": "Tierschutzverein Europa",
                "prompt_file": "tierschutzverein_europa.yaml",
                "source_language": "de",
                "target_language": "en",
                "model_preference": "google/gemini-2.5-flash",
            },
            "27": {
                "name": "Test Organization",
                "prompt_file": "test_org.yaml",
                "source_language": "en",
                "target_language": "en",
            },
        }

    @pytest.fixture
    def mock_prompt_data(self):
        """Mock prompt template data."""
        return {
            "system_prompt": "You are an expert dog profiler",
            "user_prompt": "Create a profile for: {dog_data}",
            "examples": [
                {"input": "2 Jahre alter Rüde", "output": "2 year old male dog"}
            ],
        }

    def test_load_config_by_id(self, loader, mock_config_data):
        """Test loading config by organization ID."""
        with patch.object(loader, "_load_config_map", return_value=mock_config_data):
            config = loader.load_config(11)

            assert config.organization_id == 11
            assert config.organization_name == "Tierschutzverein Europa"
            assert config.source_language == "de"
            assert config.model_preference == "google/gemini-2.5-flash"

    def test_load_config_not_found(self, loader, mock_config_data):
        """Test loading non-existent config."""
        with patch.object(loader, "_load_config_map", return_value=mock_config_data):
            config = loader.load_config(999)
            assert config is None

    def test_load_all_configs(self, loader, mock_config_data):
        """Test loading all configurations."""
        with patch.object(loader, "_load_config_map", return_value=mock_config_data):
            configs = loader.load_all_configs()

            assert len(configs) == 2
            assert any(c.organization_id == 11 for c in configs)
            assert any(c.organization_id == 27 for c in configs)

    def test_load_prompt_template(self, loader, mock_prompt_data):
        """Test loading prompt template."""
        mock_yaml = yaml.dump(mock_prompt_data)

        # Mock Path.exists() instead of os.path.exists()
        with patch("builtins.open", mock_open(read_data=mock_yaml)):
            with patch.object(Path, "exists", return_value=True):
                template = loader.load_prompt_template("test.yaml")

                assert template.system_prompt == "You are an expert dog profiler"
                assert "dog_data" in template.user_prompt
                assert len(template.examples) == 1

    def test_load_prompt_template_not_found(self, loader):
        """Test loading non-existent prompt template."""
        with patch("os.path.exists", return_value=False):
            template = loader.load_prompt_template("missing.yaml")
            assert template is None

    def test_get_supported_organizations(self, loader, mock_config_data):
        """Test getting list of supported organizations."""
        with patch.object(loader, "_load_config_map", return_value=mock_config_data):
            org_ids = loader.get_supported_organizations()

            assert org_ids == [11, 27]

    def test_cache_mechanism(self, loader, mock_config_data):
        """Test configuration caching."""
        with patch.object(
            loader, "_load_config_map", return_value=mock_config_data
        ) as mock_load:
            # First call loads from file
            config1 = loader.load_config(11)
            assert mock_load.call_count == 1

            # Second call uses cache
            config2 = loader.load_config(11)
            assert mock_load.call_count == 1  # Not called again

            # Same instance returned
            assert config1 is config2

    def test_reload_configs(self, loader, mock_config_data):
        """Test reloading configurations."""
        with patch.object(
            loader, "_load_config_map", return_value=mock_config_data
        ) as mock_load:
            # Initial load
            loader.load_config(11)
            assert mock_load.call_count == 1

            # Force reload
            loader.reload()
            loader.load_config(11)
            assert mock_load.call_count == 2

    def test_config_validation(self, loader):
        """Test configuration validation."""
        invalid_data = {
            "11": {
                "name": "Test",
                # Missing prompt_file
            }
        }

        with patch.object(loader, "_load_config_map", return_value=invalid_data):
            with pytest.raises(ValueError, match="prompt_file"):
                loader.load_config(11)

    def test_environment_override(self, loader, mock_config_data):
        """Test environment variable overrides."""
        with patch.dict("os.environ", {"LLM_MODEL_OVERRIDE": "gpt-4"}):
            with patch.object(
                loader, "_load_config_map", return_value=mock_config_data
            ):
                config = loader.load_config(11)
                assert config.model_preference == "gpt-4"  # Overridden by env var


class TestOrganizationConfigIntegration:
    """Integration tests for config loader."""

    def test_full_config_loading_flow(self):
        """Test complete configuration loading flow."""
        loader = OrganizationConfigLoader()

        # Create mock files
        config_data = {
            "11": {
                "name": "Tierschutzverein Europa",
                "prompt_file": "tierschutzverein_europa.yaml",
                "source_language": "de",
                "target_language": "en",
            }
        }

        prompt_data = {
            "system_prompt": "Test system prompt",
            "user_prompt": "Test user prompt",
            "examples": [],
        }

        with patch.object(loader, "_load_config_map", return_value=config_data):
            with patch("builtins.open", mock_open(read_data=yaml.dump(prompt_data))):
                with patch("os.path.exists", return_value=True):
                    # Load config
                    config = loader.load_config(11)
                    assert config is not None

                    # Load associated prompt
                    template = loader.load_prompt_template(config.prompt_file)
                    assert template is not None
                    assert template.system_prompt == "Test system prompt"
