"""Reasoning must be budgeted, not disabled.

Production incident, 2026-08-27 to 2026-08-31: `reasoning: {"enabled": false}`
was rejected by a growing share of the endpoints OpenRouter's auto-router picks,
with `400 Reasoning is mandatory for this endpoint and cannot be disabled`. The
retry handler retries the same `openrouter/auto` alias, so every attempt hit the
same class of endpoint and 156 active dogs were stored with no profile at all.

Capping the effort satisfies both constraints: endpoints that mandate reasoning
accept the request, and reasoning cannot consume the whole max_tokens budget and
return empty content, which is why the disable flag existed in the first place.
"""

import pytest

from services.llm.llm_client import AUTO_ROUTER_MODEL, REASONING_EFFORT, build_request_body


def _body(**overrides):
    kwargs = {
        "messages": [],
        "model": AUTO_ROUTER_MODEL,
        "temperature": 0.7,
        "max_tokens": 4000,
        "cost_tier": "medium",
    }
    kwargs.update(overrides)
    return build_request_body(**kwargs)


@pytest.mark.unit
class TestReasoningBudget:
    def test_reasoning_is_capped_rather_than_disabled(self):
        assert _body()["reasoning"] == {"effort": REASONING_EFFORT}

    def test_never_sends_the_flag_that_reasoning_endpoints_reject(self):
        """`enabled: false` is a 400 on any endpoint where reasoning is mandatory."""
        assert _body()["reasoning"].get("enabled") is not False

    def test_effort_is_the_cheapest_setting(self):
        assert REASONING_EFFORT == "low"

    def test_pinned_models_are_budgeted_too(self):
        """The auto-router is not the only caller; a pinned reasoning model
        would otherwise spend its whole budget thinking."""
        assert _body(model="google/gemini-3.7-flash")["reasoning"] == {"effort": REASONING_EFFORT}
