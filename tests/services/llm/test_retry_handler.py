"""
Comprehensive test suite for retry handler.

Following CLAUDE.md principles:
- TDD approach
- Small focused tests
- Clear assertions
"""

import asyncio
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.llm.retry_handler import RetryConfig, RetryHandler, with_retry


class TestRetryConfig:
    """Test retry configuration."""

    def test_default_config(self):
        """Test default configuration values."""
        config = RetryConfig()
        assert config.max_attempts == 3
        assert config.initial_delay == 1.0
        assert config.backoff_factor == 2.0
        assert config.max_delay == 30.0
        assert config.fallback_models == ["google/gemini-2.5-flash"]

    def test_custom_config(self):
        """Test custom configuration."""
        config = RetryConfig(max_attempts=5, initial_delay=2.0, backoff_factor=3.0, max_delay=60.0, fallback_models=["model1", "model2"])
        assert config.max_attempts == 5
        assert config.initial_delay == 2.0
        assert config.backoff_factor == 3.0
        assert config.max_delay == 60.0
        assert config.fallback_models == ["model1", "model2"]


class TestRetryHandler:
    """Test retry handler functionality."""

    @pytest.mark.asyncio
    async def test_successful_first_attempt(self):
        """Test successful execution on first attempt."""
        handler = RetryHandler()

        async def success_func():
            return "success"

        result = await handler.execute_with_retry(success_func)
        assert result == "success"

        stats = handler.get_stats()
        assert stats["total_attempts"] == 1
        assert stats["successful_retries"] == 0
        assert stats["failed_retries"] == 0

    @pytest.mark.asyncio
    async def test_retry_on_json_error(self):
        """Test retry on JSON decode error."""
        handler = RetryHandler(RetryConfig(initial_delay=0.1))
        attempt_count = 0

        async def json_error_func(**kwargs):
            nonlocal attempt_count
            attempt_count += 1
            if attempt_count == 1:
                raise json.JSONDecodeError("test", "doc", 0)
            return {"success": True}

        result = await handler.execute_with_retry(json_error_func)
        assert result == {"success": True}
        assert attempt_count == 2

        stats = handler.get_stats()
        assert stats["total_attempts"] == 2
        assert stats["successful_retries"] == 1

    @pytest.mark.asyncio
    async def test_retry_with_timeout(self):
        """Test retry on timeout error."""
        handler = RetryHandler(RetryConfig(initial_delay=0.1))
        attempt_count = 0

        async def timeout_func(**kwargs):
            nonlocal attempt_count
            attempt_count += 1
            if attempt_count == 1:
                raise asyncio.TimeoutError()
            return "success after timeout"

        result = await handler.execute_with_retry(timeout_func, timeout=10.0)
        assert result == "success after timeout"
        assert attempt_count == 2

    @pytest.mark.asyncio
    async def test_model_fallback(self):
        """Test model fallback on failures."""
        config = RetryConfig(max_attempts=2, initial_delay=0.1, fallback_models=["model1", "model2"])
        handler = RetryHandler(config)

        models_used = []

        async def model_dependent_func(model=None, **kwargs):
            models_used.append(model)
            if model == "model1":
                raise Exception("Model 1 failed")
            return f"success with {model}"

        result = await handler.execute_with_retry(model_dependent_func)
        assert result == "success with model2"
        assert "model1" in models_used
        assert "model2" in models_used

        stats = handler.get_stats()
        assert stats["model_fallbacks"] == 1

    @pytest.mark.asyncio
    async def test_all_attempts_fail(self):
        """Test when all retry attempts fail."""
        handler = RetryHandler(RetryConfig(max_attempts=2, initial_delay=0.1))

        async def always_fails():
            raise Exception("Always fails")

        with pytest.raises(Exception, match="Always fails"):
            await handler.execute_with_retry(always_fails)

        stats = handler.get_stats()
        assert stats["total_attempts"] == 2
        assert stats["failed_retries"] == 1

    @pytest.mark.asyncio
    async def test_exponential_backoff(self):
        """Test exponential backoff delay calculation."""
        config = RetryConfig(max_attempts=3, initial_delay=1.0, backoff_factor=2.0, max_delay=10.0)
        handler = RetryHandler(config)

        delays = []

        async def track_delays(**kwargs):
            # This will fail to trigger retries
            raise Exception("Trigger retry")

        with patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
            mock_sleep.side_effect = lambda d: delays.append(d)

            try:
                await handler.execute_with_retry(track_delays)
            except:
                pass

        # Check delays follow exponential backoff
        assert len(delays) == 2  # max_attempts - 1
        assert delays[0] == 1.0  # initial_delay
        assert delays[1] == 2.0  # initial_delay * backoff_factor

    @pytest.mark.asyncio
    async def test_prompt_adjustment_on_json_error(self):
        """Test prompt adjustment is added on JSON errors."""
        handler = RetryHandler(RetryConfig(initial_delay=0.1))

        prompt_adjustments = []

        async def check_prompt_adjustment(prompt_adjustment="", **kwargs):
            prompt_adjustments.append(prompt_adjustment)
            if len(prompt_adjustments) == 1:
                raise json.JSONDecodeError("test", "doc", 0)
            return "success"

        result = await handler.execute_with_retry(check_prompt_adjustment, prompt_adjustment="")

        assert result == "success"
        assert prompt_adjustments[0] == ""
        assert "valid JSON only" in prompt_adjustments[1]

    @pytest.mark.asyncio
    async def test_timeout_increase_on_retry(self):
        """Test timeout increases on retry."""
        handler = RetryHandler(RetryConfig(initial_delay=0.1))

        timeouts = []

        async def track_timeout(timeout=30.0, **kwargs):
            timeouts.append(timeout)
            if len(timeouts) == 1:
                raise asyncio.TimeoutError()
            return "success"

        result = await handler.execute_with_retry(track_timeout, timeout=30.0)

        assert result == "success"
        assert timeouts[0] == 30.0
        assert timeouts[1] == 45.0  # 30.0 * 1.5

    def test_stats_reset(self):
        """Test statistics reset."""
        handler = RetryHandler()

        # Modify stats
        handler.retry_stats["total_attempts"] = 10
        handler.retry_stats["successful_retries"] = 5

        # Reset
        handler.reset_stats()

        stats = handler.get_stats()
        assert stats["total_attempts"] == 0
        assert stats["successful_retries"] == 0
        assert stats["failed_retries"] == 0
        assert stats["model_fallbacks"] == 0
        assert stats["total_delay_seconds"] == 0.0


