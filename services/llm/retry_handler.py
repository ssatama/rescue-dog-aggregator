"""
Retry handler with exponential backoff and model fallback.

Following CLAUDE.md principles:
- Pure functions, no mutations
- Clear error handling
- Configurable retry strategies
"""

import asyncio
import json
import logging
from functools import wraps
from typing import Any, Callable, Dict, List, Optional, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")


class RetryConfig:
    """Configuration for retry behavior."""

    def __init__(
        self,
        max_attempts: int = 3,
        initial_delay: float = 1.0,
        backoff_factor: float = 2.0,
        max_delay: float = 30.0,
        fallback_models: Optional[List[str]] = None,
    ):
        """
        Initialize retry configuration.

        Args:
            max_attempts: Maximum number of retry attempts
            initial_delay: Initial delay between retries in seconds
            backoff_factor: Multiplier for exponential backoff
            max_delay: Maximum delay between retries
            fallback_models: List of models to try in order
        """
        self.max_attempts = max_attempts
        self.initial_delay = initial_delay
        self.backoff_factor = backoff_factor
        self.max_delay = max_delay
        self.fallback_models = fallback_models or ["google/gemini-2.5-flash"]


class RetryHandler:
    """Handles retry logic with exponential backoff and model fallback."""

    def __init__(self, config: Optional[RetryConfig] = None):
        """Initialize with retry configuration."""
        self.config = config or RetryConfig()
        self.retry_stats = {
            "total_attempts": 0,
            "successful_retries": 0,
            "failed_retries": 0,
            "model_fallbacks": 0,
            "total_delay_seconds": 0.0,
        }

    async def execute_with_retry(self, func: Callable, *args, model_override: Optional[str] = None, **kwargs) -> Any:
        """
        Execute function with retry logic and model fallback.

        Args:
            func: Async function to execute
            model_override: Optional model to use instead of default
            *args, **kwargs: Arguments to pass to function

        Returns:
            Result from successful execution

        Raises:
            Exception: If all retry attempts fail
        """
        models_to_try = self.config.fallback_models.copy()
        if model_override:
            models_to_try = [model_override] + [m for m in models_to_try if m != model_override]

        last_error = None
        total_attempts = 0

        for model_idx, model in enumerate(models_to_try):
            # Try up to max_attempts for each model
            attempts_per_model = self.config.max_attempts if model_idx == 0 else 2

            for attempt in range(attempts_per_model):
                total_attempts += 1
                self.retry_stats["total_attempts"] += 1

                try:
                    # Update model in kwargs if function accepts it
                    if "model" in kwargs or hasattr(func, "__code__") and "model" in func.__code__.co_varnames:
                        kwargs["model"] = model

                    result = await func(*args, **kwargs)

                    if attempt > 0 or model_idx > 0:
                        self.retry_stats["successful_retries"] += 1
                        if model_idx > 0:
                            self.retry_stats["model_fallbacks"] += 1
                        logger.info(f"Retry successful with {model} on attempt {total_attempts}")

                    return result

                except json.JSONDecodeError as e:
                    last_error = e
                    logger.warning(f"JSON decode error with {model} (attempt {attempt + 1}): {str(e)}")

                    # For JSON errors, try with adjusted prompt on retry
                    if "prompt_adjustment" in kwargs:
                        kwargs["prompt_adjustment"] = "Please return valid JSON only, no markdown formatting."

                except asyncio.TimeoutError as e:
                    last_error = e
                    logger.warning(f"Timeout with {model} (attempt {attempt + 1})")

                    # Increase timeout on retry
                    if "timeout" in kwargs:
                        kwargs["timeout"] = min(kwargs["timeout"] * 1.5, 60.0)

                except Exception as e:
                    last_error = e
                    logger.warning(f"Error with {model} (attempt {attempt + 1}): {str(e)}")

                # Calculate delay with exponential backoff
                if attempt < attempts_per_model - 1 or model_idx < len(models_to_try) - 1:
                    delay = min(
                        self.config.initial_delay * (self.config.backoff_factor**attempt),
                        self.config.max_delay,
                    )
                    self.retry_stats["total_delay_seconds"] += delay
                    logger.info(f"Waiting {delay:.1f}s before retry...")
                    await asyncio.sleep(delay)

        self.retry_stats["failed_retries"] += 1
        logger.error(f"All retry attempts failed after {total_attempts} tries")
        raise last_error or Exception("All retry attempts failed")

    def get_stats(self) -> Dict[str, Any]:
        """Get retry statistics."""
        return self.retry_stats.copy()

    def reset_stats(self):
        """Reset retry statistics."""
        self.retry_stats = {
            "total_attempts": 0,
            "successful_retries": 0,
            "failed_retries": 0,
            "model_fallbacks": 0,
            "total_delay_seconds": 0.0,
        }


def with_retry(config: Optional[RetryConfig] = None):
    """
    Decorator for adding retry logic to async functions.

    Usage:
        @with_retry(RetryConfig(max_attempts=3))
        async def my_function():
            ...
    """

    def decorator(func):
        handler = RetryHandler(config)

        @wraps(func)
        async def wrapper(*args, **kwargs):
            return await handler.execute_with_retry(func, *args, **kwargs)

        wrapper.retry_handler = handler  # Expose handler for stats access
        return wrapper

    return decorator
