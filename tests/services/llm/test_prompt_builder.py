"""
Tests for PromptBuilder class.

Following CLAUDE.md principles:
- Test-driven development
- Isolated unit tests
- Clear test names
"""

import json
from unittest.mock import mock_open, patch

import pytest

from services.llm.prompt_builder import PromptBuilder


@pytest.mark.file_io
@pytest.mark.services
class TestPromptBuilder:
    """Test suite for PromptBuilder class."""

    def test_init_with_valid_organization(self):
        """Test initialization with valid organization ID."""
        mock_template = {"system_prompt": "Test system prompt", "extraction_prompt": "Test prompt for {name}", "metadata": {"version": "1.0.0"}}

        with patch.object(PromptBuilder, "_load_prompt_template", return_value=mock_template):
            builder = PromptBuilder(organization_id=11)
            assert builder.organization_id == 11
            assert builder.prompt_template == mock_template

    def test_init_with_invalid_organization(self):
        """Test initialization with invalid organization ID raises ValueError."""
        with pytest.raises(ValueError, match="No configuration found for organization 999"):
            PromptBuilder(organization_id=999)

    def test_load_prompt_template_success(self):
        """Test successful prompt template loading."""
        from dataclasses import dataclass

        @dataclass
        class MockOrgConfig:
            organization_id: int = 11
            organization_name: str = "Test Org"
            prompt_file: str = "test.yaml"
            source_language: str = "en"
            target_language: str = "en"
            model_preference: str = "test-model"

        mock_template_content = """
        system_prompt: "Test system prompt"
        extraction_prompt: "Test prompt for {name}"
        metadata:
          version: "1.0.0"
        """

        mock_file = mock_open(read_data=mock_template_content)
        with patch("builtins.open", mock_file), patch("pathlib.Path.exists", return_value=True), patch("services.llm.organization_config_loader.get_config_loader") as mock_loader:
            mock_loader.return_value.load_config.return_value = MockOrgConfig()
            builder = PromptBuilder.__new__(PromptBuilder)  # Create without __init__
            result = builder._load_prompt_template(11)

            assert result["system_prompt"] == "Test system prompt"
            assert result["extraction_prompt"] == "Test prompt for {name}"
            assert result["metadata"]["version"] == "1.0.0"

    def test_load_prompt_template_file_not_found(self):
        """Test prompt template loading with missing file."""
        from dataclasses import dataclass

        @dataclass
        class MockOrgConfig:
            organization_id: int = 11
            organization_name: str = "Test Org"
            prompt_file: str = "test.yaml"
            source_language: str = "en"
            target_language: str = "en"
            model_preference: str = "test-model"

        with patch("pathlib.Path.exists", return_value=False), patch("services.llm.organization_config_loader.get_config_loader") as mock_loader:
            mock_loader.return_value.load_config.return_value = MockOrgConfig()
            builder = PromptBuilder.__new__(PromptBuilder)  # Create without __init__
            with pytest.raises(FileNotFoundError, match="Prompt template not found"):
                builder._load_prompt_template(11)

    def test_build_prompt_with_complete_data(self):
        """Test prompt building with complete dog data."""
        mock_template = {"extraction_prompt": "Dog: {name}, Breed: {breed}, Age: {age_text}, Properties: {properties}"}

        builder = PromptBuilder.__new__(PromptBuilder)  # Create without __init__
        builder.prompt_template = mock_template

        dog_data = {"name": "Max", "breed": "Golden Retriever", "age_text": "3 years old", "properties": {"size": "large", "energy": "high"}}

        result = builder.build_prompt(dog_data)

        assert "Max" in result
        assert "Golden Retriever" in result
        assert "3 years old" in result
        assert '"size": "large"' in result
        assert '"energy": "high"' in result

    def test_build_prompt_with_missing_data(self):
        """Test prompt building with missing dog data uses defaults."""
        mock_template = {"extraction_prompt": "Dog: {name}, Breed: {breed}, Age: {age_text}, Properties: {properties}"}

        builder = PromptBuilder.__new__(PromptBuilder)  # Create without __init__
        builder.prompt_template = mock_template

        dog_data = {}  # Empty data

        result = builder.build_prompt(dog_data)

        assert "Unknown" in result  # Default name
        assert "Mixed Breed" in result  # Default breed
        assert "Unknown age" in result  # Default age
        assert "{}" in result  # Empty properties dict

    def test_build_prompt_with_non_dict_properties(self):
        """Test prompt building when properties is not a dict."""
        mock_template = {"extraction_prompt": "Properties: {properties}"}

        builder = PromptBuilder.__new__(PromptBuilder)  # Create without __init__
        builder.prompt_template = mock_template

        dog_data = {"properties": "some string value"}

        result = builder.build_prompt(dog_data)

        assert "some string value" in result

    def test_build_messages_without_adjustment(self):
        """Test building messages without prompt adjustment."""
        mock_template = {"system_prompt": "You are a dog profiler", "extraction_prompt": "Profile this dog: {name}"}

        builder = PromptBuilder.__new__(PromptBuilder)  # Create without __init__
        builder.prompt_template = mock_template

        dog_data = {"name": "Buddy"}

        messages = builder.build_messages(dog_data)

        assert len(messages) == 2
        assert messages[0]["role"] == "system"
        assert messages[0]["content"] == "You are a dog profiler"
        assert messages[1]["role"] == "user"
        assert "Buddy" in messages[1]["content"]

    def test_build_messages_with_adjustment(self):
        """Test building messages with prompt adjustment."""
        mock_template = {"system_prompt": "You are a dog profiler", "extraction_prompt": "Profile this dog: {name}"}

        builder = PromptBuilder.__new__(PromptBuilder)  # Create without __init__
        builder.prompt_template = mock_template

        dog_data = {"name": "Buddy"}
        adjustment = "Please focus on temperament."

        messages = builder.build_messages(dog_data, adjustment)

        assert len(messages) == 2
        user_content = messages[1]["content"]
        assert "Buddy" in user_content
        assert "Please focus on temperament." in user_content

    def test_get_prompt_version(self):
        """Test getting prompt version."""
        mock_template = {"metadata": {"version": "2.1.0"}}

        builder = PromptBuilder.__new__(PromptBuilder)  # Create without __init__
        builder.prompt_template = mock_template

        version = builder.get_prompt_version()
        assert version == "2.1.0"

    def test_get_system_prompt(self):
        """Test getting system prompt."""
        mock_template = {"system_prompt": "You are an expert dog behavioral analyst."}

        builder = PromptBuilder.__new__(PromptBuilder)  # Create without __init__
        builder.prompt_template = mock_template

        system_prompt = builder.get_system_prompt()
        assert system_prompt == "You are an expert dog behavioral analyst."