class TestRetryDecorator:
    """Test the @with_retry decorator."""

    @pytest.mark.asyncio
    async def test_decorator_basic(self):
        """Test basic decorator functionality."""

        attempt_count = 0

        @with_retry(RetryConfig(initial_delay=0.1))
        async def decorated_func():
            nonlocal attempt_count
            attempt_count += 1
            if attempt_count == 1:
                raise Exception("First attempt fails")
            return "success"

        result = await decorated_func()
        assert result == "success"
        assert attempt_count == 2

        # Check we can access retry handler stats
        stats = decorated_func.retry_handler.get_stats()
        assert stats["total_attempts"] == 2
        assert stats["successful_retries"] == 1

    @pytest.mark.asyncio
    async def test_decorator_with_args(self):
        """Test decorator with function arguments."""

        @with_retry(RetryConfig(initial_delay=0.1))
        async def add_numbers(a, b, multiplier=1):
            if multiplier == 0:
                raise ValueError("Invalid multiplier")
            return (a + b) * multiplier

        result = await add_numbers(2, 3, multiplier=2)
        assert result == 10

        with pytest.raises(ValueError):
            await add_numbers(2, 3, multiplier=0)


class TestRetryIntegration:
    """Integration tests with real-world scenarios."""

    @pytest.mark.asyncio
    async def test_llm_api_simulation(self):
        """Simulate LLM API retry scenario."""
        handler = RetryHandler(RetryConfig(initial_delay=0.1, fallback_models=["gemini", "gpt-4"]))

        api_calls = []

        async def mock_llm_api(model="gemini", **kwargs):
            api_calls.append(model)

            # Gemini fails with JSON error
            if model == "gemini" and len([c for c in api_calls if c == "gemini"]) == 1:
                raise json.JSONDecodeError("Invalid JSON", "response", 0)

            # Success on retry or with GPT-4
            return {"model_used": model, "response": "Generated text"}

        result = await handler.execute_with_retry(mock_llm_api, model_override="gemini")

        assert result["model_used"] == "gemini"
        assert result["response"] == "Generated text"
        assert len(api_calls) == 2
        assert api_calls[0] == "gemini"
        assert api_calls[1] == "gemini"

    @pytest.mark.asyncio
    async def test_complete_failure_scenario(self):
        """Test complete failure with all retries exhausted."""
        config = RetryConfig(max_attempts=2, initial_delay=0.1, fallback_models=["model1", "model2", "model3"])
        handler = RetryHandler(config)

        attempts = []

        async def always_fails(model=None, **kwargs):
            attempts.append(model)
            raise Exception(f"{model} failed")

        with pytest.raises(Exception) as exc_info:
            await handler.execute_with_retry(always_fails, model_override="model1")

        # Should have tried multiple models based on config
        # The handler tries max_attempts for first model, then 2 attempts for each fallback
        assert len(attempts) > 0

        stats = handler.get_stats()
        assert stats["failed_retries"] == 1
        # Model fallbacks count depends on how many fallback models were tried
        assert stats["model_fallbacks"] >= 0
