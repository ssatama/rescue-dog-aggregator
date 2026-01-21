"""
LLM client for API interactions.

Following CLAUDE.md principles:
- Single responsibility (HTTP API calls)
- Pure functions (no side effects)
- Immutable data (no mutations)
- Small file (<200 lines)
"""

import json
import logging
import os
from typing import Any

import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


class LLMClient:
    """Client for making HTTP requests to LLM APIs."""

    def __init__(self, api_key: str = None):
        """
        Initialize LLM client.

        Args:
            api_key: Optional API key override (uses env var if not provided)

        Raises:
            ValueError: If no API key is available
        """
        self.api_key = api_key or os.environ.get("OPENROUTER_API_KEY")
        if not self.api_key:
            raise ValueError("No OpenRouter API key found")

    async def call_openrouter_api(
        self,
        messages: list[dict[str, str]],
        model: str = "google/gemini-3-flash-preview",
        temperature: float = 0.7,
        max_tokens: int = 4000,
        timeout: float = 30.0,
    ) -> dict[str, Any]:
        """
        Make API call to OpenRouter.

        Args:
            messages: List of message dictionaries with role and content
            model: Model to use
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            timeout: Request timeout in seconds

        Returns:
            Parsed JSON response from API

        Raises:
            httpx.HTTPStatusError: If API returns error status
            json.JSONDecodeError: If response is not valid JSON
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://rescuedogs.me",
                    "X-Title": "Rescue Dog Aggregator",
                },
                json={
                    "model": model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                },
                timeout=timeout,
            )

            # Check for errors
            if response.status_code != 200:
                error_data = response.json()
                logger.error(f"API Error: {error_data}")
                response.raise_for_status()

            return response.json()

    def extract_content_from_response(self, response_data: dict[str, Any]) -> str:
        """
        Extract content from API response.

        Args:
            response_data: Raw API response

        Returns:
            Extracted content string
        """
        content = response_data["choices"][0]["message"]["content"]

        # Handle markdown wrapping if present
        if content.startswith("```"):
            content = self._extract_json_from_markdown(content)

        return content

    def _extract_json_from_markdown(self, content: str) -> str:
        """
        Extract JSON from markdown code blocks.

        Args:
            content: Content that may contain markdown

        Returns:
            Extracted JSON string
        """
        lines = content.split("\n")
        json_lines = []
        in_json = False

        for line in lines:
            if line.startswith("```json"):
                in_json = True
            elif line.startswith("```") and in_json:
                break
            elif in_json and not line.startswith("```"):
                json_lines.append(line)

        return "\n".join(json_lines)

    def parse_json_response(self, content: str, model: str = None) -> dict[str, Any]:
        """
        Parse JSON content and add metadata.

        Args:
            content: JSON content string
            model: Model name to add to result

        Returns:
            Parsed JSON with metadata

        Raises:
            json.JSONDecodeError: If content is not valid JSON
        """
        result = json.loads(content)

        # Add model used to result
        if model:
            result["model_used"] = model

        return result

    async def call_api_and_parse(
        self,
        messages: list[dict[str, str]],
        model: str = "google/gemini-3-flash-preview",
        temperature: float = 0.7,
        max_tokens: int = 4000,
        timeout: float = 30.0,
    ) -> dict[str, Any]:
        """
        Complete API call with content extraction and parsing.

        Args:
            messages: List of message dictionaries
            model: Model to use
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            timeout: Request timeout in seconds

        Returns:
            Parsed response with metadata

        Raises:
            httpx.HTTPStatusError: If API returns error status
            json.JSONDecodeError: If response is not valid JSON
        """
        # Make API call
        response_data = await self.call_openrouter_api(
            messages=messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            timeout=timeout,
        )

        # Extract content
        content = self.extract_content_from_response(response_data)

        # Parse JSON and add metadata
        result = self.parse_json_response(content, model)

        # Add model from original response if not already present
        if "model_used" not in result and "model" in response_data:
            result["model_used"] = response_data["model"]

        return result

    async def call_vision_api(
        self,
        image_url: str,
        prompt: str,
        model: str = "google/gemini-2.5-flash-image",
        temperature: float = 0.3,
        max_tokens: int = 1000,
        timeout: float = 30.0,
    ) -> dict[str, Any]:
        """
        Call OpenRouter vision API for image analysis.

        Args:
            image_url: URL of image to analyze
            prompt: Text prompt for analysis
            model: Vision model to use (default: gemini-2.5-flash-image)
            temperature: Lower temperature for consistent scoring (default: 0.3)
            max_tokens: Max response tokens (default: 1000)
            timeout: Request timeout in seconds (default: 30.0)

        Returns:
            Parsed JSON response with analysis results

        Raises:
            httpx.HTTPStatusError: If API returns error status
            json.JSONDecodeError: If response is not valid JSON
        """
        # Format messages for vision API
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": image_url}},
                ],
            }
        ]

        # Delegate to existing call_api_and_parse for consistency
        return await self.call_api_and_parse(
            messages=messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            timeout=timeout,
        )
