"""Tests for OpenRouter auto-router request construction.

The pipeline previously pinned google/gemini-3-flash-preview in eight places.
Routing is now delegated to OpenRouter's auto-router so the model tracks the
frontier without code changes.
"""

from services.llm.llm_client import AUTO_ROUTER_MODEL, LLMClient, build_request_body


class TestBuildRequestBody:
    def test_auto_router_carries_the_plugin_and_cost_tier(self):
        body = build_request_body(messages=[], model=AUTO_ROUTER_MODEL, temperature=0.7, max_tokens=4000, cost_tier="medium")
        assert body["plugins"] == [{"id": "auto-router", "cost_tier": "medium"}]

    def test_cost_tier_is_configurable(self):
        body = build_request_body(messages=[], model=AUTO_ROUTER_MODEL, temperature=0.7, max_tokens=4000, cost_tier="low")
        assert body["plugins"][0]["cost_tier"] == "low"

    def test_pinned_model_gets_no_router_plugin(self):
        body = build_request_body(messages=[], model="google/gemini-3-flash-preview", temperature=0.7, max_tokens=4000, cost_tier="medium")
        assert "plugins" not in body

    def test_json_object_response_format_is_requested(self):
        body = build_request_body(messages=[], model=AUTO_ROUTER_MODEL, temperature=0.7, max_tokens=4000, cost_tier="medium")
        assert body["response_format"] == {"type": "json_object"}

    def test_core_parameters_are_passed_through(self):
        messages = [{"role": "user", "content": "hi"}]
        body = build_request_body(messages=messages, model=AUTO_ROUTER_MODEL, temperature=0.3, max_tokens=1234, cost_tier="medium")
        assert body["messages"] == messages
        assert body["model"] == AUTO_ROUTER_MODEL
        assert body["temperature"] == 0.3
        assert body["max_tokens"] == 1234


class TestModelAttribution:
    """With auto-routing, the requested model is 'openrouter/auto'; the useful
    value is which model the router actually picked."""

    def test_selected_model_is_recorded_not_the_router_alias(self):
        client = LLMClient(api_key="test-key")
        response_data = {
            "choices": [{"message": {"content": '{"name": "Bella"}'}}],
            "model": "google/gemini-3.7-flash",
        }
        result = client.parse_json_response(
            client.extract_content_from_response(response_data),
            model=AUTO_ROUTER_MODEL,
            response_data=response_data,
        )
        assert result["model_used"] == "google/gemini-3.7-flash"

    def test_falls_back_to_requested_model_when_response_omits_it(self):
        client = LLMClient(api_key="test-key")
        response_data = {"choices": [{"message": {"content": '{"name": "Bella"}'}}]}
        result = client.parse_json_response(
            client.extract_content_from_response(response_data),
            model=AUTO_ROUTER_MODEL,
            response_data=response_data,
        )
        assert result["model_used"] == AUTO_ROUTER_MODEL


class TestNoPinnedModelsRemain:
    def test_profiler_does_not_hardcode_a_model(self):
        from pathlib import Path

        source = Path("services/llm/dog_profiler.py").read_text()
        assert "gemini-3-flash-preview" not in source
        assert "gpt-4-turbo-preview" not in source
