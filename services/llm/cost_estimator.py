"""
Cost estimation for LLM processing of dog data.

Following CLAUDE.md principles:
- Pure functions, no mutations
- Clear calculations
- Transparent pricing
"""

import json
from typing import Any, Dict, List, Optional

import tiktoken


class LLMCostEstimator:
    """Estimates costs for processing dogs through LLM."""

    # OpenRouter Auto Router pricing
    # Auto Router automatically selects the best model for the task
    PRICING = {
        "auto-router": {
            "input": 0.50 / 1_000_000,  # Estimated average $0.50 per 1M tokens
            "output": 2.00 / 1_000_000,  # Estimated average $2.00 per 1M tokens
            "model_name": "openrouter/auto",
            "note": "Auto Router selects optimal model per request",
        }
    }

    # Prompt template (approximate)
    PROMPT_TEMPLATE = """You are an expert dog adoption specialist creating accurate, compelling profiles.
    
CRITICAL RULES:
1. NEVER hallucinate - only use explicitly provided information
2. Use "unknown" or null for missing information
3. Maintain warm, professional tone
4. Be honest about challenges while emphasizing positives
5. Return valid JSON matching the exact schema

Analyze this German dog data and create an English profile:

Name: {name}
Breed: {breed}
Age: {age_text}
German Text: {properties}

Create a comprehensive profile with ALL required fields including:
- description (150-250 words)
- tagline (under 10 words)
- behavioral traits (energy_level, trainability, sociability, confidence)
- compatibility (good_with_dogs, good_with_cats, good_with_children)
- living requirements (home_type, yard_required, experience_level, exercise_needs)
- care needs (grooming_needs, medical_needs, special_needs)
- personality (personality_traits list, favorite_activities list, unique_quirk)
- adoption info (adoption_fee_euros, ready_to_travel, vaccinated, neutered)

Include confidence_scores and source_references for transparency."""

    @staticmethod
    def estimate_tokens(text: str, model: str = "claude-3.5-sonnet") -> int:
        """Estimate token count for text."""
        # Use cl100k_base encoding (close enough for estimation)
        try:
            encoding = tiktoken.get_encoding("cl100k_base")
            return len(encoding.encode(text))
        except:
            # Fallback: rough estimate of 1 token per 4 characters
            return len(text) // 4

    @staticmethod
    def estimate_processing_cost(sample_dogs: List[Dict[str, Any]], model: str = "auto-router") -> Dict[str, Any]:
        """
        Calculate cost for processing dogs through LLM.

        Args:
            sample_dogs: List of dog data dictionaries
            model: Model to use for pricing

        Returns:
            Cost analysis dictionary
        """
        if model not in LLMCostEstimator.PRICING:
            raise ValueError(f"Unknown model: {model}")

        pricing = LLMCostEstimator.PRICING[model]

        total_input_tokens = 0
        total_output_tokens = 0

        for dog in sample_dogs:
            # Build input text
            input_text = LLMCostEstimator.PROMPT_TEMPLATE.format(
                name=dog.get("name", ""), breed=dog.get("breed", ""), age_text=dog.get("age_text", ""), properties=json.dumps(dog.get("properties", {}), ensure_ascii=False)
            )

            # Count input tokens
            input_tokens = LLMCostEstimator.estimate_tokens(input_text)

            # Estimate output tokens (comprehensive profile)
            # Based on schema: ~600-800 tokens for full response
            output_tokens = 700  # Conservative average

            total_input_tokens += input_tokens
            total_output_tokens += output_tokens

        # Calculate costs
        input_cost = total_input_tokens * pricing["input"]
        output_cost = total_output_tokens * pricing["output"]
        total_cost = input_cost + output_cost

        cost_per_dog = total_cost / len(sample_dogs) if sample_dogs else 0

        return {
            "model": model,
            "model_name": pricing["model_name"],
            "dogs_analyzed": len(sample_dogs),
            "total_input_tokens": total_input_tokens,
            "total_output_tokens": total_output_tokens,
            "total_tokens": total_input_tokens + total_output_tokens,
            "avg_input_tokens_per_dog": total_input_tokens / len(sample_dogs) if sample_dogs else 0,
            "avg_output_tokens_per_dog": total_output_tokens / len(sample_dogs) if sample_dogs else 0,
            "input_cost": round(input_cost, 4),
            "output_cost": round(output_cost, 4),
            "total_cost": round(total_cost, 4),
            "cost_per_dog": round(cost_per_dog, 4),
            "cost_per_100_dogs": round(cost_per_dog * 100, 2),
            "cost_per_400_dogs": round(cost_per_dog * 400, 2),
            "cost_per_1000_dogs": round(cost_per_dog * 1000, 2),
            "proceed": cost_per_dog < 0.05,
            "recommendation": "PROCEED" if cost_per_dog < 0.05 else "TOO EXPENSIVE",
        }

    @staticmethod
    def compare_models(sample_dogs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Compare costs across different models."""
        comparisons = {}

        for model in LLMCostEstimator.PRICING.keys():
            comparisons[model] = LLMCostEstimator.estimate_processing_cost(sample_dogs, model)

        # Find cheapest option
        cheapest = min(comparisons.items(), key=lambda x: x[1]["cost_per_dog"])

        return {
            "models": comparisons,
            "cheapest_model": cheapest[0],
            "cheapest_cost_per_dog": cheapest[1]["cost_per_dog"],
            "recommendation": cheapest[0] if cheapest[1]["proceed"] else "NONE - ALL TOO EXPENSIVE",
        }
